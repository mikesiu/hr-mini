import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ReportColumn {
  header: string;
  /** Optional spanning header shown above consecutive columns that share it. */
  group?: string;
  align?: 'left' | 'right' | 'center';
  render: (record: any) => React.ReactNode;
}

/* ---------- formatting helpers (same output rules as before) ---------- */

export const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '';
  try {
    // Parse YYYY-MM-DD dates locally to avoid timezone issues
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString();
    }
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
};

export const formatCurrency = (amount?: number | null): string => {
  if (amount === undefined || amount === null) return '';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
};

/* ---------- cell building blocks ---------- */

export const Dash: React.FC = () => <span className="text-muted-foreground">—</span>;

const text = (v: unknown): React.ReactNode =>
  v === undefined || v === null || v === '' ? <Dash /> : <>{String(v)}</>;

const num = (v: unknown): React.ReactNode =>
  v === undefined || v === null || v === '' ? <Dash /> : <span className="tabular-nums">{String(v)}</span>;

const date = (v?: string | null): React.ReactNode =>
  v ? <span className="tabular-nums whitespace-nowrap">{formatDate(v)}</span> : <Dash />;

const money = (v?: number | null): React.ReactNode =>
  v === undefined || v === null ? <Dash /> : <span className="tabular-nums">{formatCurrency(v)}</span>;

const EmployeeCell: React.FC<{ name?: string; id?: string }> = ({ name, id }) => (
  <div className="min-w-[8rem]">
    <div className="font-medium whitespace-nowrap text-foreground">{name || <Dash />}</div>
    <div className="font-mono text-xs text-muted-foreground tabular-nums">{id || '—'}</div>
  </div>
);

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
const TONES: Record<Tone, string> = {
  success: 'border-transparent bg-event-union/15 text-event-union',
  warning: 'border-transparent bg-event-cra/15 text-event-cra',
  danger: 'border-transparent bg-destructive/10 text-destructive',
  info: 'border-transparent bg-event-payroll/15 text-event-payroll',
  neutral: '',
};

export const StatusPill: React.FC<{ label?: string; tone: Tone; className?: string }> = ({
  label, tone, className,
}) =>
  label ? (
    <Badge variant="secondary" className={cn('whitespace-nowrap', TONES[tone], className)}>
      {label}
    </Badge>
  ) : (
    <Dash />
  );

const statusTone = (status?: string): Tone => {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'warning';
    case 'terminated':
      return 'danger';
    default:
      return 'neutral';
  }
};

const fixed1 = (v?: number | null) => v?.toFixed(1) || '0.0';

const employeeCol = (): ReportColumn => ({
  header: 'Employee',
  render: (r) => <EmployeeCell name={r.employee_name} id={r.employee_id} />,
});

const permitState = (r: any): { label: string; tone: Tone } =>
  r.is_expired
    ? { label: 'Expired', tone: 'danger' }
    : r.is_expiring_soon
      ? { label: 'Expiring Soon', tone: 'warning' }
      : { label: 'Valid', tone: 'success' };

/* ---------- per-report column definitions ---------- */

