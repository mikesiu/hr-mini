"""
Filter validation utilities for HR Reports
Provides validation and error handling for report filters
"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import date, datetime
from enum import Enum

class ReportType(Enum):
    EMPLOYEE_DIRECTORY = "employee_directory"
    EMPLOYMENT_HISTORY = "employment_history"
    LEAVE_BALANCE = "leave_balance"
    LEAVE_TAKEN = "leave_taken"
    SALARY_ANALYSIS = "salary_analysis"
    WORK_PERMIT_STATUS = "work_permit_status"
    COMPREHENSIVE_OVERVIEW = "comprehensive_overview"

class FilterValidationResult:
    def __init__(self, is_valid: bool, errors: List[str], warnings: List[str], applicable_filters: List[str]):
        self.is_valid = is_valid
        self.errors = errors
        self.warnings = warnings
        self.applicable_filters = applicable_filters

# Define which filters are applicable to which report types
FILTER_APPLICABILITY = {
    # Common filters (apply to all reports)
    "company_id": [ReportType.EMPLOYEE_DIRECTORY, ReportType.EMPLOYMENT_HISTORY, ReportType.LEAVE_BALANCE, 
                   ReportType.LEAVE_TAKEN, ReportType.SALARY_ANALYSIS, ReportType.WORK_PERMIT_STATUS, 
                   ReportType.COMPREHENSIVE_OVERVIEW],
    "department": [ReportType.EMPLOYEE_DIRECTORY, ReportType.EMPLOYMENT_HISTORY, ReportType.LEAVE_BALANCE, 
                   ReportType.LEAVE_TAKEN, ReportType.SALARY_ANALYSIS, ReportType.WORK_PERMIT_STATUS, 
                   ReportType.COMPREHENSIVE_OVERVIEW],
    "employee_status": [ReportType.EMPLOYEE_DIRECTORY, ReportType.EMPLOYMENT_HISTORY, ReportType.LEAVE_BALANCE, 
                        ReportType.LEAVE_TAKEN, ReportType.SALARY_ANALYSIS, ReportType.WORK_PERMIT_STATUS, 
                        ReportType.COMPREHENSIVE_OVERVIEW],
    "search_term": [ReportType.EMPLOYEE_DIRECTORY, ReportType.EMPLOYMENT_HISTORY, ReportType.LEAVE_BALANCE, 
                    ReportType.LEAVE_TAKEN, ReportType.SALARY_ANALYSIS, ReportType.WORK_PERMIT_STATUS, 
                    ReportType.COMPREHENSIVE_OVERVIEW],
    
    # Universal sorting and grouping filters (apply to all reports)
    "sort_by": [ReportType.EMPLOYEE_DIRECTORY, ReportType.EMPLOYMENT_HISTORY, ReportType.LEAVE_BALANCE, 
                ReportType.LEAVE_TAKEN, ReportType.SALARY_ANALYSIS, ReportType.WORK_PERMIT_STATUS, 
                ReportType.COMPREHENSIVE_OVERVIEW],
    "sort_direction": [ReportType.EMPLOYEE_DIRECTORY, ReportType.EMPLOYMENT_HISTORY, ReportType.LEAVE_BALANCE, 
                       ReportType.LEAVE_TAKEN, ReportType.SALARY_ANALYSIS, ReportType.WORK_PERMIT_STATUS, 
                       ReportType.COMPREHENSIVE_OVERVIEW],
    "group_by": [ReportType.EMPLOYEE_DIRECTORY, ReportType.EMPLOYMENT_HISTORY, ReportType.LEAVE_BALANCE, 
                 ReportType.LEAVE_TAKEN, ReportType.SALARY_ANALYSIS, ReportType.WORK_PERMIT_STATUS, 
                 ReportType.COMPREHENSIVE_OVERVIEW],
    "group_by_secondary": [ReportType.EMPLOYEE_DIRECTORY, ReportType.EMPLOYMENT_HISTORY, ReportType.LEAVE_BALANCE, 
                           ReportType.LEAVE_TAKEN, ReportType.SALARY_ANALYSIS, ReportType.WORK_PERMIT_STATUS, 
                           ReportType.COMPREHENSIVE_OVERVIEW],
    
    # Employee Directory specific filters
    "include_inactive": [ReportType.EMPLOYEE_DIRECTORY],
    "position": [ReportType.EMPLOYEE_DIRECTORY],
    "hire_date_from": [ReportType.EMPLOYEE_DIRECTORY],
    "hire_date_to": [ReportType.EMPLOYEE_DIRECTORY],
    
    # Employment History and Leave Taken specific filters
    "start_date": [ReportType.EMPLOYMENT_HISTORY, ReportType.LEAVE_TAKEN],
    "end_date": [ReportType.EMPLOYMENT_HISTORY, ReportType.LEAVE_TAKEN],
    
    # Salary Analysis specific filters
    "pay_type": [ReportType.SALARY_ANALYSIS],
    "min_salary": [ReportType.SALARY_ANALYSIS],
    "max_salary": [ReportType.SALARY_ANALYSIS],
    "effective_date_from": [ReportType.SALARY_ANALYSIS],
    "effective_date_to": [ReportType.SALARY_ANALYSIS],
    
    # Work Permit specific filters
    "permit_type": [ReportType.WORK_PERMIT_STATUS],
    "expiry_days_ahead": [ReportType.WORK_PERMIT_STATUS],
    "is_expired": [ReportType.WORK_PERMIT_STATUS],
}

def validate_filters(filters: Dict[str, Any], report_type: str) -> FilterValidationResult:
    """
    Validate filters for a specific report type
    
    Args:
        filters: Dictionary of filter values
        report_type: The report type to validate against
        
    Returns:
        FilterValidationResult with validation status and messages
    """
    errors = []
    warnings = []
    
    try:
        report_type_enum = ReportType(report_type)
    except ValueError:
        errors.append(f"Invalid report type: {report_type}")
        return FilterValidationResult(False, errors, warnings, [])
    
    # Get applicable filters for this report type
    applicable_filters = [
        filter_name for filter_name, applicable_types in FILTER_APPLICABILITY.items()
        if report_type_enum in applicable_types
    ]
    
    # Check for invalid filters (not applicable to this report type)
    for filter_name, filter_value in filters.items():
        if filter_value is not None and filter_value != '' and filter_value != []:
            if filter_name not in applicable_filters:
                warnings.append(f"Filter '{filter_name}' is not applicable to {report_type.replace('_', ' ')} reports")
    
    # Validate filter values
    for filter_name, filter_value in filters.items():
        if filter_value is not None and filter_value != '' and filter_value != []:
            if filter_name in applicable_filters:
                # Validate based on filter type
                validation_error = _validate_filter_value(filter_name, filter_value)
                if validation_error:
                    errors.append(validation_error)
    
    # Check for required filters
    required_filters = _get_required_filters(report_type_enum)
    for required_filter in required_filters:
        if required_filter not in filters or filters[required_filter] is None or filters[required_filter] == '':
            errors.append(f"Required filter '{required_filter}' is missing")
    
    # Check for dependent filters
    dependent_filters = _get_dependent_filters(report_type_enum)
    for filter_name, dependencies in dependent_filters.items():
        if filter_name in filters and filters[filter_name] is not None and filters[filter_name] != '':
            has_dependency = any(
                dep in filters and filters[dep] is not None and filters[dep] != ''
                for dep in dependencies
            )
            if not has_dependency:
                warnings.append(f"Filter '{filter_name}' requires one of: {', '.join(dependencies)}")
    
    return FilterValidationResult(
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        applicable_filters=applicable_filters
    )

def _validate_filter_value(filter_name: str, filter_value: Any) -> Optional[str]:
    """Validate a specific filter value"""
    
    # Date filters
    if filter_name.endswith('_date') or filter_name in ['start_date', 'end_date', 'hire_date_from', 'hire_date_to', 'effective_date_from', 'effective_date_to']:
        if isinstance(filter_value, str):
            try:
                datetime.fromisoformat(filter_value)
            except ValueError:
                return f"Filter '{filter_name}' must be a valid date (YYYY-MM-DD format)"
        elif not isinstance(filter_value, (date, datetime)):
            return f"Filter '{filter_name}' must be a valid date"
    
    # Number filters
    elif filter_name in ['min_salary', 'max_salary', 'expiry_days_ahead', 'days_requested']:
        try:
            float(filter_value)
        except (ValueError, TypeError):
            return f"Filter '{filter_name}' must be a valid number"
    
    # Boolean filters
    elif filter_name in ['include_inactive', 'is_expired']:
        if not isinstance(filter_value, bool):
            return f"Filter '{filter_name}' must be a boolean value"
    
    # Select filters with specific options
    elif filter_name == 'employee_status':
        valid_statuses = ['Active', 'On Leave', 'Terminated', 'Probation', 'Active & Probation', 'All']
        if filter_value not in valid_statuses:
            return f"Filter '{filter_name}' must be one of: {', '.join(valid_statuses)}"
    
    elif filter_name == 'pay_type':
        valid_pay_types = ['Hourly', 'Monthly', 'Annual']
        if filter_value not in valid_pay_types:
            return f"Filter '{filter_name}' must be one of: {', '.join(valid_pay_types)}"
    
    elif filter_name == 'sort_direction':
        valid_directions = ['asc', 'desc']
        if filter_value not in valid_directions:
            return f"Filter '{filter_name}' must be one of: {', '.join(valid_directions)}"
    
    elif filter_name == 'sort_by':
        # Validate sort field
        valid_sort_fields = [
            'employee_name', 'employee_id', 'company_name', 'department', 'position', 'status', 'hire_date',
            'start_date', 'end_date', 'duration', 'pay_rate', 'effective_date', 'leave_type', 'leave_type_code',
            'leave_type_name', 'days_requested', 'days_taken', 'vacation_days', 'sick_days', 'created_at',
            'updated_at', 'permit_type', 'expiry_date', 'days_until_expiry', 'expense_type', 'amount', 'paid_date'
        ]
        if filter_value and filter_value not in valid_sort_fields:
            return f"Filter '{filter_name}' must be one of: {', '.join(valid_sort_fields[:10])}..."
    
    elif filter_name in ['group_by', 'group_by_secondary']:
        # Validate group field
        valid_group_fields = [
            'employee', 'company', 'department', 'position', 'status', 'employment_period',
            'pay_type', 'salary_range', 'leave_type', 'leave_status', 'permit_type',
            'expiry_status', 'expense_type', 'claim_status'
        ]
        if filter_value and filter_value not in valid_group_fields:
            return f"Filter '{filter_name}' must be one of: {', '.join(valid_group_fields[:10])}..."
    
    return None

def _get_required_filters(report_type: ReportType) -> List[str]:
    """Get list of required filters for a report type"""
    # Currently no filters are strictly required
    # This can be extended in the future
    return []

def _get_dependent_filters(report_type: ReportType) -> Dict[str, List[str]]:
    """Get list of dependent filters for a report type"""
    # Currently no filters have dependencies
    # This can be extended in the future
    return {}

def is_filter_applicable(filter_name: str, report_type: str) -> bool:
    """Check if a filter is applicable to a report type"""
    try:
        report_type_enum = ReportType(report_type)
        return report_type_enum in FILTER_APPLICABILITY.get(filter_name, [])
    except ValueError:
        return False

def get_applicable_filters(report_type: str) -> List[str]:
    """Get list of filters applicable to a report type"""
    try:
        report_type_enum = ReportType(report_type)
        return [
            filter_name for filter_name, applicable_types in FILTER_APPLICABILITY.items()
            if report_type_enum in applicable_types
        ]
    except ValueError:
        return []
