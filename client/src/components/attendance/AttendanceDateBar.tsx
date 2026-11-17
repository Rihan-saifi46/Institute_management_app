// ==============================================================================
// Z Institute Management System - Attendance Date & Status Bar (Matches Reference 1)
// ==============================================================================

import React from 'react';
import { Calendar, Users, Check, X, Clock, CheckCircle2 } from 'lucide-react';

interface AttendanceDateBarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  isAlreadyRecorded: boolean;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  statusFilter?: 'all' | 'present' | 'absent';
  onStatusFilterChange?: (filter: 'all' | 'present' | 'absent') => void;
}

export const AttendanceDateBar: React.FC<AttendanceDateBarProps> = ({
  selectedDate,
  onDateChange,
  isAlreadyRecorded,
  totalStudents,
  presentCount,
  absentCount,
  statusFilter = 'all',
  onStatusFilterChange,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const getRelativeDateStr = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const yesterdayStr = getRelativeDateStr(1);

  const presentPercentage =
    totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Date Selector & Quick Toggles (Matches Reference 1) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-4 h-4" />
            </div>
            <input
              type="date"
              max={todayStr}
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="pl-10 pr-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
            />
          </div>

          {/* Quick Date Shortcut Pills */}
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => onDateChange(todayStr)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                selectedDate === todayStr
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => onDateChange(yesterdayStr)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                selectedDate === yesterdayStr
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => onDateChange(getRelativeDateStr(7))}
              className="hidden sm:inline-block px-3.5 py-2 text-xs font-bold rounded-xl bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => onDateChange(todayStr.substring(0, 8) + '01')}
              className="hidden sm:inline-block px-3.5 py-2 text-xs font-bold rounded-xl bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
            >
              This Month
            </button>
          </div>

          {/* Saved Status Indicator */}
          {isAlreadyRecorded ? (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Attendance Saved for this Date</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Not Recorded Yet</span>
            </div>
          )}
        </div>

        {/* Metric Pill Badges (Matches Reference 1) */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Active Students Pill */}
          <button
            type="button"
            onClick={() => onStatusFilterChange?.('all')}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-[#07183D] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Show all active students"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Active: {totalStudents}</span>
          </button>

          {/* Present Count Pill */}
          <button
            type="button"
            onClick={() => onStatusFilterChange?.('present')}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              statusFilter === 'present'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
            title="Filter sheet to show Present students"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Present: {presentCount}</span>
          </button>

          {/* Absent Count Pill */}
          <button
            type="button"
            onClick={() => onStatusFilterChange?.('absent')}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              statusFilter === 'absent'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
            title="Filter sheet to show Absent students"
          >
            <X className="w-3.5 h-3.5" />
            <span>Absent: {absentCount}</span>
          </button>

          {/* Attendance Percentage Pill */}
          <div className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-2 h-2 rounded-full bg-purple-600" />
            <span>{presentPercentage}% Attendance</span>
          </div>
        </div>
      </div>
    </div>
  );
};
