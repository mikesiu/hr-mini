import React, { useState, useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RoleCheckList from './RoleCheckList';
import type { User } from './types';

// Create User Dialog Component
export const CreateUserDialog: React.FC<{
  open: boolean;
  roles: any[];
  onClose: () => void;
  onSave: (userData: any) => void;
}> = ({ open, roles, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    display_name: '',
    email: '',
    is_active: true,
    role_codes: [] as string[]
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        username: '',
        password: '',
        confirmPassword: '',
        display_name: '',
        email: '',
        is_active: true,
        role_codes: []
      });
      setFormError(null);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.username.trim()) {
      setFormError('Username is required');
      return;
    }
    if (!formData.password) {
      setFormError('Password is required');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    // Send data without confirmPassword
    const { confirmPassword, ...userData } = formData;
    onSave(userData);
  };

  const passwordMismatch = formData.password !== formData.confirmPassword && formData.confirmPassword !== '';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a user account and assign its roles.</DialogDescription>
          </DialogHeader>

          {formError && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="create-user-username">Username *</Label>
            <Input
              id="create-user-username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              autoFocus
            />
            <p className="m-0 text-xs text-muted-foreground">Username must be unique</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="create-user-password">Password *</Label>
              <Input
                id="create-user-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="create-user-confirm">Confirm Password *</Label>
              <Input
                id="create-user-confirm"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                aria-invalid={passwordMismatch}
              />
              {passwordMismatch && (
                <p className="m-0 text-xs text-destructive">Passwords do not match</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="create-user-display">Display Name</Label>
              <Input
                id="create-user-display"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="create-user-email">Email</Label>
              <Input
                id="create-user-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="create-user-active"
              checked={formData.is_active}
              onCheckedChange={(c) => setFormData({ ...formData, is_active: c === true })}
            />
            <Label htmlFor="create-user-active" className="cursor-pointer">Active User</Label>
          </div>

          <div className="space-y-2">
            <Label>Roles</Label>
            <RoleCheckList
              roles={roles}
              value={formData.role_codes}
              onChange={(role_codes) => setFormData({ ...formData, role_codes })}
              idPrefix="create-user-role"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={!formData.username.trim() || !formData.password || formData.password !== formData.confirmPassword}
            >
              Create User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Edit User Dialog Component
export const EditUserDialog: React.FC<{
  open: boolean;
  user: User | null;
  roles: any[];
  onClose: () => void;
  onSave: (userData: any) => void;
}> = ({ open, user, roles, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    display_name: '',
    email: '',
    is_active: true,
    role_codes: [] as string[]
  });

  useEffect(() => {
    if (user) {
      setFormData({
        display_name: user.display_name || '',
        email: user.email || '',
        is_active: user.is_active !== false, // Use actual user status
        role_codes: user.roles.map(r => r.code)
      });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit User: {user?.username}</DialogTitle>
            <DialogDescription>Update profile details, status and roles.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="edit-user-display">Display Name</Label>
              <Input
                id="edit-user-display"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="edit-user-email">Email</Label>
              <Input
                id="edit-user-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-user-active"
              checked={formData.is_active}
              onCheckedChange={(c) => setFormData({ ...formData, is_active: c === true })}
            />
            <Label htmlFor="edit-user-active" className="cursor-pointer">Active User</Label>
          </div>

          <div className="space-y-2">
            <Label>Roles</Label>
            <RoleCheckList
              roles={roles}
              value={formData.role_codes}
              onChange={(role_codes) => setFormData({ ...formData, role_codes })}
              idPrefix="edit-user-role"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
