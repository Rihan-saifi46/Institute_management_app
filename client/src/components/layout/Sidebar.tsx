// ==============================================================================
// Z Institute Management System - Navigation Sidebar
// ==============================================================================

import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  CalendarClock,
  CalendarCheck,
  GraduationCap,
  X,
} from 'lucide-react';
import { SidebarWaveGraphic } from '../common/illustrations/SidebarWaveGraphic';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'Students', path: '/students', icon: Users },
  { label: 'Fees Management', path: '/fees', icon: CreditCard },
  { label: 'Advance Fees', path: '/advance-fees', icon: CalendarClock },
  { label: 'Batch Attendance', path: '/attendance', icon: CalendarCheck },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#07183D]/60 backdrop-blur-xs md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#07183D] text-slate-100 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-white/10">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white shadow-glow-blue shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-base tracking-tight text-white block truncate">
                  Z Institute
                </span>
                <p className="text-[11px] text-blue-200/70 font-medium tracking-wide">
                  Management System
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation items */}
          <nav className="px-4 py-6 space-y-1.5">
            <div className="px-3 pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              MAIN MENU
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center space-x-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-[#0866F5] to-[#2575FC] text-white shadow-glow-blue font-semibold'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer info with wave graphic */}
        <div className="relative pt-4 overflow-hidden border-t border-white/5">
          <div className="px-5 pb-4 relative z-10">
            <div className="flex items-center space-x-2 text-xs font-medium text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">Supabase Connected</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400/80 font-mono">v1.0.0 • MVP Edition</p>
          </div>

          {/* Layered Wavy Curve Accent Graphic */}
          <div className="w-full opacity-60">
            <SidebarWaveGraphic className="w-full h-16 pointer-events-none" />
          </div>
        </div>
      </aside>
    </>
  );
};
