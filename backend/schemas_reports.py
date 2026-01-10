from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from enum import Enum

# Sort and Group By Enums
class SortDirection(str, Enum):
    ASC = "asc"
    DESC = "desc"

class SortField(str, Enum):
    # Common fields
    EMPLOYEE_NAME = "employee_name"
    EMPLOYEE_ID = "employee_id"
    COMPANY_NAME = "company_name"
    DEPARTMENT = "department"
    POSITION = "position"
    STATUS = "status"
    HIRE_DATE = "hire_date"
    
    # Employment specific
    START_DATE = "start_date"
    END_DATE = "end_date"
    DURATION = "duration"
    
    # Salary specific
    PAY_RATE = "pay_rate"
    EFFECTIVE_DATE = "effective_date"
    
    # Leave specific
    LEAVE_TYPE = "leave_type"
    LEAVE_TYPE_CODE = "leave_type_code"
    LEAVE_TYPE_NAME = "leave_type_name"
    DAYS_REQUESTED = "days_requested"
    DAYS_TAKEN = "days_taken"
    VACATION_DAYS = "vacation_days"
    SICK_DAYS = "sick_days"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
    
    # Work permit specific
    PERMIT_TYPE = "permit_type"
    EXPIRY_DATE = "expiry_date"
    DAYS_UNTIL_EXPIRY = "days_until_expiry"
    
    # Expense specific
    EXPENSE_TYPE = "expense_type"
    AMOUNT = "amount"
    PAID_DATE = "paid_date"

class GroupByField(str, Enum):
    # Common groupings
    EMPLOYEE = "employee"
    COMPANY = "company"
    DEPARTMENT = "department"
    POSITION = "position"
    STATUS = "status"
    
    # Employment specific
    EMPLOYMENT_PERIOD = "employment_period"
    
    # Salary specific
    PAY_TYPE = "pay_type"
    SALARY_RANGE = "salary_range"
    
    # Leave specific
    LEAVE_TYPE = "leave_type"
    LEAVE_STATUS = "leave_status"
    
    # Work permit specific
    PERMIT_TYPE = "permit_type"
    EXPIRY_STATUS = "expiry_status"
    
    # Expense specific
    EXPENSE_TYPE = "expense_type"
    CLAIM_STATUS = "claim_status"

# Report Filter Schemas
class ReportFilterBase(BaseModel):
    """Base filter schema for all reports"""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    company_id: Optional[str] = None
    department: Optional[str] = None
    employee_status: Optional[str] = None  # Active, Inactive, Terminated, All
    employee_id: Optional[str] = None
    search_term: Optional[str] = None
    
    # Sort and Group By Options
    sort_by: Optional[SortField] = None
    sort_direction: Optional[SortDirection] = SortDirection.ASC
    group_by: Optional[GroupByField] = None
    group_by_secondary: Optional[GroupByField] = None  # For nested grouping

class EmployeeReportFilters(ReportFilterBase):
    """Filters specific to employee reports"""
    include_inactive: bool = False
    position: Optional[str] = None
    hire_date_from: Optional[date] = None
    hire_date_to: Optional[date] = None

class LeaveReportFilters(ReportFilterBase):
    """Filters specific to leave reports"""
    leave_type: Optional[str] = None
    leave_status: Optional[str] = None  # Pending, Approved, Rejected
    leave_period_from: Optional[date] = None
    leave_period_to: Optional[date] = None

class SalaryReportFilters(ReportFilterBase):
    """Filters specific to salary reports"""
    pay_type: Optional[str] = None  # Hourly, Monthly, Annual
    min_salary: Optional[float] = None
    max_salary: Optional[float] = None
    effective_date_from: Optional[date] = None
    effective_date_to: Optional[date] = None
    include_history: Optional[bool] = False  # If False, show only latest record per employee

class ExpenseReportFilters(ReportFilterBase):
    """Filters specific to expense reports"""
    expense_type: Optional[str] = None
    claim_status: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None

class WorkPermitReportFilters(ReportFilterBase):
    """Filters specific to work permit reports"""
    permit_type: Optional[str] = None
    expiry_days_ahead: Optional[int] = 30
    is_expired: Optional[bool] = None

# Report Response Schemas
class ReportSummary(BaseModel):
    """Summary statistics for reports"""
    total_records: int
    total_pages: int
    current_page: int
    generated_at: datetime
    filters_applied: Dict[str, Any]
    sort_applied: Optional[Dict[str, str]] = None
    group_by_applied: Optional[List[str]] = None

class GroupedReportData(BaseModel):
    """Grouped report data structure"""
    group_key: str
    group_value: str
    group_count: int
    records: List[Dict[str, Any]]
    subgroups: Optional[List['GroupedReportData']] = None
    group_summary: Optional[Dict[str, Any]] = None

class GroupedReportResponse(BaseModel):
    """Response wrapper for grouped reports"""
    success: bool
    data: List[GroupedReportData]
    summary: ReportSummary
    is_grouped: bool = True

class EmployeeReportData(BaseModel):
    """Employee data for reports"""
    id: str
    full_name: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    status: str
    hire_date: Optional[date] = None
    position: Optional[str] = None
    department: Optional[str] = None
    company_name: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None

class EmploymentReportData(BaseModel):
    """Employment data for reports"""
    employee_id: str
    employee_name: str
    company_name: str
    position: str
    department: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    is_active: bool
    duration_days: Optional[int] = None

class LeaveReportData(BaseModel):
    """Leave data for reports"""
    employee_id: str
    employee_name: str
    leave_type: str
    start_date: date
    end_date: date
    days_requested: float
    status: str
    reason: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

