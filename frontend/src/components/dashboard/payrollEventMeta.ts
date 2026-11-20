import {
  CalendarDays,
  DollarSign,
  IdCard,
  Landmark,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type PayrollEventType =
  | 'payroll'
  | 'cra'
  | 'union'
  | 'holiday'
  | 'probation'
  | 'work_permit';

export interface PayrollEvent {
  date: string;
  company_id: string;
  company_name: string;
  event_type: PayrollEventType;
  description: string;
}

interface EventMeta {
  /** Label used in the legend bar */
  legendLabel: string;
  /** Short label used by the micro-badges on the calendar */
  shortLabel: string;
  /** Label used in the event-details dialog */
  dialogLabel: string;
  icon: LucideIcon;
  /** Tinted background + text colour (semantic `event-*` tokens from index.css) */
  tint: string;
  /** Solid dot colour */
  dot: string;
}

// Class names are written out in full so Tailwind can detect them statically.
export const EVENT_TYPES: PayrollEventType[] = [
  'payroll',
  'cra',
  'union',
  'holiday',
  'probation',
  'work_permit',
];

export const EVENT_META: Record<PayrollEventType, EventMeta> = {
  payroll: {
    legendLabel: 'Payroll Due',
    shortLabel: 'PAYROLL',
    dialogLabel: 'PAYROLL',
    icon: DollarSign,
    tint: 'bg-event-payroll/15 text-event-payroll',
    dot: 'bg-event-payroll',
  },
  cra: {
    legendLabel: 'CRA Payment Due',
    shortLabel: 'CRA',
    dialogLabel: 'CRA',
    icon: Landmark,
    tint: 'bg-event-cra/15 text-event-cra',
    dot: 'bg-event-cra',
  },
  union: {
    legendLabel: 'Union Payment Due',
    shortLabel: 'UNION',
    dialogLabel: 'UNION',
    icon: Users,
    tint: 'bg-event-union/15 text-event-union',
    dot: 'bg-event-union',
  },
  holiday: {
    legendLabel: 'Holiday',
    shortLabel: 'HOLIDAY',
    dialogLabel: 'HOLIDAY',
    icon: CalendarDays,
    tint: 'bg-event-holiday/15 text-event-holiday',
    dot: 'bg-event-holiday',
  },
  probation: {
    legendLabel: 'Probation End Date',
    shortLabel: 'PROBATION',
    dialogLabel: 'PROBATION',
    icon: UserCheck,
    tint: 'bg-event-probation/15 text-event-probation',
    dot: 'bg-event-probation',
  },
  work_permit: {
    legendLabel: 'Work Permit Expiry',
    shortLabel: 'PERMIT',
    dialogLabel: 'WORK PERMIT',
    icon: IdCard,
    tint: 'bg-event-permit/15 text-event-permit',
    dot: 'bg-event-permit',
  },
};
