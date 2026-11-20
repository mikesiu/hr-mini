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
        if "permit_number" not in columns:
            conn.execute(text(
                "ALTER TABLE work_permits ADD COLUMN permit_number VARCHAR(100) NULL"
            ))
        if "issue_date" not in columns:
            conn.execute(text(
                "ALTER TABLE work_permits ADD COLUMN issue_date DATE NULL"
            ))
        if "notes" not in columns:
            conn.execute(text(
                "ALTER TABLE work_permits ADD COLUMN notes TEXT NULL"
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
    permit_number: str | None = None,
    issue_date: date | None = None,
    notes: str | None = None,
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
            permit_number=permit_number or None,
            issue_date=issue_date,
            notes=notes or None,
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
        # Optional free-text fields can be cleared by sending an empty string
        for clearable in ("permit_number", "notes"):
            if kwargs.get(clearable) == "":
                update_data[clearable] = None
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


EXPIRING_SOON_DAYS = 60


def classify_permit(expiry_date: date, today: date | None = None) -> tuple[int, str]:
    """Return (days_remaining, status) where status is expired / expiring_soon / valid."""
    today = today or date.today()
    days = (expiry_date - today).days
    if days < 0:
        return days, "expired"
    if days <= EXPIRING_SOON_DAYS:
        return days, "expiring_soon"
    return days, "valid"


def list_current_work_permits(company_id: str | None = None, status: str | None = None) -> list[dict]:
    """
    One row per employee: their current (open) work permit joined with basic employee
    and company info. Terminated staff are excluded (same rule as get_expiring_work_permits).
    Optional filters: company_id (employee's current/latest employment) and permit status
    (valid / expiring_soon / expired).
    """
    # Imported here to avoid import cycles at module load
    from repos.employment_repo import get_current_employment, get_latest_employment
    from repos.company_repo import get_company_by_id

    ensure_work_permit_schema()
    today = date.today()
    with SessionLocal() as session:
        stmt = (
            select(WorkPermit)
            .join(Employee, Employee.id == WorkPermit.employee_id)
            .outerjoin(Termination, Termination.employee_id == Employee.id)
            .options(joinedload(WorkPermit.employee))
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
        permits = session.execute(stmt).scalars().unique().all()

    # One current permit per employee (the newest open record wins)
    latest: dict[str, WorkPermit] = {}
    for permit in permits:
        existing = latest.get(permit.employee_id)
        if existing is None or (permit.id or 0) > (existing.id or 0):
            latest[permit.employee_id] = permit

    company_cache: dict[str, str | None] = {}
    rows: list[dict] = []
    for permit in latest.values():
        employment = get_current_employment(permit.employee_id) or get_latest_employment(permit.employee_id)
        emp_company_id = employment.company_id if employment else None
        if company_id and emp_company_id != company_id:
            continue

        days_remaining, permit_status = classify_permit(permit.expiry_date, today)
        if status and permit_status != status:
            continue

        company_name = None
        if emp_company_id:
            if emp_company_id not in company_cache:
                company = get_company_by_id(emp_company_id)
                company_cache[emp_company_id] = (
                    (company.trade_name or company.legal_name) if company else None
                )
            company_name = company_cache[emp_company_id]

        employee = permit.employee
        rows.append({
            "id": permit.id,
            "employee_id": permit.employee_id,
            "employee_code": permit.employee_id,
            "full_name": employee.full_name if employee else permit.employee_id,
            "first_name": employee.first_name if employee else None,
            "last_name": employee.last_name if employee else None,
            "company_id": emp_company_id,
            "company_code": emp_company_id,
            "company_name": company_name,
            "permit_type": permit.permit_type,
            "permit_number": permit.permit_number,
            "issue_date": permit.issue_date,
            "expiry_date": permit.expiry_date,
            "status": permit.status or "active",
            "notes": permit.notes,
            "days_remaining": days_remaining,
            "permit_status": permit_status,
        })

    rows.sort(key=lambda r: (r["expiry_date"], r["full_name"] or ""))
    return rows
