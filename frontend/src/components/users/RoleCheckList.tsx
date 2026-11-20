import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface RoleCheckListProps {
  roles: any[];
  value: string[];
  onChange: (roleCodes: string[]) => void;
  idPrefix: string;
}

/** Multi-select of roles rendered as a checkbox list (replaces the MUI multi-select). */
const RoleCheckList: React.FC<RoleCheckListProps> = ({ roles, value, onChange, idPrefix }) => {
  if (roles.length === 0) {
    return <p className="m-0 text-sm text-muted-foreground">No roles available.</p>;
  }

  return (
    <div className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto rounded-md border border-solid border-border p-2 sm:grid-cols-2">
      {roles.map((role) => {
        const checked = value.includes(role.code);
        const id = `${idPrefix}-${role.code}`;
        return (
          <div
            key={role.code}
            className="flex min-w-0 items-center gap-2 rounded-sm px-2 py-1.5 transition-colors hover:bg-muted/50"
          >
            <Checkbox
              id={id}
              checked={checked}
              onCheckedChange={(c) =>
                onChange(c === true ? [...value, role.code] : value.filter((code) => code !== role.code))
              }
            />
            <Label htmlFor={id} className="min-w-0 cursor-pointer gap-1 truncate font-normal">
              {role.name} <span className="font-mono text-xs text-muted-foreground">({role.code})</span>
            </Label>
          </div>
        );
      })}
    </div>
  );
};

export default RoleCheckList;
