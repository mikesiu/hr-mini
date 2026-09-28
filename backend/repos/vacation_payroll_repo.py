"""Repos for vacation dollar openings and payroll employee periods."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import select

from models.base import SessionLocal
from models.vacation_dollar_opening import VacationDollarOpening
from models.payroll_employee_period import PayrollEmployeePeriod


def get_opening(employee_id: str, company_id: str, year: int) -> Optional[VacationDollarOpening]:
    with SessionLocal() as session:
        return session.execute(
            select(VacationDollarOpening).where(
                VacationDollarOpening.employee_id == employee_id,
                VacationDollarOpening.company_id == company_id,
                VacationDollarOpening.year == year,
            )
        ).scalars().first()


def get_opening_amount(employee_id: str, company_id: str, year: int) -> Decimal:
    row = get_opening(employee_id, company_id, year)
    if not row:
        return Decimal("0")
    return Decimal(str(row.opening_amount))


def upsert_opening(
    employee_id: str,
    company_id: str,
    year: int,
    opening_amount: float | Decimal,
) -> VacationDollarOpening:
    with SessionLocal() as session:
        row = session.execute(
            select(VacationDollarOpening).where(
                VacationDollarOpening.employee_id == employee_id,
                VacationDollarOpening.company_id == company_id,
                VacationDollarOpening.year == year,
            )
        ).scalars().first()
        if row:
            row.opening_amount = opening_amount
        else:
            row = VacationDollarOpening(
                employee_id=employee_id,
                company_id=company_id,
                year=year,
                opening_amount=opening_amount,
            )
            session.add(row)
        session.commit()
        session.refresh(row)
        return row


def list_openings(
    company_id: Optional[str] = None,
    employee_id: Optional[str] = None,
    year: Optional[int] = None,
) -> List[VacationDollarOpening]:
    with SessionLocal() as session:
        stmt = select(VacationDollarOpening)
        if company_id:
            stmt = stmt.where(VacationDollarOpening.company_id == company_id)
        if employee_id:
            stmt = stmt.where(VacationDollarOpening.employee_id == employee_id)
        if year is not None:
            stmt = stmt.where(VacationDollarOpening.year == year)
        stmt = stmt.order_by(
            VacationDollarOpening.year.desc(),
            VacationDollarOpening.employee_id,
        )
        return list(session.execute(stmt).scalars().all())


def list_payroll_periods(
    company_id: str,
    year: int,
    employee_id: Optional[str] = None,
) -> List[PayrollEmployeePeriod]:
    start = date(year, 1, 1)
    end = date(year, 12, 31)
    with SessionLocal() as session:
        stmt = (
            select(PayrollEmployeePeriod)
            .where(PayrollEmployeePeriod.company_id == company_id)
            .where(PayrollEmployeePeriod.pay_date >= start)
            .where(PayrollEmployeePeriod.pay_date <= end)
        )
        if employee_id:
            stmt = stmt.where(PayrollEmployeePeriod.employee_id == employee_id)
        stmt = stmt.order_by(
            PayrollEmployeePeriod.employee_id,
            PayrollEmployeePeriod.pay_date,
            PayrollEmployeePeriod.cheque_no,
        )
        return list(session.execute(stmt).scalars().all())


def upsert_payroll_period(
    *,
    company_id: str,
    employee_id: str,
    pay_date: date,
    cheque_no: str,
    gross: float | Decimal,
    vacation_paid: float | Decimal,
    vacation_earned: float | Decimal,
    benefits: float | Decimal = 0,
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    source_filename: Optional[str] = None,
) -> PayrollEmployeePeriod:
    cheque_no = (cheque_no or "").strip()
    with SessionLocal() as session:
        row = session.execute(
            select(PayrollEmployeePeriod).where(
                PayrollEmployeePeriod.employee_id == employee_id,
                PayrollEmployeePeriod.company_id == company_id,
                PayrollEmployeePeriod.pay_date == pay_date,
                PayrollEmployeePeriod.cheque_no == cheque_no,
            )
        ).scalars().first()
        if row:
            row.gross = gross
            row.benefits = benefits
            row.vacation_paid = vacation_paid
            row.vacation_earned = vacation_earned
            row.period_start = period_start
            row.period_end = period_end
            if source_filename:
                row.source_filename = source_filename
        else:
            row = PayrollEmployeePeriod(
                company_id=company_id,
                employee_id=employee_id,
                pay_date=pay_date,
                cheque_no=cheque_no,
                gross=gross,
                benefits=benefits,
                vacation_paid=vacation_paid,
                vacation_earned=vacation_earned,
                period_start=period_start,
                period_end=period_end,
                source_filename=source_filename,
            )
            session.add(row)
        session.commit()
        session.refresh(row)
        return row
