import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Chip,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  CircularProgress,
  Stack,
  Tooltip,
  Tabs,
  Tab,
  CardHeader,
  Avatar,
  LinearProgress,
  Fade,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add,
  Edit,
  Delete,
  Event,
  Person,
  CheckCircle,
  Cancel,
  Warning,
  Info,
  BeachAccess,
  LocalHospital,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Preview as PreviewIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { useCompanyFilter } from '../hooks/useCompanyFilter';
import { useSelectedEmployee } from '../contexts/SelectedEmployeeContext';
import { apiClient, leaveAPI } from '../api/client';

// Types
interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string;
  phone?: string;
  hire_date?: string;
  probation_end_date?: string;
  status: string;
}

interface LeaveType {
  id: number;
  name: string;
  code: string;
  days_per_year: number;
  carry_over: boolean;
  max_carry_over?: number;
  is_active: boolean;
}

interface Leave {
  id: number;
  employee_id: string;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string;
  status: string;
  approved_by?: number;
  approved_at?: string;
  remarks?: string;
  created_at: string;
  updated_at?: string;
  employee?: Employee;
}

interface LeaveBalance {
  employee_id: string;
  vacation_remaining: number;
  sick_remaining: number;
  vacation_entitlement: number;
  sick_entitlement: number;  // Added for proper sick leave display
  vacation_earned_date?: string;
  vacation_expiry_date?: string;
  hire_date?: string;
  seniority_start_date?: string;  // Added for transparency
  years_employed: number;
}

interface LeaveFormData {
  leave_type_id: number;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string;
  status: string;
}

type LeaveCategory = 'all' | 'vacation' | 'sick' | 'others';

// Upload types
interface LeaveUploadError {
  row_number: number;
  error_message: string;
}

interface LeaveUploadResponse {
  success_count: number;
  skipped_count: number;
  error_count: number;
  errors: LeaveUploadError[];
}

interface LeaveUploadPreviewRow {
  row_number: number;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  will_import: boolean;
  error_message?: string;
}

interface LeaveUploadPreviewResponse {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  rows: LeaveUploadPreviewRow[];
}

