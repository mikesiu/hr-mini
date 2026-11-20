import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CodeCategory } from '../api/client';
import { useCodeValues } from '../hooks/useCodeValues';

interface CodeSelectFieldProps {
  id: string;
  category: CodeCategory;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

// Radix Select does not allow an empty-string item value, so "None" uses a sentinel.
const NONE = '__none__';

/** shadcn/ui version of `CodeSelect` (same data + behaviour) for use inside shadcn dialogs. */
const CodeSelectField: React.FC<CodeSelectFieldProps> = ({
  id,
  category,
  label,
  value,
  onChange,
  required,
  disabled,
}) => {
  const { codes, optionsWith } = useCodeValues(category);
  const options = optionsWith(value);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Select
        value={value || (required ? '' : NONE)}
        onValueChange={(next) => onChange(next === NONE ? '' : next)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {!required && <SelectItem value={NONE}>None</SelectItem>}
          {options.map((code) => (
            <SelectItem key={code} value={code}>
              {code}
              {!codes.includes(code) ? ' (not in code list)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {codes.length === 0 && (
        <p className="m-0 text-xs text-muted-foreground">
          No values yet. Add them under System Management → Code Maintenance.
        </p>
      )}
    </div>
  );
};

export default CodeSelectField;
