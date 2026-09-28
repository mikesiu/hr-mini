import React, { useState, useEffect } from 'react';
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
  Divider,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { companyAPI } from '../api/client';

interface VacationTier {
  id?: number;
  min_years: number;
  max_years: number | null;
  percent: number;
  union_member: boolean;
}

const BC_ESA_TIERS = [
  { min_years: 0, max_years: 5, percent: 4 },
  { min_years: 5, max_years: null, percent: 6 },
] as const;

const CA_SCHEDULE_TIERS = [
  { min_years: 0, max_years: 5, percent: 4 },
  { min_years: 5, max_years: 11, percent: 6 },
  { min_years: 11, max_years: 21, percent: 8 },
  { min_years: 21, max_years: null, percent: 10 },
] as const;

const defaultVacationTiers = (): VacationTier[] => [
  ...BC_ESA_TIERS.map((t) => ({ ...t, max_years: t.max_years as number | null, union_member: false })),
  ...BC_ESA_TIERS.map((t) => ({ ...t, max_years: t.max_years as number | null, union_member: true })),
];

const withUnionFlag = (
  schedule: ReadonlyArray<{ min_years: number; max_years: number | null; percent: number }>,
  union_member: boolean
): VacationTier[] => schedule.map((t) => ({ ...t, union_member }));

interface Company {
  id: string;
  legal_name: string;
  trade_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country: string;
  notes?: string;
  payroll_due_start_date?: string;
  pay_period_start_date?: string;
  payroll_frequency?: string;
  cra_due_dates?: string;
  union_due_date?: number;
  vacation_pay_with_payroll?: boolean;
  vacation_percent_tiers?: VacationTier[];
  created_at?: string;
  updated_at?: string;
}

interface CompanyFormData {
  id: string;
  legal_name: string;
  trade_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  notes: string;
  payroll_due_start_date: string;
  pay_period_start_date: string;
  payroll_frequency: string;
  cra_due_dates: string;
  union_due_date: string;
  vacation_pay_with_payroll: boolean;
  vacation_percent_tiers: VacationTier[];
}

const CompanyPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>({
    id: '',
    legal_name: '',
    trade_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    province: '',
    postal_code: '',
    country: 'Canada',
    notes: '',
    payroll_due_start_date: '',
    pay_period_start_date: '',
    payroll_frequency: '',
    cra_due_dates: '',
    union_due_date: '',
    vacation_pay_with_payroll: true,
    vacation_percent_tiers: defaultVacationTiers(),
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await companyAPI.list({ search: searchTerm || undefined });
      if (response.data.success) {
        setCompanies(response.data.data || []);
      } else {
        setCompanies([]);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      setCompanies([]);
      setSnackbar({
        open: true,
        message: 'Error fetching companies',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenDialog = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        id: company.id,
        legal_name: company.legal_name,
        trade_name: company.trade_name || '',
        address_line1: company.address_line1 || '',
        address_line2: company.address_line2 || '',
        city: company.city || '',
        province: company.province || '',
        postal_code: company.postal_code || '',
        country: company.country || 'Canada',
        notes: company.notes || '',
        payroll_due_start_date: company.payroll_due_start_date || '',
        pay_period_start_date: company.pay_period_start_date || '',
        payroll_frequency: company.payroll_frequency || '',
        cra_due_dates: company.cra_due_dates || '',
        union_due_date: company.union_due_date ? company.union_due_date.toString() : '',
        vacation_pay_with_payroll: company.vacation_pay_with_payroll !== false,
        vacation_percent_tiers: (() => {
          const loaded = (company.vacation_percent_tiers || []).map((t) => ({
            id: t.id,
            min_years: t.min_years,
            max_years: t.max_years ?? null,
            percent: t.percent,
            union_member: !!(t as VacationTier).union_member,
          }));
          if (!loaded.length) return defaultVacationTiers();
          const hasUnion = loaded.some((t) => t.union_member);
          const hasNonUnion = loaded.some((t) => !t.union_member);
          // Legacy rows without union_member were treated as non-union; seed the missing group
          if (!hasUnion && hasNonUnion) {
            return [
              ...loaded,
              ...loaded.map((t) => ({
                min_years: t.min_years,
                max_years: t.max_years,
                percent: t.percent,
                union_member: true,
              })),
            ];
          }
          if (hasUnion && !hasNonUnion) {
            return [
              ...loaded.map((t) => ({
                min_years: t.min_years,
                max_years: t.max_years,
                percent: t.percent,
                union_member: false,
              })),
              ...loaded,
            ];
          }
          return loaded;
        })(),
      });
    } else {
      setEditingCompany(null);
      setFormData({
        id: '',
        legal_name: '',
        trade_name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        province: '',
        postal_code: '',
        country: 'Canada',
        notes: '',
        payroll_due_start_date: '',
        pay_period_start_date: '',
        payroll_frequency: '',
        cra_due_dates: '',
        union_due_date: '',
        vacation_pay_with_payroll: true,
        vacation_percent_tiers: defaultVacationTiers(),
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCompany(null);
    setFormData({
      id: '',
      legal_name: '',
      trade_name: '',
      address_line1: '',
      address_line2: '',
      city: '',
      province: '',
      postal_code: '',
      country: 'Canada',
      notes: '',
      payroll_due_start_date: '',
      pay_period_start_date: '',
      payroll_frequency: '',
      cra_due_dates: '',
      union_due_date: '',
      vacation_pay_with_payroll: true,
      vacation_percent_tiers: defaultVacationTiers(),
    });
  };

  const handleSubmit = async () => {
    try {
      // Clean form data - convert empty strings to null/undefined for optional fields
      const cleanedFormData = {
        ...formData,
        trade_name: formData.trade_name || undefined,
        address_line1: formData.address_line1 || undefined,
        address_line2: formData.address_line2 || undefined,
        city: formData.city || undefined,
        province: formData.province || undefined,
        postal_code: formData.postal_code || undefined,
        notes: formData.notes || undefined,
        payroll_due_start_date: formData.payroll_due_start_date && formData.payroll_due_start_date !== '' ? formData.payroll_due_start_date : undefined,
        pay_period_start_date: formData.pay_period_start_date && formData.pay_period_start_date !== '' ? formData.pay_period_start_date : undefined,
        payroll_frequency: formData.payroll_frequency || undefined,
        cra_due_dates: formData.cra_due_dates || undefined,
        union_due_date: formData.union_due_date && formData.union_due_date !== '' ? Number(formData.union_due_date) : undefined,
        vacation_pay_with_payroll: formData.vacation_pay_with_payroll,
      };
      const { vacation_percent_tiers, ...companyPayload } = cleanedFormData as any;

      if (editingCompany) {
        await companyAPI.update(editingCompany.id, companyPayload);
        await companyAPI.replaceVacationPercentTiers(
          editingCompany.id,
          formData.vacation_percent_tiers.map((t) => ({
            min_years: Number(t.min_years),
            max_years: t.max_years === null || t.max_years === ('' as any) ? null : Number(t.max_years),
            percent: Number(t.percent),
            union_member: !!t.union_member,
          }))
        );
        setSnackbar({
          open: true,
          message: 'Company updated successfully',
          severity: 'success',
        });
      } else {
        await companyAPI.create(companyPayload);
        // New company seeds BC ESA tiers on backend; overwrite if user edited
        if (formData.id) {
          await companyAPI.replaceVacationPercentTiers(
            formData.id.toUpperCase(),
            formData.vacation_percent_tiers.map((t) => ({
              min_years: Number(t.min_years),
              max_years: t.max_years === null || t.max_years === ('' as any) ? null : Number(t.max_years),
              percent: Number(t.percent),
              union_member: !!t.union_member,
            }))
          );
        }
        setSnackbar({
          open: true,
          message: 'Company created successfully',
          severity: 'success',
        });
      }
      handleCloseDialog();
      fetchCompanies();
    } catch (error: any) {
      console.error('Error saving company:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || 'Error saving company',
        severity: 'error',
      });
    }
  };

  const handleDelete = async (companyId: string) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      try {
        await companyAPI.delete(companyId);
        setSnackbar({
          open: true,
          message: 'Company deleted successfully',
          severity: 'success',
        });
        fetchCompanies();
      } catch (error: any) {
        console.error('Error deleting company:', error);
        setSnackbar({
          open: true,
          message: error.response?.data?.detail || 'Error deleting company',
          severity: 'error',
        });
      }
    }
  };

  const formatAddress = (company: Company) => {
    const parts = [
      company.address_line1,
      company.address_line2,
      company.city,
      company.province,
      company.postal_code,
    ].filter(Boolean);
    return parts.join(', ') || 'No address';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Company Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ minWidth: 150 }}
        >
          Add Company
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search companies by name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Company ID</TableCell>
                <TableCell>Legal Name</TableCell>
                <TableCell>Trade Name</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Country</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id} hover>
                  <TableCell>
                    <Chip
                      label={company.id}
                      color="primary"
                      size="small"
                      icon={<BusinessIcon />}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {company.legal_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {company.trade_name || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationIcon fontSize="small" color="action" />
                      <Typography variant="body2" sx={{ maxWidth: 200 }}>
                        {formatAddress(company)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {company.country}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit Company">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(company)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Company">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(company.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {companies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No companies found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCompany ? 'Edit Company' : 'Add New Company'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Company ID"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
                required
                disabled={!!editingCompany}
                helperText="Unique identifier (e.g., TOPCO)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Legal Name"
                value={formData.legal_name}
                onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Trade Name"
                value={formData.trade_name}
                onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                helperText="Optional trading name"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address Line 1"
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address Line 2"
                value={formData.address_line2}
                onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Province/State"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Postal Code"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                multiline
                rows={3}
                helperText="Additional notes about the company"
              />
            </Grid>
            
            {/* Payroll Section */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6" color="primary">
                  Payroll Configuration
                </Typography>
              </Divider>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Payroll Due Start Date"
                type="date"
                value={formData.payroll_due_start_date}
                onChange={(e) => setFormData({ ...formData, payroll_due_start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="Reference date to calculate pay due dates"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Payroll Start Date"
                type="date"
                value={formData.pay_period_start_date}
                onChange={(e) => setFormData({ ...formData, pay_period_start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="Start date for calculating pay periods"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Payroll Frequency</InputLabel>
                <Select
                  value={formData.payroll_frequency}
                  onChange={(e) => setFormData({ ...formData, payroll_frequency: e.target.value })}
                  label="Payroll Frequency"
                >
                  <MenuItem value="">Select Frequency</MenuItem>
                  <MenuItem value="bi-weekly">Bi-weekly (Every 14 days)</MenuItem>
                  <MenuItem value="bi-monthly">Bi-monthly (15th and last day)</MenuItem>
                  <MenuItem value="monthly">Monthly (Same day each month)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="CRA Due Dates"
                value={formData.cra_due_dates}
                onChange={(e) => setFormData({ ...formData, cra_due_dates: e.target.value })}
                helperText="Comma-separated day numbers (e.g., 15,30)"
                placeholder="15,30"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Union Due Date"
                type="number"
                value={formData.union_due_date}
                onChange={(e) => setFormData({ ...formData, union_due_date: e.target.value })}
                inputProps={{ min: 1, max: 31 }}
                helperText="Day of month (1-31)"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6" color="primary">
                  Vacation Pay %
                </Typography>
              </Divider>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.vacation_pay_with_payroll}
                    onChange={(e) =>
                      setFormData({ ...formData, vacation_pay_with_payroll: e.target.checked })
                    }
                  />
                }
                label="Vacation paid with payroll (uncheck for deferred vacation pay / staff choose payout period)"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Separate YOS schedules for union and non-union staff. Each employee uses the schedule
                matching their <strong>Union Member</strong> checkbox.
              </Typography>
            </Grid>

            {([false, true] as const).map((isUnion) => {
              const groupTiers = formData.vacation_percent_tiers
                .map((t, index) => ({ t, index }))
                .filter(({ t }) => !!t.union_member === isUnion);
              const title = isUnion ? 'Union members' : 'Non-union members';

              const replaceGroup = (nextGroup: VacationTier[]) => {
                const other = formData.vacation_percent_tiers.filter(
                  (t) => !!t.union_member !== isUnion
                );
                setFormData({
                  ...formData,
                  vacation_percent_tiers: [
                    ...other,
                    ...nextGroup.map((t) => ({ ...t, union_member: isUnion })),
                  ],
                });
              };

              const updateAtGlobal = (globalIndex: number, patch: Partial<VacationTier>) => {
                const tiers = [...formData.vacation_percent_tiers];
                tiers[globalIndex] = { ...tiers[globalIndex], ...patch, union_member: isUnion };
                setFormData({ ...formData, vacation_percent_tiers: tiers });
              };

              return (
                <Grid item xs={12} key={isUnion ? 'union' : 'non-union'}>
                  <Paper variant="outlined" sx={{ p: 1.5, mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {title}
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => replaceGroup(withUnionFlag([...BC_ESA_TIERS], isUnion))}
                      >
                        BC ESA (4% / 6%)
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => replaceGroup(withUnionFlag([...CA_SCHEDULE_TIERS], isUnion))}
                      >
                        CA Schedule (4/6/8/10%)
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          replaceGroup([
                            ...groupTiers.map(({ t }) => t),
                            { min_years: 0, max_years: null, percent: 4, union_member: isUnion },
                          ])
                        }
                      >
                        Add Tier
                      </Button>
                    </Box>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Min years (inclusive)</TableCell>
                          <TableCell>Max years (exclusive, blank = open)</TableCell>
                          <TableCell>Vacation %</TableCell>
                          <TableCell width={60} />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {groupTiers.map(({ t: tier, index: idx }) => (
                          <TableRow key={`${isUnion}-${idx}`}>
                            <TableCell>
                              <TextField
                                type="number"
                                size="small"
                                value={tier.min_years}
                                onChange={(e) =>
                                  updateAtGlobal(idx, { min_years: Number(e.target.value) })
                                }
                                inputProps={{ min: 0, step: 0.5 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                type="number"
                                size="small"
                                value={tier.max_years ?? ''}
                                placeholder="Open"
                                onChange={(e) => {
                                  const v = e.target.value;
                                  updateAtGlobal(idx, {
                                    max_years: v === '' ? null : Number(v),
                                  });
                                }}
                                inputProps={{ min: 0, step: 0.5 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                type="number"
                                size="small"
                                value={tier.percent}
                                onChange={(e) =>
                                  updateAtGlobal(idx, { percent: Number(e.target.value) })
                                }
                                inputProps={{ min: 0, step: 0.1 }}
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                disabled={groupTiers.length <= 1}
                                onClick={() =>
                                  replaceGroup(groupTiers.filter(({ index }) => index !== idx).map(({ t }) => t))
                                }
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                        {groupTiers.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4}>
                              <Typography variant="body2" color="text.secondary">
                                No tiers — BC ESA (4%/6%) will apply until you add a schedule.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Paper>
                </Grid>
              );
            })}

            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" display="block">
                Max is exclusive. For CA 0–4 / 5–10 / 11–20 / 21+ years of service, use max values{' '}
                <strong>5, 11, 21</strong> (not 4, 10, 20) so year 10 stays at 6% until the 11-year mark.
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingCompany ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

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

export default CompanyPage;
