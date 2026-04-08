import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { YearlyExpenseReport } from '../../types/expense';

interface ExpenseChartsProps {
  yearlyReport: YearlyExpenseReport;
}

const ExpenseCharts: React.FC<ExpenseChartsProps> = ({ yearlyReport }) => {
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const getTotalForMonth = (monthData: any) => {
    return monthData.total_claimed;
  };

  const getMaxAmount = () => {
    return Math.max(...yearlyReport.monthly_breakdown.map(getTotalForMonth));
  };

  const getMonthName = (monthNum: number) => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[monthNum - 1];
  };

  const maxAmount = getMaxAmount();

  return (
    <Box>
      {/* Monthly Trends */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Monthly Trends
          </Typography>
          <Grid container spacing={2}>
            {yearlyReport.monthly_breakdown.map((monthData) => {
              const percentage = maxAmount > 0 ? (getTotalForMonth(monthData) / maxAmount) * 100 : 0;
              return (
                <Grid item xs={12} md={4} key={monthData.month}>
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {getMonthName(monthData.month)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(getTotalForMonth(monthData))}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={percentage}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                        },
                      }}
                    />
                    <Box display="flex" justifyContent="space-between" mt={1}>
                      <Typography variant="caption" color="text.secondary">
                        {monthData.total_claims} claims
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatCurrency(monthData.total_receipts)} receipts
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      {/* Expense Type Distribution */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <ReceiptIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Expense Type Distribution
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(yearlyReport.expense_type_breakdown).map(([type, data]) => {
              const totalClaimed = yearlyReport.summary.total_claimed;
              const percentage = totalClaimed > 0 ? (data.total_claimed / totalClaimed) * 100 : 0;
              return (
                <Grid item xs={12} md={6} key={type}>
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body1" fontWeight="medium">
                        {type}
                      </Typography>
                      <Chip
                        label={`${percentage.toFixed(1)}%`}
                        color="primary"
                        size="small"
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={percentage}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                        },
                      }}
                    />
                    <Box display="flex" justifyContent="space-between" mt={1}>
                      <Typography variant="body2" color="text.secondary">
                        {data.total_claims} claims
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(data.total_claimed)}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Avg: {formatCurrency(data.average_per_claim)} per claim
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      {/* Top Employees */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <MoneyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Top Employees by Claims
          </Typography>
          <List>
            {yearlyReport.top_employees.slice(0, 5).map((emp, index) => {
              const maxClaims = yearlyReport.top_employees[0]?.total_claims || 1;
              const percentage = (emp.total_claims / maxClaims) * 100;
              return (
                <React.Fragment key={emp.employee_id}>
                  <ListItem>
                    <ListItemIcon>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: 'primary.main',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '0.875rem',
                        }}
                      >
                        {index + 1}
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body1" fontWeight="medium">
                            {emp.employee_name}
                          </Typography>
                          <Chip
                            label={`${emp.total_claims} claims`}
                            color="primary"
                            variant="outlined"
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {emp.employee_id}
                          </Typography>
                          <Box display="flex" justifyContent="space-between" mt={1}>
                            <Typography variant="body2">
                              Claimed: {formatCurrency(emp.total_claimed)}
                            </Typography>
                            <Typography variant="body2">
                              Receipts: {formatCurrency(emp.total_receipts)}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={percentage}
                            sx={{
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: 'grey.200',
                              mt: 1,
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 2,
                              },
                            }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < 4 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Key Statistics
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary" gutterBottom>
                  {yearlyReport.summary.total_claims}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Claims
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <Typography variant="h4" color="success.main" gutterBottom>
                  {formatCurrency(yearlyReport.summary.total_claimed)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Claimed
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <Typography variant="h4" color="info.main" gutterBottom>
                  {yearlyReport.summary.total_employees}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Employees
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Average per Claim:</strong> {formatCurrency(yearlyReport.summary.total_claimed / yearlyReport.summary.total_claims)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Claims per Employee:</strong> {(yearlyReport.summary.total_claims / yearlyReport.summary.total_employees).toFixed(1)}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ExpenseCharts;
