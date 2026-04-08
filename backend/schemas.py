from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date, datetime, time
import re

# Base schemas
class UserBase(BaseModel):
    username: str
    display_name: Optional[str] = None
    email: Optional[str] = None

class UserResponse(UserBase):
    id: int
    roles: List[dict] = []
    permissions: List[str] = []
    
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Employee schemas
class EmployeeBase(BaseModel):
    id: str = Field(..., max_length=50)
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    other_name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    street: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    province: Optional[str] = Field(None, max_length=50)
    postal_code: Optional[str] = Field(None, max_length=20)
    dob: Optional[date] = None
    sin: Optional[str] = Field(None, max_length=20)
    drivers_license: Optional[str] = Field(None, max_length=50)
    hire_date: Optional[date] = None
    probation_end_date: Optional[date] = None
    seniority_start_date: Optional[date] = None
    status: str = Field(default="Active", max_length=50)
    remarks: Optional[str] = None
    paystub: bool = False
    union_member: bool = False
    use_mailing_address: bool = False
    mailing_street: Optional[str] = Field(None, max_length=255)
    mailing_city: Optional[str] = Field(None, max_length=100)
    mailing_province: Optional[str] = Field(None, max_length=50)
    mailing_postal_code: Optional[str] = Field(None, max_length=20)
    emergency_contact_name: Optional[str] = Field(None, max_length=255)
    emergency_contact_phone: Optional[str] = Field(None, max_length=20)

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    other_name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    street: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    province: Optional[str] = Field(None, max_length=50)
    postal_code: Optional[str] = Field(None, max_length=20)
    dob: Optional[date] = None
    sin: Optional[str] = Field(None, max_length=20)
    drivers_license: Optional[str] = Field(None, max_length=50)
    hire_date: Optional[date] = None
    probation_end_date: Optional[date] = None
    seniority_start_date: Optional[date] = None
    status: Optional[str] = Field(None, max_length=50)
    remarks: Optional[str] = None
    paystub: Optional[bool] = None
    union_member: Optional[bool] = None
    use_mailing_address: Optional[bool] = None
    mailing_street: Optional[str] = Field(None, max_length=255)
    mailing_city: Optional[str] = Field(None, max_length=100)
    mailing_province: Optional[str] = Field(None, max_length=50)
    mailing_postal_code: Optional[str] = Field(None, max_length=20)
    emergency_contact_name: Optional[str] = Field(None, max_length=255)
    emergency_contact_phone: Optional[str] = Field(None, max_length=20)

class EmployeeResponse(EmployeeBase):
    full_name: str
    company_id: Optional[str] = None
    company_short_form: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class EmployeeListResponse(BaseModel):
    success: bool
    data: List[EmployeeResponse]

# Company schemas
class CompanyBase(BaseModel):
    id: str = Field(..., max_length=50, description="Company ID (e.g., 'TOPCO')")
    legal_name: str = Field(..., max_length=255)
    trade_name: Optional[str] = Field(None, max_length=255)
    address_line1: Optional[str] = Field(None, max_length=255)
    address_line2: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    province: Optional[str] = Field(None, max_length=50)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: str = Field(default="Canada", max_length=100)
    notes: Optional[str] = None
    
    # Payroll-related fields
    payroll_due_start_date: Optional[date] = Field(None, description="Reference date to calculate pay due dates")
    pay_period_start_date: Optional[date] = Field(None, description="Start date for calculating pay periods")
    payroll_frequency: Optional[str] = Field(None, max_length=20, description="Options: bi-weekly, bi-monthly, monthly")
    cra_due_dates: Optional[str] = Field(None, max_length=50, description="Comma-separated list of day numbers (e.g., '15,30')")
    union_due_date: Optional[int] = Field(None, ge=1, le=31, description="Single day of month (1-31)")

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    legal_name: Optional[str] = Field(None, max_length=255)
    trade_name: Optional[str] = Field(None, max_length=255)
    address_line1: Optional[str] = Field(None, max_length=255)
    address_line2: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    province: Optional[str] = Field(None, max_length=50)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    
    # Payroll-related fields
    payroll_due_start_date: Optional[date] = Field(None, description="Reference date to calculate pay due dates")
    pay_period_start_date: Optional[date] = Field(None, description="Start date for calculating pay periods")
    payroll_frequency: Optional[str] = Field(None, max_length=20, description="Options: bi-weekly, bi-monthly, monthly")
    cra_due_dates: Optional[str] = Field(None, max_length=50, description="Comma-separated list of day numbers (e.g., '15,30')")
    union_due_date: Optional[int] = Field(None, ge=1, le=31, description="Single day of month (1-31)")

