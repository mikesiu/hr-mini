import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Alert, Snackbar,
  CircularProgress, FormControl, InputLabel, Select, MenuItem, Autocomplete,
} from '@mui/material';
import { Add, Edit, Delete, PersonAdd, Visibility } from '@mui/icons-material';
import { workScheduleAPI, employeeAPI } from '../api/client';
import { useCompanyFilter } from '../contexts/CompanyFilterContext';
import CompanyFilter from '../components/CompanyFilter';

interface WorkSchedule {
  id: number;
  company_id: string;
  name: string;
  mon_start?: string;
  mon_end?: string;
  tue_start?: string;
  tue_end?: string;
  wed_start?: string;
  wed_end?: string;
  thu_start?: string;
  thu_end?: string;
  fri_start?: string;
  fri_end?: string;
  sat_start?: string;
  sat_end?: string;
  sun_start?: string;
  sun_end?: string;
  is_active: boolean;
}

const WorkSchedulePage: React.FC = () => {
  const { selectedCompanyId, setSelectedCompanyId } = useCompanyFilter();
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
  const [formData, setFormData] = useState<Partial<WorkSchedule>>({
    company_id: selectedCompanyId || '',
    name: '',
    is_active: true,
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Employee schedule assignment state
  interface EmployeeOption {
    id: string;
    full_name: string;
    first_name: string;
    last_name: string;
  }
  
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningSchedule, setAssigningSchedule] = useState<WorkSchedule | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);
  const [assignmentFormData, setAssignmentFormData] = useState({
    effective_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });
  
  // View assignments state
  interface EmployeeAssignment {
    id: number;
    employee_id: string;
    employee_name?: string;
    schedule_id: number;
    effective_date: string;
    end_date?: string;
  }
  
  const [assignmentsDialogOpen, setAssignmentsDialogOpen] = useState(false);
  const [viewingSchedule, setViewingSchedule] = useState<WorkSchedule | null>(null);
  const [scheduleAssignments, setScheduleAssignments] = useState<EmployeeAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<EmployeeAssignment | null>(null);
  const [editAssignmentFormData, setEditAssignmentFormData] = useState({
    effective_date: '',
    end_date: '',
  });

  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const loadSchedules = React.useCallback(async () => {
    // Only load schedules if a company is selected
    if (!selectedCompanyId) {
      setSchedules([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await workScheduleAPI.list({ company_id: selectedCompanyId });
      setSchedules(response.data.data || []);
    } catch (error: any) {
      setSnackbar({ open: true, message: `Error loading schedules: ${error.response?.data?.detail || error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // Fetch employees for assignment
  const loadEmployees = useCallback(async () => {
    if (!selectedCompanyId) {
      setEmployees([]);
      return;
    }
    try {
      const response = await employeeAPI.list({ company_id: selectedCompanyId });
      if (response.data && response.data.success) {
        setEmployees(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleOpenDialog = (schedule?: WorkSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData(schedule);
    } else {
      setEditingSchedule(null);
      setFormData({ company_id: selectedCompanyId || '', name: '', is_active: true });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSchedule(null);
    setFormData({ company_id: selectedCompanyId || '', name: '', is_active: true });
  };

  const handleSave = async () => {
    try {
      if (editingSchedule) {
        await workScheduleAPI.update(editingSchedule.id, formData);
        setSnackbar({ open: true, message: 'Schedule updated successfully', severity: 'success' });
      } else {
        await workScheduleAPI.create(formData);
        setSnackbar({ open: true, message: 'Schedule created successfully', severity: 'success' });
      }
      handleCloseDialog();
      loadSchedules();
    } catch (error: any) {
      setSnackbar({ open: true, message: `Error saving schedule: ${error.response?.data?.detail || error.message}`, severity: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await workScheduleAPI.delete(id);
      setSnackbar({ open: true, message: 'Schedule deleted successfully', severity: 'success' });
      loadSchedules();
    } catch (error: any) {
      setSnackbar({ open: true, message: `Error deleting schedule: ${error.response?.data?.detail || error.message}`, severity: 'error' });
    }
  };

  const handleOpenAssignDialog = (schedule: WorkSchedule) => {
    setAssigningSchedule(schedule);
    setSelectedEmployee(null);
    setAssignmentFormData({
      effective_date: new Date().toISOString().split('T')[0],
      end_date: '',
    });
    setAssignDialogOpen(true);
  };

  const handleCloseAssignDialog = () => {
    setAssignDialogOpen(false);
    setAssigningSchedule(null);
    setSelectedEmployee(null);
    setAssignmentFormData({
      effective_date: new Date().toISOString().split('T')[0],
      end_date: '',
    });
  };

  const handleAssignSchedule = async () => {
    if (!assigningSchedule || !selectedEmployee) {
      setSnackbar({ open: true, message: 'Please select an employee', severity: 'error' });
      return;
    }

    try {
      const payload: any = {
        employee_id: selectedEmployee.id,
        effective_date: assignmentFormData.effective_date,
      };
      
      // Only include end_date if it's not empty
      if (assignmentFormData.end_date && assignmentFormData.end_date.trim() !== '') {
        payload.end_date = assignmentFormData.end_date;
      }
      
      await workScheduleAPI.assign(assigningSchedule.id, payload);
      setSnackbar({ open: true, message: `Schedule assigned to ${selectedEmployee.full_name} successfully`, severity: 'success' });
      handleCloseAssignDialog();
    } catch (error: any) {
      setSnackbar({ open: true, message: `Error assigning schedule: ${error.response?.data?.detail || error.message}`, severity: 'error' });
    }
  };

  const handleOpenAssignmentsDialog = async (schedule: WorkSchedule) => {
    setViewingSchedule(schedule);
    setAssignmentsDialogOpen(true);
    setAssignmentsLoading(true);
    
    try {
      const response = await workScheduleAPI.getAssignments(schedule.id);
      setScheduleAssignments(response.data.data || []);
    } catch (error: any) {
      setSnackbar({ open: true, message: `Error loading assignments: ${error.response?.data?.detail || error.message}`, severity: 'error' });
      setScheduleAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const handleCloseAssignmentsDialog = () => {
    setAssignmentsDialogOpen(false);
    setViewingSchedule(null);
    setScheduleAssignments([]);
    setEditingAssignment(null);
    setEditAssignmentFormData({ effective_date: '', end_date: '' });
  };

  const handleOpenEditAssignment = (assignment: EmployeeAssignment) => {
    setEditingAssignment(assignment);
    // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
    // Backend sends dates as ISO strings (YYYY-MM-DD), so extract that part directly
    const formatDateForInput = (dateStr: string | undefined) => {
      if (!dateStr) return '';
      // Extract YYYY-MM-DD from the string (handles both "2024-12-31" and "2024-12-31T00:00:00" formats)
      const match = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) {
        return match[1]; // Return just the date part
      }
      // If no match, try parsing as Date but use local date components to avoid timezone shift
      try {
        const date = new Date(dateStr);
        // Use local date methods, not UTC, since we want the date as the user sees it
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch {
        return dateStr;
      }
    };
    
    setEditAssignmentFormData({
      effective_date: formatDateForInput(assignment.effective_date),
      end_date: formatDateForInput(assignment.end_date),
    });
  };

  const handleCloseEditAssignment = () => {
    setEditingAssignment(null);
    setEditAssignmentFormData({ effective_date: '', end_date: '' });
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignment) return;

    try {
      const payload: any = {};
      if (editAssignmentFormData.effective_date) {
        payload.effective_date = editAssignmentFormData.effective_date;
      }
      if (editAssignmentFormData.end_date && editAssignmentFormData.end_date.trim() !== '') {
        payload.end_date = editAssignmentFormData.end_date;
      } else {
        payload.end_date = null; // Clear end date to make it ongoing
      }

      await workScheduleAPI.updateAssignment(editingAssignment.id, payload);
      setSnackbar({ open: true, message: `Assignment updated successfully`, severity: 'success' });
      
      // Reload assignments
      if (viewingSchedule) {
        const response = await workScheduleAPI.getAssignments(viewingSchedule.id);
        setScheduleAssignments(response.data.data || []);
      }
      
      handleCloseEditAssignment();
    } catch (error: any) {
      setSnackbar({ open: true, message: `Error updating assignment: ${error.response?.data?.detail || error.message}`, severity: 'error' });
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      // Extract YYYY-MM-DD from the string first to avoid timezone issues
      const dateMatch = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const [year, month, day] = dateMatch[1].split('-').map(Number);
        // Create date using local timezone to avoid shifts
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }
      // Fallback to original parsing if no match
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '-';
    return timeStr.substring(0, 5); // HH:MM
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Work Schedules
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          disabled={!selectedCompanyId}
        >
          Create Schedule
        </Button>
      </Box>

      {/* Company Filter */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Select Company
        </Typography>
        <CompanyFilter
          value={selectedCompanyId}
          onChange={setSelectedCompanyId}
          showAllOption={false}
          label="Select Company"
          size="small"
        />
      </Paper>

      {!selectedCompanyId && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Please select a company above to view and manage schedules.
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Mon</TableCell>
              <TableCell>Tue</TableCell>
              <TableCell>Wed</TableCell>
              <TableCell>Thu</TableCell>
              <TableCell>Fri</TableCell>
              <TableCell>Sat</TableCell>
              <TableCell>Sun</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {schedules.map((schedule) => (
              <TableRow key={schedule.id}>
                <TableCell>{schedule.name}</TableCell>
                <TableCell>{formatTime(schedule.mon_start)} - {formatTime(schedule.mon_end)}</TableCell>
                <TableCell>{formatTime(schedule.tue_start)} - {formatTime(schedule.tue_end)}</TableCell>
                <TableCell>{formatTime(schedule.wed_start)} - {formatTime(schedule.wed_end)}</TableCell>
                <TableCell>{formatTime(schedule.thu_start)} - {formatTime(schedule.thu_end)}</TableCell>
                <TableCell>{formatTime(schedule.fri_start)} - {formatTime(schedule.fri_end)}</TableCell>
                <TableCell>{formatTime(schedule.sat_start)} - {formatTime(schedule.sat_end)}</TableCell>
                <TableCell>{formatTime(schedule.sun_start)} - {formatTime(schedule.sun_end)}</TableCell>
                <TableCell>{schedule.is_active ? 'Active' : 'Inactive'}</TableCell>
                <TableCell>
                  <IconButton 
                    size="small" 
                    onClick={() => handleOpenAssignmentsDialog(schedule)}
                    title="View Assignments"
                    color="info"
                  >
                    <Visibility />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => handleOpenAssignDialog(schedule)}
                    title="Assign to Employee"
                    color="primary"
                  >
                    <PersonAdd />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleOpenDialog(schedule)} title="Edit">
                    <Edit />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(schedule.id)} title="Delete">
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingSchedule ? 'Edit Schedule' : 'Create Schedule'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Schedule Name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            {days.map((day, idx) => (
              <React.Fragment key={day}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label={`${dayLabels[idx]} Start`}
                    type="time"
                    value={formData[`${day}_start` as keyof WorkSchedule] || ''}
                    onChange={(e) => setFormData({ ...formData, [`${day}_start`]: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label={`${dayLabels[idx]} End`}
                    type="time"
                    value={formData[`${day}_end` as keyof WorkSchedule] || ''}
                    onChange={(e) => setFormData({ ...formData, [`${day}_end`]: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </React.Fragment>
            ))}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* View Assignments Dialog */}
      <Dialog open={assignmentsDialogOpen} onClose={handleCloseAssignmentsDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Employee Assignments: {viewingSchedule?.name || ''}
        </DialogTitle>
        <DialogContent>
          {assignmentsLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : scheduleAssignments.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              No employees assigned to this schedule.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee Name</TableCell>
                    <TableCell>Employee ID</TableCell>
                    <TableCell>Effective Date</TableCell>
                    <TableCell>End Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scheduleAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>{assignment.employee_name || assignment.employee_id}</TableCell>
                      <TableCell>{assignment.employee_id}</TableCell>
                      <TableCell>{formatDate(assignment.effective_date)}</TableCell>
                      <TableCell>{assignment.end_date ? formatDate(assignment.end_date) : 'Ongoing'}</TableCell>
                      <TableCell>
                        {assignment.end_date && new Date(assignment.end_date) < new Date() 
                          ? 'Ended' 
                          : assignment.end_date 
                            ? 'Active (Scheduled End)' 
                            : 'Active'}
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenEditAssignment(assignment)}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssignmentsDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={!!editingAssignment} onClose={handleCloseEditAssignment} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit Assignment: {editingAssignment?.employee_name || editingAssignment?.employee_id}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Effective Date"
                type="date"
                value={editAssignmentFormData.effective_date}
                onChange={(e) => setEditAssignmentFormData({ ...editAssignmentFormData, effective_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="End Date (Optional)"
                type="date"
                value={editAssignmentFormData.end_date}
                onChange={(e) => setEditAssignmentFormData({ ...editAssignmentFormData, end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="Leave empty to make assignment ongoing, or set a date to deactivate"
              />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mt: 1 }}>
                To deactivate this assignment, set an End Date. To make it ongoing again, clear the End Date.
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditAssignment}>Cancel</Button>
          <Button 
            onClick={handleUpdateAssignment} 
            variant="contained"
            disabled={!editAssignmentFormData.effective_date}
          >
            Update Assignment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Schedule Dialog */}
      <Dialog open={assignDialogOpen} onClose={handleCloseAssignDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Assign Schedule: {assigningSchedule?.name || ''}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Autocomplete
                options={employees}
                getOptionLabel={(option) => option.full_name || `${option.first_name} ${option.last_name}`}
                value={selectedEmployee}
                onChange={(_, newValue) => setSelectedEmployee(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Employee"
                    placeholder="Search employee..."
                    required
                  />
                )}
                disabled={!selectedCompanyId || employees.length === 0}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Effective Date"
                type="date"
                value={assignmentFormData.effective_date}
                onChange={(e) => setAssignmentFormData({ ...assignmentFormData, effective_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="End Date (Optional)"
                type="date"
                value={assignmentFormData.end_date}
                onChange={(e) => setAssignmentFormData({ ...assignmentFormData, end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="Leave empty for ongoing assignment"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssignDialog}>Cancel</Button>
          <Button 
            onClick={handleAssignSchedule} 
            variant="contained"
            disabled={!selectedEmployee || !assignmentFormData.effective_date}
          >
            Assign Schedule
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default WorkSchedulePage;

