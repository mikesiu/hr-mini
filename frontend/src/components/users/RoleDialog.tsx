import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Available permissions
const availablePermissions = [
  'user:view', 'user:create', 'user:edit', 'user:delete', 'user:manage',
  'employee:view', 'employee:create', 'employee:edit', 'employee:delete',
  'company:view', 'company:create', 'company:edit', 'company:delete', 'company:manage',
  'leave:view', 'leave:create', 'leave:edit', 'leave:delete', 'leave:manage',
  'expense:view', 'expense:create', 'expense:edit', 'expense:delete', 'expense:manage',
  'salary:view', 'salary:create', 'salary:edit', 'salary:delete', 'salary:manage',
  'work_permit:view', 'work_permit:create', 'work_permit:edit', 'work_permit:delete', 'work_permit:manage',
  'employment:view', 'employment:create', 'employment:edit', 'employment:delete', 'employment:manage',
  'report:view', 'report:export',
  'audit:view',
  'code:manage'
];

// Permissions grouped by category (display only)
const permissionGroups: Array<{ prefix: string; label: string }> = [
  { prefix: 'user:', label: 'User Management' },
  { prefix: 'employee:', label: 'Employee Management' },
  { prefix: 'company:', label: 'Company Management' },
  { prefix: 'leave:', label: 'Leave Management' },
  { prefix: 'expense:', label: 'Expense Management' },
  { prefix: 'salary:', label: 'Salary Management' },
  { prefix: 'work_permit:', label: 'Work Permit Management' },
  { prefix: 'employment:', label: 'Employment Management' },
  { prefix: 'report:', label: 'Report Management' },
  { prefix: 'audit:', label: 'Audit & Logging' },
];

// Role Management Dialog Component
const RoleDialog: React.FC<{
  open: boolean;
  role: any;
  onClose: () => void;
  onSave: (roleData: any) => void;
}> = ({ open, role, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    permissions: [] as string[]
  });

  useEffect(() => {
    if (role) {
      const newFormData = {
        code: role.code || '',
        name: role.name || '',
        permissions: role.permissions || []
      };
      console.log('Initializing form with role data:', newFormData);
      setFormData(newFormData);
    } else {
      setFormData({
        code: '',
        name: '',
        permissions: []
      });
    }
  }, [role]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== ROLE DIALOG SUBMIT DEBUG ===');
    console.log('1. Form submitted with data:', formData);
    console.log('2. Form validation - code:', formData.code.trim(), 'name:', formData.name.trim());
    console.log('3. Is editing existing role:', !!role);
    console.log('4. Role ID (if editing):', role?.id);
    console.log('5. Permissions count:', formData.permissions.length);
    console.log('6. Selected permissions:', formData.permissions);

    // Validate form data
    if (!formData.code.trim()) {
      console.error('7. Validation failed: Role code is required');
      return;
    }
    if (!formData.name.trim()) {
      console.error('7. Validation failed: Role name is required');
      return;
    }

    console.log('8. Validation passed, calling onSave...');
    onSave(formData);
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, permission]
      });
    } else {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter(p => p !== permission)
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{role ? `Edit Role: ${role.name}` : 'Create New Role'}</DialogTitle>
            <DialogDescription>Define the role and the permissions it grants.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="role-code">Role Code{!role && ' *'}</Label>
              <Input
                id="role-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required={!role} // Only required when creating new role
                disabled={!!role} // Cannot change code for existing roles
                className="font-mono"
              />
              <p className="m-0 text-xs text-muted-foreground">
                {role ? 'Role code cannot be changed' : 'Unique identifier for the role'}
              </p>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="role-name">Role Name *</Label>
              <Input
                id="role-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="m-0 text-base font-semibold text-foreground">Permissions</h3>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const allPermissions = availablePermissions;
                  setFormData({ ...formData, permissions: allPermissions });
                }}
              >
                Select All
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setFormData({ ...formData, permissions: [] });
                }}
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Group permissions by category */}
          <div className="space-y-3">
            {permissionGroups.map((group) => (
              <div key={group.prefix} className="space-y-1.5">
                <p className="m-0 text-sm font-semibold text-primary">{group.label}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 pl-2">
                  {availablePermissions.filter(p => p.startsWith(group.prefix)).map((permission) => {
                    const id = `perm-${permission}`;
                    return (
                      <div key={permission} className="flex min-w-20 items-center gap-2">
                        <Checkbox
                          id={id}
                          checked={formData.permissions.includes(permission)}
                          onCheckedChange={(c) => handlePermissionChange(permission, c === true)}
                        />
                        <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
                          {permission.replace(group.prefix, '')}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!formData.code.trim() || !formData.name.trim()}>
              {role ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RoleDialog;
