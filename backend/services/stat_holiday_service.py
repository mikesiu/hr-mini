"""
BC ESA (British Columbia Employment Standards Act) Statutory Holiday Pay Calculation Service.
Implements full BC ESA logic for determining statutory holiday entitlements.
"""
from datetime import date, timedelta
from typing import Optional
from repos.holiday_repo import get_holidays_in_range, get_holiday
from repos.leave_repo import overlaps as leave_overlaps, get_leave_for_date, get_leaves_in_range
from repos.attendance_repo import get_attendance_for_date
from repos.employee_schedule_repo import get_schedule_for_date
from repos.employment_repo import get_current_employment
from models.base import SessionLocal
from models.holiday import Holiday
from models.employee import Employee
from sqlalchemy import select, and_


def calculate_stat_holiday_entitlement(
    employee_id: str,
    holiday_date: date,
    pay_period_start: date,
    pay_period_end: date,
    company_id: str
) -> float:
    """
    Calculate statutory holiday entitlement according to BC ESA rules.
    
    BC ESA Requirements (15-30 Rule):
    1. Employee must have been employed for at least 30 calendar days before the holiday
    2. Employee must have earned wages on at least 15 of the 30 calendar days before the holiday
    3. If eligible, employee is entitled to average daily wage (based on hours worked)
    
    Args:
        employee_id: Employee ID
        holiday_date: Date of the statutory holiday
        pay_period_start: Start date of the pay period
        pay_period_end: End date of the pay period
        company_id: Company ID for holiday lookup
        
    Returns:
        Statutory holiday hours entitlement (0.0 if not eligible)
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Check if holiday is active for this company and get holiday record
    with SessionLocal() as session:
        holiday_record = session.execute(
            select(Holiday).where(
                and_(
                    Holiday.company_id == company_id,
                    Holiday.holiday_date == holiday_date,
                    Holiday.is_active == True
                )
            )
        ).scalar_one_or_none()
    
    if not holiday_record:
        logger.info(f"Stat holiday calc for {employee_id} on {holiday_date}: No holiday record found")
        return 0.0
    
    # Check if holiday is union-only and if employee is a union member
    if holiday_record.union_only:
        with SessionLocal() as session:
            employee = session.get(Employee, employee_id)
            if not employee or not (hasattr(employee, 'union_member') and employee.union_member):
                # Holiday is union-only but employee is not a union member
                logger.info(f"Stat holiday calc for {employee_id} on {holiday_date}: Union-only holiday but employee is not union member")
                return 0.0
    
    # Check if employee was employed for at least 30 days before holiday
    employment = get_current_employment(employee_id, holiday_date)
    if not employment:
        logger.info(f"Stat holiday calc for {employee_id} on {holiday_date}: No employment found")
        return 0.0
    
    if employment.start_date:
        days_employed = (holiday_date - employment.start_date).days
        if days_employed < 30:
            logger.info(f"Stat holiday calc for {employee_id} on {holiday_date}: Only {days_employed} days employed (need 30)")
            return 0.0
    
    # Calculate average daily hours from last 30 days before the holiday
    # This function also checks the 15-day requirement (at least 15 days with wages in the last 30 days)
    avg_daily_hours = _calculate_average_daily_hours(
        employee_id, holiday_date, holiday_date, company_id  # Pass holiday_date as reference and company_id for holidays
    )
    
    logger.info(f"Stat holiday calc for {employee_id} on {holiday_date}: avg_daily_hours={avg_daily_hours}")
    
    return avg_daily_hours


def _calculate_average_daily_hours(
    employee_id: str,
    pay_period_start: date,
    pay_period_end: date,
    company_id: str
) -> float:
    """
    Calculate average daily hours for stat holiday pay in the last 30 days before the holiday.
    Uses actual hours worked per BC ESA requirements.
    
    Calculation method:
    - For actual work days: Uses regular_hours from attendance records (actual hours worked)
    - For vacation days: Uses scheduled hours from employee's work schedule
    - For sick leave days: Uses scheduled hours from employee's work schedule
    - For past stat holidays: Uses stat_holiday_hours from attendance records
    
    Days worked count includes:
    - Every Monday–Friday with work
    - Every Saturday worked (even if paid at OT)
    - Every Sunday worked (even if paid at OT)
    
    Vacation days and sick leave days count as days worked only if they have a valid schedule.
    Past stat holidays count as days worked and contribute their stat_holiday_hours.
    Requires at least 15 out of 30 days to have been worked, on vacation, on paid sick leave, or on past stat holidays.
    
    Args:
        employee_id: Employee ID
        pay_period_start: Start date (not used, but kept for compatibility)
        pay_period_end: Reference date (holiday date) - used to calculate 30 days back
        company_id: Company ID for holiday lookup
        
    Returns:
        Average daily hours (0.0 if insufficient days worked or no days worked)
    """
    from repos.attendance_repo import get_attendance_for_period
    from models.leave_type import LeaveType
    
    # Calculate 30 days back from the reference date (holiday date)
    # pay_period_end is actually the holiday_date when called from calculate_stat_holiday_entitlement
    end_date = pay_period_end - timedelta(days=1)  # Day before holiday
    start_date = end_date - timedelta(days=29)  # 30 days total (inclusive)
    
    # Get all leave records in the date range to identify vacation and sick leave days
    leaves = get_leaves_in_range(employee_id, start_date, end_date)
    vacation_dates = set()
    sick_leave_dates = set()
    with SessionLocal() as session:
        for leave in leaves:
            leave_type = session.get(LeaveType, leave.leave_type_id)
            if leave_type:
                leave_code = leave_type.code.upper()
                # Add all dates in the leave range that fall within our date range
                leave_date = leave.start_date
                while leave_date <= leave.end_date:
                    if start_date <= leave_date <= end_date:
                        if leave_code == "VAC":
                            vacation_dates.add(leave_date)
                        elif leave_code == "SICK":
                            sick_leave_dates.add(leave_date)
                    leave_date += timedelta(days=1)
    
    # Get holidays in the date range to identify past stat holidays
    past_stat_holiday_dates = set()
    if company_id:
        past_stat_holidays = get_holidays_in_range(company_id, start_date, end_date, employee_id)
        past_stat_holiday_dates = set(past_stat_holidays) if past_stat_holidays else set()
    
    # Get all attendance records for the last 30 days
    attendance_records = get_attendance_for_period(
        employee_id, start_date, end_date
    )
    
    # Create a map of dates to attendance records for quick lookup
    attendance_map = {att.date: att for att in attendance_records} if attendance_records else {}
    
    # Calculate total hours for stat holiday wage calculation
    # days_eligible: counts worked days + vacation days (for 15-day requirement)
    # days_worked: counts Monday-Friday with work + Saturday worked + Sunday worked (for average calculation)
    total_hours = 0.0
    days_worked = 0  # Monday-Friday with work + Saturday worked + Sunday worked (excludes vacation)
    days_eligible = 0  # Days worked + vacation days (for eligibility check)
    
    # Check each date in the 30-day period
    current_date = start_date
    while current_date <= end_date:
        is_vacation = current_date in vacation_dates
        is_sick_leave = current_date in sick_leave_dates
        is_past_stat_holiday = current_date in past_stat_holiday_dates
        day_of_week = current_date.weekday()  # Monday=0, Sunday=6
        is_monday_friday = day_of_week < 5  # Monday=0 to Friday=4
        is_saturday = day_of_week == 5
        is_sunday = day_of_week == 6
        
        att = attendance_map.get(current_date)
        worked_this_day = att and att.check_in and att.check_out
        
        # Check if this is sick leave from attendance record (regular hours but no timestamps)
        is_sick_leave_attendance = (att and 
                                   not att.check_in and 
                                   not att.check_out and 
                                   att.get_effective_regular_hours() > 0)
        
        # If employee actually worked (has check-in/check-out), use actual regular hours worked
        # This takes priority over vacation/sick leave
        if worked_this_day:
            # For stat-holiday average calculation, use effective regular hours (considers overrides)
            # Get effective regular hours from attendance record (override if exists, otherwise calculated)
            regular = att.get_effective_regular_hours() if hasattr(att, 'get_effective_regular_hours') else (att.regular_hours if att.regular_hours else 0.0)
            
            # If no regular hours recorded, try to get scheduled hours as fallback
            if regular == 0.0:
                employee_schedule = get_schedule_for_date(employee_id, current_date)
                if employee_schedule and employee_schedule.schedule:
                    try:
                        from models.work_schedule import WorkSchedule
                        from datetime import datetime
                        work_schedule = employee_schedule.schedule
                        if isinstance(work_schedule, WorkSchedule) and hasattr(work_schedule, 'get_day_times'):
                            schedule_start, schedule_end = work_schedule.get_day_times(day_of_week)
                            if schedule_start and schedule_end:
                                schedule_start_dt = datetime.combine(current_date, schedule_start)
                                schedule_end_dt = datetime.combine(current_date, schedule_end)
                                if schedule_end < schedule_start:
                                    schedule_end_dt += timedelta(days=1)
                                scheduled_seconds = (schedule_end_dt - schedule_start_dt).total_seconds()
                                regular = scheduled_seconds / 3600.0
                    except (AttributeError, TypeError):
                        pass
            
            # Add regular hours to total (don't add if still 0)
            if regular > 0:
                total_hours += regular
                
                # For days worked count:
                # - Every Monday–Friday with work
                # - Every Saturday worked (even if paid at OT)
                # - Every Sunday worked (even if paid at OT)
                if is_monday_friday or is_saturday or is_sunday:
                    days_worked += 1
                    days_eligible += 1
        elif is_sick_leave_attendance:
            # Handle sick leave from attendance records (regular hours but no check-in/check-out)
            regular = att.get_effective_regular_hours()
            if regular > 0:
                total_hours += regular
                if is_monday_friday or is_saturday or is_sunday:
                    days_worked += 1
                    days_eligible += 1
        elif is_vacation:
            # Vacation days: count as day worked and include scheduled hours
            regular = 0.0
            employee_schedule = get_schedule_for_date(employee_id, current_date)
            if employee_schedule and employee_schedule.schedule:
                try:
                    from models.work_schedule import WorkSchedule
                    from datetime import datetime
                    work_schedule = employee_schedule.schedule
                    if isinstance(work_schedule, WorkSchedule) and hasattr(work_schedule, 'get_day_times'):
                        schedule_start, schedule_end = work_schedule.get_day_times(day_of_week)
                        if schedule_start and schedule_end:
                            schedule_start_dt = datetime.combine(current_date, schedule_start)
                            schedule_end_dt = datetime.combine(current_date, schedule_end)
                            if schedule_end < schedule_start:
                                schedule_end_dt += timedelta(days=1)
                            scheduled_seconds = (schedule_end_dt - schedule_start_dt).total_seconds()
                            regular = scheduled_seconds / 3600.0
                except (AttributeError, TypeError):
                    pass
            
            # Only add vacation hours if schedule was found and vacation is on a workday
            if regular > 0:
                total_hours += regular
                # Vacation days count as days worked
                if is_monday_friday or is_saturday or is_sunday:
                    days_worked += 1
                    days_eligible += 1
            else:
                # If no schedule found for vacation day, still count for eligibility but not days_worked
                if is_monday_friday or is_saturday or is_sunday:
                    days_eligible += 1
        elif is_past_stat_holiday and att:
            # Past stat holidays: count as day worked and include stat_holiday_hours
            stat_holiday_hours = att.stat_holiday_hours or 0.0
            if stat_holiday_hours > 0:
                total_hours += stat_holiday_hours
                # Stat holidays count as days worked (they're typically on weekdays)
                if is_monday_friday or is_saturday or is_sunday:
                    days_worked += 1
                    days_eligible += 1
        elif is_sick_leave:
            # Paid sick leave: count as day worked and include scheduled hours
            regular = 0.0
            employee_schedule = get_schedule_for_date(employee_id, current_date)
            if employee_schedule and employee_schedule.schedule:
                try:
                    from models.work_schedule import WorkSchedule
                    from datetime import datetime
                    work_schedule = employee_schedule.schedule
                    if isinstance(work_schedule, WorkSchedule) and hasattr(work_schedule, 'get_day_times'):
                        schedule_start, schedule_end = work_schedule.get_day_times(day_of_week)
                        if schedule_start and schedule_end:
                            schedule_start_dt = datetime.combine(current_date, schedule_start)
                            schedule_end_dt = datetime.combine(current_date, schedule_end)
                            if schedule_end < schedule_start:
                                schedule_end_dt += timedelta(days=1)
                            scheduled_seconds = (schedule_end_dt - schedule_start_dt).total_seconds()
                            regular = scheduled_seconds / 3600.0
                except (AttributeError, TypeError):
                    pass
            
            # Only add sick leave hours if schedule was found and sick leave is on a workday
            if regular > 0:
                total_hours += regular
                # Sick leave days count as days worked
                if is_monday_friday or is_saturday or is_sunday:
                    days_worked += 1
                    days_eligible += 1
            else:
                # If no schedule found for sick leave day, still count for eligibility but not days_worked
                if is_monday_friday or is_saturday or is_sunday:
                    days_eligible += 1
        
        current_date += timedelta(days=1)
    
    # Require at least 15 out of 30 days to have been worked or on vacation
    if days_eligible < 15:
        return 0.0
    
    if days_worked == 0:
        return 0.0
    
    # Calculate average using only Monday-Friday + Saturday + Sunday worked days (excludes vacation days)
    average_hours = total_hours / days_worked
    
    # Round UP to nearest 0.25 hours (quarter hour)
    import math
    rounded_hours = math.ceil(average_hours / 0.25) * 0.25
    
    return rounded_hours

