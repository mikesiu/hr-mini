import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, CalendarSearch, ChevronDown, FilterX, Loader2, Plus, RefreshCw,
  SlidersHorizontal, Trash2, Upload,
} from 'lucide-react';
import { attendanceAPI, companyAPI, employeeAPI } from '../api/client';
import { useCompanyFilter } from '../contexts/CompanyFilterContext';
import { format } from 'date-fns';
import AppToast from '../components/AppToast';
import AttendanceTable from '../components/attendance/AttendanceTable';
import EditAttendanceDialog from '../components/attendance/EditAttendanceDialog';
import ManualEntryTab from '../components/attendance/ManualEntryTab';
import AttendanceReportTab from '../components/attendance/AttendanceReportTab';
import SummaryStrip from '../components/attendance/SummaryStrip';
import {
  UploadCsvDialog, DeleteRangeDialog, OverrideSubtotalsDialog,
} from '../components/attendance/AttendanceMiscDialogs';
import {
  ALL_VALUE, emptyManualEntry, sumEffectiveHours,
} from '../components/attendance/attendanceHelpers';
import type {
  Attendance, AttendanceReport, AttendanceDetailedReport, PayPeriod, Employee,
  DetailedRowWithSubtotal, AttendanceDetailRow,
  AttendanceUploadPreview, AttendanceUploadResponse,
} from '../components/attendance/attendanceTypes';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';



function applyPeriodOverrideTotals(
  employeeId: string,
  calculated: { regular: number; ot: number; weekendOT: number; statHoliday: number },
  reportPeriodOverrides: Map<string, any>
) {
  const override = reportPeriodOverrides.get(employeeId);
  return {
    regular_hours: override?.override_regular_hours !== null && override?.override_regular_hours !== undefined
      ? override.override_regular_hours
      : calculated.regular,
    ot_hours: override?.override_ot_hours !== null && override?.override_ot_hours !== undefined
      ? override.override_ot_hours
      : calculated.ot,
    weekend_ot_hours: override?.override_weekend_ot_hours !== null && override?.override_weekend_ot_hours !== undefined
      ? override.override_weekend_ot_hours
      : calculated.weekendOT,
    stat_holiday_hours: override?.override_stat_holiday_hours !== null && override?.override_stat_holiday_hours !== undefined
      ? override.override_stat_holiday_hours
      : calculated.statHoliday,
  };
}