class CompanyResponse(CompanyBase):
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class CompanyListResponse(BaseModel):
    success: bool
    data: List[CompanyResponse]

# Dashboard schemas
class PayrollCalendarEvent(BaseModel):
    date: date
    company_id: str
    company_name: str
    event_type: str  # "payroll", "cra", "union"
    description: str

# Pay Period schemas
class PayPeriodBase(BaseModel):
    start_date: date
    end_date: date
    period_number: int
    year: int
    duration_days: int
    payment_date: Optional[date] = None

class PayPeriodListResponse(BaseModel):
    success: bool
    data: List[PayPeriodBase]
    company_id: str
    company_name: str

class PayrollCalendarResponse(BaseModel):
    success: bool
    data: List[PayrollCalendarEvent]

# Employment schemas
class EmploymentBase(BaseModel):
    employee_id: str
    company_id: str
    position: str = Field(..., max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    start_date: date
    end_date: Optional[date] = None
    is_active: bool = True
    remarks: Optional[str] = None
    wage_classification: Optional[str] = Field(None, max_length=100)
    is_driver: bool = False
    count_all_ot: bool = False
    
    @validator('start_date', 'end_date', pre=True)
    def parse_date(cls, v):
        """Parse date strings and handle timezone issues"""
        if v is None:
            return v
        
        if isinstance(v, date):
            return v
        
        if isinstance(v, str):
            # Handle ISO date strings with timezone (e.g., "2024-01-15T00:00:00.000Z")
            # Extract just the date part to avoid timezone conversion issues
            if 'T' in v:
                # Extract date part before 'T'
                date_part = v.split('T')[0]
                try:
                    return datetime.strptime(date_part, '%Y-%m-%d').date()
                except ValueError:
                    pass
            
            # Handle standard date format (YYYY-MM-DD)
            try:
                return datetime.strptime(v, '%Y-%m-%d').date()
            except ValueError:
                pass
            
            # Handle other common formats
            for fmt in ['%m/%d/%Y', '%d/%m/%Y', '%Y-%m-%d']:
                try:
                    return datetime.strptime(v, fmt).date()
                except ValueError:
                    continue
        
        raise ValueError(f"Invalid date format: {v}")

class EmploymentCreate(EmploymentBase):
    pass

class EmploymentUpdate(BaseModel):
    position: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None
    remarks: Optional[str] = None
    wage_classification: Optional[str] = Field(None, max_length=100)
    is_driver: Optional[bool] = None
    count_all_ot: Optional[bool] = None
    
    @validator('start_date', 'end_date', pre=True)
    def parse_date(cls, v):
        """Parse date strings and handle timezone issues"""
        if v is None:
            return v
        
        if isinstance(v, date):
            return v
        
        if isinstance(v, str):
            # Handle ISO date strings with timezone (e.g., "2024-01-15T00:00:00.000Z")
            # Extract just the date part to avoid timezone conversion issues
            if 'T' in v:
                # Extract date part before 'T'
                date_part = v.split('T')[0]
                try:
                    return datetime.strptime(date_part, '%Y-%m-%d').date()
                except ValueError:
                    pass
            
            # Handle standard date format (YYYY-MM-DD)
            try:
                return datetime.strptime(v, '%Y-%m-%d').date()
            except ValueError:
                pass
            
            # Handle other common formats
            for fmt in ['%m/%d/%Y', '%d/%m/%Y', '%Y-%m-%d']:
                try:
                    return datetime.strptime(v, fmt).date()
                except ValueError:
                    continue
        
        raise ValueError(f"Invalid date format: {v}")

class EmploymentResponse(BaseModel):
    id: int
    employee_id: str
    company_id: str
    position: Optional[str] = None
    department: Optional[str] = None
    start_date: str  # Always serialized as string
    end_date: Optional[str] = None  # Always serialized as string
    is_active: bool = True
    remarks: Optional[str] = None
    wage_classification: Optional[str] = None
    count_all_ot: bool = False
    is_driver: bool = False
    employee: Optional[EmployeeResponse] = None
    company: Optional[CompanyResponse] = None
    
    @validator('start_date', 'end_date', pre=True)
    def convert_date_to_string(cls, v):
        """Convert date objects to ISO string format"""
        if v is None:
            return v
        
        if isinstance(v, date):
            return v.isoformat()
        
        return v
    
    class Config:
        from_attributes = True

class EmploymentListResponse(BaseModel):
    success: bool
    data: List[EmploymentResponse]

# Leave schemas
class LeaveBase(BaseModel):
    employee_id: str
    leave_type_id: int
    start_date: date
    end_date: date
    days_requested: float
    reason: Optional[str] = None
    status: str = Field(default="Pending", max_length=50)
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    remarks: Optional[str] = None

class LeaveCreate(LeaveBase):
    pass

class LeaveUpdate(BaseModel):
    leave_type_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    days_requested: Optional[float] = None
    reason: Optional[str] = None
    status: Optional[str] = Field(None, max_length=50)
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    remarks: Optional[str] = None

class CalculateLeaveDaysRequest(BaseModel):
    employee_id: str
    start_date: date
    end_date: date

class CalculateLeaveDaysResponse(BaseModel):
    days: float
    start_date: date
    end_date: date
    employee_id: str

class LeaveResponse(LeaveBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    employee: Optional[EmployeeResponse] = None
    
    class Config:
        from_attributes = True

# Leave Type schemas
class LeaveTypeBase(BaseModel):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=20)
    days_per_year: float
    carry_over: bool = False
    max_carry_over: Optional[float] = None
    is_active: bool = True

class LeaveTypeCreate(LeaveTypeBase):
    pass

class LeaveTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    days_per_year: Optional[float] = None
    carry_over: Optional[bool] = None
    max_carry_over: Optional[float] = None
    is_active: Optional[bool] = None

class LeaveTypeResponse(LeaveTypeBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Leave Upload schemas
class LeaveUploadError(BaseModel):
    row_number: int
    error_message: str

class LeaveUploadResponse(BaseModel):
    success_count: int
    skipped_count: int
    error_count: int
    errors: List[LeaveUploadError]

class LeaveUploadPreviewRow(BaseModel):
    row_number: int
    employee_id: str
    leave_type_id: str
    start_date: date
    end_date: date
    days: float
    status: str
    will_import: bool
    error_message: Optional[str] = None

class LeaveUploadPreviewResponse(BaseModel):
    total_rows: int
    valid_rows: int
    invalid_rows: int
    duplicate_rows: int
    rows: List[LeaveUploadPreviewRow]

# Salary History schemas
class SalaryHistoryBase(BaseModel):
    employee_id: str = Field(..., max_length=50)
    pay_rate: float = Field(..., gt=0, description="Pay rate amount")
    pay_type: str = Field(..., max_length=20, description="Pay type: Hourly, Monthly, Annual")
    effective_date: date
    end_date: Optional[date] = None
    notes: Optional[str] = None

class SalaryHistoryCreate(SalaryHistoryBase):
    pass

class SalaryHistoryUpdate(BaseModel):
    pay_rate: Optional[float] = Field(None, gt=0)
    pay_type: Optional[str] = Field(None, max_length=20)
    effective_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None

class SalaryHistoryResponse(SalaryHistoryBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    employee: Optional[EmployeeResponse] = None
    
    class Config:
        from_attributes = True

class SalaryProgressionResponse(BaseModel):
    pay_rate: float
    pay_type: str
    effective_date: date
    end_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime

# Work Permit schemas
class WorkPermitBase(BaseModel):
    employee_id: str = Field(..., max_length=50)
    permit_type: str = Field(..., max_length=100)
    expiry_date: date

class WorkPermitCreate(WorkPermitBase):
    pass

class WorkPermitUpdate(BaseModel):
    permit_type: Optional[str] = Field(None, max_length=100)
    expiry_date: Optional[date] = None

class WorkPermitResponse(WorkPermitBase):
    id: int
    employee: Optional[EmployeeResponse] = None
    
    class Config:
        from_attributes = True

# Employee Upload schemas
class EmployeeUploadError(BaseModel):
    row_number: int
    error_message: str

class EmployeeUploadResponse(BaseModel):
    success_count: int
    error_count: int
    errors: List[EmployeeUploadError]

class EmployeeUploadPreviewRow(BaseModel):
    row_number: int
    employee_id: str
    company_id: str
    first_name: str
    last_name: str
    full_name: str
    street: str
    city: str
    province: str
    postal_code: str
    phone: str
    hire_date: Optional[date]
    will_import: bool
    error_message: Optional[str] = None

class EmployeeUploadPreviewResponse(BaseModel):
    total_rows: int
    valid_rows: int
    invalid_rows: int
    rows: List[EmployeeUploadPreviewRow]

# Termination schemas
class TerminationBase(BaseModel):
    employee_id: str = Field(..., max_length=50)
    last_working_date: date
    termination_effective_date: date
    roe_reason_code: str = Field(..., max_length=1, description="ROE Block 16 reason code: A, B, C, D, E, F, G, M, N, K")
    other_reason: Optional[str] = Field(None, description="Required when roe_reason_code is 'K'")
    internal_reason: Optional[str] = None
    remarks: Optional[str] = None
    
    @validator('roe_reason_code')
    def validate_roe_reason_code(cls, v):
        valid_codes = {'A', 'B', 'C', 'D', 'E', 'F', 'G', 'M', 'N', 'K'}
        if v.upper() not in valid_codes:
            raise ValueError(f"ROE reason code must be one of: {', '.join(sorted(valid_codes))}")
        return v.upper()
    
    @validator('other_reason')
    def validate_other_reason(cls, v, values):
        if 'roe_reason_code' in values and values['roe_reason_code'] == 'K':
            if not v or not v.strip():
                raise ValueError("other_reason is required when roe_reason_code is 'K'")
        return v

class TerminationCreate(TerminationBase):
    created_by: Optional[str] = Field(None, max_length=50)

class TerminationUpdate(BaseModel):
    last_working_date: Optional[date] = None
    termination_effective_date: Optional[date] = None
    roe_reason_code: Optional[str] = Field(None, max_length=1)
    other_reason: Optional[str] = None
    internal_reason: Optional[str] = None
    remarks: Optional[str] = None
    
    @validator('roe_reason_code')
    def validate_roe_reason_code(cls, v):
        if v is not None:
            valid_codes = {'A', 'B', 'C', 'D', 'E', 'F', 'G', 'M', 'N', 'K'}
            if v.upper() not in valid_codes:
                raise ValueError(f"ROE reason code must be one of: {', '.join(sorted(valid_codes))}")
            return v.upper()
        return v
    
    @validator('other_reason')
    def validate_other_reason(cls, v, values):
        if 'roe_reason_code' in values and values.get('roe_reason_code') == 'K':
            if not v or not v.strip():
                raise ValueError("other_reason is required when roe_reason_code is 'K'")
        return v

class TerminationResponse(TerminationBase):
    id: int
    created_at: datetime
    created_by: Optional[str] = None
    employee: Optional[EmployeeResponse] = None
    
    class Config:
        from_attributes = True

class TerminationListResponse(BaseModel):
    success: bool
    data: List[TerminationResponse]

# Work Schedule schemas
class WorkScheduleBase(BaseModel):
    company_id: str
    name: str = Field(..., max_length=255)
    mon_start: Optional[time] = None
    mon_end: Optional[time] = None
    tue_start: Optional[time] = None
    tue_end: Optional[time] = None
    wed_start: Optional[time] = None
    wed_end: Optional[time] = None
    thu_start: Optional[time] = None
    thu_end: Optional[time] = None
    fri_start: Optional[time] = None
    fri_end: Optional[time] = None
    sat_start: Optional[time] = None
    sat_end: Optional[time] = None
    sun_start: Optional[time] = None
    sun_end: Optional[time] = None
    is_active: bool = True

class WorkScheduleCreate(WorkScheduleBase):
    pass

class WorkScheduleUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    mon_start: Optional[time] = None
    mon_end: Optional[time] = None
    tue_start: Optional[time] = None
    tue_end: Optional[time] = None
    wed_start: Optional[time] = None
    wed_end: Optional[time] = None
    thu_start: Optional[time] = None
    thu_end: Optional[time] = None
    fri_start: Optional[time] = None
    fri_end: Optional[time] = None
    sat_start: Optional[time] = None
    sat_end: Optional[time] = None
    sun_start: Optional[time] = None
    sun_end: Optional[time] = None
    is_active: Optional[bool] = None

class WorkScheduleResponse(WorkScheduleBase):
    id: int
    
    class Config:
        from_attributes = True

class WorkScheduleListResponse(BaseModel):
    success: bool
    data: List[WorkScheduleResponse]

# Employee Schedule schemas
class EmployeeScheduleAssign(BaseModel):
    employee_id: str
    effective_date: date
    end_date: Optional[date] = None
    # Note: schedule_id comes from URL path, not body
    
    @validator('effective_date', pre=True)
    def parse_effective_date(cls, v):
        """Parse effective_date string"""
        if v is None:
            raise ValueError("effective_date is required")
        if isinstance(v, date):
            return v
        if isinstance(v, str):
            if v.strip() == '':
                raise ValueError("effective_date cannot be empty")
            # Handle ISO date strings with timezone
            if 'T' in v:
                date_part = v.split('T')[0]
                try:
                    return datetime.strptime(date_part, '%Y-%m-%d').date()
                except ValueError:
                    pass
            # Handle standard date format (YYYY-MM-DD)
            try:
                return datetime.strptime(v.strip(), '%Y-%m-%d').date()
            except ValueError:
                pass
            # Handle other common formats
            for fmt in ['%m/%d/%Y', '%d/%m/%Y']:
                try:
                    return datetime.strptime(v.strip(), fmt).date()
                except ValueError:
                    continue
        raise ValueError(f"Invalid date format: {v}")
    
    @validator('end_date', pre=True)
    def parse_end_date(cls, v):
        """Parse end_date string - optional field"""
        if v is None or v == '' or (isinstance(v, str) and v.strip() == ''):
            return None
        if isinstance(v, date):
            return v
        if isinstance(v, str):
            # Handle ISO date strings with timezone
            if 'T' in v:
                date_part = v.split('T')[0]
                try:
                    return datetime.strptime(date_part, '%Y-%m-%d').date()
                except ValueError:
                    pass
            # Handle standard date format (YYYY-MM-DD)
            try:
                return datetime.strptime(v.strip(), '%Y-%m-%d').date()
            except ValueError:
                pass
            # Handle other common formats
            for fmt in ['%m/%d/%Y', '%d/%m/%Y']:
                try:
                    return datetime.strptime(v.strip(), fmt).date()
                except ValueError:
                    continue
        raise ValueError(f"Invalid date format: {v}")

class EmployeeScheduleUpdate(BaseModel):
    """Schema for updating an employee schedule assignment"""
    effective_date: Optional[date] = None
    end_date: Optional[date] = None
    
    @validator('effective_date', pre=True)
    def parse_effective_date(cls, v):
        """Parse effective_date string - optional for updates"""
        if v is None or v == '' or (isinstance(v, str) and v.strip() == ''):
            return None
        if isinstance(v, date):
            return v
        if isinstance(v, str):
            # Handle ISO date strings with timezone
            if 'T' in v:
                date_part = v.split('T')[0]
                try:
                    return datetime.strptime(date_part, '%Y-%m-%d').date()
                except ValueError:
                    pass
            # Handle standard date format (YYYY-MM-DD)
            try:
                return datetime.strptime(v.strip(), '%Y-%m-%d').date()
            except ValueError:
                pass
            # Handle other common formats
            for fmt in ['%m/%d/%Y', '%d/%m/%Y']:
                try:
                    return datetime.strptime(v.strip(), fmt).date()
                except ValueError:
                    continue
        raise ValueError(f"Invalid date format: {v}")
    
    @validator('end_date', pre=True)
    def parse_end_date(cls, v):
        """Parse end_date string - optional field"""
        if v is None or v == '' or (isinstance(v, str) and v.strip() == ''):
            return None
        if isinstance(v, date):
            return v
        if isinstance(v, str):
            # Handle ISO date strings with timezone
            if 'T' in v:
                date_part = v.split('T')[0]
                try:
                    return datetime.strptime(date_part, '%Y-%m-%d').date()
                except ValueError:
                    pass
            # Handle standard date format (YYYY-MM-DD)
            try:
                return datetime.strptime(v.strip(), '%Y-%m-%d').date()
            except ValueError:
                pass
            # Handle other common formats
            for fmt in ['%m/%d/%Y', '%d/%m/%Y']:
                try:
                    return datetime.strptime(v.strip(), fmt).date()
                except ValueError:
                    continue
        raise ValueError(f"Invalid date format: {v}")

class EmployeeScheduleResponse(BaseModel):
    id: int
    employee_id: str
    employee_name: Optional[str] = None  # Employee full name for display
    schedule_id: int
    effective_date: str
    end_date: Optional[str] = None
    schedule: Optional[WorkScheduleResponse] = None
    
    class Config:
        from_attributes = True

class EmployeeScheduleListResponse(BaseModel):
    success: bool
    data: List[EmployeeScheduleResponse]

# Attendance schemas
class AttendanceBase(BaseModel):
    employee_id: str
    date: date
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    regular_hours: float = 0.0
    ot_hours: float = 0.0
    weekend_ot_hours: float = 0.0
    stat_holiday_hours: float = 0.0
    notes: Optional[str] = None
    remarks: Optional[str] = None
    override_check_in: Optional[time] = None
    override_check_out: Optional[time] = None
    override_regular_hours: Optional[float] = None
    override_ot_hours: Optional[float] = None
    override_weekend_ot_hours: Optional[float] = None
    override_stat_holiday_hours: Optional[float] = None
    time_edit_reason: Optional[str] = None
    hours_edit_reason: Optional[str] = None
    is_manual_override: bool = False
    
    @validator('remarks')
    def validate_remarks(cls, v):
        """Validate remarks max length of 18 characters"""
        if v is not None and len(v) > 18:
            raise ValueError('Remarks must be 18 characters or less')
        return v

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceUpdate(BaseModel):
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    regular_hours: Optional[float] = None
    ot_hours: Optional[float] = None
    weekend_ot_hours: Optional[float] = None
    stat_holiday_hours: Optional[float] = None
    is_manual_override: Optional[bool] = None
    override_check_in: Optional[time] = None
    override_check_out: Optional[time] = None
    override_regular_hours: Optional[float] = None
    override_ot_hours: Optional[float] = None
    override_weekend_ot_hours: Optional[float] = None
    override_stat_holiday_hours: Optional[float] = None
    time_edit_reason: Optional[str] = None
    hours_edit_reason: Optional[str] = None
    notes: Optional[str] = None
    remarks: Optional[str] = None
    
    @validator('remarks')
    def validate_remarks(cls, v):
        """Validate remarks max length of 18 characters"""
        if v is not None and len(v) > 18:
            raise ValueError('Remarks must be 18 characters or less')
        return v
    
    @validator('check_in', 'check_out', 'override_check_in', 'override_check_out', pre=True)
    def parse_time_string(cls, v):
        """Parse time strings to time objects"""
        if v is None or v == '':
            return None
        if isinstance(v, time):
            return v
        if isinstance(v, str):
            # Handle HH:MM:SS format
            try:
                parts = v.split(':')
                if len(parts) == 3:
                    return time(int(parts[0]), int(parts[1]), int(parts[2]))
                elif len(parts) == 2:
                    return time(int(parts[0]), int(parts[1]), 0)
            except (ValueError, IndexError):
                pass
        raise ValueError(f"Invalid time format: {v}. Expected HH:MM:SS or HH:MM")

class AttendanceOverride(BaseModel):
    override_check_in: Optional[time] = None
    override_check_out: Optional[time] = None
    override_ot_hours: Optional[float] = None
    override_weekend_ot_hours: Optional[float] = None
    is_manual_override: bool = True

class AttendanceResponse(BaseModel):
    id: Optional[int] = None
    employee_id: str
    employee_name: Optional[str] = None
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    rounded_check_in: Optional[str] = None
    rounded_check_out: Optional[str] = None
    regular_hours: float = 0.0
    ot_hours: float = 0.0
    weekend_ot_hours: float = 0.0
    stat_holiday_hours: float = 0.0
    is_manual_override: bool = False
    override_check_in: Optional[str] = None
    override_check_out: Optional[str] = None
    override_regular_hours: Optional[float] = None
    override_ot_hours: Optional[float] = None
    override_weekend_ot_hours: Optional[float] = None
    override_stat_holiday_hours: Optional[float] = None
    time_edit_reason: Optional[str] = None
    hours_edit_reason: Optional[str] = None
    notes: Optional[str] = None
    remarks: Optional[str] = None
    leave_type: Optional[str] = None
    stat_holiday_name: Optional[str] = None
    
    @validator('regular_hours', 'ot_hours', 'weekend_ot_hours', 'stat_holiday_hours', pre=True)
    def convert_none_to_zero(cls, v):
        """Convert None to 0.0 for hours fields"""
        return v if v is not None else 0.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    @validator('date', pre=True)
    def convert_date_to_string(cls, v):
        """Convert date objects to string format"""
        if v is None:
            return None
        if isinstance(v, date):
            return v.isoformat()
        return v
    
    @validator('check_in', 'check_out', 'rounded_check_in', 'rounded_check_out', 'override_check_in', 'override_check_out', pre=True)
    def convert_time_to_string(cls, v):
        """Convert time objects to string format"""
        if v is None:
            return None
        if isinstance(v, time):
            return v.strftime("%H:%M:%S")
        return v
    
    class Config:
        from_attributes = True

class AttendanceListResponse(BaseModel):
    success: bool
    data: List[AttendanceResponse]

# Attendance CSV Import schemas
class AttendanceCSVRow(BaseModel):
    person_id: str  # Emp No
    name: str
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None

class AttendanceUploadPreviewRow(BaseModel):
    row_number: int
    person_id: str
    name: str
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    status: str  # "valid", "invalid", "duplicate"
    error_message: Optional[str] = None

class AttendanceUploadPreview(BaseModel):
    total_rows: int
    valid_rows: int
    invalid_rows: int
    duplicate_rows: int
    rows: List[AttendanceUploadPreviewRow]

class AttendanceUploadResponse(BaseModel):
    success: bool
    imported_count: int
    skipped_count: int
    error_count: int
    errors: List[str]

# Attendance Report schemas
class AttendanceReportFilters(BaseModel):
    company_id: Optional[str] = None
    employee_id: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    pay_period_start: Optional[date] = None
    pay_period_end: Optional[date] = None

class AttendanceSummary(BaseModel):
    employee_id: str
    employee_name: str
    total_regular_hours: float
    total_ot_hours: float
    total_weekend_ot_hours: float
    total_stat_holiday_hours: float
    total_days: int

class AttendanceReportResponse(BaseModel):
    success: bool
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    summary: List[AttendanceSummary]
    total_regular_hours: float
    total_ot_hours: float
    total_weekend_ot_hours: float
    total_stat_holiday_hours: float

class AttendanceDetailRow(BaseModel):
    employee_id: str
    employee_name: str
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    day_type: str  # "Weekday" or "Weekend"
    regular_hours: float
    ot_hours: float
    weekend_ot_hours: float
    stat_holiday_hours: float = 0.0
    leave_type: Optional[str] = None
    stat_holiday_name: Optional[str] = None

class AttendanceDetailedReportResponse(BaseModel):
    success: bool
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    details: List[AttendanceDetailRow]

# Attendance Period Override schemas
class AttendancePeriodOverrideBase(BaseModel):
    employee_id: str
    company_id: str
    pay_period_start: date
    pay_period_end: date
    period_number: Optional[int] = None
    year: Optional[int] = None
    override_regular_hours: Optional[float] = None
    override_ot_hours: Optional[float] = None
    override_weekend_ot_hours: Optional[float] = None
    override_stat_holiday_hours: Optional[float] = None
    reason: Optional[str] = None

class AttendancePeriodOverrideCreate(AttendancePeriodOverrideBase):
    pass

class AttendancePeriodOverrideUpdate(BaseModel):
    override_regular_hours: Optional[float] = None
    override_ot_hours: Optional[float] = None
    override_weekend_ot_hours: Optional[float] = None
    override_stat_holiday_hours: Optional[float] = None
    reason: Optional[str] = None

class AttendancePeriodOverrideResponse(AttendancePeriodOverrideBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True