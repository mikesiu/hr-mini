from __future__ import annotations
from datetime import date
from typing import List, Optional

from sqlalchemy import select, and_, func

from models.base import SessionLocal
from models.leave import Leave
from models.leave_type import LeaveType
from services.audit_service import log_action
from utils.serialization import model_to_dict


def get_leave_type_by_code(code: str) -> Optional[LeaveType]:
    with SessionLocal() as session:
        return session.execute(
            select(LeaveType).where(LeaveType.code == code)
        ).scalar_one_or_none()


def list_leaves(employee_id: str, start_from: date | None = None) -> List[Leave]:
    with SessionLocal() as session:
        stmt = select(Leave).where(Leave.employee_id == employee_id)
        if start_from:
            stmt = stmt.where(Leave.start_date >= start_from)
        stmt = stmt.order_by(Leave.start_date.desc())
        return session.execute(stmt).scalars().all()


def sum_days(employee_id: str, leave_type_code: str, start_date: date, end_date: date) -> float:
    with SessionLocal() as session:
        lt = get_leave_type_by_code(leave_type_code)
        if not lt:
            return 0.0
        total = session.execute(
            select(func.coalesce(func.sum(Leave.days), 0.0))
            .where(
                and_(
                    Leave.employee_id == employee_id,
                    Leave.leave_type_id == lt.id,
                    Leave.status == "Active",
                    Leave.start_date <= end_date,
                    Leave.end_date >= start_date,
                )
            )
        ).scalar_one()
        return float(total or 0.0)


def overlaps(employee_id: str, start: date, end: date) -> bool:
    with SessionLocal() as session:
        exists = session.execute(
            select(func.count())
            .select_from(Leave)
            .where(
                and_(
                    Leave.employee_id == employee_id,
                    Leave.status != "Cancelled",
                    Leave.start_date <= end,
                    Leave.end_date >= start,
                )
            )
        ).scalar_one()
        return exists > 0


def create_leave(
    employee_id: str,
    leave_type_code: str,
    start: date,
    end: date,
    days: float,
    note: str | None,
    *,
    created_by: str | None = None,
    status: str = "Active",
    performed_by: str | None = None,
) -> Leave:
    with SessionLocal() as session:
        lt = get_leave_type_by_code(leave_type_code)
        if not lt:
            raise ValueError(f"Unknown leave type code '{leave_type_code}'")
        record = Leave(
            employee_id=employee_id,
            leave_type_id=lt.id,
            start_date=start,
            end_date=end,
            days=days,
            note=note or "",
            created_by=created_by or performed_by or "system",
            status=status,
        )
        session.add(record)
        session.commit()
        session.refresh(record)

        log_action(
            entity="leave",
            entity_id=record.id,
            action="create",
            changed_by=performed_by,
            after=model_to_dict(record),
        )
        return record


def list_leave_types() -> list[LeaveType]:
    with SessionLocal() as session:
        return session.execute(select(LeaveType).order_by(LeaveType.code)).scalars().all()


def update_leave(
    leave_id: int,
    *,
    leave_type_code: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    days: float | None = None,
    note: str | None = None,
    status: str | None = None,
    performed_by: str | None = None,
) -> Leave | None:
    with SessionLocal() as session:
        leave = session.get(Leave, leave_id)
        if not leave:
            return None

        before = model_to_dict(leave)

        if leave_type_code:
            lt = get_leave_type_by_code(leave_type_code)
            if not lt:
                raise ValueError(f"Unknown leave type code '{leave_type_code}'")
            leave.leave_type_id = lt.id
        if start_date is not None:
            leave.start_date = start_date
        if end_date is not None:
            leave.end_date = end_date
        if days is not None:
            leave.days = days
        if note is not None:
            leave.note = note
        if status is not None:
            leave.status = status

        session.commit()
        session.refresh(leave)

        log_action(
            entity="leave",
            entity_id=leave.id,
            action="update",
            changed_by=performed_by,
            before=before,
            after=model_to_dict(leave),
        )
        return leave


def delete_leave(leave_id: int, *, performed_by: str | None = None) -> bool:
    with SessionLocal() as session:
        leave = session.get(Leave, leave_id)
        if not leave:
            return False

        before = model_to_dict(leave)
        session.delete(leave)
        session.commit()

        log_action(
            entity="leave",
            entity_id=leave_id,
            action="delete",
            changed_by=performed_by,
            before=before,
        )
        return True


def get_leave_for_date(employee_id: str, check_date: date) -> Optional[Leave]:
    """Get leave record that covers a specific date"""
    with SessionLocal() as session:
        return session.execute(
            select(Leave)
            .where(
                and_(
                    Leave.employee_id == employee_id,
                    Leave.status == "Active",
                    Leave.start_date <= check_date,
                    Leave.end_date >= check_date,
                )
            )
        ).scalar_one_or_none()


def get_leaves_in_range(employee_id: str, start_date: date, end_date: date) -> List[Leave]:
    """Get all leave records that overlap with a date range"""
    with SessionLocal() as session:
        return list(session.execute(
            select(Leave)
            .where(
                and_(
                    Leave.employee_id == employee_id,
                    Leave.status == "Active",
                    Leave.start_date <= end_date,
                    Leave.end_date >= start_date,
                )
            )
            .order_by(Leave.start_date)
        ).scalars().all())