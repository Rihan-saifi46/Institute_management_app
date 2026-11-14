// ==============================================================================
// Z Institute Management System - Pre-Submission Attendance Review Modal
// ==============================================================================

import React from 'react';
import { X, CalendarCheck, CheckCircle2, UserX, Loader2, AlertCircle } from 'lucide-react';
import type { Student } from '../../services/students';
import type { AttendanceStatus } from '../../types/database';

interface AttendanceReviewModalProps {
  isOpen: boolean;
  date: string;
  students: Student[];
  attendanceMap: Record<string, AttendanceStatus>;
  onClose: () => void;
  onConfirmSave: () => Promise<void>;
  isSaving: boolean;
  errorMessage: string | null;
}

export const AttendanceReviewModal: React.FC<AttendanceReviewModalProps> = ({
  isOpen,
  date,
  students,
  attendanceMap,
  onClose,
  onConfirmSave,
  isSaving,
  errorMessage,
}) => {
  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const presentStudents = students.filter((s) => (attendanceMap[s.id] ?? 'present') === 'present');
  const absentStudents = students.filter((s) => attendanceMap[s.id] === 'absent');

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 id="review-modal-title" className="text-base font-bold text-slate-900 leading-tight">
                Review Class Attendance
              </h3>
              <p className="text-xs text-slate-500 font-medium">{formatDate(date)}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Total Enrolled</span>
              <span className="text-base font-bold text-slate-900">{students.length}</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-0.5">Present</span>
              <span className="text-base font-bold text-emerald-700">{presentStudents.length}</span>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-[10px] uppercase font-bold text-rose-600 block mb-0.5">Absent</span>
              <span className="text-base font-bold text-rose-700">{absentStudents.length}</span>
            </div>
          </div>

          {/* Absent Students Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                <UserX className="w-4 h-4 text-rose-600" />
                <span>Marked Absent ({absentStudents.length})</span>
              </div>
              <span className="text-[10px] text-slate-400">Verify absentees before saving</span>
            </div>

            {absentStudents.length === 0 ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-emerald-800 font-medium">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <span>100% Attendance: All {students.length} active students marked Present!</span>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {absentStudents.map((student) => (
                  <div key={student.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <span className="font-semibold text-slate-900">{student.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono ml-2">({student.admission_id})</span>
                    </div>
                    <span className="text-[11px] text-slate-500">{student.course}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            • Submitting will invoke the atomic database procedure, updating records in-place without duplicate collisions.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Go Back & Edit
          </button>
          <button
            type="button"
            onClick={onConfirmSave}
            disabled={isSaving}
            className="inline-flex items-center space-x-1.5 px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs hover:shadow-sm transition-all disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving to Database...</span>
              </>
            ) : (
              <span>Confirm & Save Attendance</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
