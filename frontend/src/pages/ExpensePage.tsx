import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Autocomplete,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  Grid,
  Button,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { employeeAPI } from '../api/client';
import { useCompanyFilter } from '../hooks/useCompanyFilter';

// Import tab components
import EntitlementsTab from '../components/expense/EntitlementsTab';
import ClaimsTab from '../components/expense/ClaimsTab';
import SummaryTab from '../components/expense/SummaryTab';
import ReportsTab from '../components/expense/ReportsTab';

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
      id={`expense-tabpanel-${index}`}
      aria-labelledby={`expense-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ExpensePage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedSubTab, setSelectedSubTab] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { selectedCompanyId } = useCompanyFilter();

  // Load employees
  useEffect(() => {
    const loadEmployees = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await employeeAPI.list({ 
          company_id: selectedCompanyId || undefined 
        });
        if (response.data.success) {
          setEmployees(response.data.data || []);
        } else {
          setError('Failed to load employees');
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load employees');
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, [selectedCompanyId]);

  // Filter employees based on search term
  const filteredEmployees = employees.filter(emp => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      emp.id.toLowerCase().includes(searchLower) ||
      emp.first_name?.toLowerCase().includes(searchLower) ||
      emp.last_name?.toLowerCase().includes(searchLower) ||
      emp.full_name?.toLowerCase().includes(searchLower)
    );
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleSubTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedSubTab(newValue);
  };

  const handleEmployeeChange = (event: any, newValue: Employee | null) => {
    setSelectedEmployee(newValue);
    setSelectedSubTab(0); // Reset to first sub-tab when employee changes
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Expense Reimbursement
      </Typography>

      {/* Company Filter Info */}
      {selectedCompanyId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Filtered by Company: {selectedCompanyId}
        </Alert>
      )}

      {/* Main Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          aria-label="expense management tabs"
          variant="fullWidth"
        >
          <Tab label="Employee Expenses" />
          <Tab label="Reports" />
          <Tab label="Help" />
        </Tabs>
      </Paper>

      {/* Employee Expenses Tab */}
      <TabPanel value={selectedTab} index={0}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Select Employee
          </Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : (
            <>
              <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Grid item xs={12} md={8}>
                  <Autocomplete
                    options={filteredEmployees}
                    getOptionLabel={(option) => `${option.id} - ${option.full_name}`}
                    value={selectedEmployee}
                    onChange={handleEmployeeChange}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Search Employee"
                        placeholder="Enter employee ID, first name, or last name"
                        variant="outlined"
                        fullWidth
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      return (
                        <Box component="li" key={key} {...otherProps}>
                          <Box>
                            <Typography variant="body1">
                              {option.full_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ID: {option.id}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    }}
                    noOptionsText="No employees found"
                    loading={loading}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="outlined"
                    onClick={clearSearch}
                    disabled={!searchTerm}
                    startIcon={<SearchIcon />}
                    fullWidth
                  >
                    Clear Search
                  </Button>
                </Grid>
              </Grid>

              {selectedEmployee && (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="h6">
                          {selectedEmployee.full_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Employee ID: {selectedEmployee.id}
                        </Typography>
                      </Box>
                      <Chip
                        label="Selected"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                </Card>
              )}

              {selectedEmployee && (
                <Box>
                  <Tabs
                    value={selectedSubTab}
                    onChange={handleSubTabChange}
                    aria-label="employee expense tabs"
                    sx={{ mb: 2 }}
                  >
                    <Tab label="Entitlements" />
                    <Tab label="Claims" />
                    <Tab label="Summary" />
                  </Tabs>

                  <TabPanel value={selectedSubTab} index={0}>
                    <EntitlementsTab employeeId={selectedEmployee.id} />
                  </TabPanel>

                  <TabPanel value={selectedSubTab} index={1}>
                    <ClaimsTab employeeId={selectedEmployee.id} />
                  </TabPanel>

                  <TabPanel value={selectedSubTab} index={2}>
                    <SummaryTab employeeId={selectedEmployee.id} />
                  </TabPanel>
                </Box>
              )}

              {!selectedEmployee && (
                <Alert severity="info">
                  Please select an employee to manage their expenses.
                </Alert>
              )}
            </>
          )}
        </Paper>
      </TabPanel>

      {/* Reports Tab */}
      <TabPanel value={selectedTab} index={1}>
        <ReportsTab />
      </TabPanel>

      {/* Help Tab */}
      <TabPanel value={selectedTab} index={2}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Help & Instructions
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>How to use the Expense Reimbursement system:</strong>
          </Typography>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            1. Employee Expenses Tab
          </Typography>
          <Typography variant="body2" paragraph>
            • Select an employee from the dropdown<br/>
            • Manage their expense entitlements (monthly allowances, caps, etc.)<br/>
            • Submit new expense claims<br/>
            • View expense summary and history
          </Typography>

          <Typography variant="h6" gutterBottom>
            2. Expense Reports Tab
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Monthly Report:</strong> Generate expense reports for specific months<br/>
            • <strong>Yearly Report:</strong> Comprehensive yearly expense analysis
          </Typography>

          <Typography variant="h6" gutterBottom>
            Expense Types
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Gas:</strong> Transportation fuel expenses<br/>
            • <strong>Mobile:</strong> Mobile phone and communication expenses<br/>
            • <strong>Apparel:</strong> Safety boots, gloves, and other apparel expenses
          </Typography>

          <Typography variant="h6" gutterBottom>
            Entitlement Units
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>monthly:</strong> Up to 12 claims per year, each claim capped at the monthly amount (e.g., $200 per claim, max 12 claims/year)<br/>
            • <strong>yearly:</strong> Fixed yearly allowance (e.g., $2400/year)<br/>
            • <strong>No Cap:</strong> No limit on claimable amount<br/>
            • <strong>Actual:</strong> Claim actual amount spent (no cap)
          </Typography>
        </Paper>
      </TabPanel>
    </Box>
  );
};

export default ExpensePage;