function buildDetailedRowsWithSubtotals(
  details: AttendanceDetailRow[],
  reportPeriodOverrides: Map<string, any>
): DetailedRowWithSubtotal[] {
  const rowsWithSubtotals: DetailedRowWithSubtotal[] = [];
  let currentEmployeeId: string | null = null;
  let currentEmployeeName = '';
  let calculatedRegular = 0;
  let calculatedOT = 0;
  let calculatedWeekendOT = 0;
  let calculatedStatHoliday = 0;

  details.forEach((row) => {
    if (currentEmployeeId !== null && row.employee_id !== currentEmployeeId) {
      rowsWithSubtotals.push({
        type: 'subtotal',
        subtotal: {
          employee_id: currentEmployeeId,
          employee_name: currentEmployeeName,
          ...applyPeriodOverrideTotals(
            currentEmployeeId,
            {
              regular: calculatedRegular,
              ot: calculatedOT,
              weekendOT: calculatedWeekendOT,
              statHoliday: calculatedStatHoliday,
            },
            reportPeriodOverrides
          ),
        },
      });
      calculatedRegular = 0;
      calculatedOT = 0;
      calculatedWeekendOT = 0;
      calculatedStatHoliday = 0;
    }

    rowsWithSubtotals.push({ type: 'detail', row });
    calculatedRegular += row.regular_hours;
    calculatedOT += row.ot_hours;
    calculatedWeekendOT += row.weekend_ot_hours;
    calculatedStatHoliday += row.stat_holiday_hours || 0;
    currentEmployeeId = row.employee_id;
    currentEmployeeName = row.employee_name;
  });

  if (currentEmployeeId !== null) {
    rowsWithSubtotals.push({
      type: 'subtotal',
      subtotal: {
        employee_id: currentEmployeeId,
        employee_name: currentEmployeeName,
        ...applyPeriodOverrideTotals(
          currentEmployeeId,
          {
            regular: calculatedRegular,
            ot: calculatedOT,
            weekendOT: calculatedWeekendOT,
            statHoliday: calculatedStatHoliday,
          },
          reportPeriodOverrides
        ),
      },
    });
  }

  return rowsWithSubtotals;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getAttendanceReportPeriodLabel(
  startDate: string,
  endDate: string,
  payPeriod?: PayPeriod | null
): string {
  if (payPeriod) {
    return `Period ${payPeriod.period_number} (${payPeriod.start_date} to ${payPeriod.end_date})`;
  }
  return `${startDate} to ${endDate}`;
}

function getAttendanceReportHeadcount(
  report: AttendanceReport | null,
  detailedReport: AttendanceDetailedReport | null,
  view: 'summary' | 'detailed'
): number {
  if (view === 'summary' && report) {
    return report.summary.length;
  }
  if (view === 'detailed' && detailedReport) {
    return new Set(detailedReport.details.map((d) => d.employee_id)).size;
  }
  return 0;
}

const ATTENDANCE_PRINT_STYLES = `
  body { font-family: Arial, sans-serif; margin: 20px; }
  .report-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
  .report-title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
  .report-subtitle { font-size: 14px; color: #666; }
  .report-meta { font-size: 13px; color: #444; margin-bottom: 16px; }
  .report-totals { margin-bottom: 16px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; font-size: 11px; }
  th { background-color: #f0f0f0; font-weight: bold; }
  .subtotal-row { background-color: #f5f5f5; font-weight: bold; }
  .weekend-row { background-color: #e8e8e8; }
  .report-footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
`;

function generateSummaryPrintTable(report: AttendanceReport): string {
  const rows = report.summary.map((item) => `
    <tr>
      <td>${escapeHtml(item.employee_name)}</td>
      <td>${item.total_regular_hours.toFixed(2)}</td>
      <td>${item.total_ot_hours.toFixed(2)}</td>
      <td>${item.total_weekend_ot_hours.toFixed(2)}</td>
      <td>${item.total_stat_holiday_hours.toFixed(2)}</td>
      <td>${item.total_days}</td>
    </tr>
  `).join('');

  return `
    <div class="report-totals">
      <div>Total Regular Hours: ${report.total_regular_hours.toFixed(2)}</div>
      <div>Total OT Hours: ${report.total_ot_hours.toFixed(2)}</div>
      <div>Total Weekend OT: ${report.total_weekend_ot_hours.toFixed(2)}</div>
      <div>Total Stat Holiday Hours: ${report.total_stat_holiday_hours.toFixed(2)}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Employee</th>
          <th>Regular Hours</th>
          <th>OT Hours</th>
          <th>Weekend OT</th>
          <th>Stat Holiday</th>
          <th>Days</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function generateDetailedPrintTable(rowsWithSubtotals: DetailedRowWithSubtotal[]): string {
  const rows = rowsWithSubtotals.map((item) => {
    if (item.type === 'detail') {
      const row = item.row;
      const leaveStat = [row.leave_type, row.stat_holiday_name].filter(Boolean).join(' / ') || '-';
      const isWeekendDay = row.day_type === 'Saturday' || row.day_type === 'Sunday';
      const rowClass = isWeekendDay ? 'weekend-row' : '';
      return `
        <tr class="${rowClass}">
          <td>${escapeHtml(row.employee_name)}</td>
          <td>${escapeHtml(row.date)}</td>
          <td>${escapeHtml(leaveStat)}</td>
          <td>${escapeHtml(row.check_in || '-')}</td>
          <td>${escapeHtml(row.check_out || '-')}</td>
          <td>${escapeHtml(row.day_type)}</td>
          <td>${row.regular_hours.toFixed(2)}</td>
          <td>${row.ot_hours.toFixed(2)}</td>
          <td>${row.weekend_ot_hours.toFixed(2)}</td>
          <td>${(row.stat_holiday_hours || 0).toFixed(2)}</td>
        </tr>
      `;
    }

    const subtotal = item.subtotal;
    return `
      <tr class="subtotal-row">
        <td colspan="6" style="text-align: right;">Subtotal for ${escapeHtml(subtotal.employee_name)} (${escapeHtml(subtotal.employee_id)}):</td>
        <td>${subtotal.regular_hours.toFixed(2)}</td>
        <td>${subtotal.ot_hours.toFixed(2)}</td>
        <td>${subtotal.weekend_ot_hours.toFixed(2)}</td>
        <td>${(subtotal.stat_holiday_hours || 0).toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Employee</th>
          <th>Date</th>
          <th>Leave/Stat Holiday</th>
          <th>Start Time</th>
          <th>End Time</th>
          <th>Day</th>
          <th>Reg Hours</th>
          <th>OT Hours</th>
          <th>Weekend OT</th>
          <th>Stat Holiday</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

const AttendancePage: React.FC = () => {
  const { selectedCompanyId, setSelectedCompanyId, selectedCompany, companies } = useCompanyFilter();
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
  const [uploadPreview, setUploadPreview] = useState<AttendanceUploadPreview | null>(null);
  const [uploadResult, setUploadResult] = useState<AttendanceUploadResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
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
      const params: {
        company_id: string;
        pay_period_start?: string;
        pay_period_end?: string;
      } = { company_id: selectedCompanyId };

      if (selectedPayPeriod) {
        params.pay_period_start = selectedPayPeriod.start_date;
        params.pay_period_end = selectedPayPeriod.end_date;
      }

      const response = await employeeAPI.list(params);
      if (response.data && response.data.success) {
        const list = response.data.data || [];
        setEmployees(list);
        // Clear selection if the selected employee is no longer in the filtered list
        setSelectedEmployeeId((prev) =>
          prev && !list.some((emp: Employee) => emp.id === prev) ? '' : prev
        );
      } else {
        setEmployees([]);
      }
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      setEmployees([]);
    }
  }, [selectedCompanyId, selectedPayPeriod]);

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

  // Fetch employees when company or pay period changes
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

  const resetUploadDialog = () => {
    setUploadDialogOpen(false);
    setFile(null);
    setUploadPreview(null);
    setUploadResult(null);
    setPreviewLoading(false);
  };

  const handlePreviewCSV = async () => {
    if (!file) return;
    try {
      setPreviewLoading(true);
      setUploadResult(null);
      const response = await attendanceAPI.previewCSV(file);
      setUploadPreview(response.data);
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail || error.message;
      setSnackbar({ open: true, message: `Error previewing CSV: ${errorDetail}`, severity: 'error' });
      setUploadPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUploadCSV = async () => {
    if (!file || !uploadPreview) return;
    try {
      setLoading(true);
      const response = await attendanceAPI.uploadCSV(file);
      const result = response.data as AttendanceUploadResponse;
      setUploadResult(result);

      let message = `CSV import completed: `;
      if (result.imported_count > 0) {
        message += `${result.imported_count} record(s) imported`;
      }
      if (result.skipped_count > 0) {
        message += `, ${result.skipped_count} skipped (duplicates or invalid)`;
      }
      if (result.error_count > 0) {
        message += `, ${result.error_count} error(s)`;
      }

      const severity = result.error_count > 0 ? 'error' : (result.imported_count > 0 ? 'success' : 'error');

      if (selectedPayPeriod) {
        loadAttendance();
        setSnackbar({ open: true, message, severity });
      } else {
        let payPeriodMessage = message;
        if (result.imported_count > 0) {
          payPeriodMessage += `. IMPORTANT: Please select a pay period that includes the uploaded dates to view the records in the attendance list.`;
        } else if (result.skipped_count > 0) {
          payPeriodMessage += `. Note: Select a pay period to view existing records.`;
        }
        setSnackbar({
          open: true,
          message: payPeriodMessage,
          severity,
        });
      }
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail || error.message;
      setSnackbar({ open: true, message: `Error uploading CSV: ${errorDetail}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (_format: 'excel' | 'csv' = 'excel') => {
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

    if (!report && !detailedReport) {
      setSnackbar({ open: true, message: 'Please generate a report first', severity: 'error' });
      return;
    }

    const filename = `attendance_report_${startDate}_${endDate}.xlsx`;

    try {
      setLoading(true);
      const { downloadGeneratedExcel } = await import('../utils/downloadFile');

      const result = await downloadGeneratedExcel({
        filename,
        build: async () => {
          const ExcelJS = await import('exceljs');
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet(
            reportView === 'detailed' ? 'Detailed Report' : 'Summary Report'
          );

          let currentRow = 1;
          const headerFill = {
            type: 'pattern' as const,
            pattern: 'solid' as const,
            fgColor: { argb: 'FFE0E0E0' },
          };

          const periodLabel = getAttendanceReportPeriodLabel(startDate, endDate, reportPayPeriod);
          const headcount = getAttendanceReportHeadcount(report, detailedReport, reportView);
          worksheet.getCell(currentRow, 1).value = `Time Attendance - ${periodLabel}`;
          worksheet.getCell(currentRow, 1).font = { bold: true, size: 14 };
          currentRow++;
          worksheet.getCell(currentRow, 1).value = `Total number of headcount: ${headcount}`;
          worksheet.getCell(currentRow, 1).font = { bold: true };
          currentRow += 2;

          if (reportView === 'detailed' && detailedReport) {
            const headers = [
              'Employee', 'Date', 'Leave/Stat Holiday', 'Start Time', 'End Time',
              'Day', 'Reg Hours', 'OT Hours', 'Weekend OT', 'Stat Holiday',
            ];
            const detailColCount = headers.length;
            const subtotalFill = {
              type: 'pattern' as const,
              pattern: 'solid' as const,
              fgColor: { argb: 'FFC6EFCE' }, // light green
            };
            const weekendFill = {
              type: 'pattern' as const,
              pattern: 'solid' as const,
              fgColor: { argb: 'FFF2F2F2' }, // very light grey
            };
            const statHolidayFill = {
              type: 'pattern' as const,
              pattern: 'solid' as const,
              fgColor: { argb: 'FFDDEBF7' }, // light blue
            };

            headers.forEach((header, index) => {
              const cell = worksheet.getCell(currentRow, index + 1);
              cell.value = header;
              cell.font = { bold: true };
              cell.fill = headerFill;
            });
            currentRow++;

            const rowsWithSubtotals = buildDetailedRowsWithSubtotals(
              detailedReport.details,
              reportPeriodOverrides
            );

            rowsWithSubtotals.forEach((item) => {
              if (item.type === 'detail') {
                const row = item.row;
                const leaveStat = [row.leave_type, row.stat_holiday_name].filter(Boolean).join(' / ') || '-';
                const values = [
                  row.employee_name,
                  row.date,
                  leaveStat,
                  row.check_in || '-',
                  row.check_out || '-',
                  row.day_type,
                  Number(row.regular_hours.toFixed(2)),
                  Number(row.ot_hours.toFixed(2)),
                  Number(row.weekend_ot_hours.toFixed(2)),
                  Number((row.stat_holiday_hours || 0).toFixed(2)),
                ];
                const isWeekend = row.day_type === 'Saturday' || row.day_type === 'Sunday';
                const isStatHoliday = Boolean(row.stat_holiday_name);
                const rowFill = isStatHoliday
                  ? statHolidayFill
                  : isWeekend
                    ? weekendFill
                    : null;

                values.forEach((cellValue, index) => {
                  const cell = worksheet.getCell(currentRow, index + 1);
                  cell.value = cellValue;
                  if (rowFill) {
                    cell.fill = rowFill;
                  }
                });
                currentRow++;
              } else {
                const subtotal = item.subtotal;
                // Do not write empty strings into B–F — that blocks label overflow in Excel.
                // Merge Employee→Day so the full subtotal label is visible.
                worksheet.mergeCells(currentRow, 1, currentRow, 6);
                const labelCell = worksheet.getCell(currentRow, 1);
                labelCell.value = `Subtotal for ${subtotal.employee_name} (${subtotal.employee_id})`;
                labelCell.alignment = { vertical: 'middle' };

                const hourValues: Array<[number, number]> = [
                  [7, Number(subtotal.regular_hours.toFixed(2))],
                  [8, Number(subtotal.ot_hours.toFixed(2))],
                  [9, Number(subtotal.weekend_ot_hours.toFixed(2))],
                  [10, Number((subtotal.stat_holiday_hours || 0).toFixed(2))],
                ];
                hourValues.forEach(([col, value]) => {
                  worksheet.getCell(currentRow, col).value = value;
                });

                for (let col = 1; col <= detailColCount; col++) {
                  const cell = worksheet.getCell(currentRow, col);
                  cell.fill = subtotalFill;
                  cell.font = { bold: true };
                }
                currentRow++;
              }
            });
          } else if (report) {
            worksheet.getCell(currentRow, 1).value = 'Total Regular Hours';
            worksheet.getCell(currentRow, 2).value = Number(report.total_regular_hours.toFixed(2));
            currentRow++;
            worksheet.getCell(currentRow, 1).value = 'Total OT Hours';
            worksheet.getCell(currentRow, 2).value = Number(report.total_ot_hours.toFixed(2));
            currentRow++;
            worksheet.getCell(currentRow, 1).value = 'Total Weekend OT';
            worksheet.getCell(currentRow, 2).value = Number(report.total_weekend_ot_hours.toFixed(2));
            currentRow++;
            worksheet.getCell(currentRow, 1).value = 'Total Stat Holiday Hours';
            worksheet.getCell(currentRow, 2).value = Number(report.total_stat_holiday_hours.toFixed(2));
            currentRow += 2;

            const headers = ['Employee', 'Regular Hours', 'OT Hours', 'Weekend OT', 'Stat Holiday', 'Days'];
            headers.forEach((header, index) => {
              const cell = worksheet.getCell(currentRow, index + 1);
              cell.value = header;
              cell.font = { bold: true };
              cell.fill = headerFill;
            });
            currentRow++;

            report.summary.forEach((item) => {
              const values = [
                item.employee_name,
                Number(item.total_regular_hours.toFixed(2)),
                Number(item.total_ot_hours.toFixed(2)),
                Number(item.total_weekend_ot_hours.toFixed(2)),
                Number(item.total_stat_holiday_hours.toFixed(2)),
                item.total_days,
              ];
              values.forEach((cellValue, index) => {
                worksheet.getCell(currentRow, index + 1).value = cellValue;
              });
              currentRow++;
            });
          }

          worksheet.columns.forEach((column) => {
            column.width = 15;
          });

          return workbook.xlsx.writeBuffer();
        },
      });

      if (result === 'cancelled') {
        return;
      }

      setSnackbar({
        open: true,
        message: result === 'saved' ? `Saved ${filename}` : `Report exported`,
        severity: 'success',
      });
    } catch (error: any) {
      console.error('Error exporting attendance report:', error);
      setSnackbar({
        open: true,
        message: `Error exporting report: ${error?.message || 'Unknown error'}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReport = () => {
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

    if (!report && !detailedReport) {
      setSnackbar({ open: true, message: 'Please generate a report first', severity: 'error' });
      return;
    }

    const companyName = selectedCompany
      ? (selectedCompany.trade_name || selectedCompany.legal_name)
      : 'All Companies';
    const employeeFilter = reportEmployeeId
      ? employees.find((emp) => emp.id === reportEmployeeId)
      : null;
    const employeeLabel = employeeFilter
      ? (employeeFilter.full_name || `${employeeFilter.first_name} ${employeeFilter.last_name}`)
      : 'All Employees';
    const payPeriodLabel = reportPayPeriod
      ? `Period ${reportPayPeriod.period_number} (${reportPayPeriod.start_date} to ${reportPayPeriod.end_date})`
      : null;
    const periodLabel = getAttendanceReportPeriodLabel(startDate, endDate, reportPayPeriod);
    const headcount = getAttendanceReportHeadcount(report, detailedReport, reportView);
    const viewLabel = reportView === 'detailed' ? 'Detailed' : 'Summary';
    const tableHtml = reportView === 'detailed' && detailedReport
      ? generateDetailedPrintTable(
          buildDetailedRowsWithSubtotals(detailedReport.details, reportPeriodOverrides)
        )
      : report
        ? generateSummaryPrintTable(report)
        : '<p>No data available</p>';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setSnackbar({ open: true, message: 'Unable to open print window. Please allow popups.', severity: 'error' });
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Time Attendance - ${escapeHtml(periodLabel)}</title>
        <style>${ATTENDANCE_PRINT_STYLES}</style>
      </head>
      <body>
        <div class="report-header">
          <div class="report-title">Time Attendance - ${escapeHtml(periodLabel)}</div>
          <div class="report-subtitle">Total number of headcount: ${headcount} &nbsp;|&nbsp; ${viewLabel} &nbsp;|&nbsp; Generated on ${new Date().toLocaleDateString()}</div>
        </div>
        <div class="report-meta">
          <div><strong>Company:</strong> ${escapeHtml(companyName)}</div>
          <div><strong>Date Range:</strong> ${escapeHtml(startDate)} to ${escapeHtml(endDate)}</div>
          ${payPeriodLabel ? `<div><strong>Pay Period:</strong> ${escapeHtml(payPeriodLabel)}</div>` : ''}
          <div><strong>Employee:</strong> ${escapeHtml(employeeLabel)}</div>
        </div>
        ${tableHtml}
        <div class="report-footer">HR Management System — Attendance Report</div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  const handleOpenDialog = (att?: Attendance) => {
    if (att) {
      setEditingAttendance(att);
      const toTimeInput = (t?: string | null) => (t ? String(t).slice(0, 5) : '');

      setFormData({
        employee_id: att.employee_id,
        date: att.date,
        check_in: att.check_in || '',
        check_out: att.check_out || '',
        edited_check_in: toTimeInput(att.override_check_in),
        edited_check_out: toTimeInput(att.override_check_out),
        // Only prefill true overrides — leave empty so Save recalculates from times
        edited_regular_hours:
          att.override_regular_hours !== null && att.override_regular_hours !== undefined
            ? String(att.override_regular_hours)
            : '',
        edited_ot_hours:
          att.override_ot_hours !== null && att.override_ot_hours !== undefined
            ? String(att.override_ot_hours)
            : '',
        edited_weekend_ot_hours:
          att.override_weekend_ot_hours !== null && att.override_weekend_ot_hours !== undefined
            ? String(att.override_weekend_ot_hours)
            : '',
        edited_stat_holiday_hours:
          att.override_stat_holiday_hours !== null && att.override_stat_holiday_hours !== undefined
            ? String(att.override_stat_holiday_hours)
            : '',
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


  const [batchOpen, setBatchOpen] = useState(false);
  const closeToast = useCallback(() => setSnackbar((s) => ({ ...s, open: false })), []);

  const handleRecalculateRange = async () => {
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
  };

  const handleManualSaveAll = async () => {
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
  };

  const handleDeleteByRange = async () => {
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
  };

  const handleRecalculateEditing = async () => {
                      if (!editingAttendance) return;
                      try {
                        setLoading(true);
                        if (!editingAttendance.id) {
                          setSnackbar({ open: true, message: 'Cannot recalculate: No attendance record ID', severity: 'error' });
                          return;
                        }

                        const parseTime = (timeStr: string) => {
                          if (!timeStr || timeStr.trim() === '') return null;
                          if (timeStr.match(/^\d{2}:\d{2}:\d{2}$/)) return timeStr;
                          if (timeStr.match(/^\d{2}:\d{2}$/)) return timeStr + ':00';
                          return timeStr;
                        };
                        const parseHours = (hoursStr: string) => {
                          if (!hoursStr || hoursStr.trim() === '') return null;
                          const parsed = parseFloat(hoursStr);
                          return isNaN(parsed) ? null : parsed;
                        };
                        const toTimeInput = (t?: string | null) => (t ? String(t).slice(0, 5) : '');

                        // Save edited times first so recalculate uses the form values
                        const saveData: any = {
                          override_check_in: formData.edited_check_in ? parseTime(formData.edited_check_in) : null,
                          override_check_out: formData.edited_check_out ? parseTime(formData.edited_check_out) : null,
                          // Clear hour overrides so recalculated hours become the effective values
                          override_regular_hours: null,
                          override_ot_hours: null,
                          override_weekend_ot_hours: null,
                          override_stat_holiday_hours: parseHours(formData.edited_stat_holiday_hours),
                          time_edit_reason: formData.time_edit_reason || null,
                          hours_edit_reason: formData.hours_edit_reason || null,
                          remarks: formData.remarks || null,
                        };
                        saveData.is_manual_override = !!(
                          saveData.override_check_in ||
                          saveData.override_check_out ||
                          saveData.override_stat_holiday_hours !== null
                        );

                        await attendanceAPI.update(editingAttendance.id, saveData);
                        const recalcResponse = await attendanceAPI.recalculateAttendance(editingAttendance.id);
                        const updated = recalcResponse.data;

                        setSnackbar({ open: true, message: 'Hours recalculated successfully', severity: 'success' });
                        setEditingAttendance(updated);
                        setFormData({
                          ...formData,
                          check_in: updated.check_in || '',
                          check_out: updated.check_out || '',
                          edited_check_in: toTimeInput(updated.override_check_in),
                          edited_check_out: toTimeInput(updated.override_check_out),
                          edited_regular_hours: '',
                          edited_ot_hours: '',
                          edited_weekend_ot_hours: '',
                          edited_stat_holiday_hours:
                            updated.override_stat_holiday_hours != null
                              ? String(updated.override_stat_holiday_hours)
                              : '',
                        });
                        await loadAttendance();
                      } catch (error: any) {
                        setSnackbar({ open: true, message: `Error recalculating: ${error.response?.data?.detail || error.message}`, severity: 'error' });
                      } finally {
                        setLoading(false);
                      }
  };

  const handleClearOverride = async () => {
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
  };

  const handleSaveOverride = async () => {
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
  };

  const openOverrideDialog = () => {
    setOverrideFormData({
      override_regular_hours: periodOverride?.override_regular_hours?.toString() || '',
      override_ot_hours: periodOverride?.override_ot_hours?.toString() || '',
      override_weekend_ot_hours: periodOverride?.override_weekend_ot_hours?.toString() || '',
      override_stat_holiday_hours: periodOverride?.override_stat_holiday_hours?.toString() || '',
      reason: periodOverride?.reason || '',
    });
    setOverrideDialogOpen(true);
  };

  const handleReportPayPeriodChange = (periodNumber: string) => {
    const periodNum = parseInt(periodNumber);
    const period = payPeriods.find((p) => p.period_number === periodNum);
    setReportPayPeriod(period || null);
    if (period) {
      setReportFilters({ start_date: period.start_date, end_date: period.end_date });
    }
  };

  const handleReportViewChange = (view: 'summary' | 'detailed') => {
    setReportView(view);
    setReport(null);
    setDetailedReport(null);
  };

  const resetManualEntryRows = () => setManualEntries([emptyManualEntry()]);

  const openManualEntry = () => {
    setTabValue(1);
    if (manualEntries.length === 0) resetManualEntryRows();
  };

  const clearManualEntry = () => {
    resetManualEntryRows();
    setManualEntryEmployee(null);
    setManualEntryEmployeeId('');
    setManualEntrySearchTerm('');
  };

  const handlePayPeriodSelect = (value: string) => {
    const periodNum = parseInt(value);
    const period = payPeriods.find((p) => p.period_number === periodNum);
    setSelectedPayPeriod(period || null);
  };

  const clearListFilters = () => {
    setSelectedPayPeriod(null);
    setSelectedEmployeeId('');
  };

  const hasCompany = !!selectedCompanyId;
  const hasActiveFilters = !!selectedPayPeriod || !!selectedEmployeeId;
  const totals = sumEffectiveHours(attendance);
  const canRecalculate = !loading && (!!selectedPayPeriod || (!!recalcStartDate && !!recalcEndDate));

  const overrideContext =
    selectedEmployeeId && selectedPayPeriod
      ? {
          employeeLabel:
            attendance.find((a) => a.employee_id === selectedEmployeeId)?.employee_name ||
            employees.find((e) => e.id === selectedEmployeeId)?.full_name ||
            selectedEmployeeId,
          periodLabel: `Period ${selectedPayPeriod.period_number}: ${formatDate(selectedPayPeriod.start_date)} - ${formatDate(selectedPayPeriod.end_date)}`,
          calculated: totals,
        }
      : null;

  const reportTitle = getAttendanceReportPeriodLabel(
    reportPayPeriod?.start_date || reportFilters.start_date,
    reportPayPeriod?.end_date || reportFilters.end_date,
    reportPayPeriod
  );
  const reportHeadcount = detailedReport
    ? getAttendanceReportHeadcount(null, detailedReport, 'detailed')
    : report
      ? getAttendanceReportHeadcount(report, null, 'summary')
      : '';
  const detailedRows: DetailedRowWithSubtotal[] = detailedReport
    ? buildDetailedRowsWithSubtotals(detailedReport.details, reportPeriodOverrides)
    : [];

  const companySelectorBar = !hasCompany ? (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-solid border-border bg-card px-4 py-3">
      <Building2 className="size-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        All Companies is selected. Pick a company to view and manage attendance.
      </span>
      <Select value="" onValueChange={(v) => setSelectedCompanyId(v)}>
        <SelectTrigger className="ml-auto w-[260px]" aria-label="Company">
          <SelectValue placeholder="Select company" />
        </SelectTrigger>
        <SelectContent>
          {companies.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.trade_name || c.legal_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ) : null;

  const renderListBody = () => {
    if (!hasCompany) {
      return (
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
          <Building2 className="size-8 text-muted-foreground" />
          <p className="m-0 text-sm font-medium text-foreground">No company selected</p>
          <p className="m-0 text-sm text-muted-foreground">
            Select a company to view and manage attendance.
          </p>
        </div>
      );
    }
    if (loading) {
      return (
        <div className="space-y-2 p-4">
          <Skeleton className="h-9 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      );
    }
    if (attendance.length === 0) {
      return (
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
          <CalendarSearch className="size-8 text-muted-foreground" />
          <p className="m-0 text-sm font-medium text-foreground">No attendance records found</p>
          <p className="m-0 text-sm text-muted-foreground">
            Try a different year, pay period or employee, or add records manually.
          </p>
          <Button className="mt-2" onClick={openManualEntry}>
            <Plus className="size-4" /> Manual Entry
          </Button>
        </div>
      );
    }
    return (
      <AttendanceTable
        attendance={attendance}
        selectedEmployeeId={selectedEmployeeId}
        periodOverride={periodOverride}
        formatTime={formatTime}
        onEdit={handleOpenDialog}
        onEditSubtotal={openOverrideDialog}
      />
    );
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">
            Attendance Management
          </h1>
          <p className="m-0 mt-1 text-sm text-muted-foreground">
            Review daily punch logs, rounded shift hours, overtime, and pay period reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setFile(null);
              setUploadPreview(null);
              setUploadResult(null);
              setUploadDialogOpen(true);
            }}
          >
            <Upload className="size-4" /> Upload CSV
          </Button>
          <Button onClick={openManualEntry}>
            <Plus className="size-4" /> Manual Entry
          </Button>
        </div>
      </div>

      {companySelectorBar}

      <Tabs value={String(tabValue)} onValueChange={(v) => setTabValue(Number(v))} className="gap-4">
        <TabsList
          variant="line"
          className="h-auto w-full justify-start gap-4 rounded-none border-0 border-b border-solid border-border p-0 group-data-[orientation=horizontal]/tabs:h-auto"
        >
          {['Attendance List', 'Manual Entry', 'Report'].map((label, i) => (
            <TabsTrigger
              key={label}
              value={String(i)}
              className="flex-none rounded-none px-1 py-2 after:bottom-[-1px]"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="0" className="space-y-3">
          <div className="rounded-lg border border-solid border-border bg-card p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="att-year" className="text-xs text-muted-foreground">Year</Label>
                <Input
                  id="att-year"
                  type="number"
                  className="w-24"
                  value={selectedYear}
                  onChange={(e) =>
                    setSelectedYear(parseInt(e.target.value) || new Date().getFullYear())
                  }
                  disabled={!hasCompany}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Pay Period</Label>
                <Select
                  value={selectedPayPeriod ? `${selectedPayPeriod.period_number}` : ALL_VALUE}
                  onValueChange={(v) => (v === ALL_VALUE ? setSelectedPayPeriod(null) : handlePayPeriodSelect(v))}
                  disabled={!hasCompany || payPeriods.length === 0}
                >
                  <SelectTrigger className="w-[320px] tabular-nums" aria-label="Pay Period">
                    <SelectValue placeholder="All Pay Periods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>All Pay Periods</SelectItem>
                    {payPeriods.map((p) => (
                      <SelectItem key={p.period_number} value={`${p.period_number}`}>
                        Period {p.period_number}: {formatDate(p.start_date)} - {formatDate(p.end_date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Employee</Label>
                <Select
                  value={selectedEmployeeId || ALL_VALUE}
                  onValueChange={(v) => setSelectedEmployeeId(v === ALL_VALUE ? '' : v)}
                  disabled={!hasCompany || employees.length === 0}
                >
                  <SelectTrigger className="w-[220px]" aria-label="Employee">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>All Employees</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name || `${emp.first_name} ${emp.last_name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearListFilters}>
                  <FilterX className="size-4" /> Clear
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                aria-expanded={batchOpen}
                onClick={() => setBatchOpen((o) => !o)}
              >
                <SlidersHorizontal className="size-4" /> Batch Actions
                <ChevronDown className={cn('size-4 transition-transform', batchOpen && 'rotate-180')} />
              </Button>
            </div>

            <Collapsible open={batchOpen} onOpenChange={setBatchOpen}>
              <CollapsibleContent>
                <div className="mt-3 flex flex-wrap items-end gap-3 rounded-md bg-muted/50 p-3">
                  <span className="self-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Batch Tools
                  </span>
                  <div className="grid gap-1.5">
                    <Label htmlFor="att-recalc-from" className="text-xs text-muted-foreground">Recalculate From</Label>
                    <Input
                      id="att-recalc-from"
                      type="date"
                      className="w-[160px]"
                      value={recalcStartDate}
                      onChange={(e) => setRecalcStartDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="att-recalc-to" className="text-xs text-muted-foreground">Recalculate To</Label>
                    <Input
                      id="att-recalc-to"
                      type="date"
                      className="w-[160px]"
                      value={recalcEndDate}
                      onChange={(e) => setRecalcEndDate(e.target.value)}
                    />
                  </div>
                  <Button variant="secondary" onClick={handleRecalculateRange} disabled={!canRecalculate}>
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    Recalculate Hours
                  </Button>
                  <Button
                    variant="outline"
                    className="ml-auto text-destructive hover:text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="size-4" /> Delete by Date Range
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {hasCompany && attendance.length > 0 && !loading && (
            <SummaryStrip
              regular={totals.regular}
              ot={totals.ot}
              weekendOT={totals.weekendOT}
              statHoliday={totals.statHoliday}
            />
          )}

          <div className="overflow-hidden rounded-lg border border-solid border-border bg-card">
            {renderListBody()}
          </div>
        </TabsContent>

        <TabsContent value="1">
          <ManualEntryTab
            companySelected={hasCompany}
            loading={loading}
            employeesCount={employees.length}
            filteredEmployees={filteredManualEntryEmployees}
            selectedEmployee={manualEntryEmployee}
            searchTerm={manualEntrySearchTerm}
            entries={manualEntries}
            canSave={!loading && hasCompany && !!manualEntryEmployeeId && manualEntries.length > 0}
            onSearchChange={setManualEntrySearchTerm}
            onSelectEmployee={(emp) => {
              setManualEntryEmployee(emp);
              setManualEntryEmployeeId(emp?.id || '');
            }}
            onAddRow={addManualEntryRow}
            onRemoveRow={removeManualEntryRow}
            onUpdate={updateManualEntry}
            onClearAll={resetManualEntryRows}
            onClear={clearManualEntry}
            onSaveAll={handleManualSaveAll}
          />
        </TabsContent>

        <TabsContent value="2">
          <AttendanceReportTab
            companySelected={hasCompany}
            payPeriods={payPeriods}
            employees={employees}
            reportPayPeriod={reportPayPeriod}
            reportEmployeeId={reportEmployeeId}
            reportFilters={reportFilters}
            reportView={reportView}
            report={report}
            detailedReport={detailedReport}
            title={reportTitle}
            headcount={reportHeadcount}
            rowsWithSubtotals={detailedRows}
            onPayPeriodChange={handleReportPayPeriodChange}
            onEmployeeChange={setReportEmployeeId}
            onStartDateChange={(v) => setReportFilters((f) => ({ ...f, start_date: v }))}
            onEndDateChange={(v) => setReportFilters((f) => ({ ...f, end_date: v }))}
            onGenerate={loadReport}
            onViewChange={handleReportViewChange}
            onPrint={handlePrintReport}
            onExport={() => handleExportReport('excel')}
          />
        </TabsContent>
      </Tabs>

      <EditAttendanceDialog
        open={dialogOpen}
        editingAttendance={editingAttendance}
        formData={formData}
        loading={loading}
        formatTime={formatTime}
        onChange={(patch) => setFormData((f) => ({ ...f, ...patch }))}
        onClose={handleCloseDialog}
        onSave={handleSave}
        onRecalculate={handleRecalculateEditing}
      />

      <UploadCsvDialog
        open={uploadDialogOpen}
        file={file}
        previewData={uploadPreview}
        uploadResult={uploadResult}
        previewLoading={previewLoading}
        uploadLoading={loading}
        onFileChange={(nextFile) => {
          setFile(nextFile);
          setUploadPreview(null);
          setUploadResult(null);
        }}
        onPreview={handlePreviewCSV}
        onImport={handleUploadCSV}
        onClose={resetUploadDialog}
      />

      <DeleteRangeDialog
        open={deleteDialogOpen}
        startDate={deleteStartDate}
        endDate={deleteEndDate}
        employeeId={selectedEmployeeId}
        loading={loading}
        onStartChange={setDeleteStartDate}
        onEndChange={setDeleteEndDate}
        onConfirm={handleDeleteByRange}
        onClose={() => setDeleteDialogOpen(false)}
      />

      <OverrideSubtotalsDialog
        open={overrideDialogOpen}
        context={overrideContext}
        formData={overrideFormData}
        hasExisting={!!periodOverride}
        loading={loading}
        onChange={(patch) => setOverrideFormData((f) => ({ ...f, ...patch }))}
        onClear={handleClearOverride}
        onSave={handleSaveOverride}
        onClose={() => setOverrideDialogOpen(false)}
      />

      <AppToast
        message={snackbar.open ? snackbar.message : null}
        variant={snackbar.severity}
        onClose={closeToast}
      />
    </div>
  );
};

export default AttendancePage;
