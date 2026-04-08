import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Alert, Snackbar,
  CircularProgress, Tabs, Tab, FormControl, InputLabel, Select, MenuItem,
  Autocomplete,
} from '@mui/material';
import {
  Add, Edit, Upload, FileDownload, Clear, Refresh, Delete,
} from '@mui/icons-material';
import { attendanceAPI, companyAPI, employeeAPI } from '../api/client';
import { useCompanyFilter } from '../contexts/CompanyFilterContext';
import CompanyFilter from '../components/CompanyFilter';
import { format } from 'date-fns';

interface Attendance {
  id?: number;
  employee_id: string;
  employee_name?: string;
  date: string;
  check_in?: string;
  check_out?: string;
  rounded_check_in?: string;
  rounded_check_out?: string;
  regular_hours: number;
  ot_hours: number;
  weekend_ot_hours: number;
  stat_holiday_hours: number;
  is_manual_override: boolean;
  override_check_in?: string;
  override_check_out?: string;
  override_regular_hours?: number;
  override_ot_hours?: number;
  override_weekend_ot_hours?: number;
  override_stat_holiday_hours?: number;
  time_edit_reason?: string;
  hours_edit_reason?: string;
  notes?: string;
  remarks?: string | null;
  leave_type?: string;
  stat_holiday_name?: string;
}

interface AttendanceReport {
  summary: Array<{
    employee_id: string;
    employee_name: string;
    total_regular_hours: number;
    total_ot_hours: number;
    total_weekend_ot_hours: number;
    total_stat_holiday_hours: number;
    total_days: number;
  }>;
  total_regular_hours: number;
  total_ot_hours: number;
  total_weekend_ot_hours: number;
  total_stat_holiday_hours: number;
}

interface AttendanceDetailRow {
  employee_id: string;
  employee_name: string;
  date: string;
  check_in?: string;
  check_out?: string;
  day_type: string;
  regular_hours: number;
  ot_hours: number;
  weekend_ot_hours: number;
  stat_holiday_hours: number;
  leave_type?: string;
  stat_holiday_name?: string;
  remarks?: string | null;
}

interface AttendanceDetailedReport {
  details: AttendanceDetailRow[];
}

interface PayPeriod {
  start_date: string;
  end_date: string;
  period_number: number;
  year: number;
  duration_days: number;
}

interface Employee {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
}

