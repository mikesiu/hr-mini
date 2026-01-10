from __future__ import annotations
from datetime import date
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError

from models.base import SessionLocal
from models.employee import Employee
from services.audit_service import log_action
from utils.serialization import model_to_dict


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


def delete_employee(emp_id: str, *, performed_by: str | None = None) -> bool:
    with SessionLocal() as session:
        employee = session.get(Employee, emp_id)
        if not employee:
            return False

        before = model_to_dict(employee)
        session.delete(employee)
        session.commit()

        log_action(
            entity="employee",
            entity_id=emp_id,
            action="delete",
            changed_by=performed_by,
            before=before,
        )
        return True
