import React, { useState, useEffect, useCallback } from 'react';
import { Info, KeyRound, Plus, TriangleAlert } from 'lucide-react';
import { userAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import AppToast from '../components/AppToast';
import { PageHeader } from '@/components/admin/AdminParts';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateUserDialog, EditUserDialog } from '@/components/users/UserFormDialogs';
import { ChangePasswordDialog, ChangeMyPasswordDialog } from '@/components/users/PasswordDialogs';
import RoleDialog from '@/components/users/RoleDialog';
import UsersTab from '@/components/users/UsersTab';
import RolesTab from '@/components/users/RolesTab';
import type { User } from '@/components/users/types';

const UserPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [userToChangePassword, setUserToChangePassword] = useState<User | null>(null);
  const [myPasswordDialogOpen, setMyPasswordDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleToDelete, setRoleToDelete] = useState<number | null>(null);
  const [roleErrorDialog, setRoleErrorDialog] = useState<{ title: string; message: string } | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationSeverity, setNotificationSeverity] = useState<'success' | 'error'>('success');

  const [roleUserCounts, setRoleUserCounts] = useState<{[key: string]: number}>({});
  const { hasPermission, user: currentUser } = useAuth();

  const closeNotification = useCallback(() => setNotificationOpen(false), []);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await userAPI.list();

      if (response.data && response.data.success) {
        setUsers(response.data.data || []);
      } else {
        setUsers([]);
      }
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError(err.response?.data?.detail || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);


  const loadRoles = useCallback(async () => {
    try {
      const response = await userAPI.roles();

      if (response.data && response.data.success) {
        setRoles(response.data.data || []);
      } else {
        setRoles([]);
      }
    } catch (err: any) {
      console.error('Failed to load roles:', err);
      setRoles([]);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [loadUsers, loadRoles]);

  // Update role user counts when users or roles change
  useEffect(() => {
    if (roles.length > 0 && users.length > 0) {
      const counts: {[key: string]: number} = {};
      for (const role of roles) {
        const usersWithRole = users.filter(user =>
          user.roles.some((userRole: any) => userRole.code === role.code)
        );
        counts[role.code] = usersWithRole.length;
      }
      setRoleUserCounts(counts);
    } else if (roles.length === 0) {
      setRoleUserCounts({});
    }
  }, [roles, users]);

  const handleCreateUser = () => {
    setCreateDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleChangePassword = (user: User) => {
    setUserToChangePassword(user);
    setPasswordDialogOpen(true);
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      const newStatus = !user.is_active;
      await userAPI.update(user.id, { is_active: newStatus });

      // Update the user in the local state
      setUsers(users.map(u =>
        u.id === user.id ? { ...u, is_active: newStatus } : u
      ));

      setNotificationMessage(
        `User ${user.username} has been ${newStatus ? 'activated' : 'deactivated'} successfully`
      );
      setNotificationSeverity('success');
      setNotificationOpen(true);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to update user status';
      setError(errorMessage);
      setNotificationMessage(errorMessage);
      setNotificationSeverity('error');
      setNotificationOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      await userAPI.delete(userToDelete.id);
      setUsers(users.filter(u => u.id !== userToDelete.id));
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handlePasswordChange = async (newPassword: string) => {
    if (!userToChangePassword) return;

    try {
      console.log('Changing password for user:', userToChangePassword.id);
      const response = await userAPI.changePassword(userToChangePassword.id, newPassword);
      console.log('Password change response:', response);

      // Show success message
      setError(''); // Clear any previous errors
      setNotificationMessage(`Password changed successfully for user: ${userToChangePassword.username}`);
      setNotificationSeverity('success');
      setNotificationOpen(true);

      setPasswordDialogOpen(false);
      setUserToChangePassword(null);
    } catch (err: any) {
      console.error('Password change error:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Failed to change password';
      setError(errorMessage);
      setNotificationMessage(errorMessage);
      setNotificationSeverity('error');
      setNotificationOpen(true);
    }
  };

  const handleMyPasswordChange = async (currentPassword: string, newPassword: string) => {
    try {
      await userAPI.changeMyPassword(currentPassword, newPassword);
      setMyPasswordDialogOpen(false);
      setError(null);
      setNotificationMessage('Your password has been changed successfully');
      setNotificationSeverity('success');
      setNotificationOpen(true);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to change password';
      setError(errorMessage);
      setNotificationMessage(errorMessage);
      setNotificationSeverity('error');
      setNotificationOpen(true);
    }
  };

  // Confirmation is handled by an AlertDialog (roleToDelete); this runs once confirmed.
  const handleDeleteRole = async (roleId: number) => {
    try {
      await userAPI.deleteRole(roleId);
      await loadRoles(); // Refresh the roles list
      setError(null); // Clear any previous errors
    } catch (err: any) {
      console.error('Delete role error:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to delete role';
      setError(errorMessage);

      // Show a more user-friendly dialog for role deletion errors
      if (errorMessage.includes('assigned to this role') || errorMessage.includes('user(s)')) {
        setRoleErrorDialog({
          title: 'Cannot delete role',
          message: `Cannot delete role: ${errorMessage}\n\nPlease reassign or remove all users from this role before deleting it.`,
        });
      } else {
        setRoleErrorDialog({
          title: 'Error deleting role',
          message: `Error deleting role: ${errorMessage}`,
        });
      }
    }
  };

  const handleCreateRole = async (roleData: any) => {
    try {
      await userAPI.createRole(roleData);
      setRoleDialogOpen(false);
      setEditingRole(null);
      await loadRoles(); // Refresh the roles list
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create role');
    }
  };

  const handleUpdateRole = async (roleData: any) => {
    if (!editingRole) return;

    console.log('=== ROLE UPDATE DEBUG ===');
    console.log('1. Editing Role ID:', editingRole.id);
    console.log('2. Role Data to Update:', roleData);
    console.log('3. Current API Base URL:', import.meta.env.VITE_API_URL || 'http://localhost:8004/api');

    try {
      console.log('4. Calling userAPI.updateRole...');
      const response = await userAPI.updateRole(editingRole.id, roleData);
      console.log('5. Update Role Response:', response);

      setRoleDialogOpen(false);
      setEditingRole(null);
      await loadRoles(); // Refresh the roles list
      console.log('6. Role update successful!');
    } catch (err: any) {
      console.error('7. Role Update Error Details:');
      console.error('   - Error Object:', err);
      console.error('   - Error Message:', err.message);
      console.error('   - Error Response:', err.response);
      console.error('   - Error Response Data:', err.response?.data);
      console.error('   - Error Response Status:', err.response?.status);
      console.error('   - Error Response Headers:', err.response?.headers);
      console.error('   - Request URL:', err.config?.url);
      console.error('   - Request Method:', err.config?.method);
      console.error('   - Request Data:', err.config?.data);

      const errorMessage = err.response?.data?.detail || err.message || 'Failed to update role';
      console.error('8. Setting error message:', errorMessage);
      setError(errorMessage);
    }
  };

  const canManage = hasPermission('user:manage');

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="User Management"
        subtitle="Manage user accounts, roles and permissions."
        actions={
          <>
            <Button variant="outline" className="rounded-md" onClick={() => setMyPasswordDialogOpen(true)}>
              <KeyRound className="size-4" /> Change My Password
            </Button>
            {canManage && activeTab === 0 && (
              <Button className="rounded-md" onClick={handleCreateUser}>
                <Plus className="size-4" /> Create User
              </Button>
            )}
            {canManage && activeTab === 1 && (
              <Button className="rounded-md" onClick={() => setRoleDialogOpen(true)}>
                <Plus className="size-4" /> Create Role
              </Button>
            )}
          </>
        }
      />

      {!canManage && (
        <Alert>
          <Info />
          <AlertDescription>
            You have view-only access to user management. Contact an administrator to modify user accounts or roles.
          </AlertDescription>
        </Alert>
      )}

      {error && activeTab === 0 && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={String(activeTab)} onValueChange={(v) => setActiveTab(Number(v))}>
        <TabsList>
          <TabsTrigger value="0">Users</TabsTrigger>
          {canManage && <TabsTrigger value="1">Roles &amp; Permissions</TabsTrigger>}
        </TabsList>

        <TabsContent value="0" className="mt-2">
          <UsersTab
            users={users}
            roles={roles}
            loading={loading}
            hasPermission={hasPermission}
            currentUsername={currentUser?.username}
            onCreate={handleCreateUser}
            onEdit={handleEditUser}
            onChangePassword={handleChangePassword}
            onToggleStatus={handleToggleUserStatus}
            onDelete={handleDeleteUser}
          />
        </TabsContent>

        {canManage && (
          <TabsContent value="1" className="mt-2">
            <RolesTab
              roles={roles}
              roleUserCounts={roleUserCounts}
              loading={loading}
              hasPermission={hasPermission}
              onCreate={() => setRoleDialogOpen(true)}
              onEdit={(role) => {
                setEditingRole(role);
                setRoleDialogOpen(true);
              }}
              onDelete={(roleId) => setRoleToDelete(roleId)}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Create User Dialog */}
      <CreateUserDialog
        open={createDialogOpen}
        roles={roles}
        onClose={() => setCreateDialogOpen(false)}
        onSave={async (userData) => {
          try {
            const response = await userAPI.create(userData);
            if (response.data.success) {
              await loadUsers();
              setCreateDialogOpen(false);
              setNotificationMessage(`User "${userData.username}" created successfully`);
              setNotificationSeverity('success');
              setNotificationOpen(true);
            }
          } catch (err: any) {
            const errorMessage = err.response?.data?.detail || 'Failed to create user';
            setError(errorMessage);
            setNotificationMessage(errorMessage);
            setNotificationSeverity('error');
            setNotificationOpen(true);
          }
        }}
      />

      {/* Edit User Dialog */}
      <EditUserDialog
        open={!!editingUser}
        user={editingUser}
        roles={roles}
        onClose={() => setEditingUser(null)}
        onSave={async (userData) => {
          if (!editingUser) return;
          try {
            const response = await userAPI.update(editingUser.id, userData);
            if (response.data.success) {
              // Refresh the user list
              await loadUsers();
              setEditingUser(null);
            }
          } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to update user');
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete user "{userToDelete?.username}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Role Confirmation */}
      <AlertDialog open={roleToDelete !== null} onOpenChange={(o) => !o && setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this role?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (roleToDelete !== null) handleDeleteRole(roleToDelete);
                setRoleToDelete(null);
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role deletion error */}
      <AlertDialog open={!!roleErrorDialog} onOpenChange={(o) => !o && setRoleErrorDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{roleErrorDialog?.title}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {roleErrorDialog?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={passwordDialogOpen}
        user={userToChangePassword}
        onClose={() => setPasswordDialogOpen(false)}
        onSave={handlePasswordChange}
      />

      {/* Role Management Dialog */}
      <RoleDialog
        open={roleDialogOpen}
        role={editingRole}
        onClose={() => {
          setRoleDialogOpen(false);
          setEditingRole(null);
        }}
        onSave={editingRole ? handleUpdateRole : handleCreateRole}
      />

      {/* Change My Password Dialog */}
      <ChangeMyPasswordDialog
        open={myPasswordDialogOpen}
        onClose={() => setMyPasswordDialogOpen(false)}
        onSave={handleMyPasswordChange}
      />

      {/* Notification toast */}
      <AppToast
        message={notificationOpen ? notificationMessage : null}
        variant={notificationSeverity}
        onClose={closeNotification}
      />
    </div>
  );
};

export default UserPage;
