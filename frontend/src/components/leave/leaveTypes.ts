export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string;
  phone?: string;
  hire_date?: string;
  probation_end_date?: string;
  status: string;
}

export interface LeaveType {
  id: number;
  name: string;
  code: string;
  days_per_year: number;
  carry_over: boolean;
  max_carry_over?: number;
  is_active: boolean;
}

export interface Leave {
  id: number;
  employee_id: string;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string;
  status: string;
  approved_by?: number;
  approved_at?: string;
  remarks?: string;
  created_at: string;
  updated_at?: string;
  employee?: Employee;
}

export interface LeaveBalance {
  employee_id: string;
  vacation_remaining: number;
  sick_remaining: number;
  vacation_entitlement: number;
  sick_entitlement: number;
  vacation_earned_date?: string;
  vacation_expiry_date?: string;
  hire_date?: string;
  seniority_start_date?: string;
  years_employed: number;
}

export interface LeaveFormData {
  leave_type_id: number;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string;
  status: string;
}

export type LeaveCategory = 'all' | 'vacation' | 'sick' | 'others';

export interface LeaveUploadError {
  row_number: number;
  error_message: string;
}

export interface LeaveUploadResponse {
  success_count: number;
  skipped_count: number;
  error_count: number;
  errors: LeaveUploadError[];
}

export interface LeaveUploadPreviewRow {
  row_number: number;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  will_import: boolean;
  error_message?: string;
}

export interface LeaveUploadPreviewResponse {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  rows: LeaveUploadPreviewRow[];
}

export interface LeaveStats {
  entitlement: number;
  taken: number;
  unpaid: number;
  balance: number;
  periodStart?: Date;
  periodEnd?: Date;
}

export const getLeaveTypeCategory = (leaveTypeCode: string): LeaveCategory => {
  switch (leaveTypeCode.toUpperCase()) {
    case 'VAC':
    case 'UNPAID':
      return 'vacation';
    case 'SICK':
    case 'UNPAIDSICK':
      return 'sick';
    default:
      return 'others';
  }
};

// Format date to avoid timezone issues
export const formatLeaveDate = (dateString: string) => {
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString();
  }
  return new Date(dateString).toLocaleDateString();
};

// Single-day leaves show one date; multi-day shows a range
export const formatLeaveRange = (start: string, end: string) =>
  start === end || formatLeaveDate(start) === formatLeaveDate(end)
    ? formatLeaveDate(start)
    : `${formatLeaveDate(start)} \u2013 ${formatLeaveDate(end)}`;

export const LEAVE_CODE_TINT: Record<string, string> = {
  VAC: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  SICK: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  UNPAIDSICK: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  UNPAID: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
};

export const DEFAULT_LEAVE_TINT = 'bg-muted text-muted-foreground';
