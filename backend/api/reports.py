"""
Reports API endpoints for HR System
Provides comprehensive reporting functionality across all HR modules
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from typing import List, Optional
from datetime import date, datetime
import json

from api.dependencies import get_current_user, require_permission
from services.report_service import ReportService
from utils.filter_validation import validate_filters, FilterValidationResult
from schemas_reports import (
    EmployeeReportFilters, LeaveReportFilters, SalaryReportFilters, 
    ExpenseReportFilters, WorkPermitReportFilters, ReportFilterBase,
    EmployeeReportResponse, EmploymentReportResponse, LeaveReportResponse,
    LeaveBalanceReportResponse, LeaveTakenReportResponse, SalaryReportResponse, ExpenseReportResponse,
    WorkPermitReportResponse, ComprehensiveReportResponse, ExpenseReimbursementReportResponse, ReportType,
    SortField, SortDirection, GroupByField
)

router = APIRouter()

# Initialize report service
report_service = ReportService()

@router.get("/employee-directory", response_model=EmployeeReportResponse)
async def get_employee_directory_report(
    # Common filters
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    company_id: Optional[str] = Query(None, description="Filter by company ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    employee_status: Optional[str] = Query("Active & Probation", description="Filter by employee status (Active, On Leave, Terminated, Probation, Active & Probation, All)"),
    employee_id: Optional[str] = Query(None, description="Filter by specific employee ID"),
    search_term: Optional[str] = Query(None, description="Search term for employee name or ID"),
    
    # Employee-specific filters
    include_inactive: bool = Query(False, description="Include inactive employees"),
    position: Optional[str] = Query(None, description="Filter by position"),
    hire_date_from: Optional[date] = Query(None, description="Filter by hire date from"),
    hire_date_to: Optional[date] = Query(None, description="Filter by hire date to"),
    
    # Sort and Group By options
    sort_by: Optional[SortField] = Query(None, description="Field to sort by"),
    sort_direction: Optional[SortDirection] = Query(SortDirection.ASC, description="Sort direction"),
    group_by: Optional[GroupByField] = Query(None, description="Field to group by"),
    group_by_secondary: Optional[GroupByField] = Query(None, description="Secondary field to group by"),
    
    current_user: dict = Depends(require_permission("report:view"))
):
    """Generate employee directory report with comprehensive employee information"""
    try:
        # Validate filters before processing
        filter_dict = {
            'start_date': start_date,
            'end_date': end_date,
            'company_id': company_id,
            'department': department,
            'employee_status': employee_status,
            'employee_id': employee_id,
            'search_term': search_term,
            'include_inactive': include_inactive,
            'position': position,
            'hire_date_from': hire_date_from,
            'hire_date_to': hire_date_to,
            'sort_by': sort_by.value if sort_by else None,
            'sort_direction': sort_direction.value if sort_direction else None,
            'group_by': group_by.value if group_by else None,
            'group_by_secondary': group_by_secondary.value if group_by_secondary else None,
        }
        
        validation_result = validate_filters(filter_dict, 'employee_directory')
        if not validation_result.is_valid:
            raise HTTPException(
                status_code=400, 
                detail={
                    "message": "Filter validation failed",
                    "errors": validation_result.errors,
                    "warnings": validation_result.warnings
                }
            )
        
        filters = EmployeeReportFilters(
            start_date=start_date,
            end_date=end_date,
            company_id=company_id,
            department=department,
            employee_status=employee_status,
            employee_id=employee_id,
            search_term=search_term,
            include_inactive=include_inactive,
            position=position,
            hire_date_from=hire_date_from,
            hire_date_to=hire_date_to,
            sort_by=sort_by,
            sort_direction=sort_direction,
            group_by=group_by,
            group_by_secondary=group_by_secondary
        )
        
        data, summary = report_service.generate_employee_directory_report(filters)
        
        # Check if data is grouped
        is_grouped = hasattr(data[0], 'group_key') if data else False
        
        return EmployeeReportResponse(
            success=True,
            data=data,
            summary=summary,
            is_grouped=is_grouped
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating employee directory report: {str(e)}")

@router.get("/employment-history", response_model=EmploymentReportResponse)
async def get_employment_history_report(
    # Common filters
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    company_id: Optional[str] = Query(None, description="Filter by company ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    employee_status: Optional[str] = Query("Active & Probation", description="Filter by employee status"),
    employee_id: Optional[str] = Query(None, description="Filter by specific employee ID"),
    search_term: Optional[str] = Query(None, description="Search term for employee name or company"),
    
    # Sort and Group By options
    sort_by: Optional[SortField] = Query(None, description="Field to sort by"),
    sort_direction: Optional[SortDirection] = Query(SortDirection.ASC, description="Sort direction"),
    group_by: Optional[GroupByField] = Query(None, description="Field to group by"),
    group_by_secondary: Optional[GroupByField] = Query(None, description="Secondary field to group by"),
    
    current_user: dict = Depends(require_permission("report:view"))
):
    """Generate employment history report showing all employment records"""
    try:
        filters = ReportFilterBase(
            start_date=start_date,
            end_date=end_date,
            company_id=company_id,
            department=department,
            employee_status=employee_status,
            employee_id=employee_id,
            search_term=search_term,
            sort_by=sort_by,
            sort_direction=sort_direction,
            group_by=group_by,
            group_by_secondary=group_by_secondary
        )
        
        data, summary = report_service.generate_employment_history_report(filters)
        
        # Check if data is grouped
        is_grouped = hasattr(data[0], 'group_key') if data else False
        
        return EmploymentReportResponse(
            success=True,
            data=data,
            summary=summary,
            is_grouped=is_grouped
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating employment history report: {str(e)}")

@router.get("/leave-balance", response_model=LeaveBalanceReportResponse)
async def get_leave_balance_report(
    # Common filters
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    company_id: Optional[str] = Query(None, description="Filter by company ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    employee_status: Optional[str] = Query("Active & Probation", description="Filter by employee status"),
    employee_id: Optional[str] = Query(None, description="Filter by specific employee ID"),
    search_term: Optional[str] = Query(None, description="Search term for employee name"),
    
    current_user: dict = Depends(require_permission("report:view"))
):
    """Generate leave balance report showing current leave balances for employees"""
    try:
        filters = ReportFilterBase(
            start_date=start_date,
            end_date=end_date,
            company_id=company_id,
            department=department,
            employee_status=employee_status,
            employee_id=employee_id,
            search_term=search_term
        )
        
        data, summary = report_service.generate_leave_balance_report(filters)
        
        return LeaveBalanceReportResponse(
            success=True,
            data=data,
            summary=summary
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating leave balance report: {str(e)}")

@router.get("/leave-taken", response_model=LeaveTakenReportResponse)
async def get_leave_taken_report(
    # Common filters
    start_date: Optional[date] = Query(None, description="Start date filter for leave period"),
    end_date: Optional[date] = Query(None, description="End date filter for leave period"),
    company_id: Optional[str] = Query(None, description="Filter by company ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    employee_status: Optional[str] = Query("Active & Probation", description="Filter by employee status"),
    employee_id: Optional[str] = Query(None, description="Filter by specific employee ID"),
    search_term: Optional[str] = Query(None, description="Search term for employee name or leave type"),
    
    # Sort and Group By options
    sort_by: Optional[SortField] = Query(None, description="Field to sort by"),
    sort_direction: Optional[SortDirection] = Query(SortDirection.ASC, description="Sort direction"),
    group_by: Optional[GroupByField] = Query(None, description="Field to group by"),
    group_by_secondary: Optional[GroupByField] = Query(None, description="Secondary field to group by"),
    
    current_user: dict = Depends(require_permission("report:view"))
):
    """Generate leave taken report showing all leave requests for a specific period"""
    try:
        filters = ReportFilterBase(
            start_date=start_date,
            end_date=end_date,
            company_id=company_id,
            department=department,
            employee_status=employee_status,
            employee_id=employee_id,
            search_term=search_term,
            sort_by=sort_by,
            sort_direction=sort_direction,
            group_by=group_by,
            group_by_secondary=group_by_secondary
        )
        
        data, summary = report_service.generate_leave_taken_report(filters)
        
        # Check if data is grouped
        is_grouped = hasattr(data[0], 'group_key') if data else False
        
        return LeaveTakenReportResponse(
            success=True,
            data=data,
            summary=summary,
            is_grouped=is_grouped
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating leave taken report: {str(e)}")

@router.get("/salary-analysis", response_model=SalaryReportResponse)
async def get_salary_analysis_report(
    # Common filters
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    company_id: Optional[str] = Query(None, description="Filter by company ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    employee_status: Optional[str] = Query("Active & Probation", description="Filter by employee status"),
    employee_id: Optional[str] = Query(None, description="Filter by specific employee ID"),
    search_term: Optional[str] = Query(None, description="Search term for employee name"),
    
    # Salary-specific filters
    pay_type: Optional[str] = Query(None, description="Filter by pay type (Hourly, Monthly, Annual)"),
    min_salary: Optional[float] = Query(None, description="Minimum salary filter"),
    max_salary: Optional[float] = Query(None, description="Maximum salary filter"),
    effective_date_from: Optional[date] = Query(None, description="Filter by effective date from"),
    effective_date_to: Optional[date] = Query(None, description="Filter by effective date to"),
    include_history: Optional[bool] = Query(False, description="Include all salary history (default: False shows only latest per employee)"),
    
    # Sort and Group By options
    sort_by: Optional[SortField] = Query(None, description="Field to sort by"),
    sort_direction: Optional[SortDirection] = Query(SortDirection.ASC, description="Sort direction"),
    group_by: Optional[GroupByField] = Query(None, description="Field to group by"),
    group_by_secondary: Optional[GroupByField] = Query(None, description="Secondary field to group by"),
    
    current_user: dict = Depends(require_permission("report:view"))
):
    """Generate salary analysis report showing salary history and current rates"""
    try:
        filters = SalaryReportFilters(
            start_date=start_date,
            end_date=end_date,
            company_id=company_id,
            department=department,
            employee_status=employee_status,
            employee_id=employee_id,
            search_term=search_term,
            pay_type=pay_type,
            min_salary=min_salary,
            max_salary=max_salary,
            effective_date_from=effective_date_from,
            effective_date_to=effective_date_to,
            include_history=include_history,
            sort_by=sort_by,
            sort_direction=sort_direction,
            group_by=group_by,
            group_by_secondary=group_by_secondary
        )
        
        data, summary = report_service.generate_salary_analysis_report(filters)
        
        # Check if data is grouped
        is_grouped = filters.group_by is not None
        
        return SalaryReportResponse(
            success=True,
            data=data,
            summary=summary,
            is_grouped=is_grouped
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating salary analysis report: {str(e)}")

@router.get("/work-permit-status", response_model=WorkPermitReportResponse)
async def get_work_permit_status_report(
    # Common filters
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    company_id: Optional[str] = Query(None, description="Filter by company ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    employee_status: Optional[str] = Query("Active & Probation", description="Filter by employee status"),
    employee_id: Optional[str] = Query(None, description="Filter by specific employee ID"),
    search_term: Optional[str] = Query(None, description="Search term for employee name"),
    
    # Work permit-specific filters
    permit_type: Optional[str] = Query(None, description="Filter by permit type"),
    expiry_days_ahead: Optional[int] = Query(30, description="Days ahead to check for expiring permits"),
    is_expired: Optional[bool] = Query(None, description="Filter by expired status"),
    
    current_user: dict = Depends(require_permission("report:view"))
):
    """Generate work permit status report showing current permits and expiry information"""
    try:
        filters = WorkPermitReportFilters(
            start_date=start_date,
            end_date=end_date,
            company_id=company_id,
            department=department,
            employee_status=employee_status,
            employee_id=employee_id,
            search_term=search_term,
            permit_type=permit_type,
            expiry_days_ahead=expiry_days_ahead,
            is_expired=is_expired
        )
        
        data, summary = report_service.generate_work_permit_status_report(filters)
        
        return WorkPermitReportResponse(
            success=True,
            data=data,
            summary=summary
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating work permit status report: {str(e)}")

@router.get("/comprehensive-overview", response_model=ComprehensiveReportResponse)
async def get_comprehensive_overview_report(
    # Common filters
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    company_id: Optional[str] = Query(None, description="Filter by company ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    employee_status: Optional[str] = Query("Active & Probation", description="Filter by employee status"),
    employee_id: Optional[str] = Query(None, description="Filter by specific employee ID"),
    search_term: Optional[str] = Query(None, description="Search term for employee name"),
    
    # Sort and Group By options
    sort_by: Optional[SortField] = Query(None, description="Field to sort by"),
    sort_direction: Optional[SortDirection] = Query(SortDirection.ASC, description="Sort direction"),
    group_by: Optional[GroupByField] = Query(None, description="Field to group by"),
    group_by_secondary: Optional[GroupByField] = Query(None, description="Secondary field to group by"),
    
    current_user: dict = Depends(require_permission("report:view"))
):
    """Generate comprehensive employee overview report with all related information"""
    try:
        filters = ReportFilterBase(
            start_date=start_date,
            end_date=end_date,
            company_id=company_id,
            department=department,
            employee_status=employee_status,
            employee_id=employee_id,
            search_term=search_term,
            sort_by=sort_by,
            sort_direction=sort_direction,
            group_by=group_by,
            group_by_secondary=group_by_secondary
        )
        
        data, summary = report_service.generate_comprehensive_overview_report(filters)
        
        # Check if data is grouped
        is_grouped = hasattr(data[0], 'group_key') if data else False
        
        return ComprehensiveReportResponse(
            success=True,
            data=data,
            summary=summary,
            is_grouped=is_grouped
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating comprehensive overview report: {str(e)}")

@router.get("/expense-reimbursement", response_model=ExpenseReimbursementReportResponse)
async def get_expense_reimbursement_report(
    # Common filters
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    company_id: Optional[str] = Query(None, description="Filter by company ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    employee_status: Optional[str] = Query("Active & Probation", description="Filter by employee status"),
    employee_id: Optional[str] = Query(None, description="Filter by specific employee ID"),
    search_term: Optional[str] = Query(None, description="Search term for employee name or expense type"),
    
    # Sort and Group By options
    sort_by: Optional[SortField] = Query(None, description="Field to sort by"),
    sort_direction: Optional[SortDirection] = Query(SortDirection.ASC, description="Sort direction"),
    group_by: Optional[GroupByField] = Query(None, description="Field to group by"),
    group_by_secondary: Optional[GroupByField] = Query(None, description="Secondary field to group by"),
    
    current_user: dict = Depends(require_permission("report:view"))
):
    """Generate expense reimbursement report showing all expense claims"""
    try:
        filters = ReportFilterBase(
            start_date=start_date,
            end_date=end_date,
            company_id=company_id,
            department=department,
            employee_status=employee_status,
            employee_id=employee_id,
            search_term=search_term,
            sort_by=sort_by,
            sort_direction=sort_direction,
            group_by=group_by,
            group_by_secondary=group_by_secondary
        )
        
        data, summary = report_service.generate_expense_reimbursement_report(filters)
        
        # Check if data is grouped
        is_grouped = hasattr(data[0], 'group_key') if data else False
        
        return ExpenseReimbursementReportResponse(
            success=True,
            data=data,
            summary=summary,
            is_grouped=is_grouped
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating expense reimbursement report: {str(e)}")

@router.get("/export/{report_type}")
async def export_report(
    report_type: str,
    format: str = Query("json", description="Export format (json, csv)"),
    # Common filters
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    company_id: Optional[str] = Query(None, description="Filter by company ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    employee_status: Optional[str] = Query("Active & Probation", description="Filter by employee status"),
    employee_id: Optional[str] = Query(None, description="Filter by specific employee ID"),
    search_term: Optional[str] = Query(None, description="Search term"),
    
    current_user: dict = Depends(require_permission("report:export"))
):
    """Export report data in various formats"""
    try:
        # Validate report type
        if report_type not in [rt.value for rt in ReportType]:
            raise HTTPException(status_code=400, detail=f"Invalid report type: {report_type}")
        
        # Generate report based on type
        filters = ReportFilterBase(
            start_date=start_date,
            end_date=end_date,
            company_id=company_id,
            department=department,
            employee_status=employee_status,
            employee_id=employee_id,
            search_term=search_term
        )
        
        # Generate the appropriate report
        if report_type == ReportType.EMPLOYEE_DIRECTORY.value:
            data, summary = report_service.generate_employee_directory_report(
                EmployeeReportFilters(**filters.dict())
            )
        elif report_type == ReportType.EMPLOYMENT_HISTORY.value:
            data, summary = report_service.generate_employment_history_report(filters)
        elif report_type == ReportType.LEAVE_BALANCE.value:
            data, summary = report_service.generate_leave_balance_report(filters)
        elif report_type == ReportType.LEAVE_TAKEN.value:
            data, summary = report_service.generate_leave_taken_report(filters)
        elif report_type == ReportType.SALARY_ANALYSIS.value:
            data, summary = report_service.generate_salary_analysis_report(
                SalaryReportFilters(**filters.dict())
            )
        elif report_type == ReportType.WORK_PERMIT_STATUS.value:
            data, summary = report_service.generate_work_permit_status_report(
                WorkPermitReportFilters(**filters.dict())
            )
        elif report_type == ReportType.COMPREHENSIVE_OVERVIEW.value:
            data, summary = report_service.generate_comprehensive_overview_report(filters)
        elif report_type == ReportType.EXPENSE_REIMBURSEMENT.value:
            data, summary = report_service.generate_expense_reimbursement_report(filters)
        else:
            raise HTTPException(status_code=400, detail=f"Report type {report_type} not implemented")
        
        # Format response based on export format
        if format.lower() == "csv":
            # For CSV export, we'll return JSON for now
            # In a full implementation, you would generate actual CSV
            return {
                "success": True,
                "data": data,
                "summary": summary,
                "format": "csv",
                "message": "CSV export functionality will be implemented in the next phase"
            }
        else:
            # Default JSON response
            return {
                "success": True,
                "data": data,
                "summary": summary,
                "format": "json"
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting report: {str(e)}")

@router.get("/types")
async def get_available_report_types(
    current_user: dict = Depends(require_permission("report:view"))
):
    """Get list of available report types"""
    try:
        report_types = [
            {
                "type": ReportType.EMPLOYEE_DIRECTORY.value,
                "name": "Employee Directory",
                "description": "Complete employee listing with contact information and current position"
            },
            {
                "type": ReportType.EMPLOYMENT_HISTORY.value,
                "name": "Employment History",
                "description": "Historical employment records showing job changes and promotions"
            },
            {
                "type": ReportType.LEAVE_BALANCE.value,
                "name": "Leave Balance",
                "description": "Current leave balances for all employees"
            },
            {
                "type": ReportType.LEAVE_TAKEN.value,
                "name": "Leave Taken",
                "description": "Detailed report of all leave requests taken by employees for a specific period"
            },
            {
                "type": ReportType.SALARY_ANALYSIS.value,
                "name": "Salary Analysis",
                "description": "Salary history and current pay rates by position"
            },
            {
                "type": ReportType.WORK_PERMIT_STATUS.value,
                "name": "Work Permit Status",
                "description": "Current work permits and expiry tracking"
            },
            {
                "type": ReportType.COMPREHENSIVE_OVERVIEW.value,
                "name": "Comprehensive Overview",
                "description": "Complete employee profile with all related information"
            },
            {
                "type": ReportType.EXPENSE_REIMBURSEMENT.value,
                "name": "Expense Reimbursement",
                "description": "Detailed report of all expense claims and reimbursements"
            }
        ]
        
        return {
            "success": True,
            "data": report_types
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting report types: {str(e)}")

@router.get("/filters/{report_type}")
async def get_available_filters(
    report_type: str,
    current_user: dict = Depends(require_permission("report:view"))
):
    """Get available filters for a specific report type"""
    try:
        # Define available filters for each report type
        filter_options = {
            ReportType.EMPLOYEE_DIRECTORY.value: {
                "common_filters": [
                    {"name": "company_id", "type": "select", "label": "Company", "description": "Filter by company"},
                    {"name": "department", "type": "text", "label": "Department", "description": "Filter by department"},
                    {"name": "employee_status", "type": "select", "label": "Status", "description": "Employee status", "options": ["Active", "On Leave", "Terminated", "Probation", "Active & Probation", "All"]},
                    {"name": "search_term", "type": "text", "label": "Search", "description": "Search by name or ID"}
                ],
                "specific_filters": [
                    {"name": "include_inactive", "type": "boolean", "label": "Include Inactive", "description": "Include inactive employees"},
                    {"name": "position", "type": "text", "label": "Position", "description": "Filter by position"},
                    {"name": "hire_date_from", "type": "date", "label": "Hire Date From", "description": "Filter by hire date range"},
                    {"name": "hire_date_to", "type": "date", "label": "Hire Date To", "description": "Filter by hire date range"}
                ]
            },
            ReportType.EMPLOYMENT_HISTORY.value: {
                "common_filters": [
                    {"name": "company_id", "type": "select", "label": "Company", "description": "Filter by company"},
                    {"name": "department", "type": "text", "label": "Department", "description": "Filter by department"},
                    {"name": "employee_status", "type": "select", "label": "Status", "description": "Employee status", "options": ["Active", "On Leave", "Terminated", "Probation", "Active & Probation", "All"]},
                    {"name": "search_term", "type": "text", "label": "Search", "description": "Search by name or company"}
                ],
                "specific_filters": [
                    {"name": "start_date", "type": "date", "label": "Start Date", "description": "Filter by employment start date"},
                    {"name": "end_date", "type": "date", "label": "End Date", "description": "Filter by employment end date"}
                ]
            },
            ReportType.LEAVE_BALANCE.value: {
                "common_filters": [
                    {"name": "company_id", "type": "select", "label": "Company", "description": "Filter by company"},
                    {"name": "department", "type": "text", "label": "Department", "description": "Filter by department"},
                    {"name": "employee_status", "type": "select", "label": "Status", "description": "Employee status", "options": ["Active", "On Leave", "Terminated", "Probation", "Active & Probation", "All"]},
                    {"name": "search_term", "type": "text", "label": "Search", "description": "Search by employee name"}
                ],
                "specific_filters": []
            },
            ReportType.LEAVE_TAKEN.value: {
                "common_filters": [
                    {"name": "company_id", "type": "select", "label": "Company", "description": "Filter by company"},
                    {"name": "department", "type": "text", "label": "Department", "description": "Filter by department"},
                    {"name": "employee_status", "type": "select", "label": "Status", "description": "Employee status", "options": ["Active", "On Leave", "Terminated", "Probation", "Active & Probation", "All"]},
                    {"name": "search_term", "type": "text", "label": "Search", "description": "Search by employee name or leave type"}
                ],
                "specific_filters": [
                    {"name": "start_date", "type": "date", "label": "Start Date", "description": "Filter leave requests from this date"},
                    {"name": "end_date", "type": "date", "label": "End Date", "description": "Filter leave requests until this date"}
                ]
            },
            ReportType.SALARY_ANALYSIS.value: {
                "common_filters": [
                    {"name": "company_id", "type": "select", "label": "Company", "description": "Filter by company"},
                    {"name": "department", "type": "text", "label": "Department", "description": "Filter by department"},
                    {"name": "employee_status", "type": "select", "label": "Status", "description": "Employee status", "options": ["Active", "On Leave", "Terminated", "Probation", "Active & Probation", "All"]},
                    {"name": "search_term", "type": "text", "label": "Search", "description": "Search by employee name"}
                ],
                "specific_filters": [
                    {"name": "pay_type", "type": "select", "label": "Pay Type", "description": "Filter by pay type", "options": ["Hourly", "Monthly", "Annual"]},
                    {"name": "min_salary", "type": "number", "label": "Min Salary", "description": "Minimum salary filter"},
                    {"name": "max_salary", "type": "number", "label": "Max Salary", "description": "Maximum salary filter"},
                    {"name": "effective_date_from", "type": "date", "label": "Effective Date From", "description": "Filter by salary effective date"},
                    {"name": "effective_date_to", "type": "date", "label": "Effective Date To", "description": "Filter by salary effective date"},
                    {"name": "include_history", "type": "boolean", "label": "Generate History", "description": "Show all salary history records (unchecked shows only latest per employee)"}
                ]
            },
            ReportType.WORK_PERMIT_STATUS.value: {
                "common_filters": [
                    {"name": "company_id", "type": "select", "label": "Company", "description": "Filter by company"},
                    {"name": "department", "type": "text", "label": "Department", "description": "Filter by department"},
                    {"name": "employee_status", "type": "select", "label": "Status", "description": "Employee status", "options": ["Active", "On Leave", "Terminated", "Probation", "Active & Probation", "All"]},
                    {"name": "search_term", "type": "text", "label": "Search", "description": "Search by employee name"}
                ],
                "specific_filters": [
                    {"name": "permit_type", "type": "text", "label": "Permit Type", "description": "Filter by permit type"},
                    {"name": "expiry_days_ahead", "type": "number", "label": "Expiry Days Ahead", "description": "Days ahead to check for expiring permits"},
                    {"name": "is_expired", "type": "boolean", "label": "Show Expired Only", "description": "Show only expired permits"}
                ]
            },
            ReportType.COMPREHENSIVE_OVERVIEW.value: {
                "common_filters": [
                    {"name": "company_id", "type": "select", "label": "Company", "description": "Filter by company"},
                    {"name": "department", "type": "text", "label": "Department", "description": "Filter by department"},
                    {"name": "employee_status", "type": "select", "label": "Status", "description": "Employee status", "options": ["Active", "On Leave", "Terminated", "Probation", "Active & Probation", "All"]},
                    {"name": "search_term", "type": "text", "label": "Search", "description": "Search by employee name"}
                ],
                "specific_filters": []
            },
            ReportType.EXPENSE_REIMBURSEMENT.value: {
                "common_filters": [
                    {"name": "company_id", "type": "select", "label": "Company", "description": "Filter by company"},
                    {"name": "department", "type": "text", "label": "Department", "description": "Filter by department"},
                    {"name": "employee_status", "type": "select", "label": "Status", "description": "Employee status", "options": ["Active", "On Leave", "Terminated", "Probation", "Active & Probation", "All"]},
                    {"name": "search_term", "type": "text", "label": "Search", "description": "Search by employee name or expense type"}
                ],
                "specific_filters": [
                    {"name": "start_date", "type": "date", "label": "Start Date", "description": "Filter expense claims from this date"},
                    {"name": "end_date", "type": "date", "label": "End Date", "description": "Filter expense claims until this date"}
                ]
            }
        }
        
        if report_type not in filter_options:
            raise HTTPException(status_code=400, detail=f"Invalid report type: {report_type}")
        
        return {
            "success": True,
            "data": filter_options[report_type]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting filter options: {str(e)}")
