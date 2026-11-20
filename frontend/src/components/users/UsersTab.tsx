import React, { useMemo, useState } from 'react';
import { KeyRound, Pause, Pencil, Play, Plus, Trash2, Users } from 'lucide-react';
import {
  EmptyState, SearchInput, TableCard, TableSkeleton, Toolbar, adminCellClass, adminHeadClass,
} from '@/components/admin/AdminParts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { User } from './types';

const ALL = '__all__';

const activeBadgeClass = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';

interface UsersTabProps {
  users: User[];
  roles: any[];
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  currentUsername?: string;
  onCreate: () => void;
  onEdit: (user: User) => void;
  onChangePassword: (user: User) => void;
  onToggleStatus: (user: User) => void;
  onDelete: (user: User) => void;
}

const StatTile: React.FC<{ value: number; label: string; valueClass: string }> = ({
  value, label, valueClass,
}) => (
  <div className="rounded-lg border border-solid border-border bg-card px-4 py-3">
    <p className={cn('m-0 text-2xl font-semibold tabular-nums', valueClass)}>{value}</p>
    <p className="m-0 text-sm text-muted-foreground">{label}</p>
  </div>
);

const ActionButton: React.FC<{
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}> = ({ label, onClick, children, className }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8', className)}
        onClick={onClick}
        aria-label={label}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

const UsersTab: React.FC<UsersTabProps> = ({
  users, roles, loading, hasPermission, currentUsername,
  onCreate, onEdit, onChangePassword, onToggleStatus, onDelete,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q) {
        const haystack = `${u.username} ${u.display_name || ''} ${u.email || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (roleFilter && !u.roles.some((r) => r.code === roleFilter)) return false;
      if (statusFilter === 'active' && !u.is_active) return false;
      if (statusFilter === 'inactive' && u.is_active) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const hasFilters = !!(search.trim() || roleFilter || statusFilter);
  const clearFilters = () => {
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
  };
  const canManage = hasPermission('user:manage');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile value={users.length} label="Total Users" valueClass="text-primary" />
        <StatTile
          value={users.filter(u => u.is_active !== false).length}
          label="Active Users"
          valueClass="text-emerald-700 dark:text-emerald-400"
        />
        <StatTile
          value={users.filter(u => u.is_active === false).length}
          label="Inactive Users"
          valueClass="text-destructive"
        />
        <StatTile value={roles.length} label="Total Roles" valueClass="text-foreground" />
      </div>

      <Toolbar>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search username, name or email"
            ariaLabel="Search users"
          />
          <Select
            value={roleFilter || ALL}
            onValueChange={(v) => setRoleFilter(v === ALL ? '' : v)}
          >
            <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.code} value={role.code}>{role.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter || ALL}
            onValueChange={(v) => setStatusFilter(v === ALL ? '' : v)}
          >
            <SelectTrigger className="w-full sm:w-[150px]" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
        </Badge>
      </Toolbar>

      <TableCard>
        {loading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={Users}
              title="No matching users"
              description="No users match the current search or filters."
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          ) : (
            <EmptyState
              icon={Users}
              title="No users yet"
              description="User accounts will appear here once they are created."
              actionLabel={canManage ? 'Create User' : undefined}
              actionIcon={Plus}
              onAction={canManage ? onCreate : undefined}
            />
          )
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={adminHeadClass}>Username</TableHead>
                <TableHead className={adminHeadClass}>Display Name</TableHead>
                <TableHead className={adminHeadClass}>Email</TableHead>
                <TableHead className={adminHeadClass}>Status</TableHead>
                <TableHead className={adminHeadClass}>Roles</TableHead>
                <TableHead className={adminHeadClass}>Permissions</TableHead>
                <TableHead className={cn(adminHeadClass, 'text-right')}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id} className="transition-colors">
                  <TableCell className={cn(adminCellClass, 'font-mono text-xs')}>{user.username}</TableCell>
                  <TableCell className={adminCellClass}>{user.display_name || '-'}</TableCell>
                  <TableCell className={adminCellClass}>{user.email || '-'}</TableCell>
                  <TableCell className={adminCellClass}>
                    <Badge
                      variant="secondary"
                      className={cn(user.is_active && activeBadgeClass)}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className={adminCellClass}>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge
                          key={role.code}
                          variant={role.code === 'admin' ? 'default' : 'secondary'}
                        >
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className={cn(adminCellClass, 'whitespace-nowrap')}>
                    {user.permissions.includes('*') ? (
                      <Badge>All Permissions</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {user.permissions.length} permissions
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={adminCellClass}>
                    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                      {canManage && (
                        <>
                          {hasPermission('user:edit') && (
                            <ActionButton label="Edit User" onClick={() => onEdit(user)}>
                              <Pencil className="size-4" />
                            </ActionButton>
                          )}
                          {hasPermission('user:edit') && (
                            <ActionButton label="Change Password" onClick={() => onChangePassword(user)}>
                              <KeyRound className="size-4" />
                            </ActionButton>
                          )}
                          {hasPermission('user:edit') && user.username !== currentUsername && (
                            <ActionButton
                              label={user.is_active ? 'Deactivate User' : 'Activate User'}
                              onClick={() => onToggleStatus(user)}
                              className={
                                user.is_active
                                  ? 'text-amber-600 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-400'
                                  : 'text-emerald-600 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-400'
                              }
                            >
                              {user.is_active ? <Pause className="size-4" /> : <Play className="size-4" />}
                            </ActionButton>
                          )}
                          {user.username !== currentUsername && (
                            <ActionButton
                              label="Delete User"
                              onClick={() => onDelete(user)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </ActionButton>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>
    </div>
  );
};

export default UsersTab;
