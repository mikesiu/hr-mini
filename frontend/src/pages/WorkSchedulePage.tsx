import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  CalendarClock,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SearchX,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { workScheduleAPI, employeeAPI } from '../api/client';
import { useCompanyFilter } from '../contexts/CompanyFilterContext';
import AppToast from '../components/AppToast';
import ScheduleFormDialog from '../components/workschedule/ScheduleFormDialog';
import ScheduleAssignDialog from '../components/workschedule/ScheduleAssignDialog';
import {
  EditAssignmentDialog,
  ScheduleAssignmentsDialog,
} from '../components/workschedule/ScheduleAssignmentsDialog';
import {
  DAYS,
  DAY_SHORT,
  formatTime,
  getWeeklySummary,
  type EmployeeAssignment,
  type EmployeeOption,
  type WorkSchedule,
} from '../components/workschedule/scheduleTypes';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

const WorkSchedulePage: React.FC = () => {
  const { selectedCompanyId, setSelectedCompanyId, companies } = useCompanyFilter();
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
  const [formData, setFormData] = useState<Partial<WorkSchedule>>({
    company_id: selectedCompanyId || '',
    name: '',
    is_active: true,
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Employee schedule assignment state
  
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningSchedule, setAssigningSchedule] = useState<WorkSchedule | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);
  const [assignmentFormData, setAssignmentFormData] = useState({
    effective_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });
  
  // View assignments state
  
  const [assignmentsDialogOpen, setAssignmentsDialogOpen] = useState(false);
  const [assignmentFilter, setAssignmentFilter] = useState<'active' | 'all'>('active');
  const [viewingSchedule, setViewingSchedule] = useState<WorkSchedule | null>(null);
  const [scheduleAssignments, setScheduleAssignments] = useState<EmployeeAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<EmployeeAssignment | null>(null);
  const [editAssignmentFormData, setEditAssignmentFormData] = useState({
    effective_date: '',
    end_date: '',
  });

  const loadSchedules = React.useCallback(async () => {
    // Only load schedules if a company is selected
    if (!selectedCompanyId) {
      setSchedules([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await workScheduleAPI.list({ company_id: selectedCompanyId });
      setSchedules(response.data.data || []);
    } catch (error: any) {
      setSnackbar({ open: true, message: `Error loading schedules: ${error.response?.data?.detail || error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // Fetch employees for assignment
  const loadEmployees = useCallback(async () => {
    if (!selectedCompanyId) {
      setEmployees([]);
      return;
    }
    try {
      const response = await employeeAPI.list({ company_id: selectedCompanyId });
      if (response.data && response.data.success) {
        setEmployees(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleOpenDialog = (schedule?: WorkSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData(schedule);
    } else {
      setEditingSchedule(null);
      setFormData({ company_id: selectedCompanyId || '', name: '', is_active: true });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSchedule(null);
    setFormData({ company_id: selectedCompanyId || '', name: '', is_active: true });
  };

  const handleSave = async () => {
    try {
      if (editingSchedule) {
        await workScheduleAPI.update(editingSchedule.id, formData);
        setSnackbar({ open: true, message: 'Schedule updated successfully', severity: 'success' });
      } else {
        await workScheduleAPI.create(formData);
        setSnackbar({ open: true, message: 'Schedule created successfully', severity: 'success' });
      }
      handleCloseDialog();
      loadSchedules();
    } catch (error: any) {
      setSnackbar({ open: true, message: `Error saving schedule: ${error.response?.data?.detail || error.message}`, severity: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await workScheduleAPI.delete(id);
      setSnackbar({ open: true, message: 'Schedule deleted successfully', severity: 'success' });
      loadSchedules();
    } catch (error: any) {
      setSnackbar({ open: true, message: `Error deleting schedule: ${error.response?.data?.detail || error.message}`, severity: 'error' });
    }
  };

  const handleOpenAssignDialog = (schedule: WorkSchedule) => {
    setAssigningSchedule(schedule);
    setSelectedEmployee(null);
    setAssignmentFormData({
      effective_date: new Date().toISOString().split('T')[0],
      end_date: '',
    });
    setAssignDialogOpen(true);
  };

  const handleCloseAssignDialog = () => {
    setAssignDialogOpen(false);
    setAssigningSchedule(null);
    setSelectedEmployee(null);
    setAssignmentFormData({
      effective_date: new Date().toISOString().split('T')[0],
      end_date: '',
    });
  };

  const handleAssignSchedule = async () => {
    if (!assigningSchedule || !selectedEmployee) {
      setSnackbar({ open: true, message: 'Please select an employee', severity: 'error' });
      return;
    }

    try {
      const payload: any = {
        employee_id: selectedEmployee.id,
        effective_date: assignmentFormData.effective_date,
      };
      
      // Only include end_date if it's not empty
      if (assignmentFormData.end_date && assignmentFormData.end_date.trim() !== '') {
        payload.end_date = assignmentFormData.end_date;
      }
      
      await workScheduleAPI.assign(assigningSchedule.id, payload);
      setSnackbar({ open: true, message: `Schedule assigned to ${selectedEmployee.full_name} successfully`, severity: 'success' });
      handleCloseAssignDialog();
    } catch (error: any) {
      setSnackbar({ open: true, message: `Error assigning schedule: ${error.response?.data?.detail || error.message}`, severity: 'error' });
    }
  };

  const handleOpenAssignmentsDialog = async (schedule: WorkSchedule) => {
    setViewingSchedule(schedule);
    setAssignmentsDialogOpen(true);
    setAssignmentsLoading(true);
    
    try {
      const response = await workScheduleAPI.getAssignments(schedule.id);
      setScheduleAssignments(response.data.data || []);
    } catch (error: any) {
      setSnackbar({ open: true, message: `Error loading assignments: ${error.response?.data?.detail || error.message}`, severity: 'error' });
      setScheduleAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const handleCloseAssignmentsDialog = () => {
    setAssignmentsDialogOpen(false);
    setViewingSchedule(null);
    setScheduleAssignments([]);
    setEditingAssignment(null);
    setEditAssignmentFormData({ effective_date: '', end_date: '' });
  };

  const handleOpenEditAssignment = (assignment: EmployeeAssignment) => {
    setEditingAssignment(assignment);
    // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
    // Backend sends dates as ISO strings (YYYY-MM-DD), so extract that part directly
    const formatDateForInput = (dateStr: string | undefined) => {
      if (!dateStr) return '';
      // Extract YYYY-MM-DD from the string (handles both "2024-12-31" and "2024-12-31T00:00:00" formats)
      const match = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) {
        return match[1]; // Return just the date part
      }
      // If no match, try parsing as Date but use local date components to avoid timezone shift
      try {
        const date = new Date(dateStr);
        // Use local date methods, not UTC, since we want the date as the user sees it
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch {
        return dateStr;
      }
    };
    
    setEditAssignmentFormData({
      effective_date: formatDateForInput(assignment.effective_date),
      end_date: formatDateForInput(assignment.end_date),
    });
  };

  const handleCloseEditAssignment = () => {
    setEditingAssignment(null);
    setEditAssignmentFormData({ effective_date: '', end_date: '' });
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignment) return;

    try {
      const payload: any = {};
      if (editAssignmentFormData.effective_date) {
        payload.effective_date = editAssignmentFormData.effective_date;
      }
      if (editAssignmentFormData.end_date && editAssignmentFormData.end_date.trim() !== '') {
        payload.end_date = editAssignmentFormData.end_date;
      } else {
        payload.end_date = null; // Clear end date to make it ongoing
      }

      await workScheduleAPI.updateAssignment(editingAssignment.id, payload);
      setSnackbar({ open: true, message: `Assignment updated successfully`, severity: 'success' });
      
      // Reload assignments
      if (viewingSchedule) {
        const response = await workScheduleAPI.getAssignments(viewingSchedule.id);
        setScheduleAssignments(response.data.data || []);
      }
      
      handleCloseEditAssignment();
    } catch (error: any) {
      setSnackbar({ open: true, message: `Error updating assignment: ${error.response?.data?.detail || error.message}`, severity: 'error' });
    }
  };

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [scheduleToDelete, setScheduleToDelete] = useState<WorkSchedule | null>(null);
  const [deleting, setDeleting] = useState(false);

  const closeToast = useCallback(() => setSnackbar((s) => ({ ...s, open: false })), []);

  const filteredSchedules = schedules.filter((s) => {
    if (statusFilter === 'active' && !s.is_active) return false;
    if (statusFilter === 'inactive' && s.is_active) return false;
    const q = search.trim().toLowerCase();
    return !q || s.name.toLowerCase().includes(q);
  });

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
  };

  const confirmDelete = async () => {
    if (!scheduleToDelete) return;
    setDeleting(true);
    await handleDelete(scheduleToDelete.id);
    setDeleting(false);
    setScheduleToDelete(null);
  };

  const iconAction = (label: string, icon: React.ReactNode, onClick: () => void) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={label} onClick={onClick}>
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  const headClass =
    'h-10 bg-muted/40 px-3 text-xs font-medium tracking-wider text-muted-foreground uppercase';

  const renderBody = () => {
    if (!selectedCompanyId) {
      return (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <Building2 className="size-10 text-muted-foreground/60" aria-hidden="true" />
          <p className="m-0 text-sm font-medium text-foreground">Select a company</p>
          <p className="m-0 text-sm text-muted-foreground">
            Choose a company above to view and manage schedules.
          </p>
        </div>
      );
    }
    if (loading) {
      return (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    }
    if (schedules.length === 0) {
      return (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <CalendarClock className="size-10 text-muted-foreground/60" aria-hidden="true" />
          <p className="m-0 text-sm font-medium text-foreground">No schedules yet</p>
          <p className="m-0 text-sm text-muted-foreground">
            Create a weekly shift template for this company.
          </p>
          <Button size="sm" className="mt-2" onClick={() => handleOpenDialog()}>
            <Plus />
            Create Schedule
          </Button>
        </div>
      );
    }
    if (filteredSchedules.length === 0) {
      return (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <SearchX className="size-10 text-muted-foreground/60" aria-hidden="true" />
          <p className="m-0 text-sm font-medium text-foreground">No schedules match your filters</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={resetFilters}>
            Reset filters
          </Button>
        </div>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={headClass}>Schedule Name</TableHead>
            {DAY_SHORT.map((d) => (
              <TableHead key={d} className={cn(headClass, 'text-center')}>
                {d}
              </TableHead>
            ))}
            <TableHead className={headClass}>Status</TableHead>
            <TableHead className={cn(headClass, 'text-right')}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSchedules.map((schedule) => {
            const summary = getWeeklySummary(schedule);
            return (
              <TableRow key={schedule.id}>
                <TableCell className="px-3 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{schedule.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {summary.days === 0
                        ? 'No shifts'
                        : `${summary.days} day${summary.days === 1 ? '' : 's'} \u2022 ${summary.hours}h/wk`}
                    </span>
                  </div>
                </TableCell>
                {DAYS.map((day, idx) => {
                  const start = schedule[`${day}_start`];
                  const end = schedule[`${day}_end`];
                  return (
                    <TableCell key={day} className="px-2 text-center" data-day={DAY_SHORT[idx]}>
                      {start || end ? (
                        <span className="inline-block rounded-md bg-secondary/70 px-2 py-1 text-xs font-medium whitespace-nowrap text-secondary-foreground tabular-nums">
                          {formatTime(start)} - {formatTime(end)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50" aria-label="Day off">
                          {'\u2014'}
                        </span>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="px-3">
                  <Badge
                    variant="secondary"
                    className={cn(
                      'rounded-md px-1.5 text-[11px] font-medium',
                      schedule.is_active
                        ? 'bg-event-union/15 text-event-union'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {schedule.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="px-3">
                  <div className="flex items-center justify-end gap-0.5">
                    {iconAction('View assignments', <Eye />, () => handleOpenAssignmentsDialog(schedule))}
                    {iconAction('Assign employees', <UserPlus />, () => handleOpenAssignDialog(schedule))}
                    {iconAction('Edit', <Pencil />, () => handleOpenDialog(schedule))}
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label={`More actions for ${schedule.name}`}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          variant="destructive"
                          className="text-destructive focus:text-destructive"
                          onSelect={() => setScheduleToDelete(schedule)}
                        >
                          <Trash2 className="text-destructive" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">
            Work Schedules
          </h1>
          <p className="m-0 mt-1 text-sm text-muted-foreground">
            Configure weekly shift templates and assign schedules to employees
          </p>
        </div>
        <Button
          className="shrink-0"
          onClick={() => handleOpenDialog()}
          disabled={!selectedCompanyId}
        >
          <Plus />
          Create Schedule
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-solid border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedCompanyId ?? ''}
            onValueChange={(value) => setSelectedCompanyId(value)}
          >
            <SelectTrigger className="w-full sm:w-[280px]" aria-label="Select company">
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  <Badge variant="outline" className="rounded-md px-1.5 text-[11px]">
                    {company.id}
                  </Badge>
                  {company.legal_name || company.trade_name || company.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search schedules..."
              aria-label="Search schedules"
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}
          >
            <SelectTrigger className="w-32" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Weekly schedule table */}
      <div className="overflow-hidden rounded-lg border border-solid border-border bg-card text-card-foreground">
        {renderBody()}
      </div>

      <ScheduleFormDialog
        open={dialogOpen}
        isEditing={!!editingSchedule}
        formData={formData}
        onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
        onClose={handleCloseDialog}
        onSave={handleSave}
      />

      <ScheduleAssignmentsDialog
        open={assignmentsDialogOpen}
        schedule={viewingSchedule}
        assignments={scheduleAssignments}
        loading={assignmentsLoading}
        filter={assignmentFilter}
        onFilterChange={setAssignmentFilter}
        onEdit={handleOpenEditAssignment}
        onClose={handleCloseAssignmentsDialog}
      />

      <EditAssignmentDialog
        assignment={editingAssignment}
        formData={editAssignmentFormData}
        onChange={(patch) => setEditAssignmentFormData((prev) => ({ ...prev, ...patch }))}
        onClose={handleCloseEditAssignment}
        onSave={handleUpdateAssignment}
      />

      <ScheduleAssignDialog
        open={assignDialogOpen}
        schedule={assigningSchedule}
        employees={employees}
        companySelected={!!selectedCompanyId}
        selectedEmployee={selectedEmployee}
        formData={assignmentFormData}
        onSelectEmployee={setSelectedEmployee}
        onFormChange={(patch) => setAssignmentFormData((prev) => ({ ...prev, ...patch }))}
        onClose={handleCloseAssignDialog}
        onSubmit={handleAssignSchedule}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!scheduleToDelete}
        onOpenChange={(open) => !open && !deleting && setScheduleToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this schedule?
              {scheduleToDelete ? ` "${scheduleToDelete.name}" will be removed.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {deleting && <Loader2 className="animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AppToast
        message={snackbar.open ? snackbar.message : null}
        variant={snackbar.severity}
        onClose={closeToast}
      />
    </div>
  );
};

export default WorkSchedulePage;
