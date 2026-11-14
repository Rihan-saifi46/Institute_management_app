// ==============================================================================
// Z Institute Management System - Global Header
// ==============================================================================

import React, { useState } from 'react';
import { Menu, LogOut, ShieldCheck, UserCircle, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DataExportModal } from '../common/DataExportModal';

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { adminProfile, user, role, logout } = useAuth();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const displayName = adminProfile?.full_name || user?.email?.split('@')[0] || 'Administrator';
  const displayEmail = user?.email || '';
  const isSuperAdmin = role === 'super_admin';

  return (
    <>
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm h-16 flex items-center justify-between px-4 sm:px-6">
        {/* Left: Mobile hamburger & Institute Branding */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Z Institute</h1>
            <p className="text-xs text-slate-500 font-medium">Management System</p>
          </div>
        </div>

        {/* Right: Export Button, Authenticated Profile & Logout */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* In-App Data Export CTA */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-brand-700 bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-300 rounded-lg transition-colors shadow-2xs"
            title="Download offline JSON/CSV backup"
          >
            <Download className="w-3.5 h-3.5 text-brand-600" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Role & Name Badge */}
          <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700">
            <UserCircle className="w-5 h-5" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-semibold text-slate-900">{displayName}</span>
              {isSuperAdmin && (
                <span title="Super Admin">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1.5">
              <span
                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider ${
                  isSuperAdmin
                    ? 'bg-brand-50 text-brand-700 border border-brand-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {isSuperAdmin ? 'Super Admin' : 'Staff Manager'}
              </span>
              <span className="text-xs text-slate-400 hidden lg:inline">({displayEmail})</span>
            </div>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* Logout action */}
        <button
          type="button"
          onClick={() => logout()}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
          title="Sign out of system"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline">Sign Out</span>
        </button>
      </div>
    </header>

    {/* In-App Data Portability / Export Modal */}
    <DataExportModal
      isOpen={isExportModalOpen}
      onClose={() => setIsExportModalOpen(false)}
    />
  </>
  );
};
