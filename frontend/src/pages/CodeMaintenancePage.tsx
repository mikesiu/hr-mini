import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import { codeAPI, CodeCategory, CodeValue } from '../api/client';
import AppToast from '../components/AppToast';
import {
  EmptyState, PageHeader, SearchInput, TableCard, TableSkeleton, Toolbar, adminCellClass,
  adminHeadClass,
} from '../components/admin/AdminParts';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const CATEGORIES: { key: CodeCategory; label: string; usedIn: string }[] = [
  { key: 'employee_type', label: 'Employee Type', usedIn: 'Employment Management' },
  { key: 'wage_classification', label: 'Wage Classification', usedIn: 'Salary Management' },
  { key: 'department', label: 'Department', usedIn: 'Employment Management' },
  { key: 'position', label: 'Position', usedIn: 'Employment Management' },
];

const emptyForm = { code: '', description: '', sort_order: 0, is_active: true };

const CodeMaintenancePage: React.FC = () => {
  const [category, setCategory] = useState<CodeCategory>('employee_type');
  const [rows, setRows] = useState<CodeValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CodeValue | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [rowToDelete, setRowToDelete] = useState<CodeValue | null>(null);

  const current = CATEGORIES.find((c) => c.key === category)!;
  const closeError = useCallback(() => setError(null), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await codeAPI.list({ category });
      setRows(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load code values');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.code.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const openDialog = (row?: CodeValue) => {
    setEditing(row || null);
    setForm(
      row
        ? { code: row.code, description: row.description || '', sort_order: row.sort_order, is_active: row.is_active }
        : { ...emptyForm, sort_order: (rows.reduce((m, r) => Math.max(m, r.sort_order), 0) || 0) + 10 }
    );
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        code: form.code.trim(),
        description: form.description.trim() || null,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      };
      if (editing) {
        await codeAPI.update(editing.id, payload);
      } else {
        await codeAPI.create({ category, ...payload });
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save code value');
    }
  };

  const handleToggleActive = async (row: CodeValue) => {
    try {
      await codeAPI.update(row.id, { is_active: !row.is_active });
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update code value');
    }
  };

  const handleDelete = async () => {
    const row = rowToDelete;
    if (!row) return;
    setRowToDelete(null);
    try {
      await codeAPI.delete(row.id);
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete code value');
    }
  };

  const renderBody = () => {
    if (loading) return <TableSkeleton />;
    if (visibleRows.length === 0) {
      return (
        <EmptyState
          icon={ListChecks}
          title={search.trim() ? 'No matching values' : 'No values yet'}
          description={
            search.trim()
              ? `No ${current.label} values match "${search.trim()}".`
              : `Add the first ${current.label} value to make it available in dropdowns.`
          }
          actionLabel={search.trim() ? 'Clear search' : `Add ${current.label}`}
          actionIcon={search.trim() ? undefined : Plus}
          onAction={search.trim() ? () => setSearch('') : () => openDialog()}
        />
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={adminHeadClass}>Value</TableHead>
            <TableHead className={adminHeadClass}>Description</TableHead>
            <TableHead className={cn(adminHeadClass, 'w-28')}>Sort Order</TableHead>
            <TableHead className={cn(adminHeadClass, 'w-28')}>Status</TableHead>
            <TableHead className={cn(adminHeadClass, 'w-40 text-right')}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((row) => (
            <TableRow key={row.id} className={cn(!row.is_active && 'opacity-60')}>
              <TableCell className={cn(adminCellClass, 'text-sm font-medium text-foreground')}>
                {row.code}
              </TableCell>
              <TableCell className={cn(adminCellClass, 'text-sm text-muted-foreground')}>
                {row.description || '—'}
              </TableCell>
              <TableCell className={cn(adminCellClass, 'text-sm tabular-nums')}>{row.sort_order}</TableCell>
              <TableCell className={adminCellClass}>
                <Badge
                  variant="secondary"
                  className={cn(
                    row.is_active && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                  )}
                >
                  {row.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className={adminCellClass}>
                <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="mr-1 inline-flex">
                        <Switch
                          size="sm"
                          checked={row.is_active}
                          onCheckedChange={() => handleToggleActive(row)}
                          aria-label={row.is_active ? 'Deactivate' : 'Activate'}
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{row.is_active ? 'Deactivate' : 'Activate'}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Edit"
                        onClick={() => openDialog(row)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        aria-label="Delete"
                        onClick={() => setRowToDelete(row)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </div>
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
        title="Code Maintenance"
        subtitle="Manage the lookup values used in dropdowns across the app"
        actions={
          <Button className="rounded-md" onClick={() => openDialog()}>
            <Plus className="size-4" /> Add {current.label}
          </Button>
        }
      />

      <Toolbar>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-3 sm:w-auto">
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v as CodeCategory);
              setSearch('');
            }}
          >
            <SelectTrigger className="w-full sm:w-[220px]" aria-label="Code category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={`Search ${current.label.toLowerCase()} values...`}
            ariaLabel="Search code values"
          />
          <p className="m-0 text-xs text-muted-foreground">
            Active values appear in the {current.label} dropdown in {current.usedIn}, in sort order.
          </p>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {visibleRows.length} {visibleRows.length === 1 ? 'value' : 'values'}
        </Badge>
      </Toolbar>

      <TableCard>{renderBody()}</TableCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit' : 'Add'} {current.label}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update this lookup value.'
                : `Create a new ${current.label} value for use in dropdowns.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="code-value">Value *</Label>
              <Input
                id="code-value"
                autoFocus
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
              {editing && (
                <p className="m-0 text-xs text-muted-foreground">
                  Renaming does not change records that already use the old value.
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="code-description">Description</Label>
              <Input
                id="code-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="code-sort">Sort Order</Label>
              <Input
                id="code-sort"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="code-active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label htmlFor="code-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!form.code.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!rowToDelete} onOpenChange={(o) => !o && setRowToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{rowToDelete?.code}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Records that already use it keep their value. To hide it from dropdowns without
              deleting, switch it to inactive instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AppToast message={error} variant="error" onClose={closeError} />
    </div>
  );
};

export default CodeMaintenancePage;
