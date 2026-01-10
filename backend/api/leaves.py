from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List, Optional
from datetime import date, datetime
import pandas as pd
import io
from schemas import LeaveCreate, LeaveUpdate, LeaveResponse, LeaveTypeCreate, LeaveTypeUpdate, LeaveTypeResponse, LeaveUploadResponse, LeaveUploadPreviewResponse, LeaveUploadPreviewRow, LeaveUploadError, CalculateLeaveDaysRequest, CalculateLeaveDaysResponse
from api.dependencies import get_current_user, require_permission
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
from repos.leave_repo import (
    list_leaves as repo_list_leaves,
    list_leave_types as repo_list_leave_types,
    create_leave as repo_create_leave,
    update_leave as repo_update_leave,
    delete_leave as repo_delete_leave,
    get_leave_type_by_code
)
from repos.employee_repo import get_employee
from utils.leave_calculation import calculate_leave_days_for_employee, calculate_working_days
from services.leave_service import (
    get_vacation_remaining,
    get_sick_remaining,
    can_approve_leave,
    calculate_vacation_entitlement,
    vacation_earned_window
)

router = APIRouter()

# Test endpoint to verify server is working
@router.get("/test")
async def test_endpoint():
    print("TEST ENDPOINT CALLED!")
    return {"message": "Test endpoint working", "timestamp": datetime.now().isoformat()}

# Simple file upload test endpoint
@router.post("/test-upload")
async def test_upload(file: UploadFile = File(...)):
    print("TEST UPLOAD ENDPOINT CALLED!")
    print(f"File: {file.filename}, Size: {file.size}, Type: {file.content_type}")
    return {"message": "File received", "filename": file.filename, "size": file.size}

# Helper functions for leave upload validation
def validate_leave_upload_row(row_data: dict, row_number: int, leave_type_mapping: dict, existing_leaves: set) -> tuple[bool, Optional[str]]:
    """Validate a single row of leave data"""
    try:
        # Check required fields
        required_fields = ['employee_id', 'leave_type_id', 'start_date', 'end_date', 'days']
        for field in required_fields:
            if field not in row_data or pd.isna(row_data[field]) or str(row_data[field]).strip() == '':
                return False, f"Missing required field: {field}"
        
        # Validate employee exists
        employee_id = str(row_data['employee_id']).strip()
        if not get_employee(employee_id):
            return False, f"Employee ID '{employee_id}' does not exist"
        
        # Validate leave type
        leave_type_code = str(row_data['leave_type_id']).strip()
        if leave_type_code not in leave_type_mapping:
            return False, f"Invalid leave type code: '{leave_type_code}'"
        
        # Validate dates
        try:
            start_date = pd.to_datetime(row_data['start_date']).date()
            end_date = pd.to_datetime(row_data['end_date']).date()
        except:
            return False, "Invalid date format. Use YYYY-MM-DD"
        
        if start_date > end_date:
            return False, "Start date cannot be after end date"
        
        # Validate days
        try:
            days = float(row_data['days'])
            if days <= 0:
                return False, "Days must be greater than 0"
        except:
            return False, "Invalid days value. Must be a number"
        
        # Check for duplicates
        duplicate_key = (employee_id, start_date, end_date)
        if duplicate_key in existing_leaves:
            return False, "Duplicate leave record (same employee and dates)"
        
        # Validate status
        status = str(row_data.get('status', 'Active')).strip()
        if status not in ['Active', 'Cancelled']:
            return False, f"Invalid status: '{status}'. Must be 'Active' or 'Cancelled'"
        
        return True, None
        
    except Exception as e:
        return False, f"Validation error: {str(e)}"

def get_existing_leaves_set() -> set:
    """Get set of existing leave records for duplicate checking"""
    existing_leaves = set()
    try:
        leaves = repo_list_leaves()
        for leave in leaves:
            key = (leave.employee_id, leave.start_date, leave.end_date)
            existing_leaves.add(key)
    except:
        pass  # If we can't get existing leaves, we'll skip duplicate checking
    return existing_leaves

