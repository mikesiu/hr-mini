import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  Snackbar,
  Avatar,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
// import { DatePicker } from '@mui/x-date-pickers/DatePicker';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { workPermitAPI, apiClient } from '../api/client';
import { useCompanyFilter } from '../hooks/useCompanyFilter';
import { useSelectedEmployee } from '../contexts/SelectedEmployeeContext';
import { useAuth } from '../contexts/AuthContext';

interface WorkPermit {
  id: number;
  employee_id: string;
  permit_type: string;
  expiry_date: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
  };
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string;
  phone?: string;
  status: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`work-permit-tabpanel-${index}`}
      aria-labelledby={`work-permit-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Helper function to format date string (YYYY-MM-DD) without timezone issues
function formatDateString(dateStr: string): string {
  if (!dateStr) return '';
  // Parse YYYY-MM-DD format directly to avoid timezone conversion
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString();
  }
  // Otherwise, try parsing as Date but use local components
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    // Use local date components to avoid timezone shift
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    return new Date(year, month, day).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

const WorkPermitPage: React.FC = () => {
  const theme = useTheme();
  const { selectedCompanyId, getCompanyName } = useCompanyFilter();
  const { selectedEmployee: globalSelectedEmployee, setSelectedEmployee: setGlobalSelectedEmployee } = useSelectedEmployee();
  const { hasPermission } = useAuth();

  // State management
  const [workPermits, setWorkPermits] = useState<WorkPermit[]>([]);
  const [expiringPermits, setExpiringPermits] = useState<WorkPermit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedEmployeeData, setSelectedEmployeeData] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [editingPermit, setEditingPermit] = useState<WorkPermit | null>(null);
  const [formData, setFormData] = useState({
    permit_type: '',
    expiry_date: new Date(),
  });

  // Dialog state
  const [permitDialogOpen, setPermitDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permitToDelete, setPermitToDelete] = useState<WorkPermit | null>(null);

  // Permit type options
  const permitTypeOptions = [
    'Open Work Permit',
    'Closed Work Permit',
    'Student Work Permit',
    'Post-Graduation Work Permit',
    'Temporary Foreign Worker Permit',
    'Other',
  ];

  // Load data
  const loadWorkPermits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // If searching, show search results instead of work permit records
      if (searchTerm) {
        // Search for employees matching the search term
        const employeeResponse = await apiClient.get('/employees/list', {
          params: { q: searchTerm, company_id: selectedCompanyId || undefined }
        });
        setSearchResults(employeeResponse.data?.data || []);
        setWorkPermits([]); // Don't show work permit records yet
        setLoading(false);
        return;
      } else {
        // Only filter by employee if no search term is provided
        const employeeToFilter = globalSelectedEmployee?.id || selectedEmployee;
        
        if (employeeToFilter) {
          const response = await workPermitAPI.getByEmployee(employeeToFilter);
          setWorkPermits(response.data);
        } else {
          // Load all work permits if no employee selected
          const response = await workPermitAPI.list();
          setWorkPermits(response.data);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load work permits');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedEmployee, globalSelectedEmployee?.id, selectedCompanyId]);

  const loadExpiringPermits = useCallback(async () => {
    try {
      const response = await workPermitAPI.getExpiring(30);
      setExpiringPermits(response.data);
    } catch (err: any) {
      console.error('Error loading expiring permits:', err);
    }
  }, []);

  // Search functionality - using LeavePage pattern
  const handleSearch = () => {
    loadWorkPermits();
  };

  const handleSearchResultClick = async (employee: Employee) => {
    // Set the global selected employee first
    setGlobalSelectedEmployee({
      id: employee.id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone,
      status: employee.status,
    });
    
    // Then set local state
    setSelectedEmployee(employee.id);
    setSelectedEmployeeData(employee);
    setSearchTerm('');
    setSearchResults([]);
  };

  useEffect(() => {
    loadExpiringPermits();
  }, [loadExpiringPermits]);

  // Auto-select employee from global context when component mounts
  useEffect(() => {
    if (globalSelectedEmployee && !selectedEmployee) {
      setSelectedEmployee(globalSelectedEmployee.id);
      setSelectedEmployeeData(globalSelectedEmployee);
    }
  }, [globalSelectedEmployee, selectedEmployee]);

  // Load data when dependencies change
  useEffect(() => {
    // Only load if we have a search term or selected employee
    if (searchTerm || selectedEmployee || globalSelectedEmployee?.id) {
      loadWorkPermits();
    }
  }, [searchTerm, selectedEmployee, globalSelectedEmployee?.id, loadWorkPermits]);

  // Get work permits for selected employee
  const employeePermits = selectedEmployee 
    ? workPermits.filter(permit => permit.employee_id === selectedEmployee)
    : [];

  // Get current work permit (most recent)
  const currentPermit = employeePermits.length > 0 
    ? employeePermits.sort((a, b) => new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime())[0]
    : null;

  // Calculate days until expiry
  const getDaysUntilExpiry = (expiryDate: string) => {
    if (!expiryDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to midnight for accurate day calculation
    
    // Parse date safely
    let expiry: Date;
    if (expiryDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Parse YYYY-MM-DD format directly
      const [year, month, day] = expiryDate.split('-').map(Number);
      expiry = new Date(year, month - 1, day);
    } else {
      expiry = new Date(expiryDate);
      if (isNaN(expiry.getTime())) return 0;
      // Use local date components to avoid timezone issues
      const year = expiry.getFullYear();
      const month = expiry.getMonth();
      const day = expiry.getDate();
      expiry = new Date(year, month, day);
    }
    expiry.setHours(0, 0, 0, 0); // Reset to midnight for accurate day calculation
    
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Get status chip for permit
  const getStatusChip = (expiryDate: string) => {
    const days = getDaysUntilExpiry(expiryDate);
    
    if (days < 0) {
      return <Chip icon={<ErrorIcon />} label={`EXPIRED (${Math.abs(days)} days ago)`} color="error" size="small" />;
    } else if (days <= 30) {
      return <Chip icon={<WarningIcon />} label={`Expires in ${days} days`} color="warning" size="small" />;
    } else {
      return <Chip icon={<CheckCircleIcon />} label={`Valid for ${days} more days`} color="success" size="small" />;
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedEmployee) return;

    // Validate expiry date
    if (!formData.expiry_date || isNaN(formData.expiry_date.getTime())) {
      setError('Please select a valid expiry date');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Format date safely to avoid timezone issues
      const formatDateForAPI = (date: Date): string => {
        if (!date || isNaN(date.getTime())) {
          throw new Error('Invalid date');
        }
        // Use local date components to avoid timezone conversion
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const permitData = {
        employee_id: selectedEmployee,
        permit_type: formData.permit_type,
        expiry_date: formatDateForAPI(formData.expiry_date),
      };

      if (editingPermit) {
        await workPermitAPI.update(editingPermit.id, permitData);
        setSuccessMessage('Work permit updated successfully!');
      } else {
        await workPermitAPI.create(permitData);
        setSuccessMessage('Work permit added successfully!');
      }

      setPermitDialogOpen(false);
      setEditingPermit(null);
      setFormData({ permit_type: '', expiry_date: new Date() });
      loadWorkPermits();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save work permit');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!permitToDelete) return;

    try {
      setLoading(true);
      setError(null);

      await workPermitAPI.delete(permitToDelete.id);
      setSuccessMessage('Work permit deleted successfully!');
      setDeleteDialogOpen(false);
      setPermitToDelete(null);
      loadWorkPermits();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete work permit');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (permit: WorkPermit) => {
    setEditingPermit(permit);
    // Parse date string safely to avoid timezone issues
    const parseDateString = (dateStr: string): Date => {
      if (!dateStr) return new Date();
      // If it's already in YYYY-MM-DD format, parse directly
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
      // Otherwise, try parsing as Date but use local components
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          return new Date();
        }
        // Use local date components to avoid timezone shift
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        return new Date(year, month, day);
      } catch {
        return new Date();
      }
    };
    
    setFormData({
      permit_type: permit.permit_type,
      expiry_date: parseDateString(permit.expiry_date),
    });
    setPermitDialogOpen(true);
  };

  // Handle add new
  const handleAddNew = () => {
    setEditingPermit(null);
    setFormData({
      permit_type: '',
      expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    });
    setPermitDialogOpen(true);
  };

  // Check permissions
  if (!hasPermission('work_permit:manage')) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Work Permit Management
        </Typography>
        <Alert severity="error">
          Permission 'work_permit:manage' required to access Work Permit Management.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Work Permit Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddNew}
            disabled={!selectedEmployee}
          >
            Add Work Permit
          </Button>
        </Box>

        {/* Company Filter Status */}
        {selectedCompanyId && (
          <Alert severity="info" sx={{ mb: 2 }}>
            🔍 Filtered by Company: {getCompanyName()}
          </Alert>
        )}

        {/* Employee Search */}
        <Paper
          sx={{
            p: 3,
            mb: 3,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`,
            border: `1px solid ${theme.palette.primary.main}30`,
            borderRadius: 3,
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              label="Search Employee"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              sx={{ 
                minWidth: 250,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'background.paper',
                }
              }}
              placeholder="Search by name, ID, email..."
            />
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={loading}
              sx={{
                px: 3,
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              Search
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setSearchTerm('');
                setSearchResults([]);
                setSelectedEmployee('');
                setSelectedEmployeeData(null);
                setGlobalSelectedEmployee(null);
                loadWorkPermits();
              }}
              disabled={loading}
              sx={{
                px: 3,
                py: 1.5,
                fontWeight: 500,
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              Clear
            </Button>
          </Box>
        </Paper>

        {/* Search Results */}
        <Box sx={{ mt: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <Typography>Loading employees...</Typography>
            </Box>
          ) : searchResults.length === 0 && searchTerm ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No employees found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Try adjusting your search criteria.
              </Typography>
            </Paper>
          ) : searchResults.length > 0 ? (
            <Grid container spacing={3}>
              {searchResults.map((employee) => (
                <Grid item xs={12} sm={6} md={4} key={employee.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: theme.shadows[3],
                        borderColor: theme.palette.primary.main,
                      },
                    }}
                    onClick={() => handleSearchResultClick(employee)}
                  >
                    <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                      {/* Header with Avatar */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            sx={{
                              bgcolor: theme.palette.primary.main,
                              width: 48,
                              height: 48,
                            }}
                          >
                            <PersonIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                              {employee.full_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ID: {employee.id}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      
                      {/* Employee Details */}
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Status: <Chip label={employee.status} size="small" color="primary" />
                        </Typography>
                        {employee.email && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {employee.email}
                            </Typography>
                          </Box>
                        )}
                        {employee.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {employee.phone}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : null}
        </Box>

        {/* Selected Employee Info */}
        {selectedEmployeeData ? (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <PersonIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {selectedEmployeeData.full_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ID: {selectedEmployeeData.id} • {selectedEmployeeData.status}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setSearchTerm('');
                    setSearchResults([]);
                    setSelectedEmployee('');
                    setSelectedEmployeeData(null);
                    setGlobalSelectedEmployee(null);
                    loadWorkPermits();
                  }}
                >
                  Change Employee
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : null}

        {/* Main Content */}
        {selectedEmployeeData ? (
          <Box>
            <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
              <Tab label="Current Work Permit" />
              <Tab label="Work Permit History" />
              <Tab label="System Alerts" />
            </Tabs>

            {/* Current Work Permit Tab */}
            <TabPanel value={currentTab} index={0}>
              {currentPermit ? (
                <Card>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom>
                          {currentPermit.permit_type}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Expiry Date: {formatDateString(currentPermit.expiry_date)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          {getStatusChip(currentPermit.expiry_date)}
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                  <CardActions>
                    <Button
                      startIcon={<EditIcon />}
                      onClick={() => handleEdit(currentPermit)}
                    >
                      Edit Permit
                    </Button>
                    <Button
                      startIcon={<DeleteIcon />}
                      color="error"
                      onClick={() => {
                        setPermitToDelete(currentPermit);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      Delete Permit
                    </Button>
                  </CardActions>
                </Card>
              ) : (
                <Alert severity="info">
                  No work permit found for this employee.
                </Alert>
              )}
            </TabPanel>

            {/* Work Permit History Tab */}
            <TabPanel value={currentTab} index={1}>
              {employeePermits.length > 0 ? (
                <List>
                  {employeePermits.map((permit) => (
                    <React.Fragment key={permit.id}>
                      <ListItem>
                        <ListItemText
                          primary={permit.permit_type}
                          secondary={`Expires: ${formatDateString(permit.expiry_date)}`}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getStatusChip(permit.expiry_date)}
                          <IconButton
                            onClick={() => handleEdit(permit)}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => {
                              setPermitToDelete(permit);
                              setDeleteDialogOpen(true);
                            }}
                            size="small"
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Alert severity="info">
                  No work permit history found for this employee.
                </Alert>
              )}
            </TabPanel>

            {/* System Alerts Tab */}
            <TabPanel value={currentTab} index={2}>
              {expiringPermits.length > 0 ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  ⚠️ {expiringPermits.length} work permit(s) expiring in the next 30 days
                </Alert>
              ) : (
                <Alert severity="success">
                  ✅ No work permits expiring in the next 30 days
                </Alert>
              )}
              
              {expiringPermits.map((permit) => (
                <Card key={permit.id} sx={{ mb: 1 }}>
                  <CardContent>
                    <Typography variant="body1">
                      [{permit.employee_id}] {permit.employee?.full_name} - {permit.permit_type}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Expires in {getDaysUntilExpiry(permit.expiry_date)} days
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </TabPanel>
          </Box>
        ) : (
          <Alert severity="info">
            Please select an employee to manage work permits.
          </Alert>
        )}

        {/* Add/Edit Work Permit Dialog */}
        <Dialog open={permitDialogOpen} onClose={() => setPermitDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingPermit ? 'Edit Work Permit' : 'Add Work Permit'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Work Permit Type</InputLabel>
                <Select
                  value={formData.permit_type}
                  onChange={(e) => setFormData({ ...formData, permit_type: e.target.value })}
                  label="Work Permit Type"
                >
                  {permitTypeOptions.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                label="Expiry Date"
                type="date"
                value={formData.expiry_date && !isNaN(formData.expiry_date.getTime()) 
                  ? (() => {
                      // Format date safely for input field (YYYY-MM-DD)
                      const year = formData.expiry_date.getFullYear();
                      const month = String(formData.expiry_date.getMonth() + 1).padStart(2, '0');
                      const day = String(formData.expiry_date.getDate()).padStart(2, '0');
                      return `${year}-${month}-${day}`;
                    })()
                  : ''}
                onChange={(e) => {
                  const dateValue = e.target.value;
                  if (dateValue) {
                    // Parse date string directly to avoid timezone issues
                    const [year, month, day] = dateValue.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    setFormData({ ...formData, expiry_date: date });
                  } else {
                    setFormData({ ...formData, expiry_date: new Date() });
                  }
                }}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPermitDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!formData.permit_type || loading}
            >
              {editingPermit ? 'Update' : 'Add'} Work Permit
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Work Permit</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this work permit? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained" disabled={loading}>
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Error/Success Messages */}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
        >
          <Alert onClose={() => setError(null)} severity="error">
            {error}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!successMessage}
          autoHideDuration={6000}
          onClose={() => setSuccessMessage(null)}
        >
          <Alert onClose={() => setSuccessMessage(null)} severity="success">
            {successMessage}
          </Alert>
        </Snackbar>
      </Box>
  );
};

export default WorkPermitPage;
