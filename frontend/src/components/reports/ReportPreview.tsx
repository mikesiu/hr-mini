import React from 'react';
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
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Card,
  CardContent,
  Grid,
  Divider,
} from '@mui/material';
import {
  Print as PrintIcon,
  GetApp as DownloadIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { ReportSummary, GroupedReportData } from '../../types/reports';

interface ReportPreviewProps {
  reportType: string;
  data: any[] | GroupedReportData[];
  summary: ReportSummary;
  loading?: boolean;
  onPrint?: () => void;
  onExport?: (format: string) => void;
  onRefresh?: () => void;
  isGrouped?: boolean;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  reportType,
  data,
  summary,
  loading = false,
  onPrint,
  onExport,
  onRefresh,
  isGrouped = false,
}) => {
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
      case 'work_permit_status':
        return ['Employee', 'Permit Type', 'Expiry Date', 'Days Until Expiry', 'Status'];
      case 'comprehensive_overview':
        return ['Employee', 'Position', 'Company', 'Pay Rate', 'Leave Balance', 'Work Permit', 'Status'];
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
      case 'comprehensive_overview':
        return [
          <Box key="employee">
            <Typography variant="body2" fontWeight="medium">
              {record.employee?.full_name || 'N/A'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {record.employee?.id || 'N/A'}
            </Typography>
          </Box>,
          record.current_employment?.position || 'N/A',
          record.current_employment?.company_name || 'N/A',
          record.current_salary ? formatCurrency(record.current_salary.pay_rate) : 'N/A',
          record.leave_balance ? (
            <Box key="leave">
              <Typography variant="caption" display="block">
                V: {record.leave_balance.vacation_balance?.toFixed(1) || '0.0'}
              </Typography>
              <Typography variant="caption" display="block">
                S: {record.leave_balance.sick_balance?.toFixed(1) || '0.0'}
              </Typography>
            </Box>
          ) : 'N/A',
          record.current_work_permit ? (
            <Chip
              key="permit"
              label={record.current_work_permit.is_expired ? 'Expired' : 'Valid'}
              color={record.current_work_permit.is_expired ? 'error' : 'success'}
              size="small"
            />
          ) : 'N/A',
          <Chip
            key="status"
            label={record.employee?.status || 'N/A'}
            color={getStatusColor(record.employee?.status)}
            size="small"
          />
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
          {data.map((employee) => (
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
          {data.map((employment, index) => (
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
          {data.map((salary, index) => (
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
          {data.map((permit, index) => (
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
          {data.map((balance, index) => (
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
          {data.map((leave, index) => (
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

  const renderComprehensiveOverviewTable = () => (
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
          {data.map((record, index) => (
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
          {data.map((record, index) => (
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
      case 'comprehensive_overview':
        return renderComprehensiveOverviewTable();
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AssessmentIcon sx={{ mr: 1 }} />
          <Typography variant="h6">
            {reportType.replace('_', ' ').toUpperCase()} Report
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
          
          {onExport && (
            <Tooltip title="Export to Excel">
              <IconButton onClick={() => onExport('xlsx')}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Report Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary">
                {summary.total_records}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Records
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="secondary">
                {summary.total_pages}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Pages
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {summary.current_page}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Current Page
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Generated At
              </Typography>
              <Typography variant="body2">
                {formatDate(summary.generated_at)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 3 }} />

      {/* Report Data */}
      {data.length === 0 ? (
        <Alert severity="info">
          No data found for the selected filters. Try adjusting your filter criteria.
        </Alert>
      ) : isGrouped ? (
        renderGroupedData()
      ) : (
        renderTable()
      )}
    </Box>
  );
};
