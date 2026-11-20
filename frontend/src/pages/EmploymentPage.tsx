import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Pencil,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  Users,
  X,
} from 'lucide-react';
import { employmentAPI, employeeAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useSelectedEmployee } from '../contexts/SelectedEmployeeContext';
import { useCompanyFilter } from '../hooks/useCompanyFilter';
import EmploymentFormDialog, {
  createEmptyEmploymentForm,
  type EmploymentFormData,
} from '../components/employment/EmploymentFormDialog';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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

interface Employment {
  id: number;
  employee_id: string;
  company_id: string;
  position: string;
  department?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  remarks?: string;
  employee_type?: string;
  count_all_ot?: boolean;
  is_driver?: boolean;
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

const PAGE_SIZES = [10, 25, 50];
const headClass = 'text-xs font-medium tracking-wider text-muted-foreground uppercase';

const EmploymentPage: React.FC = () => {
  const [employments, setEmployments] = useState<Employment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEmployment, setEditingEmployment] = useState<Employment | null>(null);
  const [employmentToDelete, setEmploymentToDelete] = useState<Employment | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [showEmployeeSearchResults, setShowEmployeeSearchResults] = useState(false);
  const [selectingEmployee, setSelectingEmployee] = useState<string | null>(null);
  const [formData, setFormData] = useState<EmploymentFormData>(createEmptyEmploymentForm);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    // Parse the date string as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString();
  };

  const { hasPermission } = useAuth();
  const {
    selectedEmployee: globalSelectedEmployee,
    setSelectedEmployee: setGlobalSelectedEmployee,
    clearSelection,
  } = useSelectedEmployee();
  const { selectedCompanyId, isFilterActive, getCompanyName, companies } = useCompanyFilter();

  const handleFormChange = useCallback((patch: Partial<EmploymentFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);

  const loadEmployments = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};

      // If there's a search term, search for employees first instead of employment records
      if (searchTerm) {
        // Search for employees matching the search term
        const searchParams: any = { q: searchTerm };
        if (selectedCompanyId) {
          searchParams.company_id = selectedCompanyId;
        }
        const employeeResponse = await employeeAPI.list(searchParams);
        if (employeeResponse.data.success) {
          setSearchResults(employeeResponse.data.data || []);
        } else {
          setSearchResults([]);
        }
        setShowEmployeeSearchResults(true);
        setIsSearchActive(true);
        setEmployments([]); // Don't show employment records yet
        setLoading(false);
        return;
      } else {
        // Only filter by employee if no search term is provided
        const employeeToFilter = globalSelectedEmployee?.id;
        if (employeeToFilter) {
          params.employee_id = employeeToFilter;
        } else {
          // No employee selected and no search - don't load any data
          setEmployments([]);
          setIsSearchActive(false);
          setShowEmployeeSearchResults(false);
          setLoading(false);
          return;
        }
        setIsSearchActive(false);
        setShowEmployeeSearchResults(false);
      }

      // Add company filter if specified
      if (selectedCompanyId) {
        params.company_id = selectedCompanyId;
      }

      const response = await employmentAPI.list(params);
      if (response.data.success) {
        setEmployments(response.data.data || []);
      } else {
        setEmployments([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load employment records');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, globalSelectedEmployee?.id, selectedCompanyId]);

  useEffect(() => {
    loadEmployments();
    loadEmployees();
  }, [loadEmployments]);

  // Keep the page index valid when the record set changes.
  useEffect(() => {
    setPage(0);
  }, [employments.length, pageSize]);

  const loadEmployees = async () => {
    try {
      const response = await employeeAPI.list();
      if (response.data.success) {
        setEmployees(response.data.data || []);
      } else {
        setEmployees([]);
      }
    } catch (err: any) {
      console.error('Failed to load employees:', err);
      setEmployees([]);
    }
  };

  const handleSearch = () => {
    loadEmployments();
  };

  const resetSearchState = () => {
    setSearchTerm('');
    setIsSearchActive(false);
    setShowEmployeeSearchResults(false);
    setSearchResults([]);
    setSelectingEmployee(null);
  };

  const handleSearchResultClick = async (employee: Employee) => {
    // Set loading state for this specific employee
    setSelectingEmployee(employee.id);

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

    // Load employment records for this employee first
    try {
      setLoading(true);
      const response = await employmentAPI.list({ employee_id: employee.id });
      if (response.data.success) {
        setEmployments(response.data.data || []);
      } else {
        setEmployments([]);
      }

      // Only clear search states after data is successfully loaded
      // Add a small delay to ensure smooth transition
      setTimeout(() => {
        setSearchTerm('');
        setShowEmployeeSearchResults(false);
        setIsSearchActive(false);
        setSearchResults([]);
      }, 100);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load employment records');
    } finally {
      setLoading(false);
      setSelectingEmployee(null);
    }
  };

  const handleOpenDialog = (employment?: Employment) => {
    setError(null);
    if (employment) {
      setEditingEmployment(employment);
      setFormData({
        employee_id: employment.employee_id,
        company_id: employment.company_id,
        position: employment.position,
        department: employment.department || '',
        start_date: employment.start_date,
        end_date: employment.end_date || '',
        remarks: employment.remarks || '',
        employee_type: employment.employee_type || '',
        count_all_ot: employment.count_all_ot || false,
        is_driver: employment.is_driver || false,
      });
    } else {
      setEditingEmployment(null);
      // Pre-populate with selected employee if available
      const selectedEmployeeId = globalSelectedEmployee?.id;
      setFormData({
        ...createEmptyEmploymentForm(),
        employee_id: selectedEmployeeId || '',
        company_id: selectedCompanyId || '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingEmployment(null);
    setFormData(createEmptyEmploymentForm());
  };

  const handleSubmit = async () => {
    try {
      const submitData = {
        ...formData,
        end_date: formData.end_date || undefined,
      };

      if (editingEmployment) {
        await employmentAPI.update(editingEmployment.id, submitData);
      } else {
        await employmentAPI.create(submitData);
      }

      handleCloseDialog();
      loadEmployments();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save employment record');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await employmentAPI.delete(id);
      loadEmployments();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete employment record');
    }
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find((emp) => emp.id === employeeId);
    return employee ? employee.full_name : employeeId;
  };

  const canCreate = hasPermission('employment:create');
  const canUpdate = hasPermission('employment:update');
  const canDelete = hasPermission('employment:delete');
  const showTable = !!globalSelectedEmployee && !showEmployeeSearchResults;
  const pageCount = Math.max(1, Math.ceil(employments.length / pageSize));
  const pageRows = employments.slice(page * pageSize, page * pageSize + pageSize);
  const dialogOrAlertOpen = openDialog || !!employmentToDelete;

  const clearSearchButton = searchTerm && (
    <button
      type="button"
      aria-label="Clear search"
      onClick={resetSearchState}
      className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <X className="size-4" />
    </button>
  );

  const actionButton = (
    label: string,
    icon: React.ReactNode,
    allowed: boolean,
    onClick: () => void,
    className?: string,
  ) => (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* span keeps the tooltip working when the button is disabled */}
        <span className="inline-flex">
          <Button
            variant="ghost"
            size="icon"
            className={cn('size-8', className)}
            aria-label={label}
            disabled={!allowed}
            onClick={onClick}
          >
            {icon}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{allowed ? label : `${label} (no permission)`}</TooltipContent>
    </Tooltip>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">
            Employment Management
          </h1>
          <p className="m-0 mt-1 text-sm text-muted-foreground">
            Manage employee positions, departments, and employment history
          </p>
        </div>
        {/* Add Employment Record - only when an employee is selected */}
        {globalSelectedEmployee && canCreate && (
          <Button className="shrink-0" onClick={() => handleOpenDialog()}>
            <Plus />
            Add Employment Record
          </Button>
        )}
      </div>

      {/* Company filter indicator */}
      {isFilterActive && !isSearchActive && (
        <div className="flex items-center gap-2 rounded-lg border border-solid border-border bg-card px-3 py-2 text-sm">
          <Building2 className="size-4 text-primary" aria-hidden="true" />
          <span className="font-medium text-foreground">
            Company filter active: {getCompanyName()}
          </span>
          <span className="text-muted-foreground">
            Showing employment records from selected company only
          </span>
        </div>
      )}

      {/* Selected employee context banner */}
      {globalSelectedEmployee && !isSearchActive && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-solid border-primary/20 bg-primary/5 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                {getInitials(globalSelectedEmployee.first_name, globalSelectedEmployee.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="m-0 truncate text-sm font-medium text-foreground">
                Showing employment records for: {globalSelectedEmployee.full_name}
              </p>
              <p className="m-0 text-xs text-muted-foreground">
                Selected from Employee Directory - showing only this employee&apos;s employment
                history
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={clearSelection}>
            Clear Selection
          </Button>
        </div>
      )}

      {!dialogOrAlertOpen && error && (
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

      {/* Search toolbar */}
      <div className="relative w-full sm:max-w-sm">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search employees by name, ID, or email..."
          aria-label="Search employees"
          className="px-9"
        />
        {clearSearchButton}
      </div>

      {/* Employee search results */}
      {isSearchActive && showEmployeeSearchResults && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-solid border-border bg-card px-4 py-2.5">
            <div className="min-w-0">
              <p className="m-0 text-sm font-medium text-foreground">
                Employee search results for: &quot;{searchTerm}&quot;
              </p>
              <p className="m-0 text-xs text-muted-foreground">
                Found {searchResults.length} employee(s) matching your search. Click on an employee
                to view their employment records.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetSearchState}
            >
              Clear Search
            </Button>
          </div>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {searchResults.map((employee) => {
                const selecting = selectingEmployee === employee.id;
                return (
                  <button
                    key={employee.id}
                    type="button"
                    disabled={!!selectingEmployee}
                    onClick={() => handleSearchResultClick(employee)}
                    className={cn(
                      'box-border flex w-full cursor-pointer items-center gap-3 rounded-lg border border-solid bg-card p-3 text-left text-card-foreground [font-family:inherit] transition-colors outline-none',
                      'hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-70',
                      selecting ? 'border-primary' : 'border-border',
                    )}
                  >
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                        {getInitials(employee.first_name, employee.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{employee.full_name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        ID: {employee.id}
                        {selecting && ' · Loading...'}
                      </span>
                    </span>
                    <StatusBadge status={employee.status} />
                  </button>
                );
              })}
            </div>
          ) : (
            !loading && (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center">
                <Search className="size-10 text-muted-foreground/60" aria-hidden="true" />
                <p className="m-0 text-sm font-medium text-foreground">No employees found</p>
                <p className="m-0 text-sm text-muted-foreground">
                  No employees found matching &quot;{searchTerm}&quot;. Try a different search term.
                </p>
              </div>
            )
          )}
        </div>
      )}

      {/* No employee selected */}
      {!globalSelectedEmployee && !isSearchActive && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-solid border-border bg-card px-6 py-14 text-center">
          <Users className="size-10 text-muted-foreground/60" aria-hidden="true" />
          <p className="m-0 text-base font-medium text-foreground">No Employee Selected</p>
          <p className="m-0 max-w-xl text-sm text-muted-foreground">
            To view employment records, select an employee from the Employee Directory first, or
            use the search above to find an employee.
          </p>
          <Button asChild className="mt-2">
            <Link to="/employees">
              <Users />
              Go to Employee Directory
            </Link>
          </Button>
        </div>
      )}

      {/* Employment records table */}
      {showTable && (
        <div className="overflow-hidden rounded-lg border border-solid border-border bg-card">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className={headClass}>Employee</TableHead>
                <TableHead className={headClass}>Company</TableHead>
                <TableHead className={headClass}>Position</TableHead>
                <TableHead className={headClass}>Department</TableHead>
                <TableHead className={headClass}>Employee Type</TableHead>
                <TableHead className={headClass}>Start Date</TableHead>
                <TableHead className={headClass}>End Date</TableHead>
                <TableHead className={headClass}>Status</TableHead>
                <TableHead className={cn(headClass, 'text-right')}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full max-w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : pageRows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={9} className="py-12">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Briefcase className="size-10 text-muted-foreground/60" aria-hidden="true" />
                      <p className="m-0 text-sm font-medium text-foreground">
                        No employment records
                      </p>
                      <p className="m-0 text-sm font-normal whitespace-normal text-muted-foreground">
                        {globalSelectedEmployee?.full_name} has no employment records
                        {isFilterActive ? ' for the selected company' : ''} yet.
                      </p>
                      {canCreate && (
                        <Button className="mt-2" onClick={() => handleOpenDialog()}>
                          <Plus />
                          Add Employment Record
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((employment) => (
                  <TableRow key={employment.id}>
                    <TableCell className="font-medium">
                      {getEmployeeName(employment.employee_id)}
                    </TableCell>
                    <TableCell>{employment.company_id}</TableCell>
                    <TableCell>{employment.position}</TableCell>
                    <TableCell>
                      {employment.department || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {employment.employee_type || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">{formatDate(employment.start_date)}</TableCell>
                    <TableCell className="tabular-nums">
                      {employment.end_date ? (
                        formatDate(employment.end_date)
                      ) : (
                        <span className="text-muted-foreground">Current</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'rounded-md px-1.5 text-[11px]',
                          employment.is_active
                            ? 'bg-event-union/15 text-event-union'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {employment.is_active ? (
                          <>
                            <CircleCheck /> Active
                          </>
                        ) : (
                          'Ended'
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {actionButton('Edit', <Pencil />, canUpdate, () =>
                          handleOpenDialog(employment),
                        )}
                        {actionButton(
                          'Delete',
                          <Trash2 />,
                          canDelete,
                          () => setEmploymentToDelete(employment),
                          'text-destructive hover:bg-destructive/10 hover:text-destructive',
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {!loading && employments.length > PAGE_SIZES[0] && (
            <div className="flex flex-wrap items-center justify-end gap-3 border-0 border-solid border-t border-border px-4 py-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                Rows per page
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger size="sm" className="w-16" aria-label="Rows per page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </span>
              <span className="tabular-nums">
                {page * pageSize + 1}–{Math.min((page + 1) * pageSize, employments.length)} of{' '}
                {employments.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  aria-label="Previous page"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  aria-label="Next page"
                  disabled={page >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / edit dialog */}
      <EmploymentFormDialog
        open={openDialog}
        title={
          editingEmployment
            ? 'Edit Employment Record'
            : `Add Employment Record${globalSelectedEmployee ? ` for ${globalSelectedEmployee.full_name}` : ''}`
        }
        isEditing={!!editingEmployment}
        formData={formData}
        employees={employees}
        companies={companies}
        employeeLocked={!editingEmployment && !!globalSelectedEmployee}
        error={error}
        onChange={handleFormChange}
        onClose={handleCloseDialog}
        onSubmit={handleSubmit}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!employmentToDelete}
        onOpenChange={(open) => !open && setEmploymentToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employment record?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this employment record
              {employmentToDelete
                ? ` (${employmentToDelete.position}, ${employmentToDelete.company_id})`
                : ''}
              ? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => employmentToDelete && handleDelete(employmentToDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmploymentPage;
