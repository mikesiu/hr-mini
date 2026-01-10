"""
Salary History Repository - Data access layer for salary history management
"""

from typing import List, Optional, Dict, Any
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_

from models.base import SessionLocal
from models.salary_history import SalaryHistory
from models.employment import Employment
from models.employee import Employee
from models.company import Company
from services.audit_service import log_action
from utils.serialization import model_to_dict


def validate_salary_date_against_employment(employee_id: str, effective_date: date) -> bool:
    """
    Validate that a salary effective date falls within the employee's employment period.
    Uses seniority_start_date first, then hire_date as reference.
    """
    with SessionLocal() as session:
        employee = session.get(Employee, employee_id)
        if not employee:
            return False
        
        # Get reference date (seniority_start_date first, then hire_date)
        reference_date = None
        if employee.seniority_start_date:
            reference_date = employee.seniority_start_date
        elif employee.hire_date:
            reference_date = employee.hire_date
        
        # If no reference date, allow the salary record
        if not reference_date:
            return True
        
        # Check if effective_date is not before reference date
        return effective_date >= reference_date


def create_salary_record(
    employee_id: str,
    pay_rate: float,
    pay_type: str,
    effective_date: date,
    end_date: Optional[date] = None,
    notes: Optional[str] = None,
    performed_by: Optional[str] = None
) -> SalaryHistory:
    """Create a new salary history record."""
    
    # Validate effective date against employment period
    if not validate_salary_date_against_employment(employee_id, effective_date):
        employee = None
        with SessionLocal() as session:
            employee = session.get(Employee, employee_id)
        
        reference_date = None
        reference_type = None
        if employee and employee.seniority_start_date:
            reference_date = employee.seniority_start_date
            reference_type = "seniority start date"
        elif employee and employee.hire_date:
            reference_date = employee.hire_date
            reference_type = "hire date"
        
        if reference_date:
            raise ValueError(f"Salary effective date cannot be before the employee's {reference_type} ({reference_date.strftime('%Y-%m-%d')})")
        else:
            raise ValueError("Employee has no valid reference date for salary validation")
    
    with SessionLocal() as session:
        # End any current salary record for this employee
        if not end_date:
            current_salary = session.query(SalaryHistory).filter(
                and_(
                    SalaryHistory.employee_id == employee_id,
                    SalaryHistory.end_date.is_(None)
                )
            ).first()
            
            if current_salary:
                current_salary.end_date = effective_date
        
        # Create new salary record
        salary_record = SalaryHistory(
            employee_id=employee_id,
            pay_rate=pay_rate,
            pay_type=pay_type,
            effective_date=effective_date,
            end_date=end_date,
            notes=notes
        )
        
        session.add(salary_record)
        session.commit()
        session.refresh(salary_record)
        
        # Log the action
        log_action(
            entity="salary_history",
            entity_id=salary_record.id,
            action="create",
            changed_by=performed_by,
            after=model_to_dict(salary_record),
        )
        
        return salary_record


def get_salary_history_by_employee(employee_id: str) -> List[SalaryHistory]:
    """Get salary history for a specific employee."""
    
    with SessionLocal() as session:
        return session.query(SalaryHistory).filter(
            SalaryHistory.employee_id == employee_id
        ).order_by(SalaryHistory.effective_date.desc()).all()


def get_current_salary(employee_id: str) -> Optional[SalaryHistory]:
    """Get the current salary for an employee."""
    
    with SessionLocal() as session:
        return session.query(SalaryHistory).filter(
            and_(
                SalaryHistory.employee_id == employee_id,
                SalaryHistory.end_date.is_(None)
            )
        ).first()


def get_salary_history_with_details(employee_id: str) -> List[Dict[str, Any]]:
    """Get complete salary history for an employee with employment and company details."""
    
    with SessionLocal() as session:
        results = session.query(
            SalaryHistory,
            Employee
        ).join(
            Employee, SalaryHistory.employee_id == Employee.id
        ).filter(
            Employee.id == employee_id
        ).order_by(
            SalaryHistory.effective_date.desc()
        ).all()
        
        return [
            {
                'salary': salary,
                'employee': employee
            }
            for salary, employee in results
        ]


