from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import date, timedelta
from api.dependencies import get_current_user, require_permission
from schemas import WorkPermitCreate, WorkPermitUpdate, WorkPermitResponse
from repos.work_permit_repo import (
    create_work_permit, get_work_permit_by_id, get_work_permits_by_employee,
    get_current_work_permit, update_work_permit, delete_work_permit,
    get_expiring_work_permits, search_work_permits
)
from repos.employee_repo import get_employee

router = APIRouter()

@router.get("/", response_model=List[WorkPermitResponse])
async def list_work_permits(
    employee_id: Optional[str] = Query(None, description="Filter by employee ID"),
    permit_type: Optional[str] = Query(None, description="Filter by permit type"),
    current_user: dict = Depends(require_permission("work_permit:manage"))
):
    """Get list of work permits"""
    try:
        permits = search_work_permits(employee_id=employee_id, permit_type=permit_type)
        return permits
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching work permits: {str(e)}")

@router.get("/employee/{employee_id}", response_model=List[WorkPermitResponse])
async def get_work_permits_by_employee_id(
    employee_id: str,
    current_user: dict = Depends(require_permission("work_permit:manage"))
):
    """Get work permits for a specific employee"""
    try:
        permits = get_work_permits_by_employee(employee_id)
        return permits
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching work permits: {str(e)}")

@router.get("/employee/{employee_id}/current", response_model=WorkPermitResponse)
async def get_current_work_permit_for_employee(
    employee_id: str,
    current_user: dict = Depends(require_permission("work_permit:manage"))
):
    """Get current work permit for a specific employee"""
    try:
        permit = get_current_work_permit(employee_id)
        if not permit:
            raise HTTPException(status_code=404, detail="No current work permit found")
        return permit
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching current work permit: {str(e)}")

@router.get("/expiring", response_model=List[WorkPermitResponse])
async def get_expiring_work_permits_endpoint(
    days_ahead: int = Query(30, description="Number of days ahead to check for expiring permits"),
    current_user: dict = Depends(require_permission("work_permit:manage"))
):
    """Get work permits expiring within specified days"""
    try:
        permits = get_expiring_work_permits(days_ahead)
        return permits
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching expiring work permits: {str(e)}")

@router.get("/{permit_id}", response_model=WorkPermitResponse)
async def get_work_permit(
    permit_id: int,
    current_user: dict = Depends(require_permission("work_permit:manage"))
):
    """Get a specific work permit by ID"""
    try:
        permit = get_work_permit_by_id(permit_id)
        if not permit:
            raise HTTPException(status_code=404, detail="Work permit not found")
        return permit
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching work permit: {str(e)}")

@router.post("/", response_model=WorkPermitResponse)
async def create_work_permit_endpoint(
    work_permit_data: WorkPermitCreate,
    current_user: dict = Depends(require_permission("work_permit:manage"))
):
    """Create a new work permit"""
    try:
        # Verify employee exists
        employee = get_employee(work_permit_data.employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        permit = create_work_permit(
            employee_id=work_permit_data.employee_id,
            permit_type=work_permit_data.permit_type,
            expiry_date=work_permit_data.expiry_date,
            performed_by=current_user.get("username")
        )
        return permit
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating work permit: {str(e)}")

@router.put("/{permit_id}", response_model=WorkPermitResponse)
async def update_work_permit_endpoint(
    permit_id: int,
    work_permit_data: WorkPermitUpdate,
    current_user: dict = Depends(require_permission("work_permit:manage"))
):
    """Update a work permit"""
    try:
        # Check if permit exists
        existing_permit = get_work_permit_by_id(permit_id)
        if not existing_permit:
            raise HTTPException(status_code=404, detail="Work permit not found")
        
        # Prepare update data
        update_data = {}
        if work_permit_data.permit_type is not None:
            update_data["permit_type"] = work_permit_data.permit_type
        if work_permit_data.expiry_date is not None:
            update_data["expiry_date"] = work_permit_data.expiry_date
        
        if not update_data:
            return existing_permit
        
        permit = update_work_permit(
            permit_id,
            performed_by=current_user.get("username"),
            **update_data
        )
        if not permit:
            raise HTTPException(status_code=500, detail="Failed to update work permit")
        
        return permit
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating work permit: {str(e)}")

@router.delete("/{permit_id}")
async def delete_work_permit_endpoint(
    permit_id: int,
    current_user: dict = Depends(require_permission("work_permit:manage"))
):
    """Delete a work permit"""
    try:
        # Check if permit exists
        existing_permit = get_work_permit_by_id(permit_id)
        if not existing_permit:
            raise HTTPException(status_code=404, detail="Work permit not found")
        
        success = delete_work_permit(permit_id, performed_by=current_user.get("username"))
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete work permit")
        
        return {"message": "Work permit deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting work permit: {str(e)}")
