"""
Report Service for HR System
Handles data aggregation and filtering for various report types
"""

from typing import List, Dict, Any, Optional, Tuple, Union
from datetime import date, datetime, timedelta

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

# Import existing repository functions to avoid SQLAlchemy conflicts
from repos.employee_repo import search_employees, get_employee
from repos.employment_repo import search_employments, get_employment_history
from repos.company_repo import get_all_companies
from repos.salary_history_repo import search_salary_records
from repos.work_permit_repo import search_work_permits

from schemas_reports import (
    ReportFilterBase, EmployeeReportFilters, LeaveReportFilters, 
    SalaryReportFilters, ExpenseReportFilters, WorkPermitReportFilters,
    ReportSummary, EmployeeReportData, EmploymentReportData, 
    LeaveReportData, LeaveBalanceData, LeaveTakenData, SalaryReportData, 
    ExpenseReportData, WorkPermitReportData, ComprehensiveReportData,
    GroupedReportData, GroupedReportResponse, SortField, SortDirection, GroupByField
)


class ReportService:
    """Service class for generating various HR reports"""
    
    def __init__(self):
        pass
    
    def _get_sort_field_name(self, sort_by: SortField, data: List[Dict[str, Any]]) -> str:
        """Get the actual field name to use for sorting based on the data structure"""
        if not data:
            return sort_by.value
        
        # Check the first record to determine the data structure
        first_record = data[0]
        
        # Map SortField enum values to actual field names based on data structure
        if sort_by == SortField.EMPLOYEE_NAME:
            # Check if the data has 'full_name' (EmployeeReportData) or 'employee_name' (other reports)
            if 'full_name' in first_record:
                return 'full_name'
            elif 'employee_name' in first_record:
                return 'employee_name'
            else:
                return 'employee_name'  # Default fallback
        
        elif sort_by == SortField.EMPLOYEE_ID:
            # Check if the data has 'id' (EmployeeReportData) or 'employee_id' (other reports)
            if 'id' in first_record:
                return 'id'
            elif 'employee_id' in first_record:
                return 'employee_id'
            else:
                return 'employee_id'  # Default fallback
        
        elif sort_by == SortField.DURATION:
            # Map duration to the appropriate field name
            if 'duration_days' in first_record:
                return 'duration_days'
            else:
                return 'duration'
        
        elif sort_by == SortField.LEAVE_TYPE:
            # Map leave type to the appropriate field name
            if 'leave_type_name' in first_record:
                return 'leave_type_name'
            elif 'leave_type' in first_record:
                return 'leave_type'
            else:
                return 'leave_type_name'
        
        # For all other fields, use the enum value directly
        return sort_by.value
    
    def _sort_data(self, data: List[Dict[str, Any]], sort_by: Optional[SortField], sort_direction: SortDirection) -> List[Dict[str, Any]]:
        """Sort data based on sort field and direction"""
        if not sort_by or not data:
            return data
        
        # Get the actual field name to use for sorting
        actual_field = self._get_sort_field_name(sort_by, data)
        
        # Helper function to get field value from either dict or Pydantic model
        def get_field_value(record, field_name):
            if hasattr(record, 'get') and callable(getattr(record, 'get')):
                # It's a dictionary
                return record.get(field_name)
            else:
                # It's a Pydantic model or object with attributes
                return getattr(record, field_name, None)
        
        def get_sort_key(record):
            field_value = get_field_value(record, actual_field)
            if field_value is None:
                return ""
            
            # Handle different data types for sorting
            if isinstance(field_value, (int, float)):
                return field_value
            elif isinstance(field_value, (date, datetime)):
                return field_value
            else:
                return str(field_value).lower()
        
        try:
            sorted_data = sorted(data, key=get_sort_key, reverse=(sort_direction == SortDirection.DESC))
            return sorted_data
        except Exception as e:
            print(f"Error sorting data: {e}")
            return data
    
    def _group_data(self, data: List[Dict[str, Any]], group_by: Optional[GroupByField], group_by_secondary: Optional[GroupByField] = None) -> List[GroupedReportData]:
        """Group data based on group by field(s)"""
        if not group_by or not data:
            return []
        
        # Map GroupByField enum values to actual field names in the data
        field_mapping = {
            GroupByField.EMPLOYEE: "employee_name",  # Use employee_name for grouping by employee
            GroupByField.COMPANY: "company_name",
            GroupByField.DEPARTMENT: "department",
            GroupByField.POSITION: "position",
            GroupByField.STATUS: "status",
            GroupByField.PAY_TYPE: "pay_type",
            GroupByField.LEAVE_TYPE: "leave_type_name",  # Use leave_type_name for grouping by leave type
            GroupByField.LEAVE_STATUS: "status",
            GroupByField.PERMIT_TYPE: "permit_type",
            GroupByField.EXPIRY_STATUS: "is_expired",
            GroupByField.EXPENSE_TYPE: "expense_type",
            GroupByField.CLAIM_STATUS: "status",
        }
        
        # Get the actual field name to use for grouping
        actual_field = field_mapping.get(group_by, group_by.value)
        
        # Helper function to get field value from either dict or Pydantic model
        def get_field_value(record, field_name):
            if hasattr(record, 'get') and callable(getattr(record, 'get')):
                # It's a dictionary
                return record.get(field_name, "Unknown")
            else:
                # It's a Pydantic model or object with attributes
                return getattr(record, field_name, "Unknown")
        
        # Primary grouping
        groups = {}
        for record in data:
            group_key = get_field_value(record, actual_field)
            if group_key not in groups:
                groups[group_key] = []
            groups[group_key].append(record)
        
        grouped_data = []
        for group_key, records in groups.items():
            # Convert Pydantic models to dictionaries for GroupedReportData
            records_as_dicts = []
            for record in records:
                if hasattr(record, 'dict') and callable(getattr(record, 'dict')):
                    # It's a Pydantic model
                    records_as_dicts.append(record.dict())
                elif hasattr(record, 'model_dump') and callable(getattr(record, 'model_dump')):
                    # It's a newer Pydantic model (v2)
                    records_as_dicts.append(record.model_dump())
                else:
                    # It's already a dictionary
                    records_as_dicts.append(record)
            
            # Secondary grouping if specified
            subgroups = None
            if group_by_secondary:
                subgroups = self._group_data(records_as_dicts, group_by_secondary)
            
            # Calculate group summary
            group_summary = self._calculate_group_summary(records_as_dicts, group_by)
            
            grouped_data.append(GroupedReportData(
                group_key=group_by.value,
                group_value=str(group_key),
                group_count=len(records_as_dicts),
                records=records_as_dicts if not group_by_secondary else [],
                subgroups=subgroups,
                group_summary=group_summary
            ))
        
        # Sort groups by group value (alphabetically by default)
        grouped_data.sort(key=lambda x: str(x.group_value).lower())
        return grouped_data
    
    def _calculate_group_summary(self, records: List[Dict[str, Any]], group_by: GroupByField) -> Dict[str, Any]:
        """Calculate summary statistics for a group"""
        if not records:
            return {}
        
        # Map GroupByField enum values to actual field names in the data
        field_mapping = {
            GroupByField.EMPLOYEE: "employee_name",  # Use employee_name for grouping by employee
            GroupByField.COMPANY: "company_name",
            GroupByField.DEPARTMENT: "department",
            GroupByField.POSITION: "position",
            GroupByField.STATUS: "status",
            GroupByField.PAY_TYPE: "pay_type",
            GroupByField.LEAVE_TYPE: "leave_type_name",  # Use leave_type_name for grouping by leave type
            GroupByField.LEAVE_STATUS: "status",
            GroupByField.PERMIT_TYPE: "permit_type",
            GroupByField.EXPIRY_STATUS: "is_expired",
            GroupByField.EXPENSE_TYPE: "expense_type",
            GroupByField.CLAIM_STATUS: "status",
        }
        
        actual_field = field_mapping.get(group_by, group_by.value)
        
        # Helper function to get field value from either dict or Pydantic model
        def get_field_value(record, field_name, default=None):
            if hasattr(record, 'get') and callable(getattr(record, 'get')):
                # It's a dictionary
                return record.get(field_name, default)
            else:
                # It's a Pydantic model or object with attributes
                return getattr(record, field_name, default)
        
        summary = {
            "count": len(records),
            "group_field": actual_field
        }
        
        # Add specific summaries based on group type
        if group_by == GroupByField.COMPANY:
            summary["unique_departments"] = len(set(get_field_value(r, "department", "") for r in records if get_field_value(r, "department")))
            summary["unique_positions"] = len(set(get_field_value(r, "position", "") for r in records if get_field_value(r, "position")))
        elif group_by == GroupByField.DEPARTMENT:
            summary["unique_positions"] = len(set(get_field_value(r, "position", "") for r in records if get_field_value(r, "position")))
            summary["unique_companies"] = len(set(get_field_value(r, "company_name", "") for r in records if get_field_value(r, "company_name")))
        elif group_by == GroupByField.EMPLOYEE:
            # For employee grouping, calculate totals
            pay_rates = [get_field_value(r, "pay_rate", 0) for r in records if isinstance(get_field_value(r, "pay_rate"), (int, float))]
            summary["total_salary"] = sum(pay_rates)
            summary["avg_salary"] = summary["total_salary"] / len(records) if records else 0
        elif group_by == GroupByField.PAY_TYPE:
            summary["total_employees"] = len(records)
            pay_rates = [get_field_value(r, "pay_rate", 0) for r in records if isinstance(get_field_value(r, "pay_rate"), (int, float))]
            summary["avg_pay_rate"] = sum(pay_rates) / len(records) if records else 0
        
        return summary
    
    def _calculate_duration_days(self, start_date: date, end_date: Optional[date]) -> Optional[int]:
        """Calculate duration in days between two dates"""
        if not start_date:
            return None
        if end_date:
            return (end_date - start_date).days
        else:
            return (date.today() - start_date).days
    
    def _filter_employees_by_company(self, employees: List, company_id: str) -> List:
        """Filter employees by company using employment data"""
        filtered = []
        for emp in employees:
            # Get current employment for this employee
            employment_history = get_employment_history(emp.id)
            current_employment = None
            for emp_record in employment_history:
                if emp_record.end_date is None:  # Current employment
                    current_employment = emp_record
                    break
            
            if current_employment and current_employment.company_id == company_id:
                filtered.append(emp)
        return filtered
    
    def _filter_employees_by_department(self, employees: List, department: str) -> List:
        """Filter employees by department using employment data"""
        filtered = []
        for emp in employees:
            # Get current employment for this employee
            employment_history = get_employment_history(emp.id)
            current_employment = None
            for emp_record in employment_history:
                if emp_record.end_date is None:  # Current employment
                    current_employment = emp_record
                    break
            
            if current_employment and current_employment.department == department:
                filtered.append(emp)
        return filtered
    
    def generate_employee_directory_report(self, filters: EmployeeReportFilters) -> Tuple[List[EmployeeReportData], ReportSummary]:
        """Generate employee directory report"""
        try:
            # Get all employees using the existing repository function
            employees = search_employees(filters.search_term or "")
            
            # Apply filters
            if filters.employee_id:
                employees = [emp for emp in employees if emp.id == filters.employee_id]
            
            if filters.employee_status and filters.employee_status != "All":
                if filters.employee_status == "Active & Probation":
                    # Show both Active and Probation employees
                    employees = [emp for emp in employees if emp.status in ["Active", "Probation"]]
                else:
                    employees = [emp for emp in employees if emp.status == filters.employee_status]
            elif filters.employee_status == "All":
                # Show all employees regardless of status
                pass
            elif not filters.include_inactive:
                employees = [emp for emp in employees if emp.status == "Active"]
            
            # Apply company filter
            if filters.company_id:
                employees = self._filter_employees_by_company(employees, filters.company_id)
            
            # Apply department filter
            if filters.department:
                employees = self._filter_employees_by_department(employees, filters.department)
            
            # Apply hire date filters
            if filters.hire_date_from:
                employees = [emp for emp in employees if emp.hire_date and emp.hire_date >= filters.hire_date_from]
            if filters.hire_date_to:
                employees = [emp for emp in employees if emp.hire_date and emp.hire_date <= filters.hire_date_to]
            
            # Convert to report data
            report_data = []
            for employee in employees:
                # Get current employment information
                employment_history = get_employment_history(employee.id)
                current_employment = None
                for emp_record in employment_history:
                    if emp_record.end_date is None:  # Current employment
                        current_employment = emp_record
                        break
                
                # Get company information
                company_name = None
                if current_employment:
                    companies = get_all_companies()
                    for company in companies:
                        if company.id == current_employment.company_id:
                            company_name = company.legal_name
                            break
                
                # Apply position filter if specified
                if filters.position and current_employment:
                    if filters.position.lower() not in current_employment.position.lower():
                        continue
                
                report_data.append(EmployeeReportData(
                    id=employee.id,
                    full_name=employee.full_name,
                    first_name=employee.first_name,
                    last_name=employee.last_name,
                    email=employee.email,
                    phone=employee.phone,
                    status=employee.status,
                    hire_date=employee.hire_date,
                    position=current_employment.position if current_employment else None,
                    department=current_employment.department if current_employment else None,
                    company_name=company_name,
                    city=employee.city,
                    province=employee.province
                ))
            
            # Convert to dict format for sorting and grouping
            data_dicts = [item.dict() for item in report_data]
            
            # Apply sorting
            if filters.sort_by:
                sort_direction = filters.sort_direction if filters.sort_direction is not None else SortDirection.ASC
                data_dicts = self._sort_data(data_dicts, filters.sort_by, sort_direction)
            
            # Apply grouping if specified
            if filters.group_by:
                grouped_data = self._group_data(data_dicts, filters.group_by, filters.group_by_secondary)
                # Keep records as dictionaries for GroupedReportData
                # (GroupedReportData expects records to be dictionaries, not objects)
                
                # Generate summary with grouping info
                summary = ReportSummary(
                    total_records=len(report_data),
                    total_pages=1,
                    current_page=1,
                    generated_at=datetime.now(),
                    filters_applied=filters.dict(exclude_none=True),
                    sort_applied={"field": filters.sort_by.value, "direction": filters.sort_direction.value} if filters.sort_by else None,
                    group_by_applied=[filters.group_by.value] + ([filters.group_by_secondary.value] if filters.group_by_secondary else [])
                )
                
                return grouped_data, summary
            else:
                # No grouping, return sorted data
                sorted_data = [EmployeeReportData(**record) for record in data_dicts]
                
                # Generate summary
                summary = ReportSummary(
                    total_records=len(sorted_data),
                    total_pages=1,
                    current_page=1,
                    generated_at=datetime.now(),
                    filters_applied=filters.dict(exclude_none=True),
                    sort_applied={"field": filters.sort_by.value, "direction": filters.sort_direction.value} if filters.sort_by else None
                )
                
                return sorted_data, summary
            
        except Exception as e:
            print(f"Error generating employee directory report: {e}")
            return [], ReportSummary(
                total_records=0,
                total_pages=0,
                current_page=1,
                generated_at=datetime.now(),
                filters_applied={}
            )
    
    def generate_employment_history_report(self, filters: ReportFilterBase) -> Tuple[List[EmploymentReportData], ReportSummary]:
        """Generate employment history report"""
        try:
            # Get employment data using the existing repository function
            employment_data = search_employments(filters.search_term or "")
            
            # Convert to report data
            report_data = []
            for emp_data in employment_data:
                employment = emp_data["employment"]
                employee = emp_data["employee"]
                company = emp_data["company"]
                
                # Apply filters
                if filters.company_id and employment.company_id != filters.company_id:
                    continue
                if filters.department and employment.department != filters.department:
                    continue
                if filters.employee_status and filters.employee_status != "All":
                    if filters.employee_status == "Active & Probation":
                        if employee.status not in ["Active", "Probation"]:
                            continue
                    elif employee.status != filters.employee_status:
                        continue
                if filters.employee_id and employee.id != filters.employee_id:
                    continue
                
                # Date range filters
                if filters.start_date and employment.start_date < filters.start_date:
                    continue
                if filters.end_date:
                    if employment.end_date and employment.end_date > filters.end_date:
                        continue
                
                duration_days = self._calculate_duration_days(employment.start_date, employment.end_date)
                
                report_data.append(EmploymentReportData(
                    employee_id=employee.id,
                    employee_name=employee.full_name,
                    company_name=company.legal_name,
                    position=employment.position,
                    department=employment.department,
                    start_date=employment.start_date,
                    end_date=employment.end_date,
                    is_active=employment.end_date is None,
                    duration_days=duration_days
                ))
            
            # Convert to dict format for sorting and grouping
            data_dicts = [item.dict() for item in report_data]
            
            # Apply sorting
            if filters.sort_by:
                sort_direction = filters.sort_direction if filters.sort_direction is not None else SortDirection.ASC
                data_dicts = self._sort_data(data_dicts, filters.sort_by, sort_direction)
            else:
                # Default sort by start date descending
                data_dicts.sort(key=lambda x: x.get('start_date', ''), reverse=True)
            
            # Apply grouping if specified
            if filters.group_by:
                grouped_data = self._group_data(data_dicts, filters.group_by, filters.group_by_secondary)
                # Keep records as dictionaries for GroupedReportData
                # (GroupedReportData expects records to be dictionaries, not objects)
                
                # Generate summary with grouping info
                summary = ReportSummary(
                    total_records=len(report_data),
                    total_pages=1,
                    current_page=1,
                    generated_at=datetime.now(),
                    filters_applied=filters.dict(exclude_none=True),
                    sort_applied={"field": filters.sort_by.value, "direction": filters.sort_direction.value} if filters.sort_by else None,
                    group_by_applied=[filters.group_by.value] + ([filters.group_by_secondary.value] if filters.group_by_secondary else [])
                )
                
                return grouped_data, summary
            else:
                # No grouping, return sorted data
                sorted_data = [EmploymentReportData(**record) for record in data_dicts]
                
                # Generate summary
                summary = ReportSummary(
                    total_records=len(sorted_data),
                    total_pages=1,
                    current_page=1,
                    generated_at=datetime.now(),
                    filters_applied=filters.dict(exclude_none=True),
                    sort_applied={"field": filters.sort_by.value, "direction": filters.sort_direction.value} if filters.sort_by else None
                )
                
                return sorted_data, summary
            
        except Exception as e:
            print(f"Error generating employment history report: {e}")
            return [], ReportSummary(
                total_records=0,
                total_pages=0,
                current_page=1,
                generated_at=datetime.now(),
                filters_applied={}
            )
    
    def generate_leave_balance_report(self, filters: ReportFilterBase) -> Tuple[List[LeaveBalanceData], ReportSummary]:
        """Generate leave balance report"""
        try:
            # Get all employees using the existing repository function
            employees = search_employees(filters.search_term or "")
            
            # Apply basic filters
            if filters.employee_id:
                employees = [emp for emp in employees if emp.id == filters.employee_id]
            
            if filters.employee_status and filters.employee_status != "All":
                if filters.employee_status == "Active & Probation":
                    # Show both Active and Probation employees
                    employees = [emp for emp in employees if emp.status in ["Active", "Probation"]]
                else:
                    employees = [emp for emp in employees if emp.status == filters.employee_status]
            elif filters.employee_status == "All":
                # Show all employees regardless of status
                pass
            else:
                # Default to active employees for leave balance if no status specified
                employees = [emp for emp in employees if emp.status == "Active"]
            
            # Apply company and department filters
            if filters.company_id:
                employees = self._filter_employees_by_company(employees, filters.company_id)
            if filters.department:
                employees = self._filter_employees_by_department(employees, filters.department)
            
            # Import leave service functions for calculating balances
            from services.leave_service import (
                get_vacation_remaining,
                get_sick_remaining,
                calculate_vacation_entitlement
            )
            from repos.employee_repo_ext import is_employee_eligible_for_sick_leave
            
            # Convert to report data
            report_data = []
            today = date.today()
            
            for employee in employees:
                try:
                    # Calculate vacation balance - use seniority_start_date if available, otherwise hire_date
                    seniority_date = employee.seniority_start_date if hasattr(employee, 'seniority_start_date') and employee.seniority_start_date else employee.hire_date
                    vacation_entitlement = calculate_vacation_entitlement(seniority_date, today) if seniority_date else 0.0
                    vacation_remaining = get_vacation_remaining(employee.id, seniority_date, today) if seniority_date else 0.0
                    vacation_taken = vacation_entitlement - vacation_remaining if vacation_entitlement >= vacation_remaining else 0.0
                    
                    # Calculate sick leave balance
                    sick_remaining = get_sick_remaining(employee.id, today)
                    sick_entitlement = 5.0 if is_employee_eligible_for_sick_leave(employee.id, today) else 0.0
                    sick_taken = sick_entitlement - sick_remaining if sick_entitlement >= sick_remaining else 0.0
                    
                    report_data.append(LeaveBalanceData(
                        employee_id=employee.id,
                        employee_name=employee.full_name,
                        # Vacation details
                        vacation_entitlement=vacation_entitlement,
                        vacation_taken=vacation_taken,
                        vacation_balance=vacation_remaining,
                        # Sick leave details
                        sick_entitlement=sick_entitlement,
                        sick_taken=sick_taken,
                        sick_balance=sick_remaining,
                        # Legacy fields
                        vacation_days=vacation_remaining,
                        sick_days=sick_remaining,
                        personal_days=0.0,
                        total_used=vacation_taken + sick_taken,
                        total_remaining=vacation_remaining + sick_remaining
                    ))
                except Exception as e:
                    # If calculation fails for an employee, use zeros
                    print(f"Error calculating leave balance for employee {employee.id}: {e}")
                    report_data.append(LeaveBalanceData(
                        employee_id=employee.id,
                        employee_name=employee.full_name,
                        vacation_entitlement=0.0,
                        vacation_taken=0.0,
                        vacation_balance=0.0,
                        sick_entitlement=0.0,
                        sick_taken=0.0,
                        sick_balance=0.0,
                        vacation_days=0.0,
                        sick_days=0.0,
                        personal_days=0.0,
                        total_used=0.0,
                        total_remaining=0.0
                    ))
            
            # Sort by employee name
            report_data.sort(key=lambda x: x.employee_name)
            
            # Generate summary
            summary = ReportSummary(
                total_records=len(report_data),
                total_pages=1,
                current_page=1,
                generated_at=datetime.now(),
                filters_applied=filters.dict(exclude_none=True)
            )
            
            return report_data, summary
            
        except Exception as e:
            print(f"Error generating leave balance report: {e}")
            return [], ReportSummary(
                total_records=0,
                total_pages=0,
                current_page=1,
                generated_at=datetime.now(),
                filters_applied={}
            )
    
    def generate_leave_taken_report(self, filters: ReportFilterBase) -> Tuple[List[LeaveTakenData], ReportSummary]:
        """Generate leave taken report showing all leave requests for a period"""
        try:
            # Import leave repository functions
            from repos.leave_repo import list_leaves as repo_list_leaves
            from repos.leave_repo import list_leave_types as repo_list_leave_types
            from repos.employee_repo import get_employee
            
            # Get all employees first, then apply filters
            employees = search_employees(filters.search_term or "")
            leave_types = {lt.id: lt for lt in repo_list_leave_types()}
            
            # Apply employee filters first
            if filters.employee_id:
                employees = [emp for emp in employees if emp.id == filters.employee_id]
            
            if filters.employee_status and filters.employee_status != "All":
                if filters.employee_status == "Active & Probation":
                    employees = [emp for emp in employees if emp.status in ["Active", "Probation"]]
                else:
                    employees = [emp for emp in employees if emp.status == filters.employee_status]
            
            # Apply company and department filters
            if filters.company_id:
                employees = self._filter_employees_by_company(employees, filters.company_id)
            if filters.department:
                employees = self._filter_employees_by_department(employees, filters.department)
            
            # Convert to report data
            report_data = []
            today = date.today()
            
            # Get leaves for filtered employees
            for employee in employees:
                try:
                    employee_leaves = repo_list_leaves(employee.id)
                    
                    for leave in employee_leaves:
                        try:
                            # Apply date filters
                            if filters.start_date and leave.end_date < filters.start_date:
                                continue
                            if filters.end_date and leave.start_date > filters.end_date:
                                continue
                            
                            # Get leave type information
                            leave_type = leave_types.get(leave.leave_type_id)
                            if not leave_type:
                                continue
                            
                            # Apply search filter (for leave type)
                            if filters.search_term:
                                search_lower = filters.search_term.lower()
                                if not (search_lower in employee.full_name.lower() or 
                                        search_lower in leave_type.name.lower() or
                                        search_lower in leave_type.code.lower()):
                                    continue
                            
                            report_data.append(LeaveTakenData(
                                employee_id=employee.id,
                                employee_name=employee.full_name,
                                leave_type_code=leave_type.code,
                                leave_type_name=leave_type.name,
                                start_date=leave.start_date,
                                end_date=leave.end_date,
                                days_taken=leave.days,
                                reason=leave.note,
                                status=leave.status,
                                approved_by=None,  # Not stored in current model
                                approved_at=None,  # Not stored in current model
                                created_at=leave.created_at,
                                updated_at=leave.updated_at
                            ))
                        except Exception as e:
                            print(f"Error processing leave record {leave.id}: {e}")
                            continue
                except Exception as e:
                    print(f"Error getting leaves for employee {employee.id}: {e}")
                    continue
            
            # Convert to dictionaries for sorting and grouping
            data_dicts = [item.dict() for item in report_data]
            
            # Apply sorting
            if filters.sort_by:
                sort_direction = filters.sort_direction if filters.sort_direction is not None else SortDirection.ASC
                data_dicts = self._sort_data(data_dicts, filters.sort_by, sort_direction)
            
            # Apply grouping if specified
            if filters.group_by:
                grouped_data = self._group_data(data_dicts, filters.group_by, filters.group_by_secondary)
                return grouped_data, ReportSummary(
                    total_records=len(report_data),
                    total_pages=1,
                    current_page=1,
                    generated_at=datetime.now(),
                    filters_applied=filters.dict(exclude_none=True),
                    sort_applied={"field": filters.sort_by.value, "direction": sort_direction.value} if filters.sort_by else None,
                    group_by_applied=[filters.group_by.value] + ([filters.group_by_secondary.value] if filters.group_by_secondary else []) if filters.group_by else []
                )
            
            # Convert back to LeaveTakenData objects
            report_data = [LeaveTakenData(**item) for item in data_dicts]
            
            # Generate summary
            summary = ReportSummary(
                total_records=len(report_data),
                total_pages=1,
                current_page=1,
                generated_at=datetime.now(),
                filters_applied=filters.dict(exclude_none=True),
                sort_applied={"field": filters.sort_by.value, "direction": sort_direction.value} if filters.sort_by else None,
                group_by_applied=[filters.group_by.value] + ([filters.group_by_secondary.value] if filters.group_by_secondary else []) if filters.group_by else []
            )
            
            return report_data, summary
            
        except Exception as e:
            print(f"Error generating leave taken report: {e}")
            return [], ReportSummary(
                total_records=0,
                total_pages=0,
                current_page=1,
                generated_at=datetime.now(),
                filters_applied={}
            )
    
    def generate_salary_analysis_report(self, filters: SalaryReportFilters) -> Tuple[Union[List[SalaryReportData], List[GroupedReportData]], ReportSummary]:
        """Generate salary analysis report"""
        try:
            # Get salary data using the existing repository function
            salary_data = search_salary_records(filters.search_term or "")
            
            # Convert to report data
            report_data = []
            for salary_record in salary_data:
                salary = salary_record["salary"]
                employee = salary_record["employee"]
                
                # Apply filters
                if filters.employee_id and employee.id != filters.employee_id:
                    continue
                if filters.employee_status and filters.employee_status != "All":
                    if filters.employee_status == "Active & Probation":
                        if employee.status not in ["Active", "Probation"]:
                            continue
                    elif employee.status != filters.employee_status:
                        continue
                if filters.pay_type and salary.pay_type != filters.pay_type:
                    continue
                if filters.min_salary and float(salary.pay_rate) < filters.min_salary:
                    continue
                if filters.max_salary and float(salary.pay_rate) > filters.max_salary:
                    continue
                if filters.effective_date_from and salary.effective_date < filters.effective_date_from:
                    continue
                if filters.effective_date_to and salary.effective_date > filters.effective_date_to:
                    continue
                
                # Get current employment information for company/department filters
                employment_history = get_employment_history(employee.id)
                current_employment = None
                for emp_record in employment_history:
                    if emp_record.end_date is None:  # Current employment
                        current_employment = emp_record
                        break
                
                # Apply company and department filters
                if filters.company_id and (not current_employment or current_employment.company_id != filters.company_id):
                    continue
                if filters.department and (not current_employment or current_employment.department != filters.department):
                    continue
                
                # Get company information
                company_name = None
                if current_employment:
                    companies = get_all_companies()
                    for company in companies:
                        if company.id == current_employment.company_id:
                            company_name = company.legal_name
                            break
                
                report_data.append(SalaryReportData(
                    employee_id=employee.id,
                    employee_name=employee.full_name,
                    position=current_employment.position if current_employment else None,
                    department=current_employment.department if current_employment else None,
                    company_name=company_name,
                    pay_rate=float(salary.pay_rate),
                    pay_type=salary.pay_type,
                    effective_date=salary.effective_date,
                    end_date=salary.end_date,
                    notes=salary.notes
                ))
            
            # Filter for latest record per employee if include_history is False
            if not filters.include_history:
                # Group records by employee_id
                employee_records = {}
                for record in report_data:
                    emp_id = record.employee_id
                    if emp_id not in employee_records:
                        employee_records[emp_id] = []
                    employee_records[emp_id].append(record)
                
                # For each employee, keep only the record with the latest effective_date
                # If multiple records have the same effective_date, prefer current records (end_date is None)
                filtered_report_data = []
                for emp_id, records in employee_records.items():
                    # Sort by effective_date descending, then prefer records where end_date is None (current records)
                    # Use a tuple where None end_date sorts after non-None dates (True > False in boolean comparison)
                    latest_record = max(records, key=lambda r: (
                        r.effective_date,
                        r.end_date is None  # True (1) sorts after False (0), so current records are preferred
                    ))
                    filtered_report_data.append(latest_record)
                
                report_data = filtered_report_data
            
            # Convert to dict format for sorting and grouping
            data_dicts = [item.dict() for item in report_data]
            
            # Apply sorting
            if filters.sort_by:
                sort_direction = filters.sort_direction if filters.sort_direction is not None else SortDirection.ASC
                data_dicts = self._sort_data(data_dicts, filters.sort_by, sort_direction)
            else:
                # Default sort by effective date descending
                data_dicts.sort(key=lambda x: x.get('effective_date', ''), reverse=True)
            
            # Apply grouping if specified
            if filters.group_by:
                grouped_data = self._group_data(data_dicts, filters.group_by, filters.group_by_secondary)
                # Keep records as dictionaries for GroupedReportData
                # (GroupedReportData expects records to be dictionaries, not objects)
                
                # Generate summary with grouping info
                summary = ReportSummary(
                    total_records=len(report_data),
                    total_pages=1,
                    current_page=1,
                    generated_at=datetime.now(),
                    filters_applied=filters.dict(exclude_none=True),
                    sort_applied={"field": filters.sort_by.value if filters.sort_by else "effective_date", "direction": filters.sort_direction.value if filters.sort_direction else "desc"} if filters.sort_by else None,
                    group_by_applied=[filters.group_by.value] + ([filters.group_by_secondary.value] if filters.group_by_secondary else [])
                )
                
                return grouped_data, summary
            else:
                # No grouping, return sorted data as SalaryReportData objects
                sorted_data = [SalaryReportData(**record) for record in data_dicts]
                
                # Generate summary
                summary = ReportSummary(
                    total_records=len(sorted_data),
                    total_pages=1,
                    current_page=1,
                    generated_at=datetime.now(),
                    filters_applied=filters.dict(exclude_none=True),
                    sort_applied={"field": filters.sort_by.value if filters.sort_by else "effective_date", "direction": filters.sort_direction.value if filters.sort_direction else "desc"} if filters.sort_by else None
                )
                
                return sorted_data, summary
            
        except Exception as e:
            print(f"Error generating salary analysis report: {e}")
            return [], ReportSummary(
                total_records=0,
                total_pages=0,
                current_page=1,
                generated_at=datetime.now(),
                filters_applied={}
            )
    
    def generate_work_permit_status_report(self, filters: WorkPermitReportFilters) -> Tuple[List[WorkPermitReportData], ReportSummary]:
        """Generate work permit status report"""
        try:
            # Get work permit data using the existing repository function
            permit_data = search_work_permits(
                employee_id=filters.employee_id,
                permit_type=filters.permit_type
            )
            
            # Convert to report data
            report_data = []
            today = date.today()
            
            for permit in permit_data:
                # Get employee information
                employee = get_employee(permit.employee_id)
                if not employee:
                    continue
                
                # Apply filters
                if filters.employee_status and filters.employee_status != "All":
                    if filters.employee_status == "Active & Probation":
                        if employee.status not in ["Active", "Probation"]:
                            continue
                    elif employee.status != filters.employee_status:
                        continue
                if filters.search_term:
                    search_term = filters.search_term.lower()
                    if (search_term not in employee.first_name.lower() and 
                        search_term not in employee.last_name.lower() and 
                        search_term not in employee.full_name.lower()):
                        continue
                
                # Apply company and department filters
                if filters.company_id or filters.department:
                    employment_history = get_employment_history(employee.id)
                    current_employment = None
                    for emp_record in employment_history:
                        if emp_record.end_date is None:  # Current employment
                            current_employment = emp_record
                            break
                    
                    if filters.company_id and (not current_employment or current_employment.company_id != filters.company_id):
                        continue
                    if filters.department and (not current_employment or current_employment.department != filters.department):
                        continue
                
                # Apply expiry filters
                days_until_expiry = (permit.expiry_date - today).days
                is_expired = days_until_expiry < 0
                
                if filters.expiry_days_ahead:
                    expiry_threshold = filters.expiry_days_ahead
                    if days_until_expiry > expiry_threshold:
                        continue
                
                if filters.is_expired is not None:
                    if filters.is_expired and not is_expired:
                        continue
                    if not filters.is_expired and is_expired:
                        continue
                
                is_expiring_soon = 0 <= days_until_expiry <= (filters.expiry_days_ahead or 30)
                
                report_data.append(WorkPermitReportData(
                    employee_id=employee.id,
                    employee_name=employee.full_name,
                    permit_type=permit.permit_type,
                    expiry_date=permit.expiry_date,
                    days_until_expiry=days_until_expiry,
                    is_expired=is_expired,
                    is_expiring_soon=is_expiring_soon
                ))
            
            # Sort by expiry date
            report_data.sort(key=lambda x: x.expiry_date)
            
            # Generate summary
            summary = ReportSummary(
                total_records=len(report_data),
                total_pages=1,
                current_page=1,
                generated_at=datetime.now(),
                filters_applied=filters.dict(exclude_none=True)
            )
            
            return report_data, summary
            
        except Exception as e:
            print(f"Error generating work permit status report: {e}")
            return [], ReportSummary(
                total_records=0,
                total_pages=0,
                current_page=1,
                generated_at=datetime.now(),
                filters_applied={}
            )
    
    def generate_comprehensive_overview_report(self, filters: ReportFilterBase) -> Tuple[List[ComprehensiveReportData], ReportSummary]:
        """Generate comprehensive employee overview report"""
        try:
            # Get all employees using the existing repository function
            employees = search_employees(filters.search_term or "")
            
            # Apply basic filters
            if filters.employee_id:
                employees = [emp for emp in employees if emp.id == filters.employee_id]
            
            if filters.employee_status and filters.employee_status != "All":
                if filters.employee_status == "Active & Probation":
                    # Show both Active and Probation employees
                    employees = [emp for emp in employees if emp.status in ["Active", "Probation"]]
                else:
                    employees = [emp for emp in employees if emp.status == filters.employee_status]
            elif filters.employee_status == "All":
                # Show all employees regardless of status
                pass
            else:
                # Default to active employees if no status specified
                employees = [emp for emp in employees if emp.status == "Active"]
            
            # Apply company and department filters
            if filters.company_id:
                employees = self._filter_employees_by_company(employees, filters.company_id)
            if filters.department:
                employees = self._filter_employees_by_department(employees, filters.department)
            
            # Convert to comprehensive report data
            report_data = []
            for employee in employees:
                # Get current employment information
                employment_history = get_employment_history(employee.id)
                current_employment = None
                for emp_record in employment_history:
                    if emp_record.end_date is None:  # Current employment
                        current_employment = emp_record
                        break
                
                # Get company information
                company_name = None
                if current_employment:
                    companies = get_all_companies()
                    for company in companies:
                        if company.id == current_employment.company_id:
                            company_name = company.legal_name
                            break
                
                # Create employee data
                employee_data = EmployeeReportData(
                    id=employee.id,
                    full_name=employee.full_name,
                    first_name=employee.first_name,
                    last_name=employee.last_name,
                    email=employee.email,
                    phone=employee.phone,
                    status=employee.status,
                    hire_date=employee.hire_date,
                    position=current_employment.position if current_employment else None,
                    department=current_employment.department if current_employment else None,
                    company_name=company_name,
                    city=employee.city,
                    province=employee.province
                )
                
                # Create employment data
                employment_data = None
                if current_employment:
                    duration_days = self._calculate_duration_days(current_employment.start_date, current_employment.end_date)
                    employment_data = EmploymentReportData(
                        employee_id=employee.id,
                        employee_name=employee.full_name,
                        company_name=company_name,
                        position=current_employment.position,
                        department=current_employment.department,
                        start_date=current_employment.start_date,
                        end_date=current_employment.end_date,
                        is_active=current_employment.end_date is None,
                        duration_days=duration_days
                    )
                
                # Get current salary data
                current_salary_data = None
                try:
                    from repos.salary_history_repo import get_current_salary
                    current_salary = get_current_salary(employee.id)
                    if current_salary:
                        current_salary_data = SalaryReportData(
                            employee_id=employee.id,
                            employee_name=employee.full_name,
                            position=current_employment.position if current_employment else None,
                            department=current_employment.department if current_employment else None,
                            company_name=company_name,
                            pay_rate=float(current_salary.pay_rate),
                            pay_type=current_salary.pay_type,
                            effective_date=current_salary.effective_date,
                            end_date=current_salary.end_date,
                            notes=current_salary.notes
                        )
                except Exception as e:
                    print(f"Error getting salary for {employee.id}: {e}")
                
                # Get leave balance data
                leave_balance_data = None
                try:
                    from services.leave_service import get_vacation_remaining, get_sick_remaining, calculate_vacation_entitlement
                    from repos.employee_repo_ext import is_employee_eligible_for_sick_leave
                    from datetime import date
                    
                    today = date.today()
                    seniority_date = employee.seniority_start_date if hasattr(employee, 'seniority_start_date') and employee.seniority_start_date else employee.hire_date
                    
                    vacation_remaining = get_vacation_remaining(employee.id, seniority_date, today)
                    sick_remaining = get_sick_remaining(employee.id, today)
                    vacation_entitlement = calculate_vacation_entitlement(seniority_date, today) if seniority_date else 0.0
                    sick_entitlement = 5.0 if is_employee_eligible_for_sick_leave(employee.id, today) else 0.0
                    
                    # Calculate taken days
                    vacation_taken = vacation_entitlement - vacation_remaining if vacation_entitlement >= vacation_remaining else 0.0
                    sick_taken = sick_entitlement - sick_remaining if sick_entitlement >= sick_remaining else 0.0
                    
                    leave_balance_data = LeaveBalanceData(
                        employee_id=employee.id,
                        employee_name=employee.full_name,
                        # Vacation details
                        vacation_entitlement=vacation_entitlement,
                        vacation_taken=vacation_taken,
                        vacation_balance=vacation_remaining,
                        # Sick leave details
                        sick_entitlement=sick_entitlement,
                        sick_taken=sick_taken,
                        sick_balance=sick_remaining,
                        # Legacy fields
                        vacation_days=vacation_remaining,
                        sick_days=sick_remaining,
                        personal_days=0.0,
                        total_used=vacation_taken + sick_taken,
                        total_remaining=vacation_remaining + sick_remaining
                    )
                except Exception as e:
                    print(f"Error getting leave balance for {employee.id}: {e}")
                
                # Get current work permit data
                current_work_permit_data = None
                try:
                    from repos.work_permit_repo import get_current_work_permit
                    work_permit = get_current_work_permit(employee.id)
                    if work_permit:
                        from datetime import date
                        today = date.today()
                        days_until_expiry = (work_permit.expiry_date - today).days if work_permit.expiry_date else 0
                        is_expired = work_permit.expiry_date and work_permit.expiry_date < today
                        is_expiring_soon = days_until_expiry <= 30 and days_until_expiry > 0
                        
                        current_work_permit_data = WorkPermitReportData(
                            employee_id=employee.id,
                            employee_name=employee.full_name,
                            permit_type=work_permit.permit_type,
                            expiry_date=work_permit.expiry_date,
                            days_until_expiry=days_until_expiry,
                            is_expired=is_expired,
                            is_expiring_soon=is_expiring_soon
                        )
                except Exception as e:
                    print(f"Error getting work permit for {employee.id}: {e}")
                
                report_data.append(ComprehensiveReportData(
                    employee=employee_data,
                    current_employment=employment_data,
                    current_salary=current_salary_data,
                    leave_balance=leave_balance_data,
                    current_work_permit=current_work_permit_data,
                    recent_expenses=None  # Could be implemented later
                ))
            
            # Convert to dict format for sorting and grouping
            data_dicts = []
            for item in report_data:
                data_dicts.append({
                    'employee': item.employee.dict(),
                    'current_employment': item.current_employment.dict() if item.current_employment else None,
                    'current_salary': item.current_salary.dict() if item.current_salary else None,
                    'leave_balance': item.leave_balance.dict() if item.leave_balance else None,
                    'current_work_permit': item.current_work_permit.dict() if item.current_work_permit else None,
                    'recent_expenses': item.recent_expenses
                })
            
            # Apply sorting
            if filters.sort_by:
                sort_direction = filters.sort_direction if filters.sort_direction is not None else SortDirection.ASC
                data_dicts = self._sort_data(data_dicts, filters.sort_by, sort_direction)
            else:
                # Default sort by employee name
                data_dicts.sort(key=lambda x: x['employee'].get('full_name', ''))
            
            # Apply grouping if specified
            if filters.group_by:
                grouped_data = self._group_data(data_dicts, filters.group_by, filters.group_by_secondary)
                final_data = grouped_data
            else:
                final_data = data_dicts
            
            # Generate summary
            summary = ReportSummary(
                total_records=len(final_data),
                total_pages=1,
                current_page=1,
                generated_at=datetime.now(),
                filters_applied=filters.dict(exclude_none=True),
                sort_applied={"field": filters.sort_by.value if filters.sort_by else "employee_name", "direction": filters.sort_direction.value if filters.sort_direction else "asc"} if filters.sort_by else None,
                group_by_applied=[filters.group_by.value] if filters.group_by else []
            )
            
            return final_data, summary
            
        except Exception as e:
            print(f"Error generating comprehensive overview report: {e}")
            return [], ReportSummary(
                total_records=0,
                total_pages=0,
                current_page=1,
                generated_at=datetime.now(),
                filters_applied={}
            )
    
    def generate_expense_reimbursement_report(self, filters: ReportFilterBase) -> Tuple[List[ExpenseReportData] | List[GroupedReportData], ReportSummary]:
        """Generate expense reimbursement report showing all expense claims"""
        try:
            # Import expense service
            from services.expense_service import ExpenseService
            from repos.expense_claim_repo import get_claims_by_date_range
            from repos.employee_repo import get_employee
            from repos.employment_repo import get_current_employment
            
            # Get all employees using the existing repository function
            employees = search_employees(filters.search_term or "")
            
            # Apply basic filters
            if filters.employee_id:
                employees = [emp for emp in employees if emp.id == filters.employee_id]
            
            if filters.company_id:
                employees = self._filter_employees_by_company(employees, filters.company_id)
            
            if filters.department:
                employees = self._filter_employees_by_department(employees, filters.department)
            
            # Apply employee status filter
            if filters.employee_status and filters.employee_status != "All":
                if filters.employee_status == "Active & Probation":
                    employees = [emp for emp in employees if emp.status in ["Active", "Probation"]]
                else:
                    employees = [emp for emp in employees if emp.status == filters.employee_status]
            
            if not employees:
                return [], ReportSummary(
                    total_records=0,
                    total_pages=1,
                    current_page=1,
                    records_per_page=0,
                    generated_at=datetime.now(),
                    filters_applied=filters.dict(),
                    sort_applied=None,
                    group_by_applied=[]
                )
            
            # Get expense claims for the date range
            start_date = filters.start_date or date(2020, 1, 1)  # Default to a far back date
            end_date = filters.end_date or date.today()
            
            all_claims = get_claims_by_date_range(start_date, end_date)
            
            # Filter claims by selected employees
            employee_ids = {emp.id for emp in employees}
            filtered_claims = [claim for claim in all_claims if claim.employee_id in employee_ids]
            
            # Convert to report data
            report_data = []
            for claim in filtered_claims:
                try:
                    # Get employee info
                    employee = get_employee(claim.employee_id)
                    if not employee:
                        continue
                    
                    # Get current employment info
                    current_employment = get_current_employment(claim.employee_id)
                    
                    # Get company name if employment exists
                    company_name = None
                    if current_employment and current_employment.company_id:
                        from repos.company_repo import get_company_by_id
                        company = get_company_by_id(current_employment.company_id)
                        company_name = company.legal_name if company else None
                    
                    # Create expense report data
                    expense_data = ExpenseReportData(
                        employee_id=claim.employee_id,
                        employee_name=employee.full_name,
                        expense_type=claim.expense_type,
                        paid_date=claim.paid_date,
                        receipts_amount=claim.receipts_amount,
                        claims_amount=claim.claims_amount,
                        status="Paid",  # Default status for expense claims
                        notes=claim.notes
                    )
                    report_data.append(expense_data)
                except Exception as e:
                    print(f"Error processing expense claim {claim.id}: {e}")
                    continue
            
            
            # Apply sorting
            if filters.sort_by:
                report_data = self._sort_data(report_data, filters.sort_by, filters.sort_direction)
            
            # Apply grouping
            if filters.group_by:
                report_data = self._group_data(report_data, filters.group_by, filters.group_by_secondary)
            
            # Generate summary
            summary = ReportSummary(
                total_records=len(report_data),
                total_pages=1,
                current_page=1,
                records_per_page=len(report_data),
                generated_at=datetime.now(),
                filters_applied=filters.dict(),
                sort_applied={
                    "field": filters.sort_by.value if filters.sort_by else None,
                    "direction": filters.sort_direction.value if filters.sort_direction else None
                } if filters.sort_by else None,
                group_by_applied=[
                    value for value in [
                        filters.group_by.value if filters.group_by else None,
                        filters.group_by_secondary.value if filters.group_by_secondary else None
                    ] if value is not None
                ]
            )
            
            return report_data, summary
            
        except Exception as e:
            print(f"Error generating expense reimbursement report: {e}")
            return [], ReportSummary(
                total_records=0,
                total_pages=1,
                current_page=1,
                records_per_page=0,
                generated_at=datetime.now(),
                filters_applied=filters.dict(),
                sort_applied=None,
                group_by_applied=[]
            )
