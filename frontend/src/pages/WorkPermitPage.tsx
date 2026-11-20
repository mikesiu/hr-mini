import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileBadge, Plus, RefreshCw, Search, X } from 'lucide-react';
import { apiClient, workPermitAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useCompanyFilter } from '../hooks/useCompanyFilter';
import AppToast from '../components/AppToast';
import PermitKpiStrip from '../components/workpermit/PermitKpiStrip';
import PermitRegistryTable from '../components/workpermit/PermitRegistryTable';
import WorkPermitDetailSheet from '../components/workpermit/WorkPermitDetailSheet';
import WorkPermitFormDialog from '../components/workpermit/WorkPermitFormDialog';
import { isRenewedPermit, todayString } from '../components/workpermit/workPermitTypes';
import type {
  CurrentPermit, PermitFormData, PermitStatus, PickerEmployee, WorkPermit,
} from '../components/workpermit/workPermitTypes';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const ALL_STATUS = '__all__';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const emptyForm = (): PermitFormData => {
  const oneYear = new Date();
  oneYear.setFullYear(oneYear.getFullYear() + 1);
  const expiry = `${oneYear.getFullYear()}-${String(oneYear.getMonth() + 1).padStart(2, '0')}-${String(oneYear.getDate()).padStart(2, '0')}`;
  return {
    employee_id: '',
    permit_type: '',
    permit_number: '',
    issue_date: '',
    expiry_date: expiry,
    renewed_date: todayString(),
    notes: '',
  };
};

const validYear = (d: string) => {
  const y = parseInt(d.slice(0, 4), 10);
  return y >= 1900 && y <= 2200;
};

const WorkPermitPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { selectedCompanyId, getCompanyName } = useCompanyFilter();
  const canManage = hasPermission('work_permit:manage');

  const [permits, setPermits] = useState<CurrentPermit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PermitStatus | null>(null);

  const [viewEmployeeId, setViewEmployeeId] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [formData, setFormData] = useState<PermitFormData>(emptyForm);
  const [lockedEmployee, setLockedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [editingPermit, setEditingPermit] = useState<WorkPermit | null>(null);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<PickerEmployee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  const [permitToDelete, setPermitToDelete] = useState<WorkPermit | null>(null);
  const [deleting, setDeleting] = useState(false);

  const closeError = useCallback(() => setError(''), []);
  const closeSuccess = useCallback(() => setSuccess(''), []);

  const loadPermits = useCallback(async () => {
    try {
      setLoading(true);
      const res = await workPermitAPI.listCurrent({
        company_id: selectedCompanyId || undefined,
      });
      setPermits(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load work permits');
      setPermits([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    loadPermits();
  }, [loadPermits]);

  const loadEmployees = useCallback(async () => {
    try {
      setEmployeesLoading(true);
      const res = await apiClient.get('/employees/list', {
        params: { company_id: selectedCompanyId || undefined },
      });
      const list: PickerEmployee[] = res.data?.data || [];
      setEmployees(list.filter((e) => e.status !== 'Terminated'));
    } catch (err: any) {
      setEmployees([]);
      setError(err.response?.data?.detail || 'Failed to load employees');
    } finally {
      setEmployeesLoading(false);
    }
  }, [selectedCompanyId]);

  const counts = useMemo(() => {
    const c: Record<PermitStatus, number> = { valid: 0, expiring_soon: 0, expired: 0 };
    permits.forEach((p) => {
      c[p.permit_status] += 1;
    });
    return c;
  }, [permits]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return permits
      .filter((p) => !statusFilter || p.permit_status === statusFilter)
      .filter(
        (p) =>
          !q ||
          p.full_name.toLowerCase().includes(q) ||
          p.employee_code.toLowerCase().includes(q) ||
          (p.permit_number || '').toLowerCase().includes(q)
      )
      .sort((a, b) => a.days_remaining - b.days_remaining);
  }, [permits, search, statusFilter]);

  const hasFilters = !!search.trim() || !!statusFilter;
  const clearFilters = () => {
    setSearch('');
    setStatusFilter(null);
  };

  const viewRow = useMemo(
    () => permits.find((p) => p.employee_id === viewEmployeeId) ?? null,
    [permits, viewEmployeeId]
  );

  // Close the detail sheet if the employee no longer has a current permit.
  useEffect(() => {
    if (viewEmployeeId && !loading && !viewRow) setViewEmployeeId(null);
  }, [viewEmployeeId, viewRow, loading]);

  const refreshAll = async () => {
    await loadPermits();
    setHistoryKey((k) => k + 1);
  };

  // ---- Add / renew / edit ----
  const openCreate = (locked: CurrentPermit | null = null) => {
    setEditingPermit(null);
    setLockedEmployee(locked ? { id: locked.employee_id, name: locked.full_name } : null);
    setFormData({
      ...emptyForm(),
      employee_id: locked?.employee_id ?? '',
      permit_type: locked?.permit_type ?? '',
    });
    setFormMode('create');
    if (!locked) loadEmployees();
  };

  const openEdit = (permit: WorkPermit, row: CurrentPermit) => {
    setEditingPermit(permit);
    setLockedEmployee({ id: row.employee_id, name: row.full_name });
    setFormData({
      employee_id: permit.employee_id,
      permit_type: permit.permit_type,
      permit_number: permit.permit_number || '',
      issue_date: permit.issue_date ? permit.issue_date.split('T')[0] : '',
      expiry_date: permit.expiry_date.split('T')[0],
      renewed_date: permit.renewed_date ? permit.renewed_date.split('T')[0] : todayString(),
      notes: permit.notes || '',
    });
    setFormMode('edit');
  };

  const closeForm = () => {
    if (saving) return;
    setFormMode(null);
    setEditingPermit(null);
    setLockedEmployee(null);
  };

  const currentForPicked = useMemo(
    () => (formMode === 'create' ? permits.find((p) => p.employee_id === formData.employee_id) : undefined),
    [formMode, permits, formData.employee_id]
  );
  const closingPrevious = currentForPicked
    ? { permit_type: currentForPicked.permit_type, expiry_date: currentForPicked.expiry_date }
    : null;
  const editingRenewed = formMode === 'edit' && !!editingPermit && isRenewedPermit(editingPermit);

  const handleSubmit = async () => {
    const f = formData;
    if (formMode === 'create' && !f.employee_id) return setError('Please select an employee');
    if (!f.permit_type) return setError('Please select a permit type');
    if (!f.expiry_date) return setError('Please enter an expiry date');
    if (!DATE_RE.test(f.expiry_date) || !validYear(f.expiry_date)) {
      return setError('Invalid expiry date. Use a valid date between the years 1900 and 2200.');
    }
    if (f.issue_date && (!DATE_RE.test(f.issue_date) || !validYear(f.issue_date))) {
      return setError('Invalid issue date. Use a valid date between the years 1900 and 2200.');
    }
    if (f.issue_date && f.issue_date > f.expiry_date) {
      return setError('Issue date must be on or before the expiry date');
    }
    if ((closingPrevious || editingRenewed) && !f.renewed_date) {
      return setError(
        editingRenewed
          ? 'Please enter the date this permit was closed / renewed'
          : 'Please enter the date the previous permit was closed'
      );
    }
    if ((closingPrevious || editingRenewed) && (!DATE_RE.test(f.renewed_date) || !validYear(f.renewed_date))) {
      return setError('Invalid closed date. Use a valid date between the years 1900 and 2200.');
    }

    try {
      setSaving(true);
      setError('');
      if (formMode === 'edit' && editingPermit) {
        const update: Record<string, any> = {
          permit_type: f.permit_type,
          expiry_date: f.expiry_date,
          permit_number: f.permit_number.trim(),
          notes: f.notes.trim(),
        };
        if (f.issue_date) update.issue_date = f.issue_date;
        if (editingRenewed) update.renewed_date = f.renewed_date;
        await workPermitAPI.update(editingPermit.id, update);
        setSuccess('Work permit updated successfully!');
      } else {
        const payload: Record<string, any> = {
          employee_id: f.employee_id,
          permit_type: f.permit_type,
          expiry_date: f.expiry_date,
        };
        if (f.permit_number.trim()) payload.permit_number = f.permit_number.trim();
        if (f.issue_date) payload.issue_date = f.issue_date;
        if (f.notes.trim()) payload.notes = f.notes.trim();
        if (closingPrevious) payload.renewed_date = f.renewed_date;
        await workPermitAPI.create(payload);
        setSuccess(
          closingPrevious
            ? 'Work permit renewed. The previous permit is closed.'
            : 'Work permit added successfully!'
        );
      }
      setFormMode(null);
      setEditingPermit(null);
      setLockedEmployee(null);
      await refreshAll();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((d: any) => d.msg).join('; ')
            : 'Failed to save work permit'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!permitToDelete) return;
    try {
      setDeleting(true);
      await workPermitAPI.delete(permitToDelete.id);
      setSuccess('Work permit deleted successfully!');
      setPermitToDelete(null);
      await refreshAll();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete work permit');
      setPermitToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  if (!canManage) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>You do not have permission to manage work permits.</AlertDescription>
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
    if (visible.length === 0) {
      return (
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
          <FileBadge className="size-8 text-muted-foreground" />
          <p className="m-0 text-sm font-medium text-foreground">No work permits found</p>
          <p className="m-0 text-sm text-muted-foreground">
            {hasFilters
              ? 'No current permits match your search or status filter.'
              : selectedCompanyId
                ? `No employees at ${getCompanyName()} have a work permit on file yet.`
                : 'Add a work permit to start tracking expiry dates and renewals.'}
          </p>
          {hasFilters ? (
            <Button variant="outline" className="mt-2" onClick={clearFilters}>
              <X className="size-4" /> Clear filters
            </Button>
          ) : (
            <Button className="mt-2 rounded-md" onClick={() => openCreate()}>
              <Plus className="size-4" /> Add Work Permit
            </Button>
          )}
        </div>
      );
    }
    return <PermitRegistryTable rows={visible} onView={(r) => setViewEmployeeId(r.employee_id)} />;
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">
            Work Permit Management
          </h1>
          <p className="m-0 mt-1 text-sm text-muted-foreground">
            Track active employee work permits, expiration timelines, and renewal history
          </p>
        </div>
        <Button className="rounded-md" onClick={() => openCreate()}>
          <Plus className="size-4" /> Add Work Permit
        </Button>
      </div>

      <PermitKpiStrip
        loading={loading}
        counts={counts}
        active={statusFilter}
        onSelect={setStatusFilter}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-solid border-border bg-card p-3">
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <div className="relative w-full sm:w-96">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee name, ID, or permit number..."
              className="px-8"
              aria-label="Search work permits"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch('')}
                className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Select
            value={statusFilter || ALL_STATUS}
            onValueChange={(v) => setStatusFilter(v === ALL_STATUS ? null : (v as PermitStatus))}
          >
            <SelectTrigger className="w-full sm:w-[180px]" aria-label="Status filter">
              <SelectValue placeholder="All Current" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUS}>All Current</SelectItem>
              <SelectItem value="valid">Valid</SelectItem>
              <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {selectedCompanyId && (
            <Badge variant="outline" className="max-w-[240px]">
              <span className="truncate">{getCompanyName()}</span>
            </Badge>
          )}
          <Badge variant="secondary" className="tabular-nums">
            {visible.length} {visible.length === 1 ? 'permit' : 'permits'}
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Refresh"
                onClick={loadPermits}
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

      <WorkPermitDetailSheet
        row={viewRow}
        refreshKey={historyKey}
        canManage={canManage}
        onClose={() => setViewEmployeeId(null)}
        onRenew={(row) => openCreate(row)}
        onEdit={openEdit}
        onDelete={setPermitToDelete}
      />

      <WorkPermitFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        formData={formData}
        employees={employees}
        employeesLoading={employeesLoading}
        lockedEmployee={lockedEmployee}
        closingPrevious={closingPrevious}
        editingRenewed={editingRenewed}
        saving={saving}
        onChange={(patch) => setFormData((f) => ({ ...f, ...patch }))}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={!!permitToDelete} onOpenChange={(o) => !o && !deleting && setPermitToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete work permit?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the {permitToDelete?.permit_type} record
              {permitToDelete ? ` expiring ${permitToDelete.expiry_date.split('T')[0]}` : ''}. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AppToast message={error || null} variant="error" onClose={closeError} />
      <AppToast message={success || null} variant="success" onClose={closeSuccess} autoHideMs={3000} />
    </div>
  );
};

export default WorkPermitPage;
