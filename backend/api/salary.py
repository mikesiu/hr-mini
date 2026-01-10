from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from api.dependencies import get_current_user, require_permission
from schemas import (
    SalaryHistoryCreate, 
    SalaryHistoryUpdate, 
    SalaryHistoryResponse,
    SalaryProgressionResponse
)
from repos.salary_history_repo import (
    create_salary_record,
    get_salary_history_by_employee,
    get_current_salary,
    get_salary_history_with_details,
    update_salary_record,
    delete_salary_record,
    get_salary_progression_report,
    search_salary_records
)
from repos.employee_repo import get_employee

router = APIRouter()

@router.get("/history", response_model=List[SalaryHistoryResponse])
async def list_salary_history(
    employee_id: Optional[str] = Query(None, description="Filter by employee ID"),
    search: Optional[str] = Query(None, description="Search term for employee name or ID"),
    current_user: dict = Depends(require_permission("salary_history:view"))
):
    """Get salary history records"""
    try:
        if employee_id:
            # Get salary history for specific employee
            salary_records = get_salary_history_by_employee(employee_id)
            employee = get_employee(employee_id)
            
            return [
                SalaryHistoryResponse(
                    id=record.id,
                    employee_id=record.employee_id,
                    pay_rate=float(record.pay_rate),
                    pay_type=record.pay_type,
                    effective_date=record.effective_date,
                    end_date=record.end_date,
                    notes=record.notes,
                    created_at=record.created_at,
                    updated_at=record.updated_at,
                    employee=employee
                )
                for record in salary_records
            ]
        elif search:
            # Search across all salary records
            results = search_salary_records(search)
            return [
                SalaryHistoryResponse(
                    id=record['salary'].id,
                    employee_id=record['salary'].employee_id,
                    pay_rate=float(record['salary'].pay_rate),
                    pay_type=record['salary'].pay_type,
                    effective_date=record['salary'].effective_date,
                    end_date=record['salary'].end_date,
                    notes=record['salary'].notes,
                    created_at=record['salary'].created_at,
                    updated_at=record['salary'].updated_at,
                    employee=record['employee']
                )
                for record in results
            ]
        else:
            # Get all salary records
            results = search_salary_records("")
            return [
                SalaryHistoryResponse(
                    id=record['salary'].id,
                    employee_id=record['salary'].employee_id,
                    pay_rate=float(record['salary'].pay_rate),
                    pay_type=record['salary'].pay_type,
                    effective_date=record['salary'].effective_date,
                    end_date=record['salary'].end_date,
                    notes=record['salary'].notes,
                    created_at=record['salary'].created_at,
                    updated_at=record['salary'].updated_at,
                    employee=record['employee']
                )
                for record in results
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching salary history: {str(e)}")

@router.get("/history/{salary_id}", response_model=SalaryHistoryResponse)
async def get_salary_record(
    salary_id: int,
    current_user: dict = Depends(require_permission("salary_history:view"))
):
    """Get a specific salary record by ID"""
    try:
        from models.base import SessionLocal
        from models.salary_history import SalaryHistory
        from models.employee import Employee
        
        with SessionLocal() as session:
            salary_record = session.get(SalaryHistory, salary_id)
            if not salary_record:
                raise HTTPException(status_code=404, detail="Salary record not found")
            
            employee = session.get(Employee, salary_record.employee_id)
            
            return SalaryHistoryResponse(
                id=salary_record.id,
                employee_id=salary_record.employee_id,
                pay_rate=float(salary_record.pay_rate),
                pay_type=salary_record.pay_type,
                effective_date=salary_record.effective_date,
                end_date=salary_record.end_date,
                notes=salary_record.notes,
                created_at=salary_record.created_at,
                updated_at=salary_record.updated_at,
                employee=employee
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching salary record: {str(e)}")

@router.post("/history", response_model=SalaryHistoryResponse)
async def create_salary_record_endpoint(
    salary_data: SalaryHistoryCreate,
    current_user: dict = Depends(require_permission("salary_history:create"))
):
    """Create a new salary record"""
    try:
        salary_record = create_salary_record(
            employee_id=salary_data.employee_id,
            pay_rate=salary_data.pay_rate,
            pay_type=salary_data.pay_type,
            effective_date=salary_data.effective_date,
            end_date=salary_data.end_date,
            notes=salary_data.notes,
            performed_by=current_user.get('username')
        )
        
        employee = get_employee(salary_record.employee_id)
        
        return SalaryHistoryResponse(
            id=salary_record.id,
            employee_id=salary_record.employee_id,
            pay_rate=float(salary_record.pay_rate),
            pay_type=salary_record.pay_type,
            effective_date=salary_record.effective_date,
            end_date=salary_record.end_date,
            notes=salary_record.notes,
            created_at=salary_record.created_at,
            updated_at=salary_record.updated_at,
            employee=employee
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating salary record: {str(e)}")

@router.put("/history/{salary_id}", response_model=SalaryHistoryResponse)
async def update_salary_record_endpoint(
    salary_id: int,
    salary_data: SalaryHistoryUpdate,
    current_user: dict = Depends(require_permission("salary_history:update"))
):
    """Update an existing salary record"""
    try:
        # Prepare update data, excluding None values
        update_data = {}
        for field, value in salary_data.dict().items():
            if value is not None:
                update_data[field] = value
        
        if not update_data:
            # No fields to update, return current record
            from models.base import SessionLocal
            from models.salary_history import SalaryHistory
            from models.employee import Employee
            
            with SessionLocal() as session:
                salary_record = session.get(SalaryHistory, salary_id)
                if not salary_record:
                    raise HTTPException(status_code=404, detail="Salary record not found")
                
                employee = session.get(Employee, salary_record.employee_id)
                
                return SalaryHistoryResponse(
                    id=salary_record.id,
                    employee_id=salary_record.employee_id,
                    pay_rate=float(salary_record.pay_rate),
                    pay_type=salary_record.pay_type,
                    effective_date=salary_record.effective_date,
                    end_date=salary_record.end_date,
                    notes=salary_record.notes,
                    created_at=salary_record.created_at,
                    updated_at=salary_record.updated_at,
                    employee=employee
                )
        else:
            salary_record = update_salary_record(
                salary_id=salary_id,
                performed_by=current_user.get('username'),
                **update_data
            )
            
            if not salary_record:
                raise HTTPException(status_code=404, detail="Salary record not found")
            
            employee = get_employee(salary_record.employee_id)
            
            return SalaryHistoryResponse(
                id=salary_record.id,
                employee_id=salary_record.employee_id,
                pay_rate=float(salary_record.pay_rate),
                pay_type=salary_record.pay_type,
                effective_date=salary_record.effective_date,
                end_date=salary_record.end_date,
                notes=salary_record.notes,
                created_at=salary_record.created_at,
                updated_at=salary_record.updated_at,
                employee=employee
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating salary record: {str(e)}")

@router.delete("/history/{salary_id}")
async def delete_salary_record_endpoint(
    salary_id: int,
    current_user: dict = Depends(require_permission("salary_history:delete"))
):
    """Delete a salary record"""
    try:
        success = delete_salary_record(
            salary_id=salary_id,
            performed_by=current_user.get('username')
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Salary record not found")
        
        return {"message": "Salary record deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting salary record: {str(e)}")

@router.get("/current/{employee_id}", response_model=SalaryHistoryResponse)
async def get_current_salary_endpoint(
    employee_id: str,
    current_user: dict = Depends(require_permission("salary_history:view"))
):
    """Get current salary for an employee"""
    try:
        salary_record = get_current_salary(employee_id)
        if not salary_record:
            raise HTTPException(status_code=404, detail="No current salary found for employee")
        
        employee = get_employee(employee_id)
        
        return SalaryHistoryResponse(
            id=salary_record.id,
            employee_id=salary_record.employee_id,
            pay_rate=float(salary_record.pay_rate),
            pay_type=salary_record.pay_type,
            effective_date=salary_record.effective_date,
            end_date=salary_record.end_date,
            notes=salary_record.notes,
            created_at=salary_record.created_at,
            updated_at=salary_record.updated_at,
            employee=employee
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching current salary: {str(e)}")

@router.get("/progression/{employee_id}", response_model=List[SalaryProgressionResponse])
async def get_salary_progression(
    employee_id: str,
    current_user: dict = Depends(require_permission("salary_history:view"))
):
    """Get salary progression report for an employee"""
    try:
        progression = get_salary_progression_report(employee_id)
        return [
            SalaryProgressionResponse(
                pay_rate=record['pay_rate'],
                pay_type=record['pay_type'],
                effective_date=record['effective_date'],
                end_date=record['end_date'],
                notes=record['notes'],
                created_at=record['created_at']
            )
            for record in progression
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching salary progression: {str(e)}")
