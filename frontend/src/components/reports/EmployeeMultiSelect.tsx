import React, { useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export interface EmployeeOption {
  id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
}

interface EmployeeMultiSelectProps {
  employees: EmployeeOption[];
  selected: EmployeeOption[];
  loading?: boolean;
  disabled?: boolean;
  noOptionsText: string;
  invalid?: boolean;
  onChange: (selected: EmployeeOption[]) => void;
}

/** Searchable multi-select with removable chips (replaces the MUI multiple Autocomplete). */
const EmployeeMultiSelect: React.FC<EmployeeMultiSelectProps> = ({
  employees, selected, loading, disabled, noOptionsText, invalid, onChange,
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const options = useMemo(() => {
    const term = query.trim().toLowerCase();
    const selectedIds = new Set(selected.map((s) => s.id));
    return employees
      .filter((opt) => !selectedIds.has(opt.id))
      .filter(
        (opt) =>
          !term ||
          (opt.full_name || '').toLowerCase().includes(term) ||
          (opt.id || '').toLowerCase().includes(term) ||
          (opt.first_name || '').toLowerCase().includes(term) ||
          (opt.last_name || '').toLowerCase().includes(term)
      );
  }, [employees, selected, query]);

  return (
    <div className="relative">
      <div className="relative">
        <Input
          value={query}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-label="Employees"
          placeholder={selected.length === 0 ? 'Type name to select…' : 'Add another…'}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        />
        {loading && (
          <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((emp) => (
            <Badge key={emp.id} variant="secondary" className="gap-1 pr-1">
              {emp.full_name}
              <button
                type="button"
                aria-label={`Remove ${emp.full_name}`}
                onClick={() => onChange(selected.filter((s) => s.id !== emp.id))}
                className="flex size-4 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {open && !disabled && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-52 w-full list-none overflow-y-auto rounded-md border border-solid border-border bg-popover p-1 text-popover-foreground shadow-md"
          style={{ margin: 0, marginTop: 4 }}
        >
          {options.length === 0 ? (
            <li className="px-2 py-3 text-center text-sm text-muted-foreground">{noOptionsText}</li>
          ) : (
            options.map((opt) => (
              <li key={opt.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange([...selected, opt]);
                    setQuery('');
                  }}
                  className="flex w-full cursor-pointer flex-col items-start rounded-sm border-0 bg-transparent px-2 py-1.5 text-left [font-family:inherit] text-sm text-foreground transition-colors outline-none hover:bg-accent focus-visible:bg-accent"
                >
                  <span>{opt.full_name}</span>
                  <span className="text-xs text-muted-foreground">ID: {opt.id}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default EmployeeMultiSelect;
