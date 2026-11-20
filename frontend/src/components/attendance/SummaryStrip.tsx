import React from 'react';
import { cn } from '@/lib/utils';

interface SummaryStripProps {
  regular: number;
  ot: number;
  weekendOT: number;
  statHoliday: number;
}

const ITEMS = [
  { key: 'regular', label: 'Regular Hours', dot: 'bg-primary' },
  { key: 'ot', label: 'OT Hours', dot: 'bg-amber-500' },
  { key: 'weekendOT', label: 'Weekend OT', dot: 'bg-sky-500' },
  { key: 'statHoliday', label: 'Stat Holiday', dot: 'bg-emerald-500' },
] as const;

const SummaryStrip: React.FC<SummaryStripProps> = (props) => (
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {ITEMS.map((item) => (
      <div
        key={item.key}
        className="flex flex-col gap-0.5 rounded-lg border border-solid border-border bg-card px-4 py-3"
      >
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn('size-2 rounded-full', item.dot)} aria-hidden="true" />
          {item.label}
        </span>
        <span className="text-xl font-semibold text-foreground tabular-nums">
          {props[item.key].toFixed(2)}
        </span>
      </div>
    ))}
  </div>
);

export default SummaryStrip;
