import React, { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import {
  DateRange as DateRangeIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { expenseAPI } from '../../api/client';
import { ExpenseSummary } from '../../types/expense';

interface SummaryTabProps {
  employeeId: string;
}

const SummaryTab: React.FC<SummaryTabProps> = ({ employeeId }) => {
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Initialize with default date range (current year)
  const today = new Date();
  const firstDayOfYear = new Date(today.getFullYear(), 0, 1); // January 1st
  const [startDate, setStartDate] = useState<string>(firstDayOfYear.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(today.toISOString().split('T')[0]);

  // Load summary
  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      
      const response = await expenseAPI.getSummary(employeeId, params);
      if (response.data.success) {
        setSummary(response.data.data);
      } else {
        setError('Failed to load expense summary');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load expense summary');
    } finally {
      setLoading(false);
    }
  }, [employeeId, startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate) {
      loadSummary();
    }
  }, [loadSummary, startDate, endDate]);

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    // Parse the date string as local date to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" onClose={() => setError(null)}>
        {error}
      </Alert>
    );
  }

  if (!summary) {
    return (
      <Alert severity="info">
        No expense data found for the selected date range.
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Expense Summary</Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadSummary}
        >
          Refresh
        </Button>
      </Box>

      {/* Date Range Selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <DateRangeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Date Range
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                variant="contained"
                onClick={loadSummary}
                fullWidth
                disabled={!startDate || !endDate}
              >
                Update Summary
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Employee Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Employee Information
          </Typography>
          <Typography variant="body1">
            <strong>Name:</strong> {summary.employee.name}
          </Typography>
          <Typography variant="body1">
            <strong>Employee ID:</strong> {summary.employee.id}
          </Typography>
        </CardContent>
      </Card>

      {/* Summary Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Claims
              </Typography>
              <Typography variant="h4">
                {summary.claim_summary.total_claims}
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
                {formatCurrency(summary.claim_summary.total_receipts_amount)}
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
                {formatCurrency(summary.claim_summary.total_claims_amount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Entitlements */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current Entitlements
          </Typography>
          {summary.entitlements.length === 0 ? (
            <Alert severity="info">
              No entitlements found for this employee.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {summary.entitlements.map((entitlement) => (
                <Grid item xs={12} md={6} key={entitlement.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="h6">
                          {entitlement.expense_type}
                        </Typography>
                        <Chip
                          label={entitlement.unit}
                          color="primary"
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Amount:</strong> {entitlement.entitlement_amount ? formatCurrency(entitlement.entitlement_amount) : 'No Cap'}
                      </Typography>
                      {entitlement.rollover === 'Yes' && (
                        <Chip
                          label="Rollover Enabled"
                          color="secondary"
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Breakdown by Type */}
      {Object.keys(summary.claim_summary.by_type).length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Breakdown by Expense Type
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Expense Type</TableCell>
                    <TableCell align="right">Count</TableCell>
                    <TableCell align="right">Receipts Amount</TableCell>
                    <TableCell align="right">Claims Amount</TableCell>
                    <TableCell align="right">Average per Claim</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(summary.claim_summary.by_type).map(([type, data]) => (
                    <TableRow key={type}>
                      <TableCell>
                        <Typography variant="body1" fontWeight="medium">
                          {type}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip label={data.count} color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatCurrency(data.receipts_amount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(data.claims_amount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {formatCurrency(data.claims_amount / data.count)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Claims */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Recent Claims
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {summary.recent_claims.length} claim{summary.recent_claims.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
          {summary.recent_claims.length === 0 ? (
            <Alert severity="info">
              No recent claims found.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Receipts</TableCell>
                    <TableCell align="right">Claimed</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.recent_claims.map((claim) => (
                    <TableRow key={claim.id}>
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
                        ) : claim.claims_amount < claim.receipts_amount ? (
                          <Chip label="Capped" color="warning" size="small" />
                        ) : (
                          <Chip label="Error" color="error" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SummaryTab;