def update_salary_record(
    salary_id: int,
    pay_rate: Optional[float] = None,
    pay_type: Optional[str] = None,
    effective_date: Optional[date] = None,
    end_date: Optional[date] = None,
    notes: Optional[str] = None,
    performed_by: Optional[str] = None
) -> Optional[SalaryHistory]:
    """Update an existing salary record."""
    
    with SessionLocal() as session:
        salary_record = session.get(SalaryHistory, salary_id)
        if not salary_record:
            return None
        
        # Validate effective date if it's being changed
        if effective_date is not None:
            if not validate_salary_date_against_employment(salary_record.employee_id, effective_date):
                employee = session.get(Employee, salary_record.employee_id)
                reference_date = None
                reference_type = None
                if employee and employee.seniority_start_date:
                    reference_date = employee.seniority_start_date
                    reference_type = "seniority start date"
                elif employee and employee.hire_date:
                    reference_date = employee.hire_date
                    reference_type = "hire date"
                
                if reference_date:
                    raise ValueError(f"Salary effective date cannot be before the employee's {reference_type} ({reference_date.strftime('%Y-%m-%d')})")
                else:
                    raise ValueError("Employee has no valid reference date for salary validation")
        
        # Get before state for audit
        before = model_to_dict(salary_record)
        
        # Update fields
        if pay_rate is not None:
            salary_record.pay_rate = pay_rate
        if pay_type is not None:
            salary_record.pay_type = pay_type
        if effective_date is not None:
            salary_record.effective_date = effective_date
        if end_date is not None:
            salary_record.end_date = end_date
        if notes is not None:
            salary_record.notes = notes
        
        session.commit()
        session.refresh(salary_record)
        
        # Log the action
        log_action(
            entity="salary_history",
            entity_id=salary_record.id,
            action="update",
            changed_by=performed_by,
            before=before,
            after=model_to_dict(salary_record),
        )
        
        return salary_record


def delete_salary_record(salary_id: int, performed_by: Optional[str] = None) -> bool:
    """Delete a salary record."""
    
    with SessionLocal() as session:
        salary_record = session.get(SalaryHistory, salary_id)
        if not salary_record:
            return False
        
        # Get before state for audit
        before = model_to_dict(salary_record)
        
        session.delete(salary_record)
        session.commit()
        
        # Log the action
        log_action(
            entity="salary_history",
            entity_id=salary_id,
            action="delete",
            changed_by=performed_by,
            before=before,
        )
        
        return True


def get_salary_progression_report(employee_id: str) -> List[Dict[str, Any]]:
    """Generate a detailed salary progression report for an employee."""
    
    with SessionLocal() as session:
        # Get all salary records for the employee
        salary_records = session.query(SalaryHistory).filter(
            SalaryHistory.employee_id == employee_id
        ).order_by(
            SalaryHistory.effective_date
        ).all()
        
        progression = []
        for salary in salary_records:
            progression.append({
                'pay_rate': float(salary.pay_rate),
                'pay_type': salary.pay_type,
                'effective_date': salary.effective_date,
                'end_date': salary.end_date,
                'notes': salary.notes,
                'created_at': salary.created_at
            })
        
        return progression


def search_salary_records(search_term: str = "") -> List[Dict[str, Any]]:
    """Search salary records across all employees."""
    
    with SessionLocal() as session:
        if not search_term:
            results = session.query(
                SalaryHistory,
                Employee
            ).join(
                Employee, SalaryHistory.employee_id == Employee.id
            ).order_by(
                SalaryHistory.effective_date.desc()
            ).all()
        else:
            like = f"%{search_term}%"
            results = session.query(
                SalaryHistory,
                Employee
            ).join(
                Employee, SalaryHistory.employee_id == Employee.id
            ).filter(
                (Employee.first_name.ilike(like))
                | (Employee.last_name.ilike(like))
                | (Employee.full_name.ilike(like))
                | (Employee.id.ilike(like))
            ).order_by(
                SalaryHistory.effective_date.desc()
            ).all()
        
        return [
            {
                'salary': salary,
                'employee': employee
            }
            for salary, employee in results
        ]


def get_employees_with_salary_data() -> List[Employee]:
    """Get all employees who have salary history records."""
    
    with SessionLocal() as session:
        return session.query(Employee).join(
            SalaryHistory, Employee.id == SalaryHistory.employee_id
        ).distinct().all()


def migrate_existing_pay_data() -> int:
    """Migrate existing pay_rate and pay_type data from employment table to salary_history table."""
    
    with SessionLocal() as session:
        # Get all employment records with pay data
        employments = session.query(Employment).filter(
            Employment.pay_rate.isnot(None)
        ).all()
        
        migrated_count = 0
        
        for employment in employments:
            # Create salary history record
            salary_record = SalaryHistory(
                employee_id=employment.employee_id,
                pay_rate=employment.pay_rate,
                pay_type=employment.pay_type or 'Hourly',
                effective_date=employment.start_date or date.today(),
                end_date=employment.end_date,
                notes=f"Migrated from employment record"
            )
            
            session.add(salary_record)
            migrated_count += 1
        
        session.commit()
        
        return migrated_count