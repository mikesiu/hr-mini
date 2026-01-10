from __future__ import annotations
from datetime import date
from typing import List, Optional

from sqlalchemy import select, desc
from sqlalchemy.exc import IntegrityError

from models.base import SessionLocal
from models.employment import Employment
from models.employee import Employee
from models.company import Company
from services.audit_service import log_action
from utils.serialization import model_to_dict


def create_employment(
    employee_id: str,
    company_id: str,
    *,
    position: str | None = None,
    department: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    notes: str | None = None,
    wage_classification: str | None = None,
    count_all_ot: bool | None = None,
    performed_by: str | None = None,
) -> Employment:
    with SessionLocal() as session:
        employment = Employment(
            employee_id=employee_id,
            company_id=company_id,
            position=position,
            department=department,
            start_date=start_date,
            end_date=end_date,
            notes=notes,
            wage_classification=wage_classification,
            count_all_ot=count_all_ot if count_all_ot is not None else False,
        )
        session.add(employment)
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            if "FOREIGN KEY" in str(exc).upper():
                raise ValueError("Invalid employee_id or company_id") from exc
            raise ValueError(f"Database error: {exc}") from exc
        session.refresh(employment)

        log_action(
            entity="employment",
            entity_id=employment.id,
            action="create",
            changed_by=performed_by,
            after=model_to_dict(employment),
        )
        return employment


def get_employment_by_id(employment_id: int) -> Optional[Employment]:
    with SessionLocal() as session:
        return session.get(Employment, employment_id)


def get_employment_history(employee_id: str) -> List[Employment]:
    with SessionLocal() as session:
        return (
            session.execute(
                select(Employment)
                .where(Employment.employee_id == employee_id)
                .order_by(desc(Employment.start_date))
            )
            .scalars()
            .all()
        )


def get_current_employment(employee_id: str, as_of_date: Optional[date] = None) -> Optional[Employment]:
    """Get current employment as of a specific date (or today if not provided)"""
    from datetime import date as date_type
    if as_of_date is None:
        as_of_date = date_type.today()
    
    with SessionLocal() as session:
        return (
            session.execute(
                select(Employment)
                .where(Employment.employee_id == employee_id)
                .where(Employment.start_date <= as_of_date)
                .where(
                    (Employment.end_date.is_(None)) | (Employment.end_date >= as_of_date)
                )
                .order_by(desc(Employment.start_date))
                .limit(1)
            )
        ).scalar_one_or_none()


def update_employment(employment_id: int, *, performed_by: str | None = None, **kwargs) -> Optional[Employment]:
    with SessionLocal() as session:
        employment = session.get(Employment, employment_id)
        if not employment:
            return None

        # Filter out None and empty strings, but keep boolean False values
        # Boolean fields that can be explicitly set to False
        boolean_fields = {'is_driver', 'count_all_ot', 'is_active'}
        update_data = {}
        for k, v in kwargs.items():
            if k in boolean_fields:
                # Explicitly include boolean fields even if False (but not if None)
                if isinstance(v, bool):
                    update_data[k] = v
            elif v is not None and v != "":
                update_data[k] = v
        
        if not update_data:
            return employment

        before = model_to_dict(employment)
        for key, value in update_data.items():
            setattr(employment, key, value)

        session.commit()
        session.refresh(employment)

        log_action(
            entity="employment",
            entity_id=employment.id,
            action="update",
            changed_by=performed_by,
            before=before,
            after=model_to_dict(employment),
        )
        return employment


def delete_employment(employment_id: int, *, performed_by: str | None = None) -> bool:
    with SessionLocal() as session:
        employment = session.get(Employment, employment_id)
        if not employment:
            return False

        before = model_to_dict(employment)
        session.delete(employment)
        session.commit()

        log_action(
            entity="employment",
            entity_id=employment_id,
            action="delete",
            changed_by=performed_by,
            before=before,
        )
        return True


def get_employment_with_details(employment_id: int) -> Optional[dict]:
    with SessionLocal() as session:
        result = session.execute(
            select(Employment, Employee, Company)
            .join(Employee, Employment.employee_id == Employee.id)
            .join(Company, Employment.company_id == Company.id)
            .where(Employment.id == employment_id)
        ).first()

        if result:
            employment, employee, company = result
            return {
                "employment": employment,
                "employee": employee,
                "company": company,
            }
        return None


def get_employment_history_with_details(employee_id: str) -> List[dict]:
    with SessionLocal() as session:
        results = session.execute(
            select(Employment, Employee, Company)
            .join(Employee, Employment.employee_id == Employee.id)
            .join(Company, Employment.company_id == Company.id)
            .where(Employment.employee_id == employee_id)
            .order_by(desc(Employment.start_date))
        ).all()

        return [
            {
                "employment": employment,
                "employee": employee,
                "company": company,
            }
            for employment, employee, company in results
        ]


def search_employments(search_term: str = "") -> List[dict]:
    with SessionLocal() as session:
        if not search_term:
            results = session.execute(
                select(Employment, Employee, Company)
                .join(Employee, Employment.employee_id == Employee.id)
                .join(Company, Employment.company_id == Company.id)
                .order_by(desc(Employment.start_date))
            ).all()
        else:
            like = f"%{search_term}%"
            results = session.execute(
                select(Employment, Employee, Company)
                .join(Employee, Employment.employee_id == Employee.id)
                .join(Company, Employment.company_id == Company.id)
                .where(
                    (Employee.first_name.ilike(like))
                    | (Employee.last_name.ilike(like))
                    | (Employee.full_name.ilike(like))
                    | (Company.legal_name.ilike(like))
                    | (Company.trade_name.ilike(like))
                    | (Employment.position.ilike(like))
                    | (Employment.department.ilike(like))
                )
                .order_by(desc(Employment.start_date))
            ).all()

        return [
            {
                "employment": employment,
                "employee": employee,
                "company": company,
            }
            for employment, employee, company in results
        ]


def get_all_companies() -> List[Company]:
    with SessionLocal() as session:
        return session.execute(select(Company).order_by(Company.legal_name)).scalars().all()


def get_company_by_id(company_id: str) -> Optional[Company]:
    with SessionLocal() as session:
        return session.get(Company, company_id)


def end_current_employment(employee_id: str, end_date: date, *, performed_by: str | None = None) -> bool:
    with SessionLocal() as session:
        employment = session.execute(
            select(Employment)
            .where(Employment.employee_id == employee_id)
            .where(Employment.end_date.is_(None))
            .order_by(desc(Employment.start_date))
            .limit(1)
        ).scalar_one_or_none()
        if not employment:
            return False

        before = model_to_dict(employment)
        employment.end_date = end_date
        session.commit()
        session.refresh(employment)

        log_action(
            entity="employment",
            entity_id=employment.id,
            action="update",
            changed_by=performed_by,
            before=before,
            after=model_to_dict(employment),
        )
        return True
