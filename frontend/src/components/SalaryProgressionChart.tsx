import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Button,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { salaryAPI } from '../api/client';

interface SalaryProgressionData {
  pay_rate: number;
  pay_type: string;
  effective_date: string;
  end_date?: string;
  notes?: string;
  created_at: string;
}

interface SalaryProgressionChartProps {
  employeeId: string;
  employeeName?: string;
}

const SalaryProgressionChart: React.FC<SalaryProgressionChartProps> = ({
  employeeId,
  employeeName,
}) => {
  const [progressionData, setProgressionData] = useState<SalaryProgressionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProgressionData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await salaryAPI.progression(employeeId);
      setProgressionData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load salary progression');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (employeeId) {
      loadProgressionData();
    }
  }, [employeeId, loadProgressionData]);

  const calculateProgressionStats = () => {
    if (progressionData.length === 0) {
      return {
        totalIncrease: 0,
        averageIncrease: 0,
        totalIncreasePercentage: 0,
        numberOfChanges: 0,
        currentSalary: null,
        longestPeriod: 0,
        shortestPeriod: 0,
      };
    }

    const sortedData = [...progressionData].sort(
      (a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
    );

    let totalIncrease = 0;
    let numberOfChanges = 0;
    const periods: number[] = [];

    for (let i = 1; i < sortedData.length; i++) {
      const current = sortedData[i];
      const previous = sortedData[i - 1];
      
      const increase = current.pay_rate - previous.pay_rate;
      totalIncrease += increase;
      numberOfChanges++;

      // Calculate period duration
      const startDate = new Date(previous.effective_date);
      const endDate = new Date(current.effective_date);
      const periodDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      periods.push(periodDays);
    }

    // Calculate final period (current salary)
    if (sortedData.length > 0) {
      const lastRecord = sortedData[sortedData.length - 1];
      const lastDate = new Date(lastRecord.effective_date);
      const today = new Date();
      const finalPeriodDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      periods.push(finalPeriodDays);
    }

    const averageIncrease = numberOfChanges > 0 ? totalIncrease / numberOfChanges : 0;
    const initialSalary = sortedData.length > 0 ? sortedData[0].pay_rate : 0;
    const totalIncreasePercentage = initialSalary > 0 ? (totalIncrease / initialSalary) * 100 : 0;
    const currentSalary = sortedData.length > 0 ? sortedData[sortedData.length - 1] : null;

    return {
      totalIncrease,
      averageIncrease,
      totalIncreasePercentage,
      numberOfChanges,
      currentSalary,
      longestPeriod: periods.length > 0 ? Math.max(...periods) : 0,
      shortestPeriod: periods.length > 0 ? Math.min(...periods) : 0,
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };


  const stats = calculateProgressionStats();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (progressionData.length === 0) {
    return (
      <Alert severity="info">
        No salary progression data available for this employee.
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Salary Progression - {employeeName || employeeId}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={loadProgressionData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <MoneyIcon color="success" />
                <Typography variant="h6" color="success.main">
                  {stats.currentSalary ? formatCurrency(stats.currentSalary.pay_rate) : 'N/A'}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Current Salary
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <TrendingUpIcon color="primary" />
                <Typography variant="h6" color="primary.main">
                  {formatCurrency(stats.totalIncrease)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Increase
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <AssessmentIcon color="secondary" />
                <Typography variant="h6" color="secondary.main">
                  {stats.totalIncreasePercentage.toFixed(1)}%
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Increase %
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <CalendarIcon color="info" />
                <Typography variant="h6" color="info.main">
                  {stats.numberOfChanges}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Salary Changes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Progression Timeline */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Salary Timeline
        </Typography>
        
        <Box>
          {progressionData
            .sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime())
            .map((record, index) => {
              const isLast = index === progressionData.length - 1;
              const nextRecord = progressionData[index + 1];
              const increase = nextRecord ? nextRecord.pay_rate - record.pay_rate : 0;
              const increasePercentage = record.pay_rate > 0 ? (increase / record.pay_rate) * 100 : 0;

              return (
                <Box key={record.effective_date} mb={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: isLast ? 'success.main' : 'primary.main',
                        flexShrink: 0,
                      }}
                    />
                    <Box flex={1}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="h6">
                          {formatCurrency(record.pay_rate)}
                        </Typography>
                        <Box display="flex" gap={1}>
                          <Chip
                            label={record.pay_type}
                            size="small"
                            color={record.pay_type === 'Hourly' ? 'primary' : record.pay_type === 'Monthly' ? 'secondary' : 'success'}
                          />
                          {isLast && (
                            <Chip label="Current" color="success" size="small" />
                          )}
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        Effective: {new Date(record.effective_date).toLocaleDateString()}
                        {record.end_date && (
                          <> - {new Date(record.end_date).toLocaleDateString()}</>
                        )}
                      </Typography>
                      {record.notes && (
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          {record.notes}
                        </Typography>
                      )}
                      {!isLast && nextRecord && (
                        <Box display="flex" alignItems="center" gap={1} mt={1}>
                          <Typography variant="body2" color="text.secondary">
                            Next: {formatCurrency(nextRecord.pay_rate)} 
                            ({increase >= 0 ? '+' : ''}{formatCurrency(increase)})
                          </Typography>
                          {increasePercentage !== 0 && (
                            <Chip
                              label={`${increasePercentage >= 0 ? '+' : ''}${increasePercentage.toFixed(1)}%`}
                              size="small"
                              color={increasePercentage > 0 ? 'success' : 'error'}
                            />
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>
                  {!isLast && (
                    <Box
                      sx={{
                        width: 2,
                        height: 20,
                        backgroundColor: 'divider',
                        ml: 1.5,
                        mt: 1,
                      }}
                    />
                  )}
                </Box>
              );
            })}
        </Box>
      </Paper>
    </Box>
  );
};

export default SalaryProgressionChart;
