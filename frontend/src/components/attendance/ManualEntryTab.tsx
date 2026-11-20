import React, { useState } from 'react';
import { Check, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { Employee } from './attendanceTypes';
import type { ManualEntry, ManualEntryField } from './attendanceHelpers';

interface ManualEntryTabProps {
  companySelected: boolean;
  loading: boolean;
  employeesCount: number;
  filteredEmployees: Employee[];
  selectedEmployee: Employee | null;
  searchTerm: string;
  entries: ManualEntry[];
  canSave: boolean;
  onSearchChange: (term: string) => void;
  onSelectEmployee: (employee: Employee | null) => void;
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
  onUpdate: (id: string, field: ManualEntryField, value: string) => void;
  onClearAll: () => void;
  onClear: () => void;
  onSaveAll: () => void;
}

const labelClass = 'text-xs font-medium text-muted-foreground';
const headClass =
  'sticky top-0 z-10 h-9 bg-muted px-2 text-xs font-medium tracking-wider text-muted-foreground uppercase';

const nameOf = (e: Employee) => e.full_name || `${e.first_name} ${e.last_name}`;

const ManualEntryTab: React.FC<ManualEntryTabProps> = ({
  companySelected,
  loading,
  employeesCount,
  filteredEmployees,
  selectedEmployee,
  searchTerm,
  entries,
  canSave,
  onSearchChange,
  onSelectEmployee,
  onAddRow,
  onRemoveRow,
  onUpdate,
  onClearAll,
  onClear,
  onSaveAll,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerDisabled = !companySelected || employeesCount === 0;

  const hourInput = (entry: ManualEntry, field: ManualEntryField, label: string) => (
    <Input
      type="number"
      step={0.25}
      min={0}
      aria-label={label}
      placeholder="0.00"
      className="h-8 w-24 text-xs tabular-nums"
      value={entry[field] || ''}
      onChange={(e) => onUpdate(entry.id, field, e.target.value)}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-sm text-muted-foreground">
        Enter either check-in/check-out times OR hours directly (regular, OT, weekend OT, stat
        holiday). At least one is required.
      </p>

      {/* Employee + row controls */}
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-solid border-border bg-card p-3">
        <div className="flex w-full flex-col gap-1.5 sm:max-w-md">
          <Label htmlFor="manual-employee" className={labelClass}>
            Employee<span className="text-destructive"> *</span>
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="manual-employee"
              value={selectedEmployee && !pickerOpen ? `${selectedEmployee.id} - ${nameOf(selectedEmployee)}` : searchTerm}
              onChange={(e) => {
                if (selectedEmployee) onSelectEmployee(null);
                onSearchChange(e.target.value);
                setPickerOpen(true);
              }}
              onFocus={() => setPickerOpen(true)}
              onBlur={() => setPickerOpen(false)}
              placeholder="Enter employee ID or name"
              disabled={pickerDisabled}
              autoComplete="off"
              className="px-9"
            />
            {(selectedEmployee || searchTerm) && (
              <button
                type="button"
                aria-label="Clear employee"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelectEmployee(null);
                  onSearchChange('');
                }}
                className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <X className="size-4" />
              </button>
            )}
            {pickerOpen && !pickerDisabled && (
              <div
                role="listbox"
                aria-label="Employees"
                className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-solid border-border bg-popover text-popover-foreground shadow-md"
              >
                {filteredEmployees.length === 0 ? (
                  <p className="m-0 px-3 py-3 text-center text-sm text-muted-foreground">
                    No employees found
                  </p>
                ) : (
                  filteredEmployees.map((emp) => {
                    const selected = selectedEmployee?.id === emp.id;
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onSelectEmployee(emp);
                          onSearchChange('');
                          setPickerOpen(false);
                        }}
                        className={cn(
                          'flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 py-2 text-left text-sm [font-family:inherit] text-foreground transition-colors outline-none hover:bg-accent focus-visible:bg-accent',
                          selected && 'bg-accent font-medium',
                        )}
                      >
                        <span className="font-semibold">{emp.id}</span>
                        <span className="min-w-0 flex-1 truncate text-muted-foreground">{nameOf(emp)}</span>
                        {selected && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onAddRow} disabled={!companySelected}>
            <Plus />
            Add Row
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={onClearAll}
            disabled={entries.length <= 1}
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Entry table */}
      <div className="overflow-hidden rounded-lg border border-solid border-border bg-card">
        <Table containerClassName="max-h-[32rem] overflow-auto" className="min-w-[900px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={headClass}>Date *</TableHead>
              <TableHead className={headClass}>Check-In</TableHead>
              <TableHead className={headClass}>Check-Out</TableHead>
              <TableHead className={headClass}>Reg Hours</TableHead>
              <TableHead className={headClass}>OT Hours</TableHead>
              <TableHead className={headClass}>Weekend OT</TableHead>
              <TableHead className={headClass}>Stat Holiday</TableHead>
              <TableHead className={cn(headClass, 'text-center')}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id} className="hover:bg-transparent">
                <TableCell className="px-2 py-1.5 align-top">
                  <Input
                    type="date"
                    aria-label="Date"
                    required
                    className="h-8 w-40 text-xs tabular-nums"
                    value={entry.date}
                    onChange={(e) => onUpdate(entry.id, 'date', e.target.value)}
                  />
                </TableCell>
                <TableCell className="px-2 py-1.5 align-top">
                  <Input
                    type="time"
                    aria-label="Check-In"
                    className="h-8 w-32 text-xs tabular-nums"
                    value={entry.check_in}
                    onChange={(e) => onUpdate(entry.id, 'check_in', e.target.value)}
                  />
                  {entry.check_in && !entry.check_out && (
                    <p className="m-0 mt-1 text-[11px] text-destructive">Check-out required</p>
                  )}
                </TableCell>
                <TableCell className="px-2 py-1.5 align-top">
                  <Input
                    type="time"
                    aria-label="Check-Out"
                    className="h-8 w-32 text-xs tabular-nums"
                    value={entry.check_out}
                    onChange={(e) => onUpdate(entry.id, 'check_out', e.target.value)}
                  />
                </TableCell>
                <TableCell className="px-2 py-1.5 align-top">
                  {hourInput(entry, 'regular_hours', 'Regular hours')}
                </TableCell>
                <TableCell className="px-2 py-1.5 align-top">
                  {hourInput(entry, 'ot_hours', 'OT hours')}
                </TableCell>
                <TableCell className="px-2 py-1.5 align-top">
                  {hourInput(entry, 'weekend_ot_hours', 'Weekend OT hours')}
                </TableCell>
                <TableCell className="px-2 py-1.5 align-top">
                  {hourInput(entry, 'stat_holiday_hours', 'Stat holiday hours')}
                </TableCell>
                <TableCell className="px-2 py-1.5 text-center align-top">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          aria-label="Remove row"
                          onClick={() => onRemoveRow(entry.id)}
                          disabled={entries.length === 1}
                        >
                          <Trash2 />
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Remove row</TooltipContent>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex justify-end gap-2 border-0 border-solid border-t border-border p-3">
          <Button variant="outline" onClick={onClear}>
            Clear
          </Button>
          <Button onClick={onSaveAll} disabled={!canSave}>
            {loading && <Loader2 className="animate-spin" />}
            Save All
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ManualEntryTab;
