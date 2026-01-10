import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  InputAdornment,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Event as EventIcon,
  Business as BusinessIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { holidayAPI } from '../api/client';
import { useCompanyFilter } from '../contexts/CompanyFilterContext';

interface Holiday {
  id: number;
  company_id: string;
  holiday_date: string;
  name: string;
  is_active: boolean;
  union_only: boolean;
}

interface HolidayFormData {
  company_id: string;
  holiday_date: string;
  name: string;
  is_active: boolean;
  union_only: boolean;
}

const HolidayPage: React.FC = () => {
  // Use companies from the global context instead of fetching them again
  const { companies, loading: companiesLoading } = useCompanyFilter();
  
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number | string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState<HolidayFormData>({
    company_id: '',
    holiday_date: '',
    name: '',
    is_active: true,
    union_only: false,
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [submitting, setSubmitting] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copying, setCopying] = useState(false);

  // Get current year and generate year options (current year ± 2)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const [copyFormData, setCopyFormData] = useState({
    source_company_id: '',
    target_company_id: '',
    year: currentYear,
  });

  const fetchHolidays = useCallback(async () => {
    // Don't try to fetch if no companies available or still loading
    if (companiesLoading || companies.length === 0) {
      setHolidays([]);
      return;
    }
    
    try {
      setLoading(true);
      
      // Get holidays for all companies if "all" is selected
      if (selectedCompanyId === 'all') {
        const allHolidays: Holiday[] = [];
        for (const company of companies) {
          try {
            const params: any = { active_only: false };
            if (selectedYear !== 'all') {
              params.year = selectedYear;
            }
            const response = await holidayAPI.list(company.id, params);
            const companyHolidays = response.data || [];
            allHolidays.push(...companyHolidays);
          } catch (error: any) {
            console.error(`Error fetching holidays for company ${company.id}:`, error);
            // Don't show error for individual companies, just log it
          }
        }
        setHolidays(allHolidays);
      } else {
        // Get holidays for selected company
        const params: any = { active_only: false };
        if (selectedYear !== 'all') {
          params.year = selectedYear;
        }
        const response = await holidayAPI.list(selectedCompanyId, params);
        setHolidays(response.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching holidays:', error);
      let errorMessage = 'Error fetching holidays';
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout: Backend is not responding. Please check if the backend server is running.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, selectedYear, companies, companiesLoading]);

  useEffect(() => {
    // Only fetch holidays if companies are loaded and not loading
    if (!companiesLoading && companies.length > 0) {
      fetchHolidays();
    } else if (!companiesLoading && companies.length === 0) {
      // If no companies and finished loading, set holidays to empty
      setHolidays([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companiesLoading, companies.length, selectedCompanyId, selectedYear]);

  // Filter holidays by search term
  const filteredHolidays = holidays.filter(holiday => {
    const matchesSearch = !searchTerm || 
      holiday.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      holiday.company_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCompany = selectedCompanyId === 'all' || holiday.company_id === selectedCompanyId;
    
    // Parse date string to avoid timezone issues
    const holidayYear = holiday.holiday_date.match(/^\d{4}-\d{2}-\d{2}$/) 
      ? parseInt(holiday.holiday_date.split('-')[0])
      : new Date(holiday.holiday_date).getFullYear();
    const matchesYear = selectedYear === 'all' || holidayYear === selectedYear;
    
    return matchesSearch && matchesCompany && matchesYear;
  });

  const handleOpenDialog = (holiday?: Holiday) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        company_id: holiday.company_id,
        holiday_date: holiday.holiday_date,
        name: holiday.name,
        is_active: holiday.is_active,
        union_only: holiday.union_only || false,
      });
    } else {
      setEditingHoliday(null);
      setFormData({
        company_id: selectedCompanyId !== 'all' ? selectedCompanyId : '',
        holiday_date: '',
        name: '',
        is_active: true,
        union_only: false,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingHoliday(null);
    setFormData({
      company_id: '',
      holiday_date: '',
      name: '',
      is_active: true,
      union_only: false,
    });
  };

  const handleSubmit = async () => {
    if (!formData.company_id || !formData.holiday_date || !formData.name.trim()) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error',
      });
      return;
    }

    try {
      setSubmitting(true);
      if (editingHoliday) {
        await holidayAPI.update(editingHoliday.id, {
          holiday_date: formData.holiday_date,
          name: formData.name.trim(),
          is_active: formData.is_active,
          union_only: formData.union_only,
        });
        setSnackbar({
          open: true,
          message: 'Holiday updated successfully',
          severity: 'success',
        });
      } else {
        await holidayAPI.create({
          company_id: formData.company_id,
          holiday_date: formData.holiday_date,
          name: formData.name.trim(),
          is_active: formData.is_active,
          union_only: formData.union_only,
        });
        setSnackbar({
          open: true,
          message: 'Holiday created successfully',
          severity: 'success',
        });
      }
      handleCloseDialog();
      fetchHolidays();
    } catch (error: any) {
      console.error('Error saving holiday:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || 'Error saving holiday',
        severity: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (holiday: Holiday) => {
    setHolidayToDelete(holiday);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!holidayToDelete) return;

    try {
      await holidayAPI.delete(holidayToDelete.id);
      setSnackbar({
        open: true,
        message: 'Holiday deleted successfully',
        severity: 'success',
      });
      setDeleteDialogOpen(false);
      setHolidayToDelete(null);
      fetchHolidays();
    } catch (error: any) {
      console.error('Error deleting holiday:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || 'Error deleting holiday',
        severity: 'error',
      });
    }
  };

  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company ? (company.trade_name || company.legal_name) : companyId;
  };

  const formatDate = (dateString: string) => {
    // Parse the date string as local date to avoid timezone issues
    // If the date string is in YYYY-MM-DD format, use it directly
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        weekday: 'short'
      });
    }
    // Otherwise, parse as date and format
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      weekday: 'short'
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Holiday Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={() => {
              setCopyFormData({
                source_company_id: '',
                target_company_id: selectedCompanyId !== 'all' ? selectedCompanyId : '',
                year: currentYear,
              });
              setCopyDialogOpen(true);
            }}
            disabled={companies.length === 0 || companies.length < 2}
            sx={{ minWidth: 180 }}
            title={companies.length < 2 ? 'Need at least 2 companies to copy holidays' : 'Copy holidays from one company to another'}
          >
            Copy Holidays
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={companies.length === 0}
            sx={{ minWidth: 150 }}
          >
            Add Holiday
          </Button>
        </Box>
      </Box>

      {!companiesLoading && !loading && companies.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No companies found. Please create companies first before adding holidays.
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Filter by Company</InputLabel>
              <Select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                label="Filter by Company"
                disabled={companiesLoading}
              >
                <MenuItem value="all">All Companies</MenuItem>
                {companies.map((company) => (
                  <MenuItem key={company.id} value={company.id}>
                    {company.trade_name || company.legal_name} ({company.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Filter by Year</InputLabel>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                label="Filter by Year"
                disabled={companiesLoading}
              >
                <MenuItem value="all">All Years</MenuItem>
                {yearOptions.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              placeholder="Search holidays by name or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={companiesLoading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {(companiesLoading || loading) ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredHolidays.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <EventIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No holidays found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm || selectedCompanyId !== 'all' || selectedYear !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first holiday to get started'}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Holiday Name</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredHolidays.map((holiday) => (
                <TableRow key={holiday.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EventIcon color="action" fontSize="small" />
                      <Typography variant="body2">
                        {formatDate(holiday.holiday_date)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {holiday.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BusinessIcon color="action" fontSize="small" />
                      <Typography variant="body2">
                        {getCompanyName(holiday.company_id)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={holiday.is_active ? 'Active' : 'Inactive'}
                        color={holiday.is_active ? 'success' : 'default'}
                        size="small"
                      />
                      {holiday.union_only && (
                        <Chip
                          label="Union Only"
                          color="info"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(holiday)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(holiday)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Company</InputLabel>
                <Select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  label="Company"
                  disabled={!!editingHoliday}
                >
                  {companies.map((company) => (
                    <MenuItem key={company.id} value={company.id}>
                      {company.trade_name || company.legal_name} ({company.id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Holiday Date"
                type="date"
                value={formData.holiday_date}
                onChange={(e) => setFormData({ ...formData, holiday_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Holiday Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., New Year's Day, Christmas Day"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                }
                label="Active"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Inactive holidays will not be excluded from leave calculations
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.union_only}
                    onChange={(e) => setFormData({ ...formData, union_only: e.target.checked })}
                  />
                }
                label="Union Members Only"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                If checked, this holiday will only apply to union members. Non-union employees will not have this holiday excluded from leave calculations or receive stat holiday pay.
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || !formData.company_id || !formData.holiday_date || !formData.name.trim()}
          >
            {submitting ? <CircularProgress size={20} /> : editingHoliday ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Holiday</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this holiday? This action cannot be undone.
          </Typography>
          {holidayToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Date:</strong> {formatDate(holidayToDelete.holiday_date)}
              </Typography>
              <Typography variant="body2">
                <strong>Name:</strong> {holidayToDelete.name}
              </Typography>
              <Typography variant="body2">
                <strong>Company:</strong> {getCompanyName(holidayToDelete.company_id)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copy Holidays Dialog */}
      <Dialog open={copyDialogOpen} onClose={() => setCopyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Copy Holidays from Another Company</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Source Company (Copy From)</InputLabel>
                <Select
                  value={copyFormData.source_company_id}
                  onChange={(e) => setCopyFormData({ ...copyFormData, source_company_id: e.target.value })}
                  label="Source Company (Copy From)"
                >
                  {companies
                    .filter(c => c.id !== copyFormData.target_company_id)
                    .map((company) => (
                      <MenuItem key={company.id} value={company.id}>
                        {company.trade_name || company.legal_name} ({company.id})
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Target Company (Copy To)</InputLabel>
                <Select
                  value={copyFormData.target_company_id}
                  onChange={(e) => setCopyFormData({ ...copyFormData, target_company_id: e.target.value })}
                  label="Target Company (Copy To)"
                >
                  {companies
                    .filter(c => c.id !== copyFormData.source_company_id)
                    .map((company) => (
                      <MenuItem key={company.id} value={company.id}>
                        {company.trade_name || company.legal_name} ({company.id})
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Year"
                type="number"
                value={copyFormData.year}
                onChange={(e) => setCopyFormData({ ...copyFormData, year: parseInt(e.target.value) || currentYear })}
                inputProps={{ min: 2000, max: 2100 }}
                required
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Holidays from the selected year will be copied to the target company
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                This will copy all holidays from the source company for the selected year to the target company.
                Duplicate holidays (same date) will be skipped automatically.
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopyDialogOpen(false)} disabled={copying}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!copyFormData.source_company_id || !copyFormData.target_company_id) {
                setSnackbar({
                  open: true,
                  message: 'Please select both source and target companies',
                  severity: 'error',
                });
                return;
              }

              if (copyFormData.source_company_id === copyFormData.target_company_id) {
                setSnackbar({
                  open: true,
                  message: 'Source and target companies must be different',
                  severity: 'error',
                });
                return;
              }

              try {
                setCopying(true);
                const response = await holidayAPI.copy(
                  copyFormData.source_company_id,
                  copyFormData.target_company_id,
                  copyFormData.year,
                  true // skip duplicates
                );

                setSnackbar({
                  open: true,
                  message: response.data.message || `Successfully copied ${response.data.copied} holiday(s)`,
                  severity: 'success',
                });

                setCopyDialogOpen(false);
                fetchHolidays(); // Refresh the list
              } catch (error: any) {
                console.error('Error copying holidays:', error);
                setSnackbar({
                  open: true,
                  message: error.response?.data?.detail || 'Error copying holidays',
                  severity: 'error',
                });
              } finally {
                setCopying(false);
              }
            }}
            variant="contained"
            disabled={copying || !copyFormData.source_company_id || !copyFormData.target_company_id}
            startIcon={copying ? <CircularProgress size={16} /> : <ContentCopyIcon />}
          >
            {copying ? 'Copying...' : 'Copy Holidays'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
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

export default HolidayPage;

