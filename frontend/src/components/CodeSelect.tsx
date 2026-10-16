import React from 'react';
import { FormControl, FormHelperText, InputLabel, MenuItem, Select } from '@mui/material';
import { CodeCategory } from '../api/client';
import { useCodeValues } from '../hooks/useCodeValues';

interface CodeSelectProps {
  category: CodeCategory;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

const CodeSelect: React.FC<CodeSelectProps> = ({ category, label, value, onChange, required, disabled, size }) => {
  const { codes, optionsWith } = useCodeValues(category);
  const options = optionsWith(value);

  return (
    <FormControl fullWidth required={required} disabled={disabled} size={size}>
      <InputLabel>{label}</InputLabel>
      <Select value={value || ''} label={label} onChange={(e) => onChange(e.target.value as string)}>
        {!required && (
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
        )}
        {options.map((code) => (
          <MenuItem key={code} value={code}>
            {code}
            {!codes.includes(code) ? ' (not in code list)' : ''}
          </MenuItem>
        ))}
      </Select>
      {codes.length === 0 && (
        <FormHelperText>No values yet. Add them under System Management → Code Maintenance.</FormHelperText>
      )}
    </FormControl>
  );
};

export default CodeSelect;
