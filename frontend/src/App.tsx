import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SelectedEmployeeProvider } from './contexts/SelectedEmployeeContext';
import { CompanyFilterProvider } from './contexts/CompanyFilterContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmployeePage from './pages/EmployeePage';
import EmploymentPage from './pages/EmploymentPage';
import LeavePage from './pages/LeavePage';
import SalaryPage from './pages/SalaryPage';
import WorkPermitPage from './pages/WorkPermitPage';
import ExpensePage from './pages/ExpensePage';
import CompanyPage from './pages/CompanyPage';
import HolidayPage from './pages/HolidayPage';
import PayrollPeriodPage from './pages/PayrollPeriodPage';
import UserPage from './pages/UserPage';
import AuditPage from './pages/AuditPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ReportsPage from './pages/ReportsPage';
import TerminationPage from './pages/TerminationPage';
import WorkSchedulePage from './pages/WorkSchedulePage';
import AttendancePage from './pages/AttendancePage';

function App() {
  return (
    <AuthProvider>
      <SelectedEmployeeProvider>
        <CompanyFilterProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/employees" element={<EmployeePage />} />
                      <Route path="/employment" element={<EmploymentPage />} />
                      <Route path="/leaves" element={<LeavePage />} />
                      <Route path="/salary" element={<SalaryPage />} />
                      <Route path="/work-schedules" element={<WorkSchedulePage />} />
                      <Route path="/attendance" element={<AttendancePage />} />
                      <Route path="/work-permits" element={<WorkPermitPage />} />
                      <Route path="/expenses" element={<ExpensePage />} />
                      <Route path="/companies" element={<CompanyPage />} />
                      <Route path="/holidays" element={<HolidayPage />} />
                      <Route path="/payroll-periods" element={<PayrollPeriodPage />} />
                      <Route path="/users" element={<UserPage />} />
                      <Route path="/audit" element={<AuditPage />} />
                      <Route path="/reports" element={<ReportsPage />} />
                      <Route path="/terminations" element={<TerminationPage />} />
                      <Route path="/change-password" element={<ChangePasswordPage />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </CompanyFilterProvider>
      </SelectedEmployeeProvider>
    </AuthProvider>
  );
}

export default App;
