// ==============================================================================
// Z Institute Management System - Batch Attendance Sheet Component (Matches Reference 1)
// ==============================================================================

import React, { useState } from 'react';
import {
  Check,
  X,
  Search,
  Users,
  Save,
  History,
  Pencil,
  CheckCircle2,
  BookOpen,
  ChevronDown,
} from 'lucide-react';
import type { Student } from '../../services/students';
import type { AttendanceStatus } from '../../types/database';

interface BatchAttendanceSheetProps {
  students: Student[];
  attendanceMap: Record<string, AttendanceStatus>;
  onToggleStatus: (studentId: string, status: AttendanceStatus) => void;
  onMarkAll: (status: AttendanceStatus) => void;
  onOpenReviewModal: () => void;
  coursesList: string[];
  isLoading: boolean;
  statusFilter?: 'all' | 'present' | 'absent';
  onStatusFilterChange?: (filter: 'all' | 'present' | 'absent') => void;
  onViewStudentHistory?: (student: Student) => void;
  isAlreadyRecorded?: boolean;
  isEditMode?: boolean;
  onToggleEditMode?: (editing: boolean) => void;
}

export const BatchAttendanceSheet: React.FC<BatchAttendanceSheetProps> = ({
  students,
  attendanceMap,
  onToggleStatus,
  onMarkAll,
  onOpenReviewModal,
  coursesList,
  isLoading,
  statusFilter = 'all',
  onStatusFilterChange,
  onViewStudentHistory,
  isAlreadyRecorded = false,
  isEditMode = false,
  onToggleEditMode,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterBatch, setFilterBatch] = useState('all');

  // Calculate counts
  const presentCount = students.filter((s) => (attendanceMap[s.id] ?? 'present') === 'present').length;
  const absentCount = students.filter((s) => attendanceMap[s.id] === 'absent').length;

  // Filter students
  const filteredStudents = students.filter((s) => {
    const studentStatus: AttendanceStatus = attendanceMap[s.id] ?? 'present';
    const matchesStatus =
      statusFilter === 'all' || studentStatus === statusFilter;
    const matchesCourse = filterCourse === '' || s.course.toLowerCase() === filterCourse.toLowerCase();
    const cleanQ = filterQuery.trim().toLowerCase();
    const matchesSearch =
      cleanQ === '' ||
      s.name.toLowerCase().includes(cleanQ) ||
      s.admission_id.toLowerCase().includes(cleanQ) ||
      s.phone.includes(cleanQ);

    return matchesStatus && matchesCourse && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm p-8 space-y-4">
        <div className="h-6 bg-slate-100 rounded-md w-1/4 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
        <Users className="w-12 h-12 text-blue-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">No active students to mark</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          There are no students with active status in the system. Enroll students in the Student Directory before marking attendance.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm flex flex-col">
      {/* Banner for Saved / Locked states */}
      {isAlreadyRecorded && !isEditMode && (
        <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-3 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">Attendance Saved for this Date</span>
            <span className="text-emerald-700 hidden md:inline">
              — Locked in confirmed view to prevent accidental edits.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onToggleEditMode?.(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors shrink-0"
            title="Click to unlock sheet and modify attendance records"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit Attendance</span>
          </button>
        </div>
      )}

      {isAlreadyRecorded && isEditMode && (
        <div className="bg-amber-50 border-b border-amber-100 px-5 py-3 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center space-x-2">
            <Pencil className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-bold">Editing Saved Attendance</span>
            <span className="text-amber-800 hidden md:inline">
              — Modifying previously recorded attendance. Click "Update Attendance" below when finished.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onToggleEditMode?.(false)}
            className="text-amber-800 hover:text-amber-950 font-bold underline text-xs shrink-0"
          >
            Cancel Editing
          </button>
        </div>
      )}

      {/* Filter & Action Toolbar (Matches Reference 1) */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-white flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
        {/* Left: Search, Course Filter, Batch Filter */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-xl">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search by student name..."
              className="w-full pl-10 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Course filter dropdown */}
          <div className="relative min-w-[140px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-500">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer shadow-2xs"
            >
              <option value="">All Courses</option>
              {coursesList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Batch filter dropdown */}
          <div className="relative min-w-[120px]">
            <select
              value={filterBatch}
              onChange={(e) => setFilterBatch(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer shadow-2xs"
            >
              <option value="all">All Batches</option>
              <option value="morning">Morning Batch</option>
              <option value="evening">Evening Batch</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Center: Status Filter Pills */}
        <div className="flex items-center space-x-1.5 self-start xl:self-center">
          <button
            type="button"
            onClick={() => onStatusFilterChange?.('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border border-slate-200 bg-white'
            }`}
          >
            All ({students.length})
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange?.('present')}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              statusFilter === 'present'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Present ({presentCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange?.('absent')}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              statusFilter === 'absent'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            <span>Absent ({absentCount})</span>
          </button>
        </div>

        {/* Right: Mark All Present / Mark All Absent Action Buttons */}
        <div className="flex items-center space-x-2 shrink-0 self-start xl:self-center">
          {(!isAlreadyRecorded || isEditMode) && (
            <>
              <button
                type="button"
                onClick={() => onMarkAll('present')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all shadow-2xs"
                title="Mark all students as Present"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark All Present</span>
              </button>

              <button
                type="button"
                onClick={() => onMarkAll('absent')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shadow-2xs"
                title="Mark all students as Absent"
              >
                <X className="w-3.5 h-3.5" />
                <span>Mark All Absent</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Attendance Table (Matches Reference 1) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#EEF4FF] border-b border-blue-100/60 text-[11px] font-bold text-[#10234F] tracking-wide">
              <th scope="col" className="py-3.5 px-6">ADMISSION ID</th>
              <th scope="col" className="py-3.5 px-4">STUDENT NAME</th>
              <th scope="col" className="py-3.5 px-4">COURSE</th>
              <th scope="col" className="py-3.5 px-6 text-center">STATUS</th>
              <th scope="col" className="py-3.5 px-6 text-center">HISTORY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400">
                  <p className="font-semibold text-slate-600">No students match current filter.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Try clearing your search query or changing filters.
                  </p>
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => {
                const status: AttendanceStatus = attendanceMap[student.id] ?? 'present';
                const isPresent = status === 'present';

                return (
                  <tr
                    key={student.id}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    {/* Admission ID Pill */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100/60">
                        {student.admission_id}
                      </span>
                    </td>

                    {/* Student Name */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">
                          {student.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {student.phone}
                        </span>
                      </div>
                    </td>

                    {/* Course */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2 text-slate-700">
                        <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-semibold text-slate-700">{student.course}</span>
                      </div>
                    </td>

                    {/* Status Controls (Matches Reference 1) */}
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      {isAlreadyRecorded && !isEditMode ? (
                        isPresent ? (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Present</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <X className="w-3.5 h-3.5 text-rose-600" />
                            <span>Absent</span>
                          </span>
                        )
                      ) : (
                        <div className="inline-flex items-center space-x-2">
                          {/* Present Button */}
                          <button
                            type="button"
                            onClick={() => onToggleStatus(student.id, 'present')}
                            className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                              isPresent
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </button>

                          {/* Absent Button */}
                          <button
                            type="button"
                            onClick={() => onToggleStatus(student.id, 'absent')}
                            className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                              !isPresent
                                ? 'bg-rose-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Absent</span>
                          </button>
                        </div>
                      )}
                    </td>

                    {/* History Log Action */}
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onViewStudentHistory?.(student)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 rounded-lg transition-colors"
                        title={`View attendance log for ${student.name}`}
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>History</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Sticky Action Bar (Matches Reference 1) */}
      <div className="bg-white border-t border-slate-100 p-4 sm:px-8 flex items-center justify-between">
        {/* Left: Metric Counts */}
        <div className="text-xs font-medium text-slate-500 flex items-center space-x-4">
          <span>
            Total: <strong className="text-slate-800 font-bold">{students.length}</strong>
          </span>
          <span className="text-emerald-700 font-bold">
            Present: {presentCount}
          </span>
          <span className="text-rose-700 font-bold">
            Absent: {absentCount}
          </span>
        </div>

        {/* Right: Save Attendance Button */}
        {isAlreadyRecorded && !isEditMode ? (
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Attendance Saved for this Date</span>
            </div>
            <button
              type="button"
              onClick={() => onToggleEditMode?.(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Attendance</span>
            </button>
          </div>
        ) : isAlreadyRecorded && isEditMode ? (
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => onToggleEditMode?.(false)}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onOpenReviewModal}
              className="inline-flex items-center space-x-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-glow-blue transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Update Attendance</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenReviewModal}
            className="inline-flex items-center space-x-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-glow-blue transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Attendance</span>
          </button>
        )}
      </div>
    </div>
  );
};
