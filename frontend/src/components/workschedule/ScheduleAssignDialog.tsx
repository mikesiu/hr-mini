import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { EmployeeOption, WorkSchedule } from './scheduleTypes';

interface ScheduleAssignDialogProps {
  open: boolean;
  schedule: WorkSchedule | null;
  employees: EmployeeOption[];
  companySelected: boolean;
  selectedEmployee: EmployeeOption | null;
  formData: { effective_date: string; end_date: string };
  onSelectEmployee: (employee: EmployeeOption | null) => void;
  onFormChange: (patch: Partial<{ effective_date: string; end_date: string }>) => void;
  onClose: () => void;
  onSubmit: () => void;
}

const labelClass = 'text-xs font-medium text-muted-foreground';

const optionLabel = (o: EmployeeOption) => o.full_name || `${o.first_name} ${o.last_name}`;

const ScheduleAssignDialog: React.FC<ScheduleAssignDialogProps> = ({
  open,
  schedule,
  employees,
  companySelected,
  selectedEmployee,
  formData,
  onSelectEmployee,
  onFormChange,
  onClose,
  onSubmit,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => `${optionLabel(e)} ${e.id}`.toLowerCase().includes(q));
  }, [employees, query]);

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const disabled = !companySelected || employees.length === 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Schedule: {schedule?.name || ''}</DialogTitle>
          <DialogDescription>Choose an employee and when the schedule takes effect.</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-0.5 pr-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-employee-search" className={labelClass}>
              Select Employee<span className="text-destructive"> *</span>
            </Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="assign-employee-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search employee..."
                disabled={disabled}
                className="pl-9"
              />
            </div>
            <div
              role="listbox"
              aria-label="Employees"
              className="max-h-48 overflow-y-auto rounded-md border border-solid border-border"
            >
              {disabled ? (
                <p className="m-0 px-3 py-4 text-center text-sm text-muted-foreground">
                  {companySelected ? 'No employees found for this company.' : 'Select a company first.'}
                </p>
              ) : filtered.length === 0 ? (
                <p className="m-0 px-3 py-4 text-center text-sm text-muted-foreground">
                  No employees match your search.
                </p>
              ) : (
                filtered.map((employee) => {
                  const selected = selectedEmployee?.id === employee.id;
                  return (
                    <button
                      key={employee.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => onSelectEmployee(selected ? null : employee)}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 py-2 text-left text-sm [font-family:inherit] text-foreground transition-colors outline-none hover:bg-accent focus-visible:bg-accent',
                        selected && 'bg-accent font-medium',
                      )}
                    >
                      <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{optionLabel(employee)}</span>
                      <span className="text-xs text-muted-foreground">{employee.id}</span>
                      {selected && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
                    </button>
                  );
                })
              )}
            </div>
            {selectedEmployee && (
              <p className="m-0 text-xs text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{optionLabel(selectedEmployee)}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-effective" className={labelClass}>
              Effective Date<span className="text-destructive"> *</span>
            </Label>
            <Input
              id="assign-effective"
              type="date"
              value={formData.effective_date}
              onChange={(e) => onFormChange({ effective_date: e.target.value })}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-end" className={labelClass}>
              End Date (Optional)
            </Label>
            <Input
              id="assign-end"
              type="date"
              value={formData.end_date}
              onChange={(e) => onFormChange({ end_date: e.target.value })}
            />
            <p className="m-0 text-xs text-muted-foreground">Leave empty for ongoing assignment</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!selectedEmployee || !formData.effective_date}>
            Assign Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleAssignDialog;
