from __future__ import annotations
from datetime import date, timedelta
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional, Tuple

from repos.leave_repo import sum_days, list_overlapping_leaves, leave_day_portion
from repos.employee_repo_ext import get_employee, is_employee_eligible_for_sick_leave
# MySQL-only configuration - no DB_PATH needed

# ---- Policy knobs (adjust as needed) ----
SICK_DAYS_PER_YEAR = 5.0  # BC ESA minimum

# Vacation day entitlement from company vacation pay %:
# 4% → 10 days, 6% → 15, 8% → 20, 10% → 25  (days = percent × 2.5)
VACATION_PERCENT_TO_DAYS = {
    4.0: 10.0,
    6.0: 15.0,
    8.0: 20.0,
    10.0: 25.0,
}

# Vacation must be taken within 12 months after it's earned
VACATION_USE_PERIOD_MONTHS = 12

HALF_DAY = 0.5
HALF_DAY_TOLERANCE = 0.01


@dataclass
class BalanceResult:
    ok: bool
    reason: str
    remaining: float


def _is_half_day(amount: float) -> bool:
    return abs(float(amount) - HALF_DAY) < HALF_DAY_TOLERANCE


def check_same_day_leave_conflict(
    employee_id: str,
    start: date,
    end: date,
    days: float,
    *,
    exclude_leave_id: int | None = None,
    pending_leaves: list[tuple[date, date, float]] | None = None,
) -> Optional[str]:
    """
    Enforce: at most one leave application per calendar day, except two
    half-day (0.5) applications on the same day are allowed.

    pending_leaves: optional in-memory applications (start, end, days) not yet saved
    (e.g. rows earlier in an Excel upload).

    Returns an error message if blocked, otherwise None.
    """
    if start > end:
        return "Start date cannot be after end date"
    if days is None or float(days) <= 0:
        return "Days must be greater than 0"

    existing = list_overlapping_leaves(
        employee_id, start, end, exclude_leave_id=exclude_leave_id
    )

    # Normalize DB leaves + pending into (portion_source_start, end, days) tuples
    sources: list[tuple[date, date, float, str]] = [
        (lv.start_date, lv.end_date, float(lv.days or 0), f"id={lv.id}")
        for lv in existing
    ]
    for p_start, p_end, p_days in pending_leaves or []:
        if p_end < start or p_start > end:
            continue
        sources.append((p_start, p_end, float(p_days), "pending upload row"))

    if not sources:
        return None

    day = start
    while day <= end:
        new_portion = leave_day_portion(start, end, float(days), day)
        if new_portion <= 0:
            day += timedelta(days=1)
            continue

        others: list[tuple[float, str]] = []
        for s, e, d, label in sources:
            portion = leave_day_portion(s, e, d, day)
            if portion > 0:
                others.append((portion, label))

        if not others:
            day += timedelta(days=1)
            continue

        if len(others) >= 2:
            return (
                f"Date {day.isoformat()} already has {len(others)} leave applications. "
                "Only two half-day (0.5) leaves are allowed on the same day."
            )

        existing_portion, existing_label = others[0]

        if _is_half_day(existing_portion) and _is_half_day(new_portion):
            day += timedelta(days=1)
            continue

        return (
            f"Date {day.isoformat()} already has leave ({existing_label}, "
            f"{existing_portion:g} day). "
            "A second leave on the same day is only allowed when both are half-day (0.5)."
        )

    return None


def calendar_year_window(as_of: date) -> Tuple[date, date]:
    start = date(as_of.year, 1, 1)
    end = date(as_of.year, 12, 31)
    return start, end


def vacation_days_from_percent(percent: float | Decimal | None) -> float:
    """
    Map vacation pay percent to annual vacation days.
    Known bands: 4→10, 6→15, 8→20, 10→25; otherwise percent × 2.5.
    """
    if percent is None:
        return 0.0
    pct = float(percent)
    if pct <= 0:
        return 0.0
    # Exact known keys (tolerate float noise)
    for key, days in VACATION_PERCENT_TO_DAYS.items():
        if abs(pct - key) < 0.05:
            return days
    return round(pct * 2.5, 2)


