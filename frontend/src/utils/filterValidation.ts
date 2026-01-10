/**
 * Filter validation utilities for HR Reports
 * Provides validation and error handling for report filters
 */

export interface FilterValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  applicableFilters: string[];
}

export interface ReportFilterConfig {
  name: string;
  type: string;
  label: string;
  description: string;
  options?: string[];
  applicableReports: string[];
  required?: boolean;
  dependsOn?: string[];
}

// Define which filters are applicable to which report types
export const FILTER_CONFIGS: ReportFilterConfig[] = [
  // Common filters (apply to all reports)
  {
    name: 'company_id',
    type: 'select',
    label: 'Company',
    description: 'Filter by company',
    applicableReports: ['employee_directory', 'employment_history', 'leave_balance', 'leave_taken', 'salary_analysis', 'work_permit_status', 'comprehensive_overview', 'expense_reimbursement']
  },
  {
    name: 'department',
    type: 'text',
    label: 'Department',
    description: 'Filter by department',
    applicableReports: ['employee_directory', 'employment_history', 'leave_balance', 'leave_taken', 'salary_analysis', 'work_permit_status', 'comprehensive_overview', 'expense_reimbursement']
  },
  {
    name: 'employee_status',
    type: 'select',
    label: 'Status',
    description: 'Employee status',
    options: ['Active', 'On Leave', 'Terminated', 'Probation', 'Active & Probation', 'All'],
    applicableReports: ['employee_directory', 'employment_history', 'leave_balance', 'leave_taken', 'salary_analysis', 'work_permit_status', 'comprehensive_overview', 'expense_reimbursement']
  },
  {
    name: 'search_term',
    type: 'text',
    label: 'Search',
    description: 'Search term',
    applicableReports: ['employee_directory', 'employment_history', 'leave_balance', 'leave_taken', 'salary_analysis', 'work_permit_status', 'comprehensive_overview', 'expense_reimbursement']
  },

  // Universal sorting and grouping filters (apply to all reports)
  {
    name: 'sort_by',
    type: 'select',
    label: 'Sort By',
    description: 'Field to sort by',
    applicableReports: ['employee_directory', 'employment_history', 'leave_balance', 'leave_taken', 'salary_analysis', 'work_permit_status', 'comprehensive_overview', 'expense_reimbursement']
  },
  {
    name: 'sort_direction',
    type: 'select',
    label: 'Sort Direction',
    description: 'Sort direction (ascending or descending)',
    applicableReports: ['employee_directory', 'employment_history', 'leave_balance', 'leave_taken', 'salary_analysis', 'work_permit_status', 'comprehensive_overview', 'expense_reimbursement']
  },
  {
    name: 'group_by',
    type: 'select',
    label: 'Group By',
    description: 'Field to group by',
    applicableReports: ['employee_directory', 'employment_history', 'leave_balance', 'leave_taken', 'salary_analysis', 'work_permit_status', 'comprehensive_overview', 'expense_reimbursement']
  },
  {
    name: 'group_by_secondary',
    type: 'select',
    label: 'Secondary Group By',
    description: 'Secondary field to group by',
    applicableReports: ['employee_directory', 'employment_history', 'leave_balance', 'leave_taken', 'salary_analysis', 'work_permit_status', 'comprehensive_overview', 'expense_reimbursement']
  },

  // Employee Directory specific filters
  {
    name: 'include_inactive',
    type: 'boolean',
    label: 'Include Inactive',
    description: 'Include inactive employees',
    applicableReports: ['employee_directory']
  },
  {
    name: 'position',
    type: 'text',
    label: 'Position',
    description: 'Filter by position',
    applicableReports: ['employee_directory']
  },
  {
    name: 'hire_date_from',
    type: 'date',
    label: 'Hire Date From',
    description: 'Filter by hire date range',
    applicableReports: ['employee_directory']
  },
  {
    name: 'hire_date_to',
    type: 'date',
    label: 'Hire Date To',
    description: 'Filter by hire date range',
    applicableReports: ['employee_directory']
  },

  // Employment History specific filters
  {
    name: 'start_date',
    type: 'date',
    label: 'Start Date',
    description: 'Filter by employment start date',
    applicableReports: ['employment_history', 'leave_taken', 'expense_reimbursement']
  },
  {
    name: 'end_date',
    type: 'date',
    label: 'End Date',
    description: 'Filter by employment end date',
    applicableReports: ['employment_history', 'leave_taken', 'expense_reimbursement']
  },

  // Salary Analysis specific filters
  {
    name: 'pay_type',
    type: 'select',
    label: 'Pay Type',
    description: 'Filter by pay type',
    options: ['Hourly', 'Monthly', 'Annual'],
    applicableReports: ['salary_analysis']
  },
  {
    name: 'min_salary',
    type: 'number',
    label: 'Min Salary',
    description: 'Minimum salary filter',
    applicableReports: ['salary_analysis']
  },
  {
    name: 'max_salary',
    type: 'number',
    label: 'Max Salary',
    description: 'Maximum salary filter',
    applicableReports: ['salary_analysis']
  },
  {
    name: 'effective_date_from',
    type: 'date',
    label: 'Effective Date From',
    description: 'Filter by salary effective date',
    applicableReports: ['salary_analysis']
  },
  {
    name: 'effective_date_to',
    type: 'date',
    label: 'Effective Date To',
    description: 'Filter by salary effective date',
    applicableReports: ['salary_analysis']
  },

  // Work Permit specific filters
  {
    name: 'permit_type',
    type: 'text',
    label: 'Permit Type',
    description: 'Filter by permit type',
    applicableReports: ['work_permit_status']
  },
  {
    name: 'expiry_days_ahead',
    type: 'number',
    label: 'Expiry Days Ahead',
    description: 'Days ahead to check for expiring permits',
    applicableReports: ['work_permit_status']
  },
  {
    name: 'is_expired',
    type: 'boolean',
    label: 'Show Expired Only',
    description: 'Show only expired permits',
    applicableReports: ['work_permit_status']
  }
];

