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
  Avatar,
  Divider,
  useTheme,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Work as WorkIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Preview as PreviewIcon,
  CloudUpload as CloudUploadIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { employeeAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useSelectedEmployee } from '../contexts/SelectedEmployeeContext';
import { useCompanyFilter } from '../hooks/useCompanyFilter';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  other_name?: string;
  full_name: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  dob?: string;
  sin?: string;
  drivers_license?: string;
  hire_date?: string;
  probation_end_date?: string;
  seniority_start_date?: string;
  status: string;
  remarks?: string;
  paystub: boolean;
  union_member: boolean;
  use_mailing_address: boolean;
  mailing_street?: string;
  mailing_city?: string;
  mailing_province?: string;
  mailing_postal_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  company_id?: string;
  company_short_form?: string;
  created_at?: string;
  updated_at?: string;
}

const EmployeePage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    first_name: '',
    last_name: '',
    other_name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    province: '',
    postal_code: '',
    dob: '',
    sin: '',
    drivers_license: '',
    hire_date: '',
    probation_end_date: '',
    seniority_start_date: '',
    status: 'Active',
    remarks: '',
    union_member: false,
    use_mailing_address: false,
    mailing_street: '',
    mailing_city: '',
    mailing_province: '',
    mailing_postal_code: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });
  const [error, setError] = useState('');
  
  // Upload functionality state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  const { hasPermission } = useAuth();
  const { selectedEmployee: globalSelectedEmployee, setSelectedEmployee: setGlobalSelectedEmployee } = useSelectedEmployee();
  const { selectedCompanyId, isFilterActive, getCompanyName } = useCompanyFilter();
  const theme = useTheme();


  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await employeeAPI.list({ 
        q: searchTerm,
        company_id: selectedCompanyId || undefined
      });
      
      // Check if response has success field (new format) or is direct array (old format)
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setEmployees(response.data.data);
      } else if (Array.isArray(response.data)) {
        setEmployees(response.data);
      } else {
        setEmployees([]);
      }
    } catch (err: any) {
      console.error('Error loading employees:', err);
      setError(err.response?.data?.detail || 'Failed to load employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCompanyId]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleSearch = () => {
    loadEmployees();
  };

  const handleDeleteClick = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;

    try {
      await employeeAPI.delete(employeeToDelete.id);
      setEmployees(employees.filter(emp => emp.id !== employeeToDelete.id));
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
      // Clear selection if deleted employee was selected
      if (selectedEmployee?.id === employeeToDelete.id) {
        setSelectedEmployee(null);
        setIsEditing(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete employee');
    }
  };

  const handleEmployeeSelect = (employee: Employee) => {
    // If editing, cancel first
    if (isEditing) {
      setIsEditing(false);
    }
    setSelectedEmployee(employee);
    // Set the global selected employee for cross-page functionality
    setGlobalSelectedEmployee({
      id: employee.id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone,
      status: employee.status,
    });
  };

  const handleEditClick = () => {
    if (!selectedEmployee) return;
    setFormData({
      employee_id: selectedEmployee.id,
      first_name: selectedEmployee.first_name,
      last_name: selectedEmployee.last_name,
      other_name: selectedEmployee.other_name || '',
      email: selectedEmployee.email || '',
      phone: selectedEmployee.phone || '',
      street: selectedEmployee.street || '',
      city: selectedEmployee.city || '',
      province: selectedEmployee.province || '',
      postal_code: selectedEmployee.postal_code || '',
      dob: selectedEmployee.dob || '',
      sin: selectedEmployee.sin || '',
      drivers_license: selectedEmployee.drivers_license || '',
      hire_date: selectedEmployee.hire_date || '',
      probation_end_date: selectedEmployee.probation_end_date || '',
      seniority_start_date: selectedEmployee.seniority_start_date || '',
      status: selectedEmployee.status,
      remarks: selectedEmployee.remarks || '',
      union_member: selectedEmployee.union_member || false,
      use_mailing_address: selectedEmployee.use_mailing_address || false,
      mailing_street: selectedEmployee.mailing_street || '',
      mailing_city: selectedEmployee.mailing_city || '',
      mailing_province: selectedEmployee.mailing_province || '',
      mailing_postal_code: selectedEmployee.mailing_postal_code || '',
      emergency_contact_name: selectedEmployee.emergency_contact_name || '',
      emergency_contact_phone: selectedEmployee.emergency_contact_phone || '',
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedEmployee) return;
    
    try {
      // Prepare data for API
      const submitData = {
        ...formData,
        other_name: formData.other_name || "",
        email: formData.email || "",
        phone: formData.phone || "",
        street: formData.street || "",
        city: formData.city || "",
        province: formData.province || "",
        postal_code: formData.postal_code || "",
        dob: formData.dob || null,
        sin: formData.sin || "",
        drivers_license: formData.drivers_license || "",
        hire_date: formData.hire_date || null,
        probation_end_date: formData.probation_end_date || null,
        seniority_start_date: formData.seniority_start_date || null,
        remarks: formData.remarks || "",
        union_member: formData.union_member,
        use_mailing_address: formData.use_mailing_address,
        mailing_street: formData.mailing_street || "",
        mailing_city: formData.mailing_city || "",
        mailing_province: formData.mailing_province || "",
        mailing_postal_code: formData.mailing_postal_code || "",
        emergency_contact_name: formData.emergency_contact_name || "",
        emergency_contact_phone: formData.emergency_contact_phone || "",
      };

      await employeeAPI.update(selectedEmployee.id, submitData);
      
      // Refresh the employee list
      await loadEmployees();
      
      // Update selected employee with new data
      const updatedEmployee = {
        ...selectedEmployee,
        first_name: formData.first_name,
        last_name: formData.last_name,
        full_name: `${formData.first_name} ${formData.last_name}`,
        other_name: formData.other_name,
        email: formData.email,
        phone: formData.phone,
        street: formData.street,
        city: formData.city,
        province: formData.province,
        postal_code: formData.postal_code,
        dob: formData.dob,
        sin: formData.sin,
        drivers_license: formData.drivers_license,
        hire_date: formData.hire_date,
        probation_end_date: formData.probation_end_date,
        seniority_start_date: formData.seniority_start_date,
        status: formData.status,
        remarks: formData.remarks,
        union_member: formData.union_member,
        use_mailing_address: formData.use_mailing_address,
        mailing_street: formData.mailing_street,
        mailing_city: formData.mailing_city,
        mailing_province: formData.mailing_province,
        mailing_postal_code: formData.mailing_postal_code,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
      };
      setSelectedEmployee(updatedEmployee);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Save error:', err.response?.data);
      if (err.response?.status === 422) {
        const validationErrors = err.response?.data?.errors || [];
        const errorMessages = validationErrors.map((error: any) => 
          `${error.loc?.join('.')}: ${error.msg}`
        ).join(', ');
        setError(`Validation error: ${errorMessages}`);
      } else {
        setError(err.response?.data?.detail || 'Failed to update employee');
      }
    }
  };

  const handleCreateSubmit = async () => {
    try {
      if (!formData.first_name || !formData.last_name) {
        setError('First name and last name are required');
        return;
      }
      
      // Use provided employee ID or generate one
      let employeeId = formData.employee_id?.trim();
      if (!employeeId) {
        const firstNamePrefix = formData.first_name.substring(0, 2).toUpperCase();
        const lastNamePrefix = formData.last_name.substring(0, 2).toUpperCase();
        const timestamp = Date.now().toString().slice(-6);
        employeeId = `${firstNamePrefix}${lastNamePrefix}-${timestamp}`;
      }

      const submitData = {
        id: employeeId,
        ...formData,
        other_name: formData.other_name || "",
        email: formData.email || "",
        phone: formData.phone || "",
        street: formData.street || "",
        city: formData.city || "",
        province: formData.province || "",
        postal_code: formData.postal_code || "",
        dob: formData.dob || null,
        sin: formData.sin || "",
        drivers_license: formData.drivers_license || "",
        hire_date: formData.hire_date || null,
        probation_end_date: formData.probation_end_date || null,
        seniority_start_date: formData.seniority_start_date || null,
        remarks: formData.remarks || "",
        union_member: formData.union_member,
        use_mailing_address: formData.use_mailing_address,
        mailing_street: formData.mailing_street || "",
        mailing_city: formData.mailing_city || "",
        mailing_province: formData.mailing_province || "",
        mailing_postal_code: formData.mailing_postal_code || "",
        emergency_contact_name: formData.emergency_contact_name || "",
        emergency_contact_phone: formData.emergency_contact_phone || "",
      };

      await employeeAPI.create(submitData);
      await loadEmployees();
      handleCreateDialogClose();
    } catch (err: any) {
      console.error('Create error:', err.response?.data);
      if (err.response?.status === 422) {
        const validationErrors = err.response?.data?.errors || [];
        const errorMessages = validationErrors.map((error: any) => 
          `${error.loc?.join('.')}: ${error.msg}`
        ).join(', ');
        setError(`Validation error: ${errorMessages}`);
      } else {
        setError(err.response?.data?.detail || 'Failed to create employee');
      }
    }
  };

  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
    setFormData({
      employee_id: '',
      first_name: '',
      last_name: '',
      other_name: '',
      email: '',
      phone: '',
      street: '',
      city: '',
      province: '',
      postal_code: '',
      dob: '',
      sin: '',
      drivers_license: '',
      hire_date: '',
      probation_end_date: '',
      seniority_start_date: '',
      status: 'Active',
      remarks: '',
      union_member: false,
      use_mailing_address: false,
      mailing_street: '',
      mailing_city: '',
      mailing_province: '',
      mailing_postal_code: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Upload functionality
  const downloadTemplate = async () => {
    try {
      const response = await employeeAPI.downloadTemplate();
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'employee_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to download template');
    }
  };

  const previewUpload = async () => {
    if (!selectedFile) return;
    
    try {
      setPreviewLoading(true);
      const response = await employeeAPI.previewUpload(selectedFile);
      setPreviewData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to preview file');
    } finally {
      setPreviewLoading(false);
    }
  };

  const executeUpload = async () => {
    if (!selectedFile || !previewData) return;
    
    try {
      setUploadLoading(true);
      const response = await employeeAPI.upload(selectedFile);
      setUploadResult(response.data);
      
      if (response.data.success_count > 0) {
        loadEmployees();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploadLoading(false);
    }
  };

  const resetUploadDialog = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setUploadResult(null);
    setUploadDialogOpen(false);
  };

  const filteredEmployees = employees.filter(emp => {
    if (globalSelectedEmployee) {
      return emp.id === globalSelectedEmployee.id;
    }
    if (statusFilter === 'All') {
      return emp.status !== 'Terminated';
    }
    return emp.status === statusFilter;
  });

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(emp => emp.status === 'Active').length;
  const onLeaveEmployees = employees.filter(emp => emp.status === 'On Leave' || emp.status === 'Probation').length;
  const terminatedEmployees = employees.filter(emp => emp.status === 'Terminated').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'On Leave':
        return 'warning';
      case 'Terminated':
        return 'error';
      case 'Probation':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
          Employee Directory
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Manage and view all employee information in your organization
        </Typography>
        
        {/* Company Filter Indicator */}
        {isFilterActive && (
          <Paper 
            sx={{ 
              p: 2, 
              mb: 3, 
              background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
              border: `1px solid ${theme.palette.info.main}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <WorkIcon sx={{ color: 'info.main', fontSize: 32 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'info.main' }}>
                    Company Filter Active: {getCompanyName()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Showing employees from selected company only
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        )}

        {/* Global Selection Indicator */}
        {globalSelectedEmployee && (
          <Paper 
            sx={{ 
              p: 2, 
              mb: 3, 
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
              border: `1px solid ${theme.palette.primary.main}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: theme.palette.primary.main,
                    width: 40,
                    height: 40,
                    fontSize: '1rem',
                    fontWeight: 'bold',
                  }}
                >
                  {getInitials(globalSelectedEmployee.first_name, globalSelectedEmployee.last_name)}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    {globalSelectedEmployee.full_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Currently selected for cross-page operations
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setGlobalSelectedEmployee(null)}
                sx={{ textTransform: 'none' }}
              >
                Clear Selection
              </Button>
            </Box>
          </Paper>
        )}
        
        {/* Statistics Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 1.5, textAlign: 'center', background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)` }}>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
                {totalEmployees}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                Total Employees
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 1.5, textAlign: 'center', background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)` }}>
              <Typography variant="h5" color="success.main" sx={{ fontWeight: 700 }}>
                {activeEmployees}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                Active
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 1.5, textAlign: 'center', background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)` }}>
              <Typography variant="h5" color="warning.main" sx={{ fontWeight: 700 }}>
                {onLeaveEmployees}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                On Leave and On Probation
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 1.5, textAlign: 'center', background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)` }}>
              <Typography variant="h5" color="info.main" sx={{ fontWeight: 700 }}>
                {terminatedEmployees}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                Terminated
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Search and Filter Controls */}
      <Paper 
        sx={{ 
          p: 2, 
          mb: 3, 
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="Search employees"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            size="small"
            sx={{ 
              minWidth: 220,
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.paper',
              }
            }}
            placeholder="Search by name, ID, email..."
          />
          <FormControl sx={{ minWidth: 160 }} size="small">
            <InputLabel>Status Filter</InputLabel>
            <Select
              value={statusFilter}
              label="Status Filter"
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{
                backgroundColor: 'background.paper',
              }}
            >
              <MenuItem value="All">All Employees</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="On Leave">On Leave</MenuItem>
              <MenuItem value="Terminated">Terminated</MenuItem>
              <MenuItem value="Probation">Probation</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            disabled={loading}
            size="small"
            sx={{
              px: 2,
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
              setStatusFilter('All');
              loadEmployees();
            }}
            disabled={loading}
            size="small"
            sx={{
              px: 2,
              fontWeight: 500,
              textTransform: 'none',
              borderRadius: 2,
            }}
          >
            Clear
          </Button>
          {hasPermission('employee:create') && (
            <>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={downloadTemplate}
                size="small"
                sx={{ 
                  px: 2,
                  fontWeight: 500,
                  textTransform: 'none',
                  borderRadius: 2,
                }}
              >
                Download Template
              </Button>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setUploadDialogOpen(true)}
                size="small"
                sx={{ 
                  px: 2,
                  fontWeight: 500,
                  textTransform: 'none',
                  borderRadius: 2,
                }}
              >
                Import Employees
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setFormData({
                    employee_id: '',
                    first_name: '',
                    last_name: '',
                    other_name: '',
                    email: '',
                    phone: '',
                    street: '',
                    city: '',
                    province: '',
                    postal_code: '',
                    dob: '',
                    sin: '',
                    drivers_license: '',
                    hire_date: '',
                    probation_end_date: '',
                    seniority_start_date: '',
                    status: 'Active',
                    remarks: '',
                    union_member: false,
                    use_mailing_address: false,
                    mailing_street: '',
                    mailing_city: '',
                    mailing_province: '',
                    mailing_postal_code: '',
                    emergency_contact_name: '',
                    emergency_contact_phone: '',
                  });
                  setError('');
                  setCreateDialogOpen(true);
                }}
                size="small"
                sx={{ 
                  ml: 'auto',
                  px: 2,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 2,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                  '&:hover': {
                    background: `linear-gradient(45deg, ${theme.palette.primary.dark} 30%, ${theme.palette.secondary.dark} 90%)`,
                  }
                }}
              >
                Create Employee
              </Button>
            </>
          )}
        </Box>
      </Paper>

      {/* Master-Detail Layout */}
      <Box sx={{ display: 'flex', gap: 3, mt: 3 }}>
        {/* Left Panel - Employee List */}
        <Paper 
          sx={{ 
            width: '28%', 
            minWidth: 280,
            maxHeight: 'calc(100vh - 320px)',
            minHeight: 500,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Employees ({filteredEmployees.length})
            </Typography>
          </Box>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, p: 4 }}>
              <Typography color="text.secondary">Loading employees...</Typography>
            </Box>
          ) : filteredEmployees.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, p: 4 }}>
              <Typography color="text.secondary" textAlign="center">
                No employees found.<br />
                Try adjusting your search criteria.
              </Typography>
            </Box>
          ) : (
            <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
              {filteredEmployees.map((employee) => (
                <ListItem key={employee.id} disablePadding>
                  <ListItemButton
                    selected={selectedEmployee?.id === employee.id}
                    onClick={() => handleEmployeeSelect(employee)}
                    sx={{
                      py: 1.5,
                      px: 2,
                      '&.Mui-selected': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.12),
                        borderLeft: `3px solid ${theme.palette.primary.main}`,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.18),
                        },
                      },
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.06),
                      },
                    }}
                  >
                    <ListItemText 
                      primary={employee.full_name}
                      primaryTypographyProps={{
                        fontWeight: selectedEmployee?.id === employee.id ? 600 : 400,
                        fontSize: '0.95rem',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>

        {/* Right Panel - Employee Details */}
        <Paper 
          sx={{ 
            flex: 1,
            minHeight: 500,
            maxHeight: 'calc(100vh - 320px)',
            overflow: 'auto',
            p: 3,
          }}
        >
          {!selectedEmployee ? (
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%',
                minHeight: 350,
                color: 'text.secondary',
              }}
            >
              <PersonIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6">Select an employee</Typography>
              <Typography variant="body2">
                Choose an employee from the list to view their details
              </Typography>
            </Box>
          ) : (
            <>
              {/* Header with actions */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: theme.palette.primary.main,
                      width: 48,
                      height: 48,
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {getInitials(selectedEmployee.first_name, selectedEmployee.last_name)}
                  </Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {selectedEmployee.full_name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Employee ID: {selectedEmployee.id}
                      </Typography>
                      <Chip
                        label={selectedEmployee.status}
                        color={getStatusColor(selectedEmployee.status) as any}
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {isEditing ? (
                    <>
                      <Button
                        variant="outlined"
                        startIcon={<CancelIcon />}
                        onClick={handleCancelEdit}
                        sx={{ textTransform: 'none' }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSaveEdit}
                        sx={{ textTransform: 'none' }}
                      >
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      {hasPermission('employee:update') && (
                        <Button
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={handleEditClick}
                          sx={{ textTransform: 'none' }}
                        >
                          Edit
                        </Button>
                      )}
                      {hasPermission('employee:delete') && (
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteClick(selectedEmployee)}
                          sx={{ textTransform: 'none' }}
                        >
                          Delete
                        </Button>
                      )}
                    </>
                  )}
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Employee Details Form */}
              <Grid container spacing={2}>
                {/* Personal Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
                    Personal Information
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={isEditing ? formData.first_name : selectedEmployee.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    InputProps={{ readOnly: !isEditing }}
                    variant="outlined"
                    required={isEditing}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={isEditing ? formData.last_name : selectedEmployee.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    InputProps={{ readOnly: !isEditing }}
                    variant="outlined"
                    required={isEditing}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Other Name"
                    value={isEditing ? formData.other_name : (selectedEmployee.other_name || '')}
                    onChange={(e) => setFormData({ ...formData, other_name: e.target.value })}
                    InputProps={{ readOnly: !isEditing }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={isEditing ? formData.email : (selectedEmployee.email || '')}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    InputProps={{ readOnly: !isEditing }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={isEditing ? formData.phone : (selectedEmployee.phone || '')}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    InputProps={{ readOnly: !isEditing }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      label="Date of Birth"
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  ) : (
                    <TextField
                      fullWidth
                      label="Date of Birth"
                      value={selectedEmployee.dob ? formatDate(selectedEmployee.dob) : ''}
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                    />
                  )}
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="SIN"
                    value={isEditing ? formData.sin : (selectedEmployee.sin || '')}
                    onChange={(e) => setFormData({ ...formData, sin: e.target.value })}
                    InputProps={{ readOnly: !isEditing }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Driver's License"
                    value={isEditing ? formData.drivers_license : (selectedEmployee.drivers_license || '')}
                    onChange={(e) => setFormData({ ...formData, drivers_license: e.target.value })}
                    InputProps={{ readOnly: !isEditing }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  {isEditing ? (
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={formData.status}
                        label="Status"
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <MenuItem value="Active">Active</MenuItem>
                        <MenuItem value="On Leave">On Leave</MenuItem>
                        <MenuItem value="Terminated">Terminated</MenuItem>
                        <MenuItem value="Probation">Probation</MenuItem>
                      </Select>
                    </FormControl>
                  ) : (
                    <TextField
                      fullWidth
                      label="Status"
                      value={selectedEmployee.status}
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                    />
                  )}
                </Grid>

                {/* Address Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2, color: 'primary.main', fontWeight: 600 }}>
                    Address Information
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Street Address"
                    value={isEditing ? formData.street : (selectedEmployee.street || '')}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    InputProps={{ readOnly: !isEditing }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="City"
                    value={isEditing ? formData.city : (selectedEmployee.city || '')}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    InputProps={{ readOnly: !isEditing }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Province"
                    value={isEditing ? formData.province : (selectedEmployee.province || '')}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    InputProps={{ readOnly: !isEditing }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Postal Code"
                    value={isEditing ? formData.postal_code : (selectedEmployee.postal_code || '')}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    InputProps={{ readOnly: !isEditing }}
                    variant="outlined"
                  />
                </Grid>

                {/* Mailing Address */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2, color: 'primary.main', fontWeight: 600 }}>
                    Mailing Address
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  {isEditing ? (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.use_mailing_address}
                          onChange={(e) => setFormData({ ...formData, use_mailing_address: e.target.checked })}
                        />
                      }
                      label="Use separate mailing address"
                    />
                  ) : (
                    <TextField
                      fullWidth
                      label="Use Separate Mailing Address"
                      value={selectedEmployee.use_mailing_address ? 'Yes' : 'No'}
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                    />
                  )}
                </Grid>
                {(isEditing ? formData.use_mailing_address : selectedEmployee.use_mailing_address) && (
                  <>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Mailing Street Address"
                        value={isEditing ? formData.mailing_street : (selectedEmployee.mailing_street || '')}
                        onChange={(e) => setFormData({ ...formData, mailing_street: e.target.value })}
                        InputProps={{ readOnly: !isEditing }}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Mailing City"
                        value={isEditing ? formData.mailing_city : (selectedEmployee.mailing_city || '')}
                        onChange={(e) => setFormData({ ...formData, mailing_city: e.target.value })}
                        InputProps={{ readOnly: !isEditing }}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Mailing Province"
                        value={isEditing ? formData.mailing_province : (selectedEmployee.mailing_province || '')}
                        onChange={(e) => setFormData({ ...formData, mailing_province: e.target.value })}
                        InputProps={{ readOnly: !isEditing }}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Mailing Postal Code"
                        value={isEditing ? formData.mailing_postal_code : (selectedEmployee.mailing_postal_code || '')}
                        onChange={(e) => setFormData({ ...formData, mailing_postal_code: e.target.value })}
                        InputProps={{ readOnly: !isEditing }}
                        variant="outlined"
                      />
                    </Grid>
                  </>
                )}

                {/* Employment Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2, color: 'primary.main', fontWeight: 600 }}>
                    Employment Information
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      label="Hire Date"
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  ) : (
                    <TextField
                      fullWidth
                      label="Hire Date"
                      value={selectedEmployee.hire_date ? formatDate(selectedEmployee.hire_date) : ''}
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                    />
                  )}
                </Grid>
                <Grid item xs={12} sm={4}>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      label="Probation End Date"
                      type="date"
                      value={formData.probation_end_date}
                      onChange={(e) => setFormData({ ...formData, probation_end_date: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  ) : (
                    <TextField
                      fullWidth
                      label="Probation End Date"
                      value={selectedEmployee.probation_end_date ? formatDate(selectedEmployee.probation_end_date) : ''}
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                    />
                  )}
                </Grid>
                <Grid item xs={12} sm={4}>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      label="Seniority Start Date"
                      type="date"
                      value={formData.seniority_start_date}
                      onChange={(e) => setFormData({ ...formData, seniority_start_date: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  ) : (
                    <TextField
                      fullWidth
                      label="Seniority Start Date"
                      value={selectedEmployee.seniority_start_date ? formatDate(selectedEmployee.seniority_start_date) : ''}
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                    />
                  )}
                </Grid>
                <Grid item xs={12} sm={4}>
                  {isEditing ? (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.union_member}
                          onChange={(e) => setFormData({ ...formData, union_member: e.target.checked })}
                        />
                      }
                      label="Union Member"
                    />
                  ) : (
                    <TextField
                      fullWidth
                      label="Union Member"
                      value={selectedEmployee.union_member ? 'Yes' : 'No'}
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                    />
                  )}
                </Grid>

                {/* Emergency Contact */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2, color: 'primary.main', fontWeight: 600 }}>
                    Emergency Contact
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Emergency Contact Name"
                    value={isEditing ? formData.emergency_contact_name : (selectedEmployee.emergency_contact_name || '')}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    InputProps={{ readOnly: !isEditing }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Emergency Contact Phone"
                    value={isEditing ? formData.emergency_contact_phone : (selectedEmployee.emergency_contact_phone || '')}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    InputProps={{ readOnly: !isEditing }}
                    variant="outlined"
                  />
                </Grid>

                {/* Additional Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2, color: 'primary.main', fontWeight: 600 }}>
                    Additional Information
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Remarks"
                    multiline
                    rows={3}
                    value={isEditing ? formData.remarks : (selectedEmployee.remarks || '')}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    InputProps={{ readOnly: !isEditing }}
                    variant="outlined"
                  />
                </Grid>
              </Grid>
            </>
          )}
        </Paper>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Employee</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete employee {employeeToDelete?.full_name}?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Employee Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCreateDialogClose} maxWidth="lg" fullWidth>
        <DialogTitle>Create Employee</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Personal Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Personal Information</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Employee ID"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                helperText="Optional - leave blank to auto-generate"
                placeholder="e.g., PR1, PR10, etc."
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Other Name"
                value={formData.other_name}
                onChange={(e) => setFormData({ ...formData, other_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="SIN"
                value={formData.sin}
                onChange={(e) => setFormData({ ...formData, sin: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Driver's License"
                value={formData.drivers_license}
                onChange={(e) => setFormData({ ...formData, drivers_license: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="On Leave">On Leave</MenuItem>
                  <MenuItem value="Terminated">Terminated</MenuItem>
                  <MenuItem value="Probation">Probation</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Address Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Address Information</Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street Address"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Province"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Postal Code"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              />
            </Grid>

            {/* Mailing Address */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Mailing Address</Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.use_mailing_address}
                    onChange={(e) => setFormData({ ...formData, use_mailing_address: e.target.checked })}
                  />
                }
                label="Use separate mailing address"
              />
            </Grid>
            {formData.use_mailing_address && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Mailing Street Address"
                    value={formData.mailing_street}
                    onChange={(e) => setFormData({ ...formData, mailing_street: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Mailing City"
                    value={formData.mailing_city}
                    onChange={(e) => setFormData({ ...formData, mailing_city: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Mailing Province"
                    value={formData.mailing_province}
                    onChange={(e) => setFormData({ ...formData, mailing_province: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Mailing Postal Code"
                    value={formData.mailing_postal_code}
                    onChange={(e) => setFormData({ ...formData, mailing_postal_code: e.target.value })}
                  />
                </Grid>
              </>
            )}

            {/* Employment Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Employment Information</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Hire Date"
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Probation End Date"
                type="date"
                value={formData.probation_end_date}
                onChange={(e) => setFormData({ ...formData, probation_end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Seniority Start Date"
                type="date"
                value={formData.seniority_start_date}
                onChange={(e) => setFormData({ ...formData, seniority_start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.union_member}
                    onChange={(e) => setFormData({ ...formData, union_member: e.target.checked })}
                  />
                }
                label="Union Member"
              />
            </Grid>

            {/* Emergency Contact */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Emergency Contact</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Emergency Contact Name"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Emergency Contact Phone"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
              />
            </Grid>

            {/* Additional Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Additional Information</Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Remarks"
                multiline
                rows={3}
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateDialogClose}>Cancel</Button>
          <Button onClick={handleCreateSubmit} variant="contained">
            Create Employee
          </Button>
        </DialogActions>
      </Dialog>

      {/* Employee Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={resetUploadDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CloudUploadIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant="h6">Import Employees</Typography>
              <Typography variant="body2" color="text.secondary">
                Upload Excel file to import employee data
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {!previewData && !uploadResult && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Step 1: Download Template
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Download the Excel template to see the required format, then fill it with your employee data.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={downloadTemplate}
                sx={{ mb: 3 }}
              >
                Download Template
              </Button>

              <Typography variant="h6" gutterBottom>
                Step 2: Upload File
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select your filled Excel file to preview the data before importing.
              </Typography>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                style={{ marginBottom: 16 }}
              />
              {selectedFile && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Selected file: {selectedFile.name}
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<PreviewIcon />}
                    onClick={previewUpload}
                    disabled={previewLoading}
                    sx={{ mr: 2 }}
                  >
                    {previewLoading ? 'Previewing...' : 'Preview Upload'}
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {previewData && !uploadResult && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Preview Results
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Total rows: {previewData.total_rows} | 
                  Valid: {previewData.valid_rows} | 
                  Invalid: {previewData.invalid_rows}
                </Typography>
              </Box>
              
              {previewData.rows && previewData.rows.length > 0 && (
                <Box sx={{ maxHeight: 400, overflow: 'auto', mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Row</TableCell>
                        <TableCell>Employee ID</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Company</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Error</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewData.rows.slice(0, 10).map((row: any) => (
                        <TableRow key={row.row_number}>
                          <TableCell>{row.row_number}</TableCell>
                          <TableCell>{row.employee_id}</TableCell>
                          <TableCell>{row.full_name}</TableCell>
                          <TableCell>{row.company_id}</TableCell>
                          <TableCell>
                            <Chip
                              label={row.will_import ? 'Valid' : 'Invalid'}
                              color={row.will_import ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {row.error_message && (
                              <Typography variant="caption" color="error">
                                {row.error_message}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {previewData.rows.length > 10 && (
                    <Typography variant="caption" color="text.secondary">
                      Showing first 10 rows...
                    </Typography>
                  )}
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<CloudUploadIcon />}
                  onClick={executeUpload}
                  disabled={uploadLoading || previewData.valid_rows === 0}
                  color="primary"
                >
                  {uploadLoading ? 'Uploading...' : `Import ${previewData.valid_rows} Employees`}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setPreviewData(null);
                    setSelectedFile(null);
                  }}
                >
                  Upload Different File
                </Button>
              </Box>
            </Box>
          )}

          {uploadResult && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Import Results
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="success.main">
                  Successfully imported: {uploadResult.success_count} employees
                </Typography>
                {uploadResult.error_count > 0 && (
                  <Typography variant="body2" color="error.main">
                    Errors: {uploadResult.error_count} employees
                  </Typography>
                )}
              </Box>

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <Box sx={{ maxHeight: 200, overflow: 'auto', mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Error Details:
                  </Typography>
                  {uploadResult.errors.slice(0, 5).map((error: any, index: number) => (
                    <Typography key={index} variant="caption" color="error" display="block">
                      Row {error.row_number}: {error.error_message}
                    </Typography>
                  ))}
                  {uploadResult.errors.length > 5 && (
                    <Typography variant="caption" color="text.secondary">
                      ... and {uploadResult.errors.length - 5} more errors
                    </Typography>
                  )}
                </Box>
              )}

              <Button
                variant="contained"
                onClick={resetUploadDialog}
                sx={{ mt: 2 }}
              >
                Close
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default EmployeePage;
