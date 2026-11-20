import React, { useState, useEffect, useRef } from 'react';
import {
  CalendarClock,
  DollarSign,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TriangleAlert,
  UserRound,
  X,
  Building2,
} from 'lucide-react';
import { salaryAPI, apiClient } from '../api/client';
import { useSelectedEmployee } from '../contexts/SelectedEmployeeContext';
import { useCompanyFilter } from '../hooks/useCompanyFilter';
import SalaryProgressionChart from '../components/SalaryProgressionChart';
import SalaryFormDialog, {
  type SalaryFormData,
} from '../components/salary/SalaryFormDialog';
import StatusBadge from '../components/employee/StatusBadge';
import { getInitials } from '../components/employee/employeeTypes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SalaryRecord {
  id: number;
  employee_id: string;
  pay_rate: number;
  pay_type: string;
  effective_date: string;
  end_date?: string;
  notes?: string;
  wage_classification?: string | null;
  created_at: string;
  updated_at?: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
  };
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string;
  phone?: string;
  status: string;
}

// Helper function to format date string (YYYY-MM-DD) without timezone issues
function formatDateString(dateStr: string): string {
  if (!dateStr) return '';
  // Parse YYYY-MM-DD format directly to avoid timezone conversion
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return date.toLocaleDateString();
}

const PAY_TYPE_TINT: Record<string, string> = {
  Hourly: 'bg-event-payroll/15 text-event-payroll',
  Monthly: 'bg-event-holiday/15 text-event-holiday',
  Annual: 'bg-event-union/15 text-event-union',
};
const PAY_TYPE_UNIT: Record<string, string> = { Hourly: '/ hr', Monthly: '/ mo', Annual: '/ yr' };
const TAB_ITEMS = ['Current Salary', 'Salary History', 'Salary Progression'];
const headClass = 'text-xs font-medium tracking-wider text-muted-foreground uppercase';
const kvLabel = 'text-xs font-medium tracking-wide text-muted-foreground uppercase';

const PayTypeBadge: React.FC<{ payType: string; className?: string }> = ({ payType, className }) => (
  <Badge
    variant="secondary"
    className={cn(
      'rounded-md text-[11px]',
      PAY_TYPE_TINT[payType] ?? 'bg-muted text-muted-foreground',
      className,
    )}
  >
    {payType}
  </Badge>
);

