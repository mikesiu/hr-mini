/**
 * Sort and Group validation utilities for HR Reports
 * Provides validation for sort by and group by fields based on report type
 */

export interface SortGroupValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  availableSortFields: string[];
  availableGroupFields: string[];
}

// Define which sort fields are applicable to which report types
export const SORT_FIELD_APPLICABILITY = {
  // Common fields (apply to all reports)
  employee_name: ['employee_directory', 'employment_history', 'leave_balance', 'leave_taken', 'salary_analysis', 'work_permit_status', 'comprehensive_overview', 'expense_reimbursement'],
  employee_id: ['employee_directory', 'employment_history', 'leave_balance', 'leave_taken', 'salary_analysis', 'work_permit_status', 'comprehensive_overview', 'expense_reimbursement'],
  company_name: ['employee_directory', 'employment_history', 'leave_balance', 'leave_taken', 'salary_analysis', 'work_permit_status', 'comprehensive_overview', 'expense_reimbursement'],
  department: ['employee_directory', 'employment_history', 'leave_balance', 'leave_taken', 'salary_analysis', 'work_permit_status', 'comprehensive_overview', 'expense_reimbursement'],
  position: ['employee_directory', 'employment_history', 'leave_balance', 'leave_taken', 'salary_analysis', 'work_permit_status', 'comprehensive_overview', 'expense_reimbursement'],
  status: ['employee_directory', 'employment_history', 'leave_balance', 'leave_taken', 'salary_analysis', 'work_permit_status', 'comprehensive_overview', 'expense_reimbursement'],
  hire_date: ['employee_directory', 'employment_history', 'leave_balance', 'leave_taken', 'salary_analysis', 'work_permit_status', 'comprehensive_overview', 'expense_reimbursement'],
  
  // Employment specific
  start_date: ['employment_history', 'leave_taken'],
  end_date: ['employment_history', 'leave_taken'],
  duration: ['employment_history'],
  
  // Salary specific
  pay_rate: ['salary_analysis'],
  effective_date: ['salary_analysis'],
  
  // Leave specific
  leave_type: ['leave_taken'],
  leave_type_code: ['leave_taken'],
  leave_type_name: ['leave_taken'],
  days_requested: ['leave_taken'],
  days_taken: ['leave_taken'],
  vacation_days: ['leave_balance'],
  sick_days: ['leave_balance'],
  created_at: ['leave_taken'],
  updated_at: ['leave_taken'],
  
  // Work permit specific
  permit_type: ['work_permit_status'],
  expiry_date: ['work_permit_status'],
  days_until_expiry: ['work_permit_status'],
  
  // Expense specific
  expense_type: ['expense_analysis', 'expense_reimbursement'],
  amount: ['expense_analysis', 'expense_reimbursement'],
  paid_date: ['expense_analysis', 'expense_reimbursement'],
};

// Define which group fields are applicable to which report types
export const GROUP_FIELD_APPLICABILITY = {
  // Common groupings (apply to all reports)
  employee: ['employee_directory', 'employment_history', 'leave_balance', 'leave_taken', 'salary_analysis', 'work_permit_status', 'comprehensive_overview', 'expense_reimbursement'],
  company: ['employee_directory', 'employment_history', 'leave_balance', 'leave_taken', 'salary_analysis', 'work_permit_status', 'comprehensive_overview', 'expense_reimbursement'],
  department: ['employee_directory', 'employment_history', 'leave_balance', 'leave_taken', 'salary_analysis', 'work_permit_status', 'comprehensive_overview', 'expense_reimbursement'],
  position: ['employee_directory', 'employment_history', 'leave_balance', 'leave_taken', 'salary_analysis', 'work_permit_status', 'comprehensive_overview', 'expense_reimbursement'],
  status: ['employee_directory', 'employment_history', 'leave_balance', 'leave_taken', 'salary_analysis', 'work_permit_status', 'comprehensive_overview', 'expense_reimbursement'],
  
  // Employment specific
  employment_period: ['employment_history'],
  
  // Salary specific
  pay_type: ['salary_analysis'],
  salary_range: ['salary_analysis'],
  
  // Leave specific
  leave_type: ['leave_taken'],
  leave_status: ['leave_taken'],
  
  // Work permit specific
  permit_type: ['work_permit_status'],
  expiry_status: ['work_permit_status'],
  
  // Expense specific
  expense_type: ['expense_analysis', 'expense_reimbursement'],
  claim_status: ['expense_analysis', 'expense_reimbursement'],
};

/**
 * Get available sort fields for a report type
 */
export function getAvailableSortFields(reportType: string): string[] {
  return Object.keys(SORT_FIELD_APPLICABILITY).filter(field => 
    SORT_FIELD_APPLICABILITY[field as keyof typeof SORT_FIELD_APPLICABILITY].includes(reportType)
  );
}

/**
 * Get available group fields for a report type
 */
