import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Divider,
} from '@mui/material';
import {
  Print as PrintIcon,
  GetApp as DownloadIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { ReportSummary, GroupedReportData, ReportFilters as FilterValues } from '../../types/reports';
import { useCompanyFilter } from '../../contexts/CompanyFilterContext';
import { FILTER_CONFIGS } from '../../utils/filterValidation';

interface ReportPreviewProps {
  reportType: string;
  data: any[] | GroupedReportData[];
  summary: ReportSummary;
  loading?: boolean;
  onPrint?: () => void;
  /** Vacation pay ledger only: download one PDF per employee */
  onPrintIndividual?: () => void | Promise<void>;
  onExport?: (format: string) => void;
  onRefresh?: () => void;
  isGrouped?: boolean;
  appliedFilters?: FilterValues;
}

const SKIP_FILTER_KEYS = new Set([
  'sort_by',
  'sort_direction',
  'group_by',
  'group_by_secondary',
]);

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  reportType,
  data,
  summary,
  loading = false,
  onPrint,
  onPrintIndividual,
  onExport,
  onRefresh,
  isGrouped = false,
  appliedFilters,
}) => {
  const { companies } = useCompanyFilter();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    setPage(0);
  }, [reportType, data, rowsPerPage]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      // Parse YYYY-MM-DD dates locally to avoid timezone issues
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString();
      }
      // Fallback for other date formats
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'terminated':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatFilterValue = (key: string, value: any): string | null => {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (key === 'company_id') {
      const company = companies.find((c) => c.id === value);
      return company
        ? `${company.legal_name}${company.trade_name ? ` (${company.trade_name})` : ''}`
        : String(value);
    }
    if (key === 'employee_ids') {
      const ids = String(value).split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length === 0) return null;
      return ids.length === 1 ? ids[0] : `${ids.length} selected`;
    }
    if (key === 'include_inactive' || key === 'include_history' || key === 'is_expired') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  };

  const filterSummaryChips = useMemo(() => {
    const source: Record<string, any> = {
      ...(summary.filters_applied || {}),
      ...(appliedFilters || {}),
    };
    const chips: { key: string; label: string; value: string }[] = [];
    Object.entries(source).forEach(([key, value]) => {
      if (SKIP_FILTER_KEYS.has(key)) return;
      const display = formatFilterValue(key, value);
      if (!display) return;
      const config = FILTER_CONFIGS.find((f) => f.name === key);
      const label = config?.label
        || (key === 'year' ? 'Year' : key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
      // Prefer appliedFilters over summary when both present — de-dupe by key
      const existing = chips.findIndex((c) => c.key === key);
      if (existing >= 0) chips[existing] = { key, label, value: display };
      else chips.push({ key, label, value: display });
    });
    return chips;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- formatFilterValue uses companies
  }, [appliedFilters, summary.filters_applied, companies]);

  const flatRows = isGrouped ? [] : (data as any[]);
  const totalRecordCount = summary.total_records ?? (isGrouped
    ? (data as GroupedReportData[]).reduce((sum, g) => sum + (g.group_count || g.records?.length || 0), 0)
    : flatRows.length);
  const totalPages = isGrouped ? 1 : Math.max(1, Math.ceil(flatRows.length / rowsPerPage));
  const pageRows = useMemo(() => {
    if (isGrouped) return [];
    return flatRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [flatRows, isGrouped, page, rowsPerPage]);

  const getTableHeaders = (): string[] => {
    switch (reportType) {
      case 'employee_directory':
        return ['Employee ID', 'Name', 'Email', 'Phone', 'Status', 'Position', 'Department', 'Company', 'Hire Date'];
      case 'employment_history':
        return ['Employee', 'Company', 'Position', 'Department', 'Start Date', 'End Date', 'Status', 'Duration'];
      case 'salary_analysis':
        return ['Employee', 'Position', 'Company', 'Pay Rate', 'Pay Type', 'Effective Date', 'End Date', 'Notes'];
      case 'leave_balance':
        return ['Employee', 'Vacation Days', 'Sick Days', 'Personal Days', 'Total Used', 'Total Remaining'];
      case 'leave_taken':
        return ['Employee', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason'];
      case 'vacation_pay_ledger':
        return [
          'Employee', 'Payroll Date', 'Gross', 'Benefits', 'Vac Paid',
          'Vac %', 'Vac Earned', 'Vac Balance $', 'Vac Taken', 'Vac Dates',
          'Vac Balance Days', 'Sick Taken', 'Sick Dates', 'Sick Bal',
        ];
      case 'work_permit_status':
        return ['Employee', 'Permit Type', 'Expiry Date', 'Days Until Expiry', 'Status'];
      case 'employee_personal_details':
        return ['Employee ID', 'Last Name', 'First Name', 'SIN', 'Address', 'Email', 'Phone'];
      case 'employee_basic_profile':
        return ['Name', 'Company', 'Current Position', 'Age'];
      case 'expense_reimbursement':
        return ['Employee', 'Claim ID', 'Paid Date', 'Expense Type', 'Receipts Amount', 'Claims Amount', 'Notes', 'Document'];
      default:
        return ['Data'];
    }
  };

  const getTableCells = (record: any): (string | React.ReactNode)[] => {
    switch (reportType) {
      case 'employee_directory':
        return [
          record.id || 'N/A',
          record.full_name || 'N/A',
          record.email || 'N/A',
          record.phone || 'N/A',
          <Chip
            key="status"
            label={record.status || 'N/A'}
            color={getStatusColor(record.status)}
            size="small"
          />,
          record.position || 'N/A',
          record.department || 'N/A',
          record.company_name || 'N/A',
          formatDate(record.hire_date)
        ];
      case 'employment_history':
        return [
          <Box key="employee">
            <Typography variant="body2" fontWeight="medium">
              {record.employee_name || 'N/A'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {record.employee_id || 'N/A'}
            </Typography>
          </Box>,
          record.company_name || 'N/A',
          record.position || 'N/A',
          record.department || 'N/A',
          formatDate(record.start_date),
          formatDate(record.end_date),
          <Chip
            key="status"
            label={record.is_active ? 'Active' : 'Inactive'}
            color={record.is_active ? 'success' : 'warning'}
            size="small"
          />,
          record.duration_days ? `${record.duration_days} days` : 'N/A'
        ];
      case 'salary_analysis':
        return [
          <Box key="employee">
            <Typography variant="body2" fontWeight="medium">
              {record.employee_name || 'N/A'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {record.employee_id || 'N/A'}
            </Typography>
          </Box>,
          record.position || 'N/A',
          record.company_name || 'N/A',
          formatCurrency(record.pay_rate),
          record.pay_type || 'N/A',
          formatDate(record.effective_date),
          formatDate(record.end_date),
          record.notes || 'N/A'
        ];
      case 'leave_balance':
        return [
          <Box key="employee">
            <Typography variant="body2" fontWeight="medium">
              {record.employee_name || 'N/A'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {record.employee_id || 'N/A'}
            </Typography>
          </Box>,
          record.vacation_days || 0,
          record.sick_days || 0,
          record.personal_days || 0,
          record.total_used || 0,
          record.total_remaining || 0
        ];
      case 'leave_taken':
        return [
          <Box key="employee">
            <Typography variant="body2" fontWeight="medium">
              {record.employee_name || 'N/A'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {record.employee_id || 'N/A'}
            </Typography>
          </Box>,
          `${record.leave_type_name} (${record.leave_type_code})`,
          formatDate(record.start_date),
          formatDate(record.end_date),
          record.days_taken || 0,
          record.status || 'N/A',
          record.reason || 'N/A'
        ];
      case 'vacation_pay_ledger':
        return [
          <Box key="employee">
            <Typography variant="body2" fontWeight="medium">
              {record.employee_name || 'N/A'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {record.employee_id || 'N/A'}
            </Typography>
          </Box>,
          formatDate(record.pay_date),
          formatCurrency(record.gross_pay),
          formatCurrency(record.benefits),
          formatCurrency(record.vacation_paid),
          record.vacation_percent != null ? `${record.vacation_percent}%` : '',
          formatCurrency(record.vacation_amount_earned),
          formatCurrency(record.vacation_balance),
          `${record.vacation_taken_days ?? 0}`,
          record.vacation_taken_dates || '',
          record.vacation_balance_days ?? 0,
          `${record.sick_leave_taken_days ?? 0}`,
          record.sick_leave_taken_dates || '',
          record.sick_leave_balance ?? 0,
        ];
      case 'work_permit_status':
        return [
          <Box key="employee">
            <Typography variant="body2" fontWeight="medium">
              {record.employee_name || 'N/A'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {record.employee_id || 'N/A'}
            </Typography>
          </Box>,
          record.permit_type || 'N/A',
          formatDate(record.expiry_date),
          record.days_until_expiry || 0,
          <Chip
            key="status"
            label={record.is_expired ? 'Expired' : record.is_expiring_soon ? 'Expiring Soon' : 'Valid'}
            color={record.is_expired ? 'error' : record.is_expiring_soon ? 'warning' : 'success'}
            size="small"
          />
        ];
      case 'employee_personal_details':
        const addressParts = [record.street, record.city, record.province, record.postal_code].filter(Boolean);
        const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'N/A';
        return [
          record.employee_id || 'N/A',
          record.last_name || 'N/A',
          record.first_name || 'N/A',
          record.sin ? '***-***-' + record.sin.slice(-3) : 'N/A',
          fullAddress,
          record.email || 'N/A',
          record.phone || 'N/A'
        ];
      case 'employee_basic_profile':
        return [
          record.name || 'N/A',
          record.company_name || 'N/A',
          record.current_position || 'N/A',
          record.age ?? 'N/A'
        ];
      case 'expense_reimbursement':
        return [
          <Box key="employee">
            <Typography variant="body2" fontWeight="medium">
              {record.employee_name || 'N/A'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {record.employee_id || 'N/A'}
            </Typography>
          </Box>,
          record.claim_id || 'N/A',
          record.paid_date ? new Date(record.paid_date).toLocaleDateString() : 'N/A',
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

  const renderEmployeeDirectoryTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Employee ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Position</TableCell>
            <TableCell>Department</TableCell>
            <TableCell>Company</TableCell>
            <TableCell>Hire Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pageRows.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell>{employee.id}</TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {employee.full_name}
                </Typography>
              </TableCell>
              <TableCell>{employee.email || 'N/A'}</TableCell>
              <TableCell>{employee.phone || 'N/A'}</TableCell>
              <TableCell>
                <Chip
                  label={employee.status}
                  color={getStatusColor(employee.status)}
                  size="small"
                />
              </TableCell>
              <TableCell>{employee.position || 'N/A'}</TableCell>
              <TableCell>{employee.department || 'N/A'}</TableCell>
              <TableCell>{employee.company_name || 'N/A'}</TableCell>
              <TableCell>{formatDate(employee.hire_date)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderEmploymentHistoryTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Employee</TableCell>
            <TableCell>Company</TableCell>
            <TableCell>Position</TableCell>
            <TableCell>Department</TableCell>
            <TableCell>Start Date</TableCell>
            <TableCell>End Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Duration</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pageRows.map((employment, index) => (
            <TableRow key={index}>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {employment.employee_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {employment.employee_id}
                </Typography>
              </TableCell>
              <TableCell>{employment.company_name}</TableCell>
              <TableCell>{employment.position}</TableCell>
              <TableCell>{employment.department || 'N/A'}</TableCell>
              <TableCell>{formatDate(employment.start_date)}</TableCell>
              <TableCell>{formatDate(employment.end_date)}</TableCell>
              <TableCell>
                <Chip
                  label={employment.is_active ? 'Active' : 'Inactive'}
                  color={employment.is_active ? 'success' : 'default'}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {employment.duration_days ? `${employment.duration_days} days` : 'N/A'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderSalaryAnalysisTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Employee</TableCell>
            <TableCell>Position</TableCell>
            <TableCell>Company</TableCell>
            <TableCell>Pay Rate</TableCell>
            <TableCell>Pay Type</TableCell>
            <TableCell>Effective Date</TableCell>
            <TableCell>End Date</TableCell>
            <TableCell>Notes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pageRows.map((salary, index) => (
            <TableRow key={index}>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {salary.employee_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {salary.employee_id}
                </Typography>
              </TableCell>
              <TableCell>{salary.position || 'N/A'}</TableCell>
              <TableCell>{salary.company_name || 'N/A'}</TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {formatCurrency(salary.pay_rate)}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip label={salary.pay_type} size="small" />
              </TableCell>
              <TableCell>{formatDate(salary.effective_date)}</TableCell>
              <TableCell>{formatDate(salary.end_date)}</TableCell>
              <TableCell>{salary.notes || 'N/A'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderWorkPermitTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Employee</TableCell>
            <TableCell>Permit Type</TableCell>
            <TableCell>Expiry Date</TableCell>
            <TableCell>Days Until Expiry</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pageRows.map((permit, index) => (
            <TableRow key={index}>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {permit.employee_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {permit.employee_id}
                </Typography>
              </TableCell>
              <TableCell>{permit.permit_type}</TableCell>
              <TableCell>{formatDate(permit.expiry_date)}</TableCell>
              <TableCell>
                <Typography
                  variant="body2"
                  color={
                    permit.is_expired
                      ? 'error'
                      : permit.is_expiring_soon
                      ? 'warning.main'
                      : 'text.primary'
                  }
                  fontWeight="medium"
                >
                  {permit.days_until_expiry}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={
                    permit.is_expired
                      ? 'Expired'
                      : permit.is_expiring_soon
                      ? 'Expiring Soon'
                      : 'Valid'
                  }
                  color={
                    permit.is_expired
                      ? 'error'
                      : permit.is_expiring_soon
                      ? 'warning'
                      : 'success'
                  }
                  size="small"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderLeaveBalanceTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell rowSpan={2}>Employee</TableCell>
            <TableCell colSpan={3} align="center" sx={{ borderBottom: '2px solid #1976d2', backgroundColor: '#e3f2fd' }}>
              Vacation Leave
            </TableCell>
            <TableCell colSpan={3} align="center" sx={{ borderBottom: '2px solid #1976d2', backgroundColor: '#fff3e0' }}>
              Sick Leave
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell align="center" sx={{ backgroundColor: '#e3f2fd' }}>Entitlement</TableCell>
            <TableCell align="center" sx={{ backgroundColor: '#e3f2fd' }}>Taken</TableCell>
            <TableCell align="center" sx={{ backgroundColor: '#e3f2fd' }}>Balance</TableCell>
            <TableCell align="center" sx={{ backgroundColor: '#fff3e0' }}>Entitlement</TableCell>
            <TableCell align="center" sx={{ backgroundColor: '#fff3e0' }}>Taken</TableCell>
            <TableCell align="center" sx={{ backgroundColor: '#fff3e0' }}>Balance</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pageRows.map((balance, index) => (
            <TableRow key={index}>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {balance.employee_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {balance.employee_id}
                </Typography>
              </TableCell>
              {/* Vacation columns */}
              <TableCell align="center" sx={{ backgroundColor: '#f5f5f5' }}>{balance.vacation_entitlement?.toFixed(1) || '0.0'}</TableCell>
              <TableCell align="center" sx={{ backgroundColor: '#f5f5f5' }}>{balance.vacation_taken?.toFixed(1) || '0.0'}</TableCell>
              <TableCell align="center" sx={{ backgroundColor: '#f5f5f5' }}>
                <Typography
                  variant="body2"
                  color={balance.vacation_balance && balance.vacation_balance > 0 ? 'success.main' : 'text.primary'}
                  fontWeight="medium"
                >
                  {balance.vacation_balance?.toFixed(1) || '0.0'}
                </Typography>
              </TableCell>
              {/* Sick leave columns */}
              <TableCell align="center" sx={{ backgroundColor: '#fafafa' }}>{balance.sick_entitlement?.toFixed(1) || '0.0'}</TableCell>
              <TableCell align="center" sx={{ backgroundColor: '#fafafa' }}>{balance.sick_taken?.toFixed(1) || '0.0'}</TableCell>
              <TableCell align="center" sx={{ backgroundColor: '#fafafa' }}>
                <Typography
                  variant="body2"
                  color={balance.sick_balance && balance.sick_balance > 0 ? 'success.main' : 'text.primary'}
                  fontWeight="medium"
                >
                  {balance.sick_balance?.toFixed(1) || '0.0'}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderLeaveTakenTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Employee</TableCell>
            <TableCell>Leave Type</TableCell>
            <TableCell>Start Date</TableCell>
            <TableCell>End Date</TableCell>
            <TableCell align="center">Days</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Reason</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pageRows.map((leave, index) => (
            <TableRow key={index}>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {leave.employee_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {leave.employee_id}
                </Typography>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip
                    label={leave.leave_type_code}
                    size="small"
                    color={leave.leave_type_code === 'VAC' ? 'primary' : 
                           leave.leave_type_code === 'SICK' ? 'secondary' : 'default'}
                  />
                  <Typography variant="body2">
                    {leave.leave_type_name}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>{formatDate(leave.start_date)}</TableCell>
              <TableCell>{formatDate(leave.end_date)}</TableCell>
              <TableCell align="center">
                <Typography variant="body2" fontWeight="medium">
                  {leave.days_taken}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={leave.status}
                  color={
                    leave.status === 'Active' ? 'success' :
                    leave.status === 'Cancelled' ? 'error' :
                    leave.status === 'Pending' ? 'warning' : 'default'
                  }
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" noWrap maxWidth={200}>
                  {leave.reason || '-'}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderEmployeePersonalDetailsTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {getTableHeaders().map((header, index) => (
              <TableCell key={index} sx={{ fontWeight: 'bold', backgroundColor: 'grey.100' }}>
                {header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pageRows.map((record, index) => (
            <TableRow key={index} hover>
              {getTableCells(record).map((cell, cellIndex) => (
                <TableCell key={cellIndex}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderExpenseReimbursementTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {getTableHeaders().map((header, index) => (
              <TableCell key={index} sx={{ fontWeight: 'bold', backgroundColor: 'grey.100' }}>
                {header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pageRows.map((record, index) => (
            <TableRow key={index} hover>
              {getTableCells(record).map((cell, cellIndex) => (
                <TableCell key={cellIndex}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderTable = () => {
    switch (reportType) {
      case 'employee_directory':
        return renderEmployeeDirectoryTable();
      case 'employment_history':
        return renderEmploymentHistoryTable();
      case 'salary_analysis':
        return renderSalaryAnalysisTable();
      case 'work_permit_status':
        return renderWorkPermitTable();
      case 'leave_balance':
        return renderLeaveBalanceTable();
      case 'leave_taken':
        return renderLeaveTakenTable();
      case 'vacation_pay_ledger':
        return renderEmployeePersonalDetailsTable();
      case 'employee_personal_details':
        return renderEmployeePersonalDetailsTable();
      case 'employee_basic_profile':
        return renderEmployeePersonalDetailsTable();
      case 'expense_reimbursement':
        return renderExpenseReimbursementTable();
      default:
        return (
          <Alert severity="info">
            Table view not implemented for this report type yet.
          </Alert>
        );
    }
  };

  const renderGroupedData = () => {
    if (!isGrouped || !Array.isArray(data)) return null;
    
    const groupedData = data as GroupedReportData[];
    
    return (
      <Box>
        {groupedData.map((group, groupIndex) => (
          <Box key={groupIndex} sx={{ mb: 3 }}>
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  {group.group_value} ({group.group_count} records)
                </Typography>
                {group.group_summary && (
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    {Object.entries(group.group_summary).map(([key, value]) => (
                      <Chip
                        key={key}
                        label={`${key}: ${value}`}
                        size="small"
                        variant="outlined"
                        sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Paper>
            
            {/* Render group records */}
            {group.records && group.records.length > 0 && (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      {getTableHeaders().map((header) => (
                        <TableCell key={header} sx={{ fontWeight: 'bold' }}>
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.records.map((record, recordIndex) => (
                      <TableRow key={recordIndex}>
                        {getTableCells(record).map((cell, cellIndex) => (
                          <TableCell key={cellIndex}>{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            
            {/* Render subgroups if they exist */}
            {group.subgroups && group.subgroups.length > 0 && (
              <Box sx={{ ml: 2, mt: 2 }}>
                {group.subgroups.map((subgroup, subIndex) => (
                  <Box key={subIndex} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                      {subgroup.group_value} ({subgroup.group_count} records)
                    </Typography>
                    {subgroup.records && subgroup.records.length > 0 && (
                      <TableContainer component={Paper} sx={{ ml: 2 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              {getTableHeaders().map((header) => (
                                <TableCell key={header} sx={{ fontWeight: 'bold' }}>
                                  {header}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {subgroup.records.map((record, recordIndex) => (
                              <TableRow key={recordIndex}>
                                {getTableCells(record).map((cell, cellIndex) => (
                                  <TableCell key={cellIndex}>{cell}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Generating report...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Report Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AssessmentIcon sx={{ mr: 1 }} />
          <Typography variant="h6">
            {reportType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Report
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onRefresh && (
            <Tooltip title="Refresh Report">
              <IconButton onClick={onRefresh} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          )}
          
          {onPrint && (
            <Tooltip title="Print Report">
              <IconButton onClick={onPrint}>
                <PrintIcon />
              </IconButton>
            </Tooltip>
          )}

          {onPrintIndividual && reportType === 'vacation_pay_ledger' && (
            <Tooltip title="Download PDF per employee (ZIP if multiple)">
              <IconButton onClick={onPrintIndividual} color="primary">
                <PersonIcon />
              </IconButton>
            </Tooltip>
          )}
          
          {onExport && (
            <Tooltip title="Export to Excel">
              <IconButton onClick={() => onExport('xlsx')}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Compact filters + record count */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1,
          mb: 2,
          py: 0.5,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {totalRecordCount} record{totalRecordCount === 1 ? '' : 's'}
          {filterSummaryChips.length > 0 ? ' ·' : ''}
        </Typography>
        {filterSummaryChips.map((chip) => (
          <Chip
            key={chip.key}
            size="small"
            variant="outlined"
            label={`${chip.label}: ${chip.value}`}
            sx={{ height: 24, '& .MuiChip-label': { px: 1, fontSize: '0.75rem' } }}
          />
        ))}
        {summary.generated_at && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Generated {formatDate(summary.generated_at)}
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Report Data */}
      {data.length === 0 ? (
        <Alert severity="info">
          No data found for the selected filters. Try adjusting your filter criteria.
        </Alert>
      ) : (
        <>
          {isGrouped ? renderGroupedData() : renderTable()}

          {!isGrouped && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
                mt: 1,
                pt: 1,
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Page {Math.min(page + 1, totalPages)} of {totalPages}
              </Typography>
              <TablePagination
                component="div"
                count={flatRows.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
                labelRowsPerPage="Rows"
                sx={{
                  border: 0,
                  '.MuiTablePagination-toolbar': { minHeight: 40, pl: 0 },
                  '.MuiTablePagination-displayedRows': { display: 'none' },
                }}
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};
