export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  status: string;
}

export interface Termination {
  id: number;
  employee_id: string;
  last_working_date: string;
  termination_effective_date: string;
  roe_reason_code: string;
  other_reason?: string;
  internal_reason?: string;
  remarks?: string;
  created_at: string;
  created_by?: string;
  employee?: Employee;
}

export interface TerminationFormData {
  employee_id: string;
  last_working_date: string;
  termination_effective_date: string;
  roe_reason_code: string;
  other_reason: string;
  internal_reason: string;
  remarks: string;
}

export const ROE_REASON_CODES = {
  'A': 'Shortage of work',
  'B': 'Strike or lockout',
  'C': 'Return to school',
  'D': 'Illness or injury',
  'E': 'Quit',
  'F': 'Maternity leave',
  'G': 'Retirement',
  'M': 'Dismissal or termination',
  'N': 'Leave of absence',
  'K': 'Other'
};

export const getRoeLabel = (code: string) =>
  ROE_REASON_CODES[code as keyof typeof ROE_REASON_CODES] || 'Unknown';

/** Semantic tone per ROE code: Quit = amber, Shortage of work = sky, everything else neutral. */
export const getRoeBadgeClass = (code: string) => {
  if (code === 'E') return 'border-transparent bg-event-cra/15 text-event-cra';
  if (code === 'A') return 'border-transparent bg-event-payroll/15 text-event-payroll';
  return '';
};