const AttendancePage: React.FC = () => {
  const { selectedCompanyId, setSelectedCompanyId } = useCompanyFilter();
  const [tabValue, setTabValue] = useState<number>(0);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [detailedReport, setDetailedReport] = useState<AttendanceDetailedReport | null>(null);
  const [reportView, setReportView] = useState<'summary' | 'detailed'>('summary');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    date: '',
    check_in: '',
    check_out: '',
    edited_check_in: '',
    edited_check_out: '',
    edited_regular_hours: '',
    edited_ot_hours: '',
    edited_weekend_ot_hours: '',
    edited_stat_holiday_hours: '',
    time_edit_reason: '',
    hours_edit_reason: '',
    remarks: '',
  });
  // Manual entry state - array of entries for multi-row entry
  const [manualEntries, setManualEntries] = useState<Array<{id: string, date: string, check_in: string, check_out: string, regular_hours: string, ot_hours: string, weekend_ot_hours: string, stat_holiday_hours: string}>>([]);
  const [manualEntryEmployeeId, setManualEntryEmployeeId] = useState<string>('');
  const [manualEntryEmployee, setManualEntryEmployee] = useState<Employee | null>(null);
  const [manualEntrySearchTerm, setManualEntrySearchTerm] = useState<string>('');
  // Period override state
  const [periodOverride, setPeriodOverride] = useState<any>(null);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [overrideFormData, setOverrideFormData] = useState({
    override_regular_hours: '',
    override_ot_hours: '',
    override_weekend_ot_hours: '',
    override_stat_holiday_hours: '',
    reason: '',
  });
  // Period overrides for report (multiple employees)
  const [reportPeriodOverrides, setReportPeriodOverrides] = useState<Map<string, any>>(new Map());
  const [reportFilters, setReportFilters] = useState({
    start_date: '',
    end_date: '',
  });
  const [reportPayPeriod, setReportPayPeriod] = useState<PayPeriod | null>(null);
  const [reportEmployeeId, setReportEmployeeId] = useState<string>('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [file, setFile] = useState<File | null>(null);
  
  // Filter state
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedPayPeriod, setSelectedPayPeriod] = useState<PayPeriod | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  // Manual date range for recalculation
  const [recalcStartDate, setRecalcStartDate] = useState<string>('');
  const [recalcEndDate, setRecalcEndDate] = useState<string>('');
  // Date range for deletion
  const [deleteStartDate, setDeleteStartDate] = useState<string>('');
  const [deleteEndDate, setDeleteEndDate] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch pay periods
  const fetchPayPeriods = useCallback(async () => {
    if (!selectedCompanyId) {
      setPayPeriods([]);
      return;
    }

    try {
      const response = await companyAPI.getPayPeriods(selectedCompanyId, selectedYear);
      const periodData = response.data as { success: boolean; data: PayPeriod[] };
      
      if (periodData.success) {
        setPayPeriods(periodData.data || []);
      } else {
        setPayPeriods([]);
      }
    } catch (err: any) {
      console.error('Error fetching pay periods:', err);
      setPayPeriods([]);
    }
  }, [selectedCompanyId, selectedYear]);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    if (!selectedCompanyId) {
      setEmployees([]);
      return;
    }

    try {
      const response = await employeeAPI.list({ company_id: selectedCompanyId });
      if (response.data && response.data.success) {
        setEmployees(response.data.data || []);
      } else {
        setEmployees([]);
      }
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      setEmployees([]);
    }
  }, [selectedCompanyId]);

  const loadAttendance = React.useCallback(async () => {
    try {
      setLoading(true);
      
      // Require pay period selection to show any data
      if (!selectedPayPeriod) {
        setAttendance([]);
        setLoading(false);
        return;
      }
      
      // If employee is selected, pay period is required (already checked above)
      // If no employee selected, still require pay period to show data
      
      const params: any = {
        company_id: selectedCompanyId || undefined,
      };

      // Add pay period filters (required)
      if (selectedPayPeriod) {
        params.pay_period_start = selectedPayPeriod.start_date;
        params.pay_period_end = selectedPayPeriod.end_date;
      }

      // Add employee filter if selected
      if (selectedEmployeeId) {
        params.employee_id = selectedEmployeeId;
      }

      const response = await attendanceAPI.list(params);
      setAttendance(response.data.data || []);
    } catch (error: any) {
      setSnackbar({ open: true, message: `Error loading attendance: ${error.response?.data?.detail || error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, selectedPayPeriod, selectedEmployeeId]);

  const loadReport = React.useCallback(async () => {
    // Use pay period dates if selected, otherwise use manual date range
    let startDate = reportFilters.start_date;
    let endDate = reportFilters.end_date;
    
    if (reportPayPeriod) {
      startDate = reportPayPeriod.start_date;
      endDate = reportPayPeriod.end_date;
    }

    if (!startDate || !endDate) {
      setSnackbar({ open: true, message: 'Please select a date range or pay period', severity: 'error' });
      return;
    }

    try {
      setLoading(true);
      // Convert empty strings to undefined for API calls
      const apiEmployeeId = reportEmployeeId && reportEmployeeId.trim() ? reportEmployeeId.trim() : undefined;
      const apiCompanyId = selectedCompanyId && selectedCompanyId.trim() ? selectedCompanyId.trim() : undefined;
      
      if (reportView === 'detailed') {
        const response = await attendanceAPI.getDetailedReport({
          company_id: apiCompanyId,
          employee_id: apiEmployeeId,
          start_date: startDate,
          end_date: endDate,
          pay_period_start: reportPayPeriod ? startDate : undefined,
          pay_period_end: reportPayPeriod ? endDate : undefined,
        });
        setDetailedReport(response.data);
        setReport(null); // Clear summary report
        
        // Load period overrides for all employees in the detailed report
        if (reportPayPeriod && apiCompanyId && response.data?.details) {
          const employeeIds = Array.from(new Set(response.data.details.map((d: any) => d.employee_id))) as string[];
          const overrideMap = new Map<string, any>();
          
          for (const empId of employeeIds) {
            try {
              const overrideResponse = await attendanceAPI.getPeriodOverride(empId, {
                company_id: apiCompanyId,
                pay_period_start: startDate,
                pay_period_end: endDate,
              });
              if (overrideResponse.data) {
                overrideMap.set(empId, overrideResponse.data);
              }
            } catch (error: any) {
              // 404 is expected if no override exists
              if (error.response?.status !== 404) {
                console.error(`Error loading override for ${empId}:`, error);
              }
            }
          }
          setReportPeriodOverrides(overrideMap);
        } else {
          setReportPeriodOverrides(new Map());
        }
      } else {
        const response = await attendanceAPI.getReport({
          company_id: apiCompanyId,
          employee_id: apiEmployeeId,
          start_date: startDate,
          end_date: endDate,
          pay_period_start: reportPayPeriod ? startDate : undefined,
          pay_period_end: reportPayPeriod ? endDate : undefined,
        });
        setReport(response.data);
        setDetailedReport(null); // Clear detailed report
        setReportPeriodOverrides(new Map()); // Clear overrides for summary report (already applied in backend)
      }
    } catch (error: any) {
      setSnackbar({ open: true, message: `Error loading report: ${error.response?.data?.detail || error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [reportFilters.start_date, reportFilters.end_date, reportPayPeriod, selectedCompanyId, reportView, reportEmployeeId]);

  // Fetch pay periods when company or year changes
  useEffect(() => {
    if (selectedCompanyId && selectedYear) {
      fetchPayPeriods();
    } else {
      setPayPeriods([]);
      setSelectedPayPeriod(null);
    }
  }, [selectedCompanyId, selectedYear, fetchPayPeriods]);

  // Fetch employees when company changes
  useEffect(() => {
    if (selectedCompanyId) {
      fetchEmployees();
    } else {
      setEmployees([]);
      setSelectedEmployeeId('');
    }
  }, [selectedCompanyId, fetchEmployees]);

  // Clear filters when company changes
  useEffect(() => {
    setSelectedPayPeriod(null);
    setSelectedEmployeeId('');
  }, [selectedCompanyId]);

  // Load period override when employee and pay period are selected
  const loadPeriodOverride = useCallback(async () => {
    if (!selectedEmployeeId || !selectedPayPeriod || !selectedCompanyId) {
      setPeriodOverride(null);
      return;
    }
    
    try {
      const response = await attendanceAPI.getPeriodOverride(selectedEmployeeId, {
        company_id: selectedCompanyId,
        pay_period_start: selectedPayPeriod.start_date,
        pay_period_end: selectedPayPeriod.end_date,
      });
      // Response can be null if no override exists
      setPeriodOverride(response.data || null);
    } catch (error: any) {
      // Handle any errors gracefully
      if (error.response?.status === 404) {
        // 404 means no override exists, which is fine
        setPeriodOverride(null);
      } else {
        console.error('Error loading period override:', error);
        setPeriodOverride(null);
      }
    }
  }, [selectedEmployeeId, selectedPayPeriod, selectedCompanyId]);

  // Load attendance when filters change - but only if pay period is selected
  useEffect(() => {
    if (tabValue === 0) {
      // Don't auto-load if no pay period is selected
      if (!selectedPayPeriod) {
        setAttendance([]);
        return;
      }
      loadAttendance();
      loadPeriodOverride();
    }
  }, [tabValue, loadAttendance, selectedPayPeriod, loadPeriodOverride]);

  // Note: Report is only loaded when user clicks "Generate Report" button
  // Removed auto-loading to prevent automatic generation when dates change

  const handleUploadCSV = async () => {
    if (!file) return;
    try {
      setLoading(true);
      const response = await attendanceAPI.uploadCSV(file);
      const result = response.data;
      
      // Build detailed message
      let message = `CSV upload completed: `;
      if (result.imported_count > 0) {
        message += `${result.imported_count} record(s) imported`;
      }
      if (result.skipped_count > 0) {
        message += `, ${result.skipped_count} skipped (duplicates or invalid)`;
      }
      if (result.error_count > 0) {
        message += `, ${result.error_count} error(s)`;
      }
      
      if (result.errors && result.errors.length > 0) {
        message += `. Errors: ${result.errors.slice(0, 3).join('; ')}`;
        if (result.errors.length > 3) {
          message += ` (and ${result.errors.length - 3} more)`;
        }
      }
      
      const severity = result.error_count > 0 ? 'error' : (result.imported_count > 0 ? 'success' : 'error');
      
      setUploadDialogOpen(false);
      setFile(null);
      
      // Only reload if we have a pay period selected
      if (selectedPayPeriod) {
        loadAttendance();
        setSnackbar({ open: true, message, severity });
      } else {
        // Show detailed message about needing to select pay period
        let payPeriodMessage = message;
        if (result.imported_count > 0) {
          payPeriodMessage += `. IMPORTANT: Please select a pay period that includes the uploaded dates to view the records in the attendance list.`;
        } else if (result.skipped_count > 0) {
          payPeriodMessage += `. Note: Select a pay period to view existing records.`;
        }
        setSnackbar({ 
          open: true, 
          message: payPeriodMessage, 
          severity: severity 
        });
      }
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail || error.message;
      setSnackbar({ open: true, message: `Error uploading CSV: ${errorDetail}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (format: 'excel' | 'csv') => {
    // Use pay period dates if selected, otherwise use manual date range
    let startDate = reportFilters.start_date;
    let endDate = reportFilters.end_date;
    
    if (reportPayPeriod) {
      startDate = reportPayPeriod.start_date;
      endDate = reportPayPeriod.end_date;
    }

    if (!startDate || !endDate) {
      setSnackbar({ open: true, message: 'Please select a date range or pay period', severity: 'error' });
      return;
    }
    try {
      const response = await attendanceAPI.exportReport({
        company_id: selectedCompanyId || undefined,
        start_date: startDate,
        end_date: endDate,
        format,
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_report_${startDate}_${endDate}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSnackbar({ open: true, message: 'Report exported successfully', severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: `Error exporting report: ${error.response?.data?.detail || error.message}`, severity: 'error' });
    }
  };

  const handleOpenDialog = (att?: Attendance) => {
    if (att) {
      setEditingAttendance(att);
      // Calculate effective regular hours for display
      const effectiveRegular = (att.override_regular_hours !== null && att.override_regular_hours !== undefined) 
        ? att.override_regular_hours 
        : (att.regular_hours ?? 0.0);
      
      setFormData({
        employee_id: att.employee_id,
        date: att.date,
        check_in: att.check_in || '',
        check_out: att.check_out || '',
        edited_check_in: att.override_check_in || '',
        edited_check_out: att.override_check_out || '',
        edited_regular_hours: att.override_regular_hours?.toString() || (effectiveRegular > 0 ? effectiveRegular.toString() : ''),
        edited_ot_hours: att.override_ot_hours?.toString() || '',
        edited_weekend_ot_hours: att.override_weekend_ot_hours?.toString() || '',
        edited_stat_holiday_hours: att.override_stat_holiday_hours?.toString() || (att.stat_holiday_hours ? att.stat_holiday_hours.toString() : ''),
        time_edit_reason: att.time_edit_reason || '',
        hours_edit_reason: att.hours_edit_reason || '',
        remarks: att.remarks || '',
      });
      // Clear manual entries when editing
      setManualEntries([]);
      setManualEntryEmployeeId('');
      setManualEntryEmployee(null);
      setManualEntrySearchTerm('');
    } else {
      setEditingAttendance(null);
      setFormData({ 
        employee_id: '', 
        date: '', 
        check_in: '', 
        check_out: '',
        edited_check_in: '',
        edited_check_out: '',
        edited_regular_hours: '',
        edited_ot_hours: '',
        edited_weekend_ot_hours: '',
        edited_stat_holiday_hours: '',
        time_edit_reason: '',
        remarks: '',
        hours_edit_reason: '',
      });
      // Initialize manual entry with one empty row
      setManualEntries([{ 
        id: '1', 
        date: '', 
        check_in: '', 
        check_out: '', 
        regular_hours: '', 
        ot_hours: '', 
        weekend_ot_hours: '', 
        stat_holiday_hours: '' 
      }]);
      setManualEntryEmployeeId('');
      setManualEntryEmployee(null);
      setManualEntrySearchTerm('');
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (editingAttendance) {
        // Convert edited times to time format (HH:MM:SS or HH:MM)
        const parseTime = (timeStr: string) => {
          if (!timeStr || timeStr.trim() === '') return null;
          // If already in HH:MM:SS format, return as-is
          if (timeStr.match(/^\d{2}:\d{2}:\d{2}$/)) return timeStr;
          // If in HH:MM format, add :00
          if (timeStr.match(/^\d{2}:\d{2}$/)) return timeStr + ':00';
          return timeStr;
        };
        
        // Helper to parse hours - return null if empty string, otherwise parse float
        const parseHours = (hoursStr: string) => {
          if (!hoursStr || hoursStr.trim() === '') return null;
          const parsed = parseFloat(hoursStr);
          return isNaN(parsed) ? null : parsed;
        };
        
        const updateData: any = {
          override_check_in: formData.edited_check_in ? parseTime(formData.edited_check_in) : null,
          override_check_out: formData.edited_check_out ? parseTime(formData.edited_check_out) : null,
          override_regular_hours: parseHours(formData.edited_regular_hours),
          override_ot_hours: parseHours(formData.edited_ot_hours),
          override_weekend_ot_hours: parseHours(formData.edited_weekend_ot_hours),
          override_stat_holiday_hours: parseHours(formData.edited_stat_holiday_hours),
          time_edit_reason: formData.time_edit_reason || null,
          hours_edit_reason: formData.hours_edit_reason || null,
          remarks: formData.remarks || null,
        };
        
        // Set is_manual_override based on whether any override fields are provided
        // IMPORTANT: Use explicit boolean checks to ensure we return a boolean, not a truthy value
        const hasOverrides = !!(updateData.override_check_in || updateData.override_check_out || 
                            updateData.override_regular_hours !== null || updateData.override_ot_hours !== null ||
                            updateData.override_weekend_ot_hours !== null || updateData.override_stat_holiday_hours !== null);
        updateData.is_manual_override = hasOverrides;
        
        // If no attendance record, create a new record
        if (!editingAttendance.id) {
          // Create attendance record for any day (stat holiday, leave, or regular day)
          await attendanceAPI.create({
            employee_id: formData.employee_id,
            date: formData.date,
            check_in: formData.edited_check_in ? parseTime(formData.edited_check_in) : null,
            check_out: formData.edited_check_out ? parseTime(formData.edited_check_out) : null,
            regular_hours: editingAttendance.regular_hours || 0,
            ot_hours: editingAttendance.ot_hours || 0,
            weekend_ot_hours: editingAttendance.weekend_ot_hours || 0,
            stat_holiday_hours: editingAttendance.stat_holiday_hours || 0,
            override_check_in: updateData.override_check_in,
            override_check_out: updateData.override_check_out,
            override_regular_hours: updateData.override_regular_hours,
            override_ot_hours: updateData.override_ot_hours,
            override_weekend_ot_hours: updateData.override_weekend_ot_hours,
            override_stat_holiday_hours: updateData.override_stat_holiday_hours,
            time_edit_reason: updateData.time_edit_reason,
            hours_edit_reason: updateData.hours_edit_reason,
            remarks: updateData.remarks,
            is_manual_override: hasOverrides,
          });
        } else {
          await attendanceAPI.update(editingAttendance.id, updateData);
        }
        setSnackbar({ open: true, message: 'Attendance saved successfully', severity: 'success' });
        handleCloseDialog();
        loadAttendance();
      } else {
        // Manual entry mode - save all entries
        if (!manualEntryEmployeeId) {
          setSnackbar({ open: true, message: 'Please select an employee', severity: 'error' });
          setLoading(false);
          return;
        }
        
        // Filter out empty rows (no date)
        const validEntries = manualEntries.filter(entry => entry.date.trim() !== '');
        
        if (validEntries.length === 0) {
          setSnackbar({ open: true, message: 'Please add at least one entry with a date', severity: 'error' });
          setLoading(false);
          return;
        }
        
        // Check for duplicate dates
        const dates = validEntries.map(e => e.date);
        const uniqueDates = new Set(dates);
        if (dates.length !== uniqueDates.size) {
          setSnackbar({ open: true, message: 'Duplicate dates found. Each date can only be entered once.', severity: 'error' });
          setLoading(false);
          return;
        }
        
        // Validate each entry: if check-in is provided, check-out is required
        const incompleteTimeEntries = validEntries.filter(entry => {
          return (entry.check_in && !entry.check_out) || (!entry.check_in && entry.check_out);
        });
        
        if (incompleteTimeEntries.length > 0) {
          setSnackbar({ open: true, message: 'If check-in time is provided, check-out time is required (and vice versa)', severity: 'error' });
          setLoading(false);
          return;
        }
        
        // Validate each entry has either check-in/check-out OR at least one hour field
        const entriesWithoutData = validEntries.filter(entry => {
          const hasTimes = entry.check_in && entry.check_out;
          const hasHours = entry.regular_hours || entry.ot_hours || entry.weekend_ot_hours || entry.stat_holiday_hours;
          return !hasTimes && !hasHours;
        });
        
        if (entriesWithoutData.length > 0) {
          setSnackbar({ open: true, message: 'Each entry must have either check-in/check-out times OR at least one hour field (regular, OT, weekend OT, or stat holiday)', severity: 'error' });
          setLoading(false);
          return;
        }
        
        // Helper function to parse hours (empty string -> null, otherwise parse as float)
        const parseHours = (value: string): number | null => {
          if (!value || value.trim() === '') return null;
          const parsed = parseFloat(value);
          return isNaN(parsed) ? null : parsed;
        };
        
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];
        
        // Save each entry
        for (const entry of validEntries) {
          try {
            const regularHours = parseHours(entry.regular_hours);
            const otHours = parseHours(entry.ot_hours);
            const weekendOtHours = parseHours(entry.weekend_ot_hours);
            const statHolidayHours = parseHours(entry.stat_holiday_hours);
            
            // Determine if this is a manual override (hours provided without times)
            const hasTimes = entry.check_in && entry.check_out;
            const hasHours = regularHours !== null || otHours !== null || weekendOtHours !== null || statHolidayHours !== null;
            const isManualOverride = !hasTimes && hasHours;
            
            await attendanceAPI.create({
              employee_id: manualEntryEmployeeId,
              date: entry.date,
              check_in: entry.check_in || null,
              check_out: entry.check_out || null,
              regular_hours: regularHours ?? 0.0,
              ot_hours: otHours ?? 0.0,
              weekend_ot_hours: weekendOtHours ?? 0.0,
              stat_holiday_hours: statHolidayHours ?? 0.0,
              is_manual_override: isManualOverride,
            });
            successCount++;
          } catch (error: any) {
            errorCount++;
            const errorMsg = error.response?.data?.detail || error.message;
            errors.push(`Date ${entry.date}: ${errorMsg}`);
          }
        }
        
        if (errorCount === 0) {
          setSnackbar({ open: true, message: `Successfully saved ${successCount} attendance record(s)`, severity: 'success' });
          handleCloseDialog();
          loadAttendance();
        } else {
          const errorMessage = `Saved ${successCount} record(s), ${errorCount} failed:\n${errors.join('\n')}`;
          setSnackbar({ open: true, message: errorMessage, severity: 'error' });
          // Still reload to show successful entries
          if (successCount > 0) {
            loadAttendance();
          }
        }
      }
    } catch (error: any) {
      setSnackbar({ open: true, message: `Error saving attendance: ${error.response?.data?.detail || error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAttendance(null);
    setFormData({ 
      employee_id: '', 
      date: '', 
      check_in: '', 
      check_out: '',
      edited_check_in: '',
      edited_check_out: '',
      edited_regular_hours: '',
      edited_ot_hours: '',
      edited_weekend_ot_hours: '',
      edited_stat_holiday_hours: '',
      time_edit_reason: '',
      hours_edit_reason: '',
      remarks: '',
    });
    // Clear manual entries
    setManualEntries([]);
    setManualEntryEmployeeId('');
    setManualEntryEmployee(null);
    setManualEntrySearchTerm('');
  };

  // Helper functions for manual entry
  const addManualEntryRow = () => {
    const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setManualEntries([...manualEntries, { 
      id: newId, 
      date: '', 
      check_in: '', 
      check_out: '', 
      regular_hours: '', 
      ot_hours: '', 
      weekend_ot_hours: '', 
      stat_holiday_hours: '' 
    }]);
  };

  const removeManualEntryRow = (id: string) => {
    setManualEntries(manualEntries.filter(entry => entry.id !== id));
  };

  const updateManualEntry = (id: string, field: 'date' | 'check_in' | 'check_out' | 'regular_hours' | 'ot_hours' | 'weekend_ot_hours' | 'stat_holiday_hours', value: string) => {
    setManualEntries(manualEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  // Filter employees for manual entry autocomplete
  const filteredManualEntryEmployees = employees.filter(emp => {
    if (!manualEntrySearchTerm) return true;
    const searchLower = manualEntrySearchTerm.toLowerCase();
    return (
      emp.id.toLowerCase().includes(searchLower) ||
      emp.first_name?.toLowerCase().includes(searchLower) ||
      emp.last_name?.toLowerCase().includes(searchLower) ||
      emp.full_name?.toLowerCase().includes(searchLower)
    );
  });

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '-';
    // Display full time with seconds (HH:MM:SS format)
    // If time string is shorter than 8 chars (HH:MM:SS), return as-is
    // Otherwise return first 8 chars to include seconds
    return timeStr.length >= 8 ? timeStr.substring(0, 8) : timeStr;
  };

  const formatDate = (dateString: string) => {
    try {
      // Parse YYYY-MM-DD dates locally to avoid timezone issues
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return format(date, 'MMM dd, yyyy');
      }
      // Fallback for other date formats
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Attendance Management
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Upload />}
            onClick={() => setUploadDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            Upload CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setTabValue(1);
              // Initialize manual entry if not already initialized
              if (manualEntries.length === 0) {
                setManualEntries([{ 
                  id: '1', 
                  date: '', 
                  check_in: '', 
                  check_out: '', 
                  regular_hours: '', 
                  ot_hours: '', 
                  weekend_ot_hours: '', 
                  stat_holiday_hours: '' 
                }]);
              }
            }}
          >
            Manual Entry
          </Button>
        </Box>
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
          Please select a company above to view and manage attendance.
        </Alert>
      )}

      <Paper>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Attendance List" />
          <Tab label="Manual Entry" />
          <Tab label="Report" />
        </Tabs>

        {tabValue === 0 && (
          <Box sx={{ p: 2 }}>
            {/* Filter Section */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Filters
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Year"
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value) || new Date().getFullYear())}
                    disabled={!selectedCompanyId}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth disabled={!selectedCompanyId || payPeriods.length === 0}>
                    <InputLabel>Pay Period</InputLabel>
                    <Select
                      value={selectedPayPeriod ? `${selectedPayPeriod.period_number}` : ''}
                      onChange={(e) => {
                        const periodNum = parseInt(e.target.value);
                        const period = payPeriods.find(p => p.period_number === periodNum);
                        setSelectedPayPeriod(period || null);
                      }}
                      label="Pay Period"
                    >
                      <MenuItem value="">
                        <em>All Pay Periods</em>
                      </MenuItem>
                      {payPeriods.map((period) => (
                        <MenuItem key={period.period_number} value={period.period_number.toString()}>
                          Period {period.period_number}: {formatDate(period.start_date)} - {formatDate(period.end_date)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth disabled={!selectedCompanyId || employees.length === 0}>
                    <InputLabel>Employee</InputLabel>
                    <Select
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      label="Employee"
                    >
                      <MenuItem value="">
                        <em>All Employees</em>
                      </MenuItem>
                      {employees.map((emp) => (
                        <MenuItem key={emp.id} value={emp.id}>
                          {emp.full_name || `${emp.first_name} ${emp.last_name}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    variant="outlined"
                    startIcon={<Clear />}
                    onClick={() => {
                      setSelectedPayPeriod(null);
                      setSelectedEmployeeId('');
                    }}
                    disabled={!selectedPayPeriod && !selectedEmployeeId}
                    fullWidth
                    sx={{ height: '56px' }}
                  >
                    Clear Filters
                  </Button>
                </Grid>
              </Grid>
              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flex: 1 }}>
                  <TextField
                    label="Recalculate From"
                    type="date"
                    value={recalcStartDate}
                    onChange={(e) => setRecalcStartDate(e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 180 }}
                  />
                  <TextField
                    label="Recalculate To"
                    type="date"
                    value={recalcEndDate}
                    onChange={(e) => setRecalcEndDate(e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 180 }}
                  />
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<Refresh />}
                    onClick={async () => {
                      // Use pay period dates if available, otherwise use manual dates
                      const startDate = selectedPayPeriod?.start_date || recalcStartDate;
                      const endDate = selectedPayPeriod?.end_date || recalcEndDate;
                      
                      if (!startDate || !endDate) {
                        setSnackbar({ 
                          open: true, 
                          message: 'Please select a pay period or enter date range to recalculate', 
                          severity: 'error' 
                        });
                        return;
                      }
                      try {
                        setLoading(true);
                        const result = await attendanceAPI.recalculate(
                          selectedEmployeeId || null,
                          startDate,
                          endDate
                        );
                        let message = `Recalculated ${result.data.recalculated_count} attendance records. ${result.data.skipped_count} skipped.`;
                        if (result.data.error_count > 0) {
                          message += ` ${result.data.error_count} errors.`;
                          if (result.data.errors && result.data.errors.length > 0) {
                            console.error('Recalculation errors:', result.data.errors);
                            message += ` Check console for details.`;
                          }
                        }
                        setSnackbar({ 
                          open: true, 
                          message: message, 
                          severity: result.data.recalculated_count > 0 ? 'success' : 'error'
                        });
                        loadAttendance();
                      } catch (error: any) {
                        setSnackbar({ 
                          open: true, 
                          message: `Error recalculating: ${error.response?.data?.detail || error.message}`, 
                          severity: 'error' 
                        });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading || (!selectedPayPeriod && (!recalcStartDate || !recalcEndDate))}
                  >
                    Recalculate Hours
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => setDeleteDialogOpen(true)}
                    sx={{ ml: 1 }}
                  >
                    Delete by Date Range
                  </Button>
                </Box>
              </Box>
            </Paper>

            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table size="small" sx={{ '& .MuiTableCell-root': { padding: '4px 8px' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: '0.875rem', padding: '6px 8px', whiteSpace: 'normal', lineHeight: '1.2', maxWidth: '120px' }}>Employee<br />Name</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem', padding: '6px 8px', whiteSpace: 'normal', lineHeight: '1.2' }}>Date</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem', padding: '6px 8px', whiteSpace: 'normal', lineHeight: '1.2' }}>Leave/Stat<br />Holiday</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem', padding: '6px 8px', whiteSpace: 'normal', lineHeight: '1.2' }}>Check-In<br />(Orig)</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem', padding: '6px 8px', whiteSpace: 'normal', lineHeight: '1.2' }}>Check-Out<br />(Orig)</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem', padding: '6px 8px', whiteSpace: 'normal', lineHeight: '1.2' }}>Check-In<br />(Rnd)</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem', padding: '6px 8px', whiteSpace: 'normal', lineHeight: '1.2' }}>Check-Out<br />(Rnd)</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem', padding: '6px 8px', whiteSpace: 'normal', lineHeight: '1.2' }}>Reg<br />Hours</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem', padding: '6px 8px', whiteSpace: 'normal', lineHeight: '1.2' }}>OT<br />Hours</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem', padding: '6px 8px', whiteSpace: 'normal', lineHeight: '1.2' }}>Weekend<br />OT</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem', padding: '6px 8px', whiteSpace: 'normal', lineHeight: '1.2' }}>Stat<br />Holiday</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem', padding: '6px 8px', whiteSpace: 'normal', lineHeight: '1.2' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attendance.map((att) => {
                      const hasTimeEdits = att.override_check_in || att.override_check_out;
                      const hasHoursEdits = (att.override_regular_hours !== null && att.override_regular_hours !== undefined) || 
                            (att.override_ot_hours !== null && att.override_ot_hours !== undefined) || 
                            (att.override_weekend_ot_hours !== null && att.override_weekend_ot_hours !== undefined) || 
                            (att.override_stat_holiday_hours !== null && att.override_stat_holiday_hours !== undefined);
                      const effectiveCheckIn = att.override_check_in || att.check_in;
                      const effectiveCheckOut = att.override_check_out || att.check_out;
                      const effectiveRegular = (att.override_regular_hours !== null && att.override_regular_hours !== undefined) 
                        ? att.override_regular_hours 
                        : (att.regular_hours ?? 0.0);
                      const effectiveOT = (att.override_ot_hours !== null && att.override_ot_hours !== undefined) 
                        ? att.override_ot_hours 
                        : (att.ot_hours ?? 0.0);
                      const effectiveWeekendOT = (att.override_weekend_ot_hours !== null && att.override_weekend_ot_hours !== undefined) 
                        ? att.override_weekend_ot_hours 
                        : (att.weekend_ot_hours ?? 0.0);
                      const effectiveStatHoliday = (att.override_stat_holiday_hours !== null && att.override_stat_holiday_hours !== undefined) 
                        ? att.override_stat_holiday_hours 
                        : (att.stat_holiday_hours ?? 0.0);
                      
                      // Determine if it's a weekend
                      // Parse date string directly to avoid timezone issues
                      // Format: YYYY-MM-DD
                      const [year, month, day] = att.date.split('-').map(Number);
                      const dateObj = new Date(year, month - 1, day); // month is 0-indexed
                      const dayOfWeek = dateObj.getDay();
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
                      
                      // Determine if it's a day with no data (no attendance, no leave, no holiday)
                      const hasNoData = !att.id && !att.leave_type && !att.stat_holiday_name && !att.check_in && !att.check_out;
                      
                      return (
                        <TableRow 
                          key={att.id || `virtual-${att.employee_id}-${att.date}`}
                          sx={{
                            backgroundColor: isWeekend ? 'rgba(0, 0, 0, 0.12)' : 'transparent',
                            '& td': {
                              fontSize: '0.875rem', // Smaller font size
                              color: hasNoData ? 'text.secondary' : 'inherit',
                              padding: '4px 8px', // Compact padding
                            }
                          }}
                        >
                          <TableCell sx={{ whiteSpace: 'normal', maxWidth: '120px', lineHeight: '1.2', wordBreak: 'break-word' }}>
                            {att.employee_name || att.employee_id}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{att.date}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {att.leave_type && (
                              <Box sx={{ color: 'info.main', fontWeight: 500, fontSize: '0.8rem' }}>
                                {att.leave_type}
                              </Box>
                            )}
                            {att.stat_holiday_name && (
                              <Box sx={{ color: 'warning.main', fontWeight: 500, fontSize: '0.8rem' }}>
                                {att.stat_holiday_name}
                              </Box>
                            )}
                            {!att.leave_type && !att.stat_holiday_name && '-'}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>
                            {hasTimeEdits && att.override_check_in ? (
                              <Box>
                                <Box sx={{ whiteSpace: 'nowrap' }}>{formatTime(effectiveCheckIn)}</Box>
                                <Box sx={{ color: 'text.secondary', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>was {formatTime(att.check_in)}</Box>
                                {att.time_edit_reason && (
                                  <Box sx={{ color: 'text.secondary', fontSize: '0.6rem', fontStyle: 'italic', mt: 0.25 }}>
                                    {att.time_edit_reason}
                                  </Box>
                                )}
                              </Box>
                            ) : (
                              formatTime(effectiveCheckIn)
                            )}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>
                            {hasTimeEdits && att.override_check_out ? (
                              <Box>
                                <Box sx={{ whiteSpace: 'nowrap' }}>{formatTime(effectiveCheckOut)}</Box>
                                <Box sx={{ color: 'text.secondary', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>was {formatTime(att.check_out)}</Box>
                              </Box>
                            ) : (
                              formatTime(effectiveCheckOut)
                            )}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{formatTime(att.rounded_check_in)}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{formatTime(att.rounded_check_out)}</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            {hasHoursEdits && att.override_regular_hours !== null && att.override_regular_hours !== undefined ? (
                              <Box sx={{ textAlign: 'right' }}>
                                <Box>{effectiveRegular.toFixed(2)}</Box>
                                <Box sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>was {(att.regular_hours ?? 0.0).toFixed(2)}</Box>
                                {att.hours_edit_reason && (
                                  <Box sx={{ color: 'text.secondary', fontSize: '0.6rem', fontStyle: 'italic', mt: 0.25, textAlign: 'left' }}>
                                    {att.hours_edit_reason}
                                  </Box>
                                )}
                              </Box>
                            ) : (
                              effectiveRegular.toFixed(2)
                            )}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            {hasHoursEdits && att.override_ot_hours !== null && att.override_ot_hours !== undefined ? (
                              <Box sx={{ textAlign: 'right' }}>
                                <Box>{effectiveOT.toFixed(2)}</Box>
                                <Box sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>was {(att.ot_hours ?? 0.0).toFixed(2)}</Box>
                                {att.hours_edit_reason && (
                                  <Box sx={{ color: 'text.secondary', fontSize: '0.6rem', fontStyle: 'italic', mt: 0.25, textAlign: 'left' }}>
                                    {att.hours_edit_reason}
                                  </Box>
                                )}
                              </Box>
                            ) : (
                              effectiveOT.toFixed(2)
                            )}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            {hasHoursEdits && att.override_weekend_ot_hours !== null && att.override_weekend_ot_hours !== undefined ? (
                              <Box sx={{ textAlign: 'right' }}>
                                <Box>{effectiveWeekendOT.toFixed(2)}</Box>
                                <Box sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>was {(att.weekend_ot_hours ?? 0.0).toFixed(2)}</Box>
                                {att.hours_edit_reason && (
                                  <Box sx={{ color: 'text.secondary', fontSize: '0.6rem', fontStyle: 'italic', mt: 0.25, textAlign: 'left' }}>
                                    {att.hours_edit_reason}
                                  </Box>
                                )}
                              </Box>
                            ) : (
                              effectiveWeekendOT.toFixed(2)
                            )}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            {hasHoursEdits && att.override_stat_holiday_hours !== null && att.override_stat_holiday_hours !== undefined ? (
                              <Box sx={{ textAlign: 'right' }}>
                                <Box>{effectiveStatHoliday.toFixed(2)}</Box>
                                <Box sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>was {(att.stat_holiday_hours ?? 0.0).toFixed(2)}</Box>
                                {att.hours_edit_reason && (
                                  <Box sx={{ color: 'text.secondary', fontSize: '0.6rem', fontStyle: 'italic', mt: 0.25, textAlign: 'left' }}>
                                    {att.hours_edit_reason}
                                  </Box>
                                )}
                              </Box>
                            ) : (
                              effectiveStatHoliday.toFixed(2)
                            )}
                          </TableCell>
                          <TableCell sx={{ padding: '4px !important' }}>
                            <IconButton size="small" sx={{ padding: '4px' }} onClick={() => handleOpenDialog(att)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {selectedEmployeeId && attendance.length > 0 && (() => {
                      // Calculate subtotals for single employee
                      let calculatedRegular = 0;
                      let calculatedOT = 0;
                      let calculatedWeekendOT = 0;
                      let calculatedStatHoliday = 0;
                      attendance.forEach(a => {
                        const effReg = (a.override_regular_hours !== null && a.override_regular_hours !== undefined) 
                          ? a.override_regular_hours 
                          : (a.regular_hours ?? 0.0);
                        const effOT = (a.override_ot_hours !== null && a.override_ot_hours !== undefined) 
                          ? a.override_ot_hours 
                          : (a.ot_hours ?? 0.0);
                        const effWeekendOT = (a.override_weekend_ot_hours !== null && a.override_weekend_ot_hours !== undefined) 
                          ? a.override_weekend_ot_hours 
                          : (a.weekend_ot_hours ?? 0.0);
                        const effStatHoliday = (a.override_stat_holiday_hours !== null && a.override_stat_holiday_hours !== undefined) 
                          ? a.override_stat_holiday_hours 
                          : (a.stat_holiday_hours ?? 0.0);
                        calculatedRegular += effReg;
                        calculatedOT += effOT;
                        calculatedWeekendOT += effWeekendOT;
                        calculatedStatHoliday += effStatHoliday;
                      });
                      
                      // Use override values if they exist, otherwise use calculated
                      const totalRegular = periodOverride?.override_regular_hours !== null && periodOverride?.override_regular_hours !== undefined
                        ? periodOverride.override_regular_hours
                        : calculatedRegular;
                      const totalOT = periodOverride?.override_ot_hours !== null && periodOverride?.override_ot_hours !== undefined
                        ? periodOverride.override_ot_hours
                        : calculatedOT;
                      const totalWeekendOT = periodOverride?.override_weekend_ot_hours !== null && periodOverride?.override_weekend_ot_hours !== undefined
                        ? periodOverride.override_weekend_ot_hours
                        : calculatedWeekendOT;
                      const totalStatHoliday = periodOverride?.override_stat_holiday_hours !== null && periodOverride?.override_stat_holiday_hours !== undefined
                        ? periodOverride.override_stat_holiday_hours
                        : calculatedStatHoliday;
                      
                      const hasOverride = periodOverride && (
                        periodOverride.override_regular_hours !== null ||
                        periodOverride.override_ot_hours !== null ||
                        periodOverride.override_weekend_ot_hours !== null ||
                        periodOverride.override_stat_holiday_hours !== null
                      );
                      
                      return (
                        <TableRow sx={{ backgroundColor: hasOverride ? '#fff3cd' : '#f5f5f5', fontWeight: 'bold' }}>
                          <TableCell colSpan={7} sx={{ fontWeight: 'bold', textAlign: 'right', fontSize: '0.875rem' }}>
                            {hasOverride ? 'Subtotal (Override):' : 'Subtotal:'}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', fontSize: '0.875rem' }}>
                            {hasOverride && totalRegular !== calculatedRegular ? (
                              <Box>
                                <Box>{totalRegular.toFixed(2)}</Box>
                                <Box sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>was {calculatedRegular.toFixed(2)}</Box>
                              </Box>
                            ) : (
                              totalRegular.toFixed(2)
                            )}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', fontSize: '0.875rem' }}>
                            {hasOverride && totalOT !== calculatedOT ? (
                              <Box>
                                <Box>{totalOT.toFixed(2)}</Box>
                                <Box sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>was {calculatedOT.toFixed(2)}</Box>
                              </Box>
                            ) : (
                              totalOT.toFixed(2)
                            )}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', fontSize: '0.875rem' }}>
                            {hasOverride && totalWeekendOT !== calculatedWeekendOT ? (
                              <Box>
                                <Box>{totalWeekendOT.toFixed(2)}</Box>
                                <Box sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>was {calculatedWeekendOT.toFixed(2)}</Box>
                              </Box>
                            ) : (
                              totalWeekendOT.toFixed(2)
                            )}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', fontSize: '0.875rem' }}>
                            {hasOverride && totalStatHoliday !== calculatedStatHoliday ? (
                              <Box>
                                <Box>{totalStatHoliday.toFixed(2)}</Box>
                                <Box sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>was {calculatedStatHoliday.toFixed(2)}</Box>
                              </Box>
                            ) : (
                              totalStatHoliday.toFixed(2)
                            )}
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" sx={{ padding: '4px' }} onClick={() => {
                              setOverrideFormData({
                                override_regular_hours: periodOverride?.override_regular_hours?.toString() || '',
                                override_ot_hours: periodOverride?.override_ot_hours?.toString() || '',
                                override_weekend_ot_hours: periodOverride?.override_weekend_ot_hours?.toString() || '',
                                override_stat_holiday_hours: periodOverride?.override_stat_holiday_hours?.toString() || '',
                                reason: periodOverride?.reason || '',
                              });
                              setOverrideDialogOpen(true);
                            }}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {tabValue === 1 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Manual Entry
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter either check-in/check-out times OR hours directly (regular, OT, weekend OT, stat holiday). At least one is required.
            </Typography>
            
            <Paper sx={{ p: 2, mb: 2 }}>
              {/* Employee selector for manual entry */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    options={filteredManualEntryEmployees}
                    getOptionLabel={(option) => `${option.id} - ${option.full_name || `${option.first_name} ${option.last_name}`}`}
                    value={manualEntryEmployee}
                    onChange={(event, newValue) => {
                      setManualEntryEmployee(newValue);
                      setManualEntryEmployeeId(newValue?.id || '');
                    }}
                    onInputChange={(event, newInputValue) => {
                      setManualEntrySearchTerm(newInputValue);
                    }}
                    inputValue={manualEntrySearchTerm}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Employee *"
                        placeholder="Enter employee ID or name"
                        required
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Box>
                          <Typography variant="body1" fontWeight="bold">
                            {option.id}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {option.full_name || `${option.first_name} ${option.last_name}`}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    noOptionsText="No employees found"
                    disabled={!selectedCompanyId || employees.length === 0}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
                    <Button
                      variant="outlined"
                      startIcon={<Add />}
                      onClick={addManualEntryRow}
                      disabled={!selectedCompanyId}
                    >
                      Add Row
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        setManualEntries([{ 
                          id: '1', 
                          date: '', 
                          check_in: '', 
                          check_out: '', 
                          regular_hours: '', 
                          ot_hours: '', 
                          weekend_ot_hours: '', 
                          stat_holiday_hours: '' 
                        }]);
                      }}
                      disabled={manualEntries.length <= 1}
                    >
                      Clear All
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Manual entry table */}
            <Paper sx={{ p: 2 }}>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500, overflowX: 'auto' }}>
                <Table size="small" stickyHeader sx={{ minWidth: 1000 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ minWidth: 130 }}>Date *</TableCell>
                      <TableCell sx={{ minWidth: 120 }}>Check-In</TableCell>
                      <TableCell sx={{ minWidth: 120 }}>Check-Out</TableCell>
                      <TableCell sx={{ minWidth: 130 }}>Reg Hours</TableCell>
                      <TableCell sx={{ minWidth: 130 }}>OT Hours</TableCell>
                      <TableCell sx={{ minWidth: 140 }}>Weekend OT</TableCell>
                      <TableCell sx={{ minWidth: 140 }}>Stat Holiday</TableCell>
                      <TableCell align="center" sx={{ minWidth: 90 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {manualEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <TextField
                            type="date"
                            value={entry.date}
                            onChange={(e) => updateManualEntry(entry.id, 'date', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                            fullWidth
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="time"
                            value={entry.check_in}
                            onChange={(e) => updateManualEntry(entry.id, 'check_in', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                            fullWidth
                            helperText={entry.check_in && !entry.check_out ? "Check-out required" : ""}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="time"
                            value={entry.check_out}
                            onChange={(e) => updateManualEntry(entry.id, 'check_out', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                            fullWidth
                          />
                        </TableCell>
                        <TableCell sx={{ width: 130 }}>
                          <TextField
                            type="number"
                            inputProps={{ step: 0.25, min: 0, style: { width: '100%' } }}
                            value={entry.regular_hours || ''}
                            onChange={(e) => updateManualEntry(entry.id, 'regular_hours', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                            fullWidth
                            placeholder="0.00"
                            sx={{ '& .MuiInputBase-input': { width: '100%' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ width: 130 }}>
                          <TextField
                            type="number"
                            inputProps={{ step: 0.25, min: 0, style: { width: '100%' } }}
                            value={entry.ot_hours || ''}
                            onChange={(e) => updateManualEntry(entry.id, 'ot_hours', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                            fullWidth
                            placeholder="0.00"
                            sx={{ '& .MuiInputBase-input': { width: '100%' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ width: 140 }}>
                          <TextField
                            type="number"
                            inputProps={{ step: 0.25, min: 0, style: { width: '100%' } }}
                            value={entry.weekend_ot_hours || ''}
                            onChange={(e) => updateManualEntry(entry.id, 'weekend_ot_hours', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                            fullWidth
                            placeholder="0.00"
                            sx={{ '& .MuiInputBase-input': { width: '100%' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ width: 140 }}>
                          <TextField
                            type="number"
                            inputProps={{ step: 0.25, min: 0, style: { width: '100%' } }}
                            value={entry.stat_holiday_hours || ''}
                            onChange={(e) => updateManualEntry(entry.id, 'stat_holiday_hours', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                            fullWidth
                            placeholder="0.00"
                            sx={{ '& .MuiInputBase-input': { width: '100%' } }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => removeManualEntryRow(entry.id)}
                            disabled={manualEntries.length === 1}
                            color="error"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setManualEntries([{ 
                      id: '1', 
                      date: '', 
                      check_in: '', 
                      check_out: '', 
                      regular_hours: '', 
                      ot_hours: '', 
                      weekend_ot_hours: '', 
                      stat_holiday_hours: '' 
                    }]);
                    setManualEntryEmployee(null);
                    setManualEntryEmployeeId('');
                    setManualEntrySearchTerm('');
                  }}
                >
                  Clear
                </Button>
                <Button
                  variant="contained"
                  onClick={async () => {
                    // Use the same save logic from handleSave
                    if (!manualEntryEmployeeId) {
                      setSnackbar({ open: true, message: 'Please select an employee', severity: 'error' });
                      return;
                    }
                    
                    // Filter out empty rows (no date)
                    const validEntries = manualEntries.filter(entry => entry.date.trim() !== '');
                    
                    if (validEntries.length === 0) {
                      setSnackbar({ open: true, message: 'Please add at least one entry with a date', severity: 'error' });
                      return;
                    }
                    
                    // Check for duplicate dates
                    const dates = validEntries.map(e => e.date);
                    const uniqueDates = new Set(dates);
                    if (dates.length !== uniqueDates.size) {
                      setSnackbar({ open: true, message: 'Duplicate dates found. Each date can only be entered once.', severity: 'error' });
                      return;
                    }
                    
                    // Validate each entry: if check-in is provided, check-out is required
                    const incompleteTimeEntries = validEntries.filter(entry => {
                      return (entry.check_in && !entry.check_out) || (!entry.check_in && entry.check_out);
                    });
                    
                    if (incompleteTimeEntries.length > 0) {
                      setSnackbar({ open: true, message: 'If check-in time is provided, check-out time is required (and vice versa)', severity: 'error' });
                      return;
                    }
                    
                    // Validate each entry has either check-in/check-out OR at least one hour field
                    const entriesWithoutData = validEntries.filter(entry => {
                      const hasTimes = entry.check_in && entry.check_out;
                      const hasHours = entry.regular_hours || entry.ot_hours || entry.weekend_ot_hours || entry.stat_holiday_hours;
                      return !hasTimes && !hasHours;
                    });
                    
                    if (entriesWithoutData.length > 0) {
                      setSnackbar({ open: true, message: 'Each entry must have either check-in/check-out times OR at least one hour field (regular, OT, weekend OT, or stat holiday)', severity: 'error' });
                      return;
                    }
                    
                    // Helper function to parse hours (empty string -> null, otherwise parse as float)
                    const parseHours = (value: string): number | null => {
                      if (!value || value.trim() === '') return null;
                      const parsed = parseFloat(value);
                      return isNaN(parsed) ? null : parsed;
                    };
                    
                    try {
                      setLoading(true);
                      let successCount = 0;
                      let errorCount = 0;
                      const errors: string[] = [];
                      
                      // Save each entry
                      for (const entry of validEntries) {
                        try {
                          const regularHours = parseHours(entry.regular_hours);
                          const otHours = parseHours(entry.ot_hours);
                          const weekendOtHours = parseHours(entry.weekend_ot_hours);
                          const statHolidayHours = parseHours(entry.stat_holiday_hours);
                          
                          // Determine if this is a manual override (hours provided without times)
                          const hasTimes = entry.check_in && entry.check_out;
                          const hasHours = regularHours !== null || otHours !== null || weekendOtHours !== null || statHolidayHours !== null;
                          const isManualOverride = !hasTimes && hasHours;
                          
                          await attendanceAPI.create({
                            employee_id: manualEntryEmployeeId,
                            date: entry.date,
                            check_in: entry.check_in || null,
                            check_out: entry.check_out || null,
                            regular_hours: regularHours ?? 0.0,
                            ot_hours: otHours ?? 0.0,
                            weekend_ot_hours: weekendOtHours ?? 0.0,
                            stat_holiday_hours: statHolidayHours ?? 0.0,
                            is_manual_override: isManualOverride,
                          });
                          successCount++;
                        } catch (error: any) {
                          errorCount++;
                          const errorMsg = error.response?.data?.detail || error.message;
                          errors.push(`Date ${entry.date}: ${errorMsg}`);
                        }
                      }
                      
                      if (errorCount === 0) {
                        setSnackbar({ open: true, message: `Successfully saved ${successCount} attendance record(s)`, severity: 'success' });
                        // Clear form
                        setManualEntries([{ 
                          id: '1', 
                          date: '', 
                          check_in: '', 
                          check_out: '', 
                          regular_hours: '', 
                          ot_hours: '', 
                          weekend_ot_hours: '', 
                          stat_holiday_hours: '' 
                        }]);
                        setManualEntryEmployee(null);
                        setManualEntryEmployeeId('');
                        setManualEntrySearchTerm('');
                        // Reload attendance list to show the newly created records
                        // Note: This will only update if user switches to Attendance List tab
                        // We don't need to check tabValue here since loadAttendance is safe to call
                      } else {
                        const errorMessage = `Saved ${successCount} record(s), ${errorCount} failed:\n${errors.join('\n')}`;
                        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
                      }
                    } catch (error: any) {
                      setSnackbar({ open: true, message: `Error saving attendance: ${error.response?.data?.detail || error.message}`, severity: 'error' });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !selectedCompanyId || !manualEntryEmployeeId || manualEntries.length === 0}
                >
                  Save All
                </Button>
              </Box>
            </Paper>
          </Box>
        )}

        {tabValue === 2 && (
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2} mb={2}>
              <Grid item xs={12} sm={2}>
                <FormControl fullWidth disabled={!selectedCompanyId || payPeriods.length === 0}>
                  <InputLabel>Pay Period</InputLabel>
                  <Select
                    value={reportPayPeriod ? `${reportPayPeriod.period_number}` : ''}
                    onChange={(e) => {
                      const periodNum = parseInt(e.target.value);
                      const period = payPeriods.find(p => p.period_number === periodNum);
                      setReportPayPeriod(period || null);
                      if (period) {
                        setReportFilters({ start_date: period.start_date, end_date: period.end_date });
                      }
                    }}
                    label="Pay Period"
                  >
                    <MenuItem value="">None</MenuItem>
                    {payPeriods.map((period) => (
                      <MenuItem key={period.period_number} value={`${period.period_number}`}>
                        Period {period.period_number} ({period.start_date} to {period.end_date})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <FormControl fullWidth disabled={!selectedCompanyId || employees.length === 0}>
                  <InputLabel>Employee</InputLabel>
                  <Select
                    value={reportEmployeeId}
                    onChange={(e) => setReportEmployeeId(e.target.value)}
                    label="Employee"
                  >
                    <MenuItem value="">All Employees</MenuItem>
                    {employees.map((emp) => (
                      <MenuItem key={emp.id} value={emp.id}>
                        {emp.full_name || `${emp.first_name} ${emp.last_name}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={reportFilters.start_date}
                  onChange={(e) => {
                    setReportFilters({ ...reportFilters, start_date: e.target.value });
                    setReportPayPeriod(null); // Clear pay period when manually entering dates
                  }}
                  InputLabelProps={{ shrink: true }}
                  disabled={!!reportPayPeriod}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={reportFilters.end_date}
                  onChange={(e) => {
                    setReportFilters({ ...reportFilters, end_date: e.target.value });
                    setReportPayPeriod(null); // Clear pay period when manually entering dates
                  }}
                  InputLabelProps={{ shrink: true }}
                  disabled={!!reportPayPeriod}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button 
                  variant="contained" 
                  onClick={loadReport}
                  fullWidth
                  sx={{ mb: 1 }}
                >
                  Generate Report
                </Button>
              </Grid>
            </Grid>

            <Grid container spacing={2} mb={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant={reportView === 'summary' ? 'contained' : 'outlined'}
                    onClick={() => {
                      setReportView('summary');
                      setReport(null);
                      setDetailedReport(null);
                    }}
                    sx={{ flex: 1 }}
                  >
                    Summary
                  </Button>
                  <Button
                    variant={reportView === 'detailed' ? 'contained' : 'outlined'}
                    onClick={() => {
                      setReportView('detailed');
                      setReport(null);
                      setDetailedReport(null);
                    }}
                    sx={{ flex: 1 }}
                  >
                    Detailed
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  startIcon={<FileDownload />}
                  onClick={() => handleExportReport('excel')}
                  disabled={!report && !detailedReport}
                  fullWidth
                >
                  Export Excel
                </Button>
              </Grid>
            </Grid>

            {report && reportView === 'summary' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Summary
                </Typography>
                <Typography>
                  Total Regular Hours: {report.total_regular_hours.toFixed(2)}
                </Typography>
                <Typography>
                  Total OT Hours: {report.total_ot_hours.toFixed(2)}
                </Typography>
                <Typography>
                  Total Weekend OT: {report.total_weekend_ot_hours.toFixed(2)}
                </Typography>
                <Typography>
                  Total Stat Holiday Hours: {report.total_stat_holiday_hours.toFixed(2)}
                </Typography>

                <TableContainer sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Employee</TableCell>
                        <TableCell>Regular Hours</TableCell>
                        <TableCell>OT Hours</TableCell>
                        <TableCell>Weekend OT</TableCell>
                        <TableCell>Stat Holiday</TableCell>
                        <TableCell>Days</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {report.summary.map((item) => (
                        <TableRow key={item.employee_id}>
                          <TableCell>{item.employee_name}</TableCell>
                          <TableCell>{item.total_regular_hours.toFixed(2)}</TableCell>
                          <TableCell>{item.total_ot_hours.toFixed(2)}</TableCell>
                          <TableCell>{item.total_weekend_ot_hours.toFixed(2)}</TableCell>
                          <TableCell>{item.total_stat_holiday_hours.toFixed(2)}</TableCell>
                          <TableCell>{item.total_days}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {detailedReport && reportView === 'detailed' && (() => {
              // Group rows by employee and calculate subtotals
              const rowsWithSubtotals: Array<{ type: 'detail' | 'subtotal'; row?: AttendanceDetailRow; subtotal?: { employee_id: string; employee_name: string; regular_hours: number; ot_hours: number; weekend_ot_hours: number; stat_holiday_hours: number } }> = [];
              
              let currentEmployeeId: string | null = null;
              let currentEmployeeName: string = '';
              let calculatedRegular = 0;
              let calculatedOT = 0;
              let calculatedWeekendOT = 0;
              let calculatedStatHoliday = 0;
              
              detailedReport.details.forEach((row, index) => {
                // If we've moved to a new employee, add subtotal for previous employee
                if (currentEmployeeId !== null && row.employee_id !== currentEmployeeId) {
                  // Apply period override if it exists
                  const override = reportPeriodOverrides.get(currentEmployeeId);
                  const finalRegular = override?.override_regular_hours !== null && override?.override_regular_hours !== undefined
                    ? override.override_regular_hours
                    : calculatedRegular;
                  const finalOT = override?.override_ot_hours !== null && override?.override_ot_hours !== undefined
                    ? override.override_ot_hours
                    : calculatedOT;
                  const finalWeekendOT = override?.override_weekend_ot_hours !== null && override?.override_weekend_ot_hours !== undefined
                    ? override.override_weekend_ot_hours
                    : calculatedWeekendOT;
                  const finalStatHoliday = override?.override_stat_holiday_hours !== null && override?.override_stat_holiday_hours !== undefined
                    ? override.override_stat_holiday_hours
                    : calculatedStatHoliday;
                  
                  rowsWithSubtotals.push({
                    type: 'subtotal',
                    subtotal: {
                      employee_id: currentEmployeeId,
                      employee_name: currentEmployeeName,
                      regular_hours: finalRegular,
                      ot_hours: finalOT,
                      weekend_ot_hours: finalWeekendOT,
                      stat_holiday_hours: finalStatHoliday,
                    }
                  });
                  // Reset subtotals for new employee
                  calculatedRegular = 0;
                  calculatedOT = 0;
                  calculatedWeekendOT = 0;
                  calculatedStatHoliday = 0;
                }
                
                // Add the detail row
                rowsWithSubtotals.push({ type: 'detail', row });
                
                // Accumulate subtotals
                calculatedRegular += row.regular_hours;
                calculatedOT += row.ot_hours;
                calculatedWeekendOT += row.weekend_ot_hours;
                calculatedStatHoliday += row.stat_holiday_hours || 0;
                
                // Update current employee
                currentEmployeeId = row.employee_id;
                currentEmployeeName = row.employee_name;
              });
              
              // Add final subtotal
              if (currentEmployeeId !== null) {
                // Apply period override if it exists
                const override = reportPeriodOverrides.get(currentEmployeeId);
                const finalRegular = override?.override_regular_hours !== null && override?.override_regular_hours !== undefined
                  ? override.override_regular_hours
                  : calculatedRegular;
                const finalOT = override?.override_ot_hours !== null && override?.override_ot_hours !== undefined
                  ? override.override_ot_hours
                  : calculatedOT;
                const finalWeekendOT = override?.override_weekend_ot_hours !== null && override?.override_weekend_ot_hours !== undefined
                  ? override.override_weekend_ot_hours
                  : calculatedWeekendOT;
                const finalStatHoliday = override?.override_stat_holiday_hours !== null && override?.override_stat_holiday_hours !== undefined
                  ? override.override_stat_holiday_hours
                  : calculatedStatHoliday;
                
                rowsWithSubtotals.push({
                  type: 'subtotal',
                  subtotal: {
                    employee_id: currentEmployeeId,
                    employee_name: currentEmployeeName,
                    regular_hours: finalRegular,
                    ot_hours: finalOT,
                    weekend_ot_hours: finalWeekendOT,
                    stat_holiday_hours: finalStatHoliday,
                  }
                });
              }
              
              return (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Detailed Report (Grouped by Staff)
                  </Typography>
                  <TableContainer sx={{ mt: 2 }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Employee</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Leave/Stat Holiday</TableCell>
                          <TableCell>Start Time</TableCell>
                          <TableCell>End Time</TableCell>
                          <TableCell>Weekday/Weekend</TableCell>
                          <TableCell>Reg Hours</TableCell>
                          <TableCell>OT Hours</TableCell>
                          <TableCell>Weekend OT</TableCell>
                          <TableCell>Stat Holiday</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rowsWithSubtotals.map((item, index) => {
                          if (item.type === 'detail' && item.row) {
                            const row = item.row;
                            return (
                              <TableRow 
                                key={`${row.employee_id}-${row.date}-${index}`}
                                sx={{
                                  backgroundColor: row.day_type === 'Weekend' ? 'rgba(0, 0, 0, 0.12)' : 'transparent',
                                }}
                              >
                                <TableCell>{row.employee_name}</TableCell>
                                <TableCell>{row.date}</TableCell>
                                <TableCell>
                                  {row.leave_type && (
                                    <Box sx={{ color: 'info.main', fontWeight: 500, fontSize: '0.8rem' }}>
                                      {row.leave_type}
                                    </Box>
                                  )}
                                  {row.stat_holiday_name && (
                                    <Box sx={{ color: 'warning.main', fontWeight: 500, fontSize: '0.8rem' }}>
                                      {row.stat_holiday_name}
                                    </Box>
                                  )}
                                  {!row.leave_type && !row.stat_holiday_name && '-'}
                                </TableCell>
                                <TableCell>{row.check_in || '-'}</TableCell>
                                <TableCell>{row.check_out || '-'}</TableCell>
                                <TableCell>{row.day_type}</TableCell>
                                <TableCell>{row.regular_hours.toFixed(2)}</TableCell>
                                <TableCell>{row.ot_hours.toFixed(2)}</TableCell>
                                <TableCell>{row.weekend_ot_hours.toFixed(2)}</TableCell>
                                <TableCell>{(row.stat_holiday_hours || 0).toFixed(2)}</TableCell>
                              </TableRow>
                            );
                          } else if (item.type === 'subtotal' && item.subtotal) {
                            const subtotal = item.subtotal;
                            return (
                              <TableRow key={`subtotal-${subtotal.employee_id}-${index}`} sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                                <TableCell colSpan={6} sx={{ fontWeight: 'bold', textAlign: 'right' }}>
                                  Subtotal for {subtotal.employee_name}:
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>{subtotal.regular_hours.toFixed(2)}</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>{subtotal.ot_hours.toFixed(2)}</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>{subtotal.weekend_ot_hours.toFixed(2)}</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>{(subtotal.stat_holiday_hours || 0).toFixed(2)}</TableCell>
                              </TableRow>
                            );
                          }
                          return null;
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              );
            })()}
          </Box>
        )}
      </Paper>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Attendance Records</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. All attendance records within the specified date range will be permanently deleted.
          </Alert>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={deleteStartDate}
                onChange={(e) => setDeleteStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={deleteEndDate}
                onChange={(e) => setDeleteEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            {selectedEmployeeId && (
              <Grid item xs={12}>
                <Alert severity="info">
                  Only records for employee {selectedEmployeeId} will be deleted (based on current filter).
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (!deleteStartDate || !deleteEndDate) {
                setSnackbar({
                  open: true,
                  message: 'Please enter both start and end dates',
                  severity: 'error'
                });
                return;
              }
              
              if (new Date(deleteStartDate) > new Date(deleteEndDate)) {
                setSnackbar({
                  open: true,
                  message: 'Start date must be before or equal to end date',
                  severity: 'error'
                });
                return;
              }
              
              try {
                setLoading(true);
                const result = await attendanceAPI.deleteByDateRange({
                  start_date: deleteStartDate,
                  end_date: deleteEndDate,
                  ...(selectedEmployeeId ? { employee_id: selectedEmployeeId } : {}),
                  ...(selectedCompanyId ? { company_id: selectedCompanyId } : {}),
                });
                
                setSnackbar({
                  open: true,
                  message: result.data.message || `Deleted ${result.data.deleted_count} attendance record(s)`,
                  severity: 'success'
                });
                setDeleteDialogOpen(false);
                setDeleteStartDate('');
                setDeleteEndDate('');
                loadAttendance();
              } catch (error: any) {
                setSnackbar({
                  open: true,
                  message: `Error deleting records: ${error.response?.data?.detail || error.message}`,
                  severity: 'error'
                });
              } finally {
                setLoading(false);
              }
            }}
            disabled={!deleteStartDate || !deleteEndDate || loading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>Edit Attendance</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {editingAttendance ? (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Employee ID"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    disabled
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    disabled
                  />
                </Grid>
              </>
            ) : null}
            
            {editingAttendance ? (
              <>
                {/* Times Section */}
                {(editingAttendance.check_in || editingAttendance.check_out) && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Check-In / Check-Out Times</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Original Check-In"
                        value={formatTime(formData.check_in)}
                        disabled
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Original Check-Out"
                        value={formatTime(formData.check_out)}
                        disabled
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </>
                )}
                {editingAttendance.stat_holiday_name && !editingAttendance.check_in && !editingAttendance.check_out && (
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ color: 'warning.main', fontStyle: 'italic', mt: 2 }}>
                      Statutory Holiday: {editingAttendance.stat_holiday_name}
                    </Typography>
                  </Grid>
                )}
                {(editingAttendance.check_in || editingAttendance.check_out) && (
                  <>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Edited Check-In"
                        type="time"
                        value={formData.edited_check_in}
                        onChange={(e) => setFormData({ ...formData, edited_check_in: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        helperText="Leave empty to use original"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Edited Check-Out"
                        type="time"
                        value={formData.edited_check_out}
                        onChange={(e) => setFormData({ ...formData, edited_check_out: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        helperText="Leave empty to use original"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Reason for Time Edit"
                        value={formData.time_edit_reason}
                        onChange={(e) => setFormData({ ...formData, time_edit_reason: e.target.value })}
                        multiline
                        rows={2}
                        placeholder="Enter reason for editing check-in/check-out times"
                      />
                    </Grid>
                  </>
                )}
                
                {/* Hours Section */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Hours</Typography>
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    label="Original Regular"
                    value={(editingAttendance.regular_hours ?? 0).toFixed(2)}
                    disabled
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    label="Original OT"
                    value={(editingAttendance.ot_hours ?? 0).toFixed(2)}
                    disabled
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    label="Original Weekend OT"
                    value={(editingAttendance.weekend_ot_hours ?? 0).toFixed(2)}
                    disabled
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    label="Original Stat Holiday"
                    value={(editingAttendance.stat_holiday_hours ?? 0).toFixed(2)}
                    disabled
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    label="Edited Regular Hours"
                    type="number"
                    inputProps={{ step: 0.25, min: 0 }}
                    value={formData.edited_regular_hours}
                    onChange={(e) => setFormData({ ...formData, edited_regular_hours: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    helperText="Leave empty to use calculated"
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    label="Edited OT Hours"
                    type="number"
                    inputProps={{ step: 0.25, min: 0 }}
                    value={formData.edited_ot_hours}
                    onChange={(e) => setFormData({ ...formData, edited_ot_hours: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    helperText="Leave empty to use calculated"
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    label="Edited Weekend OT"
                    type="number"
                    inputProps={{ step: 0.25, min: 0 }}
                    value={formData.edited_weekend_ot_hours}
                    onChange={(e) => setFormData({ ...formData, edited_weekend_ot_hours: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    helperText="Leave empty to use calculated"
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    label="Edited Stat Holiday"
                    type="number"
                    inputProps={{ step: 0.25, min: 0 }}
                    value={formData.edited_stat_holiday_hours}
                    onChange={(e) => setFormData({ ...formData, edited_stat_holiday_hours: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    helperText="Leave empty to use original"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Reason for Hours Edit"
                    value={formData.hours_edit_reason}
                    onChange={(e) => setFormData({ ...formData, hours_edit_reason: e.target.value })}
                    multiline
                    rows={2}
                    placeholder="Enter reason for editing hours"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Remarks"
                    value={formData.remarks}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 18) {
                        setFormData({ ...formData, remarks: value });
                      }
                    }}
                    inputProps={{ maxLength: 18 }}
                    helperText={`${formData.remarks.length}/18 characters`}
                    placeholder="Optional short remarks (max 18 characters)"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    onClick={async () => {
                      if (!editingAttendance) return;
                      try {
                        setLoading(true);
                        if (!editingAttendance.id) {
                          setSnackbar({ open: true, message: 'Cannot recalculate: No attendance record ID', severity: 'error' });
                          return;
                        }
                        await attendanceAPI.recalculateAttendance(editingAttendance.id);
                        setSnackbar({ open: true, message: 'Hours recalculated successfully', severity: 'success' });
                        // Reload attendance to get updated values
                        loadAttendance();
                        // Refresh form with updated attendance record
                        const updated = attendance.find(a => a.id === editingAttendance.id);
                        if (updated) {
                          setEditingAttendance(updated);
                          setFormData({
                            ...formData,
                            check_in: updated.check_in || '',
                            check_out: updated.check_out || '',
                            edited_regular_hours: updated.override_regular_hours?.toString() || '',
                            edited_ot_hours: updated.override_ot_hours?.toString() || '',
                            edited_weekend_ot_hours: updated.override_weekend_ot_hours?.toString() || '',
                            edited_stat_holiday_hours: updated.override_stat_holiday_hours?.toString() || '',
                          });
                        }
                      } catch (error: any) {
                        setSnackbar({ open: true, message: `Error recalculating: ${error.response?.data?.detail || error.message}`, severity: 'error' });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    sx={{ mt: 1 }}
                  >
                    Recalculate Hours
                  </Button>
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={12}>
                  <Alert severity="info">
                    Manual entry is now available in the "Manual Entry" tab. Click the "Manual Entry" button above or switch to the "Manual Entry" tab to add new attendance records.
                  </Alert>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Attendance CSV</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="file"
            inputProps={{ accept: '.csv' }}
            onChange={(e: any) => setFile(e.target.files?.[0] || null)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUploadCSV} variant="contained" disabled={!file || loading}>
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={overrideDialogOpen} onClose={() => setOverrideDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Override Period Subtotals</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {selectedEmployeeId && selectedPayPeriod && (() => {
              // Calculate current subtotals for display
              let calculatedRegular = 0;
              let calculatedOT = 0;
              let calculatedWeekendOT = 0;
              let calculatedStatHoliday = 0;
              attendance.forEach(a => {
                const effReg = (a.override_regular_hours !== null && a.override_regular_hours !== undefined) 
                  ? a.override_regular_hours 
                  : (a.regular_hours ?? 0.0);
                const effOT = (a.override_ot_hours !== null && a.override_ot_hours !== undefined) 
                  ? a.override_ot_hours 
                  : (a.ot_hours ?? 0.0);
                const effWeekendOT = (a.override_weekend_ot_hours !== null && a.override_weekend_ot_hours !== undefined) 
                  ? a.override_weekend_ot_hours 
                  : (a.weekend_ot_hours ?? 0.0);
                const effStatHoliday = (a.override_stat_holiday_hours !== null && a.override_stat_holiday_hours !== undefined) 
                  ? a.override_stat_holiday_hours 
                  : (a.stat_holiday_hours ?? 0.0);
                calculatedRegular += effReg;
                calculatedOT += effOT;
                calculatedWeekendOT += effWeekendOT;
                calculatedStatHoliday += effStatHoliday;
              });
              
              return (
                <>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Employee: {attendance[0]?.employee_name || selectedEmployeeId}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pay Period: {selectedPayPeriod.start_date} to {selectedPayPeriod.end_date}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Calculated Values (Reference)</Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Calculated Regular Hours"
                      value={calculatedRegular.toFixed(2)}
                      disabled
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Calculated OT Hours"
                      value={calculatedOT.toFixed(2)}
                      disabled
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Calculated Weekend OT"
                      value={calculatedWeekendOT.toFixed(2)}
                      disabled
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Calculated Stat Holiday"
                      value={calculatedStatHoliday.toFixed(2)}
                      disabled
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Override Values</Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Override Regular Hours"
                      type="number"
                      inputProps={{ step: 0.25, min: 0 }}
                      value={overrideFormData.override_regular_hours}
                      onChange={(e) => setOverrideFormData({ ...overrideFormData, override_regular_hours: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      helperText="Leave empty to use calculated"
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Override OT Hours"
                      type="number"
                      inputProps={{ step: 0.25, min: 0 }}
                      value={overrideFormData.override_ot_hours}
                      onChange={(e) => setOverrideFormData({ ...overrideFormData, override_ot_hours: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      helperText="Leave empty to use calculated"
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Override Weekend OT"
                      type="number"
                      inputProps={{ step: 0.25, min: 0 }}
                      value={overrideFormData.override_weekend_ot_hours}
                      onChange={(e) => setOverrideFormData({ ...overrideFormData, override_weekend_ot_hours: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      helperText="Leave empty to use calculated"
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Override Stat Holiday"
                      type="number"
                      inputProps={{ step: 0.25, min: 0 }}
                      value={overrideFormData.override_stat_holiday_hours}
                      onChange={(e) => setOverrideFormData({ ...overrideFormData, override_stat_holiday_hours: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      helperText="Leave empty to use calculated"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Reason for Override"
                      value={overrideFormData.reason}
                      onChange={(e) => setOverrideFormData({ ...overrideFormData, reason: e.target.value })}
                      multiline
                      rows={3}
                      placeholder="Enter reason for overriding subtotals"
                    />
                  </Grid>
                </>
              );
            })()}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverrideDialogOpen(false)}>Cancel</Button>
          {periodOverride && (
            <Button
              onClick={async () => {
                try {
                  setLoading(true);
                  await attendanceAPI.deletePeriodOverride(periodOverride.id);
                  setSnackbar({ open: true, message: 'Override cleared successfully', severity: 'success' });
                  setOverrideDialogOpen(false);
                  setPeriodOverride(null);
                  loadPeriodOverride();
                } catch (error: any) {
                  setSnackbar({ open: true, message: `Error clearing override: ${error.response?.data?.detail || error.message}`, severity: 'error' });
                } finally {
                  setLoading(false);
                }
              }}
              color="error"
              disabled={loading}
            >
              Clear Override
            </Button>
          )}
          <Button
            onClick={async () => {
              try {
                if (!selectedEmployeeId || !selectedPayPeriod || !selectedCompanyId) {
                  setSnackbar({ open: true, message: 'Missing required information', severity: 'error' });
                  return;
                }
                
                setLoading(true);
                const parseHours = (hoursStr: string) => {
                  if (!hoursStr || hoursStr.trim() === '') return null;
                  const parsed = parseFloat(hoursStr);
                  return isNaN(parsed) ? null : parsed;
                };
                
                const overrideData = {
                  employee_id: selectedEmployeeId,
                  company_id: selectedCompanyId,
                  pay_period_start: selectedPayPeriod.start_date,
                  pay_period_end: selectedPayPeriod.end_date,
                  period_number: selectedPayPeriod.period_number,
                  year: selectedPayPeriod.year,
                  override_regular_hours: parseHours(overrideFormData.override_regular_hours),
                  override_ot_hours: parseHours(overrideFormData.override_ot_hours),
                  override_weekend_ot_hours: parseHours(overrideFormData.override_weekend_ot_hours),
                  override_stat_holiday_hours: parseHours(overrideFormData.override_stat_holiday_hours),
                  reason: overrideFormData.reason || null,
                };
                
                const response = await attendanceAPI.savePeriodOverride(overrideData);
                setPeriodOverride(response.data);
                setSnackbar({ open: true, message: 'Override saved successfully', severity: 'success' });
                setOverrideDialogOpen(false);
                loadPeriodOverride();
              } catch (error: any) {
                setSnackbar({ open: true, message: `Error saving override: ${error.response?.data?.detail || error.message}`, severity: 'error' });
              } finally {
                setLoading(false);
              }
            }}
            variant="contained"
            disabled={loading}
          >
            Save
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

export default AttendancePage;