@router.get("/", response_model=List[LeaveResponse])
async def list_leaves(
    employee_id: Optional[str] = Query(None, description="Filter by employee ID"),
    status: Optional[str] = Query(None, description="Filter by leave status"),
    start_from: Optional[date] = Query(None, description="Filter leaves from this date"),
    current_user: dict = Depends(require_permission("leave:view"))
):
    """Get list of leave requests"""
    try:
        leaves = repo_list_leaves(employee_id, start_from)
        
        # Filter by status if provided
        if status:
            leaves = [leave for leave in leaves if leave.status == status]
        
        # Convert to response format
        result = []
        for leave in leaves:
            employee = get_employee(leave.employee_id)
            leave_type = get_leave_type_by_code(leave.leave_type_id) if hasattr(leave, 'leave_type_id') else None
            
            result.append(LeaveResponse(
                id=leave.id,
                employee_id=leave.employee_id,
                leave_type_id=leave.leave_type_id,
                start_date=leave.start_date,
                end_date=leave.end_date,
                days_requested=leave.days,
                reason=leave.note,
                status=leave.status,
                approved_by=None,  # Not stored in current model
                approved_at=None,  # Not stored in current model
                remarks=leave.note,
                created_at=leave.created_at,
                updated_at=leave.updated_at,
                employee=employee
            ))
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching leaves: {str(e)}")

@router.get("/types", response_model=List[LeaveTypeResponse])
async def list_leave_types(
    current_user: dict = Depends(require_permission("leave:view"))
):
    """Get list of leave types"""
    try:
        leave_types = repo_list_leave_types()
        
        result = []
        for lt in leave_types:
            result.append(LeaveTypeResponse(
                id=lt.id,
                name=lt.name,
                code=lt.code,
                days_per_year=0.0,  # Not stored in current model
                carry_over=False,   # Not stored in current model
                max_carry_over=None, # Not stored in current model
                is_active=True,     # Not stored in current model
                created_at=datetime.now(),  # Not stored in current model
                updated_at=None
            ))
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching leave types: {str(e)}")

