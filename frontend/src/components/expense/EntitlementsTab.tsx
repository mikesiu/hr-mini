import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { expenseAPI } from '../../api/client';
import { ExpenseEntitlement, CreateEntitlementRequest, UpdateEntitlementRequest, EXPENSE_TYPES, ENTITLEMENT_UNITS } from '../../types/expense';

interface EntitlementsTabProps {
  employeeId: string;
}

const EntitlementsTab: React.FC<EntitlementsTabProps> = ({ employeeId }) => {
  const [entitlements, setEntitlements] = useState<ExpenseEntitlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entitlementToDelete, setEntitlementToDelete] = useState<string | null>(null);

  // Form states
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<CreateEntitlementRequest>({
    employee_id: employeeId,
    expense_type: 'Gas',
    entitlement_amount: 0,
    unit: 'monthly',
    start_date: '',
    end_date: '',
    rollover: 'No',
  });

  // Load entitlements
  const loadEntitlements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await expenseAPI.entitlements({ employee_id: employeeId });
      if (response.data.success) {
        setEntitlements(response.data.data || []);
      } else {
        setError('Failed to load entitlements');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load entitlements');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadEntitlements();
  }, [loadEntitlements]);

  const handleCreate = async () => {
    try {
      // Clean up the data: convert empty strings to null for optional date fields
      const cleanedData: any = {
        ...formData,
      };
      // Convert empty strings to null for date fields (Pydantic expects null, not empty string)
      if (!cleanedData.start_date || cleanedData.start_date === '') {
        cleanedData.start_date = null;
      }
      if (!cleanedData.end_date || cleanedData.end_date === '') {
        cleanedData.end_date = null;
      }
      const response = await expenseAPI.createEntitlement(cleanedData);
      if (response.data.success) {
        setSuccess('Entitlement created successfully!');
        setFormOpen(false);
        resetForm();
        loadEntitlements();
      } else {
        setError('Failed to create entitlement');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create entitlement');
    }
  };

  const handleUpdate = async (entitlementId: string, updateData: UpdateEntitlementRequest) => {
    try {
      // Clean up the data: convert empty strings to null for optional date fields
      const cleanedData: any = {
        ...updateData,
      };
      // Convert empty strings to null for date fields (Pydantic expects null, not empty string)
      if (cleanedData.start_date !== undefined && (!cleanedData.start_date || cleanedData.start_date === '')) {
        cleanedData.start_date = null;
      }
      if (cleanedData.end_date !== undefined && (!cleanedData.end_date || cleanedData.end_date === '')) {
        cleanedData.end_date = null;
      }
      const response = await expenseAPI.updateEntitlement(entitlementId, cleanedData);
      if (response.data.success) {
        setSuccess('Entitlement updated successfully!');
        setEditingId(null);
        loadEntitlements();
      } else {
        setError('Failed to update entitlement');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update entitlement');
    }
  };

  const handleDelete = async () => {
    if (!entitlementToDelete) return;
    
    try {
      const response = await expenseAPI.deleteEntitlement(entitlementToDelete);
      if (response.data.success) {
        setSuccess('Entitlement deleted successfully!');
        setDeleteDialogOpen(false);
        setEntitlementToDelete(null);
        loadEntitlements();
      } else {
        setError('Failed to delete entitlement');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete entitlement');
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: employeeId,
      expense_type: 'Gas',
      entitlement_amount: 0,
      unit: 'monthly',
      start_date: '',
      end_date: '',
      rollover: 'No',
    });
  };

  const openDeleteDialog = (entitlementId: string) => {
    setEntitlementToDelete(entitlementId);
    setDeleteDialogOpen(true);
  };

  const formatAmount = (amount?: number) => {
    return amount ? `$${amount.toFixed(2)}` : 'No Cap';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Expense Entitlements</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setFormOpen(true)}
        >
          Add Entitlement
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {entitlements.length === 0 ? (
        <Alert severity="info">
          No entitlements found for this employee.
        </Alert>
      ) : (
        <Box>
          {entitlements.map((entitlement) => (
            <Accordion key={entitlement.id} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                  <Box>
                    <Typography variant="h6">
                      {entitlement.expense_type} - {entitlement.unit} - {formatAmount(entitlement.entitlement_amount)}
                      {entitlement.unit === 'monthly' && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          (Up to 12 claims per year, max {formatAmount(entitlement.entitlement_amount)} per claim)
                        </Typography>
                      )}
                    </Typography>
                    {entitlement.rollover === 'Yes' && (
                      <Chip label="Rollover Enabled" size="small" color="primary" sx={{ ml: 1 }} />
                    )}
                  </Box>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(entitlement.id);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(entitlement.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Amount:</strong> {formatAmount(entitlement.entitlement_amount)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Unit:</strong> {entitlement.unit}
                    </Typography>
                    {entitlement.unit === 'monthly' && (
                      <Typography variant="body2" color="primary">
                        <strong>Usage:</strong> Up to 12 claims per year, max {formatAmount(entitlement.entitlement_amount)} per claim
                      </Typography>
                    )}
                    {entitlement.rollover === 'Yes' && (
                      <Typography variant="body2" color="primary">
                        <strong>Rollover:</strong> ✅ Enabled
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Start Date:</strong> {formatDate(entitlement.start_date)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>End Date:</strong> {formatDate(entitlement.end_date)}
                    </Typography>
                  </Grid>
                </Grid>

                {editingId === entitlement.id && (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Edit Entitlement
                    </Typography>
                    <EntitlementForm
                      entitlement={entitlement}
                      onSave={(data) => handleUpdate(entitlement.id, data)}
                      onCancel={() => setEditingId(null)}
                    />
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Entitlement</DialogTitle>
        <DialogContent>
          <EntitlementForm
            formData={formData}
            onFormDataChange={setFormData}
            onSave={handleCreate}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Entitlement</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this entitlement? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

interface EntitlementFormProps {
  entitlement?: ExpenseEntitlement;
  formData?: CreateEntitlementRequest;
  onFormDataChange?: (data: CreateEntitlementRequest) => void;
  onSave: (data: CreateEntitlementRequest | UpdateEntitlementRequest) => void;
  onCancel: () => void;
}

const EntitlementForm: React.FC<EntitlementFormProps> = ({
  entitlement,
  formData: propFormData,
  onFormDataChange,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateEntitlementRequest>(
    propFormData || {
      employee_id: '',
      expense_type: 'Gas',
      entitlement_amount: 0,
      unit: 'monthly',
      start_date: '',
      end_date: '',
      rollover: 'No',
    }
  );

  const [clearEndDate, setClearEndDate] = useState(false);

  useEffect(() => {
    if (entitlement) {
      setFormData({
        employee_id: entitlement.employee_id,
        expense_type: entitlement.expense_type,
        entitlement_amount: entitlement.entitlement_amount || 0,
        unit: entitlement.unit,
        start_date: entitlement.start_date || '',
        end_date: entitlement.end_date || '',
        rollover: entitlement.rollover,
      });
    }
  }, [entitlement]);

  const handleChange = (field: keyof CreateEntitlementRequest, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    if (onFormDataChange) {
      onFormDataChange(newData);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: any = { ...formData };
    // Convert empty strings to null for optional date fields (Pydantic expects null, not empty string)
    if (!submitData.start_date || submitData.start_date === '') {
      submitData.start_date = null;
    }
    if (clearEndDate || !submitData.end_date || submitData.end_date === '') {
      submitData.end_date = null;
    }
    onSave(submitData);
  };

  const isYearly = formData.unit === 'yearly';

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Expense Type</InputLabel>
            <Select
              value={formData.expense_type}
              onChange={(e) => handleChange('expense_type', e.target.value)}
              label="Expense Type"
            >
              {EXPENSE_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Entitlement Amount"
            type="number"
            value={formData.entitlement_amount}
            onChange={(e) => handleChange('entitlement_amount', parseFloat(e.target.value) || 0)}
            inputProps={{ min: 0, step: 0.01 }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Unit</InputLabel>
            <Select
              value={formData.unit}
              onChange={(e) => handleChange('unit', e.target.value)}
              label="Unit"
            >
              {ENTITLEMENT_UNITS.map((unit) => (
                <MenuItem key={unit} value={unit}>
                  {unit}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Start Date"
            type="date"
            value={formData.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="End Date (optional)"
            type="date"
            value={clearEndDate ? '' : formData.end_date}
            onChange={(e) => handleChange('end_date', e.target.value)}
            InputLabelProps={{ shrink: true }}
            disabled={clearEndDate}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Button
            variant="outlined"
            onClick={() => setClearEndDate(!clearEndDate)}
            fullWidth
          >
            {clearEndDate ? 'Set End Date' : 'Clear End Date'}
          </Button>
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.rollover === 'Yes' && isYearly}
                onChange={(e) => handleChange('rollover', e.target.checked ? 'Yes' : 'No')}
                disabled={!isYearly}
              />
            }
            label="Enable Rollover (Yearly only)"
          />
          {!isYearly && (
            <Typography variant="caption" color="text.secondary" display="block">
              ℹ️ Rollover is only available for yearly entitlements
            </Typography>
          )}
        </Grid>
      </Grid>

      <Box display="flex" justifyContent="flex-end" gap={1} mt={3}>
        <Button onClick={onCancel} startIcon={<CancelIcon />}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" startIcon={<SaveIcon />}>
          {entitlement ? 'Update' : 'Create'}
        </Button>
      </Box>
    </form>
  );
};

export default EntitlementsTab;
