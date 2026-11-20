export interface VacationTier {
  id?: number;
  min_years: number;
  max_years: number | null;
  percent: number;
  union_member: boolean;
}

export const BC_ESA_TIERS = [
  { min_years: 0, max_years: 5, percent: 4 },
  { min_years: 5, max_years: null, percent: 6 },
] as const;

export const CA_SCHEDULE_TIERS = [
  { min_years: 0, max_years: 5, percent: 4 },
  { min_years: 5, max_years: 11, percent: 6 },
  { min_years: 11, max_years: 21, percent: 8 },
  { min_years: 21, max_years: null, percent: 10 },
] as const;

export const defaultVacationTiers = (): VacationTier[] => [
  ...BC_ESA_TIERS.map((t) => ({ ...t, max_years: t.max_years as number | null, union_member: false })),
  ...BC_ESA_TIERS.map((t) => ({ ...t, max_years: t.max_years as number | null, union_member: true })),
];

export const withUnionFlag = (
  schedule: ReadonlyArray<{ min_years: number; max_years: number | null; percent: number }>,
  union_member: boolean
): VacationTier[] => schedule.map((t) => ({ ...t, union_member }));

export interface Company {
  id: string;
  legal_name: string;
  trade_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country: string;
  notes?: string;
  payroll_due_start_date?: string;
  pay_period_start_date?: string;
  payroll_frequency?: string;
  cra_due_dates?: string;
  union_due_date?: number;
  vacation_pay_with_payroll?: boolean;
  vacation_percent_tiers?: VacationTier[];
  created_at?: string;
  updated_at?: string;
}

export interface CompanyFormData {
  id: string;
  legal_name: string;
  trade_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  notes: string;
  payroll_due_start_date: string;
  pay_period_start_date: string;
  payroll_frequency: string;
  cra_due_dates: string;
  union_due_date: string;
  vacation_pay_with_payroll: boolean;
  vacation_percent_tiers: VacationTier[];
}
