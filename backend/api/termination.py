from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from schemas import (
    TerminationCreate, TerminationUpdate, TerminationResponse, TerminationListResponse
)
from api.dependencies import get_current_user, require_permission
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
from repos.termination_repo import (
    get_all_terminations,
    get_termination_by_id,
    get_termination_by_employee_id,
    create_termination,
    update_termination,
    delete_termination
)
from repos.employee_repo import get_employee

router = APIRouter()


@router.get("", response_model=TerminationListResponse)
@router.get("/", response_model=TerminationListResponse)
async def list_terminations(
    employee_id: Optional[str] = Query(None, description="Filter by employee ID"),
    current_user: dict = Depends(require_permission("termination:view"))
):
    """Get list of all terminations with optional employee filter"""
    try:
        terminations = get_all_terminations()
        
        # Filter by employee_id if specified
        if employee_id:
            terminations = [t for t in terminations if t.employee_id == employee_id]
        
        # Convert SQLAlchemy models to Pydantic models
        termination_list = []
        for term in terminations:
            employee = get_employee(term.employee_id)
            employee_response = None
            if employee:
                from schemas import EmployeeResponse
                employee_response = EmployeeResponse(
                    id=employee.id,
                    first_name=employee.first_name,
                    last_name=employee.last_name,
                    other_name=employee.other_name,
                    full_name=employee.full_name,
                    email=employee.email,
                    phone=employee.phone,
                    street=employee.street,
                    city=employee.city,
                    province=employee.province,
                    postal_code=employee.postal_code,
                    dob=employee.dob.isoformat() if employee.dob else None,
                    sin=employee.sin,
                    drivers_license=employee.drivers_license,
                    hire_date=employee.hire_date.isoformat() if employee.hire_date else None,
                    probation_end_date=employee.probation_end_date.isoformat() if employee.probation_end_date else None,
                    seniority_start_date=employee.seniority_start_date.isoformat() if employee.seniority_start_date else None,
                    status=employee.status,
                    remarks=employee.remarks,
                    paystub=employee.paystub,
                    union_member=employee.union_member,
                    use_mailing_address=employee.use_mailing_address,
                    mailing_street=employee.mailing_street,
                    mailing_city=employee.mailing_city,
                    mailing_province=employee.mailing_province,
                    mailing_postal_code=employee.mailing_postal_code,
                    emergency_contact_name=employee.emergency_contact_name,
                    emergency_contact_phone=employee.emergency_contact_phone,
                    company_id=None,
                    company_short_form=None,
                    created_at=employee.created_at.isoformat() if employee.created_at else None,
                    updated_at=employee.updated_at.isoformat() if employee.updated_at else None
                )
            
            termination_list.append(TerminationResponse(
                id=term.id,
                employee_id=term.employee_id,
                last_working_date=term.last_working_date,
                termination_effective_date=term.termination_effective_date,
                roe_reason_code=term.roe_reason_code,
                other_reason=term.other_reason,
                internal_reason=term.internal_reason,
                remarks=term.remarks,
                created_at=term.created_at,
                created_by=term.created_by,
                employee=employee_response
            ))
        
        return {"success": True, "data": termination_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching terminations: {str(e)}")


@router.get("/{termination_id}", response_model=TerminationResponse)
async def get_termination_by_id_endpoint(
    termination_id: int,
    current_user: dict = Depends(require_permission("termination:view"))
):
    """Get a specific termination by ID"""
    termination = get_termination_by_id(termination_id)
    if not termination:
        raise HTTPException(status_code=404, detail="Termination not found")
    
    # Get employee information
    employee = get_employee(termination.employee_id)
    employee_response = None
    if employee:
        from schemas import EmployeeResponse
        employee_response = EmployeeResponse(
            id=employee.id,
            first_name=employee.first_name,
            last_name=employee.last_name,
            other_name=employee.other_name,
            full_name=employee.full_name,
            email=employee.email,
            phone=employee.phone,
            street=employee.street,
            city=employee.city,
            province=employee.province,
            postal_code=employee.postal_code,
            dob=employee.dob.isoformat() if employee.dob else None,
            sin=employee.sin,
            drivers_license=employee.drivers_license,
            hire_date=employee.hire_date.isoformat() if employee.hire_date else None,
            probation_end_date=employee.probation_end_date.isoformat() if employee.probation_end_date else None,
            seniority_start_date=employee.seniority_start_date.isoformat() if employee.seniority_start_date else None,
            status=employee.status,
            remarks=employee.remarks,
            paystub=employee.paystub,
            union_member=employee.union_member,
            use_mailing_address=employee.use_mailing_address,
            mailing_street=employee.mailing_street,
            mailing_city=employee.mailing_city,
            mailing_province=employee.mailing_province,
            mailing_postal_code=employee.mailing_postal_code,
            emergency_contact_name=employee.emergency_contact_name,
            emergency_contact_phone=employee.emergency_contact_phone,
            company_id=None,
            company_short_form=None,
            created_at=employee.created_at.isoformat() if employee.created_at else None,
            updated_at=employee.updated_at.isoformat() if employee.updated_at else None
        )
    
    return TerminationResponse(
        id=termination.id,
        employee_id=termination.employee_id,
        last_working_date=termination.last_working_date,
        termination_effective_date=termination.termination_effective_date,
        roe_reason_code=termination.roe_reason_code,
        other_reason=termination.other_reason,
        internal_reason=termination.internal_reason,
        remarks=termination.remarks,
        created_at=termination.created_at,
        created_by=termination.created_by,
        employee=employee_response
    )


@router.get("/employee/{employee_id}", response_model=TerminationResponse)
async def get_termination_by_employee_id_endpoint(
    employee_id: str,
    current_user: dict = Depends(require_permission("termination:view"))
):
    """Get termination record for a specific employee"""
    termination = get_termination_by_employee_id(employee_id)
    if not termination:
        raise HTTPException(status_code=404, detail="Termination not found for this employee")
    
    # Get employee information
    employee = get_employee(employee_id)
    employee_response = None
    if employee:
        from schemas import EmployeeResponse
        employee_response = EmployeeResponse(
            id=employee.id,
            first_name=employee.first_name,
            last_name=employee.last_name,
            other_name=employee.other_name,
            full_name=employee.full_name,
            email=employee.email,
            phone=employee.phone,
            street=employee.street,
            city=employee.city,
            province=employee.province,
            postal_code=employee.postal_code,
            dob=employee.dob.isoformat() if employee.dob else None,
            sin=employee.sin,
            drivers_license=employee.drivers_license,
            hire_date=employee.hire_date.isoformat() if employee.hire_date else None,
            probation_end_date=employee.probation_end_date.isoformat() if employee.probation_end_date else None,
            seniority_start_date=employee.seniority_start_date.isoformat() if employee.seniority_start_date else None,
            status=employee.status,
            remarks=employee.remarks,
            paystub=employee.paystub,
            union_member=employee.union_member,
            use_mailing_address=employee.use_mailing_address,
            mailing_street=employee.mailing_street,
            mailing_city=employee.mailing_city,
            mailing_province=employee.mailing_province,
            mailing_postal_code=employee.mailing_postal_code,
            emergency_contact_name=employee.emergency_contact_name,
            emergency_contact_phone=employee.emergency_contact_phone,
            company_id=None,
            company_short_form=None,
            created_at=employee.created_at.isoformat() if employee.created_at else None,
            updated_at=employee.updated_at.isoformat() if employee.updated_at else None
        )
    
    return TerminationResponse(
        id=termination.id,
        employee_id=termination.employee_id,
        last_working_date=termination.last_working_date,
        termination_effective_date=termination.termination_effective_date,
        roe_reason_code=termination.roe_reason_code,
        other_reason=termination.other_reason,
        internal_reason=termination.internal_reason,
        remarks=termination.remarks,
        created_at=termination.created_at,
        created_by=termination.created_by,
        employee=employee_response
    )


@router.post("", response_model=TerminationResponse)
@router.post("/", response_model=TerminationResponse)
async def create_termination_endpoint(
    termination_data: TerminationCreate,
    current_user: dict = Depends(require_permission("termination:create"))
):
    """Create a new termination record"""
    try:
        termination = create_termination(
            employee_id=termination_data.employee_id,
            last_working_date=termination_data.last_working_date,
            termination_effective_date=termination_data.termination_effective_date,
            roe_reason_code=termination_data.roe_reason_code,
            other_reason=termination_data.other_reason,
            internal_reason=termination_data.internal_reason,
            remarks=termination_data.remarks,
            created_by=termination_data.created_by or current_user.get("username"),
            performed_by=current_user.get("username")
        )
        
        # Get employee information
        employee = get_employee(termination.employee_id)
        employee_response = None
        if employee:
            from schemas import EmployeeResponse
            employee_response = EmployeeResponse(
                id=employee.id,
                first_name=employee.first_name,
                last_name=employee.last_name,
                other_name=employee.other_name,
                full_name=employee.full_name,
                email=employee.email,
                phone=employee.phone,
                street=employee.street,
                city=employee.city,
                province=employee.province,
                postal_code=employee.postal_code,
                dob=employee.dob.isoformat() if employee.dob else None,
                sin=employee.sin,
                drivers_license=employee.drivers_license,
                hire_date=employee.hire_date.isoformat() if employee.hire_date else None,
                probation_end_date=employee.probation_end_date.isoformat() if employee.probation_end_date else None,
                seniority_start_date=employee.seniority_start_date.isoformat() if employee.seniority_start_date else None,
                status=employee.status,
                remarks=employee.remarks,
                paystub=employee.paystub,
                union_member=employee.union_member,
                use_mailing_address=employee.use_mailing_address,
                mailing_street=employee.mailing_street,
                mailing_city=employee.mailing_city,
                mailing_province=employee.mailing_province,
                mailing_postal_code=employee.mailing_postal_code,
                emergency_contact_name=employee.emergency_contact_name,
                emergency_contact_phone=employee.emergency_contact_phone,
                company_id=None,
                company_short_form=None,
                created_at=employee.created_at.isoformat() if employee.created_at else None,
                updated_at=employee.updated_at.isoformat() if employee.updated_at else None
            )
        
        return TerminationResponse(
            id=termination.id,
            employee_id=termination.employee_id,
            last_working_date=termination.last_working_date,
            termination_effective_date=termination.termination_effective_date,
            roe_reason_code=termination.roe_reason_code,
            other_reason=termination.other_reason,
            internal_reason=termination.internal_reason,
            remarks=termination.remarks,
            created_at=termination.created_at,
            created_by=termination.created_by,
            employee=employee_response
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating termination: {str(e)}")


@router.put("/{termination_id}", response_model=TerminationResponse)
async def update_termination_endpoint(
    termination_id: int,
    termination_data: TerminationUpdate,
    current_user: dict = Depends(require_permission("termination:update"))
):
    """Update an existing termination record"""
    try:
        # Prepare update data, excluding None values
        update_data = {}
        for field, value in termination_data.dict().items():
            if value is not None:
                update_data[field] = value
        
        if not update_data:
            # No fields to update, return current termination
            termination = get_termination_by_id(termination_id)
            if not termination:
                raise HTTPException(status_code=404, detail="Termination not found")
        else:
            termination = update_termination(
                termination_id=termination_id,
                performed_by=current_user.get("username"),
                **update_data
            )
        
        if not termination:
            raise HTTPException(status_code=404, detail="Termination not found")
        
        # Get employee information
        employee = get_employee(termination.employee_id)
        employee_response = None
        if employee:
            from schemas import EmployeeResponse
            employee_response = EmployeeResponse(
                id=employee.id,
                first_name=employee.first_name,
                last_name=employee.last_name,
                other_name=employee.other_name,
                full_name=employee.full_name,
                email=employee.email,
                phone=employee.phone,
                street=employee.street,
                city=employee.city,
                province=employee.province,
                postal_code=employee.postal_code,
                dob=employee.dob.isoformat() if employee.dob else None,
                sin=employee.sin,
                drivers_license=employee.drivers_license,
                hire_date=employee.hire_date.isoformat() if employee.hire_date else None,
                probation_end_date=employee.probation_end_date.isoformat() if employee.probation_end_date else None,
                seniority_start_date=employee.seniority_start_date.isoformat() if employee.seniority_start_date else None,
                status=employee.status,
                remarks=employee.remarks,
                paystub=employee.paystub,
                union_member=employee.union_member,
                use_mailing_address=employee.use_mailing_address,
                mailing_street=employee.mailing_street,
                mailing_city=employee.mailing_city,
                mailing_province=employee.mailing_province,
                mailing_postal_code=employee.mailing_postal_code,
                emergency_contact_name=employee.emergency_contact_name,
                emergency_contact_phone=employee.emergency_contact_phone,
                company_id=None,
                company_short_form=None,
                created_at=employee.created_at.isoformat() if employee.created_at else None,
                updated_at=employee.updated_at.isoformat() if employee.updated_at else None
            )
        
        return TerminationResponse(
            id=termination.id,
            employee_id=termination.employee_id,
            last_working_date=termination.last_working_date,
            termination_effective_date=termination.termination_effective_date,
            roe_reason_code=termination.roe_reason_code,
            other_reason=termination.other_reason,
            internal_reason=termination.internal_reason,
            remarks=termination.remarks,
            created_at=termination.created_at,
            created_by=termination.created_by,
            employee=employee_response
        )
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating termination: {str(e)}")


@router.delete("/{termination_id}")
async def delete_termination_endpoint(
    termination_id: int,
    current_user: dict = Depends(require_permission("termination:delete"))
):
    """Delete a termination record and restore employee status"""
    try:
        success = delete_termination(
            termination_id=termination_id,
            performed_by=current_user.get("username")
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Termination not found")
        
        return {"message": "Termination deleted successfully and employee status restored"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting termination: {str(e)}")

