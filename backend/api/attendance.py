"""
Attendance API endpoints
Handles CSV upload, manual entry, override, report, and export functionality.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from typing import List, Optional
from datetime import date, time, datetime, timedelta
from sqlalchemy import select, and_
import csv
import io
import pandas as pd

from api.dependencies import get_current_user, require_permission
from schemas import (
    AttendanceCreate, AttendanceUpdate, AttendanceResponse, AttendanceListResponse,
    AttendanceOverride, AttendanceUploadPreview, AttendanceUploadPreviewRow,
    AttendanceUploadResponse, AttendanceReportResponse, AttendanceSummary, AttendanceReportFilters,
    AttendanceDetailedReportResponse, AttendanceDetailRow,
    AttendancePeriodOverrideCreate, AttendancePeriodOverrideUpdate, AttendancePeriodOverrideResponse
)
from repos.attendance_repo import (
    create_attendance, get_attendance, update_attendance, list_attendance,
    delete_attendance, get_attendance_for_date, get_attendance_for_period,
    delete_attendance_by_date_range
)
from repos.attendance_period_override_repo import (
    get_override, create_or_update_override, delete_override
)
from repos.employee_repo import get_employee
from repos.employment_repo import get_current_employment
from repos.employee_schedule_repo import get_schedule_for_date
from repos.company_repo import get_company_by_id
from repos.holiday_repo import get_holidays_in_range
from repos.leave_repo import overlaps as leave_overlaps, get_leave_for_date, get_leaves_in_range, get_leave_type_by_code
from repos.work_schedule_repo import get_work_schedule
from services.attendance_service import (
    round_check_in_out, calculate_hours_worked
)
from services.stat_holiday_service import calculate_stat_holiday_entitlement
from utils.time_rounding import round_check_in, round_check_out
from services.payroll_period_service import calculate_pay_periods
from models.work_schedule import WorkSchedule

router = APIRouter()


def _parse_time(time_str: Optional[str]) -> Optional[time]:
    """Parse time string to time object"""
    if not time_str or time_str.strip() in ['-', '']:
        return None
    try:
        parts = time_str.strip().split(':')
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0
        second = int(parts[2]) if len(parts) > 2 else 0
        return time(hour=hour, minute=minute, second=second)
    except (ValueError, IndexError):
        return None


def _parse_date(date_str: str) -> Optional[date]:
    """Parse date string to date object"""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str.strip(), '%Y-%m-%d').date()
    except ValueError:
        try:
            return datetime.strptime(date_str.strip(), '%m/%d/%Y').date()
        except ValueError:
            return None


@router.post("/preview", response_model=AttendanceUploadPreview)
async def preview_attendance_csv(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_permission("attendance:create"))
):
    """Preview attendance data from CSV file without importing"""
    try:
        if not file.filename or not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV file")
        
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Read CSV
        df = pd.read_csv(io.BytesIO(contents))
        
        # Validate required columns
        required_columns = ['Person ID', 'Name', 'Date', 'Check-In', 'Check-out']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        preview_rows = []
        valid_count = 0
        invalid_count = 0
        duplicate_count = 0
        
        for index, row in df.iterrows():
            row_number = index + 2  # Excel row numbers start from 2
            person_id = str(row['Person ID']).strip().strip("'")  # Remove leading quote if present
            name = str(row['Name']).strip()
            date_str = str(row['Date']).strip()
            check_in_str = str(row['Check-In']).strip() if pd.notna(row['Check-In']) else None
            check_out_str = str(row['Check-out']).strip() if pd.notna(row['Check-out']) else None
            
            # Validate row
            status = "valid"
            error_message = None
            
            if not person_id or person_id == 'nan':
                status = "invalid"
                error_message = "Missing Person ID"
            elif not date_str or date_str == 'nan':
                status = "invalid"
                error_message = "Missing Date"
            else:
                attendance_date = _parse_date(date_str)
                if not attendance_date:
                    status = "invalid"
                    error_message = f"Invalid date format: {date_str}"
                else:
                    # Check for duplicate
                    existing = get_attendance_for_date(person_id, attendance_date)
                    if existing:
                        status = "duplicate"
                        duplicate_count += 1
                    else:
                        valid_count += 1
            
            preview_rows.append(AttendanceUploadPreviewRow(
                row_number=row_number,
                person_id=person_id,
                name=name,
                date=date_str,
                check_in=check_in_str if check_in_str and check_in_str != '-' else None,
                check_out=check_out_str if check_out_str and check_out_str != '-' else None,
                status=status,
                error_message=error_message
            ))
        
        invalid_count = len(preview_rows) - valid_count - duplicate_count
        
        return AttendanceUploadPreview(
            total_rows=len(preview_rows),
            valid_rows=valid_count,
            invalid_rows=invalid_count,
            duplicate_rows=duplicate_count,
            rows=preview_rows
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.post("/upload", response_model=AttendanceUploadResponse)
async def upload_attendance_csv(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_permission("attendance:create"))
):
    """Upload and import attendance data from CSV file"""
    try:
        if not file.filename or not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV file")
        
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Read CSV - keep time columns as strings to preserve original format with seconds
        df = pd.read_csv(io.BytesIO(contents), dtype={'Check-In': str, 'Check-out': str}, keep_default_na=False)
        
        # Validate required columns
        required_columns = ['Person ID', 'Name', 'Date', 'Check-In', 'Check-out']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        imported_count = 0
        skipped_count = 0
        error_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                person_id = str(row['Person ID']).strip().strip("'")
                name = str(row['Name']).strip()
                date_str = str(row['Date']).strip()
                
                # Get time values as strings (pandas keeps them as strings with dtype=str)
                check_in_str = str(row['Check-In']).strip() if pd.notna(row['Check-In']) and str(row['Check-In']).strip() != 'nan' else None
                check_out_str = str(row['Check-out']).strip() if pd.notna(row['Check-out']) and str(row['Check-out']).strip() != 'nan' else None
                
                # Handle empty strings or hyphens
                if check_in_str in ['-', '', 'nan', 'None']:
                    check_in_str = None
                if check_out_str in ['-', '', 'nan', 'None']:
                    check_out_str = None
                
                # Validate
                if not person_id or person_id == 'nan' or not date_str or date_str == 'nan':
                    skipped_count += 1
                    errors.append(f"Row {index + 2}: Missing Person ID or Date")
                    continue
                
                # Validate employee exists
                employee = get_employee(person_id)
                if not employee:
                    # Try to find employee by name as a hint
                    from repos.employee_repo import search_employees
                    name_matches = search_employees(name)
                    if name_matches:
                        matching_ids = [emp.id for emp in name_matches[:3]]  # Limit to 3 matches
                        error_msg = f"Row {index + 2}: Employee ID '{person_id}' does not exist. Found employee '{name}' with ID(s): {', '.join(matching_ids)}"
                    else:
                        error_msg = f"Row {index + 2}: Employee ID '{person_id}' does not exist and no employee found with name '{name}'"
                    error_count += 1
                    errors.append(error_msg)
                    continue
                
                attendance_date = _parse_date(date_str)
                if not attendance_date:
                    error_count += 1
                    errors.append(f"Row {index + 2}: Invalid date format: {date_str}")
                    continue
                
                # Check for duplicate
                existing = get_attendance_for_date(person_id, attendance_date)
                if existing:
                    skipped_count += 1
                    errors.append(f"Row {index + 2}: Duplicate record already exists for employee {person_id} on {date_str}")
                    continue
                
                # Parse original times (DO NOT round - preserve original with seconds)
                # IMPORTANT: Store raw string values for debugging
                original_check_in_str = check_in_str
                original_check_out_str = check_out_str
                
                original_check_in = _parse_time(check_in_str) if check_in_str and check_in_str != '-' else None
                original_check_out = _parse_time(check_out_str) if check_out_str and check_out_str != '-' else None
                
                # Calculate rounded times separately (for calculation purposes)
                # Check-in rounds UP, check-out rounds DOWN
                rounded_check_in = round_check_in(original_check_in) if original_check_in else None
                rounded_check_out = round_check_out(original_check_out) if original_check_out else None
                
                # Calculate hours using ROUNDED times
                regular_hours = 0.0
                ot_hours = 0.0
                weekend_ot_hours = 0.0
                stat_holiday_hours = 0.0
                
                # Get employment (needed for all calculations)
                employment = get_current_employment(person_id, attendance_date)
                
                if rounded_check_in and rounded_check_out:
                    # Get employee schedule and employment
                    employee_schedule = get_schedule_for_date(person_id, attendance_date)
                    is_driver = employment.is_driver if employment else False
                    count_all_ot = employment.count_all_ot if employment else False
                    
                    schedule = None
                    if employee_schedule:
                        try:
                            from models.work_schedule import WorkSchedule
                            work_schedule = employee_schedule.schedule if hasattr(employee_schedule, 'schedule') else None
                            if work_schedule and isinstance(work_schedule, WorkSchedule) and hasattr(work_schedule, 'get_day_times'):
                                schedule = work_schedule
                        except (AttributeError, TypeError):
                            schedule = None
                    day_of_week = attendance_date.weekday()
                    is_weekend = day_of_week >= 5
                    schedule_start, schedule_end = (None, None)
                    weekday_schedule_start = None
                    if schedule:
                        try:
                            from models.work_schedule import WorkSchedule
                            if isinstance(schedule, WorkSchedule) and hasattr(schedule, 'get_day_times'):
                                schedule_start, schedule_end = schedule.get_day_times(day_of_week)
                                # For weekends, get weekday schedule start time (try Monday-Friday) for weekend OT calculation
                                if is_weekend:
                                    # Try Monday through Friday to find a weekday schedule start time
                                    for weekday in range(5):  # 0=Monday to 4=Friday
                                        weekday_start, _ = schedule.get_day_times(weekday)
                                        if weekday_start:
                                            weekday_schedule_start = weekday_start
                                            break
                        except (AttributeError, TypeError):
                            schedule_start, schedule_end = (None, None)
                    
                    regular, ot, weekend_ot = calculate_hours_worked(
                        rounded_check_in, rounded_check_out, schedule_start, schedule_end,
                        attendance_date, is_driver, weekday_schedule_start, count_all_ot
                    )
                    regular_hours = regular
                    ot_hours = ot
                    weekend_ot_hours = weekend_ot
                
                # Calculate statutory holiday hours if applicable
                if employment and employment.company_id:
                    holidays = get_holidays_in_range(
                        employment.company_id,
                        attendance_date,
                        attendance_date,
                        person_id
                    )
                    if attendance_date in holidays:
                        # Calculate stat holiday entitlement based on BC ESA rules
                        stat_holiday_hours = calculate_stat_holiday_entitlement(
                            person_id,
                            attendance_date,
                            attendance_date,
                            attendance_date,
                            employment.company_id
                        )
                
                # Create attendance record with original times and rounded times
                create_attendance(
                    employee_id=person_id,
                    attendance_date=attendance_date,
                    check_in=original_check_in,  # Store original unrounded
                    check_out=original_check_out,  # Store original unrounded
                    rounded_check_in=rounded_check_in,  # Store rounded for calculations
                    rounded_check_out=rounded_check_out,  # Store rounded for calculations
                    regular_hours=regular_hours,
                    ot_hours=ot_hours,
                    weekend_ot_hours=weekend_ot_hours,
                    stat_holiday_hours=stat_holiday_hours,
                    remarks=None,  # CSV upload doesn't support remarks
                    performed_by=current_user.get('username'),
                )
                imported_count += 1
            except Exception as e:
                error_count += 1
                errors.append(f"Row {index + 2}: {str(e)}")
        
        return AttendanceUploadResponse(
            success=True,
            imported_count=imported_count,
            skipped_count=skipped_count,
            error_count=error_count,
            errors=errors
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importing file: {str(e)}")


@router.post("", response_model=AttendanceResponse)
async def create_attendance_record(
    attendance_data: AttendanceCreate,
    current_user: dict = Depends(require_permission("attendance:create"))
):
    """Create a manual attendance record"""
    try:
        # Store original times (no rounding)
        original_check_in = attendance_data.check_in
        original_check_out = attendance_data.check_out
        
        # Calculate rounded times separately (for calculation purposes)
        # Check-in rounds UP, check-out rounds DOWN
        rounded_check_in = round_check_in(original_check_in) if original_check_in else None
        rounded_check_out = round_check_out(original_check_out) if original_check_out else None
        
        # Calculate hours if check-in and check-out provided (use ROUNDED times)
        regular_hours = attendance_data.regular_hours
        ot_hours = attendance_data.ot_hours
        weekend_ot_hours = attendance_data.weekend_ot_hours
        stat_holiday_hours = attendance_data.stat_holiday_hours
        
        # Get employment (needed for all calculations)
        employment = get_current_employment(attendance_data.employee_id, attendance_data.date)
        
        if rounded_check_in and rounded_check_out:
            # Get employee schedule
            employee_schedule = get_schedule_for_date(attendance_data.employee_id, attendance_data.date)
            is_driver = employment.is_driver if employment else False
            count_all_ot = employment.count_all_ot if employment else False
            
            schedule = None
            if employee_schedule:
                try:
                    from models.work_schedule import WorkSchedule
                    work_schedule = employee_schedule.schedule if hasattr(employee_schedule, 'schedule') else None
                    if work_schedule and isinstance(work_schedule, WorkSchedule) and hasattr(work_schedule, 'get_day_times'):
                        schedule = work_schedule
                except (AttributeError, TypeError):
                    schedule = None
            day_of_week = attendance_data.date.weekday()
            is_weekend = day_of_week >= 5
            schedule_start, schedule_end = (None, None)
            weekday_schedule_start = None
            if schedule:
                try:
                    from models.work_schedule import WorkSchedule
                    if isinstance(schedule, WorkSchedule) and hasattr(schedule, 'get_day_times'):
                        schedule_start, schedule_end = schedule.get_day_times(day_of_week)
                        # For weekends, get weekday schedule start time (try Monday-Friday) for weekend OT calculation
                        if is_weekend:
                            # Try Monday through Friday to find a weekday schedule start time
                            for weekday in range(5):  # 0=Monday to 4=Friday
                                weekday_start, _ = schedule.get_day_times(weekday)
                                if weekday_start:
                                    weekday_schedule_start = weekday_start
                                    break
                except (AttributeError, TypeError):
                    schedule_start, schedule_end = (None, None)
            
            regular, ot, weekend_ot = calculate_hours_worked(
                rounded_check_in, rounded_check_out, schedule_start, schedule_end,
                attendance_data.date, is_driver, weekday_schedule_start, count_all_ot
            )
            regular_hours = regular
            ot_hours = ot
            weekend_ot_hours = weekend_ot
        
        # Calculate statutory holiday hours if not provided and applicable
        if (stat_holiday_hours is None or stat_holiday_hours == 0.0) and employment and employment.company_id:
            holidays = get_holidays_in_range(
                employment.company_id,
                attendance_data.date,
                attendance_data.date,
                attendance_data.employee_id
            )
            if attendance_data.date in holidays:
                # Calculate stat holiday entitlement based on BC ESA rules
                stat_holiday_hours = calculate_stat_holiday_entitlement(
                    attendance_data.employee_id,
                    attendance_data.date,
                    attendance_data.date,
                    attendance_data.date,
                    employment.company_id
                )
        
        # Parse override fields if provided
        override_check_in = None
        override_check_out = None
        if hasattr(attendance_data, 'override_check_in') and attendance_data.override_check_in:
            override_check_in = attendance_data.override_check_in
        if hasattr(attendance_data, 'override_check_out') and attendance_data.override_check_out:
            override_check_out = attendance_data.override_check_out
        
        attendance = create_attendance(
            employee_id=attendance_data.employee_id,
            attendance_date=attendance_data.date,
            check_in=original_check_in,
            check_out=original_check_out,
            rounded_check_in=rounded_check_in,
            rounded_check_out=rounded_check_out,
            regular_hours=regular_hours,
            ot_hours=ot_hours,
            weekend_ot_hours=weekend_ot_hours,
            stat_holiday_hours=stat_holiday_hours,
            notes=attendance_data.notes,
            remarks=attendance_data.remarks,
            override_check_in=override_check_in,
            override_check_out=override_check_out,
            override_regular_hours=getattr(attendance_data, 'override_regular_hours', None),
            override_ot_hours=getattr(attendance_data, 'override_ot_hours', None),
            override_weekend_ot_hours=getattr(attendance_data, 'override_weekend_ot_hours', None),
            override_stat_holiday_hours=getattr(attendance_data, 'override_stat_holiday_hours', None),
            time_edit_reason=getattr(attendance_data, 'time_edit_reason', None),
            hours_edit_reason=getattr(attendance_data, 'hours_edit_reason', None),
            is_manual_override=getattr(attendance_data, 'is_manual_override', False),
            performed_by=current_user.get('username'),
        )
        return attendance
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating attendance: {str(e)}")


@router.get("", response_model=AttendanceListResponse)
async def list_attendance_records(
    employee_id: Optional[str] = Query(None, description="Filter by employee ID"),
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    company_id: Optional[str] = Query(None, description="Filter by company ID"),
    pay_period_start: Optional[date] = Query(None, description="Pay period start date"),
    pay_period_end: Optional[date] = Query(None, description="Pay period end date"),
    current_user: dict = Depends(require_permission("attendance:view"))
):
    """List attendance records with filters. Requires pay period if employee_id is provided."""
    try:
        from datetime import timedelta
        from models.base import SessionLocal
        
        # If pay period is specified, use those dates
        if pay_period_start and pay_period_end:
            start_date = pay_period_start
            end_date = pay_period_end
        
        # If employee_id is provided, pay period is required
        if employee_id and not (pay_period_start and pay_period_end):
            return {
                "success": True,
                "data": []
            }
        
        # If no employee_id but pay period is provided, require it to show data
        # If no pay period, return empty list
        if not employee_id:
            # If no pay period dates provided, return empty
            if not (pay_period_start and pay_period_end):
                return {
                    "success": True,
                    "data": []
                }
            
            # Use pay_period dates for the query
            start_date = pay_period_start
            end_date = pay_period_end
            
            records = list_attendance(
                employee_id=employee_id,
                start_date=start_date,
                end_date=end_date,
                company_id=company_id,
            )
            
            # Get all unique employee IDs from records
            employee_ids = set(record.employee_id for record in records)
            
            # If company_id not provided, try to infer from employee records
            company_ids = set()
            if company_id:
                company_ids.add(company_id)
            else:
                # Get company_id from each employee's employment
                for emp_id in employee_ids:
                    employment = get_current_employment(emp_id, start_date)
                    if employment and employment.company_id:
                        company_ids.add(employment.company_id)
            
            # Ensure we have at least one company to check (use company_id filter if available)
            companies_to_check = company_ids if company_ids else (set([company_id]) if company_id else set())
            
            # Get leave records for all employees
            all_leaves = {}
            for emp_id in employee_ids:
                leaves = get_leaves_in_range(emp_id, start_date, end_date)
                for leave in leaves:
                    leave_date = leave.start_date
                    while leave_date <= leave.end_date:
                        if start_date <= leave_date <= end_date:
                            key = (emp_id, leave_date)
                            if key not in all_leaves:
                                all_leaves[key] = leave
                        leave_date += timedelta(days=1)
            
            # Get holiday names for all companies
            # Query all holidays for all companies in the date range
            holiday_names = {}
            # If no companies found, try to get all companies from the database
            if not companies_to_check:
                # Try to get company_id from the filter parameter
                if company_id:
                    companies_to_check = {company_id}
                else:
                    # If still empty, try to get all companies that have employees in the date range
                    with SessionLocal() as session:
                        from models.employment import Employment
                        from sqlalchemy import distinct
                        company_results = session.execute(
                            select(distinct(Employment.company_id))
                            .where(
                                and_(
                                    Employment.start_date <= end_date,
                                    or_(
                                        Employment.end_date >= start_date,
                                        Employment.end_date == None
                                    )
                                )
                            )
                        ).scalars().all()
                        companies_to_check = set(comp_id for comp_id in company_results if comp_id)
            
            if companies_to_check:
                with SessionLocal() as session:
                    from models.holiday import Holiday
                    # Query all holidays for all companies in the date range
                    for comp_id in companies_to_check:
                        if not comp_id:
                            continue
                        holidays = session.execute(
                            select(Holiday).where(
                                and_(
                                    Holiday.company_id == comp_id,
                                    Holiday.holiday_date >= start_date,
                                    Holiday.holiday_date <= end_date,
                                    Holiday.is_active == True
                                )
                            )
                        ).scalars().all()
                        for holiday in holidays:
                            # Only add if not already added (prefer first company found)
                            if holiday.holiday_date not in holiday_names:
                                holiday_names[holiday.holiday_date] = holiday.name
            
            # Add employee names to the response
            attendance_data = []
            
            # Create a map of attendance records by (employee_id, date) for quick lookup
            attendance_map = {(r.employee_id, r.date): r for r in records}
            
            # Generate all combinations of employees and dates that have leaves/holidays
            # Then add attendance records for those dates
            all_dates_with_data = set()
            
            # Add all dates from attendance records
            for record in records:
                all_dates_with_data.add((record.employee_id, record.date))
            
            # Add all dates from leaves
            for leave_key in all_leaves.keys():
                all_dates_with_data.add(leave_key)
            
            # Add all dates from holidays (for all employees)
            if holiday_names:
                for holiday_date in holiday_names.keys():
                    # Add holiday date for all employees who have attendance in the period
                    for emp_id in employee_ids:
                        all_dates_with_data.add((emp_id, holiday_date))
            
            # Process all dates
            for emp_id, record_date in sorted(all_dates_with_data):
                # Get attendance record if exists
                attendance = attendance_map.get((emp_id, record_date))
                
                # Get employee info
                employee = get_employee(emp_id)
                
                # Get leave for this date
                leave = all_leaves.get((emp_id, record_date))
                leave_type_name = None
                if leave:
                    with SessionLocal() as session:
                        from models.leave_type import LeaveType
                        leave_type_obj = session.get(LeaveType, leave.leave_type_id)
                        if leave_type_obj:
                            leave_type_name = leave_type_obj.name
                
                # Get stat holiday name
                stat_holiday_name = holiday_names.get(record_date)
                
                # Build record dict
                if attendance:
                    # Use existing attendance record
                    # Check if we need to calculate regular hours for sick leave
                    # BUT respect override_regular_hours if it exists
                    display_regular_hours = attendance.regular_hours or 0.0
                    if display_regular_hours == 0.0 and not attendance.check_in and not attendance.check_out and leave:
                        # Check if there's an override first - if so, don't override it with sick leave calculation
                        has_override = attendance.override_regular_hours is not None
                        if not has_override:
                            # Check if it's sick leave and calculate regular hours
                            with SessionLocal() as session:
                                from models.leave_type import LeaveType
                                leave_type_obj = session.get(LeaveType, leave.leave_type_id) if leave else None
                                if leave_type_obj and leave_type_obj.code.upper() == "SICK":
                                    # Sick leave is paid leave, calculate scheduled hours
                                    employee_schedule = get_schedule_for_date(emp_id, record_date)
                                    scheduled_hours = 0.0
                                    if employee_schedule and employee_schedule.schedule:
                                        try:
                                            from models.work_schedule import WorkSchedule
                                            work_schedule = employee_schedule.schedule
                                            if isinstance(work_schedule, WorkSchedule) and hasattr(work_schedule, 'get_day_times'):
                                                day_of_week = record_date.weekday()
                                                schedule_start, schedule_end = work_schedule.get_day_times(day_of_week)
                                                if schedule_start and schedule_end:
                                                    schedule_start_dt = datetime.combine(record_date, schedule_start)
                                                    schedule_end_dt = datetime.combine(record_date, schedule_end)
                                                    if schedule_end < schedule_start:
                                                        schedule_end_dt += timedelta(days=1)
                                                    scheduled_seconds = (schedule_end_dt - schedule_start_dt).total_seconds()
                                                    scheduled_hours = scheduled_seconds / 3600.0
                                        except (AttributeError, TypeError):
                                            pass
                                    
                                    if scheduled_hours == 0.0:
                                        scheduled_hours = 8.0  # Default for paid sick leave
                                    display_regular_hours = scheduled_hours
                        else:
                            # Use override value
                            display_regular_hours = attendance.override_regular_hours
                    
                    # Append remarks to leave/stat holiday display
                    display_leave_type = leave_type_name
                    display_stat_holiday = stat_holiday_name
                    if attendance.remarks:
                        if display_leave_type:
                            display_leave_type = f"{display_leave_type} - {attendance.remarks}"
                        elif display_stat_holiday:
                            display_stat_holiday = f"{display_stat_holiday} - {attendance.remarks}"
                        elif not display_leave_type and not display_stat_holiday:
                            # If no leave or holiday, remarks goes in leave column
                            display_leave_type = attendance.remarks
                    
                    record_dict = {
                        "id": attendance.id,
                        "employee_id": attendance.employee_id,
                        "employee_name": employee.full_name if employee else attendance.employee_id,
                        "date": attendance.date.isoformat(),
                        "check_in": attendance.check_in.strftime("%H:%M:%S") if attendance.check_in else None,
                        "check_out": attendance.check_out.strftime("%H:%M:%S") if attendance.check_out else None,
                        "rounded_check_in": attendance.rounded_check_in.strftime("%H:%M:%S") if attendance.rounded_check_in else None,
                        "rounded_check_out": attendance.rounded_check_out.strftime("%H:%M:%S") if attendance.rounded_check_out else None,
                        "regular_hours": display_regular_hours,
                        "ot_hours": attendance.ot_hours or 0.0,
                        "weekend_ot_hours": attendance.weekend_ot_hours or 0.0,
                        "stat_holiday_hours": attendance.stat_holiday_hours or 0.0,
                        "is_manual_override": attendance.is_manual_override,
                        "override_check_in": attendance.override_check_in.strftime("%H:%M:%S") if attendance.override_check_in else None,
                        "override_check_out": attendance.override_check_out.strftime("%H:%M:%S") if attendance.override_check_out else None,
                        "override_regular_hours": attendance.override_regular_hours,
                        "override_ot_hours": attendance.override_ot_hours,
                        "override_weekend_ot_hours": attendance.override_weekend_ot_hours,
                        "override_stat_holiday_hours": attendance.override_stat_holiday_hours,
                        "time_edit_reason": attendance.time_edit_reason,
                        "hours_edit_reason": attendance.hours_edit_reason,
                        "notes": attendance.notes,
                        "remarks": attendance.remarks,
                        "leave_type": display_leave_type,
                        "stat_holiday_name": display_stat_holiday,
                        "created_at": attendance.created_at,
                        "updated_at": attendance.updated_at,
                    }
                else:
                    # Create virtual record for leave/holiday date without attendance
                    # Get employment to determine if we should show this
                    employment = get_current_employment(emp_id, record_date)
                    if not employment or (company_id and employment.company_id != company_id):
                        continue  # Skip if employee not employed or wrong company
                    
                    # Calculate regular hours for paid leave
                    regular_hours = 0.0
                    if leave:
                        with SessionLocal() as session:
                            from models.leave_type import LeaveType
                            leave_type_obj = session.get(LeaveType, leave.leave_type_id) if leave else None
                            if leave_type_obj and leave_type_obj.code.upper() in ["SICK", "VAC"]:
                                # Paid leave - calculate scheduled hours
                                employee_schedule = get_schedule_for_date(emp_id, record_date)
                                scheduled_hours = 0.0
                                if employee_schedule and employee_schedule.schedule:
                                    try:
                                        from models.work_schedule import WorkSchedule
                                        work_schedule = employee_schedule.schedule
                                        if isinstance(work_schedule, WorkSchedule) and hasattr(work_schedule, 'get_day_times'):
                                            day_of_week = record_date.weekday()
                                            schedule_start, schedule_end = work_schedule.get_day_times(day_of_week)
                                            if schedule_start and schedule_end:
                                                schedule_start_dt = datetime.combine(record_date, schedule_start)
                                                schedule_end_dt = datetime.combine(record_date, schedule_end)
                                                if schedule_end < schedule_start:
                                                    schedule_end_dt += timedelta(days=1)
                                                scheduled_seconds = (schedule_end_dt - schedule_start_dt).total_seconds()
                                                scheduled_hours = scheduled_seconds / 3600.0
                                    except (AttributeError, TypeError):
                                        pass
                                
                                if scheduled_hours == 0.0:
                                    scheduled_hours = 8.0  # Default for paid leave
                                regular_hours = scheduled_hours
                    
                    # Calculate stat holiday hours if applicable
                    stat_holiday_hours = 0.0
                    if stat_holiday_name:
                        stat_holiday_hours = calculate_stat_holiday_entitlement(
                            emp_id, record_date, start_date, end_date, company_id or employment.company_id
                        ) if employment else 0.0
                    
                    record_dict = {
                        "id": None,
                        "employee_id": emp_id,
                        "employee_name": employee.full_name if employee else emp_id,
                        "date": record_date.isoformat(),
                        "check_in": None,
                        "check_out": None,
                        "rounded_check_in": None,
                        "rounded_check_out": None,
                        "regular_hours": regular_hours,
                        "ot_hours": 0.0,
                        "weekend_ot_hours": 0.0,
                        "stat_holiday_hours": stat_holiday_hours,
                        "is_manual_override": False,
                        "override_check_in": None,
                        "override_check_out": None,
                        "override_regular_hours": None,
                        "override_ot_hours": None,
                        "override_weekend_ot_hours": None,
                        "override_stat_holiday_hours": None,
                        "time_edit_reason": None,
                        "hours_edit_reason": None,
                        "notes": None,
                        "remarks": None,
                        "leave_type": leave_type_name,
                        "stat_holiday_name": stat_holiday_name,
                        "created_at": None,
                        "updated_at": None,
                    }
                
                attendance_data.append(AttendanceResponse(**record_dict))
            
            return {
                "success": True,
                "data": attendance_data
            }
        
        # New logic: Generate all dates in pay period for the employee
        # Get company_id from employee's employment if not provided
        if not company_id:
            employment = get_current_employment(employee_id, start_date)
            if employment:
                company_id = employment.company_id
        
        if not company_id:
            return {
                "success": True,
                "data": []
            }
        
        # Get all holidays in the period (filtered by union membership)
        holidays = get_holidays_in_range(company_id, start_date, end_date, employee_id)
        holiday_dates = set(holidays)
        
        # Get all leave records for the employee in the period
        leaves = get_leaves_in_range(employee_id, start_date, end_date)
        # Create a map of date -> leave record
        leave_map = {}
        for leave in leaves:
            # Iterate through all dates in the leave range
            leave_date = leave.start_date
            while leave_date <= leave.end_date:
                # Only include dates that are within the pay period
                if start_date <= leave_date <= end_date:
                    leave_map[leave_date] = leave
                leave_date += timedelta(days=1)
        
        # Get existing attendance records
        existing_attendance = list_attendance(
            employee_id=employee_id,
            start_date=start_date,
            end_date=end_date,
            company_id=company_id,
        )
        attendance_map = {record.date: record for record in existing_attendance}
        
        # Generate all dates in the pay period
        attendance_data = []
        current_date = start_date
        while current_date <= end_date:
            # Get attendance record if exists
            attendance = attendance_map.get(current_date)
            
            # Get leave for this date
            leave = leave_map.get(current_date)
            leave_type_name = None
            leave_type_code = None
            if leave:
                # leave_type_id is an ID, not a code
                with SessionLocal() as session:
                    from models.leave_type import LeaveType
                    leave_type_obj = session.get(LeaveType, leave.leave_type_id)
                    if leave_type_obj:
                        leave_type_name = leave_type_obj.name
                        leave_type_code = leave_type_obj.code
                    else:
                        # If leave_type lookup fails, log for debugging but continue
                        # This shouldn't happen in normal operation
                        pass
            
            # Check if it's a statutory holiday
            is_stat_holiday = current_date in holiday_dates
            stat_holiday_name = None
            if is_stat_holiday:
                with SessionLocal() as session:
                    from models.holiday import Holiday
                    holiday = session.execute(
                        select(Holiday).where(
                            and_(
                                Holiday.company_id == company_id,
                                Holiday.holiday_date == current_date,
                                Holiday.is_active == True
                            )
                        )
                    ).scalar_one_or_none()
                    if holiday:
                        stat_holiday_name = holiday.name
            
            # Get schedule for this date
            employee_schedule = get_schedule_for_date(employee_id, current_date)
            schedule = None
            scheduled_hours = 0.0
            is_working_day = False
            if employee_schedule:
                # Safely get the WorkSchedule object from EmployeeSchedule
                try:
                    from models.work_schedule import WorkSchedule
                    work_schedule = employee_schedule.schedule if hasattr(employee_schedule, 'schedule') else None
                    # Verify it's actually a WorkSchedule object (not EmployeeSchedule)
                    if work_schedule and isinstance(work_schedule, WorkSchedule) and hasattr(work_schedule, 'get_day_times'):
                        schedule = work_schedule
                        day_of_week = current_date.weekday()
                        schedule_start, schedule_end = schedule.get_day_times(day_of_week)
                        if schedule_start and schedule_end:
                            is_working_day = True
                            # Calculate scheduled hours
                            schedule_start_dt = datetime.combine(current_date, schedule_start)
                            schedule_end_dt = datetime.combine(current_date, schedule_end)
                            if schedule_end < schedule_start:
                                schedule_end_dt += timedelta(days=1)
                            scheduled_seconds = (schedule_end_dt - schedule_start_dt).total_seconds()
                            scheduled_hours = scheduled_seconds / 3600.0
                except (AttributeError, TypeError) as e:
                    # If there's an issue accessing the schedule, log but continue
                    pass
            
            # If no schedule found for this specific day but we have a leave, 
            # try to get default scheduled hours from a typical weekday
            if scheduled_hours == 0.0 and leave and employee_schedule:
                try:
                    from models.work_schedule import WorkSchedule
                    work_schedule = employee_schedule.schedule if hasattr(employee_schedule, 'schedule') else None
                    if work_schedule and isinstance(work_schedule, WorkSchedule) and hasattr(work_schedule, 'get_day_times'):
                        schedule = work_schedule
                        # Try Monday-Friday to find a typical work day
                        for weekday in range(5):  # 0=Monday to 4=Friday
                            schedule_start, schedule_end = schedule.get_day_times(weekday)
                            if schedule_start and schedule_end:
                                schedule_start_dt = datetime.combine(current_date, schedule_start)
                                schedule_end_dt = datetime.combine(current_date, schedule_end)
                                if schedule_end < schedule_start:
                                    schedule_end_dt += timedelta(days=1)
                                scheduled_seconds = (schedule_end_dt - schedule_start_dt).total_seconds()
                                scheduled_hours = scheduled_seconds / 3600.0
                                break
                except (AttributeError, TypeError) as e:
                    # If there's an issue accessing the schedule, log but continue
                    pass
            
            # Determine regular hours
            regular_hours = 0.0
            if attendance:
                # Use effective regular hours from attendance
                regular_hours = attendance.get_effective_regular_hours() or 0.0
                
                # Check for sick leave even if regular hours exist (handles attendance records with regular_hours set)
                if not attendance.check_in and not attendance.check_out:
                    has_override = attendance.override_regular_hours is not None
                    if leave and leave_type_code and leave_type_code.upper() == "SICK":
                        # Sick leave is paid, use scheduled hours OR existing regular hours
                        if regular_hours == 0.0:  # Only calculate if not already set
                            if is_working_day:
                                regular_hours = scheduled_hours
                            else:
                                if scheduled_hours > 0:
                                    regular_hours = scheduled_hours
                                else:
                                    regular_hours = 8.0  # Default for paid sick leave
            elif leave and leave_type_code:
                # Check if it's a paid leave type (Sick Leave or Vacation)
                # Vacation days should show 0.00 regular hours (they count towards eligibility but not hours)
                # Sick leave is still paid leave and shows regular hours
                is_paid_leave = False
                if leave_type_code.upper() == "VAC":
                    # Vacation days show 0.00 regular hours
                    regular_hours = 0.0
                elif leave_type_code.upper() == "SICK":
                    # Sick leave is paid leave, use scheduled hours
                    if is_working_day:
                        regular_hours = scheduled_hours
                        is_paid_leave = True
                    else:
                        if scheduled_hours > 0:
                            regular_hours = scheduled_hours
                        else:
                            regular_hours = 8.0  # Default for paid sick leave
                        is_paid_leave = True
                
                # If not paid leave, regular hours remain 0.0
                if not is_paid_leave and leave_type_code.upper() != "VAC":
                    regular_hours = 0.0
            
            # Build the attendance response
            if attendance:
                # Use existing attendance record
                # IMPORTANT: Return ORIGINAL calculated values in main fields, not effective values
                # The frontend will calculate effective values by checking if override fields exist
                employee = get_employee(employee_id)
                
                # If we calculated regular_hours for sick leave (because attendance had 0.0 and no check-in/check-out),
                # use the calculated value instead of the stored value
                # BUT respect override_regular_hours if it exists
                display_regular_hours = attendance.regular_hours or 0.0
                if regular_hours > 0.0 and (attendance.regular_hours or 0.0) == 0.0 and not attendance.check_in and not attendance.check_out:
                    # Only use calculated sick leave hours if there's no override
                    if attendance.override_regular_hours is None:
                        display_regular_hours = regular_hours
                    else:
                        # Use override value
                        display_regular_hours = attendance.override_regular_hours
                
                # Append remarks to leave/stat holiday display
                display_leave_type = leave_type_name
                display_stat_holiday = stat_holiday_name
                if attendance.remarks:
                    if display_leave_type:
                        display_leave_type = f"{display_leave_type} - {attendance.remarks}"
                    elif display_stat_holiday:
                        display_stat_holiday = f"{display_stat_holiday} - {attendance.remarks}"
                    elif not display_leave_type and not display_stat_holiday:
                        # If no leave or holiday, remarks goes in leave column
                        display_leave_type = attendance.remarks
                
                record_dict = {
                    "id": attendance.id,
                    "employee_id": attendance.employee_id,
                    "employee_name": employee.full_name if employee else attendance.employee_id,
                    "date": attendance.date.isoformat(),
                    "check_in": attendance.check_in.strftime("%H:%M:%S") if attendance.check_in else None,
                    "check_out": attendance.check_out.strftime("%H:%M:%S") if attendance.check_out else None,
                    "rounded_check_in": attendance.rounded_check_in.strftime("%H:%M:%S") if attendance.rounded_check_in else None,
                    "rounded_check_out": attendance.rounded_check_out.strftime("%H:%M:%S") if attendance.rounded_check_out else None,
                    "regular_hours": display_regular_hours,  # Use calculated value for sick leave if applicable
                    "ot_hours": attendance.ot_hours or 0.0,  # Original calculated value
                    "weekend_ot_hours": attendance.weekend_ot_hours or 0.0,  # Original calculated value
                    "stat_holiday_hours": attendance.stat_holiday_hours or 0.0,  # Original calculated value
                    "is_manual_override": attendance.is_manual_override,
                    "override_check_in": attendance.override_check_in.strftime("%H:%M:%S") if attendance.override_check_in else None,
                    "override_check_out": attendance.override_check_out.strftime("%H:%M:%S") if attendance.override_check_out else None,
                    "override_regular_hours": attendance.override_regular_hours,
                    "override_ot_hours": attendance.override_ot_hours,
                    "override_weekend_ot_hours": attendance.override_weekend_ot_hours,
                    "override_stat_holiday_hours": attendance.override_stat_holiday_hours,
                    "time_edit_reason": attendance.time_edit_reason,
                    "hours_edit_reason": attendance.hours_edit_reason,
                    "notes": attendance.notes,
                    "remarks": attendance.remarks,
                    "created_at": attendance.created_at,
                    "updated_at": attendance.updated_at,
                    "leave_type": display_leave_type,
                    "stat_holiday_name": display_stat_holiday,
                }
            else:
                # Create a virtual attendance record for this date
                employee = get_employee(employee_id)
                record_dict = {
                    "id": None,  # No attendance record yet
                    "employee_id": employee_id,
                    "employee_name": employee.full_name if employee else employee_id,
                    "date": current_date.isoformat(),
                    "check_in": None,
                    "check_out": None,
                    "rounded_check_in": None,
                    "rounded_check_out": None,
                    "regular_hours": regular_hours,
                    "ot_hours": 0.0,
                    "weekend_ot_hours": 0.0,
                    "stat_holiday_hours": 0.0 if not is_stat_holiday else (
                        calculate_stat_holiday_entitlement(
                            employee_id, current_date, current_date, current_date, company_id
                        ) if is_stat_holiday else 0.0
                    ),
                    "is_manual_override": False,
                    "override_check_in": None,
                    "override_check_out": None,
                    "override_regular_hours": None,
                    "override_ot_hours": None,
                    "override_weekend_ot_hours": None,
                    "override_stat_holiday_hours": None,
                    "time_edit_reason": None,
                    "hours_edit_reason": None,
                    "notes": None,
                    "remarks": None,
                    "created_at": None,
                    "updated_at": None,
                    "leave_type": leave_type_name,
                    "stat_holiday_name": stat_holiday_name,
                }
            
            attendance_data.append(AttendanceResponse(**record_dict))
            
            current_date += timedelta(days=1)
        
        return {
            "success": True,
            "data": attendance_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing attendance: {str(e)}")


@router.get("/report/detailed", response_model=AttendanceDetailedReportResponse)
async def get_detailed_attendance_report(
    company_id: Optional[str] = Query(None, description="Company ID"),
    employee_id: Optional[str] = Query(None, description="Employee ID (optional filter)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    pay_period_start: Optional[str] = Query(None, description="Pay period start date (YYYY-MM-DD)"),
    pay_period_end: Optional[str] = Query(None, description="Pay period end date (YYYY-MM-DD)"),
    current_user: dict = Depends(require_permission("attendance:view"))
):
    """Generate detailed attendance report grouped by employee with daily records"""
    try:
        # Parse date strings - handle empty strings and None
        parsed_start_date = None
        parsed_end_date = None
        
        # If pay period is specified, use those dates
        if pay_period_start and pay_period_end:
            pay_period_start_clean = pay_period_start.strip() if isinstance(pay_period_start, str) else None
            pay_period_end_clean = pay_period_end.strip() if isinstance(pay_period_end, str) else None
            if pay_period_start_clean and pay_period_end_clean:
                try:
                    parsed_start_date = datetime.strptime(pay_period_start_clean, "%Y-%m-%d").date()
                    parsed_end_date = datetime.strptime(pay_period_end_clean, "%Y-%m-%d").date()
                except ValueError as e:
                    raise HTTPException(status_code=400, detail=f"Invalid pay period date format. Use YYYY-MM-DD: {str(e)}")
        elif start_date and end_date:
            start_date_clean = start_date.strip() if isinstance(start_date, str) else None
            end_date_clean = end_date.strip() if isinstance(end_date, str) else None
            if start_date_clean and end_date_clean:
                try:
                    parsed_start_date = datetime.strptime(start_date_clean, "%Y-%m-%d").date()
                    parsed_end_date = datetime.strptime(end_date_clean, "%Y-%m-%d").date()
                except ValueError as e:
                    raise HTTPException(status_code=400, detail=f"Invalid date format. Use YYYY-MM-DD: {str(e)}")
        
        if not parsed_start_date or not parsed_end_date:
            raise HTTPException(status_code=400, detail="Start date and end date are required (format: YYYY-MM-DD)")
        
        start_date = parsed_start_date
        end_date = parsed_end_date
        
        # Get attendance records - if employee_id is provided, use same logic as list_attendance_records
        # to include leave/holiday info for all dates
        # Only process single employee if employee_id is provided and not empty
        filter_employee_id = None
        if employee_id:
            employee_id_clean = employee_id.strip() if isinstance(employee_id, str) else str(employee_id).strip()
            if employee_id_clean:
                filter_employee_id = employee_id_clean
        
        if filter_employee_id:
            # Single employee: generate all dates with leave/holiday info
            # Get company_id from employee's employment if not provided
            if not company_id:
                employment = get_current_employment(filter_employee_id, start_date)
                if employment:
                    company_id = employment.company_id
            
            if not company_id:
                return AttendanceDetailedReportResponse(
                    success=True,
                    company_id=company_id,
                    company_name=None,
                    start_date=start_date.isoformat(),
                    end_date=end_date.isoformat(),
                    details=[],
                )
            
            # Get all holidays in the period (filtered by union membership)
            holidays = get_holidays_in_range(company_id, start_date, end_date, filter_employee_id)
            holiday_names = {}
            from models.base import SessionLocal
            from models.holiday import Holiday
            if holidays:
                with SessionLocal() as session:
                    # Fetch all holidays at once for better performance
                    holiday_records = session.query(Holiday).filter(
                        Holiday.company_id == company_id,
                        Holiday.holiday_date.in_(holidays)
                    ).all()
                    for holiday in holiday_records:
                        holiday_names[holiday.holiday_date] = holiday.name
            
            # Get all leave records for the employee in the period
            leaves = get_leaves_in_range(filter_employee_id, start_date, end_date)
            leave_map = {}
            for leave in leaves:
                leave_date = leave.start_date
                while leave_date <= leave.end_date:
                    if start_date <= leave_date <= end_date:
                        leave_map[leave_date] = leave
                    leave_date += timedelta(days=1)
            
            # Get existing attendance records
            existing_attendance = list_attendance(
                employee_id=filter_employee_id,
                start_date=start_date,
                end_date=end_date,
                company_id=company_id,
            )
            attendance_map = {record.date: record for record in existing_attendance}
            
            # Generate all dates in the pay period
            detail_rows = []
            current_date = start_date
            while current_date <= end_date:
                attendance = attendance_map.get(current_date)
                leave = leave_map.get(current_date)
                leave_type_name = None
                if leave:
                    from models.base import SessionLocal
                    with SessionLocal() as session:
                        from models.leave_type import LeaveType
                        leave_type_obj = session.get(LeaveType, leave.leave_type_id)
                        if leave_type_obj:
                            leave_type_name = leave_type_obj.name
                
                stat_holiday_name = holiday_names.get(current_date)
                
                # Determine day type
                day_type = "Weekend" if current_date.weekday() >= 5 else "Weekday"
                
                if attendance:
                    employee = get_employee(attendance.employee_id)
                    check_in = attendance.get_effective_check_in()
                    check_out = attendance.get_effective_check_out()
                    
                    # Get leave and holiday info from attendance record if available
                    # (attendance records may have leave/holiday info attached)
                    final_leave_type = leave_type_name
                    final_stat_holiday = stat_holiday_name
                    
                    # Check if attendance record has leave/holiday info (from list_attendance_records)
                    # This would be set if the record came from the list endpoint
                    if hasattr(attendance, 'leave_type') and attendance.leave_type:
                        final_leave_type = attendance.leave_type
                    if hasattr(attendance, 'stat_holiday_name') and attendance.stat_holiday_name:
                        final_stat_holiday = attendance.stat_holiday_name
                    
                    # Append remarks to leave/stat holiday display
                    if attendance.remarks:
                        if final_leave_type:
                            final_leave_type = f"{final_leave_type} - {attendance.remarks}"
                        elif final_stat_holiday:
                            final_stat_holiday = f"{final_stat_holiday} - {attendance.remarks}"
                        elif not final_leave_type and not final_stat_holiday:
                            # If no leave or holiday, remarks goes in leave column
                            final_leave_type = attendance.remarks
                    
                    detail_rows.append(AttendanceDetailRow(
                        employee_id=attendance.employee_id,
                        employee_name=employee.full_name if employee else attendance.employee_id,
                        date=current_date.isoformat(),
                        check_in=check_in.strftime("%H:%M:%S") if check_in else None,
                        check_out=check_out.strftime("%H:%M:%S") if check_out else None,
                        day_type=day_type,
                        regular_hours=attendance.get_effective_regular_hours() or 0.0,
                        ot_hours=attendance.get_effective_ot_hours() or 0.0,
                        weekend_ot_hours=attendance.get_effective_weekend_ot_hours() or 0.0,
                        stat_holiday_hours=attendance.get_effective_stat_holiday_hours() or 0.0,
                        leave_type=final_leave_type,
                        stat_holiday_name=final_stat_holiday,
                    ))
                else:
                    # Calculate regular hours for paid leave (matching summary report logic)
                    regular_hours = 0.0
                    leave_type_code = None
                    
                    # First check if there's an attendance record with regular hours (even without check-in/check-out)
                    if attendance:
                        regular_hours = attendance.get_effective_regular_hours() or 0.0
                    
                    # If still 0, calculate from leave and schedule
                    if regular_hours == 0.0 and leave and leave_type_name:
                        from models.base import SessionLocal
                        with SessionLocal() as session:
                            from models.leave_type import LeaveType
                            leave_type_obj = session.get(LeaveType, leave.leave_type_id) if leave else None
                            if leave_type_obj:
                                leave_type_code = leave_type_obj.code
                                # Check if it's a paid leave type (Sick Leave or Vacation)
                                # Vacation days should show 0.00 regular hours
                                if leave_type_code.upper() == "VAC":
                                    regular_hours = 0.0
                                elif leave_type_code.upper() == "SICK":
                                    employee_schedule = get_schedule_for_date(filter_employee_id, current_date)
                                    scheduled_hours = 0.0
                                    is_working_day = False
                                    if employee_schedule and employee_schedule.schedule:
                                        try:
                                            from models.work_schedule import WorkSchedule
                                            work_schedule = employee_schedule.schedule
                                            if isinstance(work_schedule, WorkSchedule) and hasattr(work_schedule, 'get_day_times'):
                                                day_of_week = current_date.weekday()
                                                schedule_start, schedule_end = work_schedule.get_day_times(day_of_week)
                                                if schedule_start and schedule_end:
                                                    schedule_start_dt = datetime.combine(current_date, schedule_start)
                                                    schedule_end_dt = datetime.combine(current_date, schedule_end)
                                                    if schedule_end < schedule_start:
                                                        schedule_end_dt += timedelta(days=1)
                                                    scheduled_seconds = (schedule_end_dt - schedule_start_dt).total_seconds()
                                                    scheduled_hours = scheduled_seconds / 3600.0
                                                    is_working_day = True
                                        except (AttributeError, TypeError):
                                            pass
                                    
                                    if is_working_day:
                                        regular_hours = scheduled_hours
                                    else:
                                        if scheduled_hours > 0:
                                            regular_hours = scheduled_hours
                                        else:
                                            regular_hours = 8.0  # Default for paid sick leave
                    
                    # Calculate stat holiday hours if applicable
                    stat_holiday_hours = 0.0
                    if stat_holiday_name and company_id:
                        stat_holiday_hours = calculate_stat_holiday_entitlement(
                            filter_employee_id, current_date, start_date, end_date, company_id
                        )
                    
                    # Only create a row if there are regular hours or stat holiday hours (matching summary report logic)
                    if regular_hours > 0 or stat_holiday_hours > 0:
                        employee = get_employee(filter_employee_id)
                        detail_rows.append(AttendanceDetailRow(
                            employee_id=filter_employee_id,
                            employee_name=employee.full_name if employee else filter_employee_id,
                            date=current_date.isoformat(),
                            check_in=None,
                            check_out=None,
                            day_type=day_type,
                            regular_hours=regular_hours,
                            ot_hours=0.0,
                            weekend_ot_hours=0.0,
                            stat_holiday_hours=stat_holiday_hours,
                            leave_type=leave_type_name,
                            stat_holiday_name=stat_holiday_name,
                        ))
                
                current_date += timedelta(days=1)
        else:
            # All employees: get existing attendance records
            from models.base import SessionLocal
            
            records = list_attendance(
                company_id=company_id,
                start_date=start_date,
                end_date=end_date,
            )
            
            # Get all unique employee IDs from records
            employee_ids_from_attendance = set(record.employee_id for record in records)
            
            # If company_id not provided, try to infer from employee records
            company_ids = set()
            if company_id:
                company_ids.add(company_id)
            else:
                # Get company_id from each employee's employment
                for emp_id in employee_ids_from_attendance:
                    employment = get_current_employment(emp_id, start_date)
                    if employment and employment.company_id:
                        company_ids.add(employment.company_id)
            
            # Ensure we have at least one company to check
            companies_to_check = company_ids if company_ids else (set([company_id]) if company_id else set())
            
            # Get ALL employees for the company(ies) in the date range (not just those with attendance)
            all_employee_ids = set(employee_ids_from_attendance)  # Start with employees who have attendance
            if companies_to_check:
                from models.employment import Employment
                from sqlalchemy import distinct, or_
                with SessionLocal() as session:
                    # Get all employees who have employment in the date range for these companies
                    employment_results = session.execute(
                        select(distinct(Employment.employee_id))
                        .where(
                            and_(
                                Employment.company_id.in_(list(companies_to_check)),
                                Employment.start_date <= end_date,
                                or_(
                                    Employment.end_date >= start_date,
                                    Employment.end_date == None
                                )
                            )
                        )
                    ).scalars().all()
                    all_employee_ids.update(emp_id for emp_id in employment_results if emp_id)
            
            # Get leave records for ALL employees (not just those with attendance)
            all_leaves = {}
            for emp_id in all_employee_ids:
                leaves = get_leaves_in_range(emp_id, start_date, end_date)
                for leave in leaves:
                    leave_date = leave.start_date
                    while leave_date <= leave.end_date:
                        if start_date <= leave_date <= end_date:
                            key = (emp_id, leave_date)
                            if key not in all_leaves:
                                all_leaves[key] = leave
                        leave_date += timedelta(days=1)
            
            # Get holiday names for all companies
            holiday_names = {}
            if not companies_to_check:
                if company_id:
                    companies_to_check = {company_id}
                else:
                    # Try to get all companies that have employees in the date range
                    from models.employment import Employment
                    from sqlalchemy import distinct, or_
                    with SessionLocal() as session:
                        company_results = session.execute(
                            select(distinct(Employment.company_id))
                            .where(
                                and_(
                                    Employment.start_date <= end_date,
                                    or_(
                                        Employment.end_date >= start_date,
                                        Employment.end_date == None
                                    )
                                )
                            )
                        ).scalars().all()
                        companies_to_check = set(comp_id for comp_id in company_results if comp_id)
            
            if companies_to_check:
                from models.holiday import Holiday
                with SessionLocal() as session:
                    for comp_id in companies_to_check:
                        if not comp_id:
                            continue
                        holidays = session.execute(
                            select(Holiday).where(
                                and_(
                                    Holiday.company_id == comp_id,
                                    Holiday.holiday_date >= start_date,
                                    Holiday.holiday_date <= end_date,
                                    Holiday.is_active == True
                                )
                            )
                        ).scalars().all()
                        for holiday in holidays:
                            if holiday.holiday_date not in holiday_names:
                                holiday_names[holiday.holiday_date] = holiday.name
            
            # Sort by employee_id and date
            records.sort(key=lambda r: (r.employee_id, r.date))
            
            # Build detailed report rows
            detail_rows = []
            for record in records:
                employee = get_employee(record.employee_id)
                
                # Determine day type (Weekday or Weekend)
                day_type = "Weekend" if record.date.weekday() >= 5 else "Weekday"
                
                # Get effective check-in/check-out times (display full time with seconds, no rounding)
                check_in = record.get_effective_check_in()
                check_out = record.get_effective_check_out()
                
                # Get leave information for this employee and date
                leave_type_name = None
                leave_key = (record.employee_id, record.date)
                if leave_key in all_leaves:
                    leave = all_leaves[leave_key]
                    with SessionLocal() as session:
                        from models.leave_type import LeaveType
                        leave_type_obj = session.get(LeaveType, leave.leave_type_id)
                        if leave_type_obj:
                            leave_type_name = leave_type_obj.name
                
                # Get holiday information for this date
                stat_holiday_name = holiday_names.get(record.date)
                
                # Append remarks to leave/stat holiday display
                display_leave_type = leave_type_name
                display_stat_holiday = stat_holiday_name
                if record.remarks:
                    if display_leave_type:
                        display_leave_type = f"{display_leave_type} - {record.remarks}"
                    elif display_stat_holiday:
                        display_stat_holiday = f"{display_stat_holiday} - {record.remarks}"
                    elif not display_leave_type and not display_stat_holiday:
                        # If no leave or holiday, remarks goes in leave column
                        display_leave_type = record.remarks
                
                detail_rows.append(AttendanceDetailRow(
                    employee_id=record.employee_id,
                    employee_name=employee.full_name if employee else record.employee_id,
                    date=record.date.isoformat(),
                    check_in=check_in.strftime("%H:%M:%S") if check_in else None,
                    check_out=check_out.strftime("%H:%M:%S") if check_out else None,
                    day_type=day_type,
                    regular_hours=record.get_effective_regular_hours() or 0.0,
                    ot_hours=record.get_effective_ot_hours() or 0.0,
                    weekend_ot_hours=record.get_effective_weekend_ot_hours() or 0.0,
                    leave_type=display_leave_type,
                    stat_holiday_name=display_stat_holiday,
                ))
        
        company_name = None
        if company_id:
            company = get_company_by_id(company_id)
            company_name = company.legal_name if company else None
        
        return AttendanceDetailedReportResponse(
            success=True,
            company_id=company_id,
            company_name=company_name,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            details=detail_rows,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating detailed report: {str(e)}")


@router.get("/report", response_model=AttendanceReportResponse)
async def get_attendance_report(
    company_id: Optional[str] = Query(None, description="Company ID"),
    employee_id: Optional[str] = Query(None, description="Employee ID (optional filter)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    pay_period_start: Optional[str] = Query(None, description="Pay period start date (YYYY-MM-DD)"),
    pay_period_end: Optional[str] = Query(None, description="Pay period end date (YYYY-MM-DD)"),
    current_user: dict = Depends(require_permission("attendance:view"))
):
    """Generate attendance report summary"""
    import traceback
    try:
        # Parse date strings - handle empty strings and None
        parsed_start_date = None
        parsed_end_date = None
        
        # If pay period is specified, use those dates
        if pay_period_start and pay_period_end:
            pay_period_start_clean = pay_period_start.strip() if isinstance(pay_period_start, str) else None
            pay_period_end_clean = pay_period_end.strip() if isinstance(pay_period_end, str) else None
            if pay_period_start_clean and pay_period_end_clean:
                try:
                    parsed_start_date = datetime.strptime(pay_period_start_clean, "%Y-%m-%d").date()
                    parsed_end_date = datetime.strptime(pay_period_end_clean, "%Y-%m-%d").date()
                except ValueError as e:
                    raise HTTPException(status_code=400, detail=f"Invalid pay period date format. Use YYYY-MM-DD: {str(e)}")
        elif start_date and end_date:
            start_date_clean = start_date.strip() if isinstance(start_date, str) else None
            end_date_clean = end_date.strip() if isinstance(end_date, str) else None
            if start_date_clean and end_date_clean:
                try:
                    parsed_start_date = datetime.strptime(start_date_clean, "%Y-%m-%d").date()
                    parsed_end_date = datetime.strptime(end_date_clean, "%Y-%m-%d").date()
                except ValueError as e:
                    raise HTTPException(status_code=400, detail=f"Invalid date format. Use YYYY-MM-DD: {str(e)}")
        
        if not parsed_start_date or not parsed_end_date:
            raise HTTPException(status_code=400, detail="Start date and end date are required (format: YYYY-MM-DD)")
        
        start_date = parsed_start_date
        end_date = parsed_end_date
        
        # Get all attendance records for the period (with employee filter if provided)
        # Only filter by employee_id if it's provided and not empty
        filter_employee_id = None
        if employee_id:
            employee_id_clean = employee_id.strip() if isinstance(employee_id, str) else str(employee_id).strip()
            if employee_id_clean:
                filter_employee_id = employee_id_clean
        
        # Use list_attendance_records logic to get all records including leave days with regular hours
        # This ensures we include paid leave days (SICK, VAC) that have regular hours
        if filter_employee_id:
            # For single employee, use the same logic as list_attendance_records to include leave days
            from models.base import SessionLocal
            
            # Get company_id from employee's employment if not provided
            if not company_id:
                employment = get_current_employment(filter_employee_id, start_date)
                if employment:
                    company_id = employment.company_id
            
            # Get all holidays in the period (filtered by union membership)
            holidays = get_holidays_in_range(company_id, start_date, end_date, filter_employee_id) if company_id else []
            holiday_dates = set(holidays)
            
            # Get all leave records for the employee in the period
            leaves = get_leaves_in_range(filter_employee_id, start_date, end_date)
            leave_map = {}
            for leave in leaves:
                leave_date = leave.start_date
                while leave_date <= leave.end_date:
                    if start_date <= leave_date <= end_date:
                        leave_map[leave_date] = leave
                    leave_date += timedelta(days=1)
            
            # Get existing attendance records
            existing_attendance = list_attendance(
                employee_id=filter_employee_id,
                start_date=start_date,
                end_date=end_date,
                company_id=company_id,
            )
            attendance_map = {record.date: record for record in existing_attendance}
            
            # Generate all dates in the pay period and build records
            records = []
            current_date = start_date
            while current_date <= end_date:
                attendance = attendance_map.get(current_date)
                leave = leave_map.get(current_date)
                is_stat_holiday = current_date in holiday_dates
                
                # Get leave type info
                leave_type_code = None
                if leave:
                    with SessionLocal() as session:
                        from models.leave_type import LeaveType
                        leave_type_obj = session.get(LeaveType, leave.leave_type_id)
                        if leave_type_obj:
                            leave_type_code = leave_type_obj.code
                
                # Get schedule for this date
                employee_schedule = get_schedule_for_date(filter_employee_id, current_date)
                scheduled_hours = 0.0
                is_working_day = False
                if employee_schedule and employee_schedule.schedule:
                    try:
                        from models.work_schedule import WorkSchedule
                        work_schedule = employee_schedule.schedule
                        if isinstance(work_schedule, WorkSchedule) and hasattr(work_schedule, 'get_day_times'):
                            day_of_week = current_date.weekday()
                            schedule_start, schedule_end = work_schedule.get_day_times(day_of_week)
                            if schedule_start and schedule_end:
                                schedule_start_dt = datetime.combine(current_date, schedule_start)
                                schedule_end_dt = datetime.combine(current_date, schedule_end)
                                if schedule_end < schedule_start:
                                    schedule_end_dt += timedelta(days=1)
                                scheduled_seconds = (schedule_end_dt - schedule_start_dt).total_seconds()
                                scheduled_hours = scheduled_seconds / 3600.0
                                is_working_day = True
                    except (AttributeError, TypeError):
                        pass
                
                # Determine regular hours
                regular_hours = 0.0
                if attendance:
                    regular_hours = attendance.get_effective_regular_hours() or 0.0
                    
                    # Check for sick leave even if regular hours exist (handles attendance records with regular_hours set)
                    if not attendance.check_in and not attendance.check_out:
                        has_override = attendance.override_regular_hours is not None
                        if leave and leave_type_code and leave_type_code.upper() == "SICK":
                            # Sick leave is paid, use scheduled hours OR existing regular hours
                            if regular_hours == 0.0:  # Only calculate if not already set
                                if is_working_day:
                                    regular_hours = scheduled_hours
                                else:
                                    if scheduled_hours > 0:
                                        regular_hours = scheduled_hours
                                    else:
                                        regular_hours = 8.0  # Default for paid sick leave
                        elif has_override:
                            # Use override value
                            regular_hours = attendance.override_regular_hours
                elif leave and leave_type_code:
                    # Check if it's a paid leave type (Sick Leave or Vacation)
                    # Vacation days should show 0.00 regular hours
                    if leave_type_code.upper() == "VAC":
                        regular_hours = 0.0
                    elif leave_type_code.upper() == "SICK":
                        if is_working_day:
                            regular_hours = scheduled_hours
                        else:
                            if scheduled_hours > 0:
                                regular_hours = scheduled_hours
                            else:
                                regular_hours = 8.0  # Default for paid sick leave
                
                # Create a record object for this date
                if attendance:
                    records.append(attendance)
                elif regular_hours > 0 or is_stat_holiday:
                    # Create a virtual record for leave days with regular hours or stat holidays
                    class VirtualRecord:
                        def __init__(self, emp_id, date, reg_hours, stat_hours):
                            self.employee_id = emp_id
                            self.date = date
                            self._regular_hours = reg_hours
                            self._stat_holiday_hours = stat_hours
                        
                        def get_effective_regular_hours(self):
                            return self._regular_hours or 0.0
                        
                        def get_effective_ot_hours(self):
                            return 0.0
                        
                        def get_effective_weekend_ot_hours(self):
                            return 0.0
                        
                        def get_effective_stat_holiday_hours(self):
                            return self._stat_holiday_hours or 0.0
                    
                    stat_hours = 0.0
                    if is_stat_holiday:
                        stat_hours = calculate_stat_holiday_entitlement(
                            filter_employee_id, current_date, current_date, current_date, company_id
                        ) if company_id else 0.0
                    
                    records.append(VirtualRecord(filter_employee_id, current_date, regular_hours, stat_hours))
                
                current_date += timedelta(days=1)
        else:
            # For all employees, use regular list_attendance (no leave days without attendance)
            records = list_attendance(
                company_id=company_id,
                employee_id=filter_employee_id,
                start_date=start_date,
                end_date=end_date,
            )
        
        # Group by employee
        employee_summaries = {}
        for record in records:
            emp_id = record.employee_id
            if emp_id not in employee_summaries:
                employee = get_employee(emp_id)
                employee_summaries[emp_id] = {
                    "employee_id": emp_id,
                    "employee_name": employee.full_name if employee else emp_id,
                    "total_regular_hours": 0.0,
                    "total_ot_hours": 0.0,
                    "total_weekend_ot_hours": 0.0,
                    "total_stat_holiday_hours": 0.0,
                    "total_days": 0,
                }
            
            summary = employee_summaries[emp_id]
            summary["total_regular_hours"] += record.get_effective_regular_hours() or 0.0
            summary["total_ot_hours"] += record.get_effective_ot_hours() or 0.0
            summary["total_weekend_ot_hours"] += record.get_effective_weekend_ot_hours() or 0.0
            summary["total_stat_holiday_hours"] += record.get_effective_stat_holiday_hours() or 0.0
            summary["total_days"] += 1
        
        # Apply period overrides if they exist (only if pay period dates were provided)
        if pay_period_start and pay_period_end and company_id:
            # Parse pay period dates if they're strings
            override_start_date = start_date  # Use the parsed start_date
            override_end_date = end_date  # Use the parsed end_date
            
            for emp_id, summary in employee_summaries.items():
                override = get_override(emp_id, company_id, override_start_date, override_end_date)
                if override:
                    # Use override values if they exist, otherwise keep calculated values
                    if override.override_regular_hours is not None:
                        summary["total_regular_hours"] = override.override_regular_hours
                    if override.override_ot_hours is not None:
                        summary["total_ot_hours"] = override.override_ot_hours
                    if override.override_weekend_ot_hours is not None:
                        summary["total_weekend_ot_hours"] = override.override_weekend_ot_hours
                    if override.override_stat_holiday_hours is not None:
                        summary["total_stat_holiday_hours"] = override.override_stat_holiday_hours
        
        # Calculate totals
        total_regular = sum(s["total_regular_hours"] for s in employee_summaries.values())
        total_ot = sum(s["total_ot_hours"] for s in employee_summaries.values())
        total_weekend_ot = sum(s["total_weekend_ot_hours"] for s in employee_summaries.values())
        total_stat_holiday = sum(s["total_stat_holiday_hours"] for s in employee_summaries.values())
        
        company_name = None
        if company_id:
            company = get_company_by_id(company_id)
            company_name = company.legal_name if company else None
        
        return AttendanceReportResponse(
            success=True,
            company_id=company_id,
            company_name=company_name,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            summary=[AttendanceSummary(**s) for s in employee_summaries.values()],
            total_regular_hours=total_regular,
            total_ot_hours=total_ot,
            total_weekend_ot_hours=total_weekend_ot,
            total_stat_holiday_hours=total_stat_holiday,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


@router.delete("/bulk")
async def delete_attendance_by_date_range_endpoint(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    employee_id: Optional[str] = Query(None, description="Optional employee ID filter"),
    company_id: Optional[str] = Query(None, description="Optional company ID filter"),
    current_user: dict = Depends(require_permission("attendance:delete"))
):
    """Delete attendance records within a date range"""
    try:
        # Parse date strings
        try:
            parsed_start_date = datetime.strptime(start_date.strip(), "%Y-%m-%d").date()
            parsed_end_date = datetime.strptime(end_date.strip(), "%Y-%m-%d").date()
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid date format. Use YYYY-MM-DD: {str(e)}")
        
        if parsed_start_date > parsed_end_date:
            raise HTTPException(status_code=400, detail="Start date must be before or equal to end date")
        
        # Delete records
        deleted_count = delete_attendance_by_date_range(
            start_date=parsed_start_date,
            end_date=parsed_end_date,
            employee_id=employee_id,
            company_id=company_id,
            performed_by=current_user.get('username'),
        )
        
        return {
            "success": True,
            "message": f"Deleted {deleted_count} attendance record(s)",
            "deleted_count": deleted_count
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting attendance records: {str(e)}")


@router.get("/{attendance_id}", response_model=AttendanceResponse)
async def get_attendance_record(
    attendance_id: int,
    current_user: dict = Depends(require_permission("attendance:view"))
):
    """Get a single attendance record"""
    attendance = get_attendance(attendance_id)
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return attendance


@router.put("/{attendance_id}", response_model=AttendanceResponse)
async def update_attendance_record(
    attendance_id: int,
    attendance_data: AttendanceUpdate,
    current_user: dict = Depends(require_permission("attendance:update"))
):
    """Update an attendance record"""
    try:
        existing = get_attendance(attendance_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Attendance record not found")
        
        # Import _UNSET to use for fields that shouldn't be updated
        from repos.attendance_repo import _UNSET
        
        # Only update original check-in/check-out times if they're explicitly provided
        # Use _UNSET to leave them unchanged if not provided
        original_check_in = attendance_data.check_in if attendance_data.check_in is not None else _UNSET
        original_check_out = attendance_data.check_out if attendance_data.check_out is not None else _UNSET
        
        # Calculate rounded times for original times only if they're being updated
        rounded_check_in = _UNSET
        rounded_check_out = _UNSET
        if original_check_in is not _UNSET and original_check_in is not None:
            rounded_check_in = round_check_in(original_check_in) if original_check_in else None
        elif original_check_in is not _UNSET:
            # Explicitly set to None
            rounded_check_in = None
            
        if original_check_out is not _UNSET and original_check_out is not None:
            rounded_check_out = round_check_out(original_check_out) if original_check_out else None
        elif original_check_out is not _UNSET:
            # Explicitly set to None
            rounded_check_out = None
        
        # Determine if we should set is_manual_override
        # Set to True if any override fields are provided, False if all are cleared
        has_override_times = attendance_data.override_check_in is not None or attendance_data.override_check_out is not None
        has_override_hours = (attendance_data.override_regular_hours is not None or 
                             attendance_data.override_ot_hours is not None or 
                             attendance_data.override_weekend_ot_hours is not None or 
                             attendance_data.override_stat_holiday_hours is not None)
        
        # Set is_manual_override based on whether any override fields are provided
        # If is_manual_override is explicitly provided in the request, use it
        # Otherwise, determine based on whether there are any overrides
        if attendance_data.is_manual_override is not None:
            is_manual_override = attendance_data.is_manual_override
        else:
            # If not explicitly set, determine from override fields
            is_manual_override = has_override_times or has_override_hours
        
        # DON'T auto-recalculate hours when override times are provided
        # Hours will be recalculated via the recalculate endpoint if needed
        
        # Only update calculated hours if they're explicitly provided
        attendance = update_attendance(
            attendance_id=attendance_id,
            check_in=original_check_in,
            check_out=original_check_out,
            rounded_check_in=rounded_check_in,
            rounded_check_out=rounded_check_out,
            regular_hours=attendance_data.regular_hours if attendance_data.regular_hours is not None else _UNSET,
            ot_hours=attendance_data.ot_hours if attendance_data.ot_hours is not None else _UNSET,
            weekend_ot_hours=attendance_data.weekend_ot_hours if attendance_data.weekend_ot_hours is not None else _UNSET,
            stat_holiday_hours=attendance_data.stat_holiday_hours if attendance_data.stat_holiday_hours is not None else _UNSET,
            is_manual_override=is_manual_override,
            override_check_in=attendance_data.override_check_in,
            override_check_out=attendance_data.override_check_out,
            override_regular_hours=attendance_data.override_regular_hours,
            override_ot_hours=attendance_data.override_ot_hours,
            override_weekend_ot_hours=attendance_data.override_weekend_ot_hours,
            override_stat_holiday_hours=attendance_data.override_stat_holiday_hours,
            time_edit_reason=attendance_data.time_edit_reason,
            hours_edit_reason=attendance_data.hours_edit_reason,
            notes=attendance_data.notes if attendance_data.notes is not None else _UNSET,
            remarks=attendance_data.remarks if attendance_data.remarks is not None else _UNSET,
            performed_by=current_user.get('username'),
        )
        if not attendance:
            raise HTTPException(status_code=404, detail="Attendance record not found")
        return attendance
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating attendance: {str(e)}")


@router.post("/{attendance_id}/recalculate", response_model=AttendanceResponse)
async def recalculate_attendance_hours(
    attendance_id: int,
    current_user: dict = Depends(require_permission("attendance:update"))
):
    """Recalculate hours based on effective check-in/check-out times"""
    try:
        existing = get_attendance(attendance_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Attendance record not found")
        
        # Get effective check-in/check-out times (override if exists, otherwise original)
        effective_check_in = existing.get_effective_check_in()
        effective_check_out = existing.get_effective_check_out()
        
        if not effective_check_in or not effective_check_out:
            raise HTTPException(status_code=400, detail="Check-in and check-out times are required for recalculation")
        
        # Calculate rounded times from effective times
        # Check-in rounds UP, check-out rounds DOWN
        rounded_check_in = round_check_in(effective_check_in)
        rounded_check_out = round_check_out(effective_check_out)
        
        # Get employee schedule and employment for calculation
        employee_schedule = get_schedule_for_date(existing.employee_id, existing.date)
        employment = get_current_employment(existing.employee_id, existing.date)
        is_driver = employment.is_driver if employment else False
        
        schedule = None
        if employee_schedule:
            try:
                from models.work_schedule import WorkSchedule
                work_schedule = employee_schedule.schedule if hasattr(employee_schedule, 'schedule') else None
                if work_schedule and isinstance(work_schedule, WorkSchedule) and hasattr(work_schedule, 'get_day_times'):
                    schedule = work_schedule
            except (AttributeError, TypeError):
                schedule = None
        day_of_week = existing.date.weekday()
        is_weekend = day_of_week >= 5
        schedule_start, schedule_end = (None, None)
        weekday_schedule_start = None
        if schedule:
            try:
                from models.work_schedule import WorkSchedule
                if isinstance(schedule, WorkSchedule) and hasattr(schedule, 'get_day_times'):
                    schedule_start, schedule_end = schedule.get_day_times(day_of_week)
                    # For weekends, get weekday schedule start time (try Monday-Friday) for weekend OT calculation
                    if is_weekend:
                        # Try Monday through Friday to find a weekday schedule start time
                        for weekday in range(5):  # 0=Monday to 4=Friday
                            weekday_start, _ = schedule.get_day_times(weekday)
                            if weekday_start:
                                weekday_schedule_start = weekday_start
                                break
            except (AttributeError, TypeError):
                schedule_start, schedule_end = (None, None)
        
        # Recalculate hours based on effective rounded times
        regular, ot, weekend_ot = calculate_hours_worked(
            rounded_check_in, rounded_check_out, schedule_start, schedule_end,
            existing.date, is_driver, weekday_schedule_start
        )
        
        # Update only the calculated fields (not override fields)
        attendance = update_attendance(
            attendance_id=attendance_id,
            rounded_check_in=rounded_check_in,
            rounded_check_out=rounded_check_out,
            regular_hours=regular,
            ot_hours=ot,
            weekend_ot_hours=weekend_ot,
            # stat_holiday_hours is not recalculated here (it's set separately)
            performed_by=current_user.get('username'),
        )
        if not attendance:
            raise HTTPException(status_code=404, detail="Attendance record not found")
        return attendance
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error recalculating attendance: {str(e)}")


@router.post("/{attendance_id}/override", response_model=AttendanceResponse)
async def override_attendance(
    attendance_id: int,
    override_data: AttendanceOverride,
    current_user: dict = Depends(require_permission("attendance:override"))
):
    """Manually override attendance times and OT hours"""
    try:
        attendance = update_attendance(
            attendance_id=attendance_id,
            override_check_in=override_data.override_check_in,
            override_check_out=override_data.override_check_out,
            override_ot_hours=override_data.override_ot_hours,
            override_weekend_ot_hours=override_data.override_weekend_ot_hours,
            is_manual_override=override_data.is_manual_override,
            performed_by=current_user.get('username'),
        )
        if not attendance:
            raise HTTPException(status_code=404, detail="Attendance record not found")
        return attendance
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error overriding attendance: {str(e)}")


@router.post("/bulk-fill")
async def bulk_fill_attendance(
    employee_id: str = Query(..., description="Employee ID"),
    start_date: date = Query(..., description="Start date"),
    end_date: date = Query(..., description="End date"),
    current_user: dict = Depends(require_permission("attendance:create"))
):
    """Auto-fill missing attendance for a date range"""
    try:
        from datetime import timedelta
        
        filled_count = 0
        skipped_count = 0
        
        current_date = start_date
        while current_date <= end_date:
            # Check if record already exists
            existing = get_attendance_for_date(employee_id, current_date)
            if existing:
                skipped_count += 1
                current_date += timedelta(days=1)
                continue
            
            # Check if it's a weekend
            is_weekend = current_date.weekday() >= 5
            
            # Check if it's a statutory holiday
            employment = get_current_employment(employee_id, current_date)
            company_id = employment.company_id if employment else None
            
            stat_holiday_hours = 0.0
            if company_id:
                holidays = get_holidays_in_range(company_id, current_date, current_date, employee_id)
                if current_date in holidays:
                    # Calculate statutory holiday entitlement
                    # For now, use 0 as we need pay period context
                    pass
            
            # Check if employee is on leave
            is_on_leave = leave_overlaps(employee_id, current_date, current_date)
            
            # Create record with appropriate values
            create_attendance(
                employee_id=employee_id,
                attendance_date=current_date,
                check_in=None,
                check_out=None,
                regular_hours=0.0,
                ot_hours=0.0,
                weekend_ot_hours=0.0,
                stat_holiday_hours=stat_holiday_hours,
                notes="Auto-filled" + (" (Weekend)" if is_weekend else "") + (" (Leave)" if is_on_leave else ""),
                remarks=None,  # Auto-fill doesn't support remarks
                performed_by=current_user.get('username'),
            )
            filled_count += 1
            current_date += timedelta(days=1)
        
        return {
            "success": True,
            "filled_count": filled_count,
            "skipped_count": skipped_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error filling attendance: {str(e)}")


@router.post("/recalculate")
async def recalculate_attendance(
    employee_id: Optional[str] = Query(None, description="Employee ID (optional, if not provided, recalculates for all employees)"),
    start_date: date = Query(..., description="Start date"),
    end_date: date = Query(..., description="End date"),
    current_user: dict = Depends(require_permission("attendance:update"))
):
    """Recalculate attendance hours for existing records based on current schedule assignments"""
    try:
        from repos.attendance_repo import get_attendance_for_period
        
        recalculated_count = 0
        skipped_count = 0
        error_count = 0
        errors = []
        
        # Get all attendance records in the date range
        if employee_id:
            attendance_records = get_attendance_for_period(employee_id, start_date, end_date)
        else:
            attendance_records = list_attendance(start_date=start_date, end_date=end_date)
        
        # Process each attendance record
        for attendance in attendance_records:
            try:
                # Get effective check-in/check-out times (override if exists, otherwise original)
                effective_check_in = attendance.get_effective_check_in()
                effective_check_out = attendance.get_effective_check_out()
                
                # Get employee schedule and employment for the attendance date
                # Query schedule_id directly to avoid detached instance errors
                from models.base import SessionLocal
                from sqlalchemy import select, and_, or_
                from models.employee_schedule import EmployeeSchedule
                from repos.work_schedule_repo import get_work_schedule
                
                employment = get_current_employment(attendance.employee_id, attendance.date)
                is_driver = employment.is_driver if employment else False
                count_all_ot = employment.count_all_ot if employment else False
                company_id = employment.company_id if employment else None
                
                # Check if it's a statutory holiday (even if no check-in/check-out)
                is_stat_holiday = False
                if company_id:
                    holidays = get_holidays_in_range(company_id, attendance.date, attendance.date, attendance.employee_id)
                    is_stat_holiday = attendance.date in holidays
                
                # Skip if no effective check-in/check-out times (unless it's a stat holiday or sick leave)
                if not effective_check_in or not effective_check_out:
                    if is_stat_holiday:
                        # For stat holidays, we still need to calculate stat holiday hours
                        # Calculate statutory holiday entitlement
                        stat_holiday_hours = calculate_stat_holiday_entitlement(
                            attendance.employee_id, attendance.date, attendance.date, attendance.date, company_id
                        ) if company_id else 0.0
                        
                        # Update only stat holiday hours for stat holidays without check-in/check-out
                        update_attendance(
                            attendance_id=attendance.id,
                            stat_holiday_hours=stat_holiday_hours,
                            performed_by=current_user.get('username'),
                        )
                        recalculated_count += 1
                    else:
                        # Check if this is a sick leave day - if so, calculate regular hours
                        from repos.leave_repo import get_leave_for_date
                        leave = get_leave_for_date(attendance.employee_id, attendance.date)
                        if leave:
                            from models.leave_type import LeaveType
                            with SessionLocal() as session:
                                leave_type = session.get(LeaveType, leave.leave_type_id)
                                if leave_type and leave_type.code.upper() == "SICK":
                                    # Calculate sick leave hours from schedule
                                    from repos.employee_schedule_repo import get_schedule_for_date
                                    employee_schedule = get_schedule_for_date(attendance.employee_id, attendance.date)
                                    scheduled_hours = 0.0
                                    if employee_schedule and employee_schedule.schedule:
                                        try:
                                            from models.work_schedule import WorkSchedule
                                            from datetime import datetime as dt_module
                                            work_schedule = employee_schedule.schedule
                                            if isinstance(work_schedule, WorkSchedule) and hasattr(work_schedule, 'get_day_times'):
                                                day_of_week = attendance.date.weekday()
                                                schedule_start, schedule_end = work_schedule.get_day_times(day_of_week)
                                                if schedule_start and schedule_end:
                                                    schedule_start_dt = dt_module.combine(attendance.date, schedule_start)
                                                    schedule_end_dt = dt_module.combine(attendance.date, schedule_end)
                                                    if schedule_end < schedule_start:
                                                        schedule_end_dt += timedelta(days=1)
                                                    scheduled_seconds = (schedule_end_dt - schedule_start_dt).total_seconds()
                                                    scheduled_hours = scheduled_seconds / 3600.0
                                        except (AttributeError, TypeError):
                                            pass
                                    
                                    # Default to 8.0 if no schedule found
                                    if scheduled_hours == 0.0:
                                        scheduled_hours = 8.0
                                    
                                    # Update attendance record with sick leave hours
                                    update_attendance(
                                        attendance_id=attendance.id,
                                        regular_hours=scheduled_hours,
                                        performed_by=current_user.get('username'),
                                    )
                                    recalculated_count += 1
                                else:
                                    skipped_count += 1
                        else:
                            skipped_count += 1
                    continue
                
                # Always recalculate rounded times from effective times (to apply new rounding rules)
                # Check-in rounds UP, check-out rounds DOWN
                rounded_check_in = round_check_in(effective_check_in)
                rounded_check_out = round_check_out(effective_check_out)
                
                # Query schedule_id directly from database to avoid detached instance issues
                schedule = None
                schedule_id_result = None
                try:
                    with SessionLocal() as session:
                        schedule_id_result = session.execute(
                            select(EmployeeSchedule.schedule_id).where(
                                and_(
                                    EmployeeSchedule.employee_id == attendance.employee_id,
                                    EmployeeSchedule.effective_date <= attendance.date,
                                    or_(
                                        EmployeeSchedule.end_date >= attendance.date,
                                        EmployeeSchedule.end_date == None
                                    )
                                )
                            ).order_by(EmployeeSchedule.effective_date.desc()).limit(1)
                        ).scalar_one_or_none()
                        
                        if schedule_id_result:
                            schedule = get_work_schedule(schedule_id_result)
                except Exception as e:
                    schedule = None
                    errors.append(f"Employee {attendance.employee_id}, Date {attendance.date}: Could not load schedule: {str(e)}")
                
                day_of_week = attendance.date.weekday()
                is_weekend = day_of_week >= 5
                # Safely call get_day_times only if schedule is a WorkSchedule
                schedule_start, schedule_end = (None, None)
                weekday_schedule_start = None
                if schedule:
                    try:
                        from models.work_schedule import WorkSchedule
                        if isinstance(schedule, WorkSchedule) and hasattr(schedule, 'get_day_times'):
                            schedule_start, schedule_end = schedule.get_day_times(day_of_week)
                            # For weekends, get weekday schedule start time (try Monday-Friday) for weekend OT calculation
                            if is_weekend:
                                # Try Monday through Friday to find a weekday schedule start time
                                for weekday in range(5):  # 0=Monday to 4=Friday
                                    try:
                                        weekday_start, _ = schedule.get_day_times(weekday)
                                        if weekday_start:
                                            weekday_schedule_start = weekday_start
                                            break
                                    except (AttributeError, TypeError):
                                        # Continue to next weekday if this one fails
                                        continue
                    except (AttributeError, TypeError) as e:
                        schedule_start, schedule_end = (None, None)
                        # weekday_schedule_start remains None, which will trigger default 7:00 in calculate_hours_worked
                
                # Debug: Log schedule details
                if not schedule_id_result:
                    errors.append(f"Employee {attendance.employee_id}, Date {attendance.date}: No schedule assignment found")
                elif not schedule:
                    errors.append(f"Employee {attendance.employee_id}, Date {attendance.date}: Schedule assignment found but schedule object is None")
                elif not schedule_start or not schedule_end:
                    errors.append(f"Employee {attendance.employee_id}, Date {attendance.date}: Schedule '{schedule.name}' has no times for day {day_of_week} (weekday)")
                
                # Recalculate hours using ROUNDED times
                regular, ot, weekend_ot = calculate_hours_worked(
                    rounded_check_in, rounded_check_out, schedule_start, schedule_end,
                    attendance.date, is_driver, weekday_schedule_start, count_all_ot
                )
                
                # Check if it's a statutory holiday and calculate stat holiday hours
                stat_holiday_hours = 0.0
                if is_stat_holiday:
                    # Calculate statutory holiday entitlement
                    stat_holiday_hours = calculate_stat_holiday_entitlement(
                        attendance.employee_id, attendance.date, attendance.date, attendance.date, company_id
                    )
                
                # Update the attendance record - always pass values even if 0.0
                update_attendance(
                    attendance_id=attendance.id,
                    rounded_check_in=rounded_check_in,
                    rounded_check_out=rounded_check_out,
                    regular_hours=regular,
                    ot_hours=ot,
                    weekend_ot_hours=weekend_ot,
                    stat_holiday_hours=stat_holiday_hours,
                    performed_by=current_user.get('username'),
                )
                
                recalculated_count += 1
            except Exception as e:
                import traceback
                error_count += 1
                error_msg = f"Employee {attendance.employee_id}, Date {attendance.date}: {str(e)}"
                errors.append(error_msg)
                # Log full traceback for debugging
                print(f"Error recalculating attendance: {error_msg}")
                print(traceback.format_exc())
        
        return {
            "success": True,
            "recalculated_count": recalculated_count,
            "skipped_count": skipped_count,
            "error_count": error_count,
            "errors": errors[:10]  # Limit errors returned
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error recalculating attendance: {str(e)}")


@router.get("/report/export")
async def export_attendance_report(
    company_id: Optional[str] = Query(None, description="Company ID"),
    employee_id: Optional[str] = Query(None, description="Employee ID (optional filter)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    format: str = Query("excel", description="Export format: excel or csv"),
    current_user: dict = Depends(require_permission("attendance:view"))
):
    """Export attendance report as Excel or CSV"""
    from fastapi.responses import StreamingResponse
    
    try:
        if not start_date or not end_date:
            raise HTTPException(status_code=400, detail="Start date and end date are required")
        
        # Parse date strings
        try:
            parsed_start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
            parsed_end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        start_date = parsed_start_date
        end_date = parsed_end_date
        
        # Get report data with optional employee_id filter
        records = list_attendance(
            company_id=company_id,
            employee_id=employee_id,
            start_date=start_date,
            end_date=end_date,
        )
        
        # Prepare data for export
        export_data = []
        for record in records:
            try:
                employee = get_employee(record.employee_id)
                check_in = record.get_effective_check_in()
                check_out = record.get_effective_check_out()
                
                export_data.append({
                    "Employee ID": record.employee_id,
                    "Employee Name": employee.full_name if employee else record.employee_id,
                    "Date": record.date.isoformat() if record.date else "",
                    "Check-In": check_in.strftime("%H:%M:%S") if check_in else "",
                    "Check-Out": check_out.strftime("%H:%M:%S") if check_out else "",
                    "Regular Hours": record.get_effective_regular_hours() or 0.0,
                    "OT Hours": record.get_effective_ot_hours() or 0.0,
                    "Weekend OT Hours": record.get_effective_weekend_ot_hours() or 0.0,
                    "Stat Holiday Hours": record.get_effective_stat_holiday_hours() or 0.0,
                })
            except Exception as e:
                # Skip problematic records but log the error
                print(f"Error processing record {record.id} for export: {str(e)}")
                continue
        
        if not export_data:
            raise HTTPException(status_code=400, detail="No attendance data found for the specified period")
        
        df = pd.DataFrame(export_data)
        
        if format.lower() == "csv":
            output = io.StringIO()
            df.to_csv(output, index=False)
            output.seek(0)
            return StreamingResponse(
                io.BytesIO(output.getvalue().encode()),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=attendance_report_{start_date}_{end_date}.csv"}
            )
        else:
            # Excel
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Attendance Report')
            output.seek(0)
            return StreamingResponse(
                output,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename=attendance_report_{start_date}_{end_date}.xlsx"}
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting report: {str(e)}")


@router.get("/period-override/{employee_id}")
async def get_period_override(
    employee_id: str,
    company_id: str = Query(..., description="Company ID"),
    pay_period_start: date = Query(..., description="Pay period start date"),
    pay_period_end: date = Query(..., description="Pay period end date"),
    current_user: dict = Depends(require_permission("attendance:view"))
):
    """Get attendance period override for an employee and pay period. Returns null if not found."""
    try:
        override = get_override(employee_id, company_id, pay_period_start, pay_period_end)
        if not override:
            return None
        return override
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting period override: {str(e)}")


@router.post("/period-override", response_model=AttendancePeriodOverrideResponse)
async def save_period_override(
    override_data: AttendancePeriodOverrideCreate,
    current_user: dict = Depends(require_permission("attendance:update"))
):
    """Create or update attendance period override"""
    try:
        override = create_or_update_override(
            employee_id=override_data.employee_id,
            company_id=override_data.company_id,
            pay_period_start=override_data.pay_period_start,
            pay_period_end=override_data.pay_period_end,
            period_number=override_data.period_number,
            year=override_data.year,
            override_regular_hours=override_data.override_regular_hours,
            override_ot_hours=override_data.override_ot_hours,
            override_weekend_ot_hours=override_data.override_weekend_ot_hours,
            override_stat_holiday_hours=override_data.override_stat_holiday_hours,
            reason=override_data.reason,
            performed_by=current_user.get('username')
        )
        return override
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving period override: {str(e)}")


@router.delete("/period-override/{override_id}")
async def delete_period_override(
    override_id: int,
    current_user: dict = Depends(require_permission("attendance:update"))
):
    """Delete attendance period override"""
    try:
        success = delete_override(override_id)
        if not success:
            raise HTTPException(status_code=404, detail="Period override not found")
        return {"success": True, "message": "Period override deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting period override: {str(e)}")

