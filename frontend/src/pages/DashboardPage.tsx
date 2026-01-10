import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Alert,
  CircularProgress,
  Snackbar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  AttachMoney as PayrollIcon,
  AccountBalance as CRAIcon,
  Groups as UnionIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { format, startOfMonth, addMonths } from 'date-fns';
import { dashboardAPI, holidayAPI } from '../api/client';
import { useCompanyFilter } from '../hooks/useCompanyFilter';
import PayrollCalendar from '../components/dashboard/PayrollCalendar';

interface PayrollEvent {
  date: string;
  company_id: string;
  company_name: string;
  event_type: 'payroll' | 'cra' | 'union' | 'holiday' | 'probation';
  description: string;
}

const DashboardPage: React.FC = () => {
  const { selectedCompanyId, companies, setSelectedCompanyId, loading: companiesLoading } = useCompanyFilter();
  const [events, setEvents] = useState<PayrollEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<PayrollEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Month/Year selection state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Memoize month calculations to prevent unnecessary re-renders
  const currentMonth = useMemo(() => startOfMonth(new Date(selectedYear, selectedMonth, 1)), [selectedYear, selectedMonth]);
  const nextMonth = useMemo(() => addMonths(currentMonth, 1), [currentMonth]);

  // Memoize company IDs as a string to use as stable dependency
  const companyIds = useMemo(() => companies.map(c => c.id).join(','), [companies]);
  
  // Debug logging
  useEffect(() => {
    console.log('Dashboard companies state:', { 
      companiesLoading, 
      companiesCount: companies.length, 
      companyIds: companyIds,
      companies: companies.map(c => ({ id: c.id, name: c.legal_name }))
    });
  }, [companiesLoading, companies, companyIds]);

  const fetchHolidays = useCallback(async (startDate: string, endDate: string): Promise<PayrollEvent[]> => {
    const holidayEvents: PayrollEvent[] = [];
    
    // Don't fetch if companies haven't loaded yet
    if (companiesLoading || companies.length === 0) {
      console.log('Skipping holiday fetch: companies loading or empty', { companiesLoading, companiesCount: companies.length });
      return holidayEvents;
    }
    
    try {
      // Determine which companies to fetch holidays for
      // Read companies from closure - use companyIds as dependency to prevent loops
      const companiesToFetch = selectedCompanyId 
        ? companies.filter(c => c.id === selectedCompanyId)
        : companies;
      
      console.log('Fetching holidays for companies:', companiesToFetch.map(c => c.id), 'Date range:', startDate, 'to', endDate);
      
      // Fetch holidays for each company
      for (const company of companiesToFetch) {
        try {
          const response = await holidayAPI.list(company.id, { active_only: true });
          // Backend returns list directly as array (List[HolidayResponse])
          // axios wraps it in response.data
          let holidays: any[] = [];
          if (Array.isArray(response.data)) {
            holidays = response.data;
          } else if (response.data?.data && Array.isArray(response.data.data)) {
            holidays = response.data.data;
          }
          
          console.log(`Found ${holidays.length} holidays for company ${company.id}`, { response: response.data, holidays });
          
          // Filter holidays within the date range and convert to events
          holidays.forEach((holiday: any) => {
            const holidayDate = holiday.holiday_date;
            if (holidayDate && holidayDate >= startDate && holidayDate <= endDate) {
              holidayEvents.push({
                date: holidayDate,
                company_id: company.id,
                company_name: company.legal_name || company.id,
                event_type: 'holiday',
                description: holiday.name,
              });
            }
          });
        } catch (err: any) {
          console.error(`Error fetching holidays for company ${company.id}:`, err);
          // Continue with other companies even if one fails
        }
      }
      
      console.log('Total holiday events found:', holidayEvents.length);
    } catch (err: any) {
      console.error('Error fetching holidays:', err);
    }
    
    return holidayEvents;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId, companyIds, companiesLoading]);

  const fetchPayrollCalendar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Calculate date range for selected month and next month
      const monthStart = startOfMonth(new Date(selectedYear, selectedMonth, 1));
      const monthEnd = addMonths(addMonths(monthStart, 1), 1);
      const startDate = format(monthStart, 'yyyy-MM-dd');
      const endDate = format(monthEnd, 'yyyy-MM-dd');
      
      // Fetch payroll events first (this doesn't depend on companies)
      let payrollEvents: PayrollEvent[] = [];
      try {
        const payrollResponse = await dashboardAPI.getPayrollCalendar(startDate, endDate);
        if (payrollResponse.data.success) {
          payrollEvents = payrollResponse.data.data || [];
          
          // Apply company filter to payroll events
          if (selectedCompanyId) {
            payrollEvents = payrollEvents.filter(event => event.company_id === selectedCompanyId);
          }
        }
      } catch (err: any) {
        console.error('Error fetching payroll calendar:', err);
        // Don't fail completely if payroll fetch fails
      }
      
      // Fetch holidays (only if companies are available)
      let holidays: PayrollEvent[] = [];
      if (!companiesLoading && companies.length > 0) {
        try {
          holidays = await fetchHolidays(startDate, endDate);
        } catch (err: any) {
          console.error('Error fetching holidays:', err);
          // Don't fail completely if holiday fetch fails
        }
      }
      
      // Merge holidays with payroll events
      setEvents([...payrollEvents, ...holidays]);
    } catch (err: any) {
      console.error('Error fetching calendar data:', err);
      setError(err.response?.data?.detail || 'Error fetching calendar data');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, selectedCompanyId, fetchHolidays, companiesLoading, companies.length]);

  useEffect(() => {
    // Fetch calendar data immediately, don't wait for companies
    // This allows the dashboard to show payroll events even if companies fail to load
    fetchPayrollCalendar();
  }, [fetchPayrollCalendar]);

  const handleDateClick = (date: Date, dayEvents: PayrollEvent[]) => {
    setSelectedDate(date);
    setSelectedEvents(dayEvents);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedDate(null);
    setSelectedEvents([]);
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'payroll':
        return <PayrollIcon />;
      case 'cra':
        return <CRAIcon />;
      case 'union':
        return <UnionIcon />;
      case 'holiday':
        return <CalendarIcon />;
      case 'probation':
        return <PersonIcon />;
      default:
        return <CalendarIcon />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'payroll':
        return 'primary';
      case 'cra':
        return 'warning';
      case 'union':
        return 'success';
      case 'holiday':
        return 'secondary'; // Use secondary (pink/magenta) for better distinction from blue payroll
      case 'probation':
        return 'info'; // Use info (cyan/blue) for probation reminders
      default:
        return 'default';
    }
  };

  // Filter events for each month
  const currentMonthEvents = events.filter(event => {
    // Parse date string in local timezone to avoid timezone shift issues
    const [year, month, day] = event.date.split('-').map(Number);
    const eventDate = new Date(year, month - 1, day); // month is 0-indexed
    return eventDate >= currentMonth && eventDate < nextMonth;
  });

  const nextMonthEvents = events.filter(event => {
    // Parse date string in local timezone to avoid timezone shift issues
    const [year, month, day] = event.date.split('-').map(Number);
    const eventDate = new Date(year, month - 1, day); // month is 0-indexed
    const nextMonthEnd = addMonths(nextMonth, 1);
    return eventDate >= nextMonth && eventDate < nextMonthEnd;
  });

  // Show loading only if we're actively loading calendar data
  // Don't block on companiesLoading - allow dashboard to show even if companies failed
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchPayrollCalendar}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Payroll Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Month</InputLabel>
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              label="Month"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <MenuItem key={i} value={i}>
                  {format(new Date(2024, i, 1), 'MMMM')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              label="Year"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          
          <Button variant="outlined" onClick={fetchPayrollCalendar}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Company Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Company Filter
        </Typography>
        {companiesLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Loading companies...</Typography>
          </Box>
        ) : (
          <>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Company</InputLabel>
              <Select
                value={selectedCompanyId || 'all'}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedCompanyId(value === 'all' ? null : value);
                }}
                label="Company"
              >
                <MenuItem value="all">All Companies</MenuItem>
                {companies.map((company) => (
                  <MenuItem key={company.id} value={company.id}>
                    {company.legal_name || company.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {selectedCompanyId 
                ? `Showing events for: ${companies.find(c => c.id === selectedCompanyId)?.legal_name || selectedCompanyId}`
                : 'Showing events for all companies'}
            </Typography>
            {companies.length === 0 && !companiesLoading && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                No companies available. Please check if companies exist in the system.
              </Alert>
            )}
          </>
        )}
      </Paper>

      {/* Legend */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Legend
        </Typography>
        <Grid container spacing={2}>
          <Grid item>
            <Chip
              icon={<PayrollIcon />}
              label="Payroll Due"
              color="primary"
              variant="outlined"
            />
          </Grid>
          <Grid item>
            <Chip
              icon={<CRAIcon />}
              label="CRA Payment Due"
              color="warning"
              variant="outlined"
            />
          </Grid>
          <Grid item>
            <Chip
              icon={<UnionIcon />}
              label="Union Payment Due"
              color="success"
              variant="outlined"
            />
          </Grid>
          <Grid item>
            <Chip
              icon={<CalendarIcon />}
              label="Holiday"
              color="secondary"
              variant="outlined"
            />
          </Grid>
          <Grid item>
            <Chip
              icon={<PersonIcon />}
              label="Probation End Date"
              color="info"
              variant="outlined"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Calendar Grid */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <PayrollCalendar
            month={currentMonth}
            events={currentMonthEvents}
            onDateClick={handleDateClick}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <PayrollCalendar
            month={nextMonth}
            events={nextMonthEvents}
            onDateClick={handleDateClick}
          />
        </Grid>
      </Grid>

      {/* Event Details Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Events for {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
        </DialogTitle>
        <DialogContent>
          {selectedEvents.length === 0 ? (
            <Typography color="text.secondary">No events for this date.</Typography>
          ) : (
            <List>
              {selectedEvents.map((event, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemIcon>
                      {getEventIcon(event.event_type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={event.event_type.toUpperCase()}
                            color={getEventColor(event.event_type) as any}
                            size="small"
                          />
                          <Typography variant="subtitle1">
                            {event.company_name}
                          </Typography>
                        </Box>
                      }
                      secondary={event.description}
                    />
                  </ListItem>
                  {index < selectedEvents.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DashboardPage;
