// Expense-related TypeScript interfaces

export interface ExpenseClaim {
  id: string;
  employee_id: string;
  paid_date: string; // ISO date string
  expense_type: string;
  receipts_amount: number;
  claims_amount: number;
  notes?: string;
  supporting_document_path?: string; // Legacy field
  document_path?: string;
  document_filename?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseEntitlement {
  id: string;
  employee_id: string;
  expense_type: string;
  entitlement_amount?: number;
  unit: 'monthly' | 'yearly' | 'No Cap' | 'Actual';
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string
  is_active: 'Yes' | 'No';
  rollover: 'Yes' | 'No';
  created_at?: string;
  updated_at?: string;
}

export interface ClaimValidationResult {
  valid: boolean;
  message: string;
  claimable_amount: number;
}

export interface ExpenseSummary {
  employee: {
    id: string;
    name: string;
  };
  entitlements: ExpenseEntitlement[];
  claim_summary: {
    total_claims: number;
    total_receipts_amount: number;
    total_claims_amount: number;
    by_type: {
      [expenseType: string]: {
        count: number;
        receipts_amount: number;
        claims_amount: number;
      };
    };
  };
  recent_claims: ExpenseClaim[];
}

export interface MonthlyExpenseReport {
  id: string;
  employee_id: string;
  employee_name: string;
  paid_date: string;
  expense_type: string;
  receipts_amount: number;
  claims_amount: number;
}

export interface YearlyExpenseReport {
  summary: {
    total_claims: number;
    total_receipts: number;
    total_claimed: number;
    total_employees: number;
  };
  monthly_breakdown: Array<{
    month: number;
    total_receipts: number;
    total_claimed: number;
    total_claims: number;
  }>;
  expense_type_breakdown: {
    [expenseType: string]: {
      total_receipts: number;
      total_claimed: number;
      total_claims: number;
      average_per_claim: number;
    };
  };
  top_employees: Array<{
    employee_id: string;
    employee_name: string;
    total_receipts: number;
    total_claimed: number;
    total_claims: number;
  }>;
  detailed_claims: Array<{
    id: string;
    employee_id: string;
    employee_name: string;
    paid_date: string;
    expense_type: string;
    receipts_amount: number;
    claims_amount: number;
  }>;
}

export interface CreateClaimRequest {
  employee_id: string;
  paid_date: string;
  expense_type: string;
  receipts_amount: number;
  notes?: string;
  supporting_document_path?: string; // Legacy field
  document_path?: string;
  document_filename?: string;
  override_approval?: boolean;
}

export interface UpdateClaimRequest {
  paid_date?: string;
  expense_type?: string;
  receipts_amount?: number;
  notes?: string;
  supporting_document_path?: string; // Legacy field
  document_path?: string;
  document_filename?: string;
}

export interface CreateEntitlementRequest {
  employee_id: string;
  expense_type: string;
  entitlement_amount?: number;
  unit: 'monthly' | 'yearly' | 'No Cap' | 'Actual';
  start_date?: string;
  end_date?: string;
  rollover: 'Yes' | 'No';
}

export interface UpdateEntitlementRequest {
  expense_type?: string;
  entitlement_amount?: number;
  unit?: 'monthly' | 'yearly' | 'No Cap' | 'Actual';
  start_date?: string;
  end_date?: string;
  rollover?: 'Yes' | 'No';
}

export interface ValidateClaimRequest {
  employee_id: string;
  expense_type: string;
  receipts_amount: number;
}

export const EXPENSE_TYPES = ['Gas', 'Mobile', 'Apparel'] as const;
export type ExpenseType = typeof EXPENSE_TYPES[number];

export const ENTITLEMENT_UNITS = ['monthly', 'yearly', 'No Cap', 'Actual'] as const;
export type EntitlementUnit = typeof ENTITLEMENT_UNITS[number];
