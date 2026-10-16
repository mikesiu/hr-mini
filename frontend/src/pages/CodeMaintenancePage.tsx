import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { codeAPI, CodeCategory, CodeValue } from '../api/client';

const CATEGORIES: { key: CodeCategory; label: string; usedIn: string }[] = [
  { key: 'employee_type', label: 'Employee Type', usedIn: 'Employment Management' },
  { key: 'wage_classification', label: 'Wage Classification', usedIn: 'Salary Management' },
  { key: 'department', label: 'Department', usedIn: 'Employment Management' },
  { key: 'position', label: 'Position', usedIn: 'Employment Management' },
];

const emptyForm = { code: '', description: '', sort_order: 0, is_active: true };

const CodeMaintenancePage: React.FC = () => {
  const [category, setCategory] = useState<CodeCategory>('employee_type');
  const [rows, setRows] = useState<CodeValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CodeValue | null>(null);
  const [form, setForm] = useState(emptyForm);

  const current = CATEGORIES.find((c) => c.key === category)!;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await codeAPI.list({ category });
      setRows(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load code values');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  const openDialog = (row?: CodeValue) => {
    setEditing(row || null);
    setForm(
      row
        ? { code: row.code, description: row.description || '', sort_order: row.sort_order, is_active: row.is_active }
        : { ...emptyForm, sort_order: (rows.reduce((m, r) => Math.max(m, r.sort_order), 0) || 0) + 10 }
    );
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        code: form.code.trim(),
        description: form.description.trim() || null,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      };
      if (editing) {
        await codeAPI.update(editing.id, payload);
      } else {
        await codeAPI.create({ category, ...payload });
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save code value');
    }
  };

  const handleToggleActive = async (row: CodeValue) => {
    try {
      await codeAPI.update(row.id, { is_active: !row.is_active });
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update code value');
    }
  };

  const handleDelete = async (row: CodeValue) => {
    if (
      !window.confirm(
        `Delete "${row.code}"? Records that already use it keep their value. To hide it from dropdowns without deleting, switch it to inactive instead.`
      )
    ) {
      return;
    }
    try {
      await codeAPI.delete(row.id);
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete code value');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Code Maintenance</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog()}>
          Add {current.label}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 2 }}>
        <Tabs value={category} onChange={(_, v) => setCategory(v)} variant="scrollable">
          {CATEGORIES.map((c) => (
            <Tab key={c.key} value={c.key} label={c.label} />
          ))}
        </Tabs>
      </Paper>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Active values appear in the {current.label} dropdown in {current.usedIn}, in sort order.
      </Typography>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Value</TableCell>
              <TableCell>Description</TableCell>
              <TableCell width={110}>Sort Order</TableCell>
              <TableCell width={110}>Status</TableCell>
              <TableCell width={150} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary">No values yet.</Typography>
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id} hover sx={{ opacity: row.is_active ? 1 : 0.55 }}>
                <TableCell>{row.code}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell>{row.sort_order}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={row.is_active ? 'Active' : 'Inactive'}
                    color={row.is_active ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={row.is_active ? 'Deactivate' : 'Activate'}>
                    <Switch size="small" checked={row.is_active} onChange={() => handleToggleActive(row)} />
                  </Tooltip>
                  <IconButton size="small" onClick={() => openDialog(row)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(row)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editing ? 'Edit' : 'Add'} {current.label}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            required
            margin="dense"
            label="Value"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            helperText={editing ? 'Renaming does not change records that already use the old value.' : undefined}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            type="number"
            label="Sort Order"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
          />
          <FormControlLabel
            control={
              <Switch checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.code.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CodeMaintenancePage;
