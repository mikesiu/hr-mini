export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  other_name?: string;
  full_name: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  dob?: string;
  sin?: string;
  drivers_license?: string;
  hire_date?: string;
  probation_end_date?: string;
  seniority_start_date?: string;
  status: string;
  remarks?: string;
  paystub: boolean;
  union_member: boolean;
  vacation_percent?: number | null;
  vacation_percent_override?: boolean;
  use_mailing_address: boolean;
  mailing_street?: string;
  mailing_city?: string;
  mailing_province?: string;
  mailing_postal_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  company_id?: string;
  company_short_form?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeFormData {
  employee_id: string;
  first_name: string;
  last_name: string;
  other_name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postal_code: string;
  dob: string;
  sin: string;
  drivers_license: string;
  hire_date: string;
  probation_end_date: string;
  seniority_start_date: string;
  status: string;
  remarks: string;
  union_member: boolean;
  vacation_percent: string | number;
  vacation_percent_override: boolean;
  use_mailing_address: boolean;
  mailing_street: string;
  mailing_city: string;
  mailing_province: string;
  mailing_postal_code: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

export const createEmptyFormData = (): EmployeeFormData => ({
  employee_id: '',
  first_name: '',
  last_name: '',
  other_name: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  province: '',
  postal_code: '',
  dob: '',
  sin: '',
  drivers_license: '',
  hire_date: '',
  probation_end_date: '',
  seniority_start_date: '',
  status: 'Active',
  remarks: '',
  union_member: false,
  vacation_percent: '',
  vacation_percent_override: false,
  use_mailing_address: false,
  mailing_street: '',
  mailing_city: '',
  mailing_province: '',
  mailing_postal_code: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
});

export const employeeToFormData = (e: Employee): EmployeeFormData => ({
  employee_id: e.id,
  first_name: e.first_name,
  last_name: e.last_name,
  other_name: e.other_name || '',
  email: e.email || '',
  phone: e.phone || '',
  street: e.street || '',
  city: e.city || '',
  province: e.province || '',
  postal_code: e.postal_code || '',
  dob: e.dob || '',
  sin: e.sin || '',
  drivers_license: e.drivers_license || '',
  hire_date: e.hire_date || '',
  probation_end_date: e.probation_end_date || '',
  seniority_start_date: e.seniority_start_date || '',
  status: e.status,
  remarks: e.remarks || '',
  union_member: e.union_member || false,
  vacation_percent:
    e.vacation_percent !== null && e.vacation_percent !== undefined ? e.vacation_percent : '',
  vacation_percent_override: e.vacation_percent_override || false,
  use_mailing_address: e.use_mailing_address || false,
  mailing_street: e.mailing_street || '',
  mailing_city: e.mailing_city || '',
  mailing_province: e.mailing_province || '',
  mailing_postal_code: e.mailing_postal_code || '',
  emergency_contact_name: e.emergency_contact_name || '',
  emergency_contact_phone: e.emergency_contact_phone || '',
});

export const EMPLOYEE_STATUSES = ['Active', 'On Leave', 'Terminated', 'Probation'] as const;

/** Semantic status styling (tokens defined in src/index.css). */
export const STATUS_META: Record<string, { badge: string; dot: string }> = {
  Active: { badge: 'bg-event-union/15 text-event-union', dot: 'bg-event-union' },
  Probation: { badge: 'bg-event-probation/15 text-event-probation', dot: 'bg-event-probation' },
  'On Leave': { badge: 'bg-event-cra/15 text-event-cra', dot: 'bg-event-cra' },
  Terminated: { badge: 'bg-destructive/10 text-destructive', dot: 'bg-destructive' },
};

export const DEFAULT_STATUS_META = {
  badge: 'bg-muted text-muted-foreground',
  dot: 'bg-muted-foreground',
};

export const getStatusMeta = (status: string) => STATUS_META[status] ?? DEFAULT_STATUS_META;

export const getInitials = (firstName: string, lastName: string) =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

export const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString();
};
