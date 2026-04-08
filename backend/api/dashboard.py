from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from datetime import date, datetime, timedelta

from schemas import PayrollCalendarResponse
from api.dependencies import get_current_user
from services.dashboard_service import get_payroll_calendar_data

router = APIRouter()


@router.get("/payroll-calendar", response_model=PayrollCalendarResponse)
async def get_payroll_calendar(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get payroll calendar data for the specified date range.
    Returns all payroll, CRA, and Union due dates for all companies.
    """
    try:
        # Parse dates
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
        
        # Validate date range (max 3 months)
        if (end - start).days > 90:
            raise HTTPException(
                status_code=400, 
                detail="Date range cannot exceed 90 days"
            )
        
        # Get calendar data
        events = get_payroll_calendar_data(start, end)
        
        return PayrollCalendarResponse(
            success=True,
            data=events
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid date format: {str(e)}"
        )
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in get_payroll_calendar: {error_details}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error fetching payroll calendar: {str(e)}"
        )


@router.get("/payroll-calendar/current-month", response_model=PayrollCalendarResponse)
async def get_current_month_payroll_calendar(
    current_user: dict = Depends(get_current_user)
):
    """
    Get payroll calendar data for current month and next month.
    """
    try:
        today = date.today()
        
        # Current month
        current_month_start = today.replace(day=1)
        
        # Next month
        if current_month_start.month == 12:
            next_month_start = current_month_start.replace(year=current_month_start.year + 1, month=1)
        else:
            next_month_start = current_month_start.replace(month=current_month_start.month + 1)
        
        # End of next month
        if next_month_start.month == 12:
            next_month_end = next_month_start.replace(year=next_month_start.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            next_month_end = next_month_start.replace(month=next_month_start.month + 1, day=1) - timedelta(days=1)
        
        # Get calendar data
        events = get_payroll_calendar_data(current_month_start, next_month_end)
        
        return PayrollCalendarResponse(
            success=True,
            data=events
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error fetching current month payroll calendar: {str(e)}"
        )
