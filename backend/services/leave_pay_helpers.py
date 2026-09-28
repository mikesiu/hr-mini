"""Helpers for vacation pay ledger / sick pay calculations."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import List, Optional, Tuple

from repos.salary_history_repo import get_current_salary, get_salary_history_by_employee
from services.vacation_percent_service import to_hourly_rate
from utils.leave_calculation import calculate_working_days


def get_hourly_rate_as_of(employee_id: str, as_of: date) -> float:
    history = get_salary_history_by_employee(employee_id)
    applicable = None
    for row in history:
        if row.effective_date and row.effective_date > as_of:
            continue
        if row.end_date and row.end_date < as_of:
            continue
        if applicable is None or row.effective_date > applicable.effective_date:
            applicable = row
    if not applicable:
        current = get_current_salary(employee_id)
        if not current:
            return 0.0
        applicable = current
    return to_hourly_rate(float(applicable.pay_rate), applicable.pay_type)


def scheduled_hours_for_date(employee_id: str, on_date: date) -> float:
    from repos.employee_schedule_repo import get_current_schedule
    schedule = get_current_schedule(employee_id, on_date)
    if not schedule:
        return 8.0
    start_t, end_t = schedule.get_day_times(on_date.weekday())
    if not start_t or not end_t:
        return 8.0
    start_dt = datetime.combine(on_date, start_t)
    end_dt = datetime.combine(on_date, end_t)
    hours = (end_dt - start_dt).total_seconds() / 3600.0
    return hours if hours > 0 else 8.0


def leave_days_overlapping(
    leave_start: date,
    leave_end: date,
    leave_days: float,
    window_start: date,
    window_end: date,
    company_id: Optional[str] = None,
) -> float:
    """Days of a leave that fall inside window."""
    overlap_start = max(leave_start, window_start)
    overlap_end = min(leave_end, window_end)
    if overlap_start > overlap_end:
        return 0.0
    if leave_start >= window_start and leave_end <= window_end:
        return float(leave_days or 0)
    # Partial overlap: count working days in overlap
    try:
        return float(calculate_working_days(overlap_start, overlap_end, company_id=company_id))
    except TypeError:
        # Signature may not take company_id
        try:
            return float(calculate_working_days(overlap_start, overlap_end))
        except Exception:
            days = 0
            d = overlap_start
            while d <= overlap_end:
                if d.weekday() < 5:
                    days += 1
                d += timedelta(days=1)
            return float(days)


def format_leave_dates(leaves: List) -> str:
    """Format leave date ranges for report display."""
    parts = []
    for leave in leaves:
        if leave.start_date == leave.end_date:
            parts.append(leave.start_date.isoformat())
        else:
            parts.append(f"{leave.start_date.isoformat()}–{leave.end_date.isoformat()}")
    return "; ".join(parts)


def sick_pay_for_period(
    employee_id: str,
    sick_leaves: List,
    period_start: date,
    period_end: date,
    company_id: Optional[str] = None,
) -> Tuple[float, float, str]:
    """
    Returns (sick_days, sick_pay_amount, dates_display).
    sick_pay = sum over overlapping days of hours_per_day * hourly_rate.
    """
    relevant = []
    total_days = 0.0
    total_pay = 0.0
    for leave in sick_leaves:
        days = leave_days_overlapping(
            leave.start_date, leave.end_date, leave.days, period_start, period_end, company_id
        )
        if days <= 0:
            continue
        relevant.append(leave)
        total_days += days
        # Approximate: distribute days across overlap calendar working days
        overlap_start = max(leave.start_date, period_start)
        overlap_end = min(leave.end_date, period_end)
        d = overlap_start
        remaining = days
        while d <= overlap_end and remaining > 0:
            if d.weekday() < 5:
                chunk = min(1.0, remaining)
                hours = scheduled_hours_for_date(employee_id, d) * chunk
                rate = get_hourly_rate_as_of(employee_id, d)
                total_pay += hours * rate
                remaining -= chunk
            d += timedelta(days=1)
        # If half-days left without weekday slots, use period-end rate * 8 * remaining
        if remaining > 0:
            rate = get_hourly_rate_as_of(employee_id, period_end)
            total_pay += remaining * 8.0 * rate

    return total_days, round(total_pay, 2), format_leave_dates(relevant)