const LeavePage: React.FC = () => {
  const theme = useTheme();
  const { isFilterActive, getCompanyName, selectedCompanyId } = useCompanyFilter();
  const { selectedEmployee: globalSelectedEmployee, setSelectedEmployee: setGlobalSelectedEmployee } = useSelectedEmployee();
  
  // State
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedEmployeeData, setSelectedEmployeeData] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<LeaveCategory>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Employee search states - using EmployeePage pattern
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  
  // Upload states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<LeaveUploadPreviewResponse | null>(null);
  const [uploadResult, setUploadResult] = useState<LeaveUploadResponse | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<LeaveFormData>({
    leave_type_id: 0, // Will be set to first available leave type when loaded
    start_date: '',
    end_date: '',
    days_requested: 0,
    reason: '',
    status: 'Active',
  });

  // Data loading functions
  const loadLeaveTypes = useCallback(async () => {
    try {
      const response = await apiClient.get('/leaves/types');
      // The API returns the list directly, not wrapped in a data property
      const types = response.data;
      setLeaveTypes(types);
      
      // Set the first available leave type as default if form is not initialized
      if (types.length > 0 && formData.leave_type_id === 0) {
        setFormData(prev => ({ ...prev, leave_type_id: types[0].id }));
      }
    } catch (err) {
      setError('Failed to load leave types');
    }
  }, [formData.leave_type_id]);

  const loadLeaves = React.useCallback(async () => {
    try {
      // If searching, show search results instead of leave records
      if (searchTerm) {
        setLoading(true);
        // Search for employees matching the search term
        const employeeResponse = await apiClient.get('/employees/list', {
          params: { q: searchTerm, company_id: selectedCompanyId || undefined }
        });
        setSearchResults(employeeResponse.data?.data || []);
        setLeaves([]); // Don't show leave records yet
        setLoading(false);
        return;
      } else {
        // Only filter by employee if no search term is provided
        const employeeToFilter = globalSelectedEmployee?.id || selectedEmployee;
        
        if (employeeToFilter) {
          setLoading(true);
          const twoYearsAgo = new Date();
          twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
          const response = await apiClient.get('/leaves', {
            params: {
              employee_id: employeeToFilter,
              start_from: twoYearsAgo.toISOString().split('T')[0]
            }
          });
          setLeaves(response.data);
          setLoading(false);
        } else {
          // No employee selected and no search - just clear data, no loading needed
          setLeaves([]);
          setSearchResults([]);
        }
        
        // Clear search results when we have a selected employee (not from search)
        if (globalSelectedEmployee?.id || selectedEmployee) {
          setSearchResults([]);
        }
      }
    } catch (err: any) {
      console.error('Failed to load leaves:', err);
      setError(err.response?.data?.detail || 'Failed to load leave history');
      setLoading(false);
    }
  }, [searchTerm, selectedEmployee, globalSelectedEmployee?.id, selectedCompanyId]);

  const loadLeaveBalance = React.useCallback(async (employeeId?: string) => {
    const targetEmployeeId = employeeId || selectedEmployee;
    if (!targetEmployeeId) return;
    
    try {
      const response = await apiClient.get(`/leaves/balance/${targetEmployeeId}`);
      setLeaveBalance(response.data);
    } catch (err) {
      setError('Failed to load leave balance');
    }
  }, [selectedEmployee]);

  // Search functionality - using EmploymentPage pattern
  const handleSearch = () => {
    loadLeaves();
  };

  const handleSearchResultClick = async (employee: Employee) => {
    // Set the global selected employee first
    setGlobalSelectedEmployee({
      id: employee.id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone,
      status: employee.status,
    });
    
    // Also update local states immediately
    setSelectedEmployee(employee.id);
    setSelectedEmployeeData(employee);
    
    // Load leave data for this employee first
    try {
      await loadLeaves();
      await loadLeaveBalance(employee.id); // Pass the employee ID directly
      
      // Only clear search states after data is successfully loaded
      // Add a small delay to ensure smooth transition
      setTimeout(() => {
        setSearchTerm('');
        setSearchResults([]);
      }, 100);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load leave data');
    }
  };


  // Load data
  useEffect(() => {
    loadLeaveTypes();
  }, [loadLeaveTypes]);

  // Auto-select employee from global context when component mounts or global employee changes
  useEffect(() => {
    if (globalSelectedEmployee) {
      // Update local states if global employee is different from current selection
      if (!selectedEmployee || selectedEmployee !== globalSelectedEmployee.id) {
        setSelectedEmployee(globalSelectedEmployee.id);
        setSelectedEmployeeData(globalSelectedEmployee);
        // Clear search states when employee is selected from global context
        setSearchTerm('');
        setSearchResults([]);
      }
    }
  }, [globalSelectedEmployee, selectedEmployee]);

  // Load data when dependencies change - using EmployeePage pattern
  useEffect(() => {
    // Only load if we have a search term or selected employee
    if (searchTerm || selectedEmployee || globalSelectedEmployee?.id) {
      loadLeaves();
    }
  }, [searchTerm, selectedEmployee, globalSelectedEmployee?.id, loadLeaves]);

  // Load leave balance when employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      loadLeaveBalance();
    }
  }, [selectedEmployee, loadLeaveBalance]);

  // Helper functions for leave categorization
  const getLeaveTypeCategory = (leaveTypeCode: string): LeaveCategory => {
    switch (leaveTypeCode.toUpperCase()) {
      case 'VAC':
      case 'UNPAID':
        return 'vacation';
      case 'SICK':
      case 'UNPAIDSICK':
        return 'sick';
      default:
        return 'others';
    }
  };

  const getLeaveTypeById = (id: number) => {
    return leaveTypes.find(lt => lt.id === id);
  };

  // Helper function to identify unpaid leave types
  const isUnpaidLeaveType = (leaveTypeCode: string): boolean => {
    const code = leaveTypeCode.toUpperCase();
    return code === 'UNPAIDSICK' || code === 'UNPAID';
  };

  // Helper function to calculate anniversary period for a given calendar year
  // Returns the anniversary period that is ACTIVE during the selected calendar year
  const getAnniversaryPeriodForYear = (year: number): { start: Date, end: Date } | null => {
    if (!leaveBalance) return null;
    
    // Get the hire/seniority date to determine anniversary
    const seniorityDate = leaveBalance.seniority_start_date || leaveBalance.hire_date;
    if (!seniorityDate) return null;
    
    const hireDate = new Date(seniorityDate);
    const anniversaryMonth = hireDate.getMonth();
    const anniversaryDay = hireDate.getDate();
    
    // Two possible anniversary periods could overlap with the calendar year:
    // 1. Period starting in previous year (e.g., July 2025 - July 2026 for calendar year 2026)
    // 2. Period starting in current year (e.g., July 2026 - July 2027 for calendar year 2026)
    
    // Period starting in previous year
    let prevStart: Date, prevEnd: Date;
    try {
      prevStart = new Date(year - 1, anniversaryMonth, anniversaryDay);
      prevEnd = new Date(year, anniversaryMonth, anniversaryDay - 1, 23, 59, 59);
    } catch (e) {
      prevStart = new Date(year - 1, anniversaryMonth, Math.min(anniversaryDay, 28));
      prevEnd = new Date(year, anniversaryMonth, Math.min(anniversaryDay, 28) - 1, 23, 59, 59);
    }
    
    // Period starting in current year
    let currStart: Date, currEnd: Date;
    try {
      currStart = new Date(year, anniversaryMonth, anniversaryDay);
      currEnd = new Date(year + 1, anniversaryMonth, anniversaryDay - 1, 23, 59, 59);
    } catch (e) {
      currStart = new Date(year, anniversaryMonth, Math.min(anniversaryDay, 28));
      currEnd = new Date(year + 1, anniversaryMonth, Math.min(anniversaryDay, 28) - 1, 23, 59, 59);
    }
    
    // Calculate overlap with calendar year for both periods
    const calendarStart = new Date(year, 0, 1);
    const calendarEnd = new Date(year, 11, 31, 23, 59, 59);
    
    // Calculate days of overlap for previous period
    const prevOverlapStart = prevStart > calendarStart ? prevStart : calendarStart;
    const prevOverlapEnd = prevEnd < calendarEnd ? prevEnd : calendarEnd;
    const prevOverlapDays = prevOverlapEnd >= prevOverlapStart
      ? (prevOverlapEnd.getTime() - prevOverlapStart.getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    
    // Calculate days of overlap for current period
    const currOverlapStart = currStart > calendarStart ? currStart : calendarStart;
    const currOverlapEnd = currEnd < calendarEnd ? currEnd : calendarEnd;
    const currOverlapDays = currOverlapEnd >= currOverlapStart
      ? (currOverlapEnd.getTime() - currOverlapStart.getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    
    // Return the period with more overlap
    if (prevOverlapDays >= currOverlapDays) {
      return { start: prevStart, end: prevEnd };
    } else {
      return { start: currStart, end: currEnd };
    }
  };

  // Helper function to check if a leave falls within the selected year
  const isLeaveInSelectedYear = (leave: Leave, year: number, category: LeaveCategory): boolean => {
    const leaveStartDate = new Date(leave.start_date);
    const leaveEndDate = new Date(leave.end_date);
    
    // For sick leave and others: use calendar year
    if (category === 'sick' || category === 'others') {
      const yearStart = new Date(year, 0, 1); // Jan 1
      const yearEnd = new Date(year, 11, 31, 23, 59, 59); // Dec 31
      
      // Check if leave overlaps with the year
      return leaveStartDate <= yearEnd && leaveEndDate >= yearStart;
    }
    
    // For vacation: ALWAYS use anniversary period (not calendar year)
    if (category === 'vacation') {
      const anniversaryPeriod = getAnniversaryPeriodForYear(year);
      
      if (anniversaryPeriod) {
        // Check if leave overlaps with anniversary period
        return leaveStartDate <= anniversaryPeriod.end && leaveEndDate >= anniversaryPeriod.start;
      }
      
      // Fallback to calendar year only if we can't determine anniversary
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59);
      return leaveStartDate <= yearEnd && leaveEndDate >= yearStart;
    }
    
    // Default: calendar year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);
    return leaveStartDate <= yearEnd && leaveEndDate >= yearStart;
  };

  // Helper function for table display - uses hybrid approach for vacation
  const isLeaveInTableForYear = (leave: Leave, year: number, category: LeaveCategory): boolean => {
    const leaveStartDate = new Date(leave.start_date);
    const leaveEndDate = new Date(leave.end_date);
    
    // For sick leave and others: use calendar year only
    if (category === 'sick' || category === 'others') {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59);
      return leaveStartDate <= yearEnd && leaveEndDate >= yearStart;
    }
    
    // For vacation: HYBRID - show in both anniversary period AND calendar year
    if (category === 'vacation') {
      const anniversaryPeriod = getAnniversaryPeriodForYear(year);
      
      if (anniversaryPeriod) {
        // Check if leave overlaps with anniversary period
        const inAnniversaryPeriod = leaveStartDate <= anniversaryPeriod.end && leaveEndDate >= anniversaryPeriod.start;
        
        // Also check if leave overlaps with calendar year
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31, 23, 59, 59);
        const inCalendarYear = leaveStartDate <= yearEnd && leaveEndDate >= yearStart;
        
        // Show if in EITHER period
        return inAnniversaryPeriod || inCalendarYear;
      }
      
      // Fallback to calendar year
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59);
      return leaveStartDate <= yearEnd && leaveEndDate >= yearStart;
    }
    
    // Default: calendar year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);
    return leaveStartDate <= yearEnd && leaveEndDate >= yearStart;
  };

  // Filter leaves based on selected category and year (for table display)
  const filteredLeaves = leaves.filter(leave => {
    // Filter by category
    if (selectedCategory !== 'all') {
      const leaveType = getLeaveTypeById(leave.leave_type_id);
      if (!leaveType) return false;
      
      const category = getLeaveTypeCategory(leaveType.code);
      if (category !== selectedCategory) return false;
    }
    
    // Filter by year - use hybrid approach for table display
    const leaveType = getLeaveTypeById(leave.leave_type_id);
    if (!leaveType) return false;
    const category = getLeaveTypeCategory(leaveType.code);
    
    return isLeaveInTableForYear(leave, selectedYear, category);
  });

  // Calculate vacation stats for a specific anniversary period
  const getVacationStatsForPeriod = (periodStart: Date, periodEnd: Date) => {
    if (!leaveBalance || !selectedEmployee) return null;

    const vacationLeaves = leaves.filter(leave => {
      const leaveType = getLeaveTypeById(leave.leave_type_id);
      if (!leaveType) return false;
      return getLeaveTypeCategory(leaveType.code) === 'vacation';
    });

    const activeLeaves = vacationLeaves.filter(leave => leave.status === 'Active');
    
    // Filter by specific anniversary period
    const periodFilteredLeaves = activeLeaves.filter(leave => {
      const leaveStartDate = new Date(leave.start_date);
      const leaveEndDate = new Date(leave.end_date);
      return leaveStartDate <= periodEnd && leaveEndDate >= periodStart;
    });
    
    // Separate paid and unpaid leaves
    const taken = periodFilteredLeaves
      .filter(leave => {
        const leaveType = getLeaveTypeById(leave.leave_type_id);
        if (!leaveType) return false;
        return !isUnpaidLeaveType(leaveType.code);
      })
      .reduce((sum, leave) => sum + leave.days_requested, 0);
    
    const unpaid = periodFilteredLeaves
      .filter(leave => {
        const leaveType = getLeaveTypeById(leave.leave_type_id);
        if (!leaveType) return false;
        return isUnpaidLeaveType(leaveType.code);
      })
      .reduce((sum, leave) => sum + leave.days_requested, 0);

    // For vacation, always use entitlement from API and calculate balance
    const balance = Math.max(0, leaveBalance.vacation_entitlement - taken);
    
    return {
      entitlement: leaveBalance.vacation_entitlement,
      taken,
      unpaid,
      balance,
      color: 'primary',
      periodStart,
      periodEnd
    };
  };

  // Calculate sick leave stats (unchanged)
  const getSickLeaveStats = () => {
    if (!leaveBalance || !selectedEmployee) return null;

    const sickLeaves = leaves.filter(leave => {
      const leaveType = getLeaveTypeById(leave.leave_type_id);
      if (!leaveType) return false;
      return getLeaveTypeCategory(leaveType.code) === 'sick';
    });

    const activeLeaves = sickLeaves.filter(leave => leave.status === 'Active');
    
    // Filter by calendar year
    const yearFilteredLeaves = activeLeaves.filter(leave => 
      isLeaveInSelectedYear(leave, selectedYear, 'sick')
    );
    
    const taken = yearFilteredLeaves
      .filter(leave => {
        const leaveType = getLeaveTypeById(leave.leave_type_id);
        if (!leaveType) return false;
        return !isUnpaidLeaveType(leaveType.code);
      })
      .reduce((sum, leave) => sum + leave.days_requested, 0);
    
    const unpaid = yearFilteredLeaves
      .filter(leave => {
        const leaveType = getLeaveTypeById(leave.leave_type_id);
        if (!leaveType) return false;
        return isUnpaidLeaveType(leaveType.code);
      })
      .reduce((sum, leave) => sum + leave.days_requested, 0);

    const currentYear = new Date().getFullYear();
    const isCurrentYear = selectedYear === currentYear;
    const sickBalance = isCurrentYear 
      ? leaveBalance.sick_remaining 
      : Math.max(0, leaveBalance.sick_entitlement - taken);
      
    return {
      entitlement: leaveBalance.sick_entitlement,
      taken,
      unpaid,
      balance: sickBalance,
      color: 'secondary'
    };
  };

  // Calculate days between dates (old method - kept as fallback)
  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Calculate working days using API (excludes weekends and holidays)
  const calculateWorkingDays = async (startDate: string, endDate: string, employeeId?: string) => {
    const empId = employeeId || selectedEmployee;
    if (!empId || !startDate || !endDate) {
      return 0;
    }
    
    try {
      const response = await leaveAPI.calculateDays(empId, startDate, endDate);
      return response.data.days || 0;
    } catch (err: any) {
      console.error('Error calculating working days:', err);
      // Fallback to simple calculation if API fails
      return calculateDays(startDate, endDate);
    }
  };

  // Format date to avoid timezone issues
  const formatDate = (dateString: string) => {
    // If the date string is in YYYY-MM-DD format, use it directly
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString();
    }
    // Otherwise, parse as date and format
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Handle form changes
  const handleFormChange = (field: keyof LeaveFormData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    
    // Auto-calculate days when dates change
    // Use employee from selectedLeave if editing, otherwise use selectedEmployee
    const employeeId = selectedLeave?.employee_id || selectedEmployee;
    if ((field === 'start_date' || field === 'end_date') && employeeId) {
      const startDate = field === 'start_date' ? value : updatedData.start_date;
      const endDate = field === 'end_date' ? value : updatedData.end_date;
      
      if (startDate && endDate && startDate <= endDate) {
        // Use API to calculate working days (excludes weekends and holidays)
        calculateWorkingDays(startDate, endDate, employeeId).then(days => {
          setFormData(prev => {
            // Only update if dates haven't changed since calculation started
            if (prev.start_date === startDate && prev.end_date === endDate) {
              return { ...prev, days_requested: days };
            }
            return prev;
          });
        }).catch(err => {
          console.error('Failed to calculate working days:', err);
          // Fallback to simple calculation
          const fallbackDays = calculateDays(startDate, endDate);
          setFormData(prev => ({ ...prev, days_requested: fallbackDays }));
        });
      }
    }
  };

  // Handle add leave
  const handleAddLeave = async () => {
    if (!selectedEmployee) return;
    
    try {
      setLoading(true);
      await apiClient.post('/leaves', {
        employee_id: selectedEmployee,
        ...formData,
      });
      
      setSuccess('Leave request created successfully');
      setAddDialogOpen(false);
      resetForm();
      loadLeaves();
      loadLeaveBalance();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create leave request');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit leave
  const handleEditLeave = async () => {
    if (!selectedLeave) return;
    
    try {
      setLoading(true);
      await apiClient.put(`/leaves/${selectedLeave.id}`, formData);
      
      setSuccess('Leave request updated successfully');
      setEditDialogOpen(false);
      resetForm();
      loadLeaves();
      loadLeaveBalance();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update leave request');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete leave
  const handleDeleteLeave = async () => {
    if (!selectedLeave) return;
    
    try {
      setLoading(true);
      await apiClient.delete(`/leaves/${selectedLeave.id}`);
      
      setSuccess('Leave request deleted successfully');
      setDeleteDialogOpen(false);
      loadLeaves();
      loadLeaveBalance();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete leave request');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      leave_type_id: leaveTypes.length > 0 ? leaveTypes[0].id : 0,
      start_date: '',
      end_date: '',
      days_requested: 0,
      reason: '',
      status: 'Active',
    });
    setSelectedLeave(null);
  };

  // Open edit dialog
  const openEditDialog = (leave: Leave) => {
    setSelectedLeave(leave);
    setFormData({
      leave_type_id: leave.leave_type_id,
      start_date: leave.start_date,
      end_date: leave.end_date,
      days_requested: leave.days_requested,
      reason: leave.reason || '',
      status: leave.status,
    });
    setEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (leave: Leave) => {
    setSelectedLeave(leave);
    setDeleteDialogOpen(true);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircle />;
      case 'cancelled':
        return <Cancel />;
      case 'pending':
        return <Warning />;
      default:
        return <Info />;
    }
  };

  // Upload functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewData(null);
      setUploadResult(null);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await apiClient.get('/leaves/upload/template', {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'leave_upload_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to download template');
    }
  };

  const previewUpload = async () => {
    if (!selectedFile) return;
    
    try {
      setPreviewLoading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await apiClient.post('/leaves/upload/preview', formData);
      
      setPreviewData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to preview file');
    } finally {
      setPreviewLoading(false);
    }
  };

  const executeUpload = async () => {
    if (!selectedFile || !previewData) return;
    
    try {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await apiClient.post('/leaves/upload', formData);
      
      setUploadResult(response.data);
      
      // Reload leave data if successful
      if (response.data.success_count > 0) {
        loadLeaves();
        loadLeaveBalance();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploadLoading(false);
    }
  };

  const resetUploadDialog = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setUploadResult(null);
    setUploadDialogOpen(false);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
      <Typography variant="h4" gutterBottom>
        Leave Dashboard
      </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
            size="large"
          >
            Upload
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddDialogOpen(true)}
            size="large"
          >
            Add Leave
          </Button>
        </Box>
      </Box>
      
      {/* Company Filter Indicator */}
      {isFilterActive && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Company Filter Active:</strong> Showing leave data for {getCompanyName()} only.
          </Typography>
        </Alert>
      )}
      
      {/* Search and Filter Controls - copied from EmployeePage */}
      <Paper 
        sx={{ 
          p: 3, 
          mb: 3, 
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="Search employees"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ 
              minWidth: 250,
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.paper',
              }
            }}
            placeholder="Search by name, ID, email..."
          />
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            disabled={loading}
            sx={{
              px: 3,
              py: 1.5,
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2,
            }}
          >
            Search
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setSearchTerm('');
              loadLeaves();
            }}
            disabled={loading}
            sx={{
              px: 3,
              py: 1.5,
              fontWeight: 500,
              textTransform: 'none',
              borderRadius: 2,
            }}
          >
            Clear
          </Button>
        </Box>
      </Paper>

      {/* Employee Cards - copied from EmployeePage */}
      <Box sx={{ mt: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography>Loading employees...</Typography>
          </Box>
        ) : searchTerm && searchResults.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No employees found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Try adjusting your search criteria.
            </Typography>
          </Paper>
        ) : searchResults.length > 0 ? (
          <Grid container spacing={3}>
            {searchResults.map((employee) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={employee.id}>
                <Fade in={true} timeout={300}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      border: (globalSelectedEmployee?.id === employee.id) ? `2px solid ${theme.palette.primary.main}` : '1px solid',
                      borderColor: (globalSelectedEmployee?.id === employee.id) ? theme.palette.primary.main : 'divider',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: theme.shadows[3],
                        borderColor: theme.palette.primary.main,
                      },
                    }}
                    onClick={() => handleSearchResultClick(employee)}
                  >
                    <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                      {/* Header with Avatar */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            sx={{
                              bgcolor: theme.palette.primary.main,
                              width: 48,
                              height: 48,
                              fontSize: '1.2rem',
                              fontWeight: 'bold',
                            }}
                          >
                            {employee.first_name?.[0]}{employee.last_name?.[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="h6" component="div" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                              {employee.full_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ID: {employee.id}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={employee.status}
                            color="primary"
                            size="small"
                            sx={{ fontWeight: 500 }}
                          />
                        </Box>
                      </Box>

                      {/* Contact Information */}
                      <Box sx={{ mb: 2 }}>
                        {employee.email && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                              {employee.email}
                            </Typography>
                          </Box>
                        )}
                        {employee.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                              {employee.phone}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>
        ) : null}
      </Box>

      {selectedEmployeeData ? (
        <>
          {/* Employee Info Header */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <Person />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {selectedEmployeeData.full_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ID: {selectedEmployeeData.id} • 
                      {selectedEmployeeData.status}
                      {leaveBalance && ` • ${leaveBalance.years_employed.toFixed(1)} years employed`}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Year Selector */}
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={selectedYear}
                    label="Year"
                    onChange={(e) => setSelectedYear(e.target.value as number)}
                  >
                    {(() => {
                      const currentYear = new Date().getFullYear();
                      const years = [];
                      for (let year = currentYear - 2; year <= currentYear + 1; year++) {
                        years.push(
                          <MenuItem key={year} value={year}>
                            {year}
                          </MenuItem>
                        );
                      }
                      return years;
                    })()}
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>

          {/* Leave Categories Tabs */}
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={selectedCategory}
              onChange={(_, newValue) => setSelectedCategory(newValue)}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab
                label="All Leave"
                value="all"
                icon={<Event />}
                iconPosition="start"
              />
              <Tab
                label="Vacation"
                value="vacation"
                icon={<BeachAccess />}
                iconPosition="start"
              />
              <Tab
                label="Sick Leave"
                value="sick"
                icon={<LocalHospital />}
                iconPosition="start"
              />
            </Tabs>
          </Paper>

          {/* Category Statistics Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {(() => {
              if (!leaveBalance) return null;
              
              // Calculate anniversary periods
              const seniorityDate = leaveBalance.seniority_start_date || leaveBalance.hire_date;
              if (!seniorityDate) return null;
              
              const hireDate = new Date(seniorityDate);
              const anniversaryMonth = hireDate.getMonth();
              const anniversaryDay = hireDate.getDate();
              
              // Previous period: (selectedYear-1) anniversary to selectedYear anniversary
              let prevStart: Date, prevEnd: Date;
              try {
                prevStart = new Date(selectedYear - 1, anniversaryMonth, anniversaryDay);
                prevEnd = new Date(selectedYear, anniversaryMonth, anniversaryDay - 1, 23, 59, 59);
              } catch (e) {
                prevStart = new Date(selectedYear - 1, anniversaryMonth, Math.min(anniversaryDay, 28));
                prevEnd = new Date(selectedYear, anniversaryMonth, Math.min(anniversaryDay, 28) - 1, 23, 59, 59);
              }
              
              // Current period: selectedYear anniversary to (selectedYear+1) anniversary  
              let currStart: Date, currEnd: Date;
              try {
                currStart = new Date(selectedYear, anniversaryMonth, anniversaryDay);
                currEnd = new Date(selectedYear + 1, anniversaryMonth, anniversaryDay - 1, 23, 59, 59);
              } catch (e) {
                currStart = new Date(selectedYear, anniversaryMonth, Math.min(anniversaryDay, 28));
                currEnd = new Date(selectedYear + 1, anniversaryMonth, Math.min(anniversaryDay, 28) - 1, 23, 59, 59);
              }
              
              const prevPeriodStats = getVacationStatsForPeriod(prevStart, prevEnd);
              const currPeriodStats = getVacationStatsForPeriod(currStart, currEnd);
              const sickStats = getSickLeaveStats();
              
              const vacationCards = [
                { stats: prevPeriodStats, title: `Vacation ${selectedYear - 1}-${selectedYear}`, key: 'vacation-prev' },
                { stats: currPeriodStats, title: `Vacation ${selectedYear}-${selectedYear + 1}`, key: 'vacation-curr' }
              ];
              
              return (
                <>
                  {/* Two Vacation Cards */}
                  {vacationCards.map(({ stats, title, key }) => {
                    if (!stats) return null;
                    
                    return (
                      <Grid item xs={12} md={4} key={key}>
                        <Card 
                          sx={{ 
                            height: '100%',
                            cursor: 'pointer',
                            border: selectedCategory === 'vacation' ? 2 : 1,
                            borderColor: selectedCategory === 'vacation' ? 'primary.main' : 'divider',
                            '&:hover': { boxShadow: 3 }
                          }}
                          onClick={() => setSelectedCategory('vacation')}
                        >
                          <CardHeader
                            avatar={
                              <Avatar sx={{ bgcolor: 'primary.main' }}>
                                <BeachAccess />
                              </Avatar>
                            }
                            title={title}
                            action={
                              selectedCategory === 'vacation' && (
                                <Chip label="Selected" color="primary" size="small" />
                              )
                            }
                          />
                          <CardContent>
                            <Box>
                              <Grid container spacing={2} textAlign="center">
                                <Grid item xs={4}>
                                  <Typography variant="h6" color="text.secondary">
                                    {stats.entitlement.toFixed(1)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Entitlement
                                  </Typography>
                                </Grid>
                                <Grid item xs={4}>
                                  <Typography variant="h6" color="warning.main">
                                    {stats.taken.toFixed(1)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Taken
                                  </Typography>
                                </Grid>
                                <Grid item xs={4}>
                                  <Typography variant="h6" color="primary.main">
                                    {stats.balance.toFixed(1)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Balance
                                  </Typography>
                                </Grid>
                              </Grid>
                              {stats.entitlement > 0 && (
                                <Box sx={{ mt: 2 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={(stats.taken / stats.entitlement) * 100}
                                    color="primary"
                                    sx={{ height: 8, borderRadius: 4 }}
                                  />
                                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    {((stats.taken / stats.entitlement) * 100).toFixed(1)}% used
                                  </Typography>
                                </Box>
                              )}
                              <Typography variant="caption" color="text.secondary" sx={{ mt: stats.entitlement > 0 ? 0.5 : 2, display: 'block' }}>
                                Unpaid: {stats.unpaid?.toFixed(1) || '0.0'} days
                              </Typography>
                              <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                                  Anniversary Period:
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  {stats.periodStart.toLocaleDateString()} - {stats.periodEnd.toLocaleDateString()}
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                  
                  {/* Sick Leave Card */}
                  {sickStats && (
                    <Grid item xs={12} md={4} key="sick">
                      <Card 
                        sx={{ 
                          height: '100%',
                          cursor: 'pointer',
                          border: selectedCategory === 'sick' ? 2 : 1,
                          borderColor: selectedCategory === 'sick' ? 'secondary.main' : 'divider',
                          '&:hover': { boxShadow: 3 }
                        }}
                        onClick={() => setSelectedCategory('sick')}
                      >
                        <CardHeader
                          avatar={
                            <Avatar sx={{ bgcolor: 'secondary.main' }}>
                              <LocalHospital />
                            </Avatar>
                          }
                          title="Sick Leave"
                          action={
                            selectedCategory === 'sick' && (
                              <Chip label="Selected" color="secondary" size="small" />
                            )
                          }
                        />
                        <CardContent>
                          <Box>
                            <Grid container spacing={2} textAlign="center">
                              <Grid item xs={4}>
                                <Typography variant="h6" color="text.secondary">
                                  {sickStats.entitlement.toFixed(1)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Entitlement
                                </Typography>
                              </Grid>
                              <Grid item xs={4}>
                                <Typography variant="h6" color="warning.main">
                                  {sickStats.taken.toFixed(1)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Taken
                                </Typography>
                              </Grid>
                              <Grid item xs={4}>
                                <Typography variant="h6" color="secondary.main">
                                  {sickStats.balance.toFixed(1)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Balance
                                </Typography>
                              </Grid>
                            </Grid>
                            {sickStats.entitlement > 0 && (
                              <Box sx={{ mt: 2 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={(sickStats.taken / sickStats.entitlement) * 100}
                                  color="secondary"
                                  sx={{ height: 8, borderRadius: 4 }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                  {((sickStats.taken / sickStats.entitlement) * 100).toFixed(1)}% used
                                </Typography>
                              </Box>
                            )}
                            <Typography variant="caption" color="text.secondary" sx={{ mt: sickStats.entitlement > 0 ? 0.5 : 2, display: 'block' }}>
                              Unpaid: {sickStats.unpaid?.toFixed(1) || '0.0'} days
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </>
              );
            })()}
          </Grid>

          {/* Leave History */}
      <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Leave History
                {selectedCategory !== 'all' && (
                  <Chip 
                    label={`${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Only`} 
                    size="small" 
                    sx={{ ml: 2 }} 
                  />
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {filteredLeaves.length} record{filteredLeaves.length !== 1 ? 's' : ''} found
              </Typography>
            </Box>

            {filteredLeaves.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Event sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  No leave records found for this category
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Leave Type</TableCell>
                      <TableCell>Dates</TableCell>
                      <TableCell>Days</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLeaves.map((leave) => {
                      const leaveType = getLeaveTypeById(leave.leave_type_id);
                      return (
                        <TableRow key={leave.id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {leaveType && (
                                <Chip
                                  label={leaveType.code}
                                  size="small"
                                  color={getLeaveTypeCategory(leaveType.code) === 'vacation' ? 'primary' : 
                                         getLeaveTypeCategory(leaveType.code) === 'sick' ? 'secondary' : 'default'}
                                />
                              )}
                              <Typography variant="body2">
                                {leaveType?.name || 'Unknown'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {leave.days_requested}
        </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(leave.status)}
                              label={leave.status}
                              color={getStatusColor(leave.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap maxWidth={200}>
                              {leave.reason || '-'}
          </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1}>
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  onClick={() => openEditDialog(leave)}
                                >
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => openDeleteDialog(leave)}
                                >
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
        )}
      </Paper>
        </>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Event sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Select an Employee
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use the search field above to find and select an employee to view their leave information.
          </Typography>
        </Paper>
      )}

      {/* Add Leave Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Leave Request</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Leave Type</InputLabel>
                <Select
                  value={formData.leave_type_id}
                  onChange={(e) => handleFormChange('leave_type_id', e.target.value)}
                >
                  {leaveTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name} ({type.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Status"
                value={formData.status}
                onChange={(e) => handleFormChange('status', e.target.value)}
                select
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleFormChange('start_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleFormChange('end_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Days"
                type="number"
                value={formData.days_requested}
                onChange={(e) => handleFormChange('days_requested', parseFloat(e.target.value) || 0)}
                inputProps={{ min: 0, step: 0.5 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reason/Note"
                multiline
                rows={3}
                value={formData.reason}
                onChange={(e) => handleFormChange('reason', e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddLeave}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Add Leave'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Leave Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Leave Request</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Leave Type</InputLabel>
                <Select
                  value={formData.leave_type_id}
                  onChange={(e) => handleFormChange('leave_type_id', e.target.value)}
                >
                  {leaveTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name} ({type.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Status"
                value={formData.status}
                onChange={(e) => handleFormChange('status', e.target.value)}
                select
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleFormChange('start_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleFormChange('end_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Days"
                type="number"
                value={formData.days_requested}
                onChange={(e) => handleFormChange('days_requested', parseFloat(e.target.value) || 0)}
                inputProps={{ min: 0, step: 0.5 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reason/Note"
                multiline
                rows={3}
                value={formData.reason}
                onChange={(e) => handleFormChange('reason', e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleEditLeave}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Update Leave'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Leave Request</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this leave request? This action cannot be undone.
          </Typography>
          {selectedLeave && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Leave ID:</strong> {selectedLeave.id}
              </Typography>
              <Typography variant="body2">
                <strong>Dates:</strong> {formatDate(selectedLeave.start_date)} - {formatDate(selectedLeave.end_date)}
              </Typography>
              <Typography variant="body2">
                <strong>Days:</strong> {selectedLeave.days_requested}
              </Typography>
              <Typography variant="body2">
                <strong>Status:</strong> {selectedLeave.status}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteLeave}
            color="error"
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={resetUploadDialog} maxWidth="lg" fullWidth>
        <DialogTitle>Upload Leave Data</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* File Selection */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Select Excel File
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    disabled={uploadLoading || previewLoading}
                  >
                    Choose File
                  </Button>
                </label>
                {selectedFile && (
                  <Typography variant="body2" color="text.secondary">
                    {selectedFile.name}
                  </Typography>
                )}
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={downloadTemplate}
                  disabled={uploadLoading || previewLoading}
                >
                  Download Template
                </Button>
              </Box>
            </Box>

            {/* Preview Section */}
            {selectedFile && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<PreviewIcon />}
                    onClick={previewUpload}
                    disabled={!selectedFile || previewLoading || uploadLoading}
                  >
                    {previewLoading ? <CircularProgress size={20} /> : 'Preview'}
                  </Button>
                  {previewData && (
                    <Typography variant="body2" color="text.secondary">
                      {previewData.valid_rows} valid, {previewData.invalid_rows} invalid, {previewData.duplicate_rows} duplicates
                    </Typography>
                  )}
                </Box>

                {/* Preview Results */}
                {previewData && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Preview Results
                    </Typography>
                    <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                      <Table stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Row</TableCell>
                            <TableCell>Employee ID</TableCell>
                            <TableCell>Leave Type</TableCell>
                            <TableCell>Start Date</TableCell>
                            <TableCell>End Date</TableCell>
                            <TableCell>Days</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Will Import</TableCell>
                            <TableCell>Error</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {previewData.rows.map((row) => (
                            <TableRow key={row.row_number}>
                              <TableCell>{row.row_number}</TableCell>
                              <TableCell>{row.employee_id}</TableCell>
                              <TableCell>{row.leave_type_id}</TableCell>
                              <TableCell>{row.start_date}</TableCell>
                              <TableCell>{row.end_date}</TableCell>
                              <TableCell>{row.days}</TableCell>
                              <TableCell>{row.status}</TableCell>
                              <TableCell>
                                <Chip
                                  label={row.will_import ? 'Yes' : 'No'}
                                  color={row.will_import ? 'success' : 'error'}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                {row.error_message && (
                                  <Typography variant="caption" color="error">
                                    {row.error_message}
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </Box>
            )}

            {/* Upload Results */}
            {uploadResult && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Upload Results
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <Card sx={{ textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                      <CardContent>
                        <Typography variant="h4">{uploadResult.success_count}</Typography>
                        <Typography variant="body2">Successfully Imported</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card sx={{ textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                      <CardContent>
                        <Typography variant="h4">{uploadResult.skipped_count}</Typography>
                        <Typography variant="body2">Skipped</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card sx={{ textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
                      <CardContent>
                        <Typography variant="h4">{uploadResult.error_count}</Typography>
                        <Typography variant="body2">Errors</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Error Details */}
                {uploadResult.errors.length > 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Error Details
                    </Typography>
                    <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Row</TableCell>
                            <TableCell>Error Message</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {uploadResult.errors.map((error, index) => (
                            <TableRow key={index}>
                              <TableCell>{error.row_number}</TableCell>
                              <TableCell>
                                <Typography variant="caption" color="error">
                                  {error.error_message}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetUploadDialog}>
            {uploadResult ? 'Close' : 'Cancel'}
          </Button>
          {previewData && !uploadResult && (
            <Button
              onClick={executeUpload}
              variant="contained"
              disabled={uploadLoading || previewData.valid_rows === 0}
            >
              {uploadLoading ? <CircularProgress size={20} /> : 'Import'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbars */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        message={error}
      />
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        message={success}
      />
    </Box>
  );
};

export default LeavePage;
