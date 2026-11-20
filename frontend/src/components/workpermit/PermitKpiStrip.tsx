import React from 'react';
import { CircleAlert, ShieldCheck, TimerReset } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { EXPIRING_SOON_DAYS } from './workPermitTypes';
import type { PermitStatus } from './workPermitTypes';

interface PermitKpiStripProps {
  loading: boolean;
  counts: Record<PermitStatus, number>;
  active: PermitStatus | null;
  onSelect: (status: PermitStatus | null) => void;
}

const ITEMS: {
  status: PermitStatus;
  label: string;
  hint: string;
  icon: React.ElementType;
  iconClass: string;
  valueClass: string;
}[] = [
  {
    status: 'valid',
    label: 'Active / Valid Permits',
    hint: `Valid for more than ${EXPIRING_SOON_DAYS} days`,
    icon: ShieldCheck,
    iconClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    valueClass: 'text-foreground',
  },
  {
    status: 'expiring_soon',
    label: 'Expiring Soon',
    hint: `Expire within ${EXPIRING_SOON_DAYS} days`,
    icon: TimerReset,
    iconClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    valueClass: 'text-amber-700 dark:text-amber-400',
  },
  {
    status: 'expired',
    label: 'Expired / Action Required',
    hint: 'Past expiry date, needs renewal',
    icon: CircleAlert,
    iconClass: 'bg-destructive/15 text-destructive',
    valueClass: 'text-destructive',
  },
];

const PermitKpiStrip: React.FC<PermitKpiStripProps> = ({ loading, counts, active, onSelect }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
    {ITEMS.map(({ status, label, hint, icon: Icon, iconClass, valueClass }) => {
      const selected = active === status;
      return (
        <button
          key={status}
          type="button"
          aria-pressed={selected}
          onClick={() => onSelect(selected ? null : status)}
          className={cn(
            'flex min-w-0 cursor-pointer items-center gap-3 rounded-lg border border-solid bg-card p-4 text-left [font-family:inherit] text-foreground transition-colors outline-none hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50',
            selected ? 'border-ring ring-1 ring-ring' : 'border-border'
          )}
        >
          <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-md', iconClass)}>
            <Icon className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-muted-foreground">{label}</span>
            {loading ? (
              <Skeleton className="mt-1 h-7 w-12" />
            ) : (
              <span className={cn('block text-2xl leading-8 font-semibold tabular-nums', valueClass)}>
                {counts[status]}
              </span>
            )}
            <span className="block truncate text-xs text-muted-foreground">{hint}</span>
          </span>
        </button>
      );
    })}
  </div>
);

export default PermitKpiStrip;
