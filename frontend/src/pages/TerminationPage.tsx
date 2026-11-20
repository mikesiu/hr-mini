import React, { useState, useEffect, useCallback } from 'react';
import { Eye, Pencil, Plus, RefreshCw, Search, Trash2, UserMinus, X } from 'lucide-react';
import { terminationAPI, employeeAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import AppToast from '../components/AppToast';
import TerminationFormDialog from '../components/termination/TerminationFormDialog';
import TerminationViewDialog from '../components/termination/TerminationViewDialog';
import {
  ROE_REASON_CODES, getRoeBadgeClass, getRoeLabel,
} from '../components/termination/terminationTypes';
import type { Employee, Termination } from '../components/termination/terminationTypes';
import { getInitials } from '../components/employee/employeeTypes';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const ALL_ROE = '__all__';
const headClass =
  'h-10 bg-muted/40 px-3 text-xs font-medium tracking-wider whitespace-nowrap text-muted-foreground uppercase';


const TerminationPage: React.FC = () => {
  const [terminations, setTerminations] = useState<Termination[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTermination, setEditingTermination] = useState<Termination | null>(null);
  const [viewingTermination, setViewingTermination] = useState<Termination | null>(null);
  const [terminationToDelete, setTerminationToDelete] = useState<Termination | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    employee_id: '',
    last_working_date: '',
    termination_effective_date: '',
    roe_reason_code: '',
    other_reason: '',
    internal_reason: '',
    remarks: '',
  });

  const { hasPermission } = useAuth();

  // Utility function to format date strings as local dates (avoiding timezone issues)
  const formatLocalDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    // Extract the date part (YYYY-MM-DD) from the string
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    // Create a date object using local timezone
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString();
  };

  const loadTerminations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await terminationAPI.list();
      if (response.data && response.data.success) {
        setTerminations(response.data.data);
      } else {
        setTerminations([]);
      }
    } catch (err: any) {
      console.error('Error loading terminations:', err);
      setError(err.response?.data?.detail || 'Failed to load terminations');
      setTerminations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      const response = await employeeAPI.list();
      if (response.data && response.data.success) {
        // Filter out already terminated employees for new termination
        const activeEmployees = response.data.data.filter(
          (emp: Employee) => emp.status !== 'Terminated'
        );
        setEmployees(activeEmployees);
      }
    } catch (err: any) {
      console.error('Error loading employees:', err);
    }
  }, []);

  useEffect(() => {
    loadTerminations();
    loadEmployees();
  }, [loadTerminations, loadEmployees]);

  const handleSearch = () => {
    loadTerminations();
  };

  const filteredTerminations = terminations.filter((term) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      term.employee?.full_name?.toLowerCase().includes(search) ||
      term.employee_id?.toLowerCase().includes(search) ||
      term.roe_reason_code?.toLowerCase().includes(search) ||
      ROE_REASON_CODES[term.roe_reason_code as keyof typeof ROE_REASON_CODES]?.toLowerCase().includes(search)
    );
  });

  const handleCreateClick = () => {
    setFormData({
      employee_id: '',
      last_working_date: '',
      termination_effective_date: '',
      roe_reason_code: '',
      other_reason: '',
      internal_reason: '',
      remarks: '',
    });
    setCreateDialogOpen(true);
    setError('');
    loadEmployees();
  };

  const handleEditClick = (termination: Termination) => {
    setEditingTermination(termination);
    setFormData({
      employee_id: termination.employee_id,
      last_working_date: termination.last_working_date.split('T')[0],
      termination_effective_date: termination.termination_effective_date.split('T')[0],
      roe_reason_code: termination.roe_reason_code,
      other_reason: termination.other_reason || '',
      internal_reason: termination.internal_reason || '',
      remarks: termination.remarks || '',
    });
    setEditDialogOpen(true);
    setError('');
  };

  const handleViewClick = (termination: Termination) => {
    setViewingTermination(termination);
    setViewDialogOpen(true);
  };

  const handleDeleteClick = (termination: Termination) => {
    setTerminationToDelete(termination);
    setDeleteDialogOpen(true);
  };

  const handleCreateSubmit = async () => {
    try {
      setError('');
      if (!formData.employee_id || !formData.last_working_date || !formData.termination_effective_date || !formData.roe_reason_code) {
        setError('Please fill in all required fields');
        return;
      }
      if (formData.roe_reason_code === 'K' && !formData.other_reason.trim()) {
        setError('Other reason is required when ROE reason code is K');
        return;
      }

      await terminationAPI.create(formData);
      setCreateDialogOpen(false);
      setSuccess('Termination created successfully');
      loadTerminations();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create termination');
    }
  };

  const handleEditSubmit = async () => {
    if (!editingTermination) return;
    try {
      setError('');
      if (!formData.last_working_date || !formData.termination_effective_date || !formData.roe_reason_code) {
        setError('Please fill in all required fields');
        return;
      }
      if (formData.roe_reason_code === 'K' && !formData.other_reason.trim()) {
        setError('Other reason is required when ROE reason code is K');
        return;
      }

      await terminationAPI.update(editingTermination.id, formData);
      setEditDialogOpen(false);
      setEditingTermination(null);
      setSuccess('Termination updated successfully');
      loadTerminations();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update termination');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!terminationToDelete) return;
    try {
      await terminationAPI.delete(terminationToDelete.id);
      setDeleteDialogOpen(false);
      setTerminationToDelete(null);
      setSuccess('Termination deleted successfully and employee status restored');
      loadTerminations();
      loadEmployees();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete termination');
    }
  };

  const handleClose = () => {
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    setViewDialogOpen(false);
    setDeleteDialogOpen(false);
    setEditingTermination(null);
    setViewingTermination(null);
    setTerminationToDelete(null);
    setError('');
  };

  const closeError = useCallback(() => setError(''), []);
  const closeSuccess = useCallback(() => setSuccess(''), []);
  const [roeFilter, setRoeFilter] = useState('');

  const roeOptions = Object.keys(ROE_REASON_CODES).filter((code) =>
    terminations.some((t) => t.roe_reason_code === code)
  );
  const visibleTerminations = filteredTerminations.filter(
    (term) => !roeFilter || term.roe_reason_code === roeFilter
  );
  const hasFilters = !!searchTerm || !!roeFilter;
  const clearFilters = () => {
    setSearchTerm('');
    setRoeFilter('');
  };

  if (!hasPermission('termination:view')) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>You do not have permission to view terminations.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const renderBody = () => {
    if (loading) {
      return (
        <div className="space-y-2 p-4">
          <Skeleton className="h-9 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    }
    if (visibleTerminations.length === 0) {
      return (
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
          <UserMinus className="size-8 text-muted-foreground" />
          <p className="m-0 text-sm font-medium text-foreground">No terminations found</p>
          <p className="m-0 text-sm text-muted-foreground">
            {hasFilters
              ? 'No records match your search or ROE reason filter.'
              : 'Terminations you record will appear here.'}
          </p>
          {hasFilters ? (
            <Button variant="outline" className="mt-2" onClick={clearFilters}>
              <X className="size-4" /> Clear filters
            </Button>
          ) : (
            hasPermission('termination:create') && (
              <Button className="mt-2" onClick={handleCreateClick}>
                <Plus className="size-4" /> Create Termination
              </Button>
            )
          )}
        </div>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={headClass}>Employee</TableHead>
            <TableHead className={headClass}>Employee ID</TableHead>
            <TableHead className={headClass}>Last Working Date</TableHead>
            <TableHead className={headClass}>Termination Effective Date</TableHead>
            <TableHead className={headClass}>ROE Reason</TableHead>
            <TableHead className={headClass}>Created Date</TableHead>
            <TableHead className={cn(headClass, 'text-right')}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleTerminations.map((termination) => {
            const emp = termination.employee;
            return (
              <TableRow key={termination.id}>
                <TableCell className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                        {emp ? getInitials(emp.first_name, emp.last_name) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium whitespace-nowrap text-foreground">
                      {emp?.full_name || 'N/A'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-3 py-2.5">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    {termination.employee_id}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2.5 text-sm whitespace-nowrap tabular-nums">
                  {formatLocalDate(termination.last_working_date)}
                </TableCell>
                <TableCell className="px-3 py-2.5 text-sm font-medium whitespace-nowrap text-foreground tabular-nums">
                  {formatLocalDate(termination.termination_effective_date)}
                </TableCell>
                <TableCell className="px-3 py-2.5">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Badge
                      variant="secondary"
                      className={cn('font-mono', getRoeBadgeClass(termination.roe_reason_code))}
                    >
                      {termination.roe_reason_code}
                    </Badge>
                    <span className="text-sm text-foreground">
                      {getRoeLabel(termination.roe_reason_code)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-3 py-2.5 text-sm whitespace-nowrap text-muted-foreground tabular-nums">
                  {new Date(termination.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="View"
                          onClick={() => handleViewClick(termination)}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View</TooltipContent>
                    </Tooltip>
                    {hasPermission('termination:update') && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="Edit"
                            onClick={() => handleEditClick(termination)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                    )}
                    {hasPermission('termination:delete') && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            aria-label="Delete"
                            onClick={() => handleDeleteClick(termination)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">
            Termination Management
          </h1>
          <p className="m-0 mt-1 text-sm text-muted-foreground">
            Record employee offboarding, effective dates, and ROE reason codes
          </p>
        </div>
        {hasPermission('termination:create') && (
          <Button className="rounded-md" onClick={handleCreateClick}>
            <Plus className="size-4" /> Create Termination
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-solid border-border bg-card p-3">
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by employee name or ID..."
              className="px-8"
              aria-label="Search terminations"
            />
            {searchTerm && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchTerm('')}
                className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Select
            value={roeFilter || ALL_ROE}
            onValueChange={(v) => setRoeFilter(v === ALL_ROE ? '' : v)}
          >
            <SelectTrigger className="w-full sm:w-[240px]" aria-label="ROE Reason filter">
              <SelectValue placeholder="All ROE Reasons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ROE}>All ROE Reasons</SelectItem>
              {roeOptions.map((code) => (
                <SelectItem key={code} value={code}>
                  {code} - {getRoeLabel(code)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="tabular-nums">
            {visibleTerminations.length} {visibleTerminations.length === 1 ? 'record' : 'records'}
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Refresh"
                onClick={handleSearch}
                disabled={loading}
              >
                <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-solid border-border bg-card">
        {renderBody()}
      </div>

      <TerminationFormDialog
        mode="create"
        open={createDialogOpen}
        formData={formData}
        employees={employees}
        canPickEmployee={hasPermission('termination:create')}
        onChange={(patch) => setFormData((f) => ({ ...f, ...patch }))}
        onClose={handleClose}
        onSubmit={handleCreateSubmit}
      />

      <TerminationFormDialog
        mode="edit"
        open={editDialogOpen}
        formData={formData}
        employees={employees}
        canPickEmployee={false}
        onChange={(patch) => setFormData((f) => ({ ...f, ...patch }))}
        onClose={handleClose}
        onSubmit={handleEditSubmit}
      />

      <TerminationViewDialog
        termination={viewDialogOpen ? viewingTermination : null}
        formatLocalDate={formatLocalDate}
        onClose={handleClose}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={(o) => !o && handleClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Termination</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the termination record for{' '}
              <strong className="text-foreground">
                {terminationToDelete?.employee?.full_name || terminationToDelete?.employee_id}
              </strong>
              ? This will restore the employee's status to Active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AppToast message={error || null} variant="error" onClose={closeError} />
      <AppToast message={success || null} variant="success" onClose={closeSuccess} autoHideMs={3000} />
    </div>
  );
};

export default TerminationPage;
