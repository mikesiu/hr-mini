from __future__ import annotations
from datetime import date
from pathlib import Path
from typing import Any, Optional

from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError

from models.base import SessionLocal
from models.employee import Employee
from models.attendance import Attendance
from models.employment import Employment
from models.attendance_period_override import AttendancePeriodOverride
from models.employee_schedule import EmployeeSchedule
from models.leave import Leave
from models.termination import Termination
from models.salary_history import SalaryHistory
from models.work_permit import WorkPermit
from models.employee_document import EmployeeDocument
from models.expense_entitlement import ExpenseEntitlement
from models.expense_claim import ExpenseClaim
from services.audit_service import log_action
from utils.serialization import model_to_dict
from utils.employee_file_cleanup import safe_unlink_paths


def _collect_file_paths_for_employee(session, emp_id: str) -> list[str]:
    """Paths to clean after employee delete (DB CASCADE removes document/claim rows)."""
    out: list[str] = []
    for doc in session.execute(
        select(EmployeeDocument).where(EmployeeDocument.employee_id == emp_id)
    ).scalars().all():
        if doc.file_path:
            out.append(doc.file_path)
    for claim in session.execute(
        select(ExpenseClaim).where(ExpenseClaim.employee_id == emp_id)
    ).scalars().all():
        if claim.supporting_document_path:
            out.append(claim.supporting_document_path)
        if claim.document_path and claim.document_filename:
            out.append(str(Path(claim.document_path) / claim.document_filename))
    seen: set[str] = set()
    uniq: list[str] = []
    for p in out:
        if p not in seen:
            seen.add(p)
            uniq.append(p)
    return uniq


def count_employee_related_rows(session, emp_id: str) -> dict[str, int]:
    """Count rows still referencing this employee_id across known FK tables."""
    counts: dict[str, int] = {}
    pairs = [
        ("employees", select(func.count()).select_from(Employee).where(Employee.id == emp_id)),
        ("attendance", select(func.count()).select_from(Attendance).where(Attendance.employee_id == emp_id)),
        ("employment", select(func.count()).select_from(Employment).where(Employment.employee_id == emp_id)),
        ("attendance_period_overrides", select(func.count()).select_from(AttendancePeriodOverride).where(AttendancePeriodOverride.employee_id == emp_id)),
        ("employee_schedules", select(func.count()).select_from(EmployeeSchedule).where(EmployeeSchedule.employee_id == emp_id)),
        ("leave", select(func.count()).select_from(Leave).where(Leave.employee_id == emp_id)),
        ("terminations", select(func.count()).select_from(Termination).where(Termination.employee_id == emp_id)),
        ("salary_history", select(func.count()).select_from(SalaryHistory).where(SalaryHistory.employee_id == emp_id)),
        ("work_permits", select(func.count()).select_from(WorkPermit).where(WorkPermit.employee_id == emp_id)),
        ("employee_documents", select(func.count()).select_from(EmployeeDocument).where(EmployeeDocument.employee_id == emp_id)),
        ("expense_entitlements", select(func.count()).select_from(ExpenseEntitlement).where(ExpenseEntitlement.employee_id == emp_id)),
        ("expense_claims", select(func.count()).select_from(ExpenseClaim).where(ExpenseClaim.employee_id == emp_id)),
    ]
    for name, stmt in pairs:
        counts[name] = int(session.execute(stmt).scalar_one())
    return counts


def build_consistency_report(counts: dict[str, int]) -> dict[str, Any]:
    employee_row = counts.get("employees", 0)
    ref_total = sum(v for k, v in counts.items() if k != "employees")
    consistent = employee_row == 0 and ref_total == 0
    return {
        "consistent": consistent,
        "employee_row_count": employee_row,
        "related_row_total": ref_total,
        "by_table": counts,
    }


def search_employees(q: str = ""):
    with SessionLocal() as session:
        stmt = select(Employee)
        if q:
            like = f"%{q}%"
            stmt = stmt.where(
                (Employee.first_name.ilike(like))
                | (Employee.last_name.ilike(like))
                | (Employee.id.ilike(like))
            )
        return session.execute(stmt).scalars().all()


def list_employees_for_period(
    company_id: str,
    period_start: date,
    period_end: date,
    q: str = "",
):
    """
    List employees employed at company_id during [period_start, period_end],
    filtered by hire_date and termination last_working_date.
    """
    from sqlalchemy import or_, and_, exists, not_

    with SessionLocal() as session:
        # Employment overlaps the pay period at this company
        employment_overlap = exists(
            select(1).where(
                and_(
                    Employment.employee_id == Employee.id,
                    Employment.company_id == company_id,
                    Employment.start_date <= period_end,
                    or_(
                        Employment.end_date.is_(None),
                        Employment.end_date >= period_start,
                    ),
                )
            )
        )

        # Not terminated before the period starts
        terminated_before_period = exists(
            select(1).where(
                and_(
                    Termination.employee_id == Employee.id,
                    Termination.last_working_date < period_start,
                )
            )
        )

        stmt = (
            select(Employee)
            .where(employment_overlap)
            .where(or_(Employee.hire_date.is_(None), Employee.hire_date <= period_end))
            .where(not_(terminated_before_period))
        )

        if q:
            like = f"%{q}%"
            stmt = stmt.where(
                (Employee.first_name.ilike(like))
                | (Employee.last_name.ilike(like))
                | (Employee.id.ilike(like))
            )

        stmt = stmt.order_by(Employee.last_name, Employee.first_name)
        return session.execute(stmt).scalars().all()


def list_employee_ids_for_period(
    company_id: str,
    period_start: date,
    period_end: date,
) -> set[str]:
    """Employee IDs active at company during the period (hire / termination aware)."""
    return {emp.id for emp in list_employees_for_period(company_id, period_start, period_end)}


