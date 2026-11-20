import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Building2,
  CalendarDays,
  HeartPulse,
  Loader2,
  Mail,
  Palmtree,
  Phone,
  Plus,
  Search as SearchIcon,
  Upload as UploadIcon,
  X,
} from 'lucide-react';
import { useCompanyFilter } from '../hooks/useCompanyFilter';
import { useSelectedEmployee } from '../contexts/SelectedEmployeeContext';
import { apiClient, leaveAPI, leavePayrollAPI, companyAPI } from '../api/client';
import StatusBadge from '../components/employee/StatusBadge';
import { getInitials } from '../components/employee/employeeTypes';
import LeaveEntitlementCard from '../components/leave/LeaveEntitlementCard';
import LeaveFormDialog from '../components/leave/LeaveFormDialog';
import LeaveHistoryCard from '../components/leave/LeaveHistoryCard';
import AppToast from '../components/AppToast';
import LeaveUploadDialog from '../components/leave/LeaveUploadDialog';
import {
  OpeningBalanceDialog,
  PayrollImportDialog,
} from '../components/leave/LeavePayrollDialogs';
import type {
  Employee,
  Leave,
  LeaveBalance,
  LeaveCategory,
  LeaveFormData,
  LeaveStats,
  LeaveType,
  LeaveUploadPreviewResponse,
  LeaveUploadResponse,
} from '../components/leave/leaveTypes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
const LeavePage: React.FC = () => {
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
  // Keep Days as a string while typing so values like "0.5" are not eaten by parseFloat || 0
  const [daysInput, setDaysInput] = useState('0');
  const daysManuallySetRef = useRef(false);
  
  // Upload states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<LeaveUploadPreviewResponse | null>(null);
  const [uploadResult, setUploadResult] = useState<LeaveUploadResponse | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Payroll detail import (deferred vacation companies)
  const [payrollImportOpen, setPayrollImportOpen] = useState(false);
  const [payrollFile, setPayrollFile] = useState<File | null>(null);
  const [payrollPreview, setPayrollPreview] = useState<any>(null);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [openingDialogOpen, setOpeningDialogOpen] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [openingYear, setOpeningYear] = useState(new Date().getFullYear());
  const [deferredCompany, setDeferredCompany] = useState(false);
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

  useEffect(() => {
    const checkDeferred = async () => {
      if (!selectedCompanyId) {
        setDeferredCompany(false);
        return;
      }
      try {
        const res = await companyAPI.get(selectedCompanyId);
        setDeferredCompany(res.data?.vacation_pay_with_payroll === false);
      } catch {
        setDeferredCompany(false);
      }
    };
    checkDeferred();
  }, [selectedCompanyId]);

  const previewPayrollImport = async () => {
    if (!payrollFile || !selectedCompanyId) return;
    try {
      setPayrollLoading(true);
      setError(null);
      const res = await leavePayrollAPI.previewPayrollImport(selectedCompanyId, payrollFile);
      setPayrollPreview(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to preview payroll file');
      setPayrollPreview(null);
    } finally {
      setPayrollLoading(false);
    }
  };

  const commitPayrollImport = async () => {
    if (!payrollFile || !selectedCompanyId) return;
    try {
      setPayrollLoading(true);
      const res = await leavePayrollAPI.commitPayrollImport(selectedCompanyId, payrollFile);
      const imported = res.data.data?.imported || 0;
      const skipped = res.data.data?.skipped || 0;
      setSuccess(
        skipped > 0
          ? `Imported ${imported} matched payroll row(s); skipped ${skipped} unmatched/ambiguous. Re-upload after fixing names.`
          : `Imported ${imported} payroll detail rows`
      );
      setPayrollImportOpen(false);
      setPayrollFile(null);
      setPayrollPreview(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to import payroll file');
    } finally {
      setPayrollLoading(false);
    }
  };

  const loadOpeningBalance = async (
    employeeId?: string,
    companyId?: string,
    year?: number,
  ) => {
    const empId = employeeId || selectedEmployee;
    const coId = companyId || selectedCompanyId;
    const yr = year ?? openingYear;
    if (!empId || !coId) {
      setOpeningAmount('');
      return;
    }
    try {
      const res = await leavePayrollAPI.listOpenings({
        employee_id: empId,
        company_id: coId,
        year: yr,
      });
      const rows = res.data?.data || [];
      if (rows.length > 0) {
        setOpeningAmount(String(rows[0].opening_amount ?? ''));
      } else {
        setOpeningAmount('');
      }
    } catch {
      setOpeningAmount('');
    }
  };

  const openOpeningDialog = async () => {
    setOpeningYear(selectedYear || new Date().getFullYear());
    await loadOpeningBalance(
      selectedEmployee,
      selectedCompanyId || undefined,
      selectedYear || new Date().getFullYear(),
    );
    setOpeningDialogOpen(true);
  };

  const saveOpeningBalance = async () => {
    if (!selectedEmployee || !selectedCompanyId) {
      setError('Select an employee and company filter first');
      return;
    }
    try {
      await leavePayrollAPI.upsertOpening({
        employee_id: selectedEmployee,
        company_id: selectedCompanyId,
        year: openingYear,
        opening_amount: Number(openingAmount) || 0,
      });
      setSuccess(`Vacation opening balance saved: $${Number(openingAmount) || 0} for ${openingYear}`);
      setOpeningDialogOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save opening balance');
    }
  };

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
  const setDaysRequested = (days: number, markManual = false) => {
    if (markManual) {
      daysManuallySetRef.current = true;
    }
    setFormData(prev => ({ ...prev, days_requested: days }));
    setDaysInput(Number.isFinite(days) ? String(days) : '');
  };

  const handleDaysInputChange = (raw: string) => {
    // Allow digits and a single decimal point while typing (e.g. "0.", "0.5")
    if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) {
      return;
    }
    daysManuallySetRef.current = true;
    setDaysInput(raw);
    if (raw.trim() === '' || raw === '.') {
      setFormData(prev => ({ ...prev, days_requested: 0 }));
      return;
    }
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed)) {
      setFormData(prev => ({ ...prev, days_requested: parsed }));
    }
  };

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
        daysManuallySetRef.current = false;
        // Use API to calculate working days (excludes weekends and holidays)
        calculateWorkingDays(startDate, endDate, employeeId).then(days => {
          setFormData(prev => {
            // Only update if dates haven't changed and user hasn't typed Days manually
            if (
              prev.start_date === startDate &&
              prev.end_date === endDate &&
              !daysManuallySetRef.current
            ) {
              setDaysInput(String(days));
              return { ...prev, days_requested: days };
            }
            return prev;
          });
        }).catch(err => {
          console.error('Failed to calculate working days:', err);
          // Fallback to simple calculation
          const fallbackDays = calculateDays(startDate, endDate);
          if (!daysManuallySetRef.current) {
            setDaysRequested(fallbackDays);
          }
        });
      }
    }
  };

  // Handle add leave
  const handleAddLeave = async () => {
    if (!selectedEmployee) {
      setError('Please select an employee before adding leave');
      return;
    }

    const daysRequested = parseFloat(daysInput);
    if (Number.isNaN(daysRequested) || daysRequested <= 0) {
      setError('Days must be greater than 0 (e.g. 0.5 for a half day)');
      return;
    }
    
    try {
      setLoading(true);
      await apiClient.post('/leaves', {
        employee_id: selectedEmployee,
        ...formData,
        days_requested: daysRequested,
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

    const daysRequested = parseFloat(daysInput);
    if (Number.isNaN(daysRequested) || daysRequested <= 0) {
      setError('Days must be greater than 0 (e.g. 0.5 for a half day)');
      return;
    }
    
    try {
      setLoading(true);
      await apiClient.put(`/leaves/${selectedLeave.id}`, {
        ...formData,
        days_requested: daysRequested,
      });
      
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
    setDaysInput('0');
    daysManuallySetRef.current = false;
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
    setDaysInput(String(leave.days_requested));
    daysManuallySetRef.current = true;
    setEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (leave: Leave) => {
    setSelectedLeave(leave);
    setDeleteDialogOpen(true);
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
      const { downloadBlobFile } = await import('../utils/downloadFile');
      const response = await apiClient.get('/leaves/upload/template', {
        responseType: 'blob'
      });
      await downloadBlobFile({
        filename: 'leave_upload_template.xlsx',
        data: response.data,
      });
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

  const searchInputRef = useRef<HTMLInputElement>(null);
  const clearError = useCallback(() => setError(null), []);
  const clearSuccess = useCallback(() => setSuccess(null), []);

  const currentYear = new Date().getFullYear();
  const yearOptions: number[] = [];
  for (let year = currentYear - 2; year <= currentYear + 1; year++) {
    yearOptions.push(year);
  }

  // Entitlement cards (same anniversary-period maths as before)
  const renderEntitlementCards = () => {
    if (!leaveBalance) return null;

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

    const vacationCards: { stats: LeaveStats | null; title: string; key: string }[] = [
      { stats: prevPeriodStats, title: `Vacation ${selectedYear - 1}-${selectedYear}`, key: 'vacation-prev' },
      { stats: currPeriodStats, title: `Vacation ${selectedYear}-${selectedYear + 1}`, key: 'vacation-curr' },
    ];

    return (
      <>
        {vacationCards.map(({ stats, title, key }) =>
          stats ? (
            <LeaveEntitlementCard
              key={key}
              title={title}
              kind="vacation"
              stats={stats}
              selected={selectedCategory === 'vacation'}
              onSelect={() => setSelectedCategory('vacation')}
            />
          ) : null,
        )}
        {sickStats && (
          <LeaveEntitlementCard
            key="sick"
            title="Sick Leave"
            kind="sick"
            stats={sickStats}
            selected={selectedCategory === 'sick'}
            onSelect={() => setSelectedCategory('sick')}
          />
        )}
      </>
    );
  };

  const categoryTabs: { value: LeaveCategory; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'All Leave', icon: <CalendarDays /> },
    { value: 'vacation', label: 'Vacation', icon: <Palmtree /> },
    { value: 'sick', label: 'Sick Leave', icon: <HeartPulse /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">
            Leave Dashboard
          </h1>
          <p className="m-0 mt-1 text-sm text-muted-foreground">
            Track leave entitlements, balances, and history
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {deferredCompany && (
            <>
              <Button
                variant="outline"
                onClick={() => setPayrollImportOpen(true)}
                disabled={!selectedCompanyId}
              >
                Import Payroll
              </Button>
              <Button
                variant="outline"
                onClick={() => openOpeningDialog()}
                disabled={!selectedEmployee || !selectedCompanyId}
              >
                Vacation $ Opening
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
            <UploadIcon />
            Upload
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setAddDialogOpen(true);
            }}
          >
            <Plus />
            Add Leave
          </Button>
        </div>
      </div>

      {/* Company filter indicator */}
      {isFilterActive && (
        <div className="flex items-center gap-2 rounded-lg border border-solid border-border bg-card px-3 py-2 text-sm">
          <Building2 className="size-4 text-primary" aria-hidden="true" />
          <span className="font-medium text-foreground">
            Company Filter Active: Showing leave data for {getCompanyName()} only.
          </span>
        </div>
      )}

      {/* Employee search toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-solid border-border bg-card p-3">
        <div className="relative w-full sm:max-w-md sm:flex-1">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={searchInputRef}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name, ID, email..."
            aria-label="Search employees"
            className="px-9"
          />
          {searchTerm && (
            <button
              type="button"
              aria-label="Clear search text"
              onClick={() => {
                setSearchTerm('');
                setSearchResults([]);
              }}
              className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Button onClick={handleSearch} disabled={loading}>
          <SearchIcon />
          Search
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setSearchTerm('');
            setSearchResults([]);
          }}
          disabled={loading}
        >
          Clear
        </Button>
      </div>

      {/* Employee search results */}
      {loading && searchTerm ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : searchTerm && searchResults.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-solid border-border bg-card px-6 py-10 text-center">
          <SearchIcon className="size-10 text-muted-foreground/60" aria-hidden="true" />
          <p className="m-0 text-sm font-medium text-foreground">No employees found</p>
          <p className="m-0 text-sm text-muted-foreground">Try adjusting your search criteria.</p>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {searchResults.map((employee) => (
            <button
              key={employee.id}
              type="button"
              onClick={() => handleSearchResultClick(employee)}
              className={
                'box-border flex w-full cursor-pointer flex-col gap-2 rounded-lg border border-solid bg-card p-4 text-left text-card-foreground [font-family:inherit] transition-colors outline-none hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 ' +
                (globalSelectedEmployee?.id === employee.id ? 'border-primary' : 'border-border')
              }
            >
              <span className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarFallback className="bg-muted text-sm font-medium text-muted-foreground">
                    {getInitials(employee.first_name, employee.last_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{employee.full_name}</span>
                  <span className="truncate text-xs text-muted-foreground">ID: {employee.id}</span>
                </span>
                <StatusBadge status={employee.status} />
              </span>
              {(employee.email || employee.phone) && (
                <span className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {employee.email && (
                    <span className="flex items-center gap-1.5 truncate">
                      <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                      {employee.email}
                    </span>
                  )}
                  {employee.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                      {employee.phone}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : null}

      {selectedEmployeeData ? (
        <>
          {/* Active employee strip */}
          <Card className="py-0">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="size-10">
                  <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                    {getInitials(selectedEmployeeData.first_name, selectedEmployeeData.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="m-0 truncate text-base font-semibold text-foreground">
                    {selectedEmployeeData.full_name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>ID: {selectedEmployeeData.id}</span>
                    <span aria-hidden="true">&bull;</span>
                    <StatusBadge status={selectedEmployeeData.status} />
                    {leaveBalance && (
                      <>
                        <span aria-hidden="true">&bull;</span>
                        <span className="tabular-nums">
                          {leaveBalance.years_employed.toFixed(1)} years employed
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span id="leave-year-label" className="text-xs font-medium text-muted-foreground">
                  Year
                </span>
                <Select
                  value={String(selectedYear)}
                  onValueChange={(v) => setSelectedYear(Number(v))}
                >
                  <SelectTrigger size="sm" className="w-24" aria-labelledby="leave-year-label">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Category tabs + entitlement cards */}
          <div className="flex flex-col gap-4">
            <Tabs
              value={selectedCategory}
              onValueChange={(v) => setSelectedCategory(v as LeaveCategory)}
            >
              <TabsList
                variant="line"
                className="group-data-[orientation=horizontal]/tabs:h-auto w-full flex-wrap justify-start gap-x-5 gap-y-0 rounded-none border-0 border-solid border-b border-border p-0"
              >
                {categoryTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="h-auto flex-none rounded-none px-0.5 pt-1 pb-2.5 group-data-[orientation=horizontal]/tabs:after:bottom-[-1px] data-[state=active]:text-foreground"
                  >
                    {tab.icon}
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {!leaveBalance && loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-36 rounded-lg" />
                ))
              ) : (
                renderEntitlementCards()
              )}
            </div>
          </div>

          {/* Leave history */}
          <LeaveHistoryCard
            key={selectedEmployeeData.id}
            leaves={filteredLeaves}
            leaveTypes={leaveTypes}
            category={selectedCategory}
            loading={loading}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
          />
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-solid border-border bg-card px-6 py-12 text-center">
          <CalendarDays className="size-10 text-muted-foreground/60" aria-hidden="true" />
          <p className="m-0 text-sm font-medium text-foreground">Select an Employee</p>
          <p className="m-0 max-w-sm text-sm text-muted-foreground">
            Use the search field above to find and select an employee to view their leave
            information.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => searchInputRef.current?.focus()}
          >
            <SearchIcon />
            Search for an employee
          </Button>
        </div>
      )}

      {/* Add / Edit leave */}
      <LeaveFormDialog
        open={addDialogOpen || editDialogOpen}
        isEditing={editDialogOpen}
        formData={formData}
        daysInput={daysInput}
        leaveTypes={leaveTypes}
        loading={loading}
        onChange={handleFormChange}
        onDaysChange={handleDaysInputChange}
        onClose={() => (editDialogOpen ? setEditDialogOpen(false) : setAddDialogOpen(false))}
        onSubmit={editDialogOpen ? handleEditLeave : handleAddLeave}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Leave Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this leave request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedLeave && (
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md bg-muted px-3 py-2 text-sm">
              <dt className="text-muted-foreground">Leave ID</dt>
              <dd className="m-0 font-medium tabular-nums">{selectedLeave.id}</dd>
              <dt className="text-muted-foreground">Dates</dt>
              <dd className="m-0 font-medium tabular-nums">
                {formatDate(selectedLeave.start_date)} - {formatDate(selectedLeave.end_date)}
              </dd>
              <dt className="text-muted-foreground">Days</dt>
              <dd className="m-0 font-medium tabular-nums">{selectedLeave.days_requested}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="m-0 font-medium">{selectedLeave.status}</dd>
            </dl>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={loading}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteLeave();
              }}
            >
              {loading && <Loader2 className="animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LeaveUploadDialog
        open={uploadDialogOpen}
        selectedFile={selectedFile}
        previewData={previewData}
        uploadResult={uploadResult}
        previewLoading={previewLoading}
        uploadLoading={uploadLoading}
        onFileSelect={handleFileSelect}
        onDownloadTemplate={downloadTemplate}
        onPreview={previewUpload}
        onImport={executeUpload}
        onClose={resetUploadDialog}
      />

      <PayrollImportDialog
        open={payrollImportOpen}
        file={payrollFile}
        preview={payrollPreview}
        loading={payrollLoading}
        onFileChange={(file) => {
          setPayrollFile(file);
          setPayrollPreview(null);
        }}
        onPreview={previewPayrollImport}
        onImport={commitPayrollImport}
        onClose={() => setPayrollImportOpen(false)}
      />

      <OpeningBalanceDialog
        open={openingDialogOpen}
        year={openingYear}
        amount={openingAmount}
        onYearChange={async (yr) => {
          setOpeningYear(yr);
          await loadOpeningBalance(selectedEmployee, selectedCompanyId || undefined, yr);
        }}
        onAmountChange={setOpeningAmount}
        onSave={saveOpeningBalance}
        onClose={() => setOpeningDialogOpen(false)}
      />

      <AppToast message={error} variant="error" onClose={clearError} />
      <AppToast message={success} variant="success" onClose={clearSuccess} />
    </div>
  );
};

export default LeavePage;
