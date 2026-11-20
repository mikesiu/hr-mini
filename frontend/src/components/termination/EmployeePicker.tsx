import React, { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Employee } from './terminationTypes';

interface EmployeePickerProps {
  employees: Employee[];
  value: string;
  disabled?: boolean;
  onChange: (employeeId: string) => void;
}

/** Searchable single-select list (replaces the MUI Autocomplete). */
const EmployeePicker: React.FC<EmployeePickerProps> = ({ employees, value, disabled, onChange }) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) => e.full_name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)
    );
  }, [employees, query]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search employee by name or ID..."
          className="pl-8"
          disabled={disabled}
          aria-label="Search employee"
        />
      </div>
      <ul
        role="listbox"
        aria-label="Employees"
        className="m-0 max-h-44 list-none overflow-y-auto rounded-md border border-solid border-border p-1"
      >
        {filtered.length === 0 ? (
          <li className="px-2 py-3 text-center text-sm text-muted-foreground">No employees found</li>
        ) : (
          filtered.map((emp) => {
            const selected = emp.id === value;
            return (
              <li key={emp.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(selected ? '' : emp.id)}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2 rounded-sm border-0 bg-transparent px-2 py-1.5 text-left text-sm [font-family:inherit] text-foreground transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
                    selected && 'bg-accent'
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{emp.full_name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{emp.id}</span>
                  {selected ? <Check className="size-4 text-primary" /> : <span className="size-4" />}
                </button>
              </li>
            );
          })
        )}
      </ul>
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-xs [font-family:inherit] text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3" /> Clear selection
        </button>
      )}
    </div>
  );
};

export default EmployeePicker;
