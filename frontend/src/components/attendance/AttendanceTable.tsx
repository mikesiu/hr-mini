import React from 'react';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Attendance } from './attendanceTypes';
import { getEffectiveHours, hasValue, sumEffectiveHours } from './attendanceHelpers';

const TONES = {
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  sky: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
} as const;

interface HourCellProps {
  value: number;
  base: number | null | undefined;
  overridden: boolean;
  reason?: string;
  tone?: keyof typeof TONES;
  bold?: boolean;
}

const HourCell: React.FC<HourCellProps> = ({ value, base, overridden, reason, tone, bold }) => {
  const text = value.toFixed(2);
  return (
    <TableCell className="px-2 py-1.5 text-right align-top text-xs tabular-nums">
      {tone && value > 0 ? (
        <Badge
          variant="secondary"
          className={cn('rounded-md px-1.5 text-xs font-medium tabular-nums', TONES[tone])}
        >
          {text}
        </Badge>
      ) : (
        <span
          className={cn(
            value === 0 ? 'text-muted-foreground/60' : 'text-foreground',
            bold && 'font-semibold',
          )}
        >
          {text}
        </span>
      )}
      {overridden && (
        <div className="text-[10px] text-muted-foreground">was {(base ?? 0).toFixed(2)}</div>
      )}
      {overridden && reason && (
        <div className="ml-auto max-w-[8rem] text-left text-[10px] whitespace-normal text-muted-foreground italic">
          {reason}
        </div>
      )}
    </TableCell>
  );
};

const headClass =
  'sticky top-0 z-20 h-10 bg-muted px-2 text-[11px] leading-tight font-medium tracking-wider whitespace-normal text-muted-foreground uppercase';
const NAME_W = 'w-40 min-w-40 max-w-40';

