// ==============================================================================
// Z Institute Management System - Attendance Date & Status Bar
// ==============================================================================

import React from 'react';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';

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

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const yesterdayStr = getYesterdayStr();

  const presentPercentage =
    totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Date Selector & Quick Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-4 h-4" />
            </div>
            <input
              type="date"
              max={todayStr}
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-2xs"
            />
          </div>

          {/* Quick Date Shortcuts */}
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => onDateChange(todayStr)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                selectedDate === todayStr
                  ? 'bg-brand-50 text-brand-700 border-brand-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => onDateChange(yesterdayStr)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                selectedDate === yesterdayStr
                  ? 'bg-brand-50 text-brand-700 border-brand-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Yesterday
            </button>
          </div>

          {/* Database Submission State Pill */}
          {isAlreadyRecorded ? (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Attendance Saved for this Date</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Not Recorded Yet</span>
            </div>
          )}
        </div>

        {/* Live Batch Metric Pill Counters (Click to Filter Table) */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => onStatusFilterChange?.('all')}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title="Show all active students"
          >
            Active: <span className="font-bold">{totalStudents}</span>
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange?.('present')}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
              statusFilter === 'present'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
            }`}
            title="Filter sheet to show only Present students"
          >
            Present: <span className="font-bold">{presentCount}</span>
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange?.('absent')}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
              statusFilter === 'absent'
                ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
            }`}
            title="Filter sheet to show only Absent students"
          >
            Absent: <span className="font-bold">{absentCount}</span>
          </button>

          <div className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold">
            {presentPercentage}% Attendance
          </div>
        </div>
      </div>
    </div>
  );
};
