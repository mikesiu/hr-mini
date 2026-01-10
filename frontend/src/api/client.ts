import axios from 'axios';

// Dynamically determine API URL based on how the frontend is accessed
// When accessed via IP (e.g., 192.168.1.77:3000), use the same IP for API calls
const getApiBaseUrl = () => {
  // Check for environment variable first
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // If accessing via IP address (not localhost), use that same IP for API
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:8001/api`;
  }
  
  return 'http://localhost:8001/api';
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout (increased to handle slower database queries)
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Debug log for token presence (only log for company requests to reduce noise)
      if (config.url?.includes('/companies')) {
        console.log('Request interceptor: Adding token to request', {
          url: config.url,
          hasToken: !!token,
          tokenLength: token?.length
        });
      }
    } else {
      // Warn if token is missing for authenticated endpoints
      if (config.url && !config.url.includes('/auth/login')) {
        console.warn('Request interceptor: No token found in localStorage for:', config.url);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Forbidden - log detailed info
      const hasToken = !!localStorage.getItem('access_token');
      console.error('Access forbidden (403) for:', error.config?.url, {
        hasToken,
        headers: error.config?.headers,
        detail: error.response?.data?.detail,
        fullResponse: error.response?.data
      });
      
      // If 403 and no token, treat it like 401 and redirect to login
      if (!hasToken) {
        console.warn('403 Forbidden with no token - redirecting to login');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      // Don't redirect for 403 with token (may be permission issue)
    } else if (error.code === 'ECONNABORTED') {
      // Request timeout
      console.error('Request timeout:', error.config?.url);
    } else if (error.code === 'ECONNRESET') {
      // Connection reset
      console.error('Connection reset:', error.config?.url);
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (username: string, password: string) =>
    apiClient.post('/auth/login', { username, password }),
  logout: () => apiClient.post('/auth/logout'),
  extendSession: () => apiClient.post('/auth/extend-session'),
};

// Employee API
export const employeeAPI = {
  list: (params?: { q?: string; company_id?: string }) => 
    apiClient.get('/employees/list', { params }),
  get: (id: string) => apiClient.get(`/employees/${id}`),
  create: (data: any) => apiClient.post('/employees', data),
  update: (id: string, data: any) => apiClient.put(`/employees/${id}`, data),
  delete: (id: string) => apiClient.delete(`/employees/${id}`),
  // Upload functionality
  downloadTemplate: () => apiClient.get('/employees/upload/template', { responseType: 'blob' }),
  previewUpload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/employees/upload/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/employees/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

// Employment API
export const employmentAPI = {
  list: (params?: { q?: string; employee_id?: string; company_id?: string }) => 
    apiClient.get('/employment/list', { params }),
  get: (id: number) => apiClient.get(`/employment/${id}`),
  create: (data: any) => apiClient.post('/employment', data),
  update: (id: number, data: any) => apiClient.put(`/employment/${id}`, data),
  delete: (id: number) => apiClient.delete(`/employment/${id}`),
};

// Leave API
export const leaveAPI = {
  list: (params?: { employee_id?: string; status?: string }) =>
    apiClient.get('/leaves', { params }),
  get: (id: number) => apiClient.get(`/leaves/${id}`),
  create: (data: any) => apiClient.post('/leaves', data),
  update: (id: number, data: any) => apiClient.put(`/leaves/${id}`, data),
  approve: (id: number) => apiClient.post(`/leaves/${id}/approve`),
  reject: (id: number) => apiClient.post(`/leaves/${id}/reject`),
  types: () => apiClient.get('/leaves/types'),
  calculateDays: (employeeId: string, startDate: string, endDate: string) =>
    apiClient.post('/leaves/calculate-days', {
      employee_id: employeeId,
      start_date: startDate,
      end_date: endDate,
    }),
};

// Holiday API
export const holidayAPI = {
  list: (companyId: string, params?: { year?: number; active_only?: boolean }) =>
    apiClient.get('/holidays/', { params: { company_id: companyId, ...params } }),
  get: (id: number) => apiClient.get(`/holidays/${id}`),
  create: (data: any) => apiClient.post('/holidays/', data),
  update: (id: number, data: any) => apiClient.put(`/holidays/${id}`, data),
  delete: (id: number) => apiClient.delete(`/holidays/${id}`),
  copy: (sourceCompanyId: string, targetCompanyId: string, year: number, skipDuplicates: boolean = true) =>
    apiClient.post('/holidays/copy', {
      source_company_id: sourceCompanyId,
      target_company_id: targetCompanyId,
      year: year,
      skip_duplicates: skipDuplicates,
    }),
};

// Company API
export const companyAPI = {
  list: (params?: { search?: string }) => apiClient.get('/companies', { params }),
  get: (id: string) => apiClient.get(`/companies/${id}`),
  create: (data: any) => apiClient.post('/companies', data),
  update: (id: string, data: any) => apiClient.put(`/companies/${id}`, data),
  delete: (id: string) => apiClient.delete(`/companies/${id}`),
  getPayPeriods: (companyId: string, year: number) =>
    apiClient.get(`/companies/${companyId}/pay-periods`, { params: { year } }),
};

// Salary API
export const salaryAPI = {
  // Get salary history with optional filtering
  history: (params?: { employee_id?: string; search?: string }) =>
    apiClient.get('/salary/history', { params }),
  
  // Get specific salary record
  get: (id: number) => apiClient.get(`/salary/history/${id}`),
  
  // Create new salary record
  create: (data: any) => apiClient.post('/salary/history', data),
  
  // Update salary record
  update: (id: number, data: any) => apiClient.put(`/salary/history/${id}`, data),
  
  // Delete salary record
  delete: (id: number) => apiClient.delete(`/salary/history/${id}`),
  
  // Get current salary for employee
  current: (employeeId: string) => apiClient.get(`/salary/current/${employeeId}`),
  
  // Get salary progression for employee
  progression: (employeeId: string) => apiClient.get(`/salary/progression/${employeeId}`),
};

// Work Permit API
export const workPermitAPI = {
  list: (params?: { employee_id?: string; permit_type?: string }) =>
    apiClient.get('/work-permits', { params }),
  get: (id: number) => apiClient.get(`/work-permits/${id}`),
  create: (data: any) => apiClient.post('/work-permits', data),
  update: (id: number, data: any) => apiClient.put(`/work-permits/${id}`, data),
  delete: (id: number) => apiClient.delete(`/work-permits/${id}`),
  getByEmployee: (employeeId: string) => apiClient.get(`/work-permits/employee/${employeeId}`),
  getCurrent: (employeeId: string) => apiClient.get(`/work-permits/employee/${employeeId}/current`),
  getExpiring: (daysAhead?: number) => apiClient.get('/work-permits/expiring', { params: { days_ahead: daysAhead } }),
};

// Expense API
export const expenseAPI = {
  // Claims
  claims: (params?: { employee_id?: string; limit?: number }) =>
    apiClient.get('/expenses/claims', { params }),
  createClaim: (data: any) => apiClient.post('/expenses/claims', data),
  updateClaim: (claimId: string, data: any) => apiClient.put(`/expenses/claims/${claimId}`, data),
  deleteClaim: (claimId: string) => apiClient.delete(`/expenses/claims/${claimId}`),
  
  // Entitlements
  entitlements: (params?: { employee_id?: string }) =>
    apiClient.get('/expenses/entitlements', { params }),
  createEntitlement: (data: any) => apiClient.post('/expenses/entitlements', data),
  updateEntitlement: (entitlementId: string, data: any) => apiClient.put(`/expenses/entitlements/${entitlementId}`, data),
  deleteEntitlement: (entitlementId: string) => apiClient.delete(`/expenses/entitlements/${entitlementId}`),
  
  // Validation and Summary
  validateClaim: (data: { employee_id: string; expense_type: string; receipts_amount: number }) =>
    apiClient.post('/expenses/validate-claim', data),
  getSummary: (employeeId: string, params?: { start_date?: string; end_date?: string }) =>
    apiClient.get(`/expenses/summary/${employeeId}`, { params }),
  
  // Reports
  getMonthlyReport: (month: number, year: number) =>
    apiClient.get('/expenses/reports/monthly', { params: { month, year } }),
  getYearlyReport: (year: number) =>
    apiClient.get('/expenses/reports/yearly', { params: { year } }),
  
  // Utility
  getExpenseTypes: () => apiClient.get('/expenses/expense-types'),
  openFile: (filePath: string) => apiClient.post('/expenses/open-file', { file_path: filePath }),
};

// User API
export const userAPI = {
  list: () => apiClient.get('/users'),
  roles: () => apiClient.get('/users/roles'),
  create: (data: any) => apiClient.post('/users', data),
  update: (id: number, data: any) => apiClient.put(`/users/${id}`, data),
  delete: (id: number) => apiClient.delete(`/users/${id}`),
  changePassword: (id: number, password: string) => 
    apiClient.put(`/users/${id}/password`, { new_password: password }),
  changeMyPassword: (currentPassword: string, newPassword: string) => 
    apiClient.put('/users/me/password', { 
      current_password: currentPassword, 
      new_password: newPassword 
    }),
  // Role management
  createRole: (data: any) => apiClient.post('/users/roles', data),
  updateRole: (id: number, data: any) => apiClient.put(`/users/roles/${id}`, data),
  deleteRole: (id: number) => apiClient.delete(`/users/roles/${id}`),
};

// Audit API
export const auditAPI = {
  list: (params?: { entity_type?: string; entity_id?: string; action?: string }) =>
    apiClient.get('/audit', { params }),
  report: (params?: { start_date?: string; end_date?: string }) =>
    apiClient.get('/audit/report', { params }),
};

// Termination API
export const terminationAPI = {
  list: (params?: { employee_id?: string }) =>
    apiClient.get('/terminations', { params }),
  get: (id: number) => apiClient.get(`/terminations/${id}`),
  getByEmployee: (employeeId: string) => apiClient.get(`/terminations/employee/${employeeId}`),
  create: (data: any) => apiClient.post('/terminations', data),
  update: (id: number, data: any) => apiClient.put(`/terminations/${id}`, data),
  delete: (id: number) => apiClient.delete(`/terminations/${id}`),
};

// Dashboard API
export const dashboardAPI = {
  getPayrollCalendar: (startDate: string, endDate: string) =>
    apiClient.get('/dashboard/payroll-calendar', { 
      params: { start_date: startDate, end_date: endDate } 
    }),
  getCurrentMonthPayrollCalendar: () =>
    apiClient.get('/dashboard/payroll-calendar/current-month'),
};

// Reports API
export const reportsAPI = {
  // Get available report types
  getTypes: () => apiClient.get('/reports/types'),
  
  // Get filter options for a specific report type
  getFilters: (reportType: string) => apiClient.get(`/reports/filters/${reportType}`),
  
  // Employee Directory Report
  employeeDirectory: (params?: {
    start_date?: string;
    end_date?: string;
    company_id?: string;
    department?: string;
    employee_status?: string;
    employee_id?: string;
    search_term?: string;
    include_inactive?: boolean;
    position?: string;
    hire_date_from?: string;
    hire_date_to?: string;
    sort_by?: string;
    sort_direction?: string;
    group_by?: string;
    group_by_secondary?: string;
  }) => apiClient.get('/reports/employee-directory', { params }),
  
  // Employment History Report
  employmentHistory: (params?: {
    start_date?: string;
    end_date?: string;
    company_id?: string;
    department?: string;
    employee_status?: string;
    employee_id?: string;
    search_term?: string;
    sort_by?: string;
    sort_direction?: string;
    group_by?: string;
    group_by_secondary?: string;
  }) => apiClient.get('/reports/employment-history', { params }),
  
  // Leave Balance Report
  leaveBalance: (params?: {
    start_date?: string;
    end_date?: string;
    company_id?: string;
    department?: string;
    employee_status?: string;
    employee_id?: string;
    search_term?: string;
    sort_by?: string;
    sort_direction?: string;
    group_by?: string;
    group_by_secondary?: string;
  }) => apiClient.get('/reports/leave-balance', { params }),
  
  // Leave Taken Report
  leaveTaken: (params?: {
    start_date?: string;
    end_date?: string;
    company_id?: string;
    department?: string;
    employee_status?: string;
    employee_id?: string;
    search_term?: string;
    sort_by?: string;
    sort_direction?: string;
    group_by?: string;
    group_by_secondary?: string;
  }) => apiClient.get('/reports/leave-taken', { params }),
  
  // Salary Analysis Report
  salaryAnalysis: (params?: {
    start_date?: string;
    end_date?: string;
    company_id?: string;
    department?: string;
    employee_status?: string;
    employee_id?: string;
    search_term?: string;
    pay_type?: string;
    min_salary?: number;
    max_salary?: number;
    effective_date_from?: string;
    effective_date_to?: string;
    sort_by?: string;
    sort_direction?: string;
    group_by?: string;
    group_by_secondary?: string;
  }) => apiClient.get('/reports/salary-analysis', { params }),
  
  // Work Permit Status Report
  workPermitStatus: (params?: {
    start_date?: string;
    end_date?: string;
    company_id?: string;
    department?: string;
    employee_status?: string;
    employee_id?: string;
    search_term?: string;
    permit_type?: string;
    expiry_days_ahead?: number;
    is_expired?: boolean;
    sort_by?: string;
    sort_direction?: string;
    group_by?: string;
    group_by_secondary?: string;
  }) => apiClient.get('/reports/work-permit-status', { params }),
  
  // Comprehensive Overview Report
  comprehensiveOverview: (params?: {
    start_date?: string;
    end_date?: string;
    company_id?: string;
    department?: string;
    employee_status?: string;
    employee_id?: string;
    search_term?: string;
    sort_by?: string;
    sort_direction?: string;
    group_by?: string;
    group_by_secondary?: string;
  }) => apiClient.get('/reports/comprehensive-overview', { params }),
  
  // Expense Reimbursement Report
  expenseReimbursement: (params?: {
    start_date?: string;
    end_date?: string;
    company_id?: string;
    department?: string;
    employee_status?: string;
    employee_id?: string;
    search_term?: string;
    sort_by?: string;
    sort_direction?: string;
    group_by?: string;
    group_by_secondary?: string;
  }) => apiClient.get('/reports/expense-reimbursement', { params }),
  
  // Export Report
  export: (reportType: string, params?: {
    format?: string;
    start_date?: string;
    end_date?: string;
    company_id?: string;
    department?: string;
    employee_status?: string;
    employee_id?: string;
    search_term?: string;
    [key: string]: any;
  }) => apiClient.get(`/reports/export/${reportType}`, { params }),
  
};

// Work Schedule API
export const workScheduleAPI = {
  list: (params?: { company_id?: string; active_only?: boolean }) => 
    apiClient.get('/work-schedules', { params }),
  get: (id: number) => apiClient.get(`/work-schedules/${id}`),
  create: (data: any) => apiClient.post('/work-schedules', data),
  update: (id: number, data: any) => apiClient.put(`/work-schedules/${id}`, data),
  delete: (id: number) => apiClient.delete(`/work-schedules/${id}`),
  assign: (scheduleId: number, data: any) => 
    apiClient.post(`/work-schedules/${scheduleId}/assign`, data),
  getAssignments: (scheduleId: number) => 
    apiClient.get(`/work-schedules/${scheduleId}/assignments`),
  updateAssignment: (assignmentId: number, data: any) =>
    apiClient.put(`/work-schedules/assignments/${assignmentId}`, data),
  getEmployeeSchedule: (employeeId: string, asOfDate?: string) => 
    apiClient.get(`/work-schedules/employee/${employeeId}`, { params: { as_of_date: asOfDate } }),
  getEmployeeHistory: (employeeId: string) => 
    apiClient.get(`/work-schedules/employee/${employeeId}/history`),
};

// Attendance API
export const attendanceAPI = {
  previewCSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/attendance/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadCSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/attendance/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: (params?: {
    employee_id?: string;
    start_date?: string;
    end_date?: string;
    company_id?: string;
    pay_period_start?: string;
    pay_period_end?: string;
  }) => apiClient.get('/attendance', { params }),
  get: (id: number) => apiClient.get(`/attendance/${id}`),
  create: (data: any) => apiClient.post('/attendance', data),
  update: (id: number, data: any) => apiClient.put(`/attendance/${id}`, data),
  override: (id: number, data: any) => apiClient.post(`/attendance/${id}/override`, data),
  bulkFill: (employeeId: string, startDate: string, endDate: string) => 
    apiClient.post('/attendance/bulk-fill', null, {
      params: { employee_id: employeeId, start_date: startDate, end_date: endDate },
    }),
  recalculate: (employeeId: string | null, startDate: string, endDate: string) =>
    apiClient.post('/attendance/recalculate', null, {
      params: { 
        ...(employeeId ? { employee_id: employeeId } : {}),
        start_date: startDate, 
        end_date: endDate 
      }
    }),
  recalculateAttendance: (attendanceId: number) =>
    apiClient.post(`/attendance/${attendanceId}/recalculate`),
  getReport: (params?: {
    company_id?: string;
    employee_id?: string;
    start_date?: string;
    end_date?: string;
    pay_period_start?: string;
    pay_period_end?: string;
  }) => apiClient.get('/attendance/report', { params }),
  getDetailedReport: (params?: {
    company_id?: string;
    employee_id?: string;
    start_date?: string;
    end_date?: string;
    pay_period_start?: string;
    pay_period_end?: string;
  }) => apiClient.get('/attendance/report/detailed', { params }),
  exportReport: (params?: {
    company_id?: string;
    start_date?: string;
    end_date?: string;
    format?: string;
  }) => apiClient.get('/attendance/report/export', { params, responseType: 'blob' }),
  deleteByDateRange: (params: {
    start_date: string;
    end_date: string;
    employee_id?: string;
    company_id?: string;
  }) => apiClient.delete('/attendance/bulk', { params }),
  getPeriodOverride: (employeeId: string, params: {
    company_id: string;
    pay_period_start: string;
    pay_period_end: string;
  }) => apiClient.get(`/attendance/period-override/${employeeId}`, { params }),
  savePeriodOverride: (data: any) => apiClient.post('/attendance/period-override', data),
  deletePeriodOverride: (overrideId: number) => apiClient.delete(`/attendance/period-override/${overrideId}`),
};