export function getAvailableGroupFields(reportType: string): string[] {
  return Object.keys(GROUP_FIELD_APPLICABILITY).filter(field => 
    GROUP_FIELD_APPLICABILITY[field as keyof typeof GROUP_FIELD_APPLICABILITY].includes(reportType)
  );
}

/**
 * Check if a sort field is applicable to a report type
 */
export function isSortFieldApplicable(sortField: string, reportType: string): boolean {
  const applicableFields = SORT_FIELD_APPLICABILITY[sortField as keyof typeof SORT_FIELD_APPLICABILITY];
  return applicableFields ? applicableFields.includes(reportType) : false;
}

/**
 * Check if a group field is applicable to a report type
 */
export function isGroupFieldApplicable(groupField: string, reportType: string): boolean {
  const applicableFields = GROUP_FIELD_APPLICABILITY[groupField as keyof typeof GROUP_FIELD_APPLICABILITY];
  return applicableFields ? applicableFields.includes(reportType) : false;
}

/**
 * Validate sort and group fields for a specific report type
 */
export function validateSortGroupFields(
  sortBy: string | undefined,
  groupBy: string | undefined,
  groupBySecondary: string | undefined,
  reportType: string
): SortGroupValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const availableSortFields = getAvailableSortFields(reportType);
  const availableGroupFields = getAvailableGroupFields(reportType);
  
  // Validate sort field
  if (sortBy && sortBy !== '') {
    if (!isSortFieldApplicable(sortBy, reportType)) {
      errors.push(`Sort field "${sortBy}" is not applicable to ${reportType.replace('_', ' ')} reports`);
    }
  }
  
  // Validate group field
  if (groupBy && groupBy !== '') {
    if (!isGroupFieldApplicable(groupBy, reportType)) {
      errors.push(`Group field "${groupBy}" is not applicable to ${reportType.replace('_', ' ')} reports`);
    }
  }
  
  // Validate secondary group field
  if (groupBySecondary && groupBySecondary !== '') {
    if (!isGroupFieldApplicable(groupBySecondary, reportType)) {
      errors.push(`Secondary group field "${groupBySecondary}" is not applicable to ${reportType.replace('_', ' ')} reports`);
    }
    
    // Check if secondary group is the same as primary group
    if (groupBySecondary === groupBy) {
      warnings.push('Secondary group field should be different from primary group field');
    }
  }
  
  // Check for logical combinations
  if (groupBy && groupBySecondary) {
    // Some combinations might not make sense
    if (groupBy === 'employee' && groupBySecondary === 'employee') {
      warnings.push('Grouping by employee twice may not provide meaningful results');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    availableSortFields,
    availableGroupFields
  };
}

/**
 * Get human-readable field names for display
 */
export function getFieldDisplayName(field: string): string {
  const displayNames: Record<string, string> = {
    // Sort fields
    employee_name: 'Employee Name',
    employee_id: 'Employee ID',
    company_name: 'Company',
    department: 'Department',
    position: 'Position',
    status: 'Status',
    hire_date: 'Hire Date',
    start_date: 'Start Date',
    end_date: 'End Date',
    duration: 'Duration',
    pay_rate: 'Pay Rate',
    effective_date: 'Effective Date',
    leave_type: 'Leave Type',
    leave_type_code: 'Leave Type Code',
    leave_type_name: 'Leave Type Name',
    days_requested: 'Days Requested',
    days_taken: 'Days Taken',
    vacation_days: 'Vacation Days',
    sick_days: 'Sick Days',
    created_at: 'Created Date',
    updated_at: 'Updated Date',
    permit_type: 'Permit Type',
    expiry_date: 'Expiry Date',
    days_until_expiry: 'Days Until Expiry',
    expense_type: 'Expense Type',
    amount: 'Amount',
    paid_date: 'Paid Date',
    
    // Group fields
    employment_period: 'Employment Period',
    salary_range: 'Salary Range',
    leave_status: 'Leave Status',
    expiry_status: 'Expiry Status',
    claim_status: 'Claim Status',
  };
  
  return displayNames[field] || field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Get field descriptions for tooltips
 */
export function getFieldDescription(field: string): string {
  const descriptions: Record<string, string> = {
    employee_name: 'Sort by employee full name alphabetically',
    employee_id: 'Sort by employee ID',
    company_name: 'Sort by company name',
    department: 'Sort by department name',
    position: 'Sort by job position',
    status: 'Sort by employment status',
    hire_date: 'Sort by hire date (newest first)',
    start_date: 'Sort by start date',
    end_date: 'Sort by end date',
    duration: 'Sort by employment duration',
    pay_rate: 'Sort by salary amount',
    effective_date: 'Sort by salary effective date',
    leave_type: 'Sort by leave type',
    days_taken: 'Sort by number of days taken',
    permit_type: 'Sort by work permit type',
    expiry_date: 'Sort by permit expiry date',
  };
  
  return descriptions[field] || `Sort by ${getFieldDisplayName(field).toLowerCase()}`;
}