interface AttendanceTableProps {
  attendance: Attendance[];
  selectedEmployeeId: string;
  periodOverride: any;
  formatTime: (t?: string) => string;
  onEdit: (att: Attendance) => void;
  onEditSubtotal: () => void;
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({
  attendance,
  selectedEmployeeId,
  periodOverride,
  formatTime,
  onEdit,
  onEditSubtotal,
}) => {
  const renderSubtotal = () => {
    if (!selectedEmployeeId || attendance.length === 0) return null;

    const calc = sumEffectiveHours(attendance);
    // Use override values if they exist, otherwise use calculated
    const pickTotal = (o: number | null | undefined, c: number) =>
      o !== null && o !== undefined ? o : c;
    const total = {
      regular: pickTotal(periodOverride?.override_regular_hours, calc.regular),
      ot: pickTotal(periodOverride?.override_ot_hours, calc.ot),
      weekendOT: pickTotal(periodOverride?.override_weekend_ot_hours, calc.weekendOT),
      statHoliday: pickTotal(periodOverride?.override_stat_holiday_hours, calc.statHoliday),
    };
    const hasOverride =
      periodOverride &&
      (periodOverride.override_regular_hours !== null ||
        periodOverride.override_ot_hours !== null ||
        periodOverride.override_weekend_ot_hours !== null ||
        periodOverride.override_stat_holiday_hours !== null);

    const cell = (t: number, c: number) => (
      <TableCell className="px-2 py-2 text-right align-top text-xs font-semibold tabular-nums">
        {t.toFixed(2)}
        {hasOverride && t !== c && (
          <div className="text-[10px] font-normal text-muted-foreground">was {c.toFixed(2)}</div>
        )}
      </TableCell>
    );

    return (
      <TableRow className={cn('hover:bg-transparent', hasOverride ? 'bg-amber-500/10' : 'bg-muted/60')}>
        <TableCell colSpan={7} className="px-2 py-2 text-right text-xs font-semibold">
          {hasOverride ? 'Subtotal (Override):' : 'Subtotal:'}
        </TableCell>
        {cell(total.regular, calc.regular)}
        {cell(total.ot, calc.ot)}
        {cell(total.weekendOT, calc.weekendOT)}
        {cell(total.statHoliday, calc.statHoliday)}
        <TableCell className="px-2 py-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Override subtotals"
                onClick={onEditSubtotal}
              >
                <Pencil />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Override subtotals</TooltipContent>
          </Tooltip>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Table containerClassName="max-h-[70vh] overflow-auto" className="min-w-[1100px]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={cn(headClass, 'left-0 z-30', NAME_W)}>Employee Name</TableHead>
          <TableHead className={cn(headClass, 'left-40 z-30 w-28 min-w-28')}>Date</TableHead>
          <TableHead className={headClass}>Leave / Stat Holiday</TableHead>
          <TableHead className={headClass}>Check-In (Orig)</TableHead>
          <TableHead className={headClass}>Check-Out (Orig)</TableHead>
          <TableHead className={headClass}>Check-In (Rnd)</TableHead>
          <TableHead className={headClass}>Check-Out (Rnd)</TableHead>
          <TableHead className={cn(headClass, 'text-right')}>Reg Hours</TableHead>
          <TableHead className={cn(headClass, 'text-right')}>OT Hours</TableHead>
          <TableHead className={cn(headClass, 'text-right')}>Weekend OT</TableHead>
          <TableHead className={cn(headClass, 'text-right')}>Stat Holiday</TableHead>
          <TableHead className={cn(headClass, 'text-right')}>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {attendance.map((att) => {
          const hasTimeEdits = att.override_check_in || att.override_check_out;
          const effectiveCheckIn = att.override_check_in || att.check_in;
          const effectiveCheckOut = att.override_check_out || att.check_out;
          const eff = getEffectiveHours(att);

          // Parse date string directly to avoid timezone issues (YYYY-MM-DD)
          const [year, month, day] = att.date.split('-').map(Number);
          const dayOfWeek = new Date(year, month - 1, day).getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          // A day with no attendance, no leave, no holiday
          const hasNoData =
            !att.id && !att.leave_type && !att.stat_holiday_name && !att.check_in && !att.check_out;

          const stickyBg = isWeekend ? 'bg-muted' : 'bg-card';

          return (
            <TableRow
              key={att.id || `virtual-${att.employee_id}-${att.date}`}
              className={cn(
                'group',
                isWeekend && 'bg-muted/70',
                hasNoData && 'text-muted-foreground',
              )}
            >
              <TableCell
                className={cn(
                  'sticky left-0 z-10 px-2 py-1.5 text-xs font-medium whitespace-normal break-words group-hover:bg-muted',
                  hasNoData ? 'text-muted-foreground' : 'text-foreground',
                  stickyBg,
                  NAME_W,
                )}
              >
                {att.employee_name || att.employee_id}
              </TableCell>
              <TableCell
                className={cn(
                  'sticky left-40 z-10 w-28 min-w-28 px-2 py-1.5 text-xs tabular-nums group-hover:bg-muted',
                  stickyBg,
                )}
              >
                {att.date}
              </TableCell>
              <TableCell className="px-2 py-1.5 text-xs">
                <div className="flex flex-wrap gap-1">
                  {att.leave_type && (
                    <Badge
                      variant="secondary"
                      className="rounded-md bg-sky-500/15 px-1.5 text-[11px] font-medium text-sky-700 dark:text-sky-300"
                    >
                      {att.leave_type}
                    </Badge>
                  )}
                  {att.stat_holiday_name && (
                    <Badge
                      variant="secondary"
                      className="rounded-md bg-amber-500/15 px-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300"
                    >
                      {att.stat_holiday_name}
                    </Badge>
                  )}
                  {!att.leave_type && !att.stat_holiday_name && (
                    <span className="text-muted-foreground/50">{'\u2014'}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="px-2 py-1.5 align-top text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                {hasTimeEdits && att.override_check_in ? (
                  <div>
                    <div>{formatTime(effectiveCheckIn)}</div>
                    <div className="text-[10px]">was {formatTime(att.check_in)}</div>
                    {att.time_edit_reason && (
                      <div className="mt-0.5 text-[10px] whitespace-normal italic">
                        {att.time_edit_reason}
                      </div>
                    )}
                  </div>
                ) : (
                  formatTime(effectiveCheckIn)
                )}
              </TableCell>
              <TableCell className="px-2 py-1.5 align-top text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                {hasTimeEdits && att.override_check_out ? (
                  <div>
                    <div>{formatTime(effectiveCheckOut)}</div>
                    <div className="text-[10px]">was {formatTime(att.check_out)}</div>
                  </div>
                ) : (
                  formatTime(effectiveCheckOut)
                )}
              </TableCell>
              <TableCell className="px-2 py-1.5 align-top text-xs font-medium whitespace-nowrap text-foreground tabular-nums">
                {formatTime(att.rounded_check_in)}
              </TableCell>
              <TableCell className="px-2 py-1.5 align-top text-xs font-medium whitespace-nowrap text-foreground tabular-nums">
                {formatTime(att.rounded_check_out)}
              </TableCell>
              <HourCell
                value={eff.regular}
                base={att.regular_hours}
                overridden={hasValue(att.override_regular_hours)}
                reason={att.hours_edit_reason}
              />
              <HourCell
                value={eff.ot}
                base={att.ot_hours}
                overridden={hasValue(att.override_ot_hours)}
                reason={att.hours_edit_reason}
                tone="amber"
              />
              <HourCell
                value={eff.weekendOT}
                base={att.weekend_ot_hours}
                overridden={hasValue(att.override_weekend_ot_hours)}
                reason={att.hours_edit_reason}
                tone="sky"
              />
              <HourCell
                value={eff.statHoliday}
                base={att.stat_holiday_hours}
                overridden={hasValue(att.override_stat_holiday_hours)}
                reason={att.hours_edit_reason}
                tone="emerald"
              />
              <TableCell className="px-2 py-1 text-right">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label="Edit attendance"
                      onClick={() => onEdit(att)}
                    >
                      <Pencil />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit attendance</TooltipContent>
                </Tooltip>
              </TableCell>
            </TableRow>
          );
        })}
        {renderSubtotal()}
      </TableBody>
    </Table>
  );
};

export default AttendanceTable;
