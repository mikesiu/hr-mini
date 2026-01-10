"""
Employee Schedule Repository
Handles assignment of work schedules to employees with date ranges.
"""
from __future__ import annotations
from datetime import date
from typing import List, Optional
from sqlalchemy import select, and_, or_
from sqlalchemy.exc import IntegrityError
from models.base import SessionLocal
from models.employee_schedule import EmployeeSchedule
from models.work_schedule import WorkSchedule
from services.audit_service import log_action
from utils.serialization import model_to_dict


def assign_schedule(
    employee_id: str,
    schedule_id: int,
    effective_date: date,
    *,
    end_date: Optional[date] = None,
    performed_by: str | None = None,
) -> EmployeeSchedule:
    """Assign a work schedule to an employee"""
    with SessionLocal() as session:
        # First, check if there's an exact duplicate (same employee_id and effective_date)
        exact_match = session.execute(
            select(EmployeeSchedule).where(
                and_(
                    EmployeeSchedule.employee_id == employee_id,
                    EmployeeSchedule.effective_date == effective_date
                )
            )
        ).scalar_one_or_none()
        
        if exact_match:
            # Update the existing record instead of creating a new one
            before = model_to_dict(exact_match)
            exact_match.schedule_id = schedule_id
            exact_match.end_date = end_date
            
            try:
                session.commit()
            except IntegrityError as exc:
                session.rollback()
                raise ValueError(f"Database error: {exc}") from exc
            session.refresh(exact_match)
            
            log_action(
                entity="employee_schedule",
                entity_id=exact_match.id,
                action="update",
                changed_by=performed_by,
                before=before,
                after=model_to_dict(exact_match),
            )
            return exact_match
        
        # Check if there's an overlapping schedule (different effective_date but overlapping dates)
        overlapping = session.execute(
            select(EmployeeSchedule).where(
                and_(
                    EmployeeSchedule.employee_id == employee_id,
                    EmployeeSchedule.effective_date != effective_date,  # Not the same date
                    EmployeeSchedule.effective_date <= (end_date or date.max),
                    or_(
                        EmployeeSchedule.end_date >= effective_date,
                        EmployeeSchedule.end_date.is_(None)
                    )
                )
            )
        ).scalar_one_or_none()
        
        if overlapping:
            # End the existing schedule before the new one starts
            if overlapping.end_date is None or overlapping.end_date >= effective_date:
                from datetime import timedelta
                overlapping.end_date = (effective_date - timedelta(days=1)) if effective_date > date(1900, 1, 1) else None
        
        employee_schedule = EmployeeSchedule(
            employee_id=employee_id,
            schedule_id=schedule_id,
            effective_date=effective_date,
            end_date=end_date,
        )
        session.add(employee_schedule)
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            raise ValueError(f"Database error: {exc}") from exc
        session.refresh(employee_schedule)
        
        log_action(
            entity="employee_schedule",
            entity_id=employee_schedule.id,
            action="create",
            changed_by=performed_by,
            after=model_to_dict(employee_schedule),
        )
        return employee_schedule


def get_current_schedule(employee_id: str, as_of_date: Optional[date] = None) -> Optional[WorkSchedule]:
    """Get the current work schedule for an employee"""
    if as_of_date is None:
        as_of_date = date.today()
    
    employee_schedule = get_schedule_for_date(employee_id, as_of_date)
    if employee_schedule:
        return employee_schedule.schedule
    return None


def get_schedule_for_date(employee_id: str, check_date: date) -> Optional[EmployeeSchedule]:
    """Get the work schedule assignment for an employee on a specific date"""
    from sqlalchemy.orm import joinedload
    with SessionLocal() as session:
        # Query with joinedload to eagerly load the schedule relationship
        # Match employment filtering logic: effective_date <= check_date AND (end_date >= check_date OR end_date IS NULL)
        result = session.execute(
            select(EmployeeSchedule)
            .options(joinedload(EmployeeSchedule.schedule))
            .where(
                and_(
                    EmployeeSchedule.employee_id == employee_id,
                    EmployeeSchedule.effective_date <= check_date,
                    or_(
                        EmployeeSchedule.end_date >= check_date,
                        EmployeeSchedule.end_date.is_(None)
                    )
                )
            )
            .order_by(EmployeeSchedule.effective_date.desc())
            .limit(1)
        ).unique().scalar_one_or_none()
        
        # Extract schedule_id as a simple value while session is still open
        if result:
            # Access attributes while in session to ensure they're loaded
            _ = result.id
            _ = result.employee_id
            _ = result.schedule_id  # This is a simple column, should be safe
            _ = result.effective_date
            _ = result.end_date
        
        return result


def list_employee_schedules(employee_id: str) -> List[EmployeeSchedule]:
    """List all schedule assignments for an employee"""
    with SessionLocal() as session:
        return list(session.execute(
            select(EmployeeSchedule)
            .where(EmployeeSchedule.employee_id == employee_id)
            .order_by(EmployeeSchedule.effective_date.desc())
        ).scalars().all())


def list_employees_by_schedule(schedule_id: int) -> List[EmployeeSchedule]:
    """List all employees assigned to a specific work schedule"""
    with SessionLocal() as session:
        return list(session.execute(
            select(EmployeeSchedule)
            .where(EmployeeSchedule.schedule_id == schedule_id)
            .order_by(EmployeeSchedule.effective_date.desc())
        ).scalars().all())


def update_employee_schedule(
    employee_schedule_id: int,
    *,
    schedule_id: Optional[int] = None,
    effective_date: Optional[date] = None,
    end_date: Optional[date] = None,
    performed_by: str | None = None,
) -> Optional[EmployeeSchedule]:
    """Update an employee schedule assignment"""
    with SessionLocal() as session:
        employee_schedule = session.get(EmployeeSchedule, employee_schedule_id)
        if not employee_schedule:
            return None
        
        before = model_to_dict(employee_schedule)
        
        if schedule_id is not None:
            employee_schedule.schedule_id = schedule_id
        if effective_date is not None:
            employee_schedule.effective_date = effective_date
        if end_date is not None:
            employee_schedule.end_date = end_date
        
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            raise ValueError(f"Database error: {exc}") from exc
        session.refresh(employee_schedule)
        
        log_action(
            entity="employee_schedule",
            entity_id=employee_schedule.id,
            action="update",
            changed_by=performed_by,
            before=before,
            after=model_to_dict(employee_schedule),
        )
        return employee_schedule


def remove_employee_schedule(employee_schedule_id: int, *, performed_by: str | None = None) -> bool:
    """Remove an employee schedule assignment"""
    with SessionLocal() as session:
        employee_schedule = session.get(EmployeeSchedule, employee_schedule_id)
        if not employee_schedule:
            return False
        
        before = model_to_dict(employee_schedule)
        session.delete(employee_schedule)
        
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            raise ValueError(f"Database error: {exc}") from exc
        
        log_action(
            entity="employee_schedule",
            entity_id=employee_schedule_id,
            action="delete",
            changed_by=performed_by,
            before=before,
        )
        return True

