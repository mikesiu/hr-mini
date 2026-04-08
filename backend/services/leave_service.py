from __future__ import annotations
from datetime import date, timedelta
from dataclasses import dataclass
from typing import Literal, Tuple

from repos.leave_repo import sum_days, overlaps
from repos.employee_repo_ext import get_employee, is_employee_eligible_for_sick_leave
# MySQL-only configuration - no DB_PATH needed

# ---- Policy knobs (adjust as needed) ----
SICK_DAYS_PER_YEAR = 5.0  # BC ESA minimum

# Vacation entitlement tiers based on years of employment
VACATION_ENTITLEMENT_TIERS = {
    1: 10.0,   # 2 weeks after 12 months (1 year)
    5: 15.0,   # 3 weeks after 5 years
}

# Vacation must be taken within 12 months after it's earned
VACATION_USE_PERIOD_MONTHS = 12

@dataclass
class BalanceResult:
    ok: bool
    reason: str
    remaining: float

def calendar_year_window(as_of: date) -> Tuple[date, date]:
    start = date(as_of.year, 1, 1)
    end = date(as_of.year, 12, 31)
    return start, end

def calculate_vacation_entitlement(hire_date: date, as_of: date) -> float:
    """Calculate vacation entitlement based on years of employment."""
    if not hire_date:
        return 0.0
    
    # Calculate years of employment
    years_employed = (as_of - hire_date).days / 365.25
    
    # Find the appropriate tier
    entitlement = 0.0
    for years_threshold in sorted(VACATION_ENTITLEMENT_TIERS.keys(), reverse=True):
        if years_employed >= years_threshold:
            entitlement = VACATION_ENTITLEMENT_TIERS[years_threshold]
            break
    
    return entitlement

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

def get_vacation_remaining(employee_id: str, hire_date: date | None, as_of: date) -> float:
    """Calculate remaining vacation days based on tiered entitlement system."""
    if not hire_date:
        return 0.0
    
    # Calculate vacation entitlement based on years of employment
    entitlement = calculate_vacation_entitlement(hire_date, as_of)
    
    # If employee hasn't earned vacation yet (less than 12 months), return 0
    if entitlement == 0.0:
        return 0.0
    
    # Calculate the window when vacation can be taken
    a0, a1 = vacation_earned_window(hire_date, as_of)
    
    # Count vacation days taken in the current entitlement period
    taken = sum_days(employee_id, "VAC", a0, a1)
    
    # Calculate remaining days
    remaining = max(0.0, entitlement - taken)
    return round(remaining, 2)

def can_approve_leave(employee_id: str, leave_type_code: str, start: date, end: date, days: float,
                      hire_date: date | None, as_of: date) -> BalanceResult:
    # 1) Overlap check
    if overlaps(employee_id, start, end):
        return BalanceResult(False, "Overlaps an existing leave.", 0.0)

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
