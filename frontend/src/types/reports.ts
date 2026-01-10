// Report Types and Interfaces

export interface ReportType {
  type: string;
  name: string;
  description: string;
}

// Sort and Group By Types
export type SortDirection = 'asc' | 'desc';

export type SortField = 
  | 'employee_name' | 'employee_id' | 'company_name' | 'department' | 'position' | 'status' | 'hire_date'
  | 'start_date' | 'end_date' | 'duration'
  | 'pay_rate' | 'effective_date'
  | 'leave_type' | 'leave_type_code' | 'leave_type_name' | 'days_requested' | 'days_taken' | 'vacation_days' | 'sick_days' | 'created_at' | 'updated_at'
  | 'permit_type' | 'expiry_date' | 'days_until_expiry'
  | 'expense_type' | 'amount' | 'paid_date';

export type GroupByField = 
  | 'employee' | 'company' | 'department' | 'position' | 'status'
  | 'employment_period'
  | 'pay_type' | 'salary_range'
  | 'leave_type' | 'leave_status'
  | 'permit_type' | 'expiry_status'
  | 'expense_type' | 'claim_status';

export interface ReportFilter {
  name: string;
  type: 'text' | 'select' | 'date' | 'number' | 'boolean';
  label: string;
  description: string;
  options?: string[];
}

export interface FilterOptions {
  common_filters: ReportFilter[];
  specific_filters: ReportFilter[];
}

export interface ReportSummary {
  total_records: number;
  total_pages: number;
  current_page: number;
  generated_at: string;
  filters_applied: Record<string, any>;
  sort_applied?: {
    field: string;
    direction: string;
  };
  group_by_applied?: string[];
}

// Employee Report Data
export interface EmployeeReportData {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  status: string;
  hire_date?: string;
  position?: string;
  department?: string;
  company_name?: string;
  city?: string;
  province?: string;
}

// Grouped Report Data
export interface GroupedReportData {
  group_key: string;
  group_value: string;
  group_count: number;
  records: any[];
  subgroups?: GroupedReportData[];
  group_summary?: Record<string, any>;
}

export interface GroupedReportResponse {
  success: boolean;
  data: GroupedReportData[];
  summary: ReportSummary;
  is_grouped: boolean;
}

export interface EmployeeReportResponse {
  success: boolean;
  data: EmployeeReportData[] | GroupedReportData[];
  summary: ReportSummary;
  is_grouped?: boolean;
}

// Employment Report Data
export interface EmploymentReportData {
  employee_id: string;
  employee_name: string;
  company_name: string;
  position: string;
  department?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  duration_days?: number;
}

export interface EmploymentReportResponse {
  success: boolean;
  data: EmploymentReportData[];
  summary: ReportSummary;
}

// Leave Report Data
export interface LeaveBalanceData {
  employee_id: string;
  employee_name: string;
  // Vacation leave details
  vacation_entitlement: number;
  vacation_taken: number;
  vacation_balance: number;
  // Sick leave details
  sick_entitlement: number;
  sick_taken: number;
  sick_balance: number;
  // Legacy fields (kept for compatibility)
  vacation_days: number;  // Maps to vacation_balance
  sick_days: number;  // Maps to sick_balance
  personal_days: number;
  total_used: number;
  total_remaining: number;
  last_updated?: string;
}

// Leave Taken Report Data
export interface LeaveTakenData {
  employee_id: string;
  employee_name: string;
  leave_type_code: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  days_taken: number;
  reason?: string;
  status: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface LeaveBalanceReportResponse {
  success: boolean;
  data: LeaveBalanceData[];
  summary: ReportSummary;
}

export interface LeaveTakenReportResponse {
  success: boolean;
  data: LeaveTakenData[];
  summary: ReportSummary;
}

// Salary Report Data
export interface SalaryReportData {
  employee_id: string;
  employee_name: string;
  position: string;
  department?: string;
  company_name: string;
  pay_rate: number;
  pay_type: string;
  effective_date: string;
  end_date?: string;
  notes?: string;
}

export interface SalaryReportResponse {
  success: boolean;
  data: SalaryReportData[];
  summary: ReportSummary;
}

// Work Permit Report Data
export interface WorkPermitReportData {
  employee_id: string;
  employee_name: string;
  permit_type: string;
  expiry_date: string;
  days_until_expiry: number;
  is_expired: boolean;
  is_expiring_soon: boolean;
}

export interface WorkPermitReportResponse {
  success: boolean;
  data: WorkPermitReportData[];
  summary: ReportSummary;
}

// Comprehensive Report Data
export interface ComprehensiveReportData {
  employee: EmployeeReportData;
  current_employment?: EmploymentReportData;
  current_salary?: SalaryReportData;
  leave_balance?: LeaveBalanceData;
  current_work_permit?: WorkPermitReportData;
  recent_expenses?: any[];
}

export interface ComprehensiveReportResponse {
  success: boolean;
  data: ComprehensiveReportData[];
  summary: ReportSummary;
}

// Filter Values
export interface ReportFilters {
  start_date?: string;
  end_date?: string;
  company_id?: string;
  department?: string;
  employee_status?: string;
  employee_id?: string;
  search_term?: string;
  include_inactive?: boolean;
  position?: string;
  hire_date_from?: string;
  hire_date_to?: string;
  pay_type?: string;
  min_salary?: number;
  max_salary?: number;
  effective_date_from?: string;
  effective_date_to?: string;
  include_history?: boolean;
  permit_type?: string;
  expiry_days_ahead?: number;
  is_expired?: boolean;
  // Sort and Group By options
  sort_by?: SortField;
  sort_direction?: SortDirection;
  group_by?: GroupByField;
  group_by_secondary?: GroupByField;
}

// Export Options
export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'excel';
  filename?: string;
  include_summary?: boolean;
}
