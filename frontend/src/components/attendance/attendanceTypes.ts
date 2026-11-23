export interface Attendance {
  id?: number;
  employee_id: string;
  employee_name?: string;
  date: string;
  check_in?: string;
  check_out?: string;
  rounded_check_in?: string;
  rounded_check_out?: string;
  regular_hours: number;
  ot_hours: number;
  weekend_ot_hours: number;
  stat_holiday_hours: number;
  is_manual_override: boolean;
  override_check_in?: string;
  override_check_out?: string;
  override_regular_hours?: number;
  override_ot_hours?: number;
  override_weekend_ot_hours?: number;
  override_stat_holiday_hours?: number;
  time_edit_reason?: string;
  hours_edit_reason?: string;
  notes?: string;
  remarks?: string | null;
  leave_type?: string;
  stat_holiday_name?: string;
}

export interface AttendanceReport {
  summary: Array<{
    employee_id: string;
    employee_name: string;
    total_regular_hours: number;
    total_ot_hours: number;
    total_weekend_ot_hours: number;
    total_stat_holiday_hours: number;
    total_days: number;
  }>;
  total_regular_hours: number;
  total_ot_hours: number;
  total_weekend_ot_hours: number;
  total_stat_holiday_hours: number;
}

export interface AttendanceDetailRow {
  employee_id: string;
  employee_name: string;
  date: string;
  check_in?: string;
  check_out?: string;
  day_type: string;
  regular_hours: number;
  ot_hours: number;
  weekend_ot_hours: number;
  stat_holiday_hours: number;
  leave_type?: string;
  stat_holiday_name?: string;
  remarks?: string | null;
}

export interface AttendanceDetailedReport {
  details: AttendanceDetailRow[];
}

export interface PayPeriod {
  start_date: string;
  end_date: string;
  period_number: number;
  year: number;
  duration_days: number;
}

export interface Employee {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
}

export interface DetailedRowSubtotal {
  employee_id: string;
  employee_name: string;
  regular_hours: number;
  ot_hours: number;
  weekend_ot_hours: number;
  stat_holiday_hours: number;
}

export type DetailedRowWithSubtotal =
  | { type: 'detail'; row: AttendanceDetailRow }
  | { type: 'subtotal'; subtotal: DetailedRowSubtotal };

export interface AttendanceUploadPreviewRow {
  row_number: number;
  person_id: string;
  name: string;
  date: string;
  check_in?: string | null;
  check_out?: string | null;
  status: 'valid' | 'invalid' | 'duplicate' | string;
  error_message?: string | null;
}

export interface AttendanceUploadPreview {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  rows: AttendanceUploadPreviewRow[];
}

export interface AttendanceUploadResponse {
  success: boolean;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  errors: string[];
}