const SalaryPage: React.FC = () => {
  const { selectedCompanyId, getCompanyName } = useCompanyFilter();
  const { selectedEmployee: globalSelectedEmployee, setSelectedEmployee: setGlobalSelectedEmployee } =
    useSelectedEmployee();

  const [tabValue, setTabValue] = useState(0);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [currentSalary, setCurrentSalary] = useState<SalaryRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedEmployeeData, setSelectedEmployeeData] = useState<Employee | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalaryRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<SalaryRecord | null>(null);
  const [progressionRefreshKey, setProgressionRefreshKey] = useState(0);
  const [formData, setFormData] = useState<SalaryFormData>({
    employee_id: '',
    pay_rate: '',
    pay_type: 'Hourly',
    effective_date: new Date(),
    end_date: null,
    notes: '',
    wage_classification: '',
  });

  // Employee search states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadCurrentSalary = React.useCallback(async (employeeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await salaryAPI.current(employeeId);
      setCurrentSalary(response.data);
    } catch (err: any) {
      console.error('Error loading current salary:', err);

      if (err.response?.status === 404) {
        setCurrentSalary(null);
      } else if (err.code === 'ECONNRESET' || err.message?.includes('ConnectionResetError')) {
        setError('Connection lost. Please check your network connection and try again.');
      } else if (err.response?.status === 401) {
        setError('Authentication expired. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view salary information.');
      } else if (err.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err.response?.data?.detail || 'Failed to load current salary');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Search functionality - using LeavePage pattern
  const handleSearch = () => {
    if (searchTerm && searchTerm.length >= 2) {
      searchEmployees();
    }
  };

  const searchEmployees = React.useCallback(async () => {
    try {
      setSearchLoading(true);
      setError(null);

      // Search for employees matching the search term
      const employeeResponse = await apiClient.get('/employees/list', {
        params: { q: searchTerm, company_id: selectedCompanyId || undefined },
      });

      // Handle different response formats
      if (employeeResponse.data && employeeResponse.data.success && Array.isArray(employeeResponse.data.data)) {
        setSearchResults(employeeResponse.data.data);
      } else if (Array.isArray(employeeResponse.data)) {
        setSearchResults(employeeResponse.data);
      } else {
        setSearchResults([]);
      }
    } catch (err: any) {
      console.error('Error searching employees:', err);

      // Handle different types of errors
      if (err.code === 'ECONNRESET' || err.message?.includes('ConnectionResetError')) {
        setError('Connection lost. Please check your network connection and try again.');
      } else if (err.response?.status === 401) {
        setError('Authentication expired. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to search employees.');
      } else if (err.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err.response?.data?.detail || 'Failed to search employees. Please try again.');
      }
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchTerm, selectedCompanyId]);

  const handleSearchResultClick = async (employee: Employee) => {
    // Set the global selected employee first
    setGlobalSelectedEmployee({
      id: employee.id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone,
      status: employee.status,
    });

    // Then set local state
    setSelectedEmployee(employee.id);
    setSelectedEmployeeData(employee);
    setSearchTerm('');
    setSearchResults([]);
    loadCurrentSalary(employee.id);
    setTabValue(0); // Switch to current salary tab
  };

  // Auto-select employee from global context when component mounts
  useEffect(() => {
    if (globalSelectedEmployee && !selectedEmployee) {
      setSelectedEmployee(globalSelectedEmployee.id);
      setSelectedEmployeeData(globalSelectedEmployee);
      loadCurrentSalary(globalSelectedEmployee.id);
    }
  }, [globalSelectedEmployee, selectedEmployee, loadCurrentSalary]);

  // Handle search term changes - trigger search automatically with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm && searchTerm.length >= 2) {
        searchEmployees();
      } else {
        setSearchResults([]);
      }
    }, 300); // Debounce search by 300ms

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchEmployees]);

  const loadSalaryHistory = React.useCallback(async (employeeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await salaryAPI.history({ employee_id: employeeId });
      // Sort by effective_date in chronological order (oldest first)
      const records = response.data.sort((a: SalaryRecord, b: SalaryRecord) =>
        new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
      );
      setSalaryRecords(records);
    } catch (err: any) {
      console.error('Error loading salary history:', err);

      if (err.code === 'ECONNRESET' || err.message?.includes('ConnectionResetError')) {
        setError('Connection lost. Please check your network connection and try again.');
      } else if (err.response?.status === 401) {
        setError('Authentication expired. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view salary history.');
      } else if (err.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err.response?.data?.detail || 'Failed to load salary history');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSalaryRecords = React.useCallback(async () => {
    if (!selectedEmployee) {
      setSalaryRecords([]);
      setCurrentSalary(null);
      return;
    }

    if (tabValue === 0) {
      // Current salary tab
      await loadCurrentSalary(selectedEmployee);
    } else if (tabValue === 1) {
      // Salary history tab
      await loadSalaryHistory(selectedEmployee);
    }
  }, [selectedEmployee, tabValue, loadCurrentSalary, loadSalaryHistory]);

  useEffect(() => {
    loadSalaryRecords();
  }, [loadSalaryRecords]);

  const handleTabChange = (newValue: number) => {
    setTabValue(newValue);
    // Load appropriate data when switching tabs
    if (selectedEmployee) {
      if (newValue === 0) {
        loadCurrentSalary(selectedEmployee);
      } else if (newValue === 1) {
        loadSalaryHistory(selectedEmployee);
      }
    }
  };

  // Header Refresh button: reload whatever the active tab shows.
  const handleRefresh = () => {
    if (!selectedEmployee) return;
    if (tabValue === 0) {
      loadCurrentSalary(selectedEmployee);
    } else if (tabValue === 1) {
      loadSalaryHistory(selectedEmployee);
    } else {
      setProgressionRefreshKey((k) => k + 1);
    }
  };

  const handleFormChange = React.useCallback((patch: Partial<SalaryFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleOpenDialog = (record?: SalaryRecord) => {
    setError(null);
    if (record) {
      setEditingRecord(record);
      setFormData({
        employee_id: record.employee_id,
        pay_rate: record.pay_rate.toString(),
        pay_type: record.pay_type,
        effective_date: new Date(record.effective_date),
        end_date: record.end_date ? new Date(record.end_date) : null,
        notes: record.notes || '',
        wage_classification: record.wage_classification || '',
      });
    } else {
      setEditingRecord(null);
      setFormData({
        employee_id: selectedEmployee || '',
        pay_rate: '',
        pay_type: 'Hourly',
        effective_date: new Date(),
        end_date: null,
        notes: '',
        wage_classification: currentSalary?.wage_classification || '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRecord(null);
  };

  const handleFormSubmit = async () => {
    try {
      setLoading(true);

      // Validate dates before submission
      if (!formData.effective_date || isNaN(formData.effective_date.getTime())) {
        setError('Please enter a valid effective date');
        setLoading(false);
        return;
      }

      if (formData.end_date && isNaN(formData.end_date.getTime())) {
        setError('Please enter a valid end date');
        setLoading(false);
        return;
      }

      const submitData = {
        ...formData,
        pay_rate: parseFloat(formData.pay_rate),
        effective_date: formData.effective_date.toISOString().split('T')[0],
        end_date: formData.end_date ? formData.end_date.toISOString().split('T')[0] : null,
      };

      if (editingRecord) {
        await salaryAPI.update(editingRecord.id, submitData);
      } else {
        await salaryAPI.create(submitData);
      }

      handleCloseDialog();
      loadSalaryRecords();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save salary record');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (id: number) => {
    try {
      setLoading(true);
      await salaryAPI.delete(id);
      loadSalaryRecords();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete salary record');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, payType: string) => {
    const formatter = new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    });
    return formatter.format(amount);
  };

  const clearEmployee = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSelectedEmployee('');
    setSelectedEmployeeData(null);
    setGlobalSelectedEmployee(null);
    setCurrentSalary(null);
    setSalaryRecords([]);
  };

  const dialogOpenAny = dialogOpen || !!recordToDelete;

  const iconAction = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    className?: string,
  ) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('size-8', className)}
          aria-label={label}
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">
            Salary Management
          </h1>
          <p className="m-0 mt-1 text-sm text-muted-foreground">
            Manage employee pay rates, compensation history, and progression
          </p>
        </div>
        <Button className="shrink-0" onClick={() => handleOpenDialog()} disabled={loading}>
          <Plus />
          Add Salary Record
        </Button>
      </div>

      {/* Company filter status */}
      {selectedCompanyId && (
        <div className="flex items-center gap-2 rounded-lg border border-solid border-border bg-card px-3 py-2 text-sm">
          <Building2 className="size-4 text-primary" aria-hidden="true" />
          <span className="font-medium text-foreground">
            Filtered by company: {getCompanyName()}
          </span>
        </div>
      )}

      {/* Employee search toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-solid border-border bg-card p-3">
        <div className="relative w-full sm:max-w-sm sm:flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={searchInputRef}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name, ID, email..."
            aria-label="Search employee"
            className="px-9"
          />
          {searchTerm && (
            <button
              type="button"
              aria-label="Clear search text"
              onClick={() => {
                setSearchTerm('');
                setSearchResults([]);
              }}
              className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Button
          onClick={handleSearch}
          disabled={loading || searchLoading || !searchTerm || searchTerm.length < 2}
        >
          <Search />
          Search
        </Button>
        <Button variant="outline" onClick={clearEmployee} disabled={loading || searchLoading}>
          Clear
        </Button>
      </div>

      {/* Search results */}
      {searchLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : searchResults.length === 0 && searchTerm ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-solid border-border bg-card px-6 py-10 text-center">
          <Search className="size-10 text-muted-foreground/60" aria-hidden="true" />
          <p className="m-0 text-sm font-medium text-foreground">No employees found</p>
          <p className="m-0 text-sm text-muted-foreground">Try adjusting your search criteria.</p>
          {error && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setError(null);
                searchEmployees();
              }}
            >
              <RefreshCw />
              Retry Search
            </Button>
          )}
        </div>
      ) : searchResults.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {searchResults.map((employee) => (
            <button
              key={employee.id}
              type="button"
              onClick={() => handleSearchResultClick(employee)}
              className="box-border flex w-full cursor-pointer flex-col gap-2 rounded-lg border border-solid border-border bg-card p-4 text-left text-card-foreground [font-family:inherit] transition-colors outline-none hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarFallback className="bg-muted text-sm font-medium text-muted-foreground">
                    {getInitials(employee.first_name, employee.last_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{employee.full_name}</span>
                  <span className="truncate text-xs text-muted-foreground">ID: {employee.id}</span>
                </span>
                <StatusBadge status={employee.status} />
              </span>
              {(employee.email || employee.phone) && (
                <span className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {employee.email && (
                    <span className="flex items-center gap-1.5 truncate">
                      <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                      {employee.email}
                    </span>
                  )}
                  {employee.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                      {employee.phone}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : null}

      {/* Selected employee header card */}
      {selectedEmployeeData && (
        <Card className="py-0">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-10">
                <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                  {getInitials(selectedEmployeeData.first_name, selectedEmployeeData.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="m-0 truncate text-base font-semibold text-foreground">
                  {selectedEmployeeData.full_name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="rounded-md text-[11px]">
                    ID: {selectedEmployeeData.id}
                  </Badge>
                  <StatusBadge status={selectedEmployeeData.status} />
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={clearEmployee}>
              Change Employee
            </Button>
          </CardContent>
        </Card>
      )}

      {!dialogOpenAny && error && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription className="flex items-start justify-between gap-2">
            <span>{error}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setError(null)}
              className="cursor-pointer border-0 bg-transparent p-0 text-current"
            >
              <X className="size-4" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main content */}
      {selectedEmployeeData ? (
        <Tabs
          value={String(tabValue)}
          onValueChange={(v) => handleTabChange(Number(v))}
          className="gap-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-0 border-solid border-b border-border">
            <TabsList
              variant="line"
              className="group-data-[orientation=horizontal]/tabs:h-auto w-auto flex-wrap justify-start gap-x-5 gap-y-0 rounded-none p-0"
            >
              {TAB_ITEMS.map((label, i) => (
                <TabsTrigger
                  key={label}
                  value={String(i)}
                  className="h-auto flex-none rounded-none px-0.5 pt-1 pb-2.5 group-data-[orientation=horizontal]/tabs:after:bottom-[-1px] data-[state=active]:text-foreground"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button
              variant="outline"
              size="sm"
              className="mb-1.5"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn(loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {/* Current salary */}
          <TabsContent value="0">
            {loading ? (
              <Card className="max-w-2xl gap-0 py-0">
                <CardHeader className="px-6 py-4">
                  <Skeleton className="h-5 w-48" />
                </CardHeader>
                <CardContent className="flex flex-col gap-4 px-6 pb-6">
                  <Skeleton className="h-10 w-40" />
                  <Skeleton className="h-px w-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-9" />
                    <Skeleton className="h-9" />
                  </div>
                </CardContent>
              </Card>
            ) : currentSalary ? (
              <Card className="max-w-2xl gap-0 py-0">
                <CardHeader className="flex flex-row items-start justify-between gap-3 px-6 py-4">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">
                      {currentSalary.employee?.full_name || currentSalary.employee_id}
                    </CardTitle>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <PayTypeBadge payType={currentSalary.pay_type} />
                      <Badge
                        variant="secondary"
                        className="rounded-md bg-event-union/15 text-[11px] text-event-union"
                      >
                        Current
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => handleOpenDialog(currentSalary)}
                  >
                    <Pencil />
                    Edit Salary
                  </Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 px-6 pt-0 pb-6">
                  <p className="m-0 flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold text-foreground tabular-nums">
                      {formatCurrency(currentSalary.pay_rate, currentSalary.pay_type)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {PAY_TYPE_UNIT[currentSalary.pay_type] ?? ''}
                    </span>
                  </p>
                  <Separator />
                  <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <dt className={kvLabel}>Effective Date</dt>
                      <dd className="m-0 text-sm font-medium text-foreground tabular-nums">
                        {formatDateString(currentSalary.effective_date)}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className={kvLabel}>Wage Classification</dt>
                      <dd className="m-0 text-sm font-medium text-foreground">
                        {currentSalary.wage_classification || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <dt className={kvLabel}>Notes</dt>
                      <dd className="m-0 text-sm font-medium text-foreground">
                        {currentSalary.notes || <span className="text-muted-foreground">—</span>}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-solid border-border bg-card px-6 py-14 text-center">
                <DollarSign className="size-10 text-muted-foreground/60" aria-hidden="true" />
                <p className="m-0 text-base font-medium text-foreground">No Current Salary Found</p>
                <p className="m-0 text-sm text-muted-foreground">
                  This employee doesn&apos;t have a current salary record
                </p>
                <Button className="mt-2" onClick={() => handleOpenDialog()}>
                  <Plus />
                  Add Salary Record
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Salary history */}
          <TabsContent value="1">
            {loading ? (
              <div className="overflow-hidden rounded-lg border border-solid border-border bg-card">
                <Table>
                  <TableBody>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full max-w-20" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : salaryRecords.length > 0 ? (
              <div className="flex flex-col gap-3">
                <h3 className="m-0 text-sm font-semibold text-foreground">
                  Salary History - {selectedEmployee}
                </h3>
                <div className="overflow-hidden rounded-lg border border-solid border-border bg-card">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className={headClass}>Pay Rate</TableHead>
                        <TableHead className={headClass}>Pay Type</TableHead>
                        <TableHead className={headClass}>Wage Classification</TableHead>
                        <TableHead className={headClass}>Effective Date</TableHead>
                        <TableHead className={headClass}>End Date</TableHead>
                        <TableHead className={headClass}>Status</TableHead>
                        <TableHead className={headClass}>Notes</TableHead>
                        <TableHead className={cn(headClass, 'text-right')}>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salaryRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium tabular-nums">
                            {formatCurrency(record.pay_rate, record.pay_type)}
                          </TableCell>
                          <TableCell>
                            <PayTypeBadge payType={record.pay_type} />
                          </TableCell>
                          <TableCell>
                            {record.wage_classification || (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatDateString(record.effective_date)}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {record.end_date ? (
                              formatDateString(record.end_date)
                            ) : (
                              <Badge
                                variant="secondary"
                                className="rounded-md bg-event-union/15 text-[11px] text-event-union"
                              >
                                Current
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'rounded-md text-[11px]',
                                record.end_date
                                  ? 'bg-muted text-muted-foreground'
                                  : 'bg-event-union/15 text-event-union',
                              )}
                            >
                              {record.end_date ? 'Historical' : 'Active'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-52">
                            <span className="block truncate" title={record.notes || undefined}>
                              {record.notes || <span className="text-muted-foreground">—</span>}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {iconAction('Edit', <Pencil />, () => handleOpenDialog(record))}
                              {iconAction(
                                'Delete',
                                <Trash2 />,
                                () => setRecordToDelete(record),
                                'text-destructive hover:bg-destructive/10 hover:text-destructive',
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-solid border-border bg-card px-6 py-14 text-center">
                <CalendarClock className="size-10 text-muted-foreground/60" aria-hidden="true" />
                <p className="m-0 text-base font-medium text-foreground">No Salary History Found</p>
                <p className="m-0 text-sm text-muted-foreground">
                  This employee doesn&apos;t have any salary records
                </p>
                <Button className="mt-2" onClick={() => handleOpenDialog()}>
                  <Plus />
                  Add Salary Record
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Salary progression */}
          <TabsContent value="2">
            <SalaryProgressionChart
              employeeId={selectedEmployee}
              employeeName={currentSalary?.employee?.full_name || selectedEmployee}
              refreshKey={progressionRefreshKey}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-solid border-border bg-card px-6 py-14 text-center">
          <UserRound className="size-10 text-muted-foreground/60" aria-hidden="true" />
          <p className="m-0 text-base font-medium text-foreground">Select an Employee</p>
          <p className="m-0 max-w-md text-sm text-muted-foreground">
            Please select an employee to manage salary information. Search by name, ID or email
            above.
          </p>
          <Button className="mt-2" onClick={() => searchInputRef.current?.focus()}>
            <Search />
            Search for an employee
          </Button>
        </div>
      )}

      {/* Add / edit dialog */}
      <SalaryFormDialog
        open={dialogOpen}
        isEditing={!!editingRecord}
        formData={formData}
        loading={loading}
        error={error}
        onChange={handleFormChange}
        onClose={handleCloseDialog}
        onSubmit={handleFormSubmit}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!recordToDelete}
        onOpenChange={(open) => !open && setRecordToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete salary record?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this salary record
              {recordToDelete
                ? ` (${formatCurrency(recordToDelete.pay_rate, recordToDelete.pay_type)}, effective ${formatDateString(recordToDelete.effective_date)})`
                : ''}
              ? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => recordToDelete && handleDeleteRecord(recordToDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SalaryPage;