@router.post("/", response_model=LeaveResponse)
async def create_leave_request(
    leave_data: LeaveCreate,
    current_user: dict = Depends(require_permission("leave:create"))
):
    """Create a new leave request"""
    try:
        # Get leave type code from leave_type_id
        leave_type = None
        for lt in repo_list_leave_types():
            if lt.id == leave_data.leave_type_id:
                leave_type = lt
                break
        
        if not leave_type:
            raise HTTPException(status_code=400, detail="Invalid leave type ID")
        
        # Create leave using repo
        leave = repo_create_leave(
            employee_id=leave_data.employee_id,
            leave_type_code=leave_type.code,
            start=leave_data.start_date,
            end=leave_data.end_date,
            days=leave_data.days_requested,
            note=leave_data.reason,
            created_by=current_user.get('username'),
            status=leave_data.status
        )
        
        # Get employee for response
        employee = get_employee(leave.employee_id)
        
        return LeaveResponse(
            id=leave.id,
            employee_id=leave.employee_id,
            leave_type_id=leave.leave_type_id,
            start_date=leave.start_date,
            end_date=leave.end_date,
            days_requested=leave.days,
            reason=leave.note,
            status=leave.status,
            approved_by=None,
            approved_at=None,
            remarks=leave.note,
            created_at=leave.created_at,
            updated_at=leave.updated_at,
            employee=employee
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating leave: {str(e)}")

@router.put("/{leave_id}", response_model=LeaveResponse)
async def update_leave_request(
    leave_id: int,
    leave_data: LeaveUpdate,
    current_user: dict = Depends(require_permission("leave:edit"))
):
    """Update a leave request"""
    try:
        # Get leave type code if leave_type_id is provided
        leave_type_code = None
        if leave_data.leave_type_id:
            leave_type = None
            for lt in repo_list_leave_types():
                if lt.id == leave_data.leave_type_id:
                    leave_type = lt
                    break
            if leave_type:
                leave_type_code = leave_type.code
        
        # Update leave using repo
        updated_leave = repo_update_leave(
            leave_id=leave_id,
            leave_type_code=leave_type_code,
            start_date=leave_data.start_date,
            end_date=leave_data.end_date,
            days=leave_data.days_requested,
            note=leave_data.reason,
            status=leave_data.status,
            performed_by=current_user.get('username')
        )
        
        if not updated_leave:
            raise HTTPException(status_code=404, detail="Leave not found")
        
        # Get employee for response
        employee = get_employee(updated_leave.employee_id)
        
        return LeaveResponse(
            id=updated_leave.id,
            employee_id=updated_leave.employee_id,
            leave_type_id=updated_leave.leave_type_id,
            start_date=updated_leave.start_date,
            end_date=updated_leave.end_date,
            days_requested=updated_leave.days,
            reason=updated_leave.note,
            status=updated_leave.status,
            approved_by=None,
            approved_at=None,
            remarks=updated_leave.note,
            created_at=updated_leave.created_at,
            updated_at=updated_leave.updated_at,
            employee=employee
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating leave: {str(e)}")

@router.delete("/{leave_id}")
async def delete_leave_request(
    leave_id: int,
    current_user: dict = Depends(require_permission("leave:delete"))
):
    """Delete a leave request"""
    try:
        success = repo_delete_leave(leave_id, performed_by=current_user.get('username'))
        if not success:
            raise HTTPException(status_code=404, detail="Leave not found")
        return {"message": "Leave deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting leave: {str(e)}")

@router.get("/balance/{employee_id}")
async def get_leave_balance(
    employee_id: str,
    current_user: dict = Depends(require_permission("leave:view"))
):
    """Get leave balance for an employee"""
    try:
        employee = get_employee(employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        today = date.today()
        
        # Use seniority_start_date if available, otherwise hire_date for vacation calculations
        seniority_date = employee.seniority_start_date if hasattr(employee, 'seniority_start_date') and employee.seniority_start_date else employee.hire_date
        
        vacation_remaining = get_vacation_remaining(employee_id, seniority_date, today)
        sick_remaining = get_sick_remaining(employee_id, today)
        
        # Calculate vacation entitlement details
        vacation_entitlement = 0.0
        vacation_earned_date = None
        vacation_expiry_date = None
        
        if seniority_date:
            vacation_entitlement = calculate_vacation_entitlement(seniority_date, today)
            if vacation_entitlement > 0:
                vacation_earned_date, vacation_expiry_date = vacation_earned_window(seniority_date, today)
        
        # Calculate sick leave entitlement (5.0 days if eligible, 0.0 if not)
        from repos.employee_repo_ext import is_employee_eligible_for_sick_leave
        sick_entitlement = 5.0 if is_employee_eligible_for_sick_leave(employee_id, today) else 0.0
        
        return {
            "employee_id": employee_id,
            "vacation_remaining": vacation_remaining,
            "sick_remaining": sick_remaining,
            "vacation_entitlement": vacation_entitlement,
            "sick_entitlement": sick_entitlement,
            "vacation_earned_date": vacation_earned_date,
            "vacation_expiry_date": vacation_expiry_date,
            "hire_date": employee.hire_date,
            "seniority_start_date": employee.seniority_start_date if hasattr(employee, 'seniority_start_date') else None,
            "years_employed": (today - seniority_date).days / 365.25 if seniority_date else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating leave balance: {str(e)}")

@router.post("/calculate-days", response_model=CalculateLeaveDaysResponse)
async def calculate_leave_days(
    request: CalculateLeaveDaysRequest,
    current_user: dict = Depends(require_permission("leave:view"))
):
    """Calculate leave days for a date range, excluding weekends and holidays"""
    try:
        employee = get_employee(request.employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        if request.start_date > request.end_date:
            raise HTTPException(status_code=400, detail="Start date cannot be after end date")
        
        # Calculate working days excluding weekends and holidays
        days = calculate_leave_days_for_employee(
            request.employee_id,
            request.start_date,
            request.end_date
        )
        
        return CalculateLeaveDaysResponse(
            days=days,
            start_date=request.start_date,
            end_date=request.end_date,
            employee_id=request.employee_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating leave days: {str(e)}")

@router.post("/validate")
async def validate_leave_request(
    employee_id: str,
    leave_type_code: str,
    start_date: date,
    end_date: date,
    days: float,
    current_user: dict = Depends(require_permission("leave:view"))
):
    """Validate a leave request before creating it"""
    try:
        employee = get_employee(employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        today = date.today()
        
        # Use seniority_start_date if available, otherwise hire_date for leave validation
        seniority_date = employee.seniority_start_date if hasattr(employee, 'seniority_start_date') and employee.seniority_start_date else employee.hire_date
        
        result = can_approve_leave(
            employee_id=employee_id,
            leave_type_code=leave_type_code,
            start=start_date,
            end=end_date,
            days=days,
            hire_date=seniority_date,
            as_of=today
        )
        
        return {
            "valid": result.ok,
            "reason": result.reason,
            "remaining_balance": result.remaining
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error validating leave request: {str(e)}")

@router.get("/upload/template")
async def download_leave_template(
    current_user: dict = Depends(require_permission("leave:create"))
):
    """Download Excel template for leave upload"""
    try:
        # Create sample data
        sample_data = [
            {
                "employee_id": "EMP001",
                "leave_type_id": "VAC",
                "start_date": "2024-01-15",
                "end_date": "2024-01-17",
                "days": 3.0,
                "note": "Family vacation",
                "status": "Active",
                "created_by": "admin"
            },
            {
                "employee_id": "EMP002", 
                "leave_type_id": "SICK",
                "start_date": "2024-01-20",
                "end_date": "2024-01-20",
                "days": 1.0,
                "note": "Doctor appointment",
                "status": "Active",
                "created_by": "admin"
            }
        ]
        
        # Create DataFrame
        df = pd.DataFrame(sample_data)
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Leave Data', index=False)
            
            # Get the workbook and worksheet
            workbook = writer.book
            worksheet = writer.sheets['Leave Data']
            
            # Add instructions in a separate sheet
            instructions_data = [
                ["Column", "Description", "Required", "Example"],
                ["employee_id", "Employee ID (must exist in system)", "Yes", "EMP001"],
                ["leave_type_id", "Leave type code (VAC, SICK, UNPAID, etc.)", "Yes", "VAC"],
                ["start_date", "Start date (YYYY-MM-DD format)", "Yes", "2024-01-15"],
                ["end_date", "End date (YYYY-MM-DD format)", "Yes", "2024-01-17"],
                ["days", "Number of days (can be decimal)", "Yes", "3.0"],
                ["note", "Reason or notes (optional)", "No", "Family vacation"],
                ["status", "Status: Active or Cancelled", "Yes", "Active"],
                ["created_by", "Who created this record", "Yes", "admin"],
                ["", "", "", ""],
                ["Notes:", "", "", ""],
                ["- Dates should be in YYYY-MM-DD format", "", "", ""],
                ["- Employee ID must exist in the system", "", "", ""],
                ["- Leave type codes must be valid (VAC, SICK, UNPAID, etc.)", "", "", ""],
                ["- Duplicate records (same employee + dates) will be skipped", "", "", ""],
                ["- Days can be decimal values (e.g., 0.5 for half day)", "", "", ""]
            ]
            
            instructions_df = pd.DataFrame(instructions_data[1:], columns=instructions_data[0])
            instructions_df.to_excel(writer, sheet_name='Instructions', index=False)
        
        output.seek(0)
        
        # Return file as streaming response
        return StreamingResponse(
            io.BytesIO(output.read()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=leave_upload_template.xlsx"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating template: {str(e)}")

@router.post("/upload/preview", response_model=LeaveUploadPreviewResponse)
async def preview_leave_upload(
    file: UploadFile = File(),
    current_user: dict = Depends(require_permission("leave:create"))
):
    """Preview leave data from Excel file without importing"""
    try:
        # Debug: Log file information
        print(f"Received file: {file.filename}, size: {file.size}, content_type: {file.content_type}")
        print(f"File object: {file}")
        print(f"File type: {type(file)}")
        
        # Validate file type
        if not file.filename or not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")
        
        # Read Excel file
        contents = await file.read()
        print(f"File contents size: {len(contents)} bytes")
        
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        df = pd.read_excel(io.BytesIO(contents))
        
        if df.empty:
            raise HTTPException(status_code=400, detail="Excel file is empty")
        
        # Get leave type mapping
        leave_types = repo_list_leave_types()
        leave_type_mapping = {lt.code: lt.id for lt in leave_types}
        
        # Get existing leaves for duplicate checking
        existing_leaves = get_existing_leaves_set()
        
        # Validate each row
        preview_rows = []
        valid_count = 0
        invalid_count = 0
        duplicate_count = 0
        
        for index, row in df.iterrows():
            row_number = index + 2  # Excel row numbers start from 2 (header is row 1)
            row_data = row.to_dict()
            
            # Validate the row
            is_valid, error_message = validate_leave_upload_row(row_data, row_number, leave_type_mapping, existing_leaves)
            
            # Prepare row data for response
            try:
                employee_id = str(row_data.get('employee_id', '')).strip()
                leave_type_id = str(row_data.get('leave_type_id', '')).strip()
                start_date = pd.to_datetime(row_data.get('start_date')).date() if pd.notna(row_data.get('start_date')) else None
                end_date = pd.to_datetime(row_data.get('end_date')).date() if pd.notna(row_data.get('end_date')) else None
                days = float(row_data.get('days', 0)) if pd.notna(row_data.get('days')) else 0
                status = str(row_data.get('status', 'Active')).strip()
            except:
                # If we can't parse the data, use defaults
                employee_id = str(row_data.get('employee_id', ''))
                leave_type_id = str(row_data.get('leave_type_id', ''))
                start_date = None
                end_date = None
                days = 0
                status = 'Active'
            
            preview_row = LeaveUploadPreviewRow(
                row_number=row_number,
                employee_id=employee_id,
                leave_type_id=leave_type_id,
                start_date=start_date or date.today(),
                end_date=end_date or date.today(),
                days=days,
                status=status,
                will_import=is_valid,
                error_message=error_message
            )
            
            preview_rows.append(preview_row)
            
            if is_valid:
                valid_count += 1
                # Add to existing_leaves to check for duplicates within the file
                if start_date and end_date:
                    existing_leaves.add((employee_id, start_date, end_date))
            else:
                invalid_count += 1
                if error_message and "Duplicate" in error_message:
                    duplicate_count += 1
        
        return LeaveUploadPreviewResponse(
            total_rows=len(df),
            valid_rows=valid_count,
            invalid_rows=invalid_count,
            duplicate_rows=duplicate_count,
            rows=preview_rows
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@router.post("/upload", response_model=LeaveUploadResponse)
async def upload_leaves(
    file: UploadFile = File(),
    current_user: dict = Depends(require_permission("leave:create"))
):
    """Upload and import leave data from Excel file"""
    try:
        # Debug: Log file information
        print(f"Received file: {file.filename}, size: {file.size}, content_type: {file.content_type}")
        
        # Validate file type
        if not file.filename or not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")
        
        # Read Excel file
        contents = await file.read()
        print(f"File contents size: {len(contents)} bytes")
        
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        df = pd.read_excel(io.BytesIO(contents))
        
        if df.empty:
            raise HTTPException(status_code=400, detail="Excel file is empty")
        
        # Get leave type mapping
        leave_types = repo_list_leave_types()
        leave_type_mapping = {lt.code: lt.id for lt in leave_types}
        
        # Get existing leaves for duplicate checking
        existing_leaves = get_existing_leaves_set()
        
        # Process each row
        success_count = 0
        skipped_count = 0
        error_count = 0
        errors = []
        
        for index, row in df.iterrows():
            row_number = index + 2  # Excel row numbers start from 2
            row_data = row.to_dict()
            
            # Validate the row
            is_valid, error_message = validate_leave_upload_row(row_data, row_number, leave_type_mapping, existing_leaves)
            
            if not is_valid:
                error_count += 1
                errors.append(LeaveUploadError(
                    row_number=row_number,
                    error_message=error_message
                ))
                continue
            
            # Try to create the leave record
            try:
                employee_id = str(row_data['employee_id']).strip()
                leave_type_code = str(row_data['leave_type_id']).strip()
                start_date = pd.to_datetime(row_data['start_date']).date()
                end_date = pd.to_datetime(row_data['end_date']).date()
                days = float(row_data['days'])
                note = str(row_data.get('note', '')).strip() if pd.notna(row_data.get('note')) else None
                status = str(row_data.get('status', 'Active')).strip()
                created_by = str(row_data.get('created_by', current_user.get('username', 'Excel Import'))).strip()
                
                # Create the leave record
                leave_record = repo_create_leave(
                    employee_id=employee_id,
                    leave_type_code=leave_type_code,
                    start=start_date,
                    end=end_date,
                    days=days,
                    note=note,
                    created_by=created_by,
                    status=status
                )
                
                success_count += 1
                # Add to existing_leaves to prevent duplicates within the same file
                existing_leaves.add((employee_id, start_date, end_date))
                
            except Exception as e:
                error_count += 1
                errors.append(LeaveUploadError(
                    row_number=row_number,
                    error_message=f"Failed to create leave record: {str(e)}"
                ))
        
        return LeaveUploadResponse(
            success_count=success_count,
            skipped_count=skipped_count,
            error_count=error_count,
            errors=errors
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
