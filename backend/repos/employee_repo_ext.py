from sqlalchemy import select
from models.base import SessionLocal
from models.employee import Employee
from models.employment import Employment
from typing import List, Tuple, Optional
from datetime import date

def list_active_employees() -> List[Employee]:
    with SessionLocal() as s:
        return s.execute(
            select(Employee).where(Employee.status.in_(["Active", "Probation"])).order_by(Employee.id)
        ).scalars().all()

def get_employee(emp_id: str) -> Optional[Employee]:
    with SessionLocal() as s:
        return s.get(Employee, emp_id)

def get_employee_hire_date(employee_id: str) -> Optional[date]:
    """Get the most recent hire date for an employee from their employment records."""
    with SessionLocal() as s:
        # Get the most recent employment record (highest start_date)
        result = s.execute(
            select(Employment.start_date)
            .where(Employment.employee_id == employee_id)
            .where(Employment.start_date.isnot(None))
            .order_by(Employment.start_date.desc())
            .limit(1)
        ).scalar_one_or_none()
        return result

def is_employee_eligible_for_sick_leave(employee_id: str, as_of: date) -> bool:
    """Check if employee has been employed for at least 90 days."""
    employee = get_employee(employee_id)
    if not employee:
        return False
    
    # Use seniority_start_date if available, otherwise hire_date for sick leave eligibility
    employment_date = employee.seniority_start_date if hasattr(employee, 'seniority_start_date') and employee.seniority_start_date else employee.hire_date
    if not employment_date:
        return False
    
    return (as_of - employment_date).days >= 90
