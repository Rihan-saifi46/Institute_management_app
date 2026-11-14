// ==============================================================================
// Z Institute Management System - Protected Route Guard
// ==============================================================================

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { session, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Verifying security session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    // Preserve the intended target location so user can be redirected back after sign-in
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
