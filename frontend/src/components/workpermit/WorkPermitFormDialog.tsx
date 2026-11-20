import React from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import EmployeePicker from '../termination/EmployeePicker';
import PermitStatusBadge from './PermitStatusBadge';
import {
  PERMIT_TYPES, classifyDays, formatDateString, getDaysUntilExpiry,
} from './workPermitTypes';
import type { PermitFormData, PickerEmployee } from './workPermitTypes';

interface WorkPermitFormDialogProps {
  open: boolean;
  /** create = new permit (optionally closing the current one); edit = update an existing record. */
  mode: 'create' | 'edit';
  formData: PermitFormData;
  employees: PickerEmployee[];
  employeesLoading: boolean;
  /** When set the employee is fixed (renew from a row / edit) and shown read-only. */
  lockedEmployee: { id: string; name: string } | null;
  /** Current permit that will be closed when saving a new one. */
  closingPrevious: { permit_type: string; expiry_date: string } | null;
  /** Editing a permit that was already renewed (closed). */
  editingRenewed: boolean;
  saving: boolean;
  onChange: (patch: Partial<PermitFormData>) => void;
  onClose: () => void;
  onSubmit: () => void;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const WorkPermitFormDialog: React.FC<WorkPermitFormDialogProps> = ({
  open, mode, formData, employees, employeesLoading, lockedEmployee, closingPrevious,
  editingRenewed, saving, onChange, onClose, onSubmit,
}) => {
  const isEdit = mode === 'edit';
  const derivedStatus = DATE_RE.test(formData.expiry_date)
    ? classifyDays(getDaysUntilExpiry(formData.expiry_date))
    : null;
  const showRenewedDate = !!closingPrevious || editingRenewed;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Work Permit' : closingPrevious ? 'Renew Work Permit' : 'Add Work Permit'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the permit details for this employee.'
              : 'Record a new work permit. Choose the employee first.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Employee *</Label>
            {lockedEmployee ? (
              <div className="flex items-center gap-2 rounded-md border border-solid border-border bg-muted/40 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                  {lockedEmployee.name}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{lockedEmployee.id}</span>
              </div>
            ) : employeesLoading ? (
              <p className="m-0 rounded-md border border-solid border-border px-3 py-3 text-sm text-muted-foreground">
                Loading employees…
              </p>
            ) : (
              <EmployeePicker
                employees={employees}
                value={formData.employee_id}
                onChange={(id) => onChange({ employee_id: id })}
              />
            )}
          </div>

          {closingPrevious && (
            <div className="flex items-start gap-2 rounded-md border border-solid border-border bg-amber-500/10 p-3 text-sm text-foreground">
              <Info className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
              <p className="m-0">
                This employee already has a current permit ({closingPrevious.permit_type}, expires{' '}
                <span className="tabular-nums">{formatDateString(closingPrevious.expiry_date)}</span>).
                Saving will close it as renewed.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid min-w-0 gap-1.5">
              <Label>Permit Type *</Label>
              <Select value={formData.permit_type} onValueChange={(v) => onChange({ permit_type: v })}>
                <SelectTrigger className="w-full" aria-label="Permit type">
                  <SelectValue placeholder="Select permit type" />
                </SelectTrigger>
                <SelectContent>
                  {PERMIT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-0 gap-1.5">
              <Label htmlFor="wp-number">Permit / Document Number</Label>
              <Input
                id="wp-number"
                value={formData.permit_number}
                maxLength={100}
                onChange={(e) => onChange({ permit_number: e.target.value })}
                placeholder="e.g. WP-123456"
              />
            </div>
            <div className="grid min-w-0 gap-1.5">
              <Label htmlFor="wp-issue">Issue Date</Label>
              <Input
                id="wp-issue"
                type="date"
                value={formData.issue_date}
                onChange={(e) => onChange({ issue_date: e.target.value })}
              />
            </div>
            <div className="grid min-w-0 gap-1.5">
              <Label htmlFor="wp-expiry">Expiry Date *</Label>
              <Input
                id="wp-expiry"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => onChange({ expiry_date: e.target.value })}
              />
            </div>
            {showRenewedDate && (
              <div className="grid min-w-0 gap-1.5">
                <Label htmlFor="wp-renewed">
                  {editingRenewed ? 'Closed / Renewed On *' : 'Previous Permit Closed On *'}
                </Label>
                <Input
                  id="wp-renewed"
                  type="date"
                  value={formData.renewed_date}
                  onChange={(e) => onChange({ renewed_date: e.target.value })}
                />
              </div>
            )}
            <div className="grid min-w-0 gap-1.5">
              <Label>Status</Label>
              <div className="flex h-9 items-center gap-2">
                {derivedStatus ? (
                  <PermitStatusBadge status={derivedStatus} />
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
                <span className="text-xs text-muted-foreground">Set automatically from expiry date</span>
              </div>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="wp-notes">Notes</Label>
            <Textarea
              id="wp-notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Optional notes (conditions, employer restrictions, reminders…)"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : closingPrevious ? 'Renew Permit' : 'Add Work Permit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkPermitFormDialog;
