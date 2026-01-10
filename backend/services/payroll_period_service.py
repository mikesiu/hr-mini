from __future__ import annotations
from typing import List
from datetime import date, timedelta
import calendar

from models.base import SessionLocal
from models.company import Company


class PayPeriod:
    """Represents a pay period with start and end dates"""
    def __init__(self, start_date: date, end_date: date, period_number: int, year: int, payment_date: date = None):
        self.start_date = start_date
        self.end_date = end_date
        self.period_number = period_number
        self.year = year
        self.payment_date = payment_date
    
    def to_dict(self):
        return {
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "period_number": self.period_number,
            "year": self.year,
            "duration_days": (self.end_date - self.start_date).days + 1,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None
        }


def calculate_pay_periods(company_id: str, year: int) -> List[PayPeriod]:
    """
    Calculate pay periods for a company for a given year.
    
    Args:
        company_id: Company ID
        year: Year to calculate periods for
    
    Returns:
        List of PayPeriod objects for the year
    
    Frequencies:
    - bi-weekly: 14-day periods from pay_period_start_date (e.g., Jul 7-20, Jul 21-Aug 3)
    - monthly: 1-month periods from pay_period_start_date (e.g., Jul 7-Aug 6, Aug 7-Sep 6)
    - bi-monthly: Periods ending on 10th or 25th of each month
    """
    with SessionLocal() as session:
        company = session.get(Company, company_id)
        if not company:
            raise ValueError(f"Company {company_id} not found")
        
        if not company.pay_period_start_date or not company.payroll_frequency:
            return []
        
        start_date = company.pay_period_start_date
        periods = []
        
        # Calculate start and end dates for the requested year
        year_start = date(year, 1, 1)
        year_end = date(year, 12, 31)
        
        # Adjust start_date to be within or before the requested year
        if start_date > year_end:
            return []  # Start date is after the requested year
        
        # Normalize frequency to lowercase for comparison
        # Handle variations like "Bi-weekly (Every 14 days)" by extracting the base frequency
        raw_frequency = (company.payroll_frequency or "").lower().strip()
        # Extract just the frequency part (before any parentheses or additional text)
        if "bi-weekly" in raw_frequency or "biweekly" in raw_frequency or "bi weekly" in raw_frequency:
            frequency = "bi-weekly"
        elif "bi-monthly" in raw_frequency or "bimonthly" in raw_frequency or "bi monthly" in raw_frequency:
            frequency = "bi-monthly"
        elif "monthly" in raw_frequency:
            frequency = "monthly"
        else:
            frequency = raw_frequency  # Use as-is if no pattern matches
        
        # Start from the year start if pay_period_start_date is before the year
        if start_date < year_start:
            # For bi-weekly and monthly, include periods from the original start_date
            # even if they started before the year (they may overlap into the year)
            if frequency == "bi-weekly":
                # Calculate periods from the original start_date, including those that start before the year
                periods = _calculate_bi_weekly_periods(start_date, year_start, year_end)
            elif frequency == "monthly":
                # Calculate periods from the original start_date, including those that start before the year
                periods = _calculate_monthly_periods(start_date, year_start, year_end)
            elif frequency == "bi-monthly":
                periods = _calculate_bi_monthly_periods(start_date, year_start, year_end)
            else:
                # Unknown frequency, return empty list
                print(f"Warning: Unknown payroll frequency '{company.payroll_frequency}' for company {company_id}")
                return []
        else:
            # Start date is within the requested year
            if frequency == "bi-weekly":
                periods = _calculate_bi_weekly_periods(start_date, year_start, year_end)
            elif frequency == "monthly":
                periods = _calculate_monthly_periods(start_date, year_start, year_end)
            elif frequency == "bi-monthly":
                periods = _calculate_bi_monthly_periods(start_date, year_start, year_end)
            else:
                # Unknown frequency, return empty list
                print(f"Warning: Unknown payroll frequency '{company.payroll_frequency}' for company {company_id}")
                return []
        
        # First, calculate payment dates for ALL periods
        if company.payroll_due_start_date:
            _assign_payment_dates(periods, company.payroll_due_start_date, frequency)
        
        # Filter to periods whose PAYMENT DATE falls within the year
        # This ensures Period 1 is the first period PAID in the year
        # (even if the work period is in the previous year)
        if company.payroll_due_start_date:
            year_periods = [p for p in periods if p.payment_date and year_start <= p.payment_date <= year_end]
        else:
            # Fallback to end_date if no payment date configured
            year_periods = [p for p in periods if year_start <= p.end_date <= year_end]
        
        # Sort by payment_date (or end_date as fallback) and assign period numbers
        year_periods.sort(key=lambda p: p.payment_date or p.end_date)
        for i, period in enumerate(year_periods, 1):
            period.period_number = i
            period.year = year
        
        return year_periods


