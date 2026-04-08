from __future__ import annotations
from datetime import date
from typing import List, Optional
from sqlalchemy import select, and_
from models.base import SessionLocal
from models.holiday import Holiday
from utils.serialization import model_to_dict
from services.audit_service import log_action


def list_holidays(company_id: str, year: int | None = None, active_only: bool = True) -> List[Holiday]:
    """Get all holidays for a company, optionally filtered by year"""
    with SessionLocal() as session:
        stmt = select(Holiday).where(Holiday.company_id == company_id)
        if active_only:
            stmt = stmt.where(Holiday.is_active == True)
        if year:
            stmt = stmt.where(
                Holiday.holiday_date >= date(year, 1, 1),
                Holiday.holiday_date <= date(year, 12, 31)
            )
        stmt = stmt.order_by(Holiday.holiday_date)
        return list(session.execute(stmt).scalars().all())


def get_holiday(holiday_id: int) -> Optional[Holiday]:
    """Get a holiday by ID"""
    with SessionLocal() as session:
        return session.get(Holiday, holiday_id)


def create_holiday(
    company_id: str,
    holiday_date: date,
    name: str,
    is_active: bool = True,
    union_only: bool = False,
    *,
    performed_by: str | None = None,
) -> Holiday:
    """Create a new holiday"""
    with SessionLocal() as session:
        # Check for duplicate
        existing = session.execute(
            select(Holiday).where(
                Holiday.company_id == company_id,
                Holiday.holiday_date == holiday_date
            )
        ).scalar_one_or_none()
        
        if existing:
            raise ValueError(f"Holiday already exists for {company_id} on {holiday_date}")
        
        holiday = Holiday(
            company_id=company_id,
            holiday_date=holiday_date,
            name=name,
            is_active=is_active,
            union_only=union_only,
        )
        session.add(holiday)
        session.commit()
        session.refresh(holiday)
        
        log_action(
            entity="holiday",
            entity_id=holiday.id,
            action="create",
            changed_by=performed_by,
            after=model_to_dict(holiday),
        )
        return holiday


def update_holiday(
    holiday_id: int,
    *,
    holiday_date: date | None = None,
    name: str | None = None,
    is_active: bool | None = None,
    union_only: bool | None = None,
    performed_by: str | None = None,
) -> Optional[Holiday]:
    """Update a holiday"""
    with SessionLocal() as session:
        holiday = session.get(Holiday, holiday_id)
        if not holiday:
            return None
        
        before = model_to_dict(holiday)
        
        if holiday_date is not None:
            holiday.holiday_date = holiday_date
        if name is not None:
            holiday.name = name
        if is_active is not None:
            holiday.is_active = is_active
        if union_only is not None:
            holiday.union_only = union_only
        
        session.commit()
        session.refresh(holiday)
        
        log_action(
            entity="holiday",
            entity_id=holiday.id,
            action="update",
            changed_by=performed_by,
            before=before,
            after=model_to_dict(holiday),
        )
        return holiday


def delete_holiday(holiday_id: int, *, performed_by: str | None = None) -> bool:
    """Delete a holiday"""
    with SessionLocal() as session:
        holiday = session.get(Holiday, holiday_id)
        if not holiday:
            return False
        
        before = model_to_dict(holiday)
        session.delete(holiday)
        session.commit()
        
        log_action(
            entity="holiday",
            entity_id=holiday_id,
            action="delete",
            changed_by=performed_by,
            before=before,
        )
        return True


def get_holidays_in_range(company_id: str, start_date: date, end_date: date, employee_id: str | None = None) -> List[date]:
    """
    Get list of holiday dates (as date objects) for a company within a date range.
    If employee_id is provided, filters out union-only holidays for non-union employees.
    """
    with SessionLocal() as session:
        holidays = session.execute(
            select(Holiday).where(
                and_(
                    Holiday.company_id == company_id,
                    Holiday.is_active == True,
                    Holiday.holiday_date >= start_date,
                    Holiday.holiday_date <= end_date
                )
            )
        ).scalars().all()
        
        # If employee_id is provided, filter union-only holidays based on employee's union membership
        if employee_id:
            from models.employee import Employee
            employee = session.get(Employee, employee_id)
            if employee:
                is_union_member = employee.union_member if hasattr(employee, 'union_member') else False
                # Filter out union-only holidays if employee is not a union member
                if not is_union_member:
                    holidays = [h for h in holidays if not h.union_only]
        
        return [h.holiday_date for h in holidays]


def copy_holidays(
    source_company_id: str,
    target_company_id: str,
    year: int,
    *,
    skip_duplicates: bool = True,
    performed_by: str | None = None,
) -> dict:
    """
    Copy holidays from source company to target company for a specific year.
    
    Args:
        source_company_id: Company to copy holidays from
        target_company_id: Company to copy holidays to
        year: Year to copy holidays for
        skip_duplicates: If True, skip holidays that already exist in target company
        performed_by: Username of person performing the action
    
    Returns:
        dict with counts of copied, skipped, and failed holidays
    """
    if source_company_id == target_company_id:
        raise ValueError("Source and target companies cannot be the same")
    
    start_date = date(year, 1, 1)
    end_date = date(year, 12, 31)
    
    with SessionLocal() as session:
        # Get source holidays
        source_holidays = session.execute(
            select(Holiday).where(
                and_(
                    Holiday.company_id == source_company_id,
                    Holiday.holiday_date >= start_date,
                    Holiday.holiday_date <= end_date
                )
            )
        ).scalars().all()
        
        # Get existing target holidays for duplicate checking
        existing_holidays = session.execute(
            select(Holiday).where(
                and_(
                    Holiday.company_id == target_company_id,
                    Holiday.holiday_date >= start_date,
                    Holiday.holiday_date <= end_date
                )
            )
        ).scalars().all()
        
        existing_dates = {h.holiday_date for h in existing_holidays}
        
        copied_count = 0
        skipped_count = 0
        failed_count = 0
        
        for source_holiday in source_holidays:
            # Skip if duplicate exists and skip_duplicates is True
            if skip_duplicates and source_holiday.holiday_date in existing_dates:
                skipped_count += 1
                continue
            
            try:
                # Create new holiday for target company
                new_holiday = Holiday(
                    company_id=target_company_id,
                    holiday_date=source_holiday.holiday_date,
                    name=source_holiday.name,
                    is_active=source_holiday.is_active,
                    union_only=source_holiday.union_only,
                )
                session.add(new_holiday)
                session.flush()  # Flush to get the ID
                
                log_action(
                    entity="holiday",
                    entity_id=new_holiday.id,
                    action="create",
                    changed_by=performed_by,
                    after=model_to_dict(new_holiday),
                )
                
                copied_count += 1
                existing_dates.add(source_holiday.holiday_date)  # Add to set to prevent duplicates within the same copy operation
            except Exception as e:
                session.rollback()
                failed_count += 1
                print(f"Error copying holiday {source_holiday.holiday_date}: {e}")
                # Continue with next holiday
        
        session.commit()
        
        return {
            "copied": copied_count,
            "skipped": skipped_count,
            "failed": failed_count,
            "total_source": len(source_holidays)
        }

