import React, { useState, useEffect } from 'react';
import { CalendarClock, ChartColumn, DollarSign, TrendingUp, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { salaryAPI } from '../api/client';

interface SalaryProgressionData {
  pay_rate: number;
  pay_type: string;
  effective_date: string;
  end_date?: string;
  notes?: string;
  created_at: string;
}

interface SalaryProgressionChartProps {
  employeeId: string;
  employeeName?: string;
  /** Increment to reload the data (driven by the page-level Refresh button). */
  refreshKey?: number;
}

// Parse YYYY-MM-DD as a local date so the displayed day never shifts with the time zone.
const formatDisplayDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
};

const PAY_TYPE_TINT: Record<string, string> = {
  Hourly: 'bg-event-payroll/15 text-event-payroll',
  Monthly: 'bg-event-holiday/15 text-event-holiday',
  Annual: 'bg-event-union/15 text-event-union',
};

const SalaryProgressionChart: React.FC<SalaryProgressionChartProps> = ({
  employeeId,
  employeeName,
  refreshKey = 0,
}) => {
  const [progressionData, setProgressionData] = useState<SalaryProgressionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProgressionData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await salaryAPI.progression(employeeId);
      setProgressionData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load salary progression');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (employeeId) {
      loadProgressionData();
    }
  }, [employeeId, loadProgressionData, refreshKey]);

  const calculateProgressionStats = () => {
    if (progressionData.length === 0) {
      return {
        totalIncrease: 0,
        averageIncrease: 0,
        totalIncreasePercentage: 0,
        numberOfChanges: 0,
        currentSalary: null,
        longestPeriod: 0,
        shortestPeriod: 0,
      };
    }

    const sortedData = [...progressionData].sort(
      (a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
    );

    let totalIncrease = 0;
    let numberOfChanges = 0;
    const periods: number[] = [];

    for (let i = 1; i < sortedData.length; i++) {
      const current = sortedData[i];
      const previous = sortedData[i - 1];

      const increase = current.pay_rate - previous.pay_rate;
      totalIncrease += increase;
      numberOfChanges++;

      // Calculate period duration
      const startDate = new Date(previous.effective_date);
      const endDate = new Date(current.effective_date);
      const periodDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      periods.push(periodDays);
    }

    // Calculate final period (current salary)
    if (sortedData.length > 0) {
      const lastRecord = sortedData[sortedData.length - 1];
      const lastDate = new Date(lastRecord.effective_date);
      const today = new Date();
      const finalPeriodDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      periods.push(finalPeriodDays);
    }

    const averageIncrease = numberOfChanges > 0 ? totalIncrease / numberOfChanges : 0;
    const initialSalary = sortedData.length > 0 ? sortedData[0].pay_rate : 0;
    const totalIncreasePercentage = initialSalary > 0 ? (totalIncrease / initialSalary) * 100 : 0;
    const currentSalary = sortedData.length > 0 ? sortedData[sortedData.length - 1] : null;

    return {
      totalIncrease,
      averageIncrease,
      totalIncreasePercentage,
      numberOfChanges,
      currentSalary,
      longestPeriod: periods.length > 0 ? Math.max(...periods) : 0,
      shortestPeriod: periods.length > 0 ? Math.min(...periods) : 0,
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  const stats = calculateProgressionStats();

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <TriangleAlert />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (progressionData.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-solid border-border bg-card px-6 py-12 text-center">
        <TrendingUp className="size-10 text-muted-foreground/60" aria-hidden="true" />
        <p className="m-0 text-sm font-medium text-foreground">No progression data</p>
        <p className="m-0 text-sm text-muted-foreground">
          No salary progression data available for this employee.
        </p>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Current Salary',
      value: stats.currentSalary ? formatCurrency(stats.currentSalary.pay_rate) : 'N/A',
      icon: DollarSign,
      iconClass: 'text-event-union',
    },
    {
      label: 'Total Increase',
      value: formatCurrency(stats.totalIncrease),
      icon: TrendingUp,
      iconClass: 'text-event-payroll',
    },
    {
      label: 'Total Increase %',
      value: `${stats.totalIncreasePercentage.toFixed(1)}%`,
      icon: ChartColumn,
      iconClass: 'text-event-holiday',
    },
    {
      label: 'Salary Changes',
      value: String(stats.numberOfChanges),
      icon: CalendarClock,
      iconClass: 'text-event-probation',
    },
  ];

  const timeline = [...progressionData].sort(
    (a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
  );

  return (
    <div className="flex flex-col gap-4">
      <h3 className="m-0 text-sm font-semibold text-foreground">
        Salary Progression - {employeeName || employeeId}
      </h3>

      {/* Statistics cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, iconClass }) => (
          <div
            key={label}
            className="flex flex-col gap-2 rounded-lg border border-solid border-border bg-card p-4"
          >
            <span className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
              </span>
              <Icon className={cn('size-4', iconClass)} aria-hidden="true" />
            </span>
            <span className="text-xl font-semibold text-foreground tabular-nums">{value}</span>
          </div>
        ))}
      </div>

      {/* Progression timeline */}
      <Card className="gap-0 py-0">
        <CardHeader className="px-5 py-3">
          <CardTitle className="text-base">Salary Timeline</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <ol className="m-0 list-none p-0">
            {timeline.map((record, index) => {
              const isLast = index === timeline.length - 1;
              const nextRecord = timeline[index + 1];
              const increase = nextRecord ? nextRecord.pay_rate - record.pay_rate : 0;
              const increasePercentage = record.pay_rate > 0 ? (increase / record.pay_rate) * 100 : 0;

              return (
                <li key={record.effective_date} className="m-0 flex gap-4 p-0">
                  {/* dot + connector */}
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        'mt-1.5 size-3 shrink-0 rounded-full',
                        isLast ? 'bg-event-union' : 'bg-primary',
                      )}
                    />
                    {!isLast && <span className="my-1 w-0.5 flex-1 bg-border" />}
                  </div>

                  <div className={cn('min-w-0 flex-1', !isLast && 'pb-5')}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-lg font-semibold text-foreground tabular-nums">
                        {formatCurrency(record.pay_rate)}
                      </span>
                      <div className="flex gap-1.5">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'rounded-md text-[11px]',
                            PAY_TYPE_TINT[record.pay_type] ?? 'bg-muted text-muted-foreground',
                          )}
                        >
                          {record.pay_type}
                        </Badge>
                        {isLast && (
                          <Badge
                            variant="secondary"
                            className="rounded-md bg-event-union/15 text-[11px] text-event-union"
                          >
                            Current
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="m-0 mt-0.5 text-sm text-muted-foreground tabular-nums">
                      Effective: {formatDisplayDate(record.effective_date)}
                      {record.end_date && <> - {formatDisplayDate(record.end_date)}</>}
                    </p>
                    {record.notes && (
                      <p className="m-0 mt-1 text-sm text-muted-foreground">{record.notes}</p>
                    )}
                    {!isLast && nextRecord && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground tabular-nums">
                          Next: {formatCurrency(nextRecord.pay_rate)} ({increase >= 0 ? '+' : ''}
                          {formatCurrency(increase)})
                        </span>
                        {increasePercentage !== 0 && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              'rounded-md text-[11px] tabular-nums',
                              increasePercentage > 0
                                ? 'bg-event-union/15 text-event-union'
                                : 'bg-destructive/10 text-destructive',
                            )}
                          >
                            {`${increasePercentage >= 0 ? '+' : ''}${increasePercentage.toFixed(1)}%`}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalaryProgressionChart;