def _assign_payment_dates(periods: List[PayPeriod], payroll_due_start_date: date, frequency: str) -> None:
    """
    Assign payment dates to periods based on payroll_due_start_date and frequency.
    
    The payment date for each period is calculated by finding the Nth payment date
    where N is the period number. Payment dates follow the same frequency as periods.
    """
    if not periods:
        return
    
    # Get the first period's end_date to find alignment
    first_period = periods[0]
    
    if frequency == "bi-weekly":
        # For bi-weekly, payment dates are every 14 days from payroll_due_start_date
        # Find the payment date that corresponds to the first period
        # Calculate how many 14-day cycles from payroll_due_start_date to first period's end_date
        if payroll_due_start_date <= first_period.end_date:
            days_diff = (first_period.end_date - payroll_due_start_date).days
            cycles = days_diff // 14
            first_payment = payroll_due_start_date + timedelta(days=cycles * 14)
            # If first_payment is before end_date, move to next cycle
            if first_payment < first_period.end_date:
                first_payment = first_payment + timedelta(days=14)
        else:
            # payroll_due_start_date is after first period end, use it directly
            first_payment = payroll_due_start_date
        
        # Assign payment dates to each period
        for i, period in enumerate(periods):
            period.payment_date = first_payment + timedelta(days=i * 14)
    
    elif frequency == "monthly":
        # For monthly, payment dates are same day each month from payroll_due_start_date
        # Find the payment date that corresponds to the first period
        payment_day = payroll_due_start_date.day
        
        # Start from the month of the first period's end_date
        first_end = first_period.end_date
        # Payment should be on or after the period end
        if first_end.day <= payment_day:
            # Payment is in the same month
            first_payment_month = first_end.month
            first_payment_year = first_end.year
        else:
            # Payment is in the next month
            if first_end.month == 12:
                first_payment_month = 1
                first_payment_year = first_end.year + 1
            else:
                first_payment_month = first_end.month + 1
                first_payment_year = first_end.year
        
        # Assign payment dates to each period
        for i, period in enumerate(periods):
            payment_date = _add_months(date(first_payment_year, first_payment_month, 1), i)
            # Adjust day to payment_day, handling month-end
            last_day = calendar.monthrange(payment_date.year, payment_date.month)[1]
            period.payment_date = date(payment_date.year, payment_date.month, min(payment_day, last_day))
    
    elif frequency == "bi-monthly":
        # For bi-monthly, payment dates alternate on 15th and last day of month
        # Or use payroll_due_start_date pattern
        # Assign payment dates based on period end dates + offset
        for period in periods:
            # Payment is typically a few days after period end
            # For bi-monthly with periods ending on 10th or 25th:
            # - Period ending 10th -> payment on 15th same month
            # - Period ending 25th -> payment on last day of month
            if period.end_date.day == 10:
                period.payment_date = date(period.end_date.year, period.end_date.month, 15)
            elif period.end_date.day == 25:
                last_day = calendar.monthrange(period.end_date.year, period.end_date.month)[1]
                period.payment_date = date(period.end_date.year, period.end_date.month, last_day)
            else:
                # Fallback: payment is 5 days after period end
                period.payment_date = period.end_date + timedelta(days=5)


