// ==============================================================================
// Z Institute Management System - Main Application Routing
// ==============================================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Login } from './pages/Login';
import { DashboardOverview } from './pages/DashboardOverview';
import { StudentsPage } from './pages/StudentsPage';
import { ModulePlaceholder } from './pages/ModulePlaceholder';
import { CreditCard, CalendarCheck } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<DashboardOverview />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route
                path="/fees"
                element={
                  <ModulePlaceholder
                    title="Fees Management & Ledger"
                    description="Real-time fee summary view, installment payment records, printable receipts, and authorized reversals."
                    targetPhase="Phase 5"
                    icon={CreditCard}
                  />
                }
              />
              <Route
                path="/attendance"
                element={
                  <ModulePlaceholder
                    title="Batch Attendance Management"
                    description="Daily batch attendance sheet, instant present defaulting, review before submission, and atomic database upserts."
                    targetPhase="Phase 6"
                    icon={CalendarCheck}
                  />
                }
              />
            </Route>
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

