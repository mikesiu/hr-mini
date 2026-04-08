"""
Work Schedule Repository
Handles CRUD operations for work schedules.
"""
from __future__ import annotations
from datetime import time
from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.exc import IntegrityError
from models.base import SessionLocal
from models.work_schedule import WorkSchedule
from services.audit_service import log_action
from utils.serialization import model_to_dict


def create_work_schedule(
    company_id: str,
    name: str,
    *,
    mon_start: Optional[time] = None,
    mon_end: Optional[time] = None,
    tue_start: Optional[time] = None,
    tue_end: Optional[time] = None,
    wed_start: Optional[time] = None,
    wed_end: Optional[time] = None,
    thu_start: Optional[time] = None,
    thu_end: Optional[time] = None,
    fri_start: Optional[time] = None,
    fri_end: Optional[time] = None,
    sat_start: Optional[time] = None,
    sat_end: Optional[time] = None,
    sun_start: Optional[time] = None,
    sun_end: Optional[time] = None,
    is_active: bool = True,
    performed_by: str | None = None,
) -> WorkSchedule:
    """Create a new work schedule"""
    from datetime import time as dt_time
    
    with SessionLocal() as session:
        # Check for duplicate schedule name within the same company
        existing = session.execute(
            select(WorkSchedule).where(
                and_(
                    WorkSchedule.company_id == company_id,
                    WorkSchedule.name == name.strip()
                )
            )
        ).scalar_one_or_none()
        
        if existing:
            raise ValueError(f"Schedule name '{name}' already exists for this company. Please use a different name.")
        
        schedule = WorkSchedule(
            company_id=company_id,
            name=name.strip(),
            mon_start=mon_start,
            mon_end=mon_end,
            tue_start=tue_start,
            tue_end=tue_end,
            wed_start=wed_start,
            wed_end=wed_end,
            thu_start=thu_start,
            thu_end=thu_end,
            fri_start=fri_start,
            fri_end=fri_end,
            sat_start=sat_start,
            sat_end=sat_end,
            sun_start=sun_start,
            sun_end=sun_end,
            is_active=is_active,
        )
        session.add(schedule)
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            raise ValueError(f"Database error: {exc}") from exc
        session.refresh(schedule)
        
        log_action(
            entity="work_schedule",
            entity_id=schedule.id,
            action="create",
            changed_by=performed_by,
            after=model_to_dict(schedule),
        )
        return schedule


def get_work_schedule(schedule_id: int) -> Optional[WorkSchedule]:
    """Get a work schedule by ID"""
    with SessionLocal() as session:
        return session.get(WorkSchedule, schedule_id)


def list_work_schedules(company_id: Optional[str] = None, active_only: bool = False) -> List[WorkSchedule]:
    """List all work schedules, optionally filtered by company"""
    with SessionLocal() as session:
        stmt = select(WorkSchedule)
        if company_id:
            stmt = stmt.where(WorkSchedule.company_id == company_id)
        if active_only:
            stmt = stmt.where(WorkSchedule.is_active == True)
        stmt = stmt.order_by(WorkSchedule.name)
        return list(session.execute(stmt).scalars().all())


def update_work_schedule(
    schedule_id: int,
    *,
    name: Optional[str] = None,
    mon_start: Optional[time] = None,
    mon_end: Optional[time] = None,
    tue_start: Optional[time] = None,
    tue_end: Optional[time] = None,
    wed_start: Optional[time] = None,
    wed_end: Optional[time] = None,
    thu_start: Optional[time] = None,
    thu_end: Optional[time] = None,
    fri_start: Optional[time] = None,
    fri_end: Optional[time] = None,
    sat_start: Optional[time] = None,
    sat_end: Optional[time] = None,
    sun_start: Optional[time] = None,
    sun_end: Optional[time] = None,
    is_active: Optional[bool] = None,
    performed_by: str | None = None,
) -> Optional[WorkSchedule]:
    """Update a work schedule"""
    from datetime import time as dt_time
    
    with SessionLocal() as session:
        schedule = session.get(WorkSchedule, schedule_id)
        if not schedule:
            return None
        
        before = model_to_dict(schedule)
        
        if name is not None:
            name = name.strip()
            # Check for duplicate schedule name within the same company (excluding current schedule)
            existing = session.execute(
                select(WorkSchedule).where(
                    and_(
                        WorkSchedule.company_id == schedule.company_id,
                        WorkSchedule.name == name,
                        WorkSchedule.id != schedule_id
                    )
                )
            ).scalar_one_or_none()
            
            if existing:
                raise ValueError(f"Schedule name '{name}' already exists for this company. Please use a different name.")
            
            schedule.name = name
        if mon_start is not None:
            schedule.mon_start = mon_start
        if mon_end is not None:
            schedule.mon_end = mon_end
        if tue_start is not None:
            schedule.tue_start = tue_start
        if tue_end is not None:
            schedule.tue_end = tue_end
        if wed_start is not None:
            schedule.wed_start = wed_start
        if wed_end is not None:
            schedule.wed_end = wed_end
        if thu_start is not None:
            schedule.thu_start = thu_start
        if thu_end is not None:
            schedule.thu_end = thu_end
        if fri_start is not None:
            schedule.fri_start = fri_start
        if fri_end is not None:
            schedule.fri_end = fri_end
        if sat_start is not None:
            schedule.sat_start = sat_start
        if sat_end is not None:
            schedule.sat_end = sat_end
        if sun_start is not None:
            schedule.sun_start = sun_start
        if sun_end is not None:
            schedule.sun_end = sun_end
        if is_active is not None:
            schedule.is_active = is_active
        
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            raise ValueError(f"Database error: {exc}") from exc
        session.refresh(schedule)
        
        log_action(
            entity="work_schedule",
            entity_id=schedule.id,
            action="update",
            changed_by=performed_by,
            before=before,
            after=model_to_dict(schedule),
        )
        return schedule


def delete_work_schedule(schedule_id: int, *, performed_by: str | None = None) -> bool:
    """Delete a work schedule"""
    with SessionLocal() as session:
        schedule = session.get(WorkSchedule, schedule_id)
        if not schedule:
            return False
        
        before = model_to_dict(schedule)
        session.delete(schedule)
        
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            raise ValueError(f"Database error: {exc}") from exc
        
        log_action(
            entity="work_schedule",
            entity_id=schedule_id,
            action="delete",
            changed_by=performed_by,
            before=before,
        )
        return True


def get_schedules_by_company(company_id: str, active_only: bool = True) -> List[WorkSchedule]:
    """Get all schedules for a company"""
    return list_work_schedules(company_id=company_id, active_only=active_only)

