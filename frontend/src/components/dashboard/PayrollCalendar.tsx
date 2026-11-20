import React from 'react';
import { format, startOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { EVENT_META, type PayrollEvent } from './payrollEventMeta';

interface PayrollCalendarProps {
  month: Date;
  events: PayrollEvent[];
  onDateClick?: (date: Date, events: PayrollEvent[]) => void;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PayrollCalendar: React.FC<PayrollCalendarProps> = ({ month, events, onDateClick }) => {
  // Get the first day of the month
  const monthStart = startOfMonth(month);
  
  // Get the first day of the week for the month start (to show previous month's days)
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  
  // Get all days to display (including previous/next month days for complete weeks)
  const calendarDays = eachDayOfInterval({ 
    start: startDate, 
    end: new Date(startDate.getTime() + 6 * 7 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000) 
  });
  
  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    // Parse date string in local timezone to avoid timezone shift issues
    const [year, month, day] = event.date.split('-').map(Number);
    const eventDate = new Date(year, month - 1, day); // month is 0-indexed
    const dateKey = format(eventDate, 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, PayrollEvent[]>);

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-center text-lg font-semibold tracking-tight">
          {format(month, 'MMMM yyyy')}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-5">
        {/* Day headers */}
        <div className="mb-2 grid grid-cols-7">
          {dayNames.map((day) => (
            <div
              key={day}
              className="py-1 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days: 1px gaps over a border-coloured background draw the grid lines */}
        <div className="box-border grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-solid border-border bg-border">
          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate[dateKey] || [];
            const isCurrentMonth = isSameMonth(day, month);
            const isToday = isSameDay(day, new Date());
            const clickable = dayEvents.length > 0;

            return (
              <div
                key={dateKey}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                aria-label={clickable ? `${format(day, 'MMMM d, yyyy')}: ${dayEvents.length} event(s)` : undefined}
                onClick={() => clickable && onDateClick?.(day, dayEvents)}
                onKeyDown={(e) => {
                  if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onDateClick?.(day, dayEvents);
                  }
                }}
                className={cn(
                  'box-border flex min-h-[96px] min-w-0 flex-col gap-1 overflow-hidden p-1.5 outline-none',
                  isCurrentMonth ? 'bg-card' : 'bg-muted/50',
                  clickable &&
                    'cursor-pointer transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
                )}
              >
                {/* Day number */}
                <span
                  className={cn(
                    'inline-flex size-6 items-center justify-center rounded-full text-xs',
                    isToday
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : isCurrentMonth
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground/60'
                  )}
                  aria-current={isToday ? 'date' : undefined}
                >
                  {format(day, 'd')}
                </span>

                {/* Events */}
                <div className={cn('flex min-w-0 flex-col gap-0.5', !isCurrentMonth && 'opacity-50')}>
                  {dayEvents.slice(0, 3).map((event, eventIndex) => (
                    <Tooltip key={eventIndex}>
                      <TooltipTrigger asChild>
                        <span
                          className={cn(
                            'block w-full truncate rounded-sm px-1.5 py-0.5 text-[10px] leading-3.5 font-bold tracking-wide',
                            EVENT_META[event.event_type]?.tint ?? 'bg-muted text-muted-foreground'
                          )}
                        >
                          {EVENT_META[event.event_type]?.shortLabel ?? event.event_type.toUpperCase()}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {`${event.description} - ${event.company_name}`}
                      </TooltipContent>
                    </Tooltip>
                  ))}

                  {dayEvents.length > 3 && (
                    <span className="text-[10px] leading-3.5 text-muted-foreground">
                      +{dayEvents.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PayrollCalendar;
