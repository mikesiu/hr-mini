import React, { useState, useEffect, useCallback } from 'react';
import { CalendarRange } from 'lucide-react';
import { format } from 'date-fns';
import AppToast from '../components/AppToast';
import { companyAPI } from '../api/client';
import { useCompanyFilter } from '../contexts/CompanyFilterContext';
import {
  EmptyState, PageHeader, TableCard, TableSkeleton, Toolbar, adminCellClass, adminHeadClass,
} from '../components/admin/AdminParts';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface PayPeriod {
  start_date: string;
  end_date: string;
  period_number: number;
  year: number;
  duration_days: number;
  payment_date: string | null;
}

interface PayPeriodResponse {
  success: boolean;
  data: PayPeriod[];
  company_id: string;
  company_name: string;
}

const PayrollPeriodPage: React.FC = () => {
  // Use companies from the global context instead of fetching them again
  const { companies, loading: companiesLoading } = useCompanyFilter();

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeError = useCallback(() => setError(null), []);

  // Auto-select first company when companies load
  useEffect(() => {
    if (!companiesLoading && companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companiesLoading, companies, selectedCompanyId]);

  // Fetch pay periods function
  const fetchPayPeriods = useCallback(async () => {
    if (!selectedCompanyId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await companyAPI.getPayPeriods(selectedCompanyId, selectedYear);
      const periodData = response.data as PayPeriodResponse;

      if (periodData.success) {
        setPayPeriods(periodData.data || []);
      } else {
        setPayPeriods([]);
      }
    } catch (err: any) {
      console.error('Error fetching pay periods:', err);
      setError(err.response?.data?.detail || 'Failed to load pay periods');
      setPayPeriods([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, selectedYear]);

  // Fetch pay periods when company or year changes
  useEffect(() => {
    if (selectedCompanyId && selectedYear) {
      fetchPayPeriods();
    } else {
      setPayPeriods([]);
    }
  }, [selectedCompanyId, selectedYear, fetchPayPeriods]);

  const formatDate = (dateString: string) => {
    try {
      // Parse YYYY-MM-DD dates locally to avoid timezone issues
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return format(date, 'MMM dd, yyyy');
      }
      // Fallback for other date formats
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  // Generate year options (current year ± 2 years)
  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const renderBody = () => {
    if (!selectedCompanyId) {
      return companiesLoading ? (
        <TableSkeleton />
      ) : (
        <EmptyState
          icon={CalendarRange}
          title="Select a company"
          description="Please select a company to view pay periods."
        />
      );
    }
    if (loading) return <TableSkeleton />;
    if (payPeriods.length === 0) {
      return (
        <EmptyState
          icon={CalendarRange}
          title="No pay periods found"
          description="Please ensure the company has a Payroll Start Date and Payroll Frequency configured."
        />
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={adminHeadClass}>Period #</TableHead>
            <TableHead className={adminHeadClass}>Start Date</TableHead>
            <TableHead className={adminHeadClass}>End Date</TableHead>
            <TableHead className={cn(adminHeadClass, 'text-right')}>Duration (Days)</TableHead>
            <TableHead className={adminHeadClass}>Payment Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payPeriods.map((period) => (
            <TableRow key={period.period_number}>
              <TableCell className={adminCellClass}>
                <Badge variant="secondary" className="tabular-nums">
                  Period {period.period_number}
                </Badge>
              </TableCell>
              <TableCell className={cn(adminCellClass, 'text-sm whitespace-nowrap tabular-nums')}>
                {formatDate(period.start_date)}
              </TableCell>
              <TableCell className={cn(adminCellClass, 'text-sm whitespace-nowrap tabular-nums')}>
                {formatDate(period.end_date)}
              </TableCell>
              <TableCell className={cn(adminCellClass, 'text-right text-sm tabular-nums')}>
                {period.duration_days}
              </TableCell>
              <TableCell className={cn(adminCellClass, 'text-sm font-medium whitespace-nowrap tabular-nums')}>
                {period.payment_date ? formatDate(period.payment_date) : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Payroll Periods"
        subtitle="View each company's pay periods and payment dates by year"
      />

      <Toolbar>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-3 sm:w-auto">
          <Select
            value={selectedCompanyId}
            onValueChange={setSelectedCompanyId}
            disabled={companiesLoading}
          >
            <SelectTrigger className="w-full sm:w-[320px]" aria-label="Company">
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.legal_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-full sm:w-[120px]" aria-label="Year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {payPeriods.length} {payPeriods.length === 1 ? 'period' : 'periods'} · {selectedYear}
        </Badge>
      </Toolbar>

      <TableCard>{renderBody()}</TableCard>
      <AppToast message={error} variant="error" onClose={closeError} />
    </div>
  );
};

export default PayrollPeriodPage;
