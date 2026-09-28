"""
Vacation percent resolution from company years-of-service tiers.
Separate schedules for union vs non-union employees (employee.union_member).
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import List, Optional, Sequence, Tuple

from sqlalchemy import select, delete

from models.base import SessionLocal
from models.vacation_percent_tier import VacationPercentTier
from models.company import Company
from models.employee import Employee
from models.employment import Employment


# BC ESA default: 4% for first 5 years, 6% after 5 consecutive years
# max_years is exclusive: [min, max)
BC_ESA_DEFAULT_TIERS: List[Tuple[float, Optional[float], float]] = [
    (0.0, 5.0, 4.0),
    (5.0, None, 6.0),
]

# Typical collective-agreement schedule (max exclusive)
# 0–<5 → 4%, 5–<11 → 6%, 11–<21 → 8%, 21+ → 10%
CA_DEFAULT_TIERS: List[Tuple[float, Optional[float], float]] = [
    (0.0, 5.0, 4.0),
    (5.0, 11.0, 6.0),
    (11.0, 21.0, 8.0),
    (21.0, None, 10.0),
]


def years_of_service(seniority_or_hire: Optional[date], as_of: Optional[date] = None) -> float:
    if not seniority_or_hire:
        return 0.0
    as_of = as_of or date.today()
    if as_of < seniority_or_hire:
        return 0.0
    return (as_of - seniority_or_hire).days / 365.25


def resolve_vacation_percent_from_tiers(
    tiers: Sequence[VacationPercentTier] | Sequence[dict],
    years: float,
) -> Optional[Decimal]:
    """
    Pick percent for years of service.
    Tier match: min_years <= years < max_years (max_years None = open-ended).

    If years fall in a gap between tiers, use the nearest lower tier
    (highest min_years that is still <= years), never jump to a higher tier.
    """
    if not tiers:
        return None

    normalized = []
    for t in tiers:
        if isinstance(t, dict):
            mn = float(t["min_years"])
            mx = float(t["max_years"]) if t.get("max_years") is not None else None
            pct = Decimal(str(t["percent"]))
        else:
            mn = float(t.min_years)
            mx = float(t.max_years) if t.max_years is not None else None
            pct = Decimal(str(t.percent))
        normalized.append((mn, mx, pct))

    normalized.sort(key=lambda x: x[0])
    for mn, mx, pct in normalized:
        if years >= mn and (mx is None or years < mx):
            return pct

    # Gap or beyond closed tiers: nearest lower band (do not use a higher tier)
    lower = [t for t in normalized if t[0] <= years]
    if lower:
        return lower[-1][2]
    # Before first tier
    return normalized[0][2]


def get_company_tiers(
    company_id: str,
    union_member: Optional[bool] = None,
) -> List[VacationPercentTier]:
    with SessionLocal() as session:
        stmt = select(VacationPercentTier).where(VacationPercentTier.company_id == company_id)
        if union_member is not None:
            stmt = stmt.where(VacationPercentTier.union_member == bool(union_member))
        rows = session.execute(
            stmt.order_by(VacationPercentTier.union_member, VacationPercentTier.min_years)
        ).scalars().all()
        return list(rows)


def list_tiers_as_dicts(
    company_id: str,
    union_member: Optional[bool] = None,
) -> List[dict]:
    tiers = get_company_tiers(company_id, union_member=union_member)
    return [
        {
            "id": t.id,
            "company_id": t.company_id,
            "union_member": bool(t.union_member),
            "min_years": float(t.min_years),
            "max_years": float(t.max_years) if t.max_years is not None else None,
            "percent": float(t.percent),
        }
        for t in tiers
    ]


def replace_company_tiers(
    company_id: str,
    tiers: List[dict],
) -> List[dict]:
    """
    Replace all tiers for a company.
    Each tier: min_years, max_years?, percent, union_member (bool, default False).
    """
    with SessionLocal() as session:
        company = session.get(Company, company_id)
        if not company:
            raise ValueError(f"Company '{company_id}' not found")

        session.execute(
            delete(VacationPercentTier).where(VacationPercentTier.company_id == company_id)
        )
        for t in tiers:
            session.add(
                VacationPercentTier(
                    company_id=company_id,
                    union_member=bool(t.get("union_member", False)),
                    min_years=t["min_years"],
                    max_years=t.get("max_years"),
                    percent=t["percent"],
                )
            )
        session.commit()

    return list_tiers_as_dicts(company_id)


def _tiers_for_both_groups(
    schedule: List[Tuple[float, Optional[float], float]],
) -> List[dict]:
    out: List[dict] = []
    for union in (False, True):
        for mn, mx, pct in schedule:
            out.append(
                {
                    "min_years": mn,
                    "max_years": mx,
                    "percent": pct,
                    "union_member": union,
                }
            )
    return out


def apply_bc_esa_default_tiers(company_id: str) -> List[dict]:
    return replace_company_tiers(company_id, _tiers_for_both_groups(BC_ESA_DEFAULT_TIERS))


def apply_ca_default_tiers(company_id: str) -> List[dict]:
    return replace_company_tiers(company_id, _tiers_for_both_groups(CA_DEFAULT_TIERS))


def resolve_vacation_percent(
    company_id: str,
    years: float,
    union_member: bool = False,
) -> Optional[Decimal]:
    tiers = get_company_tiers(company_id, union_member=bool(union_member))
    if not tiers:
        # Implicit BC ESA if no tiers configured for this union/non-union schedule
        tiers = [
            {"min_years": mn, "max_years": mx, "percent": pct}
            for mn, mx, pct in BC_ESA_DEFAULT_TIERS
        ]
        return resolve_vacation_percent_from_tiers(tiers, years)
    return resolve_vacation_percent_from_tiers(tiers, years)


def employee_service_start(employee: Employee) -> Optional[date]:
    return employee.seniority_start_date or employee.hire_date


def compute_employee_vacation_percent(
    employee: Employee,
    company_id: Optional[str],
    as_of: Optional[date] = None,
) -> Optional[Decimal]:
    if employee.vacation_percent_override and employee.vacation_percent is not None:
        return Decimal(str(employee.vacation_percent))
    if not company_id:
        return None
    start = employee_service_start(employee)
    yos = years_of_service(start, as_of)
    return resolve_vacation_percent(
        company_id, yos, union_member=bool(getattr(employee, "union_member", False))
    )


def sync_employee_vacation_percent(
    employee_id: str,
    company_id: Optional[str] = None,
    as_of: Optional[date] = None,
    *,
    force: bool = False,
) -> Optional[Decimal]:
    """
    Update employee.vacation_percent from company tiers unless override is set.
    Uses union vs non-union schedule based on employee.union_member.
    If company_id omitted, uses active employment company.
    """
    with SessionLocal() as session:
        employee = session.get(Employee, employee_id)
        if not employee:
            raise ValueError(f"Employee '{employee_id}' not found")

        if employee.vacation_percent_override and not force:
            return Decimal(str(employee.vacation_percent)) if employee.vacation_percent is not None else None

        if not company_id:
            emp_row = session.execute(
                select(Employment)
                .where(Employment.employee_id == employee_id)
                .where((Employment.end_date.is_(None)) | (Employment.end_date >= (as_of or date.today())))
                .order_by(Employment.start_date.desc())
            ).scalars().first()
            company_id = emp_row.company_id if emp_row else None

        pct = None
        if company_id:
            start = employee.seniority_start_date or employee.hire_date
            yos = years_of_service(start, as_of)
            pct = resolve_vacation_percent(
                company_id, yos, union_member=bool(employee.union_member)
            )

        employee.vacation_percent = pct
        session.commit()
        return pct


def sync_company_employees_vacation_percent(company_id: str, as_of: Optional[date] = None) -> int:
    """Recompute vacation % for all non-override employees with employment at company."""
    with SessionLocal() as session:
        emp_ids = session.execute(
            select(Employment.employee_id)
            .where(Employment.company_id == company_id)
            .distinct()
        ).scalars().all()

    updated = 0
    for eid in emp_ids:
        with SessionLocal() as session:
            employee = session.get(Employee, eid)
            if not employee or employee.vacation_percent_override:
                continue
            start = employee.seniority_start_date or employee.hire_date
            yos = years_of_service(start, as_of)
            pct = resolve_vacation_percent(
                company_id, yos, union_member=bool(employee.union_member)
            )
            employee.vacation_percent = pct
            session.commit()
            updated += 1
    return updated


def to_hourly_rate(pay_rate: float, pay_type: str) -> float:
    """Convert salary history rate to an hourly equivalent for sick pay."""
    pay_type_norm = (pay_type or "Hourly").strip().lower()
    rate = float(pay_rate)
    if pay_type_norm == "hourly":
        return rate
    if pay_type_norm == "monthly":
        return rate / (52 * 40 / 12)  # ~173.33
    if pay_type_norm in ("annual", "yearly"):
        return rate / 2080.0
    return rate
