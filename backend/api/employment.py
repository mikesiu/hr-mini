from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer
from typing import List, Optional
from schemas import EmploymentCreate, EmploymentUpdate, EmploymentResponse, EmploymentListResponse
from api.dependencies import get_current_user
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
from repos.employment_repo import (
    create_employment, get_employment_by_id, get_employment_history,
    get_current_employment, update_employment, delete_employment,
    get_employment_with_details, search_employments
)

router = APIRouter()


@router.get("/list", response_model=EmploymentListResponse)
async def list_employment_records(
    q: Optional[str] = Query(None, description="Search term"),
    employee_id: Optional[str] = Query(None, description="Filter by employee ID"),
    company_id: Optional[str] = Query(None, description="Filter by company ID"),
    current_user: dict = Depends(get_current_user)
):
    """Get list of employment records with optional search and filtering"""
    try:
        if employee_id:
            # Get employment history for specific employee
            employments = get_employment_history(employee_id)
            # Filter by company if specified
            if company_id:
                employments = [emp for emp in employments if emp.company_id == company_id]
            employment_list = [EmploymentResponse(
                id=emp.id,
                employee_id=emp.employee_id,
                company_id=emp.company_id,
                position=emp.position,
                department=emp.department,
                start_date=emp.start_date,
                end_date=emp.end_date,
                is_active=emp.end_date is None,
                remarks=emp.notes,
                wage_classification=emp.wage_classification,
                count_all_ot=emp.count_all_ot
            ) for emp in employments]
            return {"success": True, "data": employment_list}
        else:
            # Search all employments
            employment_data = search_employments(q or "")
            # Filter by company if specified
            if company_id:
                employment_data = [emp for emp in employment_data if emp["employment"].company_id == company_id]
            employment_list = [EmploymentResponse(
                id=emp["employment"].id,
                employee_id=emp["employment"].employee_id,
                company_id=emp["employment"].company_id,
                position=emp["employment"].position,
                department=emp["employment"].department,
                start_date=emp["employment"].start_date,
                end_date=emp["employment"].end_date,
                is_active=emp["employment"].end_date is None,
                remarks=emp["employment"].notes,
                wage_classification=emp["employment"].wage_classification,
                count_all_ot=emp["employment"].count_all_ot
            ) for emp in employment_data]
            return {"success": True, "data": employment_list}
    except Exception as e:
        print(f"DEBUG: Error in list_employment_records: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{employment_id}", response_model=EmploymentResponse)
async def get_employment_record(
    employment_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific employment record by ID"""
    employment = get_employment_by_id(employment_id)
    if not employment:
        raise HTTPException(status_code=404, detail="Employment record not found")
    
    return EmploymentResponse(
        id=employment.id,
        employee_id=employment.employee_id,
        company_id=employment.company_id,
        position=employment.position,
        department=employment.department,
        start_date=employment.start_date,
        end_date=employment.end_date,
        is_active=employment.end_date is None,
        remarks=employment.notes,
        wage_classification=employment.wage_classification,
        count_all_ot=employment.count_all_ot,
    )

@router.post("/", response_model=EmploymentResponse)
async def create_employment_record(
    employment_data: EmploymentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new employment record"""
    try:
        employment = create_employment(
            employee_id=employment_data.employee_id,
            company_id=employment_data.company_id,
            position=employment_data.position,
            department=employment_data.department,
            start_date=employment_data.start_date,
            end_date=employment_data.end_date,
            notes=employment_data.remarks,
            wage_classification=employment_data.wage_classification,
            count_all_ot=employment_data.count_all_ot,
            performed_by=current_user["username"]
        )
        
        return EmploymentResponse(
            id=employment.id,
            employee_id=employment.employee_id,
            company_id=employment.company_id,
            position=employment.position,
            department=employment.department,
            start_date=employment.start_date,
            end_date=employment.end_date,
            is_active=employment.end_date is None,
            remarks=employment.notes,
            wage_classification=employment.wage_classification
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{employment_id}", response_model=EmploymentResponse)
async def update_employment_record(
    employment_id: int,
    employment_data: EmploymentUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an existing employment record"""
    # exclude_unset=True ensures only fields explicitly provided are updated
    # This allows False values for boolean fields to be included
    update_data = employment_data.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided for update")
    
    employment = update_employment(
        employment_id,
        performed_by=current_user["username"],
        **update_data
    )
    
    if not employment:
        raise HTTPException(status_code=404, detail="Employment record not found")
    
    return EmploymentResponse(
        id=employment.id,
        employee_id=employment.employee_id,
        company_id=employment.company_id,
        position=employment.position,
        department=employment.department,
        start_date=employment.start_date,
        end_date=employment.end_date,
        is_active=employment.end_date is None,
        remarks=employment.notes,
        wage_classification=employment.wage_classification,
        count_all_ot=employment.count_all_ot,
    )

@router.delete("/{employment_id}")
async def delete_employment_record(
    employment_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete an employment record"""
    success = delete_employment(employment_id, performed_by=current_user["username"])
    if not success:
        raise HTTPException(status_code=404, detail="Employment record not found")
    
    return {"message": "Employment record deleted successfully"}
