from __future__ import annotations
from datetime import date, timedelta
from typing import List

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from models.base import SessionLocal
from models.work_permit import WorkPermit
from services.audit_service import log_action
from utils.serialization import model_to_dict


def create_work_permit(
    employee_id: str,
    permit_type: str,
    expiry_date: date,
    *,
    performed_by: str | None = None,
) -> WorkPermit:
    with SessionLocal() as session:
        work_permit = WorkPermit(
            employee_id=employee_id,
            permit_type=permit_type,
            expiry_date=expiry_date,
        )
        session.add(work_permit)
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            raise ValueError(f"Database error: {exc}") from exc
        session.refresh(work_permit)

        log_action(
            entity="work_permit",
            entity_id=work_permit.id,
            action="create",
            changed_by=performed_by,
            after=model_to_dict(work_permit),
        )
        return work_permit


def get_work_permit_by_id(permit_id: int) -> WorkPermit | None:
    with SessionLocal() as session:
        stmt = select(WorkPermit).where(WorkPermit.id == permit_id)
        return session.execute(stmt).scalar_one_or_none()


def get_work_permits_by_employee(employee_id: str) -> List[WorkPermit]:
    with SessionLocal() as session:
        stmt = (
            select(WorkPermit)
            .where(WorkPermit.employee_id == employee_id)
            .order_by(WorkPermit.expiry_date.desc())
        )
        return session.execute(stmt).scalars().all()


def get_current_work_permit(employee_id: str) -> WorkPermit | None:
    with SessionLocal() as session:
        stmt = (
            select(WorkPermit)
            .where(WorkPermit.employee_id == employee_id)
            .order_by(WorkPermit.expiry_date.desc())
            .limit(1)
        )
        return session.execute(stmt).scalar_one_or_none()


def update_work_permit(permit_id: int, *, performed_by: str | None = None, **kwargs) -> WorkPermit | None:
    with SessionLocal() as session:
        work_permit = session.get(WorkPermit, permit_id)
        if not work_permit:
            return None

        update_data = {k: v for k, v in kwargs.items() if v is not None and v != ""}
        if not update_data:
            return work_permit

        before = model_to_dict(work_permit)
        for key, value in update_data.items():
            setattr(work_permit, key, value)

        session.commit()
        session.refresh(work_permit)

        log_action(
            entity="work_permit",
            entity_id=work_permit.id,
            action="update",
            changed_by=performed_by,
            before=before,
            after=model_to_dict(work_permit),
        )
        return work_permit


def delete_work_permit(permit_id: int, *, performed_by: str | None = None) -> bool:
    with SessionLocal() as session:
        work_permit = session.get(WorkPermit, permit_id)
        if not work_permit:
            return False

        before = model_to_dict(work_permit)
        session.delete(work_permit)
        session.commit()

        log_action(
            entity="work_permit",
            entity_id=permit_id,
            action="delete",
            changed_by=performed_by,
            before=before,
        )
        return True


def get_expiring_work_permits(days_ahead: int = 30) -> List[WorkPermit]:
    with SessionLocal() as session:
        cutoff_date = date.today() + timedelta(days=days_ahead)
        stmt = (
            select(WorkPermit)
            .where(WorkPermit.expiry_date <= cutoff_date)
            .order_by(WorkPermit.expiry_date.asc())
        )
        return session.execute(stmt).scalars().all()


def search_work_permits(
    employee_id: str | None = None,
    permit_type: str | None = None,
) -> List[WorkPermit]:
    with SessionLocal() as session:
        stmt = select(WorkPermit)

        if employee_id:
            stmt = stmt.where(WorkPermit.employee_id == employee_id)

        if permit_type:
            stmt = stmt.where(WorkPermit.permit_type.ilike(f"%{permit_type}%"))

        stmt = stmt.order_by(WorkPermit.expiry_date.desc())
        return session.execute(stmt).scalars().all()