/**
 * Get filters applicable to a specific report type
 */
export function getApplicableFilters(reportType: string): ReportFilterConfig[] {
  return FILTER_CONFIGS.filter(filter => 
    filter.applicableReports.includes(reportType)
  );
}

/**
 * Validate filters for a specific report type
 */
export function validateFilters(filters: Record<string, any>, reportType: string): FilterValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const applicableFilters = getApplicableFilters(reportType);
  const applicableFilterNames = applicableFilters.map(f => f.name);

  // Check for invalid filters (not applicable to this report type)
  Object.keys(filters).forEach(filterName => {
    if (filters[filterName] !== undefined && filters[filterName] !== '' && filters[filterName] !== null) {
      if (!applicableFilterNames.includes(filterName)) {
        const filterConfig = FILTER_CONFIGS.find(f => f.name === filterName);
        const message = `Filter "${filterConfig?.label || filterName}" is not applicable to ${reportType.replace('_', ' ')} reports`;
        warnings.push(message);
      }
    }
  });

  // Check for required filters
  applicableFilters.forEach(filter => {
    if (filter.required && (!filters[filter.name] || filters[filter.name] === '')) {
      errors.push(`Filter "${filter.label}" is required`);
    }
  });

  // Check for dependent filters
  applicableFilters.forEach(filter => {
    if (filter.dependsOn) {
      const hasDependency = filter.dependsOn.some(dep => 
        filters[dep] !== undefined && filters[dep] !== '' && filters[dep] !== null
      );
      if (filters[filter.name] && !hasDependency) {
        warnings.push(`Filter "${filter.label}" requires one of: ${filter.dependsOn.join(', ')}`);
      }
    }
  });

  // Validate filter values
  Object.keys(filters).forEach(filterName => {
    const value = filters[filterName];
    if (value !== undefined && value !== '' && value !== null) {
      const filterConfig = FILTER_CONFIGS.find(f => f.name === filterName);
      if (filterConfig) {
        // Validate based on filter type
        switch (filterConfig.type) {
          case 'number':
            if (isNaN(Number(value))) {
              errors.push(`Filter "${filterConfig.label}" must be a valid number`);
            }
            break;
          case 'date':
            if (isNaN(Date.parse(value))) {
              errors.push(`Filter "${filterConfig.label}" must be a valid date`);
            }
            break;
          case 'select':
            if (filterConfig.options && !filterConfig.options.includes(value)) {
              errors.push(`Filter "${filterConfig.label}" must be one of: ${filterConfig.options.join(', ')}`);
            }
            break;
        }
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    applicableFilters: applicableFilterNames
  };
}

/**
 * Get filter suggestions for a report type
 */
export function getFilterSuggestions(reportType: string): string[] {
  const applicableFilters = getApplicableFilters(reportType);
  return applicableFilters.map(filter => 
    `${filter.label}: ${filter.description}`
  );
}

/**
 * Check if a filter is applicable to a report type
 */
export function isFilterApplicable(filterName: string, reportType: string): boolean {
  const filterConfig = FILTER_CONFIGS.find(f => f.name === filterName);
  return filterConfig ? filterConfig.applicableReports.includes(reportType) : false;
}

/**
 * Get filter configuration by name
 */
export function getFilterConfig(filterName: string): ReportFilterConfig | undefined {
  return FILTER_CONFIGS.find(f => f.name === filterName);
}
