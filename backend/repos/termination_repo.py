from __future__ import annotations
from datetime import date
from typing import Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from models.base import SessionLocal
from models.termination import Termination
from models.employee import Employee
from services.audit_service import log_action
from utils.serialization import model_to_dict


def create_termination(
    employee_id: str,
    last_working_date: date,
    termination_effective_date: date,
    roe_reason_code: str,
    *,
    other_reason: str | None = None,
    internal_reason: str | None = None,
    remarks: str | None = None,
    created_by: str | None = None,
    performed_by: str | None = None,
) -> Termination:
    """Create a new termination record and update employee status to Terminated"""
    
    with SessionLocal() as session:
        # First, update the employee status to Terminated
        employee = session.get(Employee, employee_id)
        if not employee:
            raise ValueError(f"Employee with ID '{employee_id}' not found")
        
        if employee.status == "Terminated":
            raise ValueError(f"Employee {employee_id} is already terminated")
        
        # Create termination record
        termination = Termination(
            employee_id=employee_id,
            last_working_date=last_working_date,
            termination_effective_date=termination_effective_date,
            roe_reason_code=roe_reason_code,
            other_reason=other_reason,
            internal_reason=internal_reason,
            remarks=remarks,
            created_by=created_by,
        )
        
        session.add(termination)
        
        # Update employee status
        employee.status = "Terminated"
        
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            raise ValueError(f"Database error: {exc}") from exc
        
        session.refresh(termination)
        
        # Log the termination action
        log_action(
            entity="termination",
            entity_id=termination.id,
            action="create",
            changed_by=performed_by,
            after=model_to_dict(termination),
        )
        
        # Log the employee status change
        previous_status = employee.status
        log_action(
            entity="employee",
            entity_id=employee_id,
            action="update",
            changed_by=performed_by,
            before={"status": previous_status},
            after={"status": "Terminated"},
        )
        
        return termination


def get_termination_by_employee_id(employee_id: str) -> Optional[Termination]:
    """Get termination record for a specific employee"""
    with SessionLocal() as session:
        return session.execute(
            select(Termination).where(Termination.employee_id == employee_id)
        ).scalar_one_or_none()


def get_termination_by_id(termination_id: int) -> Optional[Termination]:
    """Get termination record by ID"""
    with SessionLocal() as session:
        return session.get(Termination, termination_id)


def update_termination(
    termination_id: int, 
    *, 
    performed_by: str | None = None, 
    **kwargs
) -> Optional[Termination]:
    """Update termination record"""
    with SessionLocal() as session:
        termination = session.get(Termination, termination_id)
        if not termination:
            return None

        update_data = {k: v for k, v in kwargs.items() if v is not None}
        if not update_data:
            return termination

        before = model_to_dict(termination)
        for key, value in update_data.items():
            setattr(termination, key, value)

        session.commit()
        session.refresh(termination)

        log_action(
            entity="termination",
            entity_id=termination.id,
            action="update",
            changed_by=performed_by,
            before=before,
            after=model_to_dict(termination),
        )
        return termination


def delete_termination(termination_id: int, *, performed_by: str | None = None) -> bool:
    """Delete termination record and restore employee status"""
    with SessionLocal() as session:
        termination = session.get(Termination, termination_id)
        if not termination:
            return False

        employee_id = termination.employee_id
        before = model_to_dict(termination)
        
        # Delete termination record
        session.delete(termination)
        
        # Restore employee status to Active
        employee = session.get(Employee, employee_id)
        if employee:
            employee.status = "Active"
        
        session.commit()

        log_action(
            entity="termination",
            entity_id=termination_id,
            action="delete",
            changed_by=performed_by,
            before=before,
        )
        
        # Log employee status restoration
        log_action(
            entity="employee",
            entity_id=employee_id,
            action="update",
            changed_by=performed_by,
            before={"status": "Terminated"},
            after={"status": "Active"},
        )
        
        return True


def get_all_terminations() -> list[Termination]:
    """Get all termination records with employee details"""
    with SessionLocal() as session:
        return session.execute(
            select(Termination)
            .join(Employee, Termination.employee_id == Employee.id)
            .order_by(Termination.termination_effective_date.desc())
        ).scalars().all()