def _resolve_employee_company_id(employee_id: str, as_of: Optional[date] = None) -> Optional[str]:
    try:
        from models.base import SessionLocal
        from models.employment import Employment
        from sqlalchemy import select

        as_of = as_of or date.today()
        with SessionLocal() as session:
            emp_row = session.execute(
                select(Employment)
                .where(Employment.employee_id == employee_id)
                .where((Employment.end_date.is_(None)) | (Employment.end_date >= as_of))
                .order_by(Employment.start_date.desc())
            ).scalars().first()
            return emp_row.company_id if emp_row else None
    except Exception:
        return None


def calculate_vacation_entitlement(
    hire_date: date | None,
    as_of: date,
    *,
    employee_id: str | None = None,
    employee=None,
    company_id: str | None = None,
    vacation_percent: float | Decimal | None = None,
) -> float:
    """
    Vacation day entitlement from company vacation % (union/non-union YOS tiers
    or employee override). hire_date is kept for call-site compatibility / windows.
    """
    pct = vacation_percent
    if pct is None:
        emp = employee
        if emp is None and employee_id:
            emp = get_employee(employee_id)
        if emp is not None:
            from services.vacation_percent_service import compute_employee_vacation_percent

            co_id = company_id or _resolve_employee_company_id(emp.id, as_of)
            pct = compute_employee_vacation_percent(emp, co_id, as_of=as_of)

    return vacation_days_from_percent(pct)

def vacation_earned_window(hire_date: date, as_of: date) -> Tuple[date, date]:
    """Calculate the window when vacation can be taken based on when it was earned."""
    if not hire_date:
        return calendar_year_window(as_of)
    
    # Find the most recent anniversary
    current_year = as_of.year
    try:
        current_anniversary = hire_date.replace(year=current_year)
    except ValueError:
        # Handle Feb 29 leap year case
        current_anniversary = date(current_year, 2, 28)
    
    # If we haven't reached this year's anniversary yet, use last year's
    if as_of < current_anniversary:
        current_anniversary = current_anniversary.replace(year=current_year - 1)
    
    # Vacation earned at anniversary can be used for 12 months after
    vacation_earned_date = current_anniversary
    vacation_expiry_date = current_anniversary.replace(year=current_anniversary.year + 1)
    
    # The window is from when vacation was earned until it expires
    return vacation_earned_date, vacation_expiry_date

def anniversary_window(hire_date: date, as_of: date) -> Tuple[date, date]:
    """Return current anniversary year [start, end]. If hire_date unknown, fall back to calendar year."""
    if not hire_date:
        return calendar_year_window(as_of)
    # Compute anniversary start this year
    year = as_of.year
    try:
        anniv_this_year = hire_date.replace(year=year)
    except ValueError:
        # Feb 29 hire date on non-leap year -> use Feb 28
        if hire_date.month == 2 and hire_date.day == 29:
            anniv_this_year = date(year, 2, 28)
        else:
            anniv_this_year = hire_date.replace(year=year, day=min(hire_date.day, 28))
    if as_of >= anniv_this_year:
        start = anniv_this_year
        # next anniversary:
        try:
            end = hire_date.replace(year=year + 1) - timedelta(days=1)
        except ValueError:
            end = date(year + 1, 2, 28) - timedelta(days=1)
    else:
        # We are before this year's anniversary -> previous cycle
        try:
            prev = hire_date.replace(year=year - 1)
        except ValueError:
            prev = date(year - 1, 2, 28)
        start = prev
        end = anniv_this_year - timedelta(days=1)
    return start, end

def get_sick_remaining(employee_id: str, as_of: date) -> float:
    # Check if employee is eligible for sick leave (90+ days employed)
    if not is_employee_eligible_for_sick_leave(employee_id, as_of):
        return 0.0
    
    y0, y1 = calendar_year_window(as_of)
    taken = sum_days(employee_id, "SICK", y0, y1)
    remaining = max(0.0, SICK_DAYS_PER_YEAR - taken)
    return round(remaining, 2)

