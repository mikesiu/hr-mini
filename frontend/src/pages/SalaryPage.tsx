import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  TextField,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Avatar,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
// import { DatePicker } from '@mui/x-date-pickers/DatePicker';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { salaryAPI, apiClient } from '../api/client';
import { useSelectedEmployee } from '../contexts/SelectedEmployeeContext';
import { useCompanyFilter } from '../hooks/useCompanyFilter';
import SalaryProgressionChart from '../components/SalaryProgressionChart';

interface SalaryRecord {
  id: number;
  employee_id: string;
  pay_rate: number;
  pay_type: string;
  effective_date: string;
  end_date?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
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
      id={`salary-tabpanel-${index}`}
      aria-labelledby={`salary-tab-${index}`}
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
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return date.toLocaleDateString();
}

const SalaryPage: React.FC = () => {
  const theme = useTheme();
  const { selectedCompanyId, getCompanyName } = useCompanyFilter();
  const { selectedEmployee: globalSelectedEmployee, setSelectedEmployee: setGlobalSelectedEmployee } = useSelectedEmployee();

  const [tabValue, setTabValue] = useState(0);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [currentSalary, setCurrentSalary] = useState<SalaryRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedEmployeeData, setSelectedEmployeeData] = useState<Employee | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalaryRecord | null>(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    pay_rate: '',
    pay_type: 'Hourly',
    effective_date: new Date(),
    end_date: null as Date | null,
    notes: '',
  });
  
  // Employee search states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const payTypes = ['Hourly', 'Monthly', 'Annual'];

  const loadCurrentSalary = React.useCallback(async (employeeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await salaryAPI.current(employeeId);
      setCurrentSalary(response.data);
    } catch (err: any) {
      console.error('Error loading current salary:', err);
      
      if (err.response?.status === 404) {
        setCurrentSalary(null);
      } else if (err.code === 'ECONNRESET' || err.message?.includes('ConnectionResetError')) {
        setError('Connection lost. Please check your network connection and try again.');
      } else if (err.response?.status === 401) {
        setError('Authentication expired. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view salary information.');
      } else if (err.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err.response?.data?.detail || 'Failed to load current salary');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Search functionality - using LeavePage pattern
  const handleSearch = () => {
    if (searchTerm && searchTerm.length >= 2) {
      searchEmployees();
    }
  };

  const searchEmployees = React.useCallback(async () => {
    try {
      setSearchLoading(true);
      setError(null);
      
      // Search for employees matching the search term
      const employeeResponse = await apiClient.get('/employees/list', {
        params: { q: searchTerm, company_id: selectedCompanyId || undefined }
      });
      
      // Handle different response formats
      if (employeeResponse.data && employeeResponse.data.success && Array.isArray(employeeResponse.data.data)) {
        setSearchResults(employeeResponse.data.data);
      } else if (Array.isArray(employeeResponse.data)) {
        setSearchResults(employeeResponse.data);
      } else {
        setSearchResults([]);
      }
    } catch (err: any) {
      console.error('Error searching employees:', err);
      
      // Handle different types of errors
      if (err.code === 'ECONNRESET' || err.message?.includes('ConnectionResetError')) {
        setError('Connection lost. Please check your network connection and try again.');
      } else if (err.response?.status === 401) {
        setError('Authentication expired. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to search employees.');
      } else if (err.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err.response?.data?.detail || 'Failed to search employees. Please try again.');
      }
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchTerm, selectedCompanyId]);

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
    loadCurrentSalary(employee.id);
    setTabValue(0); // Switch to current salary tab
  };

  // Auto-select employee from global context when component mounts
  useEffect(() => {
    if (globalSelectedEmployee && !selectedEmployee) {
      setSelectedEmployee(globalSelectedEmployee.id);
      setSelectedEmployeeData(globalSelectedEmployee);
      loadCurrentSalary(globalSelectedEmployee.id);
    }
  }, [globalSelectedEmployee, selectedEmployee, loadCurrentSalary]);

  // Handle search term changes - trigger search automatically with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm && searchTerm.length >= 2) {
        searchEmployees();
      } else {
        setSearchResults([]);
      }
    }, 300); // Debounce search by 300ms

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchEmployees]);

  const loadSalaryHistory = React.useCallback(async (employeeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await salaryAPI.history({ employee_id: employeeId });
      // Sort by effective_date in chronological order (oldest first)
      const records = response.data.sort((a: SalaryRecord, b: SalaryRecord) => 
        new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
      );
      setSalaryRecords(records);
    } catch (err: any) {
      console.error('Error loading salary history:', err);
      
      if (err.code === 'ECONNRESET' || err.message?.includes('ConnectionResetError')) {
        setError('Connection lost. Please check your network connection and try again.');
      } else if (err.response?.status === 401) {
        setError('Authentication expired. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view salary history.');
      } else if (err.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err.response?.data?.detail || 'Failed to load salary history');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSalaryRecords = React.useCallback(async () => {
    if (!selectedEmployee) {
      setSalaryRecords([]);
      setCurrentSalary(null);
      return;
    }

    if (tabValue === 0) {
      // Current salary tab
      await loadCurrentSalary(selectedEmployee);
    } else if (tabValue === 1) {
      // Salary history tab
      await loadSalaryHistory(selectedEmployee);
    }
  }, [selectedEmployee, tabValue, loadCurrentSalary, loadSalaryHistory]);

  useEffect(() => {
    loadSalaryRecords();
  }, [loadSalaryRecords]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Load appropriate data when switching tabs
    if (selectedEmployee) {
      if (newValue === 0) {
        loadCurrentSalary(selectedEmployee);
      } else if (newValue === 1) {
        loadSalaryHistory(selectedEmployee);
      }
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleOpenDialog = (record?: SalaryRecord) => {
    if (record) {
      setEditingRecord(record);
      setFormData({
        employee_id: record.employee_id,
        pay_rate: record.pay_rate.toString(),
        pay_type: record.pay_type,
        effective_date: new Date(record.effective_date),
        end_date: record.end_date ? new Date(record.end_date) : null,
        notes: record.notes || '',
      });
    } else {
      setEditingRecord(null);
      setFormData({
        employee_id: selectedEmployee || '',
        pay_rate: '',
        pay_type: 'Hourly',
        effective_date: new Date(),
        end_date: null,
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRecord(null);
  };

  const handleFormSubmit = async () => {
    try {
      setLoading(true);
      const submitData = {
        ...formData,
        pay_rate: parseFloat(formData.pay_rate),
        effective_date: formData.effective_date.toISOString().split('T')[0],
        end_date: formData.end_date ? formData.end_date.toISOString().split('T')[0] : null,
      };

      if (editingRecord) {
        await salaryAPI.update(editingRecord.id, submitData);
      } else {
        await salaryAPI.create(submitData);
      }

      handleCloseDialog();
      loadSalaryRecords();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save salary record');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this salary record?')) {
      try {
        setLoading(true);
        await salaryAPI.delete(id);
        loadSalaryRecords();
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to delete salary record');
      } finally {
        setLoading(false);
      }
    }
  };

  const formatCurrency = (amount: number, payType: string) => {
    const formatter = new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    });
    return formatter.format(amount);
  };

  const getPayTypeColor = (payType: string) => {
    switch (payType) {
      case 'Hourly': return 'primary';
      case 'Monthly': return 'secondary';
      case 'Annual': return 'success';
      default: return 'default';
    }
  };



  return (
    <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
      <Typography variant="h4" gutterBottom>
        Salary Management
      </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={loading}
          >
            Add Salary Record
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
              onChange={handleSearchChange}
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
              disabled={loading || searchLoading || !searchTerm || searchTerm.length < 2}
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
                setCurrentSalary(null);
                setSalaryRecords([]);
              }}
              disabled={loading || searchLoading}
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
          {searchLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Searching employees...</Typography>
            </Box>
          ) : searchResults.length === 0 && searchTerm && !searchLoading ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No employees found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Try adjusting your search criteria.
              </Typography>
              {error && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setError(null);
                      searchEmployees();
                    }}
                    startIcon={<RefreshIcon />}
                  >
                    Retry Search
                  </Button>
                </Box>
              )}
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
                    setCurrentSalary(null);
                    setSalaryRecords([]);
                  }}
                >
                  Change Employee
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : null}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Main Content */}
        {selectedEmployeeData ? (
          <Paper sx={{ mb: 3 }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="salary tabs">
              <Tab label="Current Salary" />
              <Tab label="Salary History" />
              <Tab label="Salary Progression" />
            </Tabs>

          <TabPanel value={tabValue} index={0}>
            {selectedEmployee && (
              <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="flex-start">
                <IconButton onClick={() => loadCurrentSalary(selectedEmployee)} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Box>
            )}

            {!selectedEmployee ? (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={6}>
                <PersonIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Select an Employee
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Enter an employee ID above to view their current salary information
                </Typography>
              </Box>
            ) : loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : currentSalary ? (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <PersonIcon color="primary" />
                        <Typography variant="h6">
                          {currentSalary.employee?.full_name || currentSalary.employee_id}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <MoneyIcon color="success" />
                        <Typography variant="h4" color="success.main">
                          {formatCurrency(currentSalary.pay_rate, currentSalary.pay_type)}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <Chip
                          label={currentSalary.pay_type}
                          color={getPayTypeColor(currentSalary.pay_type) as any}
                          size="medium"
                        />
                        <Chip label="Current" color="success" size="medium" />
                      </Box>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        <strong>Effective Date:</strong> {formatDateString(currentSalary.effective_date)}
                      </Typography>
                      {currentSalary.notes && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>Notes:</strong> {currentSalary.notes}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button
                        startIcon={<EditIcon />}
                        onClick={() => handleOpenDialog(currentSalary)}
                        variant="outlined"
                      >
                        Edit Salary
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              </Grid>
            ) : (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={6}>
                <MoneyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Current Salary Found
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center" mb={2}>
                  This employee doesn't have a current salary record
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                >
                  Add Salary Record
                </Button>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {selectedEmployee && (
              <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="flex-start">
                <IconButton onClick={() => loadSalaryHistory(selectedEmployee)} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Box>
            )}

            {!selectedEmployee ? (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={6}>
                <PersonIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Select an Employee
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Enter an employee ID above to view their salary history
                </Typography>
              </Box>
            ) : loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : salaryRecords.length > 0 ? (
              <>
                <Typography variant="h6" gutterBottom>
                  Salary History - {selectedEmployee}
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Pay Rate</TableCell>
                        <TableCell>Pay Type</TableCell>
                        <TableCell>Effective Date</TableCell>
                        <TableCell>End Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Notes</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {salaryRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <MoneyIcon fontSize="small" color="primary" />
                              <Typography variant="body2" fontWeight="medium">
                                {formatCurrency(record.pay_rate, record.pay_type)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={record.pay_type}
                              color={getPayTypeColor(record.pay_type) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <CalendarIcon fontSize="small" />
                              {formatDateString(record.effective_date)}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {record.end_date ? (
                              formatDateString(record.end_date)
                            ) : (
                              <Chip label="Current" color="success" size="small" />
                            )}
                          </TableCell>
                          <TableCell>
                            {record.end_date ? (
                              <Chip label="Historical" color="default" size="small" />
                            ) : (
                              <Chip label="Active" color="success" size="small" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {record.notes || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenDialog(record)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteRecord(record.id)}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={6}>
                <MoneyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Salary History Found
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center" mb={2}>
                  This employee doesn't have any salary records
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                >
                  Add Salary Record
                </Button>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>

            {!selectedEmployee ? (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={6}>
                <PersonIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Select an Employee
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Enter an employee ID above to view their salary progression analysis
        </Typography>
              </Box>
            ) : (
              <SalaryProgressionChart
                employeeId={selectedEmployee}
                employeeName={currentSalary?.employee?.full_name || selectedEmployee}
              />
            )}
          </TabPanel>
          </Paper>
        ) : (
          <Alert severity="info">
            Please select an employee to manage salary information.
          </Alert>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingRecord ? 'Edit Salary Record' : 'Add New Salary Record'}
          </DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} pt={1}>
              <TextField
                label="Employee ID"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Pay Rate"
                type="number"
                value={formData.pay_rate}
                onChange={(e) => setFormData({ ...formData, pay_rate: e.target.value })}
                fullWidth
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
              <FormControl fullWidth required>
                <InputLabel>Pay Type</InputLabel>
                <Select
                  value={formData.pay_type}
                  onChange={(e) => setFormData({ ...formData, pay_type: e.target.value })}
                >
                  {payTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Effective Date"
                type="date"
                value={formData.effective_date.toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, effective_date: new Date(e.target.value) })}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Date (Optional)"
                type="date"
                value={formData.end_date ? formData.end_date.toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value ? new Date(e.target.value) : null })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              onClick={handleFormSubmit}
              variant="contained"
              disabled={loading || !formData.employee_id || !formData.pay_rate}
            >
              {loading ? <CircularProgress size={20} /> : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
    </Box>
  );
};

export default SalaryPage;
