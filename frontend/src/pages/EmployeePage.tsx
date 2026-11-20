import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  ChevronDown,
  CircleCheck,
  Clock,
  Download,
  FileSpreadsheet,
  Plus,
  Search,
  TriangleAlert,
  UserCheck,
  Upload,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { employeeAPI, leavePayrollAPI } from '../api/client';
import type { EmployeeDeleteConsistency } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useSelectedEmployee } from '../contexts/SelectedEmployeeContext';
import { useCompanyFilter } from '../hooks/useCompanyFilter';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import CreateEmployeeDialog from '../components/employee/CreateEmployeeDialog';
import EmployeeDetailPanel from '../components/employee/EmployeeDetailPanel';
import ImportEmployeesDialog from '../components/employee/ImportEmployeesDialog';
import StatusBadge from '../components/employee/StatusBadge';
import {
  createEmptyFormData,
  employeeToFormData,
  getInitials,
  type Employee,
  type EmployeeFormData,
} from '../components/employee/employeeTypes';

const DEFAULT_STATUS_FILTER = 'ActiveProbation';

interface StatCard {
  filter: string;
  label: string;
  icon: LucideIcon;
  iconClass: string;
  count: number;
}

const EmployeePage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(DEFAULT_STATUS_FILTER);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormData>(createEmptyFormData);
  const [error, setError] = useState('');
  const [consistencyAlert, setConsistencyAlert] = useState<{
    severity: 'success' | 'warning';
    text: string;
  } | null>(null);

  // Upload functionality state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [vacationOpeningYear, setVacationOpeningYear] = useState(new Date().getFullYear());
  const [vacationOpeningAmount, setVacationOpeningAmount] = useState('');
  const [vacationOpeningLoaded, setVacationOpeningLoaded] = useState(false);

  const { hasPermission } = useAuth();
  const { selectedEmployee: globalSelectedEmployee, setSelectedEmployee: setGlobalSelectedEmployee } =
    useSelectedEmployee();
  const { selectedCompanyId, isFilterActive, getCompanyName } = useCompanyFilter();

  const handleFormChange = useCallback((patch: Partial<EmployeeFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);

      const response = await employeeAPI.list({
        q: searchTerm,
        company_id: selectedCompanyId || undefined,
      });

      // Check if response has success field (new format) or is direct array (old format)
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setEmployees(response.data.data);
      } else if (Array.isArray(response.data)) {
        setEmployees(response.data);
      } else {
        setEmployees([]);
      }
    } catch (err: any) {
      console.error('Error loading employees:', err);
      setError(err.response?.data?.detail || 'Failed to load employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCompanyId]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleSearch = () => {
    loadEmployees();
  };

  const handleDeleteClick = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };

  const formatConsistencyMessage = (c: EmployeeDeleteConsistency) => {
    if (c.consistent) {
      return 'Database consistency check passed: no rows remain linked to this employee in attendance, employment, schedules, leave, expenses, or other related tables.';
    }
    const bad = Object.entries(c.by_table).filter(([, n]) => n > 0);
    const detail = bad.map(([t, n]) => `${t}: ${n}`).join('; ');
    return `Warning: some related rows may still reference this employee. ${detail}`;
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;

    try {
      setError('');
      setConsistencyAlert(null);
      const res = await employeeAPI.delete(employeeToDelete.id);
      const c = res.data?.consistency;
      if (c) {
        setConsistencyAlert({
          severity: c.consistent ? 'success' : 'warning',
          text: formatConsistencyMessage(c),
        });
      }
      setEmployees(employees.filter((emp) => emp.id !== employeeToDelete.id));
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);

      // Clear selection if deleted employee was selected
      if (selectedEmployee?.id === employeeToDelete.id) {
        setSelectedEmployee(null);
        setIsEditing(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete employee');
    }
  };

  const handleEmployeeSelect = (employee: Employee) => {
    // If editing, cancel first
    if (isEditing) {
      setIsEditing(false);
    }
    setSelectedEmployee(employee);
    // Set the global selected employee for cross-page functionality
    setGlobalSelectedEmployee({
      id: employee.id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone,
      status: employee.status,
    });
  };

  useEffect(() => {
    const loadOpening = async () => {
      if (!selectedEmployee?.id) {
        setVacationOpeningAmount('');
        setVacationOpeningLoaded(false);
        return;
      }
      const companyId = selectedEmployee.company_id || selectedCompanyId || undefined;
      if (!companyId) {
        setVacationOpeningAmount('');
        setVacationOpeningLoaded(false);
        return;
      }
      try {
        const res = await leavePayrollAPI.listOpenings({
          employee_id: selectedEmployee.id,
          company_id: companyId,
          year: vacationOpeningYear,
        });
        const rows = res.data?.data || [];
        if (rows.length > 0) {
          setVacationOpeningAmount(String(rows[0].opening_amount ?? ''));
        } else {
          setVacationOpeningAmount('');
        }
        setVacationOpeningLoaded(true);
      } catch {
        setVacationOpeningAmount('');
        setVacationOpeningLoaded(false);
      }
    };
    loadOpening();
  }, [selectedEmployee?.id, selectedEmployee?.company_id, selectedCompanyId, vacationOpeningYear]);

  const handleEditClick = () => {
    if (!selectedEmployee) return;
    setFormData(employeeToFormData(selectedEmployee));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedEmployee) return;

    try {
      // Prepare data for API
      const submitData = {
        ...formData,
        other_name: formData.other_name || '',
        email: formData.email || '',
        phone: formData.phone || '',
        street: formData.street || '',
        city: formData.city || '',
        province: formData.province || '',
        postal_code: formData.postal_code || '',
        dob: formData.dob || null,
        sin: formData.sin || '',
        drivers_license: formData.drivers_license || '',
        hire_date: formData.hire_date || null,
        probation_end_date: formData.probation_end_date || null,
        seniority_start_date: formData.seniority_start_date || null,
        remarks: formData.remarks || '',
        union_member: formData.union_member,
        vacation_percent:
          formData.vacation_percent === '' || formData.vacation_percent === null
            ? null
            : Number(formData.vacation_percent),
        vacation_percent_override: !!formData.vacation_percent_override,
        use_mailing_address: formData.use_mailing_address,
        mailing_street: formData.mailing_street || '',
        mailing_city: formData.mailing_city || '',
        mailing_province: formData.mailing_province || '',
        mailing_postal_code: formData.mailing_postal_code || '',
        emergency_contact_name: formData.emergency_contact_name || '',
        emergency_contact_phone: formData.emergency_contact_phone || '',
      };

      await employeeAPI.update(selectedEmployee.id, submitData);

      const companyId = selectedEmployee.company_id || selectedCompanyId;
      if (companyId && vacationOpeningAmount !== '') {
        await leavePayrollAPI.upsertOpening({
          employee_id: selectedEmployee.id,
          company_id: companyId,
          year: vacationOpeningYear,
          opening_amount: Number(vacationOpeningAmount) || 0,
        });
        setVacationOpeningLoaded(true);
      }

      // Refresh the employee list
      await loadEmployees();

      // Update selected employee with new data
      const updatedEmployee = {
        ...selectedEmployee,
        first_name: formData.first_name,
        last_name: formData.last_name,
        full_name: `${formData.first_name} ${formData.last_name}`,
        other_name: formData.other_name,
        email: formData.email,
        phone: formData.phone,
        street: formData.street,
        city: formData.city,
        province: formData.province,
        postal_code: formData.postal_code,
        dob: formData.dob,
        sin: formData.sin,
        drivers_license: formData.drivers_license,
        hire_date: formData.hire_date,
        probation_end_date: formData.probation_end_date,
        seniority_start_date: formData.seniority_start_date,
        status: formData.status,
        remarks: formData.remarks,
        union_member: formData.union_member,
        vacation_percent:
          formData.vacation_percent === '' || formData.vacation_percent === null
            ? null
            : Number(formData.vacation_percent),
        vacation_percent_override: !!formData.vacation_percent_override,
        use_mailing_address: formData.use_mailing_address,
        mailing_street: formData.mailing_street,
        mailing_city: formData.mailing_city,
        mailing_province: formData.mailing_province,
        mailing_postal_code: formData.mailing_postal_code,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
      };
      setSelectedEmployee(updatedEmployee);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Save error:', err.response?.data);
      if (err.response?.status === 422) {
        const validationErrors = err.response?.data?.errors || [];
        const errorMessages = validationErrors
          .map((error: any) => `${error.loc?.join('.')}: ${error.msg}`)
          .join(', ');
        setError(`Validation error: ${errorMessages}`);
      } else {
        setError(err.response?.data?.detail || 'Failed to update employee');
      }
    }
  };

  const handleCreateSubmit = async () => {
    try {
      if (!formData.first_name || !formData.last_name) {
        setError('First name and last name are required');
        return;
      }

      // Use provided employee ID or generate one
      let employeeId = formData.employee_id?.trim();
      if (!employeeId) {
        const firstNamePrefix = formData.first_name.substring(0, 2).toUpperCase();
        const lastNamePrefix = formData.last_name.substring(0, 2).toUpperCase();
        const timestamp = Date.now().toString().slice(-6);
        employeeId = `${firstNamePrefix}${lastNamePrefix}-${timestamp}`;
      }

      const submitData = {
        id: employeeId,
        ...formData,
        other_name: formData.other_name || '',
        email: formData.email || '',
        phone: formData.phone || '',
        street: formData.street || '',
        city: formData.city || '',
        province: formData.province || '',
        postal_code: formData.postal_code || '',
        dob: formData.dob || null,
        sin: formData.sin || '',
        drivers_license: formData.drivers_license || '',
        hire_date: formData.hire_date || null,
        probation_end_date: formData.probation_end_date || null,
        seniority_start_date: formData.seniority_start_date || null,
        remarks: formData.remarks || '',
        union_member: formData.union_member,
        vacation_percent:
          formData.vacation_percent === '' || formData.vacation_percent === null
            ? null
            : Number(formData.vacation_percent),
        vacation_percent_override: !!formData.vacation_percent_override,
        use_mailing_address: formData.use_mailing_address,
        mailing_street: formData.mailing_street || '',
        mailing_city: formData.mailing_city || '',
        mailing_province: formData.mailing_province || '',
        mailing_postal_code: formData.mailing_postal_code || '',
        emergency_contact_name: formData.emergency_contact_name || '',
        emergency_contact_phone: formData.emergency_contact_phone || '',
      };

      await employeeAPI.create(submitData);
      await loadEmployees();
      handleCreateDialogClose();
    } catch (err: any) {
      console.error('Create error:', err.response?.data);
      if (err.response?.status === 422) {
        const validationErrors = err.response?.data?.errors || [];
        const errorMessages = validationErrors
          .map((error: any) => `${error.loc?.join('.')}: ${error.msg}`)
          .join(', ');
        setError(`Validation error: ${errorMessages}`);
      } else {
        setError(err.response?.data?.detail || 'Failed to create employee');
      }
    }
  };

  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
    setFormData(createEmptyFormData());
    setError('');
  };

  const handleCreateClick = () => {
    setFormData(createEmptyFormData());
    setError('');
    setCreateDialogOpen(true);
  };

  // Upload functionality
  const downloadTemplate = async () => {
    try {
      const { downloadBlobFile } = await import('../utils/downloadFile');
      const response = await employeeAPI.downloadTemplate();
      await downloadBlobFile({
        filename: 'employee_import_template.xlsx',
        data: response.data,
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to download template');
    }
  };

  const previewUpload = async () => {
    if (!selectedFile) return;

    try {
      setPreviewLoading(true);
      const response = await employeeAPI.previewUpload(selectedFile);
      setPreviewData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to preview file');
    } finally {
      setPreviewLoading(false);
    }
  };

  const executeUpload = async () => {
    if (!selectedFile || !previewData) return;

    try {
      setUploadLoading(true);
      const response = await employeeAPI.upload(selectedFile);
      setUploadResult(response.data);

      if (response.data.success_count > 0) {
        loadEmployees();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploadLoading(false);
    }
  };

  const resetUploadDialog = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setUploadResult(null);
    setUploadDialogOpen(false);
    setError('');
  };

  const filteredEmployees = useMemo(
    () =>
      employees.filter((emp) => {
        if (globalSelectedEmployee) {
          return emp.id === globalSelectedEmployee.id;
        }
        if (statusFilter === 'ActiveProbation') {
          return emp.status === 'Active' || emp.status === 'Probation';
        }
        if (statusFilter === 'All') {
          return emp.status !== 'Terminated';
        }
        if (statusFilter === 'AllIncludingTerminated') {
          return true;
        }
        if (statusFilter === 'OnLeaveProbation') {
          return emp.status === 'On Leave' || emp.status === 'Probation';
        }
        return emp.status === statusFilter;
      }),
    [employees, globalSelectedEmployee, statusFilter],
  );

  // Auto-select the first employee so the detail pane is populated on load. This only sets the
  // local selection; the cross-page (global) selection is still set by an explicit click.
  useEffect(() => {
    if (loading || isEditing) return;
    if (filteredEmployees.length === 0) {
      if (selectedEmployee) setSelectedEmployee(null);
      return;
    }
    if (!selectedEmployee || !filteredEmployees.some((emp) => emp.id === selectedEmployee.id)) {
      setSelectedEmployee(filteredEmployees[0]);
    }
  }, [filteredEmployees, selectedEmployee, loading, isEditing]);

  const statCards: StatCard[] = [
    {
      filter: 'All',
      label: 'Total Employees',
      icon: Users,
      iconClass: 'text-primary',
      count: employees.filter((emp) => emp.status !== 'Terminated').length,
    },
    {
      filter: 'Active',
      label: 'Active',
      icon: UserCheck,
      iconClass: 'text-event-union',
      count: employees.filter((emp) => emp.status === 'Active').length,
    },
    {
      filter: 'OnLeaveProbation',
      label: 'On Leave & Probation',
      icon: Clock,
      iconClass: 'text-event-cra',
      count: employees.filter((emp) => emp.status === 'On Leave' || emp.status === 'Probation').length,
    },
  ];

  const selectStatCard = (filter: string) => {
    setGlobalSelectedEmployee(null);
    setStatusFilter(filter);
  };

  const showInitialSkeleton = loading && employees.length === 0;
  const anyDialogOpen = createDialogOpen || uploadDialogOpen || deleteDialogOpen;
  const filtersChanged = searchTerm !== '' || statusFilter !== DEFAULT_STATUS_FILTER;
  const canCreate = hasPermission('employee:create');

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">
            Employee Directory
          </h1>
          <p className="m-0 mt-1 text-sm text-muted-foreground">
            Manage and view all employee information in your organization
          </p>
        </div>
        {canCreate && (
          <div className="flex shrink-0 items-center gap-2">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <FileSpreadsheet />
                  Import / Export
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    setError('');
                    setUploadDialogOpen(true);
                  }}
                >
                  <Upload />
                  Import Employees
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={downloadTemplate}>
                  <Download />
                  Download Template
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleCreateClick}>
              <Plus />
              Create Employee
            </Button>
          </div>
        )}
      </div>

      {/* Company filter indicator */}
      {isFilterActive && (
        <div className="flex items-center gap-2 rounded-lg border border-solid border-border bg-card px-3 py-2 text-sm">
          <Building2 className="size-4 text-primary" aria-hidden="true" />
          <span className="font-medium text-foreground">
            Company filter active: {getCompanyName()}
          </span>
          <span className="text-muted-foreground">Showing employees from selected company only</span>
        </div>
      )}

      {/* Global selection indicator */}
      {globalSelectedEmployee && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-solid border-border bg-card px-3 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                {getInitials(globalSelectedEmployee.first_name, globalSelectedEmployee.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="m-0 truncate text-sm font-medium text-foreground">
                {globalSelectedEmployee.full_name}
              </p>
              <p className="m-0 text-xs text-muted-foreground">
                Currently selected for cross-page operations
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setGlobalSelectedEmployee(null)}>
            Clear Selection
          </Button>
        </div>
      )}

      {/* KPI summary strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          const selected = statusFilter === card.filter && !globalSelectedEmployee;
          return (
            <button
              key={card.filter}
              type="button"
              onClick={() => selectStatCard(card.filter)}
              aria-pressed={selected}
              className={cn(
                'box-border flex cursor-pointer flex-col gap-2 rounded-lg border border-solid bg-card p-4 text-left text-card-foreground [font-family:inherit] transition-colors outline-none',
                'hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50',
                selected ? 'border-primary ring-1 ring-primary' : 'border-border',
              )}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {card.label}
                </span>
                <Icon className={cn('size-4', card.iconClass)} aria-hidden="true" />
              </span>
              {showInitialSkeleton ? (
                <Skeleton className="h-8 w-14" />
              ) : (
                <span className="text-2xl font-semibold text-foreground tabular-nums">
                  {card.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!anyDialogOpen && consistencyAlert && (
        <Alert variant={consistencyAlert.severity === 'warning' ? 'destructive' : 'default'}>
          {consistencyAlert.severity === 'warning' ? <TriangleAlert /> : <CircleCheck />}
          <AlertDescription className="flex items-start justify-between gap-2">
            <span>{consistencyAlert.text}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setConsistencyAlert(null)}
              className="cursor-pointer border-0 bg-transparent p-0 text-current"
            >
              <X className="size-4" />
            </button>
          </AlertDescription>
        </Alert>
      )}
      {!anyDialogOpen && error && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription className="flex items-start justify-between gap-2">
            <span>{error}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setError('')}
              className="cursor-pointer border-0 bg-transparent p-0 text-current"
            >
              <X className="size-4" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Search & filter toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name, code, or email..."
            aria-label="Search employees"
            className="px-9"
          />
          {searchTerm && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchTerm('')}
              className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-60" aria-label="Status filter">
            <SelectValue placeholder="Status Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ActiveProbation">Active & Probation</SelectItem>
            <SelectItem value="All">All (excluding terminated)</SelectItem>
            <SelectItem value="AllIncludingTerminated">All (including terminated)</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="OnLeaveProbation">On Leave & Probation</SelectItem>
            <SelectItem value="On Leave">On Leave</SelectItem>
            <SelectItem value="Terminated">Terminated</SelectItem>
            <SelectItem value="Probation">Probation</SelectItem>
          </SelectContent>
        </Select>
        {filtersChanged && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter(DEFAULT_STATUS_FILTER);
              loadEmployees();
            }}
            disabled={loading}
          >
            Reset filters
          </Button>
        )}
      </div>

      {/* Master-detail layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
        {/* Left: employee list */}
        <Card className="gap-0 overflow-hidden py-0 lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between gap-2 border-0 border-b border-solid border-border px-4 py-3">
            <CardTitle className="text-base">Employees</CardTitle>
            <Badge variant="secondary" className="tabular-nums">
              {filteredEmployees.length}
            </Badge>
          </CardHeader>

          {showInitialSkeleton ? (
            <div className="flex h-72 flex-col lg:h-[calc(100vh-24rem)] lg:min-h-96">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border-0 border-b border-solid border-border px-3 py-2.5"
                >
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center gap-2 p-6 text-center lg:h-[calc(100vh-24rem)] lg:min-h-96">
              <UserRound className="size-10 text-muted-foreground/60" aria-hidden="true" />
              <p className="m-0 text-sm font-medium text-foreground">No employees found</p>
              <p className="m-0 text-sm text-muted-foreground">Try adjusting your search criteria.</p>
              {filtersChanged && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter(DEFAULT_STATUS_FILTER);
                  }}
                >
                  Reset filters
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea
              className={cn(
                // Radix wraps content in `display: table`, which defeats `truncate`; force block layout.
                'h-72 lg:h-[calc(100vh-24rem)] lg:min-h-96 [&_[data-radix-scroll-area-viewport]>div]:block!',
                loading && 'opacity-60 transition-opacity',
              )}
            >
              <ul className="m-0 list-none p-0">
                {filteredEmployees.map((employee) => {
                  const selected = selectedEmployee?.id === employee.id;
                  return (
                    <li key={employee.id} className="m-0 p-0">
                      <button
                        type="button"
                        onClick={() => handleEmployeeSelect(employee)}
                        aria-current={selected ? 'true' : undefined}
                        className={cn(
                          'box-border flex w-full cursor-pointer items-center gap-3 border-0 border-solid border-b border-l-2 border-b-border px-3 py-2.5 text-left [font-family:inherit] transition-colors outline-none',
                          'focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50',
                          selected
                            ? 'border-l-primary bg-accent text-accent-foreground'
                            : 'border-l-transparent bg-transparent text-foreground hover:bg-accent/50',
                        )}
                      >
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                            {getInitials(employee.first_name, employee.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium">{employee.full_name}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {[employee.id, employee.company_short_form].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        <StatusBadge status={employee.status} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </Card>

        {/* Right: employee detail */}
        <div className="min-w-0 lg:col-span-8">
          {showInitialSkeleton ? (
            <Card className="gap-0 py-0">
              <CardHeader className="flex flex-row items-center gap-3 px-6 py-4">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : !selectedEmployee ? (
            <Card className="py-0">
              <CardContent className="flex min-h-96 flex-col items-center justify-center gap-2 p-6 text-center">
                <UserRound className="size-12 text-muted-foreground/60" aria-hidden="true" />
                <p className="m-0 text-base font-medium text-foreground">
                  {filteredEmployees.length === 0 ? 'No employees to display' : 'Select an employee'}
                </p>
                <p className="m-0 text-sm text-muted-foreground">
                  {filteredEmployees.length === 0
                    ? 'Adjust the search or status filter, or create a new employee.'
                    : 'Choose an employee from the list to view their details'}
                </p>
                {filteredEmployees.length === 0 && canCreate && (
                  <Button className="mt-2" onClick={handleCreateClick}>
                    <Plus />
                    Create Employee
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <EmployeeDetailPanel
              employee={selectedEmployee}
              isEditing={isEditing}
              formData={formData}
              onFormChange={handleFormChange}
              canUpdate={hasPermission('employee:update')}
              canDelete={hasPermission('employee:delete')}
              onEdit={handleEditClick}
              onCancel={handleCancelEdit}
              onSave={handleSaveEdit}
              onDelete={() => handleDeleteClick(selectedEmployee)}
              vacationOpening={{
                year: vacationOpeningYear,
                amount: vacationOpeningAmount,
                loaded: vacationOpeningLoaded,
                hasCompany: !!(selectedEmployee.company_id || selectedCompanyId),
                onYearChange: setVacationOpeningYear,
                onAmountChange: setVacationOpeningAmount,
              }}
            />
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete employee{' '}
              <strong className="text-foreground">{employeeToDelete?.full_name}</strong> (
              {employeeToDelete?.id})? This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <TriangleAlert />
            <AlertDescription>
              <p className="m-0 font-medium">This permanently removes the employee and related data</p>
              <p className="m-0 mt-1">
                The following types of records are removed with this employee (when the database uses
                cascading deletes):
              </p>
              <ul className="m-0 mt-1 list-disc pl-5">
                <li>Employment history and work schedules</li>
                <li>Attendance and pay-period attendance overrides</li>
                <li>Leave, terminations, salary history, and work permits</li>
                <li>Expense entitlements and expense claims</li>
                <li>Employee document records (files on disk may still need manual cleanup)</li>
              </ul>
            </AlertDescription>
          </Alert>

          {error && deleteDialogOpen && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create employee dialog */}
      <CreateEmployeeDialog
        open={createDialogOpen}
        formData={formData}
        error={error}
        onChange={handleFormChange}
        onClose={handleCreateDialogClose}
        onSubmit={handleCreateSubmit}
      />

      {/* Import employees dialog */}
      <ImportEmployeesDialog
        open={uploadDialogOpen}
        error={error}
        selectedFile={selectedFile}
        previewData={previewData}
        uploadResult={uploadResult}
        previewLoading={previewLoading}
        uploadLoading={uploadLoading}
        onFileChange={setSelectedFile}
        onDownloadTemplate={downloadTemplate}
        onPreview={previewUpload}
        onUpload={executeUpload}
        onChooseDifferentFile={() => {
          setPreviewData(null);
          setSelectedFile(null);
        }}
        onClose={resetUploadDialog}
      />
    </div>
  );
};

export default EmployeePage;
