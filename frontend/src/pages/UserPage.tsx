import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Checkbox,
  FormControlLabel,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { userAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: number;
  username: string;
  display_name?: string;
  email?: string;
  is_active?: boolean;
  roles: Array<{
    code: string;
    name: string;
    permissions: string[];
  }>;
  permissions: string[];
}

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
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationSeverity, setNotificationSeverity] = useState<'success' | 'error'>('success');
  
  const [roleUserCounts, setRoleUserCounts] = useState<{[key: string]: number}>({});
  const { hasPermission, user: currentUser } = useAuth();
  
  

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

  const handleDeleteRole = async (roleId: number) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        await userAPI.deleteRole(roleId);
        await loadRoles(); // Refresh the roles list
        setError(null); // Clear any previous errors
      } catch (err: any) {
        console.error('Delete role error:', err);
        const errorMessage = err.response?.data?.detail || 'Failed to delete role';
        setError(errorMessage);
        
        // Show a more user-friendly alert for role deletion errors
        if (errorMessage.includes('assigned to this role') || errorMessage.includes('user(s)')) {
          alert(`Cannot delete role: ${errorMessage}\n\nPlease reassign or remove all users from this role before deleting it.`);
        } else {
          alert(`Error deleting role: ${errorMessage}`);
        }
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
    console.log('3. Current API Base URL:', process.env.REACT_APP_API_URL || 'http://localhost:8004/api');
    
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">
          User Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => setMyPasswordDialogOpen(true)}
        >
          Change My Password
        </Button>
      </Box>
      
      {!hasPermission('user:manage') && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You have view-only access to user management. Contact an administrator to modify user accounts or roles.
        </Alert>
      )}
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Box sx={{ display: 'flex' }}>
          <Button
            variant={activeTab === 0 ? 'contained' : 'text'}
            onClick={() => setActiveTab(0)}
            sx={{ mr: 2 }}
          >
            Users
          </Button>
          {hasPermission('user:manage') && (
            <Button
              variant={activeTab === 1 ? 'contained' : 'text'}
              onClick={() => setActiveTab(1)}
            >
              Roles & Permissions
            </Button>
          )}
        </Box>
      </Box>

      {activeTab === 0 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              User Management
            </Typography>
            {hasPermission('user:manage') && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateUser}
              >
                Create User
              </Button>
            )}
          </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {users.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {users.filter(u => u.is_active !== false).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main">
                {users.filter(u => u.is_active === false).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Inactive Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                {roles.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Roles
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Display Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Permissions</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.display_name || '-'}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.is_active ? 'Active' : 'Inactive'}
                      color={user.is_active ? 'success' : 'error'}
                      size="small"
                      variant={user.is_active ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell>
                    {user.roles.map((role) => (
                      <Chip
                        key={role.code}
                        label={role.name}
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </TableCell>
                  <TableCell>
                    {user.permissions.includes('*') ? (
                      <Chip label="All Permissions" color="primary" size="small" />
                    ) : (
                      <Typography variant="body2">
                        {user.permissions.length} permissions
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {hasPermission('user:manage') && (
                      <>
                        {hasPermission('user:edit') && (
                          <IconButton
                            size="small"
                            onClick={() => handleEditUser(user)}
                            title="Edit User"
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                        {hasPermission('user:edit') && (
                          <IconButton
                            size="small"
                            onClick={() => handleChangePassword(user)}
                            title="Change Password"
                          >
                            <RefreshIcon />
                          </IconButton>
                        )}
                        {hasPermission('user:edit') && user.username !== currentUser?.username && (
                          <IconButton
                            size="small"
                            onClick={() => handleToggleUserStatus(user)}
                            title={user.is_active ? "Deactivate User" : "Activate User"}
                            color={user.is_active ? "warning" : "success"}
                          >
                            {user.is_active ? "⏸️" : "▶️"}
                          </IconButton>
                        )}
                        {user.username !== currentUser?.username && (
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteUser(user)}
                            color="error"
                            title="Delete User"
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

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
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user "{userToDelete?.username}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={passwordDialogOpen}
        user={userToChangePassword}
        onClose={() => setPasswordDialogOpen(false)}
        onSave={handlePasswordChange}
      />

        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Roles & Permissions Management
            </Typography>
            {hasPermission('user:manage') && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setRoleDialogOpen(true)}
              >
                Create Role
              </Button>
            )}
          </Box>

          <Paper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Role Code</TableCell>
                  <TableCell>Role Name</TableCell>
                  <TableCell>Users</TableCell>
                  <TableCell>Permissions</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <Chip label={role.code} size="small" />
                    </TableCell>
                    <TableCell>{role.name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={`${roleUserCounts[role.code] || 0} user(s)`} 
                        size="small" 
                        color={roleUserCounts[role.code] > 0 ? "primary" : "default"}
                        variant={roleUserCounts[role.code] > 0 ? "filled" : "outlined"}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(role.permissions || []).map((permission: string) => (
                          <Chip
                            key={permission}
                            label={permission}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingRole(role);
                          setRoleDialogOpen(true);
                        }}
                        disabled={!hasPermission('user:manage')}
                        title={hasPermission('user:manage') ? 'Edit Role' : 'No permission to edit roles'}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteRole(role.id)}
                        disabled={!hasPermission('user:manage') || (roleUserCounts[role.code] || 0) > 0}
                        title={
                          !hasPermission('user:manage') 
                            ? 'No permission to delete roles'
                            : (roleUserCounts[role.code] || 0) > 0 
                              ? `Cannot delete role with ${roleUserCounts[role.code]} user(s) assigned`
                              : 'Delete role'
                        }
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* Role Management Dialog - Outside tabs so it's always accessible */}
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

      {/* Notification Snackbar */}
      <NotificationSnackbar
        open={notificationOpen}
        message={notificationMessage}
        severity={notificationSeverity}
        onClose={() => setNotificationOpen(false)}
      />
    </Box>
  );
};

// Create User Dialog Component
const CreateUserDialog: React.FC<{
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {formError && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {formError}
              </Alert>
            )}
            <TextField
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              fullWidth
              required
              autoFocus
              helperText="Username must be unique"
            />
            <TextField
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              fullWidth
              required
              error={formData.password !== formData.confirmPassword && formData.confirmPassword !== ''}
              helperText={formData.password !== formData.confirmPassword && formData.confirmPassword !== '' ? 'Passwords do not match' : ''}
            />
            <TextField
              label="Display Name"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label="Active User"
            />
            <FormControl fullWidth>
              <InputLabel>Roles</InputLabel>
              <Select
                multiple
                value={formData.role_codes}
                onChange={(e) => setFormData({ ...formData, role_codes: e.target.value as string[] })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const role = roles.find(r => r.code === value);
                      return (
                        <Chip key={value} label={role?.name || value} size="small" />
                      );
                    })}
                  </Box>
                )}
              >
                {roles.map((role) => (
                  <MenuItem key={role.code} value={role.code}>
                    {role.name} ({role.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={!formData.username.trim() || !formData.password || formData.password !== formData.confirmPassword}
          >
            Create User
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

// Edit User Dialog Component
const EditUserDialog: React.FC<{
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Edit User: {user?.username}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Display Name"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label="Active User"
            />
            <FormControl fullWidth>
              <InputLabel>Roles</InputLabel>
              <Select
                multiple
                value={formData.role_codes}
                onChange={(e) => setFormData({ ...formData, role_codes: e.target.value as string[] })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const role = roles.find(r => r.code === value);
                      return (
                        <Chip key={value} label={role?.name || value} size="small" />
                      );
                    })}
                  </Box>
                )}
              >
                {roles.map((role) => (
                  <MenuItem key={role.code} value={role.code}>
                    {role.name} ({role.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

// Change Password Dialog Component
const ChangePasswordDialog: React.FC<{
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Change Password: {user?.username}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              required
              error={password !== confirmPassword && confirmPassword !== ''}
              helperText={password !== confirmPassword && confirmPassword !== '' ? 'Passwords do not match' : ''}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={password !== confirmPassword || password === ''}
          >
            Change Password
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

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
    'audit:view'
  ];

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
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { maxHeight: '80vh' }
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1 }}>
          {role ? `Edit Role: ${role.name}` : 'Create New Role'}
        </DialogTitle>
        <DialogContent sx={{ maxHeight: '60vh', overflow: 'auto', pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0 }}>
            <TextField
              label="Role Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              fullWidth
              required={!role} // Only required when creating new role
              disabled={!!role} // Cannot change code for existing roles
              helperText={role ? "Role code cannot be changed" : "Unique identifier for the role"}
            />
            <TextField
              label="Role Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 2 }}>
              <Typography variant="h6">
                Permissions
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const allPermissions = availablePermissions;
                    setFormData({ ...formData, permissions: allPermissions });
                  }}
                >
                  Select All
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setFormData({ ...formData, permissions: [] });
                  }}
                >
                  Clear All
                </Button>
              </Box>
            </Box>
            
            {/* Group permissions by category - Compact layout */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* User Management Permissions */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: 'primary.main', fontSize: '0.9rem' }}>
                  User Management
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 1 }}>
                  {availablePermissions.filter(p => p.startsWith('user:')).map((permission) => (
                    <FormControlLabel
                      key={permission}
                      control={
                        <Checkbox
                          checked={formData.permissions.includes(permission)}
                          onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                          size="small"
                        />
                      }
                      label={permission.replace('user:', '')}
                      sx={{ fontSize: '0.8rem', margin: 0, minWidth: '80px' }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Employee Management Permissions */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: 'primary.main', fontSize: '0.9rem' }}>
                  Employee Management
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 1 }}>
                  {availablePermissions.filter(p => p.startsWith('employee:')).map((permission) => (
                    <FormControlLabel
                      key={permission}
                      control={
                        <Checkbox
                          checked={formData.permissions.includes(permission)}
                          onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                          size="small"
                        />
                      }
                      label={permission.replace('employee:', '')}
                      sx={{ fontSize: '0.8rem', margin: 0, minWidth: '80px' }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Company Management Permissions */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: 'primary.main', fontSize: '0.9rem' }}>
                  Company Management
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 1 }}>
                  {availablePermissions.filter(p => p.startsWith('company:')).map((permission) => (
                    <FormControlLabel
                      key={permission}
                      control={
                        <Checkbox
                          checked={formData.permissions.includes(permission)}
                          onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                          size="small"
                        />
                      }
                      label={permission.replace('company:', '')}
                      sx={{ fontSize: '0.8rem', margin: 0, minWidth: '80px' }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Leave Management Permissions */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: 'primary.main', fontSize: '0.9rem' }}>
                  Leave Management
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 1 }}>
                  {availablePermissions.filter(p => p.startsWith('leave:')).map((permission) => (
                    <FormControlLabel
                      key={permission}
                      control={
                        <Checkbox
                          checked={formData.permissions.includes(permission)}
                          onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                          size="small"
                        />
                      }
                      label={permission.replace('leave:', '')}
                      sx={{ fontSize: '0.8rem', margin: 0, minWidth: '80px' }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Expense Management Permissions */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: 'primary.main', fontSize: '0.9rem' }}>
                  Expense Management
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 1 }}>
                  {availablePermissions.filter(p => p.startsWith('expense:')).map((permission) => (
                    <FormControlLabel
                      key={permission}
                      control={
                        <Checkbox
                          checked={formData.permissions.includes(permission)}
                          onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                          size="small"
                        />
                      }
                      label={permission.replace('expense:', '')}
                      sx={{ fontSize: '0.8rem', margin: 0, minWidth: '80px' }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Salary Management Permissions */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: 'primary.main', fontSize: '0.9rem' }}>
                  Salary Management
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 1 }}>
                  {availablePermissions.filter(p => p.startsWith('salary:')).map((permission) => (
                    <FormControlLabel
                      key={permission}
                      control={
                        <Checkbox
                          checked={formData.permissions.includes(permission)}
                          onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                          size="small"
                        />
                      }
                      label={permission.replace('salary:', '')}
                      sx={{ fontSize: '0.8rem', margin: 0, minWidth: '80px' }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Work Permit Management Permissions */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: 'primary.main', fontSize: '0.9rem' }}>
                  Work Permit Management
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 1 }}>
                  {availablePermissions.filter(p => p.startsWith('work_permit:')).map((permission) => (
                    <FormControlLabel
                      key={permission}
                      control={
                        <Checkbox
                          checked={formData.permissions.includes(permission)}
                          onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                          size="small"
                        />
                      }
                      label={permission.replace('work_permit:', '')}
                      sx={{ fontSize: '0.8rem', margin: 0, minWidth: '80px' }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Employment Management Permissions */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: 'primary.main', fontSize: '0.9rem' }}>
                  Employment Management
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 1 }}>
                  {availablePermissions.filter(p => p.startsWith('employment:')).map((permission) => (
                    <FormControlLabel
                      key={permission}
                      control={
                        <Checkbox
                          checked={formData.permissions.includes(permission)}
                          onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                          size="small"
                        />
                      }
                      label={permission.replace('employment:', '')}
                      sx={{ fontSize: '0.8rem', margin: 0, minWidth: '80px' }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Report Management Permissions */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: 'primary.main', fontSize: '0.9rem' }}>
                  Report Management
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 1 }}>
                  {availablePermissions.filter(p => p.startsWith('report:')).map((permission) => (
                    <FormControlLabel
                      key={permission}
                      control={
                        <Checkbox
                          checked={formData.permissions.includes(permission)}
                          onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                          size="small"
                        />
                      }
                      label={permission.replace('report:', '')}
                      sx={{ fontSize: '0.8rem', margin: 0, minWidth: '80px' }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Audit Permissions */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: 'primary.main', fontSize: '0.9rem' }}>
                  Audit & Logging
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 1 }}>
                  {availablePermissions.filter(p => p.startsWith('audit:')).map((permission) => (
                    <FormControlLabel
                      key={permission}
                      control={
                        <Checkbox
                          checked={formData.permissions.includes(permission)}
                          onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                          size="small"
                        />
                      }
                      label={permission.replace('audit:', '')}
                      sx={{ fontSize: '0.8rem', margin: 0, minWidth: '80px' }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={!formData.code.trim() || !formData.name.trim()}
          >
            {role ? 'Update Role' : 'Create Role'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

// Change My Password Dialog Component
const ChangeMyPasswordDialog: React.FC<{
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Change My Password</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              required
              error={newPassword !== confirmPassword && confirmPassword !== ''}
              helperText={newPassword !== confirmPassword && confirmPassword !== '' ? 'Passwords do not match' : ''}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={newPassword !== confirmPassword || newPassword === '' || currentPassword === ''}
          >
            Change Password
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

// Notification Snackbar
const NotificationSnackbar: React.FC<{
  open: boolean;
  message: string;
  severity: 'success' | 'error';
  onClose: () => void;
}> = ({ open, message, severity, onClose }) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert onClose={onClose} severity={severity} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default UserPage;
