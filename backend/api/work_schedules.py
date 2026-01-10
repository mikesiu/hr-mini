"""
Work Schedule API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import time

from api.dependencies import get_current_user, require_permission
from schemas import (
    WorkScheduleCreate, WorkScheduleUpdate, WorkScheduleResponse, WorkScheduleListResponse,
    EmployeeScheduleAssign, EmployeeScheduleUpdate, EmployeeScheduleResponse, EmployeeScheduleListResponse
)
from repos.work_schedule_repo import (
    create_work_schedule, get_work_schedule, list_work_schedules,
    update_work_schedule, delete_work_schedule
)
from repos.employee_schedule_repo import (
    assign_schedule, get_current_schedule, list_employee_schedules,
    update_employee_schedule, remove_employee_schedule, list_employees_by_schedule
)
from repos.employee_repo import get_employee

router = APIRouter()


def _parse_time(time_str: Optional[str]) -> Optional[time]:
    """Parse time string to time object"""
    if not time_str:
        return None
    try:
        parts = time_str.split(':')
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0
        second = int(parts[2]) if len(parts) > 2 else 0
        return time(hour=hour, minute=minute, second=second)
    except (ValueError, IndexError):
        return None


@router.post("", response_model=WorkScheduleResponse)
async def create_schedule(
    schedule_data: WorkScheduleCreate,
    current_user: dict = Depends(require_permission("schedule:create"))
):
    """Create a new work schedule"""
    try:
        schedule = create_work_schedule(
            company_id=schedule_data.company_id,
            name=schedule_data.name,
            mon_start=schedule_data.mon_start,
            mon_end=schedule_data.mon_end,
            tue_start=schedule_data.tue_start,
            tue_end=schedule_data.tue_end,
            wed_start=schedule_data.wed_start,
            wed_end=schedule_data.wed_end,
            thu_start=schedule_data.thu_start,
            thu_end=schedule_data.thu_end,
            fri_start=schedule_data.fri_start,
            fri_end=schedule_data.fri_end,
            sat_start=schedule_data.sat_start,
            sat_end=schedule_data.sat_end,
            sun_start=schedule_data.sun_start,
            sun_end=schedule_data.sun_end,
            is_active=schedule_data.is_active,
            performed_by=current_user.get('username'),
        )
        return schedule
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating schedule: {str(e)}")


@router.get("", response_model=WorkScheduleListResponse)
async def list_schedules(
    company_id: Optional[str] = Query(None, description="Filter by company ID"),
    active_only: bool = Query(False, description="Show only active schedules"),
    current_user: dict = Depends(require_permission("schedule:view"))
):
    """List work schedules"""
    try:
        schedules = list_work_schedules(company_id=company_id, active_only=active_only)
        return {
            "success": True,
            "data": schedules
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing schedules: {str(e)}")


@router.get("/{schedule_id}", response_model=WorkScheduleResponse)
async def get_schedule(
    schedule_id: int,
    current_user: dict = Depends(require_permission("schedule:view"))
):
    """Get a work schedule by ID"""
    schedule = get_work_schedule(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


@router.put("/{schedule_id}", response_model=WorkScheduleResponse)
async def update_schedule(
    schedule_id: int,
    schedule_data: WorkScheduleUpdate,
    current_user: dict = Depends(require_permission("schedule:update"))
):
    """Update a work schedule"""
    try:
        schedule = update_work_schedule(
            schedule_id=schedule_id,
            name=schedule_data.name,
            mon_start=schedule_data.mon_start,
            mon_end=schedule_data.mon_end,
            tue_start=schedule_data.tue_start,
            tue_end=schedule_data.tue_end,
            wed_start=schedule_data.wed_start,
            wed_end=schedule_data.wed_end,
            thu_start=schedule_data.thu_start,
            thu_end=schedule_data.thu_end,
            fri_start=schedule_data.fri_start,
            fri_end=schedule_data.fri_end,
            sat_start=schedule_data.sat_start,
            sat_end=schedule_data.sat_end,
            sun_start=schedule_data.sun_start,
            sun_end=schedule_data.sun_end,
            is_active=schedule_data.is_active,
            performed_by=current_user.get('username'),
        )
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        return schedule
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating schedule: {str(e)}")


@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: int,
    current_user: dict = Depends(require_permission("schedule:delete"))
):
    """Delete a work schedule"""
    try:
        success = delete_work_schedule(schedule_id, performed_by=current_user.get('username'))
        if not success:
            raise HTTPException(status_code=404, detail="Schedule not found")
        return {"success": True, "message": "Schedule deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting schedule: {str(e)}")


@router.post("/{schedule_id}/assign", response_model=EmployeeScheduleResponse)
async def assign_schedule_to_employee(
    schedule_id: int,
    assignment_data: EmployeeScheduleAssign,
    current_user: dict = Depends(require_permission("schedule:update"))
):
    """Assign a work schedule to an employee"""
    try:
        # Verify schedule exists
        schedule = get_work_schedule(schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        # Verify employee exists
        employee = get_employee(assignment_data.employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        employee_schedule = assign_schedule(
            employee_id=assignment_data.employee_id,
            schedule_id=schedule_id,
            effective_date=assignment_data.effective_date,
            end_date=assignment_data.end_date,
            performed_by=current_user.get('username'),
        )
        
        # Extract all values from the SQLAlchemy object before it's detached
        # Convert dates to strings explicitly
        effective_date_str = employee_schedule.effective_date.isoformat() if employee_schedule.effective_date else None
        end_date_str = employee_schedule.end_date.isoformat() if employee_schedule.end_date else None
        
        # Format response properly with employee name and date strings
        employee_name = employee.full_name if employee else None
        
        # Create response object with all string values
        return EmployeeScheduleResponse(
            id=employee_schedule.id,
            employee_id=employee_schedule.employee_id,
            employee_name=employee_name,
            schedule_id=employee_schedule.schedule_id,
            effective_date=effective_date_str,
            end_date=end_date_str,
            schedule=None  # Explicitly set to None to avoid lazy loading
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error assigning schedule: {str(e)}")


@router.get("/employee/{employee_id}", response_model=WorkScheduleResponse)
async def get_employee_schedule(
    employee_id: str,
    as_of_date: Optional[str] = Query(None, description="Date to check schedule (YYYY-MM-DD)"),
    current_user: dict = Depends(require_permission("schedule:view"))
):
    """Get the current work schedule for an employee"""
    from datetime import date as date_type
    
    check_date = None
    if as_of_date:
        try:
            check_date = date_type.fromisoformat(as_of_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    schedule = get_current_schedule(employee_id, check_date)
    if not schedule:
        raise HTTPException(status_code=404, detail="No schedule assigned for this employee")
    return schedule


@router.get("/employee/{employee_id}/history", response_model=EmployeeScheduleListResponse)
async def get_employee_schedule_history(
    employee_id: str,
    current_user: dict = Depends(require_permission("schedule:view"))
):
    """Get schedule assignment history for an employee"""
    try:
        schedules = list_employee_schedules(employee_id)
        return {
            "success": True,
            "data": schedules
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting schedule history: {str(e)}")


@router.get("/{schedule_id}/assignments", response_model=EmployeeScheduleListResponse)
async def get_schedule_assignments(
    schedule_id: int,
    current_user: dict = Depends(require_permission("schedule:view"))
):
    """Get all employees assigned to a specific work schedule"""
    try:
        # Verify schedule exists
        schedule = get_work_schedule(schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        assignments = list_employees_by_schedule(schedule_id)
        
        # Enrich assignments with employee names
        from schemas import EmployeeScheduleResponse
        enriched_assignments = []
        for assignment in assignments:
            employee = get_employee(assignment.employee_id)
            employee_name = employee.full_name if employee else None
            
            # Convert to response format with employee name
            assignment_dict = {
                "id": assignment.id,
                "employee_id": assignment.employee_id,
                "employee_name": employee_name,
                "schedule_id": assignment.schedule_id,
                "effective_date": assignment.effective_date.isoformat() if assignment.effective_date else None,
                "end_date": assignment.end_date.isoformat() if assignment.end_date else None,
            }
            enriched_assignments.append(EmployeeScheduleResponse(**assignment_dict))
        
        return {
            "success": True,
            "data": enriched_assignments
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting schedule assignments: {str(e)}")


@router.put("/assignments/{assignment_id}", response_model=EmployeeScheduleResponse)
async def update_schedule_assignment(
    assignment_id: int,
    assignment_data: EmployeeScheduleUpdate,
    current_user: dict = Depends(require_permission("schedule:update"))
):
    """Update an employee schedule assignment (e.g., change end date to deactivate)"""
    try:
        # Verify assignment exists
        from models.base import SessionLocal
        with SessionLocal() as session:
            from models.employee_schedule import EmployeeSchedule
            assignment = session.get(EmployeeSchedule, assignment_id)
            if not assignment:
                raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Update the assignment - only update fields that are provided
        updated_assignment = update_employee_schedule(
            employee_schedule_id=assignment_id,
            effective_date=assignment_data.effective_date,
            end_date=assignment_data.end_date,
            performed_by=current_user.get('username'),
        )
        
        if not updated_assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Get employee name
        employee = get_employee(updated_assignment.employee_id)
        employee_name = employee.full_name if employee else None
        
        # Convert dates to strings
        effective_date_str = updated_assignment.effective_date.isoformat() if updated_assignment.effective_date else None
        end_date_str = updated_assignment.end_date.isoformat() if updated_assignment.end_date else None
        
        return EmployeeScheduleResponse(
            id=updated_assignment.id,
            employee_id=updated_assignment.employee_id,
            employee_name=employee_name,
            schedule_id=updated_assignment.schedule_id,
            effective_date=effective_date_str,
            end_date=end_date_str,
            schedule=None
        )
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating assignment: {str(e)}")
