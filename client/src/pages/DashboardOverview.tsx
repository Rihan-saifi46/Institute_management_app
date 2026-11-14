// ==============================================================================
// Z Institute Management System - Dashboard Overview View
// ==============================================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DataExportModal } from '../components/common/DataExportModal';
import {
  Users,
  CreditCard,
  CalendarCheck,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Download,
  ShieldCheck,
} from 'lucide-react';

export const DashboardOverview: React.FC = () => {
  const { adminProfile, user, role } = useAuth();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const displayName = adminProfile?.full_name || user?.email?.split('@')[0] || 'Administrator';
  const isSuperAdmin = role === 'super_admin';

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-brand-600 via-indigo-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <Sparkles className="w-64 h-64" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-3">
            <span>Z Institute Management</span>
            <span>•</span>
            <span>{isSuperAdmin ? 'Super Admin Access' : 'Staff Access'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {displayName}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-brand-100 font-normal leading-relaxed">
            Manage your student admissions, track immutable fee payment installments, and mark daily batch attendance securely.
          </p>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
          Quick Modules
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1: Students */}
          <Link
            to="/students"
            className="group bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:shadow-md hover:border-brand-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                Student Directory
              </h4>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Add students with manual Admission IDs, search by name/course/phone, and manage active enrollments.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
              <span>Open Directory</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 2: Fees */}
          <Link
            to="/fees"
            className="group bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                Fee Management
              </h4>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Collect fee installments into an immutable ledger, view real-time dues, and print clean payment receipts.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform">
              <span>Manage Fees</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 3: Attendance */}
          <Link
            to="/attendance"
            className="group bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                Batch Attendance
              </h4>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Default active students to present, uncheck absentees, review changes, and save atomically with zero duplicates.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-amber-600 group-hover:translate-x-1 transition-transform">
              <span>Mark Attendance</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>

      {/* Data Portability & Offline Backup Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-brand-950 rounded-xl p-5 sm:p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-brand-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Data Portability & Offline Archival</span>
          </div>
          <h4 className="text-base font-bold text-white">
            Download Complete Institute Records
          </h4>
          <p className="text-xs text-slate-300 max-w-xl">
            Export full system records to structured JSON, or download individual spreadsheets (CSV) for students, fee installments, and attendance logs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsExportModalOpen(true)}
          className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 active:bg-slate-200 rounded-lg shadow-sm transition-all shrink-0 hover:scale-[1.02]"
        >
          <Download className="w-4 h-4 text-brand-600" />
          <span>Export System Data</span>
        </button>
      </div>

      {/* Security & System Architecture Info Card */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">System Security & Policies Active</h4>
            <p className="text-xs text-slate-500">PostgreSQL Row Level Security (RLS) and Audit Rules</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="font-semibold text-slate-800">Immutable Ledger</div>
            <p className="mt-1 text-slate-500">Direct UPDATE and DELETE on payments are disabled. Super Admin reversals generate offsetting entries.</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="font-semibold text-slate-800">Atomic Attendance</div>
            <p className="mt-1 text-slate-500">Batch updates execute inside a single transaction to prevent partial inserts or date collisions.</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="font-semibold text-slate-800">Data Preservation</div>
            <p className="mt-1 text-slate-500">Foreign keys enforce ON DELETE RESTRICT on students with financial or attendance history.</p>
          </div>
        </div>
      </div>

      {/* In-App Data Portability / Export Modal */}
      <DataExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};