def get_vacation_remaining(
    employee_id: str,
    hire_date: date | None,
    as_of: date,
    company_id: str | None = None,
) -> float:
    """Calculate remaining vacation days from company vacation-% entitlement."""
    if not hire_date:
        return 0.0

    entitlement = calculate_vacation_entitlement(
        hire_date,
        as_of,
        employee_id=employee_id,
        company_id=company_id,
    )

    if entitlement == 0.0:
        return 0.0

    # Calculate the window when vacation can be taken
    a0, a1 = vacation_earned_window(hire_date, as_of)

    # Count vacation days taken in the current entitlement period
    taken = sum_days(employee_id, "VAC", a0, a1)

    remaining = max(0.0, entitlement - taken)
    return round(remaining, 2)


def vacation_balance_days_as_of(
    employee_id: str,
    hire_date: date | None,
    as_of: date,
    vac_leaves: list | None = None,
    *,
    employee=None,
    company_id: str | None = None,
    vacation_percent: float | Decimal | None = None,
) -> float:
    """
    Point-in-time vacation day balance (leave-dashboard style).

    entitlement(as_of) − VAC days overlapping the anniversary window that have
    already started by as_of. Future leaves do not reduce earlier periods.
    """
    if not hire_date:
        return 0.0

    entitlement = calculate_vacation_entitlement(
        hire_date,
        as_of,
        employee_id=employee_id,
        employee=employee,
        company_id=company_id,
        vacation_percent=vacation_percent,
    )
    if entitlement <= 0:
        return 0.0

    a0, a1 = vacation_earned_window(hire_date, as_of)
    taken = 0.0
    if vac_leaves is None:
        # sum_days has no as-of filter; fall back to full-window taken
        taken = sum_days(employee_id, "VAC", a0, a1)
    else:
        for lv in vac_leaves:
            if (getattr(lv, "status", None) or "Active") != "Active":
                continue
            start = getattr(lv, "start_date", None)
            end = getattr(lv, "end_date", None)
            if not start or not end:
                continue
            if start > as_of:
                continue
            if end < a0 or start > a1:
                continue
            # Dashboard: full leave days when overlapping the entitlement window
            taken += float(getattr(lv, "days", 0) or 0)

    return round(max(0.0, entitlement - taken), 2)

def can_approve_leave(employee_id: str, leave_type_code: str, start: date, end: date, days: float,
                      hire_date: date | None, as_of: date,
                      *, exclude_leave_id: int | None = None) -> BalanceResult:
    # 1) Same-day / overlap check — allow two half-days (0.5) on one day only
    conflict = check_same_day_leave_conflict(
        employee_id, start, end, days, exclude_leave_id=exclude_leave_id
    )
    if conflict:
        return BalanceResult(False, conflict, 0.0)

    # 2) Entitlement checks
    if leave_type_code.upper() == "SICK":
        # Check 90-day employment requirement
        if not is_employee_eligible_for_sick_leave(employee_id, as_of):
            return BalanceResult(False, "Employee must be employed for at least 90 days to be eligible for sick leave.", 0.0)
        
        rem = get_sick_remaining(employee_id, as_of)
        if days > rem:
            return BalanceResult(False, f"Insufficient Sick balance. Remaining {rem} day(s).", rem)
        return BalanceResult(True, "OK", rem - days)

    if leave_type_code.upper() == "VAC":
        # Use seniority_start_date if available, otherwise hire_date for vacation calculations
        if not hire_date:
            employee = get_employee(employee_id)
            if employee:
                actual_hire_date = employee.seniority_start_date if hasattr(employee, 'seniority_start_date') and employee.seniority_start_date else employee.hire_date
            else:
                actual_hire_date = None
        else:
            actual_hire_date = hire_date
        rem = get_vacation_remaining(employee_id, actual_hire_date, as_of)
        if days > rem:
            return BalanceResult(False, f"Insufficient Vacation balance. Remaining {rem} day(s).", rem)
        return BalanceResult(True, "OK", rem - days)

    # Unpaid or other types: allow without balance check
    return BalanceResult(True, "OK (no balance check)", 0.0)
