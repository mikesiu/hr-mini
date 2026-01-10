import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Backdrop,
} from '@mui/material';
import { ReportSelector } from '../components/reports/ReportSelector';
import { ReportFilters } from '../components/reports/ReportFilters';
import { ReportPreview } from '../components/reports/ReportPreview';
import { reportsAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  ReportType,
  ReportFilters as FilterValues,
} from '../types/reports';
// Dynamic import for ExcelJS

// Helper function to format dates correctly without timezone issues
const formatDateString = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    // Parse YYYY-MM-DD dates locally to avoid timezone issues
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString();
    }
    // Fallback for other date formats
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } catch {
    return dateString;
  }
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ReportsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [filters, setFilters] = useState<FilterValues>({});
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportSummary, setReportSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { hasPermission } = useAuth();

  // Load available report types
  useEffect(() => {
    const loadReportTypes = async () => {
      try {
        const response = await reportsAPI.getTypes();
        if (response.data.success) {
          setReportTypes(response.data.data);
        }
      } catch (error) {
        console.error('Error loading report types:', error);
        setError('Failed to load report types');
      }
    };

    loadReportTypes();
  }, []);

  // Check permissions after hooks
  if (!hasPermission('report:view')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You don't have permission to access reports. Please contact your administrator.
        </Alert>
      </Box>
    );
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSelectReport = (reportType: string) => {
    setSelectedReportType(reportType);
    setTabValue(1); // Switch to filters tab
    setReportData([]);
    setReportSummary(null);
    setError(null);
  };

  const handleFiltersChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = async () => {
    if (!selectedReportType) return;

    setLoading(true);
    setError(null);

    try {
      // Debug: Log the filters being sent
      console.log('Sending filters:', filters);
      console.log('Sort by:', filters.sort_by);
      console.log('Sort direction:', filters.sort_direction);
      
      let response;
      
      switch (selectedReportType) {
        case 'employee_directory':
          response = await reportsAPI.employeeDirectory(filters);
          break;
        case 'employment_history':
          response = await reportsAPI.employmentHistory(filters);
          break;
        case 'leave_balance':
          response = await reportsAPI.leaveBalance(filters);
          break;
        case 'leave_taken':
          response = await reportsAPI.leaveTaken(filters);
          break;
        case 'salary_analysis':
          response = await reportsAPI.salaryAnalysis(filters);
          break;
        case 'work_permit_status':
          response = await reportsAPI.workPermitStatus(filters);
          break;
        case 'comprehensive_overview':
          response = await reportsAPI.comprehensiveOverview(filters);
          break;
        case 'expense_reimbursement':
          response = await reportsAPI.expenseReimbursement(filters);
          break;
        default:
          throw new Error('Unknown report type');
      }

      if (response.data.success) {
        // Debug: Log the received data
        console.log('Received data:', response.data.data);
        console.log('First 3 records:');
        response.data.data.slice(0, 3).forEach((record: any, index: number) => {
          console.log(`  ${index + 1}. ${record.full_name} (ID: ${record.id})`);
        });
        
        setReportData(response.data.data);
        setReportSummary(response.data.summary);
        setTabValue(2); // Switch to preview tab
      } else {
        setError('Failed to generate report');
      }
    } catch (error: any) {
      console.error('Error generating report:', error);
      setError(error.response?.data?.detail || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handlePrint = () => {
    // Create a print-friendly version
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${selectedReportType.replace('_', ' ').toUpperCase()} Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .report-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .report-title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .report-subtitle { font-size: 14px; color: #666; }
            .report-summary { display: flex; justify-content: space-around; margin-bottom: 20px; }
            .summary-card { text-align: center; border: 1px solid #ccc; padding: 10px; margin: 0 5px; }
            .summary-value { font-size: 18px; font-weight: bold; }
            .summary-label { font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .report-footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div class="report-title">${selectedReportType.replace('_', ' ').toUpperCase()} Report</div>
            <div class="report-subtitle">Generated on ${new Date(reportSummary?.generated_at || Date.now()).toLocaleDateString()}</div>
          </div>
          
          <div class="report-summary">
            <div class="summary-card">
              <div class="summary-value">${reportSummary?.total_records || 0}</div>
              <div class="summary-label">Total Records</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${reportSummary?.total_pages || 1}</div>
              <div class="summary-label">Total Pages</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${reportSummary?.current_page || 1}</div>
              <div class="summary-label">Current Page</div>
            </div>
          </div>
          
          ${generatePrintTable()}
          
          <div class="report-footer">
            HR Management System - ${selectedReportType.replace('_', ' ').toUpperCase()} Report
          </div>
        </body>
        </html>
      `;
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  };

  const generateGroupedPrintTable = () => {
    if (reportData.length === 0) return '<p>No data available</p>';
    
    let html = '';
    
    // Get table headers based on report type
    const getHeaders = () => {
      switch (selectedReportType) {
        case 'employee_directory':
          return ['Employee ID', 'Name', 'Email', 'Phone', 'Status', 'Position', 'Department', 'Company', 'Hire Date'];
        case 'employment_history':
          return ['Employee', 'Company', 'Position', 'Department', 'Start Date', 'End Date', 'Status', 'Duration'];
        case 'salary_analysis':
          return ['Employee', 'Position', 'Company', 'Pay Rate', 'Pay Type', 'Effective Date', 'End Date', 'Notes'];
        case 'leave_balance':
          return ['Employee', 'Vacation Entitlement', 'Vacation Taken', 'Vacation Balance', 'Sick Entitlement', 'Sick Taken', 'Sick Balance'];
        case 'leave_taken':
          return ['Employee', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason'];
        case 'expense_reimbursement':
          return ['Employee', 'Claim ID', 'Paid Date', 'Expense Type', 'Receipts Amount', 'Claims Amount', 'Notes', 'Document'];
        default:
          return ['Data'];
      }
    };
    
    const headers = getHeaders();
    
    // Process each group
    reportData.forEach((group, groupIndex) => {
      // Group header
      html += `
        <div style="margin-top: 20px; margin-bottom: 10px;">
          <h3 style="background-color: #f0f0f0; padding: 10px; margin: 0; border-left: 4px solid #1976d2;">
            ${group.group_value} (${group.group_count} records)
          </h3>
        </div>
      `;
      
      // Group table
      html += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">';
      html += '<thead><tr>';
      headers.forEach(header => {
        html += `<th style="border: 1px solid #000; padding: 8px; background-color: #f0f0f0; font-weight: bold;">${header}</th>`;
      });
      html += '</tr></thead><tbody>';
      
      // Group records
      if (group.records && group.records.length > 0) {
        group.records.forEach((record: any) => {
          html += '<tr>';
          
          switch (selectedReportType) {
            case 'employee_directory':
              html += `
                <td style="border: 1px solid #000; padding: 8px;">${record.id || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.full_name || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.email || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.phone || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.status || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.position || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.department || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.company_name || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${formatDateString(record.hire_date)}</td>
              `;
              break;
            case 'employment_history':
              html += `
                <td style="border: 1px solid #000; padding: 8px;">
                  ${record.employee_name || 'N/A'}<br>
                  <small>${record.employee_id || 'N/A'}</small>
                </td>
                <td style="border: 1px solid #000; padding: 8px;">${record.company_name || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.position || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.department || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${formatDateString(record.start_date)}</td>
                <td style="border: 1px solid #000; padding: 8px;">${formatDateString(record.end_date)}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.is_active ? 'Active' : 'Inactive'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.duration_days ? record.duration_days + ' days' : 'N/A'}</td>
              `;
              break;
            case 'salary_analysis':
              html += `
                <td style="border: 1px solid #000; padding: 8px;">
                  ${record.employee_name || 'N/A'}<br>
                  <small>${record.employee_id || 'N/A'}</small>
                </td>
                <td style="border: 1px solid #000; padding: 8px;">${record.position || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.company_name || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.pay_rate ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(record.pay_rate) : 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.pay_type || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${formatDateString(record.effective_date)}</td>
                <td style="border: 1px solid #000; padding: 8px;">${formatDateString(record.end_date)}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.notes || 'N/A'}</td>
              `;
              break;
            case 'leave_balance':
              html += `
                <td style="border: 1px solid #000; padding: 8px;">
                  <strong>${record.employee_name || 'N/A'}</strong><br>
                  <small>${record.employee_id || 'N/A'}</small>
                </td>
                <td style="border: 1px solid #000; padding: 8px;">${record.vacation_entitlement?.toFixed(1) || '0.0'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.vacation_taken?.toFixed(1) || '0.0'}</td>
                <td style="border: 1px solid #000; padding: 8px;"><strong>${record.vacation_balance?.toFixed(1) || '0.0'}</strong></td>
                <td style="border: 1px solid #000; padding: 8px;">${record.sick_entitlement?.toFixed(1) || '0.0'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.sick_taken?.toFixed(1) || '0.0'}</td>
                <td style="border: 1px solid #000; padding: 8px;"><strong>${record.sick_balance?.toFixed(1) || '0.0'}</strong></td>
              `;
              break;
            case 'leave_taken':
              html += `
                <td style="border: 1px solid #000; padding: 8px;">
                  <strong>${record.employee_name || 'N/A'}</strong><br>
                  <small>${record.employee_id || 'N/A'}</small>
                </td>
                <td style="border: 1px solid #000; padding: 8px;">${record.leave_type_name} (${record.leave_type_code})</td>
                <td style="border: 1px solid #000; padding: 8px;">${formatDateString(record.start_date)}</td>
                <td style="border: 1px solid #000; padding: 8px;">${formatDateString(record.end_date)}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.days_taken || 0}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.status || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.reason || 'N/A'}</td>
              `;
              break;
            case 'expense_reimbursement':
              html += `
                <td style="border: 1px solid #000; padding: 8px;">
                  <strong>${record.employee_name || 'N/A'}</strong><br>
                  <small>${record.employee_id || 'N/A'}</small>
                </td>
                <td style="border: 1px solid #000; padding: 8px;">${record.claim_id || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${formatDateString(record.paid_date)}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.expense_type || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.receipts_amount ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(record.receipts_amount) : 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.claims_amount ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(record.claims_amount) : 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.notes || 'N/A'}</td>
                <td style="border: 1px solid #000; padding: 8px;">${record.document_filename || 'N/A'}</td>
              `;
              break;
            default:
              html += `<td style="border: 1px solid #000; padding: 8px;">${JSON.stringify(record)}</td>`;
          }
          
          html += '</tr>';
        });
      }
      
      html += '</tbody></table>';
      
      // Handle subgroups if they exist
      if (group.subgroups && group.subgroups.length > 0) {
        group.subgroups.forEach((subgroup: any) => {
          html += `
            <div style="margin-left: 20px; margin-top: 10px;">
              <h4 style="background-color: #f5f5f5; padding: 8px; margin: 0; border-left: 2px solid #666;">
                ${subgroup.group_value} (${subgroup.group_count} records)
              </h4>
            </div>
          `;
          
          html += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; margin-left: 20px;">';
          html += '<thead><tr>';
          headers.forEach(header => {
            html += `<th style="border: 1px solid #000; padding: 6px; background-color: #f5f5f5; font-weight: bold; font-size: 12px;">${header}</th>`;
          });
          html += '</tr></thead><tbody>';
          
          if (subgroup.records && subgroup.records.length > 0) {
            subgroup.records.forEach((record: any) => {
              html += '<tr>';
              // Use the same record rendering logic as above
              switch (selectedReportType) {
                case 'employment_history':
                  html += `
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">
                      ${record.employee_name || 'N/A'}<br>
                      <small>${record.employee_id || 'N/A'}</small>
                    </td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">${record.company_name || 'N/A'}</td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">${record.position || 'N/A'}</td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">${record.department || 'N/A'}</td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">${formatDateString(record.start_date)}</td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">${formatDateString(record.end_date)}</td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">${record.is_active ? 'Active' : 'Inactive'}</td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">${record.duration_days ? record.duration_days + ' days' : 'N/A'}</td>
                  `;
                  break;
                case 'leave_balance':
                  html += `
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">
                      <strong>${record.employee_name || 'N/A'}</strong><br>
                      <small>${record.employee_id || 'N/A'}</small>
                    </td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">${record.vacation_entitlement?.toFixed(1) || '0.0'}</td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">${record.vacation_taken?.toFixed(1) || '0.0'}</td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;"><strong>${record.vacation_balance?.toFixed(1) || '0.0'}</strong></td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">${record.sick_entitlement?.toFixed(1) || '0.0'}</td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">${record.sick_taken?.toFixed(1) || '0.0'}</td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;"><strong>${record.sick_balance?.toFixed(1) || '0.0'}</strong></td>
                  `;
                  break;
                case 'leave_taken':
                  html += `
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">
                      <strong>${record.employee_name || 'N/A'}</strong><br>
                      <small>${record.employee_id || 'N/A'}</small>
                    </td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">${record.leave_type_name} (${record.leave_type_code})</td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">${formatDateString(record.start_date)}</td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">${formatDateString(record.end_date)}</td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">${record.days_taken || 0}</td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">${record.status || 'N/A'}</td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 12px;">${record.reason || 'N/A'}</td>
                  `;
                  break;
                default:
                  html += `<td style="border: 1px solid #000; padding: 6px; font-size: 12px;">${JSON.stringify(record)}</td>`;
              }
              html += '</tr>';
            });
          }
          
          html += '</tbody></table>';
        });
      }
    });
    
    return html;
  };

  const generatePrintTable = () => {
    if (reportData.length === 0) return '<p>No data available</p>';
    
    let tableHtml = '<table>';
    
    // Check if data is grouped
    const isGrouped = reportSummary?.group_by_applied && reportSummary.group_by_applied.length > 0;
    
    if (isGrouped) {
      // Handle grouped data
      return generateGroupedPrintTable();
    }
    
    switch (selectedReportType) {
      case 'employee_directory':
        tableHtml += `
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Position</th>
              <th>Department</th>
              <th>Company</th>
              <th>Hire Date</th>
            </tr>
          </thead>
          <tbody>
        `;
        reportData.forEach(employee => {
          tableHtml += `
            <tr>
              <td>${employee.id || 'N/A'}</td>
              <td>${employee.full_name || 'N/A'}</td>
              <td>${employee.email || 'N/A'}</td>
              <td>${employee.phone || 'N/A'}</td>
              <td>${employee.status || 'N/A'}</td>
              <td>${employee.position || 'N/A'}</td>
              <td>${employee.department || 'N/A'}</td>
              <td>${employee.company_name || 'N/A'}</td>
              <td>${formatDateString(employee.hire_date)}</td>
            </tr>
          `;
        });
        break;
        
      case 'employment_history':
        tableHtml += `
          <thead>
            <tr>
              <th>Employee</th>
              <th>Company</th>
              <th>Position</th>
              <th>Department</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
        `;
        reportData.forEach(employment => {
          tableHtml += `
            <tr>
              <td>${employment.employee_name}<br><small>${employment.employee_id}</small></td>
              <td>${employment.company_name}</td>
              <td>${employment.position}</td>
              <td>${employment.department || 'N/A'}</td>
              <td>${formatDateString(employment.start_date)}</td>
              <td>${formatDateString(employment.end_date)}</td>
              <td>${employment.is_active ? 'Active' : 'Inactive'}</td>
              <td>${employment.duration_days ? employment.duration_days + ' days' : 'N/A'}</td>
            </tr>
          `;
        });
        break;
        
      case 'salary_analysis':
        tableHtml += `
          <thead>
            <tr>
              <th>Employee</th>
              <th>Position</th>
              <th>Company</th>
              <th>Pay Rate</th>
              <th>Pay Type</th>
              <th>Effective Date</th>
              <th>End Date</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
        `;
        reportData.forEach(salary => {
          tableHtml += `
            <tr>
              <td>${salary.employee_name}<br><small>${salary.employee_id}</small></td>
              <td>${salary.position || 'N/A'}</td>
              <td>${salary.company_name || 'N/A'}</td>
              <td>${new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(salary.pay_rate)}</td>
              <td>${salary.pay_type}</td>
              <td>${formatDateString(salary.effective_date)}</td>
              <td>${formatDateString(salary.end_date)}</td>
              <td>${salary.notes || 'N/A'}</td>
            </tr>
          `;
        });
        break;
        
      case 'leave_balance':
        tableHtml += `
          <thead>
            <tr>
              <th>Employee</th>
              <th>Vacation Entitlement</th>
              <th>Vacation Taken</th>
              <th>Vacation Balance</th>
              <th>Sick Entitlement</th>
              <th>Sick Taken</th>
              <th>Sick Balance</th>
            </tr>
          </thead>
          <tbody>
        `;
        reportData.forEach(balance => {
          tableHtml += `
            <tr>
              <td>
                <strong>${balance.employee_name || 'N/A'}</strong><br>
                <small>${balance.employee_id || 'N/A'}</small>
              </td>
              <td>${balance.vacation_entitlement?.toFixed(1) || '0.0'}</td>
              <td>${balance.vacation_taken?.toFixed(1) || '0.0'}</td>
              <td><strong>${balance.vacation_balance?.toFixed(1) || '0.0'}</strong></td>
              <td>${balance.sick_entitlement?.toFixed(1) || '0.0'}</td>
              <td>${balance.sick_taken?.toFixed(1) || '0.0'}</td>
              <td><strong>${balance.sick_balance?.toFixed(1) || '0.0'}</strong></td>
            </tr>
          `;
        });
        break;
        
      case 'leave_taken':
        tableHtml += `
          <thead>
            <tr>
              <th>Employee</th>
              <th>Leave Type</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Days</th>
              <th>Status</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
        `;
        reportData.forEach(leave => {
          tableHtml += `
            <tr>
              <td>
                <strong>${leave.employee_name || 'N/A'}</strong><br>
                <small>${leave.employee_id || 'N/A'}</small>
              </td>
              <td>${leave.leave_type_name} (${leave.leave_type_code})</td>
              <td>${formatDateString(leave.start_date)}</td>
              <td>${formatDateString(leave.end_date)}</td>
              <td>${leave.days_taken || 0}</td>
              <td>${leave.status || 'N/A'}</td>
              <td>${leave.reason || 'N/A'}</td>
            </tr>
          `;
        });
        break;
        
      case 'expense_reimbursement':
        tableHtml += `
          <thead>
            <tr>
              <th>Employee</th>
              <th>Claim ID</th>
              <th>Paid Date</th>
              <th>Expense Type</th>
              <th>Receipts Amount</th>
              <th>Claims Amount</th>
              <th>Notes</th>
              <th>Document</th>
            </tr>
          </thead>
          <tbody>
        `;
        reportData.forEach(expense => {
          tableHtml += `
            <tr>
              <td>${expense.employee_name}<br><small>${expense.employee_id}</small></td>
              <td>${expense.claim_id || 'N/A'}</td>
              <td>${formatDateString(expense.paid_date)}</td>
              <td>${expense.expense_type || 'N/A'}</td>
              <td>${expense.receipts_amount ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(expense.receipts_amount) : 'N/A'}</td>
              <td>${expense.claims_amount ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(expense.claims_amount) : 'N/A'}</td>
              <td>${expense.notes || 'N/A'}</td>
              <td>${expense.document_filename || 'N/A'}</td>
            </tr>
          `;
        });
        break;
        
      default:
        tableHtml += '<tbody><tr><td colspan="8">Print view not implemented for this report type</td></tr>';
    }
    
    tableHtml += '</tbody></table>';
    return tableHtml;
  };

  const handleExport = async (format: string) => {
    if (!selectedReportType) return;

    try {
      // Dynamic import for ExcelJS
      const ExcelJS = await import('exceljs');
      
      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report Data');
      
      // Check if data is grouped
      const isGrouped = reportSummary?.group_by_applied && reportSummary.group_by_applied.length > 0;
      
      let currentRow = 1;
      
      if (isGrouped) {
        // Handle grouped data
        reportData.forEach((group: any) => {
          // Add group header
          worksheet.getCell(`A${currentRow}`).value = `${group.group_value} (${group.group_count} records)`;
          worksheet.getCell(`A${currentRow}`).font = { bold: true };
          currentRow++;
          
          // Add headers
          const headers = getTableHeaders();
          headers.forEach((header, index) => {
            const cell = worksheet.getCell(currentRow, index + 1);
            cell.value = header;
            cell.font = { bold: true };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE0E0E0' }
            };
          });
          currentRow++;
          
          // Add group records
          if (group.records && group.records.length > 0) {
            group.records.forEach((record: any) => {
              const row = getTableCells(record);
              row.forEach((cellValue, index) => {
                worksheet.getCell(currentRow, index + 1).value = cellValue;
              });
              currentRow++;
            });
          }
          
          // Add subgroup data if exists
          if (group.subgroups && group.subgroups.length > 0) {
            group.subgroups.forEach((subgroup: any) => {
              worksheet.getCell(`A${currentRow}`).value = `  ${subgroup.group_value} (${subgroup.group_count} records)`;
              worksheet.getCell(`A${currentRow}`).font = { bold: true, italic: true };
              currentRow++;
              
              if (subgroup.records && subgroup.records.length > 0) {
                subgroup.records.forEach((record: any) => {
                  const row = getTableCells(record);
                  row.forEach((cellValue, index) => {
                    worksheet.getCell(currentRow, index + 1).value = cellValue;
                  });
                  currentRow++;
                });
              }
            });
          }
          
          currentRow++; // Empty row between groups
        });
      } else {
        // Handle regular data
        const headers = getTableHeaders();
        headers.forEach((header, index) => {
          const cell = worksheet.getCell(currentRow, index + 1);
          cell.value = header;
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
          };
        });
        currentRow++;
        
        reportData.forEach((record: any) => {
          const row = getTableCells(record);
          row.forEach((cellValue, index) => {
            worksheet.getCell(currentRow, index + 1).value = cellValue;
          });
          currentRow++;
        });
      }
      
      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 15;
      });
      
      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Create and download file
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Error exporting report:', error);
      setError('Failed to export report');
    }
  };

  // Helper functions for Excel export
  const getTableHeaders = () => {
    switch (selectedReportType) {
      case 'employee_directory':
        return ['Employee ID', 'Name', 'Email', 'Phone', 'Status', 'Position', 'Department', 'Company', 'Hire Date'];
      case 'employment_history':
        return ['Employee', 'Company', 'Position', 'Department', 'Start Date', 'End Date', 'Status', 'Duration'];
      case 'leave_balance':
        return ['Employee', 'Vacation Entitlement', 'Vacation Taken', 'Vacation Balance', 'Sick Entitlement', 'Sick Taken', 'Sick Balance'];
        case 'leave_taken':
          return ['Employee', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason'];
        case 'salary_analysis':
          return ['Employee', 'Position', 'Company', 'Pay Rate', 'Pay Type', 'Effective Date', 'End Date', 'Notes'];
        case 'expense_reimbursement':
          return ['Employee', 'Claim ID', 'Paid Date', 'Expense Type', 'Receipts Amount', 'Claims Amount', 'Notes', 'Document'];
        default:
          return ['Data'];
    }
  };

  const getTableCells = (record: any) => {
    switch (selectedReportType) {
      case 'employee_directory':
        return [
          record.id || 'N/A',
          record.full_name || 'N/A',
          record.email || 'N/A',
          record.phone || 'N/A',
          record.status || 'N/A',
          record.position || 'N/A',
          record.department || 'N/A',
          record.company_name || 'N/A',
          formatDateString(record.hire_date)
        ];
      case 'employment_history':
        return [
          `${record.employee_name || 'N/A'} (${record.employee_id || 'N/A'})`,
          record.company_name || 'N/A',
          record.position || 'N/A',
          record.department || 'N/A',
          formatDateString(record.start_date),
          formatDateString(record.end_date),
          record.is_active ? 'Active' : 'Inactive',
          record.duration_days ? `${record.duration_days} days` : 'N/A'
        ];
      case 'leave_balance':
        return [
          `${record.employee_name || 'N/A'} (${record.employee_id || 'N/A'})`,
          record.vacation_entitlement?.toFixed(1) || '0.0',
          record.vacation_taken?.toFixed(1) || '0.0',
          record.vacation_balance?.toFixed(1) || '0.0',
          record.sick_entitlement?.toFixed(1) || '0.0',
          record.sick_taken?.toFixed(1) || '0.0',
          record.sick_balance?.toFixed(1) || '0.0'
        ];
      case 'leave_taken':
        return [
          `${record.employee_name || 'N/A'} (${record.employee_id || 'N/A'})`,
          `${record.leave_type_name} (${record.leave_type_code})`,
          formatDateString(record.start_date),
          formatDateString(record.end_date),
          record.days_taken || 0,
          record.status || 'N/A',
          record.reason || 'N/A'
        ];
        case 'salary_analysis':
          return [
            `${record.employee_name || 'N/A'} (${record.employee_id || 'N/A'})`,
            record.position || 'N/A',
            record.company_name || 'N/A',
            record.pay_rate ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(record.pay_rate) : 'N/A',
            record.pay_type || 'N/A',
            formatDateString(record.effective_date),
            formatDateString(record.end_date),
            record.notes || 'N/A'
          ];
        case 'expense_reimbursement':
          return [
            `${record.employee_name || 'N/A'} (${record.employee_id || 'N/A'})`,
            record.claim_id || 'N/A',
            formatDateString(record.paid_date),
            record.expense_type || 'N/A',
            record.receipts_amount ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(record.receipts_amount) : 'N/A',
            record.claims_amount ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(record.claims_amount) : 'N/A',
            record.notes || 'N/A',
            record.document_filename || 'N/A'
          ];
        default:
          return [JSON.stringify(record)];
    }
  };

  const handleRefresh = () => {
    handleApplyFilters();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        📊 HR Reports
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Generate comprehensive reports across all HR operations with flexible filtering options.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="reports tabs">
            <Tab label="Select Report" />
            <Tab label="Configure Filters" disabled={!selectedReportType} />
            <Tab label="View Report" disabled={!reportData.length} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <ReportSelector
            reportTypes={reportTypes}
            onSelectReport={handleSelectReport}
            selectedReportType={selectedReportType}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {selectedReportType ? (
            <ReportFilters
              reportType={selectedReportType}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
              loading={loading}
            />
          ) : (
            <Alert severity="info">
              Please select a report type first.
            </Alert>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {reportData.length > 0 && reportSummary ? (
            <ReportPreview
              reportType={selectedReportType}
              data={reportData}
              summary={reportSummary}
              loading={loading}
              onPrint={handlePrint}
              onExport={handleExport}
              onRefresh={handleRefresh}
              isGrouped={reportSummary?.group_by_applied && reportSummary.group_by_applied.length > 0}
            />
          ) : (
            <Alert severity="info">
              No report data available. Please generate a report first.
            </Alert>
          )}
        </TabPanel>
      </Paper>

      {/* Loading Backdrop */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress color="inherit" />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Generating Report...
          </Typography>
        </Box>
      </Backdrop>
    </Box>
  );
}
