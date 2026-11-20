import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { User } from './types';

// Change Password Dialog Component
export const ChangePasswordDialog: React.FC<{
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSave: (password: string) => void;
}> = ({ open, user, onClose, onSave }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === confirmPassword) {
      onSave(password);
      setPassword('');
      setConfirmPassword('');
    }
  };

  const mismatch = password !== confirmPassword && confirmPassword !== '';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Change Password: {user?.username}</DialogTitle>
            <DialogDescription>Set a new password for this user.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="change-pw-new">New Password *</Label>
            <Input
              id="change-pw-new"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="change-pw-confirm">Confirm Password *</Label>
            <Input
              id="change-pw-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              aria-invalid={mismatch}
            />
            {mismatch && <p className="m-0 text-xs text-destructive">Passwords do not match</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={password !== confirmPassword || password === ''}>
              Change Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Change My Password Dialog Component
export const ChangeMyPasswordDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSave: (currentPassword: string, newPassword: string) => void;
}> = ({ open, onClose, onSave }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword === confirmPassword) {
      onSave(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const mismatch = newPassword !== confirmPassword && confirmPassword !== '';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Change My Password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="my-pw-current">Current Password *</Label>
            <Input
              id="my-pw-current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="my-pw-new">New Password *</Label>
            <Input
              id="my-pw-new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="my-pw-confirm">Confirm New Password *</Label>
            <Input
              id="my-pw-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              aria-invalid={mismatch}
            />
            {mismatch && <p className="m-0 text-xs text-destructive">Passwords do not match</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={newPassword !== confirmPassword || newPassword === '' || currentPassword === ''}
            >
              Change Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
