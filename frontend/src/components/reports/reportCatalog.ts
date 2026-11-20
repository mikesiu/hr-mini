import {
  BadgeCheck, CalendarCheck, CalendarDays, Contact, FileText, History, IdCard, PiggyBank,
  Receipt, Users, Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReportType } from '../../types/reports';

export interface ReportCategory {
  id: string;
  label: string;
  types: string[];
}

/** Logical grouping for the catalog. Types the API returns that are not listed land in "Other". */
export const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'people',
    label: 'People & Organization',
    types: ['employee_directory', 'employment_history', 'employee_basic_profile', 'employee_personal_details'],
  },
  {
    id: 'leave',
    label: 'Leave & Time',
    types: ['leave_balance', 'leave_taken', 'vacation_pay_ledger'],
  },
  {
    id: 'compensation',
    label: 'Compensation & Compliance',
    types: ['salary_analysis', 'expense_reimbursement', 'work_permit_status'],
  },
];

export const REPORT_ICONS: Record<string, LucideIcon> = {
  employee_directory: Users,
  employment_history: History,
  employee_basic_profile: Contact,
  employee_personal_details: IdCard,
  leave_balance: CalendarCheck,
  leave_taken: CalendarDays,
  vacation_pay_ledger: PiggyBank,
  salary_analysis: Wallet,
  expense_reimbursement: Receipt,
  work_permit_status: BadgeCheck,
};

export const getReportIcon = (type: string): LucideIcon =>
  REPORT_ICONS[type] || FileText;

export interface GroupedCatalog {
  id: string;
  label: string;
  reports: ReportType[];
}

export const groupReportTypes = (reportTypes: ReportType[]): GroupedCatalog[] => {
  const known = new Set(REPORT_CATEGORIES.flatMap((c) => c.types));
  const groups: GroupedCatalog[] = REPORT_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    reports: c.types
      .map((t) => reportTypes.find((r) => r.type === t))
      .filter((r): r is ReportType => !!r),
  }));
  const other = reportTypes.filter((r) => !known.has(r.type));
  if (other.length > 0) groups.push({ id: 'other', label: 'Other', reports: other });
  return groups.filter((g) => g.reports.length > 0);
};