def _calculate_bi_weekly_periods(start_date: date, year_start: date, year_end: date) -> List[PayPeriod]:
    """
    Calculate bi-weekly pay periods (14-day periods) from the given start_date.
    
    Includes periods whose PAYMENT DATE could fall within the year, even if the
    work period is entirely in the prior year. Payment is typically ~5 days after
    period end, so we need to go back ~3 weeks before year_start.
    """
    periods = []
    
    # To capture periods whose payment dates fall in the year, we need to start
    # earlier than year_start. Payment is typically 5-7 days after period end,
    # and periods are 14 days, so we need to go back about 3 weeks (21 days).
    search_start = year_start - timedelta(days=21)
    
    if start_date < search_start:
        # Find the period alignment based on the original start_date
        days_to_search = (search_start - start_date).days
        
        # Find the period start on or before search_start
        periods_before = days_to_search // 14
        current_start = start_date + timedelta(days=periods_before * 14)
    else:
        # Start date is after our search start
        current_start = start_date
    
    # Generate all periods that could have payment dates within the year
    # Continue until the period's start is past year_end + buffer for last payment
    while current_start <= year_end:
        current_end = current_start + timedelta(days=13)  # 14-day period (inclusive)
        
        # Include all periods - filtering by payment_date is done in the main function
        periods.append(PayPeriod(current_start, current_end, 0, year_start.year))
        
        # Move to next period
        current_start = current_start + timedelta(days=14)
    
    return periods


def _calculate_monthly_periods(start_date: date, year_start: date, year_end: date) -> List[PayPeriod]:
    """
    Calculate monthly pay periods (1-month periods) from the given start_date.
    
    Includes periods whose PAYMENT DATE could fall within the year, even if the
    work period is entirely in the prior year.
    """
    periods = []
    current_start = start_date
    
    # To capture periods whose payment dates fall in the year, we need to start
    # about 1 month before year_start (payment could be in January for December period)
    search_start = year_start - timedelta(days=35)  # ~1 month + buffer
    
    if start_date < search_start:
        # Find the monthly period that starts on or before search_start
        while True:
            next_start = _add_months(current_start, 1)
            
            # If next period would start after search_start, we've found our starting point
            if next_start > search_start:
                break
            
            current_start = next_start
            
            # Safety check
            if current_start > year_end:
                break
    
    # Generate all periods that could have payment dates within the year
    while current_start <= year_end:
        # Calculate end date (1 month later, minus 1 day)
        current_end = _add_months(current_start, 1) - timedelta(days=1)
        
        # Include all periods - filtering by payment_date is done in the main function
        periods.append(PayPeriod(current_start, current_end, 0, year_start.year))
        
        # Move to next period
        current_start = _add_months(current_start, 1)
    
    return periods


def _calculate_bi_monthly_periods(start_date: date, year_start: date, year_end: date) -> List[PayPeriod]:
    """
    Calculate bi-monthly pay periods with the pattern:
    - Period type A: Start on 26th of month, end on 10th of next month
    - Period type B: Start on 11th of month, end on 25th of same month
    - Pattern repeats: 26th-10th, 11th-25th, 26th-10th, 11th-25th, etc.
    
    Includes periods whose PAYMENT DATE could fall within the year, even if the
    work period is entirely in the prior year. Starts from Dec 11 of prior year
    to capture periods paid in early January.
    """
    periods = []
    current_year = year_start.year
    prev_year = current_year - 1
    
    # Start from Dec 11 of previous year to capture periods paid in early January
    # Dec 11-25 period is paid on Dec 31 (or Jan 1 in some cases)
    period_start = date(prev_year, 12, 11)
    period_end = date(prev_year, 12, 25)
    
    # Generate all periods that could have end dates within the year
    while True:
        # Stop if we've gone past the year (period starts after year_end)
        if period_start > year_end:
            break
        
        # Include all periods - filtering by end_date is done in the main function
        periods.append(PayPeriod(period_start, period_end, 0, year_start.year))
        
        # Move to next period based on current period_end
        if period_end.day == 10:
            # Current period ends on 10th, next period: 11th-25th of same month
            period_start = date(period_end.year, period_end.month, 11)
            period_end = date(period_end.year, period_end.month, 25)
        elif period_end.day == 25:
            # Current period ends on 25th, next period: 26th of same month to 10th of next month
            period_start = date(period_end.year, period_end.month, 26)
            if period_end.month == 12:
                period_end = date(period_end.year + 1, 1, 10)
            else:
                period_end = date(period_end.year, period_end.month + 1, 10)
        else:
            # Should not happen with our pattern, but break to avoid infinite loop
            break
    
    return periods


def _add_months(source_date: date, months: int) -> date:
    """Add months to a date, handling year rollover"""
    month = source_date.month - 1 + months
    year = source_date.year + month // 12
    month = month % 12 + 1
    day = min(source_date.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)

