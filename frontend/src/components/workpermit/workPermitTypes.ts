export type PermitStatus = 'valid' | 'expiring_soon' | 'expired';

/** Permits expiring within this many days are flagged "Expiring Soon" (matches backend). */
export const EXPIRING_SOON_DAYS = 60;

export interface WorkPermit {
  id: number;
  employee_id: string;
  permit_type: string;
  permit_number?: string | null;
  issue_date?: string | null;
  expiry_date: string;
  status?: string;
  renewed_date?: string | null;
  notes?: string | null;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
  };
}

/** Current permit joined with employee + company info (GET /work-permits/current). */
export interface CurrentPermit {
  id: number;
  employee_id: string;
  employee_code: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  company_id?: string | null;
  company_code?: string | null;
  company_name?: string | null;
  permit_type: string;
  permit_number?: string | null;
  issue_date?: string | null;
  expiry_date: string;
  status?: string;
  notes?: string | null;
  days_remaining: number;
  permit_status: PermitStatus;
}

export interface PickerEmployee {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  status: string;
}

export interface PermitFormData {
  employee_id: string;
  permit_type: string;
  permit_number: string;
  issue_date: string;
  expiry_date: string;
  renewed_date: string;
  notes: string;
}

export const PERMIT_TYPES = [
  'Open Work Permit',
  'Closed Work Permit',
  'Student Work Permit',
  'Post-Graduation Work Permit',
  'Temporary Foreign Worker Permit',
  'Other',
];

export const STATUS_META: Record<PermitStatus, { label: string; badgeClass: string }> = {
  valid: {
    label: 'Valid',
    badgeClass: 'border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  },
  expiring_soon: {
    label: 'Expiring Soon',
    badgeClass: 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  expired: {
    label: 'Expired',
    badgeClass: 'border-transparent bg-destructive/15 text-destructive',
  },
};

export function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Local-date display for YYYY-MM-DD (avoids timezone shifts). */
export function formatDateString(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const datePart = dateStr.split('T')[0];
  const m = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString();
}

export function getDaysUntilExpiry(expiryDate: string): number {
  const datePart = expiryDate.split('T')[0];
  const [y, mo, d] = datePart.split('-').map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, mo - 1, d).getTime() - today.getTime()) / 86400000);
}

export function classifyDays(days: number): PermitStatus {
  if (days < 0) return 'expired';
  if (days <= EXPIRING_SOON_DAYS) return 'expiring_soon';
  return 'valid';
}

export function isRenewedPermit(p: Pick<WorkPermit, 'status' | 'renewed_date'>): boolean {
  return p.status === 'renewed' || !!p.renewed_date;
}

export function formatDaysRemaining(days: number): string {
  if (days === 0) return 'Expires today';
  if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'}`;
  const n = Math.abs(days);
  return `${n} ${n === 1 ? 'day' : 'days'} overdue`;
}

export function daysTextClass(status: PermitStatus): string {
  if (status === 'expired') return 'text-destructive';
  if (status === 'expiring_soon') return 'text-amber-700 dark:text-amber-400';
  return 'text-foreground';
}
