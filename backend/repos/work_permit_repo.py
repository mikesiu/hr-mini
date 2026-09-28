from __future__ import annotations
from datetime import date, timedelta
from typing import List

from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from models.base import SessionLocal
from models.employee import Employee
from models.termination import Termination
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
        permit_id = work_permit.id
        # Re-load with employee for safe response serialization after session closes
        work_permit = session.execute(
            select(WorkPermit)
            .options(joinedload(WorkPermit.employee))
            .where(WorkPermit.id == permit_id)
        ).scalar_one()

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
        stmt = (
            select(WorkPermit)
            .options(joinedload(WorkPermit.employee))
            .where(WorkPermit.id == permit_id)
        )
        return session.execute(stmt).scalar_one_or_none()


def get_work_permits_by_employee(employee_id: str) -> List[WorkPermit]:
    with SessionLocal() as session:
        stmt = (
            select(WorkPermit)
            .options(joinedload(WorkPermit.employee))
            .where(WorkPermit.employee_id == employee_id)
            .order_by(WorkPermit.expiry_date.desc())
        )
        return session.execute(stmt).scalars().unique().all()


def get_current_work_permit(employee_id: str) -> WorkPermit | None:
    with SessionLocal() as session:
        stmt = (
            select(WorkPermit)
            .options(joinedload(WorkPermit.employee))
            .where(WorkPermit.employee_id == employee_id)
            .order_by(WorkPermit.expiry_date.desc())
            .limit(1)
        )
        return session.execute(stmt).scalars().unique().first()


def update_work_permit(permit_id: int, *, performed_by: str | None = None, **kwargs) -> WorkPermit | None:
    with SessionLocal() as session:
        work_permit = session.execute(
            select(WorkPermit)
            .options(joinedload(WorkPermit.employee))
            .where(WorkPermit.id == permit_id)
        ).scalar_one_or_none()
        if not work_permit:
            return None

        update_data = {k: v for k, v in kwargs.items() if v is not None and v != ""}
        if not update_data:
            return work_permit

        before = model_to_dict(work_permit)
        for key, value in update_data.items():
            setattr(work_permit, key, value)

        session.commit()
        # Re-load with employee so response serialization is safe after session closes
        work_permit = session.execute(
            select(WorkPermit)
            .options(joinedload(WorkPermit.employee))
            .where(WorkPermit.id == permit_id)
        ).scalar_one_or_none()

        log_action(
            entity="work_permit",
            entity_id=permit_id,
            action="update",
            changed_by=performed_by,
            before=before,
            after=model_to_dict(work_permit) if work_permit else None,
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
    """
    Work permits expiring on/before today+days_ahead.
    Excludes terminated staff (status Terminated, or effective termination on file).
    """
    with SessionLocal() as session:
        today = date.today()
        cutoff_date = today + timedelta(days=days_ahead)
        stmt = (
            select(WorkPermit)
            .join(Employee, Employee.id == WorkPermit.employee_id)
            .outerjoin(Termination, Termination.employee_id == Employee.id)
            .options(joinedload(WorkPermit.employee))
            .where(WorkPermit.expiry_date <= cutoff_date)
            .where(Employee.status != "Terminated")
            .where(
                or_(
                    Termination.id.is_(None),
                    Termination.termination_effective_date > today,
                )
            )
            .order_by(WorkPermit.expiry_date.asc())
        )
        return session.execute(stmt).scalars().unique().all()


def search_work_permits(
    employee_id: str | None = None,
    permit_type: str | None = None,
) -> List[WorkPermit]:
    with SessionLocal() as session:
        stmt = select(WorkPermit).options(joinedload(WorkPermit.employee))

        if employee_id:
            stmt = stmt.where(WorkPermit.employee_id == employee_id)

        if permit_type:
            stmt = stmt.where(WorkPermit.permit_type.ilike(f"%{permit_type}%"))

        stmt = stmt.order_by(WorkPermit.expiry_date.desc())
        return session.execute(stmt).scalars().unique().all()
