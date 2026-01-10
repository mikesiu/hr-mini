import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Paper,
  Avatar,
  useTheme,
  alpha,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Work as WorkIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { employmentAPI, employeeAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useSelectedEmployee } from '../contexts/SelectedEmployeeContext';
import { useCompanyFilter } from '../hooks/useCompanyFilter';

interface Employment {
  id: number;
  employee_id: string;
  company_id: string;
  position: string;
  department?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  remarks?: string;
  wage_classification?: string;
  count_all_ot?: boolean;
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

const EmploymentPage: React.FC = () => {
  const [employments, setEmployments] = useState<Employment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEmployment, setEditingEmployment] = useState<Employment | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [showEmployeeSearchResults, setShowEmployeeSearchResults] = useState(false);
  const [selectingEmployee, setSelectingEmployee] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    company_id: '',
    position: '',
    department: '',
    start_date: '',
    end_date: '',
    remarks: '',
    wage_classification: '',
    count_all_ot: false,
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    // Parse the date string as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString();
  };

  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    // Return the date string as-is for input fields (should be YYYY-MM-DD format)
    return dateString;
  };

  const { hasPermission } = useAuth();
  const { selectedEmployee: globalSelectedEmployee, setSelectedEmployee: setGlobalSelectedEmployee, clearSelection } = useSelectedEmployee();
  const { selectedCompanyId, isFilterActive, getCompanyName } = useCompanyFilter();
  const theme = useTheme();

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const loadEmployments = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      // If there's a search term, search for employees first instead of employment records
      if (searchTerm) {
        // Search for employees matching the search term
        const searchParams: any = { q: searchTerm };
        if (selectedCompanyId) {
          searchParams.company_id = selectedCompanyId;
        }
        const employeeResponse = await employeeAPI.list(searchParams);
        if (employeeResponse.data.success) {
          setSearchResults(employeeResponse.data.data || []);
        } else {
          setSearchResults([]);
        }
        setShowEmployeeSearchResults(true);
        setIsSearchActive(true);
        setEmployments([]); // Don't show employment records yet
        setLoading(false);
        return;
      } else {
        // Only filter by employee if no search term is provided
        const employeeToFilter = globalSelectedEmployee?.id;
        if (employeeToFilter) {
          params.employee_id = employeeToFilter;
        } else {
          // No employee selected and no search - don't load any data
          setEmployments([]);
          setIsSearchActive(false);
          setShowEmployeeSearchResults(false);
          setLoading(false);
          return;
        }
        setIsSearchActive(false);
        setShowEmployeeSearchResults(false);
      }
      
      // Add company filter if specified
      if (selectedCompanyId) {
        params.company_id = selectedCompanyId;
      }
      
      const response = await employmentAPI.list(params);
      if (response.data.success) {
        setEmployments(response.data.data || []);
      } else {
        setEmployments([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load employment records');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, globalSelectedEmployee?.id, selectedCompanyId]);

  useEffect(() => {
    loadEmployments();
    loadEmployees();
  }, [loadEmployments]);

  const loadEmployees = async () => {
    try {
      const response = await employeeAPI.list();
      if (response.data.success) {
        setEmployees(response.data.data || []);
      } else {
        setEmployees([]);
      }
    } catch (err: any) {
      console.error('Failed to load employees:', err);
      setEmployees([]);
    }
  };

  const handleSearch = () => {
    loadEmployments();
  };


  const handleSearchResultClick = async (employee: Employee) => {
    // Set loading state for this specific employee
    setSelectingEmployee(employee.id);
    
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
    
    // Load employment records for this employee first
    try {
      setLoading(true);
      const response = await employmentAPI.list({ employee_id: employee.id });
      if (response.data.success) {
        setEmployments(response.data.data || []);
      } else {
        setEmployments([]);
      }
      
      // Only clear search states after data is successfully loaded
      // Add a small delay to ensure smooth transition
      setTimeout(() => {
        setSearchTerm('');
        setShowEmployeeSearchResults(false);
        setIsSearchActive(false);
        setSearchResults([]);
      }, 100);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load employment records');
    } finally {
      setLoading(false);
      setSelectingEmployee(null);
    }
  };

  const handleOpenDialog = (employment?: Employment) => {
    if (employment) {
      setEditingEmployment(employment);
      setFormData({
        employee_id: employment.employee_id,
        company_id: employment.company_id,
        position: employment.position,
        department: employment.department || '',
        start_date: employment.start_date,
        end_date: employment.end_date || '',
        remarks: employment.remarks || '',
        wage_classification: employment.wage_classification || '',
        count_all_ot: employment.count_all_ot || false,
      });
    } else {
      setEditingEmployment(null);
      // Pre-populate with selected employee if available
      const selectedEmployeeId = globalSelectedEmployee?.id;
      setFormData({
        employee_id: selectedEmployeeId || '',
        company_id: '',
        position: '',
        department: '',
        start_date: '',
        end_date: '',
        remarks: '',
        wage_classification: '',
        count_all_ot: false,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingEmployment(null);
    setFormData({
      employee_id: '',
      company_id: '',
      position: '',
      department: '',
      start_date: '',
      end_date: '',
      remarks: '',
      wage_classification: '',
      count_all_ot: false,
    });
  };

  const handleSubmit = async () => {
    try {
      const submitData = {
        ...formData,
        end_date: formData.end_date || undefined,
      };

      if (editingEmployment) {
        await employmentAPI.update(editingEmployment.id, submitData);
      } else {
        await employmentAPI.create(submitData);
      }

      handleCloseDialog();
      loadEmployments();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save employment record');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this employment record?')) {
      try {
        await employmentAPI.delete(id);
        loadEmployments();
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to delete employment record');
      }
    }
  };

  const columns: GridColDef[] = [
    { 
      field: 'employee_name', 
      headerName: 'Employee', 
      width: 200,
      valueGetter: (params) => {
        const employee = employees.find(emp => emp.id === params.row.employee_id);
        return employee ? employee.full_name : params.row.employee_id;
      }
    },
    { field: 'position', headerName: 'Position', width: 150 },
    { field: 'department', headerName: 'Department', width: 150 },
    { 
      field: 'start_date', 
      headerName: 'Start Date', 
      width: 120,
      valueGetter: (params) => formatDate(params.value)
    },
    { 
      field: 'end_date', 
      headerName: 'End Date', 
      width: 120,
      valueGetter: (params) => params.value ? formatDate(params.value) : 'Current'
    },
    { 
      field: 'is_active', 
      headerName: 'Status', 
      width: 100,
      renderCell: (params) => (
        <Chip 
          label={params.value ? 'Active' : 'Inactive'} 
          color={params.value ? 'success' : 'default'} 
          size="small" 
        />
      )
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleOpenDialog(params.row)}
          disabled={!hasPermission('employment:update')}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => handleDelete(params.row.id)}
          disabled={!hasPermission('employment:delete')}
        />,
      ],
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WorkIcon />
          Employment Management
        </Typography>
      </Box>

      {/* Company Filter Indicator */}
      {isFilterActive && !isSearchActive && (
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
                  Showing employment records from selected company only
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Global Selection Indicator */}
      {globalSelectedEmployee && !isSearchActive && (
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
                  Showing employment records for: {globalSelectedEmployee.full_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Selected from Employee Directory - showing only this employee's employment history
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={clearSelection}
              sx={{ textTransform: 'none' }}
            >
              Clear Selection
            </Button>
          </Box>
        </Paper>
      )}

      {/* Search Active Indicator */}
      {isSearchActive && showEmployeeSearchResults && (
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
              <SearchIcon sx={{ color: 'info.main', fontSize: 32 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'info.main' }}>
                  Employee Search Results for: "{searchTerm}"
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Found {searchResults.length} employee(s) matching your search. Click on an employee to view their employment records.
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setSearchTerm('');
                setIsSearchActive(false);
                setShowEmployeeSearchResults(false);
                setSearchResults([]);
                loadEmployments();
              }}
              sx={{ textTransform: 'none' }}
            >
              Clear Search
            </Button>
          </Box>
        </Paper>
      )}

      {/* Employee Search Results */}
      {showEmployeeSearchResults && searchResults.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            {searchResults.map((employee) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={employee.id}>
                <Card
                  sx={{
                    cursor: selectingEmployee === employee.id ? 'default' : 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    opacity: selectingEmployee === employee.id ? 0.7 : 1,
                    '&:hover': selectingEmployee === employee.id ? {} : {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows[3],
                      borderColor: theme.palette.primary.main,
                    },
                    border: selectingEmployee === employee.id ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
                  }}
                  onClick={() => !selectingEmployee && handleSearchResultClick(employee)}
                >
                  <CardContent>
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
                        {getInitials(employee.first_name, employee.last_name)}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                          {employee.full_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ID: {employee.id}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip
                            label={employee.status}
                            color={employee.status === 'Active' ? 'success' : 'default'}
                            size="small"
                          />
                          {selectingEmployee === employee.id && (
                            <Typography variant="caption" color="primary" sx={{ fontStyle: 'italic' }}>
                              Loading...
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* No Search Results Message */}
      {showEmployeeSearchResults && searchResults.length === 0 && !loading && (
        <Paper 
          sx={{ 
            p: 4, 
            mb: 3, 
            textAlign: 'center',
            background: `linear-gradient(135deg, ${alpha(theme.palette.grey[100], 0.8)} 0%, ${alpha(theme.palette.grey[50], 0.8)} 100%)`,
            border: `2px dashed ${theme.palette.grey[300]}`,
            borderRadius: 2,
          }}
        >
          <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Employees Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No employees found matching "{searchTerm}". Try a different search term.
          </Typography>
        </Paper>
      )}

      {/* No Employee Selected Message */}
      {!globalSelectedEmployee && !isSearchActive && (
        <Paper 
          sx={{ 
            p: 4, 
            mb: 3, 
            textAlign: 'center',
            background: `linear-gradient(135deg, ${alpha(theme.palette.grey[100], 0.8)} 0%, ${alpha(theme.palette.grey[50], 0.8)} 100%)`,
            border: `2px dashed ${theme.palette.grey[300]}`,
            borderRadius: 2,
          }}
        >
          <WorkIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" color="text.secondary" gutterBottom>
            No Employee Selected
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
            To view employment records, please select an employee from the Employee Directory first, 
            or use the search function above to find specific employment records.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            💡 <strong>Tip:</strong> Go to the Employee Directory, click on an employee card, then return to this page to see their employment history.
          </Typography>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by employee name, position, department..."
                InputProps={{
                  endAdornment: (
                    <Button onClick={handleSearch} size="small">
                      <SearchIcon />
                    </Button>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setIsSearchActive(false);
                  setShowEmployeeSearchResults(false);
                  setSearchResults([]);
                  setSelectingEmployee(null);
                  clearSelection(); // Clear global selection
                  loadEmployments();
                }}
                fullWidth
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Add Employment Record Button - Only show when employee is selected */}
      {globalSelectedEmployee && hasPermission('employment:create') && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              px: 3,
              py: 1.5,
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2,
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
              '&:hover': {
                background: `linear-gradient(45deg, ${theme.palette.primary.dark} 30%, ${theme.palette.secondary.dark} 90%)`,
              }
            }}
          >
            Add Employment Record
          </Button>
        </Box>
      )}

      {/* Employment Records Table - Only show when there's data or loading */}
      {globalSelectedEmployee && !showEmployeeSearchResults && (
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={employments}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid',
                borderColor: '#e2e8f0',
                fontWeight: 600,
                fontSize: '0.875rem',
              },
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid',
                borderColor: '#f1f5f9',
                '&:focus': {
                  outline: 'none',
                },
                '&:focus-within': {
                  outline: 'none',
                },
              },
              '& .MuiDataGrid-row': {
                '&:hover': {
                  backgroundColor: '#f8fafc',
                },
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: '1px solid',
                borderColor: '#e2e8f0',
              },
            }}
          />
        </Box>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingEmployment 
            ? 'Edit Employment Record' 
            : `Add Employment Record${globalSelectedEmployee ? ` for ${globalSelectedEmployee.full_name}` : ''}`
          }
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Employee</InputLabel>
                <Select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  label="Employee"
                  disabled={!editingEmployment && !!globalSelectedEmployee}
                >
                  {employees.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.full_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Wage Classification"
                value={formData.wage_classification}
                onChange={(e) => setFormData({ ...formData, wage_classification: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.count_all_ot}
                    onChange={(e) => setFormData({ ...formData, count_all_ot: e.target.checked })}
                  />
                }
                label="Count All Overtime (even < 30 min)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Company ID"
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={formatDateForInput(formData.start_date)}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={formatDateForInput(formData.end_date)}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
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
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingEmployment ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmploymentPage;