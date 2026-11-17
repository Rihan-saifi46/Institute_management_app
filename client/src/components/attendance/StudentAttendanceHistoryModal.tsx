// ==============================================================================
// Z Institute Management System - Student Attendance History Modal
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import {
  getStudentAttendanceHistory,
  type AttendanceRecord,
  type AttendanceSummaryStats,
} from '../../services/attendance';
import type { Student } from '../../services/students';

interface StudentAttendanceHistoryModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
}

export const StudentAttendanceHistoryModal: React.FC<StudentAttendanceHistoryModalProps> = ({
  isOpen,
  student,
  onClose,
}) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceSummaryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const loadStudentData = useCallback(async () => {
    if (!student) return;
    setIsLoading(true);
    setError(null);
    try {
      const historyData = await getStudentAttendanceHistory(student.id);
      const totalSessions = historyData.length;
      const presentCount = historyData.filter((r) => r.status === 'present').length;
      const absentCount = historyData.filter((r) => r.status === 'absent').length;
      const attendancePercentage =
        totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

      setRecords(historyData);
      setStats({
        totalSessions,
        presentCount,
        absentCount,
        attendancePercentage,
      });
    } catch (err: any) {
      console.error('[StudentAttendanceHistoryModal] Error:', err);
      setError(err.message || 'Failed to load attendance history.');
    } finally {
      setIsLoading(false);
    }
  }, [student]);

  useEffect(() => {
    if (isOpen && student) {
      loadStudentData();
    }
  }, [isOpen, student, loadStudentData]);

  if (!isOpen || !student) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-attendance-history-title"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 text-white flex items-center justify-center shadow-glow-blue shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 id="student-attendance-history-title" className="text-base font-bold text-slate-900 leading-tight">
                Student Attendance Record
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {student.name} ({student.admission_id})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              <p className="text-xs">Loading attendance records...</p>
            </div>
          ) : error ? (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* Summary Statistics Card */}
              {stats && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Sessions</span>
                    <span className="text-sm font-bold text-slate-900">{stats.totalSessions}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-0.5">Present</span>
                    <span className="text-sm font-bold text-emerald-700">{stats.presentCount}</span>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-[10px] uppercase font-bold text-rose-600 block mb-0.5">Absent</span>
                    <span className="text-sm font-bold text-rose-700">{stats.absentCount}</span>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                    <span className="text-[10px] uppercase font-bold text-indigo-600 block mb-0.5">Rate</span>
                    <span className="text-sm font-bold text-indigo-700">{stats.attendancePercentage}%</span>
                  </div>
                </div>
              )}

              {/* Attendance Log List */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Session Log ({records.length})
                </h4>

                {records.length === 0 ? (
                  <p className="text-center py-6 text-slate-400">No attendance entries recorded yet.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {records.map((rec) => (
                      <div key={rec.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                        <span className="font-medium text-slate-800">{formatDate(rec.date)}</span>
                        {rec.status === 'present' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Absent</span>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
