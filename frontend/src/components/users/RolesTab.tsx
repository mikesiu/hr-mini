import React, { useMemo, useState } from 'react';
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import {
  EmptyState, SearchInput, TableCard, TableSkeleton, Toolbar, adminCellClass, adminHeadClass,
} from '@/components/admin/AdminParts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RolesTabProps {
  roles: any[];
  roleUserCounts: { [key: string]: number };
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  onCreate: () => void;
  onEdit: (role: any) => void;
  onDelete: (roleId: number) => void;
}

/** Icon button with tooltip; a wrapping span keeps the tooltip working while disabled. */
const RoleActionButton: React.FC<{
  label: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}> = ({ label, disabled, onClick, className, children }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="inline-flex">
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', className)}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {children}
        </Button>
      </span>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

const RolesTab: React.FC<RolesTabProps> = ({
  roles, roleUserCounts, loading, hasPermission, onCreate, onEdit, onDelete,
}) => {
  const [search, setSearch] = useState('');
  const canManage = hasPermission('user:manage');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => `${r.code} ${r.name}`.toLowerCase().includes(q));
  }, [roles, search]);

  return (
    <div className="space-y-4">
      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search role code or name"
          ariaLabel="Search roles"
        />
        <Badge variant="secondary" className="tabular-nums">
          {filtered.length} {filtered.length === 1 ? 'role' : 'roles'}
        </Badge>
      </Toolbar>

      <TableCard>
        {loading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          search.trim() ? (
            <EmptyState
              icon={ShieldCheck}
              title="No matching roles"
              description="No roles match your search."
              actionLabel="Clear search"
              onAction={() => setSearch('')}
            />
          ) : (
            <EmptyState
              icon={ShieldCheck}
              title="No roles yet"
              description="Roles group permissions that can be assigned to users."
              actionLabel={canManage ? 'Create Role' : undefined}
              actionIcon={Plus}
              onAction={canManage ? onCreate : undefined}
            />
          )
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={adminHeadClass}>Role Code</TableHead>
                <TableHead className={adminHeadClass}>Role Name</TableHead>
                <TableHead className={adminHeadClass}>Users</TableHead>
                <TableHead className={adminHeadClass}>Permissions</TableHead>
                <TableHead className={cn(adminHeadClass, 'text-right')}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((role) => {
                const count = roleUserCounts[role.code] || 0;
                return (
                  <TableRow key={role.id} className="transition-colors">
                    <TableCell className={adminCellClass}>
                      <Badge variant="secondary" className="font-mono text-xs">{role.code}</Badge>
                    </TableCell>
                    <TableCell className={adminCellClass}>{role.name}</TableCell>
                    <TableCell className={cn(adminCellClass, 'whitespace-nowrap')}>
                      <Badge variant={count > 0 ? 'default' : 'outline'} className="tabular-nums">
                        {`${count} user(s)`}
                      </Badge>
                    </TableCell>
                    <TableCell className={adminCellClass}>
                      <div className="flex max-w-xl flex-wrap gap-1">
                        {(role.permissions || []).map((permission: string) => (
                          <Badge key={permission} variant="outline" className="font-mono text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className={adminCellClass}>
                      <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                        <RoleActionButton
                          label={canManage ? 'Edit Role' : 'No permission to edit roles'}
                          disabled={!canManage}
                          onClick={() => onEdit(role)}
                        >
                          <Pencil className="size-4" />
                        </RoleActionButton>
                        <RoleActionButton
                          label={
                            !canManage
                              ? 'No permission to delete roles'
                              : count > 0
                                ? `Cannot delete role with ${roleUserCounts[role.code]} user(s) assigned`
                                : 'Delete role'
                          }
                          disabled={!canManage || count > 0}
                          onClick={() => onDelete(role.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </RoleActionButton>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TableCard>
    </div>
  );
};

export default RolesTab;
