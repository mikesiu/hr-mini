from __future__ import annotations
from typing import List
from datetime import date, datetime, timedelta
import calendar

from sqlalchemy import select

from models.base import SessionLocal
from models.company import Company
from models.employee import Employee
from schemas import PayrollCalendarEvent
from repos.employment_repo import get_current_employment, get_company_by_id


def calculate_payroll_dates(company: Company, start_date: date, end_date: date) -> List[PayrollCalendarEvent]:
    """
    Calculate all payroll-related dates for a company within the given date range.
    """
    events = []
    
    if not company.payroll_due_start_date or not company.payroll_frequency:
        return events
    
    # Calculate payroll dates based on frequency
    payroll_dates = _calculate_payroll_dates_by_frequency(
        company.payroll_due_start_date, 
        company.payroll_frequency, 
        start_date, 
        end_date
    )
    
    # Add payroll events
    for payroll_date in payroll_dates:
        events.append(PayrollCalendarEvent(
            date=payroll_date,
            company_id=company.id,
            company_name=company.legal_name,
            event_type="payroll",
            description=f"Payroll Due - {company.legal_name}"
        ))
    
    # Add CRA due dates
    if company.cra_due_dates:
        cra_dates = _calculate_cra_dates(company.cra_due_dates, start_date, end_date)
        for cra_date in cra_dates:
            events.append(PayrollCalendarEvent(
                date=cra_date,
                company_id=company.id,
                company_name=company.legal_name,
                event_type="cra",
                description=f"CRA Payment Due - {company.legal_name}"
            ))
    
    # Add Union due dates
    if company.union_due_date:
        union_dates = _calculate_union_dates(company.union_due_date, start_date, end_date)
        for union_date in union_dates:
            events.append(PayrollCalendarEvent(
                date=union_date,
                company_id=company.id,
                company_name=company.legal_name,
                event_type="union",
                description=f"Union Payment Due - {company.legal_name}"
            ))
    
    return events


def _calculate_payroll_dates_by_frequency(
    start_date: date, 
    frequency: str, 
    range_start: date, 
    range_end: date
) -> List[date]:
    """
    Calculate payroll dates based on frequency within the given range.
    """
    dates = []
    
    if frequency == "bi-weekly":
        # Every 14 days from start date
        current_date = start_date
        while current_date <= range_end:
            if current_date >= range_start:
                dates.append(current_date)
            current_date += timedelta(days=14)
    
    elif frequency == "bi-monthly":
        # 15th and last day of each month
        current_date = range_start.replace(day=1)
        while current_date <= range_end:
            # 15th of the month
            fifteenth = current_date.replace(day=15)
            if fifteenth >= range_start and fifteenth <= range_end:
                dates.append(fifteenth)
            
            # Last day of the month
            last_day = calendar.monthrange(current_date.year, current_date.month)[1]
            last_date = current_date.replace(day=last_day)
            if last_date >= range_start and last_date <= range_end:
                dates.append(last_date)
            
            # Move to next month
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
    
    elif frequency == "monthly":
        # Same day each month as start date
        current_date = start_date
        while current_date <= range_end:
            if current_date >= range_start:
                dates.append(current_date)
            
            # Move to next month
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
    
    return sorted(dates)


def _calculate_cra_dates(cra_due_dates: str, start_date: date, end_date: date) -> List[date]:
    """
    Calculate CRA due dates based on comma-separated day numbers.
    """
    dates = []
    try:
        day_numbers = [int(day.strip()) for day in cra_due_dates.split(',') if day.strip()]
        
        current_date = start_date.replace(day=1)
        while current_date <= end_date:
            for day_num in day_numbers:
                # Check if the day exists in the current month
                last_day = calendar.monthrange(current_date.year, current_date.month)[1]
                if day_num <= last_day:
                    cra_date = current_date.replace(day=day_num)
                    if cra_date >= start_date and cra_date <= end_date:
                        dates.append(cra_date)
            
            # Move to next month
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
    except (ValueError, AttributeError):
        # Invalid format, return empty list
        pass
    
    return sorted(dates)


def _calculate_union_dates(union_due_date: int, start_date: date, end_date: date) -> List[date]:
    """
    Calculate Union due dates based on day of month.
    """
    dates = []
    
    current_date = start_date.replace(day=1)
    while current_date <= end_date:
        # Check if the day exists in the current month
        last_day = calendar.monthrange(current_date.year, current_date.month)[1]
        if union_due_date <= last_day:
            union_date = current_date.replace(day=union_due_date)
            if union_date >= start_date and union_date <= end_date:
                dates.append(union_date)
        
        # Move to next month
        if current_date.month == 12:
            current_date = current_date.replace(year=current_date.year + 1, month=1)
        else:
            current_date = current_date.replace(month=current_date.month + 1)
    
    return sorted(dates)


def get_probation_events(start_date: date, end_date: date) -> List[PayrollCalendarEvent]:
    """
    Get probation end date events for employees within the given date range.
    """
    events = []
    
    with SessionLocal() as session:
        # Query employees with probation_end_date within the date range
        # Exclude terminated employees
        stmt = (
            select(Employee)
            .where(Employee.probation_end_date.isnot(None))
            .where(Employee.probation_end_date >= start_date)
            .where(Employee.probation_end_date <= end_date)
            .where(Employee.status != "Terminated")
        )
        employees = session.execute(stmt).scalars().all()
        
        # Process employees while session is still open to avoid lazy loading issues
        for employee in employees:
            try:
                # Get current employment to determine company_id
                current_employment = get_current_employment(employee.id, as_of_date=employee.probation_end_date)
                
                if current_employment:
                    # Get company information
                    company = get_company_by_id(current_employment.company_id)
                    company_name = company.legal_name if company else current_employment.company_id
                    
                    events.append(PayrollCalendarEvent(
                        date=employee.probation_end_date,
                        company_id=current_employment.company_id,
                        company_name=company_name,
                        event_type="probation",
                        description=f"Probation End - {employee.full_name}"
                    ))
            except Exception as e:
                # Log error but continue with other employees
                print(f"Error processing probation event for employee {employee.id}: {e}")
                continue
    
    return events


def get_payroll_calendar_data(start_date: date, end_date: date) -> List[PayrollCalendarEvent]:
    """
    Get payroll calendar data for all companies within the given date range.
    Includes payroll, CRA, union, and probation events.
    """
    all_events = []
    
    with SessionLocal() as session:
        companies = session.query(Company).all()
        
        # Process companies while session is still open to avoid lazy loading issues
        for company in companies:
            try:
                company_events = calculate_payroll_dates(company, start_date, end_date)
                all_events.extend(company_events)
            except Exception as e:
                # Log error but continue with other companies
                print(f"Error calculating payroll dates for company {company.id}: {e}")
                continue
    
    # Add probation events
    try:
        probation_events = get_probation_events(start_date, end_date)
        all_events.extend(probation_events)
    except Exception as e:
        # Log error but continue
        print(f"Error fetching probation events: {e}")
    
    # Sort events by date
    return sorted(all_events, key=lambda x: x.date)