export const getReportColumns = (reportType: string): ReportColumn[] => {
  switch (reportType) {
    case 'employee_directory':
      return [
        { header: 'Employee ID', render: (r) => <span className="font-mono text-xs tabular-nums">{text(r.id)}</span> },
        { header: 'Name', render: (r) => <span className="font-medium whitespace-nowrap text-foreground">{text(r.full_name)}</span> },
        { header: 'Email', render: (r) => text(r.email) },
        { header: 'Phone', render: (r) => (r.phone ? <span className="tabular-nums whitespace-nowrap">{r.phone}</span> : <Dash />) },
        { header: 'Status', render: (r) => <StatusPill label={r.status} tone={statusTone(r.status)} /> },
        { header: 'Position', render: (r) => text(r.position) },
        { header: 'Department', render: (r) => text(r.department) },
        { header: 'Company', render: (r) => text(r.company_name) },
        { header: 'Hire Date', render: (r) => date(r.hire_date) },
      ];
    case 'employment_history':
      return [
        employeeCol(),
        { header: 'Company', render: (r) => text(r.company_name) },
        { header: 'Position', render: (r) => text(r.position) },
        { header: 'Department', render: (r) => text(r.department) },
        { header: 'Start Date', render: (r) => date(r.start_date) },
        { header: 'End Date', render: (r) => date(r.end_date) },
        {
          header: 'Status',
          render: (r) => (
            <StatusPill label={r.is_active ? 'Active' : 'Inactive'} tone={r.is_active ? 'success' : 'neutral'} />
          ),
        },
        { header: 'Duration', render: (r) => (r.duration_days ? <span className="tabular-nums whitespace-nowrap">{r.duration_days} days</span> : <Dash />) },
      ];
    case 'salary_analysis':
      return [
        employeeCol(),
        { header: 'Position', render: (r) => text(r.position) },
        { header: 'Company', render: (r) => text(r.company_name) },
        {
          header: 'Pay Rate',
          align: 'right',
          render: (r) =>
            r.pay_rate ? <span className="font-medium tabular-nums">{formatCurrency(r.pay_rate)}</span> : <Dash />,
        },
        { header: 'Pay Type', render: (r) => (r.pay_type ? <Badge variant="outline">{r.pay_type}</Badge> : <Dash />) },
        { header: 'Effective Date', render: (r) => date(r.effective_date) },
        { header: 'End Date', render: (r) => date(r.end_date) },
        { header: 'Notes', render: (r) => text(r.notes) },
      ];
    case 'leave_balance': {
      const balance = (v?: number | null) => (
        <span className={cn('font-medium tabular-nums', v && v > 0 ? 'text-event-union' : 'text-foreground')}>
          {fixed1(v)}
        </span>
      );
      const plain = (v?: number | null) => <span className="tabular-nums">{fixed1(v)}</span>;
      return [
        employeeCol(),
        { header: 'Entitlement', group: 'Vacation Leave', align: 'center', render: (r) => plain(r.vacation_entitlement) },
        { header: 'Taken', group: 'Vacation Leave', align: 'center', render: (r) => plain(r.vacation_taken) },
        { header: 'Balance', group: 'Vacation Leave', align: 'center', render: (r) => balance(r.vacation_balance) },
        { header: 'Entitlement', group: 'Sick Leave', align: 'center', render: (r) => plain(r.sick_entitlement) },
        { header: 'Taken', group: 'Sick Leave', align: 'center', render: (r) => plain(r.sick_taken) },
        { header: 'Balance', group: 'Sick Leave', align: 'center', render: (r) => balance(r.sick_balance) },
      ];
    }
    case 'leave_taken':
      return [
        employeeCol(),
        {
          header: 'Leave Type',
          render: (r) => (
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Badge
                variant="secondary"
                className={cn(
                  'font-mono',
                  r.leave_type_code === 'VAC' && TONES.info,
                  r.leave_type_code === 'SICK' && 'border-transparent bg-event-holiday/15 text-event-holiday'
                )}
              >
                {r.leave_type_code}
              </Badge>
              <span>{r.leave_type_name}</span>
            </div>
          ),
        },
        { header: 'Start Date', render: (r) => date(r.start_date) },
        { header: 'End Date', render: (r) => date(r.end_date) },
        { header: 'Days', align: 'center', render: (r) => <span className="font-medium tabular-nums">{r.days_taken}</span> },
        {
          header: 'Status',
          render: (r) => (
            <StatusPill
              label={r.status}
              tone={
                r.status === 'Active' ? 'success'
                : r.status === 'Cancelled' ? 'danger'
                : r.status === 'Pending' ? 'warning'
                : 'neutral'
              }
            />
          ),
        },
        {
          header: 'Reason',
          render: (r) => (
            <span className="block max-w-[200px] truncate" title={r.reason || undefined}>
              {text(r.reason)}
            </span>
          ),
        },
      ];
    case 'vacation_pay_ledger':
      return [
        employeeCol(),
        { header: 'Payroll Date', render: (r) => date(r.pay_date) },
        { header: 'Gross', align: 'right', render: (r) => money(r.gross_pay) },
        { header: 'Benefits', align: 'right', render: (r) => money(r.benefits) },
        { header: 'Vac Paid', align: 'right', render: (r) => money(r.vacation_paid) },
        { header: 'Vac %', align: 'right', render: (r) => (r.vacation_percent != null ? <span className="tabular-nums">{r.vacation_percent}%</span> : <Dash />) },
        { header: 'Vac Earned', align: 'right', render: (r) => money(r.vacation_amount_earned) },
        { header: 'Vac Balance $', align: 'right', render: (r) => money(r.vacation_balance) },
        { header: 'Vac Taken', align: 'right', render: (r) => num(r.vacation_taken_days ?? 0) },
        { header: 'Vac Dates', render: (r) => text(r.vacation_taken_dates) },
        { header: 'Vac Balance Days', align: 'right', render: (r) => num(r.vacation_balance_days ?? 0) },
        { header: 'Sick Taken', align: 'right', render: (r) => num(r.sick_leave_taken_days ?? 0) },
        { header: 'Sick Dates', render: (r) => text(r.sick_leave_taken_dates) },
        { header: 'Sick Bal', align: 'right', render: (r) => num(r.sick_leave_balance ?? 0) },
      ];
    case 'work_permit_status':
      return [
        employeeCol(),
        { header: 'Permit Type', render: (r) => text(r.permit_type) },
        { header: 'Expiry Date', render: (r) => date(r.expiry_date) },
        {
          header: 'Days Until Expiry',
          align: 'right',
          render: (r) => (
            <span
              className={cn(
                'font-medium tabular-nums',
                r.is_expired ? 'text-destructive' : r.is_expiring_soon ? 'text-event-cra' : 'text-foreground'
              )}
            >
              {r.days_until_expiry ?? 0}
            </span>
          ),
        },
        {
          header: 'Status',
          render: (r) => {
            const s = permitState(r);
            return <StatusPill label={s.label} tone={s.tone} />;
          },
        },
      ];
    case 'employee_personal_details':
      return [
        { header: 'Employee ID', render: (r) => <span className="font-mono text-xs tabular-nums">{text(r.employee_id)}</span> },
        { header: 'Last Name', render: (r) => text(r.last_name) },
        { header: 'First Name', render: (r) => text(r.first_name) },
        { header: 'SIN', render: (r) => (r.sin ? <span className="tabular-nums">{'***-***-' + r.sin.slice(-3)}</span> : <Dash />) },
        {
          header: 'Address',
          render: (r) => {
            const parts = [r.street, r.city, r.province, r.postal_code].filter(Boolean);
            return parts.length > 0 ? parts.join(', ') : <Dash />;
          },
        },
        { header: 'Email', render: (r) => text(r.email) },
        { header: 'Phone', render: (r) => (r.phone ? <span className="tabular-nums whitespace-nowrap">{r.phone}</span> : <Dash />) },
      ];
    case 'employee_basic_profile':
      return [
        { header: 'Name', render: (r) => <span className="font-medium text-foreground">{text(r.name)}</span> },
        { header: 'Company', render: (r) => text(r.company_name) },
        { header: 'Current Position', render: (r) => text(r.current_position) },
        { header: 'Age', align: 'right', render: (r) => num(r.age) },
      ];
    case 'expense_reimbursement':
      return [
        employeeCol(),
        { header: 'Claim ID', render: (r) => (r.claim_id ? <span className="font-mono text-xs tabular-nums">{r.claim_id}</span> : <Dash />) },
        {
          header: 'Paid Date',
          render: (r) =>
            r.paid_date ? <span className="tabular-nums whitespace-nowrap">{new Date(r.paid_date).toLocaleDateString()}</span> : <Dash />,
        },
        { header: 'Expense Type', render: (r) => text(r.expense_type) },
        { header: 'Receipts Amount', align: 'right', render: (r) => (r.receipts_amount ? <span className="tabular-nums">{formatCurrency(r.receipts_amount)}</span> : <Dash />) },
        { header: 'Claims Amount', align: 'right', render: (r) => (r.claims_amount ? <span className="tabular-nums">{formatCurrency(r.claims_amount)}</span> : <Dash />) },
        { header: 'Notes', render: (r) => text(r.notes) },
        { header: 'Document', render: (r) => text(r.document_filename) },
      ];
    default:
      return [{ header: 'Data', render: (r) => <code className="text-xs">{JSON.stringify(r)}</code> }];
  }
};
