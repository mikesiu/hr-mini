import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { companyAPI } from '../api/client';
import { useCompanyFilter } from '../contexts/CompanyFilterContext';

interface PayPeriod {
  start_date: string;
  end_date: string;
  period_number: number;
  year: number;
  duration_days: number;
  payment_date: string | null;
}

interface PayPeriodResponse {
  success: boolean;
  data: PayPeriod[];
  company_id: string;
  company_name: string;
}

const PayrollPeriodPage: React.FC = () => {
  // Use companies from the global context instead of fetching them again
  const { companies, loading: companiesLoading } = useCompanyFilter();
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-select first company when companies load
  useEffect(() => {
    if (!companiesLoading && companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companiesLoading, companies, selectedCompanyId]);

  // Fetch pay periods function
  const fetchPayPeriods = useCallback(async () => {
    if (!selectedCompanyId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await companyAPI.getPayPeriods(selectedCompanyId, selectedYear);
      const periodData = response.data as PayPeriodResponse;
      
      if (periodData.success) {
        setPayPeriods(periodData.data || []);
      } else {
        setPayPeriods([]);
      }
    } catch (err: any) {
      console.error('Error fetching pay periods:', err);
      setError(err.response?.data?.detail || 'Failed to load pay periods');
      setPayPeriods([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, selectedYear]);

  // Fetch pay periods when company or year changes
  useEffect(() => {
    if (selectedCompanyId && selectedYear) {
      fetchPayPeriods();
    } else {
      setPayPeriods([]);
    }
  }, [selectedCompanyId, selectedYear, fetchPayPeriods]);

  const formatDate = (dateString: string) => {
    try {
      // Parse YYYY-MM-DD dates locally to avoid timezone issues
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return format(date, 'MMM dd, yyyy');
      }
      // Fallback for other date formats
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  // Generate year options (current year ± 2 years)
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - 2 + i;
    return year;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Payroll Periods
        </Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Company</InputLabel>
              <Select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                label="Company"
                disabled={companiesLoading}
              >
                {companies.map((company) => (
                  <MenuItem key={company.id} value={company.id}>
                    {company.legal_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Year</InputLabel>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                label="Year"
              >
                {yearOptions.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Pay Periods Table */}
      {!loading && selectedCompanyId && (
        <Paper>
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">
              Pay Periods for {companies.find(c => c.id === selectedCompanyId)?.legal_name || selectedCompanyId}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {payPeriods.length} period{payPeriods.length !== 1 ? 's' : ''} found for {selectedYear}
            </Typography>
          </Box>
          
          {payPeriods.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CalendarIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No pay periods found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Please ensure the company has a Payroll Start Date and Payroll Frequency configured.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Period #</strong></TableCell>
                    <TableCell><strong>Start Date</strong></TableCell>
                    <TableCell><strong>End Date</strong></TableCell>
                    <TableCell align="right"><strong>Duration (Days)</strong></TableCell>
                    <TableCell><strong>Payment Date</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payPeriods.map((period) => (
                    <TableRow key={period.period_number} hover>
                      <TableCell>
                        <Chip
                          label={`Period ${period.period_number}`}
                          color="primary"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(period.start_date)}</TableCell>
                      <TableCell>{formatDate(period.end_date)}</TableCell>
                      <TableCell align="right">{period.duration_days}</TableCell>
                      <TableCell>{period.payment_date ? formatDate(period.payment_date) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* No Company Selected */}
      {!selectedCompanyId && !companiesLoading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CalendarIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Select a Company
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please select a company to view pay periods.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default PayrollPeriodPage;