def filter_employee_ids_active_in_period(
    employee_ids: set[str] | list[str],
    period_start: date,
    period_end: date,
) -> set[str]:
    """
    Keep employees who were not hired after the period and not terminated before it.
    Does not require company employment (use list_employee_ids_for_period when company is known).
    """
    ids = {eid for eid in employee_ids if eid}
    if not ids:
        return set()

    with SessionLocal() as session:
        rows = session.execute(
            select(Employee.id, Employee.hire_date, Termination.last_working_date)
            .select_from(Employee)
            .outerjoin(Termination, Termination.employee_id == Employee.id)
            .where(Employee.id.in_(list(ids)))
        ).all()

        active: set[str] = set()
        for emp_id, hire_date, last_working_date in rows:
            if hire_date is not None and hire_date > period_end:
                continue
            if last_working_date is not None and last_working_date < period_start:
                continue
            active.add(emp_id)
        return active


def get_employee_active_bounds_map(
    employee_ids: set[str] | list[str],
) -> dict[str, tuple[Optional[date], Optional[date]]]:
    """
    Map employee_id -> (active_from, active_to) using hire_date and termination
    last_working_date. active_to is None when still employed.
    """
    ids = {eid for eid in employee_ids if eid}
    if not ids:
        return {}

    with SessionLocal() as session:
        rows = session.execute(
            select(Employee.id, Employee.hire_date, Termination.last_working_date)
            .select_from(Employee)
            .outerjoin(Termination, Termination.employee_id == Employee.id)
            .where(Employee.id.in_(list(ids)))
        ).all()
        return {
            emp_id: (hire_date, last_working_date)
            for emp_id, hire_date, last_working_date in rows
        }

def employee_exists(emp_id: str) -> bool:
    with SessionLocal() as session:
        stmt = select(func.count()).select_from(Employee).where(Employee.id == emp_id)
        return session.execute(stmt).scalar_one() > 0


def create_employee(
    emp_id: str,
    first_name: str,
    last_name: str,
    *,
    email: str | None = None,
    hire_date: date | None = None,
    probation_end_date: date | None = None,
    seniority_start_date: date | None = None,
    performed_by: str | None = None,
) -> Employee:
    emp_id = emp_id.strip()
    if not emp_id:
        raise ValueError("Employee ID is required")

    full_name = f"{first_name} {last_name}".strip()

    with SessionLocal() as session:
        employee = Employee(
            id=emp_id,
            full_name=full_name,
            first_name=first_name,
            last_name=last_name,
            email=email,
            hire_date=hire_date,
            probation_end_date=probation_end_date,
            seniority_start_date=seniority_start_date,
        )
        session.add(employee)
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            message = str(exc)
            if "UNIQUE" in message or "duplicate" in message.lower():
                raise ValueError(f"Employee ID '{emp_id}' already exists.") from exc
            raise ValueError(f"Database error: {message}") from exc
        session.refresh(employee)

        log_action(
            entity="employee",
            entity_id=employee.id,
            action="create",
            changed_by=performed_by,
            after=model_to_dict(employee),
        )
        return employee


def get_employee(emp_id: str) -> Optional[Employee]:
    with SessionLocal() as session:
        return session.get(Employee, emp_id)


def update_employee(emp_id: str, *, performed_by: str | None = None, **kwargs):
    with SessionLocal() as session:
        employee = session.get(Employee, emp_id)
        if not employee:
            return None

        # Fields that can be cleared (set to None)
        clearable_fields = {
            'other_name', 'email', 'phone', 'street', 'city', 'province', 'postal_code',
            'dob', 'sin', 'drivers_license', 'probation_end_date', 'seniority_start_date',
            'remarks', 'mailing_street', 'mailing_city', 'mailing_province', 'mailing_postal_code',
            'emergency_contact_name', 'emergency_contact_phone'
        }
        
        # Filter out None values for non-clearable fields, but keep None for clearable fields
        update_data = {}
        for k, v in kwargs.items():
            if v is not None or k in clearable_fields:
                update_data[k] = v
        if not update_data:
            return employee

        before = model_to_dict(employee)

        if "first_name" in update_data or "last_name" in update_data:
            first_name = update_data.get("first_name", employee.first_name or "")
            last_name = update_data.get("last_name", employee.last_name or "")
            update_data["full_name"] = f"{first_name} {last_name}".strip()

        for key, value in update_data.items():
            setattr(employee, key, value)

        session.commit()
        session.refresh(employee)

        log_action(
            entity="employee",
            entity_id=employee.id,
            action="update",
            changed_by=performed_by,
            before=before,
            after=model_to_dict(employee),
        )
        return employee


def delete_employee(emp_id: str, *, performed_by: str | None = None) -> tuple[bool, dict[str, Any] | None]:
    """
    Delete employee row. DB CASCADE should remove dependent rows.
    Returns (success, consistency_report_or_none). On integrity failure returns (False, error dict).
    """
    paths_to_clean: list[str] = []
    with SessionLocal() as session:
        employee = session.get(Employee, emp_id)
        if not employee:
            return False, None

        paths_to_clean = _collect_file_paths_for_employee(session, emp_id)
        before = model_to_dict(employee)
        session.delete(employee)
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            return False, {
                "consistent": False,
                "error": "integrity_error",
                "message": str(exc.orig) if getattr(exc, "orig", None) else str(exc),
            }

        log_action(
            entity="employee",
            entity_id=emp_id,
            action="delete",
            changed_by=performed_by,
            before=before,
        )

    safe_unlink_paths(paths_to_clean)

    # Fresh session so counts reflect committed state
    with SessionLocal() as session:
        counts = count_employee_related_rows(session, emp_id)
        report = build_consistency_report(counts)
        return True, report
