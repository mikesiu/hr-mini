"""
Attendance calculation service for calculating hours worked, overtime, and weekend OT.
"""
from datetime import date, time, datetime, timedelta
from typing import Optional, Tuple
from utils.time_rounding import round_check_in, round_check_out


def calculate_hours_worked(
    check_in: Optional[time],
    check_out: Optional[time],
    schedule_start: Optional[time],
    schedule_end: Optional[time],
    work_date: date,
    is_driver: bool = False,
    weekday_schedule_start: Optional[time] = None,
    count_all_ot: bool = False
) -> Tuple[float, float, float]:
    """
    Calculate regular hours, OT hours, and weekend OT hours for a given day.
    
    Args:
        check_in: Check-in time (rounded)
        check_out: Check-out time (rounded)
        schedule_start: Scheduled start time for this day
        schedule_end: Scheduled end time for this day
        work_date: Date of work
        is_driver: Whether employee is a driver (affects OT calculation)
        weekday_schedule_start: Optional weekday schedule start time (e.g., Monday's start time)
                              Used for weekend OT calculation when schedule_start is None
        count_all_ot: Whether to count OT even if less than 30 minutes
        
    Returns:
        Tuple of (regular_hours, ot_hours, weekend_ot_hours)
    """
    if not check_in or not check_out:
        return (0.0, 0.0, 0.0)
    
    # Check if it's a weekend
    is_weekend = work_date.weekday() >= 5  # Saturday=5, Sunday=6
    
    # Calculate total hours worked
    check_in_dt = datetime.combine(work_date, check_in)
    check_out_dt = datetime.combine(work_date, check_out)
    
    # Handle case where check-out is next day
    if check_out < check_in:
        check_out_dt += timedelta(days=1)
    
    total_seconds = (check_out_dt - check_in_dt).total_seconds()
    total_hours = total_seconds / 3600.0
    
    # Handle weekend OT first (before checking schedule)
    # For weekends, calculate OT from the later of: actual check-in or weekday schedule start
    if is_weekend:
        # Determine the effective start time for weekend OT calculation
        # If staff checks in earlier than weekday schedule start, use schedule start
        # If staff checks in later than (or equal to) weekday schedule start, use actual check-in
        if weekday_schedule_start:
            schedule_start_dt = datetime.combine(work_date, weekday_schedule_start)
            # Use the later of check-in or schedule start
            effective_start_dt = max(check_in_dt, schedule_start_dt)
        else:
            # No weekday schedule available, use actual check-in time
            effective_start_dt = check_in_dt
        
        # Weekend OT is calculated from effective start to check-out
        weekend_ot_seconds = (check_out_dt - effective_start_dt).total_seconds()
        weekend_ot_hours = max(0.0, weekend_ot_seconds / 3600.0)
        return (0.0, 0.0, weekend_ot_hours)
    
    if not schedule_start or not schedule_end:
        # No schedule defined - all hours are OT (for weekdays only, weekends handled above)
        return (0.0, total_hours, 0.0)
    
    # Calculate scheduled hours
    schedule_start_dt = datetime.combine(work_date, schedule_start)
    schedule_end_dt = datetime.combine(work_date, schedule_end)
    if schedule_end < schedule_start:
        schedule_end_dt += timedelta(days=1)
    
    scheduled_seconds = (schedule_end_dt - schedule_start_dt).total_seconds()
    scheduled_hours = scheduled_seconds / 3600.0
    
    # For OT calculation: Only count time worked AFTER scheduled end time
    # Early check-in (before scheduled start) does NOT count as OT
    
    # Determine effective start time (use scheduled start if check-in is earlier)
    effective_start_dt = max(check_in_dt, schedule_start_dt)
    
    # Calculate regular hours: from effective start to scheduled end (or actual check-out if earlier)
    regular_end_dt = min(check_out_dt, schedule_end_dt)
    regular_seconds = (regular_end_dt - effective_start_dt).total_seconds()
    regular_hours = max(0.0, regular_seconds / 3600.0)  # Ensure non-negative
    
    # Calculate OT hours: only time worked AFTER scheduled end time
    ot_hours = 0.0
    if check_out_dt > schedule_end_dt:
        ot_seconds = (check_out_dt - schedule_end_dt).total_seconds()
        ot_hours = ot_seconds / 3600.0
    
    # Apply OT rules (minimum thresholds and rounding) for weekdays
    # (Weekends are handled earlier in the function with early return)
    ot_hours = determine_ot_hours(ot_hours, is_driver, count_all_ot)
    return (regular_hours, ot_hours, 0.0)


def determine_ot_hours(ot_hours: float, is_driver: bool, count_all_ot: bool = False) -> float:
    """
    Apply overtime rules. OT begins only after 30 minutes beyond regular shift.
    Overtime beyond that will be calculated in 15-minute increments.
    
    Args:
        ot_hours: Raw OT hours calculated
        is_driver: Whether employee is a driver (kept for compatibility, but not used)
        count_all_ot: Whether to count OT even if less than 30 minutes
        
    Returns:
        Adjusted OT hours (rounded to nearest 0.25 hours / 15 minutes after 30-minute threshold)
        
    Examples:
        - 3:28 PM check-out (shift ends 3:00 PM) → 28 min = 0 OT (unless count_all_ot=True)
        - 3:32 PM check-out (shift ends 3:00 PM) → 32 min = 0.5 hours OT
    """
    # Apply minimum threshold: 30 minutes (0.5 hours) unless count_all_ot is True
    if not count_all_ot and ot_hours < 0.5:
        return 0.0
    
    # Round to nearest 0.25 hours (15 minutes)
    return round(ot_hours * 4) / 4.0


def round_check_in_out(check_in: Optional[time], check_out: Optional[time]) -> Tuple[Optional[time], Optional[time]]:
    """
    Round check-in and check-out times according to rounding rules.
    - Check-in: Round UP to next 15-minute interval (late arrival)
    - Check-out: Round DOWN to previous 15-minute interval (early departure)
    
    Args:
        check_in: Original check-in time
        check_out: Original check-out time
        
    Returns:
        Tuple of (rounded_check_in, rounded_check_out)
    """
    rounded_check_in = round_check_in(check_in) if check_in else None
    rounded_check_out = round_check_out(check_out) if check_out else None
    return (rounded_check_in, rounded_check_out)


def is_weekend_ot(date_obj: date, check_in: Optional[time], check_out: Optional[time]) -> bool:
    """
    Determine if work done is weekend overtime.
    
    Args:
        date_obj: Date of work
        check_in: Check-in time
        check_out: Check-out time
        
    Returns:
        True if weekend OT, False otherwise
    """
    if not check_in or not check_out:
        return False
    
    return date_obj.weekday() >= 5  # Saturday or Sunday

