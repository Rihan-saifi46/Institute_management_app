// ==============================================================================
// Z Institute Management System - Global Header
// ==============================================================================

import React, { useState } from 'react';
import { Menu, LogOut, Download, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DataExportModal } from '../common/DataExportModal';

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { adminProfile, user, role, logout } = useAuth();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const displayName = adminProfile?.full_name || user?.email?.split('@')[0] || 'Administrator';
  const initial = displayName.charAt(0).toUpperCase();
  const isSuperAdmin = role === 'super_admin';

  return (
    <>
      <header className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-xs h-18 flex items-center justify-between px-4 sm:px-8">
        {/* Left: Mobile hamburger & Institute Branding */}
        <div className="flex items-center space-x-3.5">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl focus:outline-none"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight tracking-tight">
              Z Institute
            </h1>
            <p className="text-xs text-slate-400 font-medium">Management System</p>
          </div>
        </div>

        {/* Right: Export Button, Authenticated Profile & Logout */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* In-App Data Export CTA */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-200 rounded-lg transition-all shadow-2xs"
            title="Download offline JSON/CSV backup"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Role Badge (Matching Screenshot: 👑 Super Admin) */}
          <div className="hidden sm:flex items-center">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              <span>{isSuperAdmin ? '👑' : '🛡️'}</span>
              <span>{isSuperAdmin ? 'Super Admin' : 'Staff Manager'}</span>
            </span>
          </div>

          {/* User Profile Avatar with Name & Chevron */}
          <div className="flex items-center space-x-2 pl-1 sm:pl-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {initial}
            </div>
            <div className="hidden md:flex items-center space-x-1 text-slate-800 font-semibold text-sm">
              <span>{displayName}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Vertical divider */}
          <div className="h-6 w-px bg-slate-200/80 hidden sm:block" />

          {/* Logout action */}
          <button
            type="button"
            onClick={() => logout()}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
