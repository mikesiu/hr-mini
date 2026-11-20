import React from 'react';
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
import EmployeePicker from './EmployeePicker';
import { ROE_REASON_CODES } from './terminationTypes';
import type { Employee, TerminationFormData } from './terminationTypes';

interface TerminationFormDialogProps {
  mode: 'create' | 'edit';
  open: boolean;
  formData: TerminationFormData;
  employees: Employee[];
  canPickEmployee: boolean;
  onChange: (patch: Partial<TerminationFormData>) => void;
  onClose: () => void;
  onSubmit: () => void;
}

const TerminationFormDialog: React.FC<TerminationFormDialogProps> = ({
  mode, open, formData, employees, canPickEmployee, onChange, onClose, onSubmit,
}) => {
  const isCreate = mode === 'create';
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isCreate ? 'Create Termination' : 'Edit Termination'}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? 'Record an employee offboarding. The employee will be marked as Terminated.'
              : 'Update dates, ROE reason and notes for this termination.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {isCreate ? (
            <div className="grid gap-1.5">
              <Label>Employee *</Label>
              <EmployeePicker
                employees={employees}
                value={formData.employee_id}
                disabled={!canPickEmployee}
                onChange={(id) => onChange({ employee_id: id })}
              />
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="term-emp-id">Employee ID</Label>
              <Input id="term-emp-id" value={formData.employee_id} disabled />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="term-lwd">Last Working Date *</Label>
              <Input
                id="term-lwd"
                type="date"
                value={formData.last_working_date}
                onChange={(e) => onChange({ last_working_date: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="term-eff">Termination Effective Date *</Label>
              <Input
                id="term-eff"
                type="date"
                value={formData.termination_effective_date}
                onChange={(e) => onChange({ termination_effective_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>ROE Reason Code *</Label>
            <Select
              value={formData.roe_reason_code}
              onValueChange={(v) => onChange({ roe_reason_code: v })}
            >
              <SelectTrigger className="w-full" aria-label="ROE Reason Code">
                <SelectValue placeholder="Select ROE reason" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROE_REASON_CODES).map(([code, description]) => (
                  <SelectItem key={code} value={code}>
                    {code} - {description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.roe_reason_code === 'K' && (
            <div className="grid gap-1.5">
              <Label htmlFor="term-other">Other Reason *</Label>
              <Textarea
                id="term-other"
                rows={3}
                value={formData.other_reason}
                onChange={(e) => onChange({ other_reason: e.target.value })}
              />
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="term-internal">Internal Reason</Label>
            <Textarea
              id="term-internal"
              rows={3}
              value={formData.internal_reason}
              onChange={(e) => onChange({ internal_reason: e.target.value })}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="term-remarks">Remarks</Label>
            <Textarea
              id="term-remarks"
              rows={3}
              value={formData.remarks}
              onChange={(e) => onChange({ remarks: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit}>{isCreate ? 'Create' : 'Update'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TerminationFormDialog;
