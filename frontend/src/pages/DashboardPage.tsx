import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, AlertCircle, CalendarX } from 'lucide-react';
import { format, startOfMonth, addMonths } from 'date-fns';
import { dashboardAPI, holidayAPI } from '../api/client';
import { useCompanyFilter } from '../hooks/useCompanyFilter';
import PayrollCalendar from '../components/dashboard/PayrollCalendar';
import {
  EVENT_META,
  EVENT_TYPES,
  type PayrollEvent,
  type PayrollEventType,
} from '../components/dashboard/payrollEventMeta';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const DashboardPage: React.FC = () => {
  const { selectedCompanyId, companies, setSelectedCompanyId, loading: companiesLoading } = useCompanyFilter();
  const [events, setEvents] = useState<PayrollEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<PayrollEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Month/Year selection state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Memoize month calculations to prevent unnecessary re-renders
  const currentMonth = useMemo(() => startOfMonth(new Date(selectedYear, selectedMonth, 1)), [selectedYear, selectedMonth]);
  const nextMonth = useMemo(() => addMonths(currentMonth, 1), [currentMonth]);

  // Memoize company IDs as a string to use as stable dependency
  const companyIds = useMemo(() => companies.map(c => c.id).join(','), [companies]);
  
  // Debug logging
  useEffect(() => {
    console.log('Dashboard companies state:', { 
      companiesLoading, 
      companiesCount: companies.length, 
      companyIds: companyIds,
      companies: companies.map(c => ({ id: c.id, name: c.legal_name }))
    });
  }, [companiesLoading, companies, companyIds]);

  const fetchHolidays = useCallback(async (startDate: string, endDate: string): Promise<PayrollEvent[]> => {
    const holidayEvents: PayrollEvent[] = [];
    
    // Don't fetch if companies haven't loaded yet
    if (companiesLoading || companies.length === 0) {
      console.log('Skipping holiday fetch: companies loading or empty', { companiesLoading, companiesCount: companies.length });
      return holidayEvents;
    }
    
    try {
      // Determine which companies to fetch holidays for
      // Read companies from closure - use companyIds as dependency to prevent loops
      const companiesToFetch = selectedCompanyId 
        ? companies.filter(c => c.id === selectedCompanyId)
        : companies;
      
      console.log('Fetching holidays for companies:', companiesToFetch.map(c => c.id), 'Date range:', startDate, 'to', endDate);
      
      // Fetch holidays for each company
      for (const company of companiesToFetch) {
        try {
          const response = await holidayAPI.list(company.id, { active_only: true });
          // Backend returns list directly as array (List[HolidayResponse])
          // axios wraps it in response.data
          let holidays: any[] = [];
          if (Array.isArray(response.data)) {
            holidays = response.data;
          } else if (response.data?.data && Array.isArray(response.data.data)) {
            holidays = response.data.data;
          }
          
          console.log(`Found ${holidays.length} holidays for company ${company.id}`, { response: response.data, holidays });
          
          // Filter holidays within the date range and convert to events
          holidays.forEach((holiday: any) => {
            const holidayDate = holiday.holiday_date;
            if (holidayDate && holidayDate >= startDate && holidayDate <= endDate) {
              holidayEvents.push({
                date: holidayDate,
                company_id: company.id,
                company_name: company.legal_name || company.id,
                event_type: 'holiday',
                description: holiday.name,
              });
            }
          });
        } catch (err: any) {
          console.error(`Error fetching holidays for company ${company.id}:`, err);
          // Continue with other companies even if one fails
        }
      }
      
      console.log('Total holiday events found:', holidayEvents.length);
    } catch (err: any) {
      console.error('Error fetching holidays:', err);
    }
    
    return holidayEvents;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId, companyIds, companiesLoading]);

  const fetchPayrollCalendar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Calculate date range for selected month and next month
      const monthStart = startOfMonth(new Date(selectedYear, selectedMonth, 1));
      const monthEnd = addMonths(addMonths(monthStart, 1), 1);
      const startDate = format(monthStart, 'yyyy-MM-dd');
      const endDate = format(monthEnd, 'yyyy-MM-dd');
      
      // Fetch payroll events first (this doesn't depend on companies)
      let payrollEvents: PayrollEvent[] = [];
      try {
        const payrollResponse = await dashboardAPI.getPayrollCalendar(startDate, endDate);
        if (payrollResponse.data.success) {
          payrollEvents = payrollResponse.data.data || [];
          
          // Apply company filter to payroll events
          if (selectedCompanyId) {
            payrollEvents = payrollEvents.filter(event => event.company_id === selectedCompanyId);
          }
        }
      } catch (err: any) {
        console.error('Error fetching payroll calendar:', err);
        // Don't fail completely if payroll fetch fails
      }
      
      // Fetch holidays (only if companies are available)
      let holidays: PayrollEvent[] = [];
      if (!companiesLoading && companies.length > 0) {
        try {
          holidays = await fetchHolidays(startDate, endDate);
        } catch (err: any) {
          console.error('Error fetching holidays:', err);
          // Don't fail completely if holiday fetch fails
        }
      }
      
      // Merge holidays with payroll events
      setEvents([...payrollEvents, ...holidays]);
    } catch (err: any) {
      console.error('Error fetching calendar data:', err);
      setError(err.response?.data?.detail || 'Error fetching calendar data');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, selectedCompanyId, fetchHolidays, companiesLoading, companies.length]);

  useEffect(() => {
    // Fetch calendar data immediately, don't wait for companies
    // This allows the dashboard to show payroll events even if companies fail to load
    fetchPayrollCalendar();
  }, [fetchPayrollCalendar]);

  const handleDateClick = (date: Date, dayEvents: PayrollEvent[]) => {
    setSelectedDate(date);
    setSelectedEvents(dayEvents);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedDate(null);
    setSelectedEvents([]);
  };

  // Legend filter: event types the user has toggled off on the calendar
  const [hiddenTypes, setHiddenTypes] = useState<Set<PayrollEventType>>(new Set());

  // Filter events for each month
  const currentMonthEvents = events.filter(event => {
    // Parse date string in local timezone to avoid timezone shift issues
    const [year, month, day] = event.date.split('-').map(Number);
    const eventDate = new Date(year, month - 1, day); // month is 0-indexed
    return eventDate >= currentMonth && eventDate < nextMonth;
  });

  const nextMonthEvents = events.filter(event => {
    // Parse date string in local timezone to avoid timezone shift issues
    const [year, month, day] = event.date.split('-').map(Number);
    const eventDate = new Date(year, month - 1, day); // month is 0-indexed
    const nextMonthEnd = addMonths(nextMonth, 1);
    return eventDate >= nextMonth && eventDate < nextMonthEnd;
  });

  const toggleEventType = (type: PayrollEventType) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Legend filter: hidden event types are removed from both calendars
  const visibleCurrentMonthEvents = currentMonthEvents.filter((e) => !hiddenTypes.has(e.event_type));
  const visibleNextMonthEvents = nextMonthEvents.filter((e) => !hiddenTypes.has(e.event_type));

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">
          Payroll Dashboard
        </h1>
        <div className="flex items-center gap-2">
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger size="sm" className="w-36 bg-background" aria-label="Month">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i} value={String(i)}>
                  {format(new Date(2024, i, 1), 'MMMM')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger size="sm" className="w-24 bg-background" aria-label="Year">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="bg-background"
            onClick={fetchPayrollCalendar}
            disabled={loading}
          >
            <RefreshCw className={cn(loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Legend toolbar: pills double as event-type filters */}
      <div
        className="box-border flex items-center gap-2 overflow-x-auto rounded-lg border border-solid border-border bg-card px-3 py-2"
        role="group"
        aria-label="Filter calendar events by type"
      >
        <span className="shrink-0 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Legend
        </span>
        <Separator orientation="vertical" className="h-5" />
        {EVENT_TYPES.map((type) => {
          const meta = EVENT_META[type];
          const Icon = meta.icon;
          const active = !hiddenTypes.has(type);
          return (
            <button
              key={type}
              type="button"
              aria-pressed={active}
              onClick={() => toggleEventType(type)}
              title={active ? `Hide ${meta.legendLabel}` : `Show ${meta.legendLabel}`}
              className={cn(
                'box-border inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-solid px-2.5 py-1 text-xs font-medium whitespace-nowrap [font-family:inherit] transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                active
                  ? cn('border-transparent', meta.tint)
                  : 'border-border bg-transparent text-muted-foreground line-through hover:bg-accent'
              )}
            >
              <Icon className="size-3.5" />
              {meta.legendLabel}
            </button>
          );
        })}
        {hiddenTypes.size > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 shrink-0 px-2 text-xs"
            onClick={() => setHiddenTypes(new Set())}
          >
            Show all
          </Button>
        )}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2" aria-busy="true" aria-label="Loading calendar">
          {[0, 1].map((i) => (
            <Card key={i} className="gap-4 py-5">
              <CardHeader className="items-center px-5">
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent className="px-5">
                <div className="mb-2 grid grid-cols-7 gap-2">
                  {Array.from({ length: 7 }, (_, d) => (
                    <Skeleton key={d} className="mx-auto h-4 w-8" />
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 42 }, (_, d) => (
                    <Skeleton key={d} className="h-[96px] w-full rounded-md" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
          <AlertCircle />
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{error}</span>
            <Button size="sm" onClick={fetchPayrollCalendar}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <PayrollCalendar
            month={currentMonth}
            events={visibleCurrentMonthEvents}
            onDateClick={handleDateClick}
          />
          <PayrollCalendar
            month={nextMonth}
            events={visibleNextMonthEvents}
            onDateClick={handleDateClick}
          />
        </div>
      )}

      {/* Event Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Events for {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Payroll, payment, holiday and expiry events on this date.
            </DialogDescription>
          </DialogHeader>

          {selectedEvents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <CalendarX className="size-8" />
              <p className="m-0 text-sm">No events for this date.</p>
            </div>
          ) : (
            <ul className="m-0 flex max-h-[60vh] list-none flex-col overflow-y-auto p-0">
              {selectedEvents.map((event, index) => {
                const meta = EVENT_META[event.event_type];
                const Icon = meta.icon;
                return (
                  <li key={index}>
                    {index > 0 && <Separator />}
                    <div className="flex items-start gap-3 py-3">
                      <span
                        className={cn(
                          'mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full',
                          meta.tint
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={cn('border-transparent', meta.tint)}>
                            {meta.dialogLabel}
                          </Badge>
                          <span className="text-sm font-medium text-foreground">
                            {event.company_name}
                          </span>
                        </div>
                        <p className="m-0 text-sm text-muted-foreground">{event.description}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;