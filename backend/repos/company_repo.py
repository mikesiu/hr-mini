from __future__ import annotations
from typing import List, Optional

from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError

from models.base import SessionLocal
from models.company import Company
from services.audit_service import log_action
from utils.serialization import model_to_dict


def create_company(
    company_id: str,
    legal_name: str,
    trade_name: str | None = None,
    address_line1: str | None = None,
    address_line2: str | None = None,
    city: str | None = None,
    province: str | None = None,
    postal_code: str | None = None,
    country: str = "Canada",
    notes: str | None = None,
    payroll_due_start_date: str | None = None,
    pay_period_start_date: str | None = None,
    payroll_frequency: str | None = None,
    cra_due_dates: str | None = None,
    union_due_date: int | None = None,
    *,
    performed_by: str | None = None,
) -> Company:
    company_id = company_id.strip().upper()
    if not company_id:
        raise ValueError("Company ID is required")

    with SessionLocal() as session:
        company = Company(
            id=company_id,
            legal_name=legal_name.strip(),
            trade_name=trade_name.strip() if trade_name else None,
            address_line1=address_line1.strip() if address_line1 else None,
            address_line2=address_line2.strip() if address_line2 else None,
            city=city.strip() if city else None,
            province=province.strip() if province else None,
            postal_code=postal_code.strip() if postal_code else None,
            country=country.strip() if country else "Canada",
            notes=notes.strip() if notes else None,
            payroll_due_start_date=payroll_due_start_date,
            pay_period_start_date=pay_period_start_date,
            payroll_frequency=payroll_frequency.strip() if payroll_frequency else None,
            cra_due_dates=cra_due_dates.strip() if cra_due_dates else None,
            union_due_date=union_due_date,
        )
        session.add(company)
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            message = str(exc).lower()
            if "duplicate" in message or "unique" in message:
                raise ValueError(f"Company ID '{company_id}' already exists.") from exc
            raise ValueError(f"Database error: {exc}") from exc
        session.refresh(company)

        log_action(
            entity="company",
            entity_id=company.id,
            action="create",
            changed_by=performed_by,
            after=model_to_dict(company),
        )
        return company


def get_company_by_id(company_id: str) -> Optional[Company]:
    with SessionLocal() as session:
        return session.get(Company, company_id)


def get_all_companies() -> List[Company]:
    with SessionLocal() as session:
        return session.execute(
            select(Company).order_by(Company.legal_name)
        ).scalars().all()


def search_companies(search_term: str = "") -> List[Company]:
    with SessionLocal() as session:
        if not search_term:
            return get_all_companies()

        like = f"%{search_term}%"
        return session.execute(
            select(Company)
            .where(
                (Company.legal_name.ilike(like))
                | (Company.trade_name.ilike(like))
                | (Company.id.ilike(like))
            )
            .order_by(Company.legal_name)
        ).scalars().all()


def update_company(company_id: str, *, performed_by: str | None = None, **kwargs) -> Optional[Company]:
    with SessionLocal() as session:
        company = session.get(Company, company_id)
        if not company:
            return None

        before = model_to_dict(company)
        update_data = {k: v for k, v in kwargs.items() if v not in (None, "")}
        if not update_data:
            return company

        for key, value in update_data.items():
            setattr(company, key, value)

        session.commit()
        session.refresh(company)

        log_action(
            entity="company",
            entity_id=company.id,
            action="update",
            changed_by=performed_by,
            before=before,
            after=model_to_dict(company),
        )
        return company


def delete_company(company_id: str, *, performed_by: str | None = None) -> bool:
    with SessionLocal() as session:
        company = session.get(Company, company_id)
        if not company:
            return False

        before = model_to_dict(company)
        session.delete(company)
        session.commit()

        log_action(
            entity="company",
            entity_id=company.id,
            action="delete",
            changed_by=performed_by,
            before=before,
        )
        return True


def company_exists(company_id: str) -> bool:
    with SessionLocal() as session:
        stmt = select(func.count()).select_from(Company).where(Company.id == company_id)
        return session.execute(stmt).scalar_one() > 0
