import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  IconButton,
  Autocomplete,
  CircularProgress,
  Chip,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { terminationAPI, employeeAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  status: string;
}

interface Termination {
  id: number;
  employee_id: string;
  last_working_date: string;
  termination_effective_date: string;
  roe_reason_code: string;
  other_reason?: string;
  internal_reason?: string;
  remarks?: string;
  created_at: string;
  created_by?: string;
  employee?: Employee;
}

const ROE_REASON_CODES = {
  'A': 'Shortage of work',
  'B': 'Strike or lockout',
  'C': 'Return to school',
  'D': 'Illness or injury',
  'E': 'Quit',
  'F': 'Maternity leave',
  'G': 'Retirement',
  'M': 'Dismissal or termination',
  'N': 'Leave of absence',
  'K': 'Other'
};

const TerminationPage: React.FC = () => {
  const [terminations, setTerminations] = useState<Termination[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTermination, setEditingTermination] = useState<Termination | null>(null);
  const [viewingTermination, setViewingTermination] = useState<Termination | null>(null);
  const [terminationToDelete, setTerminationToDelete] = useState<Termination | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    employee_id: '',
    last_working_date: '',
    termination_effective_date: '',
    roe_reason_code: '',
    other_reason: '',
    internal_reason: '',
    remarks: '',
  });

  const { hasPermission } = useAuth();

  // Utility function to format date strings as local dates (avoiding timezone issues)
  const formatLocalDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    // Extract the date part (YYYY-MM-DD) from the string
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    // Create a date object using local timezone
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString();
  };

  const loadTerminations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await terminationAPI.list();
      if (response.data && response.data.success) {
        setTerminations(response.data.data);
      } else {
        setTerminations([]);
      }
    } catch (err: any) {
      console.error('Error loading terminations:', err);
      setError(err.response?.data?.detail || 'Failed to load terminations');
      setTerminations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      const response = await employeeAPI.list();
      if (response.data && response.data.success) {
        // Filter out already terminated employees for new termination
        const activeEmployees = response.data.data.filter(
          (emp: Employee) => emp.status !== 'Terminated'
        );
        setEmployees(activeEmployees);
      }
    } catch (err: any) {
      console.error('Error loading employees:', err);
    }
  }, []);

  useEffect(() => {
    loadTerminations();
    loadEmployees();
  }, [loadTerminations, loadEmployees]);

  const handleSearch = () => {
    loadTerminations();
  };

  const filteredTerminations = terminations.filter((term) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      term.employee?.full_name?.toLowerCase().includes(search) ||
      term.employee_id?.toLowerCase().includes(search) ||
      term.roe_reason_code?.toLowerCase().includes(search) ||
      ROE_REASON_CODES[term.roe_reason_code as keyof typeof ROE_REASON_CODES]?.toLowerCase().includes(search)
    );
  });

  const handleCreateClick = () => {
    setFormData({
      employee_id: '',
      last_working_date: '',
      termination_effective_date: '',
      roe_reason_code: '',
      other_reason: '',
      internal_reason: '',
      remarks: '',
    });
    setCreateDialogOpen(true);
    setError('');
    loadEmployees();
  };

  const handleEditClick = (termination: Termination) => {
    setEditingTermination(termination);
    setFormData({
      employee_id: termination.employee_id,
      last_working_date: termination.last_working_date.split('T')[0],
      termination_effective_date: termination.termination_effective_date.split('T')[0],
      roe_reason_code: termination.roe_reason_code,
      other_reason: termination.other_reason || '',
      internal_reason: termination.internal_reason || '',
      remarks: termination.remarks || '',
    });
    setEditDialogOpen(true);
    setError('');
  };

  const handleViewClick = (termination: Termination) => {
    setViewingTermination(termination);
    setViewDialogOpen(true);
  };

  const handleDeleteClick = (termination: Termination) => {
    setTerminationToDelete(termination);
    setDeleteDialogOpen(true);
  };

  const handleCreateSubmit = async () => {
    try {
      setError('');
      if (!formData.employee_id || !formData.last_working_date || !formData.termination_effective_date || !formData.roe_reason_code) {
        setError('Please fill in all required fields');
        return;
      }
      if (formData.roe_reason_code === 'K' && !formData.other_reason.trim()) {
        setError('Other reason is required when ROE reason code is K');
        return;
      }

      await terminationAPI.create(formData);
      setCreateDialogOpen(false);
      setSuccess('Termination created successfully');
      loadTerminations();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create termination');
    }
  };

  const handleEditSubmit = async () => {
    if (!editingTermination) return;
    try {
      setError('');
      if (!formData.last_working_date || !formData.termination_effective_date || !formData.roe_reason_code) {
        setError('Please fill in all required fields');
        return;
      }
      if (formData.roe_reason_code === 'K' && !formData.other_reason.trim()) {
        setError('Other reason is required when ROE reason code is K');
        return;
      }

      await terminationAPI.update(editingTermination.id, formData);
      setEditDialogOpen(false);
      setEditingTermination(null);
      setSuccess('Termination updated successfully');
      loadTerminations();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update termination');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!terminationToDelete) return;
    try {
      await terminationAPI.delete(terminationToDelete.id);
      setDeleteDialogOpen(false);
      setTerminationToDelete(null);
      setSuccess('Termination deleted successfully and employee status restored');
      loadTerminations();
      loadEmployees();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete termination');
    }
  };

  const handleClose = () => {
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    setViewDialogOpen(false);
    setDeleteDialogOpen(false);
    setEditingTermination(null);
    setViewingTermination(null);
    setTerminationToDelete(null);
    setError('');
  };

  const selectedEmployee = employees.find(emp => emp.id === formData.employee_id);

  if (!hasPermission('termination:view')) {
    return (
      <Box p={3}>
        <Alert severity="error">You do not have permission to view terminations.</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Termination Management
        </Typography>
        {hasPermission('termination:create') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateClick}
          >
            Create Termination
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ flexGrow: 1 }}
          />
          <Button variant="outlined" onClick={handleSearch}>
            Search
          </Button>
        </Box>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Employee ID</TableCell>
                <TableCell>Last Working Date</TableCell>
                <TableCell>Termination Effective Date</TableCell>
                <TableCell>ROE Reason Code</TableCell>
                <TableCell>ROE Reason</TableCell>
                <TableCell>Created Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTerminations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary" py={3}>
                      No terminations found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTerminations.map((termination) => (
                  <TableRow key={termination.id}>
                    <TableCell>{termination.employee?.full_name || 'N/A'}</TableCell>
                    <TableCell>{termination.employee_id}</TableCell>
                    <TableCell>
                      {formatLocalDate(termination.last_working_date)}
                    </TableCell>
                    <TableCell>
                      {formatLocalDate(termination.termination_effective_date)}
                    </TableCell>
                    <TableCell>
                      <Chip label={termination.roe_reason_code} size="small" />
                    </TableCell>
                    <TableCell>
                      {ROE_REASON_CODES[termination.roe_reason_code as keyof typeof ROE_REASON_CODES] || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {new Date(termination.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleViewClick(termination)}
                        color="primary"
                      >
                        <VisibilityIcon />
                      </IconButton>
                      {hasPermission('termination:update') && (
                        <IconButton
                          size="small"
                          onClick={() => handleEditClick(termination)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      )}
                      {hasPermission('termination:delete') && (
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(termination)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Create Termination</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Autocomplete
              options={employees}
              getOptionLabel={(option) => `${option.full_name} (${option.id})`}
              value={selectedEmployee || null}
              onChange={(_, newValue) => {
                setFormData({ ...formData, employee_id: newValue?.id || '' });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Employee *"
                  variant="outlined"
                  fullWidth
                  sx={{ mb: 2 }}
                />
              )}
              disabled={!hasPermission('termination:create')}
            />
            <TextField
              label="Last Working Date *"
              type="date"
              value={formData.last_working_date}
              onChange={(e) => setFormData({ ...formData, last_working_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Termination Effective Date *"
              type="date"
              value={formData.termination_effective_date}
              onChange={(e) => setFormData({ ...formData, termination_effective_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>ROE Reason Code *</InputLabel>
              <Select
                value={formData.roe_reason_code}
                onChange={(e) => setFormData({ ...formData, roe_reason_code: e.target.value })}
                label="ROE Reason Code *"
              >
                {Object.entries(ROE_REASON_CODES).map(([code, description]) => (
                  <MenuItem key={code} value={code}>
                    {code} - {description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {formData.roe_reason_code === 'K' && (
              <TextField
                label="Other Reason *"
                value={formData.other_reason}
                onChange={(e) => setFormData({ ...formData, other_reason: e.target.value })}
                fullWidth
                multiline
                rows={3}
                sx={{ mb: 2 }}
              />
            )}
            <TextField
              label="Internal Reason"
              value={formData.internal_reason}
              onChange={(e) => setFormData({ ...formData, internal_reason: e.target.value })}
              fullWidth
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleCreateSubmit} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Edit Termination</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="Employee ID"
              value={formData.employee_id}
              disabled
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="Last Working Date *"
              type="date"
              value={formData.last_working_date}
              onChange={(e) => setFormData({ ...formData, last_working_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Termination Effective Date *"
              type="date"
              value={formData.termination_effective_date}
              onChange={(e) => setFormData({ ...formData, termination_effective_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>ROE Reason Code *</InputLabel>
              <Select
                value={formData.roe_reason_code}
                onChange={(e) => setFormData({ ...formData, roe_reason_code: e.target.value })}
                label="ROE Reason Code *"
              >
                {Object.entries(ROE_REASON_CODES).map(([code, description]) => (
                  <MenuItem key={code} value={code}>
                    {code} - {description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {formData.roe_reason_code === 'K' && (
              <TextField
                label="Other Reason *"
                value={formData.other_reason}
                onChange={(e) => setFormData({ ...formData, other_reason: e.target.value })}
                fullWidth
                multiline
                rows={3}
                sx={{ mb: 2 }}
              />
            )}
            <TextField
              label="Internal Reason"
              value={formData.internal_reason}
              onChange={(e) => setFormData({ ...formData, internal_reason: e.target.value })}
              fullWidth
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained" color="primary">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Termination Details</DialogTitle>
        <DialogContent>
          {viewingTermination && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Employee
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {viewingTermination.employee?.full_name || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Employee ID
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {viewingTermination.employee_id}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Last Working Date
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatLocalDate(viewingTermination.last_working_date)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Termination Effective Date
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatLocalDate(viewingTermination.termination_effective_date)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    ROE Reason Code
                  </Typography>
                  <Chip
                    label={`${viewingTermination.roe_reason_code} - ${ROE_REASON_CODES[viewingTermination.roe_reason_code as keyof typeof ROE_REASON_CODES] || 'Unknown'}`}
                    sx={{ mt: 1 }}
                  />
                </Grid>
                {viewingTermination.other_reason && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Other Reason
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {viewingTermination.other_reason}
                    </Typography>
                  </Grid>
                )}
                {viewingTermination.internal_reason && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Internal Reason
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {viewingTermination.internal_reason}
                    </Typography>
                  </Grid>
                )}
                {viewingTermination.remarks && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Remarks
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {viewingTermination.remarks}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Created Date
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {new Date(viewingTermination.created_at).toLocaleString()}
                  </Typography>
                </Grid>
                {viewingTermination.created_by && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Created By
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {viewingTermination.created_by}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleClose}>
        <DialogTitle>Delete Termination</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the termination record for{' '}
            <strong>{terminationToDelete?.employee?.full_name || terminationToDelete?.employee_id}</strong>?
            This will restore the employee's status to Active.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TerminationPage;

