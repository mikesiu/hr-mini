from __future__ import annotations
from datetime import date, timedelta
from typing import List

from sqlalchemy import inspect, or_, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from models.base import SessionLocal, engine
from models.employee import Employee
from models.termination import Termination
from models.work_permit import WorkPermit
from services.audit_service import log_action
from utils.serialization import model_to_dict


_schema_ready = False


def ensure_work_permit_schema() -> None:
    """Add renewal columns on existing databases and close extra open permits."""
    global _schema_ready
    if _schema_ready:
        return

    inspector = inspect(engine)
    if "work_permits" not in inspector.get_table_names():
        _schema_ready = True
        return

    columns = {column["name"] for column in inspector.get_columns("work_permits")}
    with engine.begin() as conn:
        if "status" not in columns:
            conn.execute(text(
                "ALTER TABLE work_permits ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'"
            ))
        if "renewed_date" not in columns:
            conn.execute(text(
                "ALTER TABLE work_permits ADD COLUMN renewed_date DATE NULL"
            ))

    _close_duplicate_active_permits()
    _schema_ready = True


def _close_duplicate_active_permits() -> int:
    """Keep the latest permit active. Older open permits are closed as renewed."""
    today = date.today()
    closed = 0
    with SessionLocal() as session:
        permits = session.execute(
            select(WorkPermit).where(
                or_(WorkPermit.status == "active", WorkPermit.status.is_(None))
            )
        ).scalars().all()

        grouped: dict[str, list[WorkPermit]] = {}
        for permit in permits:
            grouped.setdefault(permit.employee_id, []).append(permit)

        audits: list[tuple[int, dict, dict]] = []
        for group in grouped.values():
            if len(group) == 1:
                if not group[0].status:
                    group[0].status = "active"
                continue

            keeper = max(group, key=lambda permit: permit.id or 0)
            for permit in group:
                if permit.id == keeper.id:
                    permit.status = "active"
                    continue
                before = model_to_dict(permit)
                permit.status = "renewed"
                if permit.renewed_date is None:
                    permit.renewed_date = today
                audits.append((permit.id, before, model_to_dict(permit)))
                closed += 1

        session.commit()

    for permit_id, before, after in audits:
        log_action(
            entity="work_permit",
            entity_id=permit_id,
            action="update",
            changed_by="system",
            before=before,
            after=after,
        )
    return closed


def create_work_permit(
    employee_id: str,
    permit_type: str,
    expiry_date: date,
    *,
    renewed_date: date | None = None,
    performed_by: str | None = None,
) -> WorkPermit:
    ensure_work_permit_schema()
    close_on = renewed_date or date.today()
    with SessionLocal() as session:
        previous = session.execute(
            select(WorkPermit).where(
                WorkPermit.employee_id == employee_id,
                or_(WorkPermit.status == "active", WorkPermit.status.is_(None)),
            )
        ).scalars().all()
        closed_audits: list[tuple[int, dict, dict]] = []
        for old in previous:
            before = model_to_dict(old)
            old.status = "renewed"
            old.renewed_date = close_on
            closed_audits.append((old.id, before, model_to_dict(old)))

        work_permit = WorkPermit(
            employee_id=employee_id,
            permit_type=permit_type,
            expiry_date=expiry_date,
            status="active",
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
        for closed_id, before, after in closed_audits:
            log_action(
                entity="work_permit",
                entity_id=closed_id,
                action="update",
                changed_by=performed_by,
                before=before,
                after=after,
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
            .where(or_(WorkPermit.status == "active", WorkPermit.status.is_(None)))
            .order_by(WorkPermit.id.desc())
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
            .where(or_(WorkPermit.status == "active", WorkPermit.status.is_(None)))
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
