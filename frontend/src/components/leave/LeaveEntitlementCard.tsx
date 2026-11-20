import React from 'react';
import { HeartPulse, Palmtree } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { LeaveStats } from './leaveTypes';

interface LeaveEntitlementCardProps {
  title: string;
  kind: 'vacation' | 'sick';
  stats: LeaveStats;
  selected: boolean;
  onSelect: () => void;
}

const KIND_STYLE = {
  vacation: {
    icon: Palmtree,
    badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    balance: 'text-sky-700 dark:text-sky-300',
    selected: 'border-sky-500/60 ring-1 ring-sky-500/40',
    progress: 'bg-sky-500/15 [&>[data-slot=progress-indicator]]:bg-sky-500',
  },
  sick: {
    icon: HeartPulse,
    badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
    balance: 'text-violet-700 dark:text-violet-300',
    selected: 'border-violet-500/60 ring-1 ring-violet-500/40',
    progress: 'bg-violet-500/15 [&>[data-slot=progress-indicator]]:bg-violet-500',
  },
} as const;

const LeaveEntitlementCard: React.FC<LeaveEntitlementCardProps> = ({
  title,
  kind,
  stats,
  selected,
  onSelect,
}) => {
  const style = KIND_STYLE[kind];
  const Icon = style.icon;
  const percentUsed = stats.entitlement > 0 ? (stats.taken / stats.entitlement) * 100 : null;

  const metrics = [
    { label: 'Entitlement', value: stats.entitlement, className: 'text-foreground' },
    { label: 'Taken', value: stats.taken, className: 'text-foreground' },
    { label: 'Balance', value: stats.balance, className: style.balance },
  ];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'box-border flex w-full cursor-pointer flex-col gap-3 rounded-lg border border-solid bg-card p-4 text-left text-card-foreground [font-family:inherit] transition-colors outline-none hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50',
        selected ? style.selected : 'border-border',
      )}
    >
      <span className="flex items-center gap-2.5">
        <span
          className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', style.badge)}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</span>
        {selected && (
          <span className="text-[11px] font-medium text-muted-foreground">Selected</span>
        )}
      </span>

      <span className="grid grid-cols-3 gap-2">
        {metrics.map((m) => (
          <span key={m.label} className="flex flex-col">
            <span className={cn('text-xl leading-tight font-semibold tabular-nums', m.className)}>
              {m.value.toFixed(1)}
            </span>
            <span className="text-[11px] text-muted-foreground">{m.label}</span>
          </span>
        ))}
      </span>

      <span className="flex flex-col gap-1.5">
        {percentUsed !== null && (
          <Progress
            value={Math.min(100, percentUsed)}
            className={cn('h-1.5', style.progress)}
            aria-label={`${title} used`}
          />
        )}
        <span className="text-xs text-muted-foreground tabular-nums">
          {percentUsed !== null && `${percentUsed.toFixed(1)}% used \u2022 `}
          Unpaid: {stats.unpaid?.toFixed(1) || '0.0'} days
        </span>
        {stats.periodStart && stats.periodEnd && (
          <span className="text-xs text-muted-foreground tabular-nums">
            Anniversary: {stats.periodStart.toLocaleDateString()} -{' '}
            {stats.periodEnd.toLocaleDateString()}
          </span>
        )}
      </span>
    </button>
  );
};

export default LeaveEntitlementCard;
