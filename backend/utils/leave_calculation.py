"""
Utility functions for calculating leave days, excluding weekends and holidays
"""
from datetime import date, timedelta
from repos.holiday_repo import get_holidays_in_range
from repos.employment_repo import get_current_employment


def calculate_working_days(
    start_date: date,
    end_date: date,
    company_id: str | None = None,
    employee_id: str | None = None
) -> float:
    """
    Calculate the number of working days between two dates, excluding weekends and holidays.
    
    Args:
        start_date: Start date (inclusive)
        end_date: End date (inclusive)
        company_id: Optional company ID to exclude company-specific holidays.
                    If None, only weekends are excluded.
        employee_id: Optional employee ID to filter union-only holidays based on union membership.
    
    Returns:
        Number of working days as a float
    """
    if start_date > end_date:
        return 0.0
    
    # Get holidays for the date range if company_id is provided
    holidays = set()
    if company_id:
        holidays = set(get_holidays_in_range(company_id, start_date, end_date, employee_id))
    
    # Count working days
    current_date = start_date
    working_days = 0.0
    
    while current_date <= end_date:
        # Check if it's not a weekend (Monday=0, Sunday=6)
        day_of_week = current_date.weekday()
        is_weekend = day_of_week >= 5  # Saturday (5) or Sunday (6)
        
        # Check if it's not a holiday
        is_holiday = current_date in holidays
        
        if not is_weekend and not is_holiday:
            working_days += 1.0
        
        current_date += timedelta(days=1)
    
    return working_days


def iter_leave_chargeable_dates(
    start_date: date,
    end_date: date,
    *,
    company_id: str | None = None,
    employee_id: str | None = None,
    holiday_dates: set[date] | None = None,
    range_start: date | None = None,
    range_end: date | None = None,
) -> list[date]:
    """
    Return dates in a leave span that count as leave days.

    Matches leave day calculation: weekends and statutory holidays are excluded.
    Optionally clip to [range_start, range_end] (e.g. a pay period window).
    """
    if start_date > end_date:
        return []

    holidays = set(holiday_dates) if holiday_dates is not None else set()
    if holiday_dates is None and company_id:
        holidays = set(get_holidays_in_range(
            company_id,
            start_date,
            end_date,
            employee_id,
        ))

    clip_start = range_start or start_date
    clip_end = range_end or end_date
    current = max(start_date, clip_start)
    last = min(end_date, clip_end)

    chargeable: list[date] = []
    while current <= last:
        is_weekend = current.weekday() >= 5
        if not is_weekend and current not in holidays:
            chargeable.append(current)
        current += timedelta(days=1)
    return chargeable


def calculate_leave_days_for_employee(
    employee_id: str,
    start_date: date,
    end_date: date
) -> float:
    """
    Calculate leave days for an employee, excluding weekends and company holidays.
    
    Args:
        employee_id: Employee ID
        start_date: Start date (inclusive)
        end_date: End date (inclusive)
    
    Returns:
        Number of working days as a float
    
    Raises:
        ValueError: If employee has no current employment (no company assigned)
    """
    # Get employee's current company
    employment = get_current_employment(employee_id)
    if not employment:
        raise ValueError(f"Employee {employee_id} has no current employment record")
    
    company_id = employment.company_id
    return calculate_working_days(start_date, end_date, company_id, employee_id)

