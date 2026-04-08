import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  TextField as MuiTextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  DateRange as DateRangeIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { expenseAPI } from '../../api/client';
import { MonthlyExpenseReport, YearlyExpenseReport } from '../../types/expense';
import ExpenseCharts from './ExpenseCharts';

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
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ReportsTab: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Monthly report states
  const [monthlyReport, setMonthlyReport] = useState<MonthlyExpenseReport[]>([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Yearly report states
  const [yearlyReport, setYearlyReport] = useState<YearlyExpenseReport | null>(null);
  const [yearlyYear, setYearlyYear] = useState(new Date().getFullYear());
  const [yearlySearchTerm, setYearlySearchTerm] = useState('');
  const [yearlyPage, setYearlyPage] = useState(1);
  const [yearlyPageSize] = useState(20);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const loadMonthlyReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await expenseAPI.getMonthlyReport(month, year);
      if (response.data.success) {
        setMonthlyReport(response.data.data || []);
      } else {
        setError('Failed to load monthly report');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load monthly report');
    } finally {
      setLoading(false);
    }
  };

  const loadYearlyReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await expenseAPI.getYearlyReport(yearlyYear);
      if (response.data.success) {
        setYearlyReport(response.data.data);
      } else {
        setError('Failed to load yearly report');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load yearly report');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    // Parse the date string as local date to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString();
  };

  const getMonthName = (monthNum: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNum - 1];
  };

  // Filter yearly report claims based on search term
  const filteredYearlyClaims = yearlyReport?.detailed_claims.filter(claim => {
    if (!yearlySearchTerm) return true;
    const searchLower = yearlySearchTerm.toLowerCase();
    return (
      claim.employee_name.toLowerCase().includes(searchLower) ||
      claim.expense_type.toLowerCase().includes(searchLower) ||
      claim.employee_id.toLowerCase().includes(searchLower) ||
      claim.claims_amount.toString().includes(searchLower) ||
      claim.receipts_amount.toString().includes(searchLower) ||
      claim.paid_date.includes(searchLower)
    );
  }) || [];

  const totalYearlyPages = Math.ceil(filteredYearlyClaims.length / yearlyPageSize);
  const paginatedYearlyClaims = filteredYearlyClaims.slice(
    (yearlyPage - 1) * yearlyPageSize,
    yearlyPage * yearlyPageSize
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Expense Reports
      </Typography>

      <Card sx={{ mb: 2 }}>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          aria-label="expense report tabs"
          variant="fullWidth"
        >
          <Tab label="Monthly Report" />
          <Tab label="Yearly Report" />
        </Tabs>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Monthly Report Tab */}
      <TabPanel value={selectedTab} index={0}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <DateRangeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Monthly Report
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    label="Month"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <MenuItem key={i + 1} value={i + 1}>
                        {getMonthName(i + 1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  inputProps={{ min: 2020, max: new Date().getFullYear() + 1 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  variant="contained"
                  onClick={loadMonthlyReport}
                  fullWidth
                  startIcon={<RefreshIcon />}
                >
                  Generate Report
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : monthlyReport.length > 0 ? (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Monthly Expense Report for {getMonthName(month)} {year}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {monthlyReport.length} claim{monthlyReport.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
            
            {/* Summary */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Claims
                    </Typography>
                    <Typography variant="h4">
                      {monthlyReport.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Receipts
                    </Typography>
                    <Typography variant="h4">
                      {formatCurrency(monthlyReport.reduce((sum, claim) => sum + claim.receipts_amount, 0))}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Claimed
                    </Typography>
                    <Typography variant="h4">
                      {formatCurrency(monthlyReport.reduce((sum, claim) => sum + claim.claims_amount, 0))}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Detailed Claims */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Detailed Claims
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Employee</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Receipts</TableCell>
                        <TableCell align="right">Claimed</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {monthlyReport.map((claim) => (
                        <TableRow key={claim.id}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {claim.employee_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {claim.employee_id}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(claim.paid_date)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {claim.expense_type}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {formatCurrency(claim.receipts_amount)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              {formatCurrency(claim.claims_amount)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {claim.receipts_amount === claim.claims_amount ? (
                              <Chip label="Full" color="success" size="small" />
                            ) : (
                              <Chip label="Capped" color="warning" size="small" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        ) : (
          <Alert severity="info">
            No claims found for the selected month. Click "Generate Report" to load data.
          </Alert>
        )}
      </TabPanel>

      {/* Yearly Report Tab */}
      <TabPanel value={selectedTab} index={1}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Yearly Report
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Year"
                  type="number"
                  value={yearlyYear}
                  onChange={(e) => setYearlyYear(Number(e.target.value))}
                  inputProps={{ min: 2020, max: new Date().getFullYear() + 1 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Button
                  variant="contained"
                  onClick={loadYearlyReport}
                  fullWidth
                  startIcon={<RefreshIcon />}
                >
                  Generate Report
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : yearlyReport ? (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Yearly Expense Report for {yearlyYear}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {yearlyReport.summary.total_claims} claim{yearlyReport.summary.total_claims !== 1 ? 's' : ''}
              </Typography>
            </Box>
            
            {/* Overall Summary */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Claims
                    </Typography>
                    <Typography variant="h4">
                      {yearlyReport.summary.total_claims}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Receipts
                    </Typography>
                    <Typography variant="h4">
                      {formatCurrency(yearlyReport.summary.total_receipts)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Claimed
                    </Typography>
                    <Typography variant="h4">
                      {formatCurrency(yearlyReport.summary.total_claimed)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Active Employees
                    </Typography>
                    <Typography variant="h4">
                      {yearlyReport.summary.total_employees}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Charts and Visualizations */}
            <ExpenseCharts yearlyReport={yearlyReport} />

            {/* Monthly Breakdown */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Monthly Breakdown
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Month</TableCell>
                        <TableCell align="right">Total Receipts</TableCell>
                        <TableCell align="right">Total Claimed</TableCell>
                        <TableCell align="right">Total Claims</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {yearlyReport.monthly_breakdown.map((monthData) => (
                        <TableRow key={monthData.month}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {getMonthName(monthData.month)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {formatCurrency(monthData.total_receipts)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              {formatCurrency(monthData.total_claimed)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip label={monthData.total_claims} color="primary" variant="outlined" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Expense Type Breakdown */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Expense Type Breakdown
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(yearlyReport.expense_type_breakdown).map(([type, data]) => (
                    <Grid item xs={12} md={6} key={type}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {type}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {data.total_claims} claims
                          </Typography>
                          <Typography variant="body2">
                            <strong>Total Receipts:</strong> {formatCurrency(data.total_receipts)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Total Claimed:</strong> {formatCurrency(data.total_claimed)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Average per Claim:</strong> {formatCurrency(data.average_per_claim)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>

            {/* Top Employees */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Employees by Claims
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Rank</TableCell>
                        <TableCell>Employee</TableCell>
                        <TableCell align="right">Total Receipts</TableCell>
                        <TableCell align="right">Total Claimed</TableCell>
                        <TableCell align="right">Claims Count</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {yearlyReport.top_employees.map((emp, index) => (
                        <TableRow key={emp.employee_id}>
                          <TableCell>
                            <Typography variant="h6" color="primary">
                              #{index + 1}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {emp.employee_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {emp.employee_id}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {formatCurrency(emp.total_receipts)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              {formatCurrency(emp.total_claimed)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip label={emp.total_claims} color="primary" variant="outlined" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Detailed Claims with Search */}
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="h6">
                      All Claims for the Year
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {yearlyReport.detailed_claims.length} claim{yearlyReport.detailed_claims.length !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={1} alignItems="center">
                    <MuiTextField
                      placeholder="Search claims..."
                      value={yearlySearchTerm}
                      onChange={(e) => setYearlySearchTerm(e.target.value)}
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                        endAdornment: yearlySearchTerm && (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => setYearlySearchTerm('')}
                            >
                              <ClearIcon />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{ minWidth: 300 }}
                    />
                  </Box>
                </Box>

                {yearlySearchTerm && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Found {filteredYearlyClaims.length} claims matching '{yearlySearchTerm}'
                  </Alert>
                )}

                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Employee</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Receipts</TableCell>
                        <TableCell align="right">Claimed</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedYearlyClaims.map((claim) => (
                        <TableRow key={claim.id}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {claim.employee_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {claim.employee_id}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(claim.paid_date)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {claim.expense_type}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {formatCurrency(claim.receipts_amount)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              {formatCurrency(claim.claims_amount)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {claim.receipts_amount === claim.claims_amount ? (
                              <Chip label="Full" color="success" size="small" />
                            ) : (
                              <Chip label="Capped" color="warning" size="small" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {totalYearlyPages > 1 && (
                  <Box display="flex" justifyContent="center" mt={2}>
                    <Pagination
                      count={totalYearlyPages}
                      page={yearlyPage}
                      onChange={(event, page) => setYearlyPage(page)}
                      color="primary"
                    />
                  </Box>
                )}

                <Typography variant="body2" color="text.secondary" mt={1}>
                  Showing {((yearlyPage - 1) * yearlyPageSize) + 1}-{Math.min(yearlyPage * yearlyPageSize, filteredYearlyClaims.length)} of {filteredYearlyClaims.length} claims
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ) : (
          <Alert severity="info">
            No yearly report data available. Click "Generate Report" to load data.
          </Alert>
        )}
      </TabPanel>
    </Box>
  );
};

export default ReportsTab;
