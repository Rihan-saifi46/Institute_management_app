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
import { FeesPage } from './pages/FeesPage';
import { ModulePlaceholder } from './pages/ModulePlaceholder';
import { CalendarCheck } from 'lucide-react';

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
              <Route path="/fees" element={<FeesPage />} />
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