class LeaveBalanceData(BaseModel):
    """Leave balance data for reports"""
    employee_id: str
    employee_name: str
    # Vacation leave details
    vacation_entitlement: float = 0.0
    vacation_taken: float = 0.0
    vacation_balance: float = 0.0
    # Sick leave details
    sick_entitlement: float = 0.0
    sick_taken: float = 0.0
    sick_balance: float = 0.0
    # Legacy fields (kept for compatibility)
    vacation_days: float = 0.0  # Maps to vacation_balance
    sick_days: float = 0.0  # Maps to sick_balance
    personal_days: float = 0.0
    total_used: float = 0.0
    total_remaining: float = 0.0
    last_updated: Optional[datetime] = None

class LeaveTakenData(BaseModel):
    """Leave taken data for reports"""
    employee_id: str
    employee_name: str
    leave_type_code: str
    leave_type_name: str
    start_date: date
    end_date: date
    days_taken: float
    reason: Optional[str] = None
    status: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

class SalaryReportData(BaseModel):
    """Salary data for reports"""
    employee_id: str
    employee_name: str
    position: Optional[str] = None
    department: Optional[str] = None
    company_name: Optional[str] = None
    pay_rate: float
    pay_type: str
    effective_date: date
    end_date: Optional[date] = None
    notes: Optional[str] = None

class ExpenseReportData(BaseModel):
    """Expense data for reports"""
    employee_id: str
    employee_name: str
    expense_type: str
    paid_date: date
    receipts_amount: float
    claims_amount: float
    status: str
    notes: Optional[str] = None

class WorkPermitReportData(BaseModel):
    """Work permit data for reports"""
    employee_id: str
    employee_name: str
    permit_type: str
    expiry_date: date
    days_until_expiry: int
    is_expired: bool
    is_expiring_soon: bool

class ComprehensiveReportData(BaseModel):
    """Comprehensive employee data for overview reports"""
    employee: EmployeeReportData
    current_employment: Optional[EmploymentReportData] = None
    current_salary: Optional[SalaryReportData] = None
    leave_balance: Optional[LeaveBalanceData] = None
    current_work_permit: Optional[WorkPermitReportData] = None
    recent_expenses: Optional[List[ExpenseReportData]] = None

# Report Response Wrappers
class EmployeeReportResponse(BaseModel):
    """Response wrapper for employee reports"""
    success: bool
    data: List[EmployeeReportData] | List[GroupedReportData]
    summary: ReportSummary
    is_grouped: Optional[bool] = False

class EmploymentReportResponse(BaseModel):
    """Response wrapper for employment reports"""
    success: bool
    data: List[EmploymentReportData] | List[GroupedReportData]
    summary: ReportSummary
    is_grouped: Optional[bool] = False

class LeaveReportResponse(BaseModel):
    """Response wrapper for leave reports"""
    success: bool
    data: List[LeaveReportData]
    summary: ReportSummary

class LeaveBalanceReportResponse(BaseModel):
    """Response wrapper for leave balance reports"""
    success: bool
    data: List[LeaveBalanceData]
    summary: ReportSummary

class LeaveTakenReportResponse(BaseModel):
    """Response wrapper for leave taken reports"""
    success: bool
    data: List[LeaveTakenData] | List[GroupedReportData]
    summary: ReportSummary
    is_grouped: Optional[bool] = False

class SalaryReportResponse(BaseModel):
    """Response wrapper for salary reports"""
    success: bool
    data: List[SalaryReportData] | List[GroupedReportData]
    summary: ReportSummary
    is_grouped: Optional[bool] = False

class ExpenseReportResponse(BaseModel):
    """Response wrapper for expense reports"""
    success: bool
    data: List[ExpenseReportData]
    summary: ReportSummary

class WorkPermitReportResponse(BaseModel):
    """Response wrapper for work permit reports"""
    success: bool
    data: List[WorkPermitReportData]
    summary: ReportSummary

class ExpenseReimbursementReportResponse(BaseModel):
    """Response wrapper for expense reimbursement reports"""
    success: bool
    data: List[ExpenseReportData] | List[GroupedReportData]
    summary: ReportSummary
    is_grouped: Optional[bool] = False

class ComprehensiveReportResponse(BaseModel):
    """Response wrapper for comprehensive reports"""
    success: bool
    data: List[ComprehensiveReportData] | List[GroupedReportData]
    summary: ReportSummary
    is_grouped: Optional[bool] = False

# Export Request Schema
class ExportRequest(BaseModel):
    """Request schema for report exports"""
    report_type: str
    format: str  # pdf, excel, csv
    filters: Dict[str, Any]
    include_summary: bool = True
    filename: Optional[str] = None

# Report Type Enum
class ReportType(str, Enum):
    EMPLOYEE_DIRECTORY = "employee_directory"
    EMPLOYEE_STATUS = "employee_status"
    EMPLOYMENT_HISTORY = "employment_history"
    LEAVE_BALANCE = "leave_balance"
    LEAVE_TAKEN = "leave_taken"
    LEAVE_USAGE = "leave_usage"
    SALARY_ANALYSIS = "salary_analysis"
    CURRENT_SALARY = "current_salary"
    EXPENSE_SUMMARY = "expense_summary"
    EXPENSE_REIMBURSEMENT = "expense_reimbursement"
    WORK_PERMIT_STATUS = "work_permit_status"
    COMPREHENSIVE_OVERVIEW = "comprehensive_overview"
