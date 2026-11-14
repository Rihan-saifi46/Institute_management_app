// ==============================================================================
// Z Institute Management System - Batch Attendance Sheet Component
// ==============================================================================

import React, { useState } from 'react';
import {
  Check,
  X,
  Search,
  Filter,
  Users,
  CheckCheck,
  XCircle,
  Save,
  History,
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
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('');

  // Calculate counts
  const presentCount = students.filter((s) => (attendanceMap[s.id] ?? 'present') === 'present').length;
  const absentCount = students.filter((s) => attendanceMap[s.id] === 'absent').length;

  // Client-side filtering of displayed students in the sheet
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
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs p-8 space-y-4">
        <div className="h-6 bg-slate-100 rounded-md w-1/4 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs">
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">No active students to mark</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          There are no students with active status in the system. Enroll students in the Student Directory before marking attendance.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col">
      {/* Master Toolbar, Filter Tabs & Search */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
        {/* Left: Search & Course Filter */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-lg">
          <div className="relative flex-1 min-w-[180px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Find student in sheet..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500 shadow-2xs"
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

          <div className="relative min-w-[130px]">
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="w-full pl-3 pr-7 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-500 appearance-none cursor-pointer shadow-2xs"
            >
              <option value="">All Courses</option>
              {coursesList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-slate-400">
              <Filter className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Center: Status Filter Tabs (View All, Present, or Absent) */}
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-200/70 shadow-2xs shrink-0 self-start xl:self-center">
          <button
            type="button"
            onClick={() => onStatusFilterChange?.('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({students.length})
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange?.('present')}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              statusFilter === 'present'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:text-emerald-900'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Present ({presentCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange?.('absent')}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              statusFilter === 'absent'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 hover:text-rose-900'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            <span>Absent ({absentCount})</span>
          </button>
        </div>

        {/* Right: Master Toggle Buttons */}
        <div className="flex items-center space-x-2 shrink-0 self-start xl:self-center">
          <button
            type="button"
            onClick={() => onMarkAll('present')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-2xs"
            title="Mark all enrolled students as Present for this date"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All Present</span>
          </button>

          <button
            type="button"
            onClick={() => onMarkAll('absent')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shadow-2xs"
            title="Mark all enrolled students as Absent for this date"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Mark All Absent</span>
          </button>
        </div>
      </div>

      {/* Interactive Sheet Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th scope="col" className="py-3 px-4 sm:px-6">Admission ID</th>
              <th scope="col" className="py-3 px-4">Student Name</th>
              <th scope="col" className="py-3 px-4">Course</th>
              <th scope="col" className="py-3 px-4 sm:px-6 text-center">Status</th>
              <th scope="col" className="py-3 px-4 sm:px-6 text-center">History</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400">
                  <p className="font-semibold text-slate-600">No students match current filter.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {statusFilter !== 'all'
                      ? `No students currently marked "${statusFilter}". Try switching to "All".`
                      : 'Try clearing your search keyword or course filter.'}
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
                    className={`transition-colors ${
                      isPresent ? 'hover:bg-slate-50/70' : 'bg-rose-50/30 hover:bg-rose-50/50'
                    }`}
                  >
                    {/* Admission ID */}
                    <td className="py-3 px-4 sm:px-6 font-mono font-bold text-brand-700 whitespace-nowrap">
                      {student.admission_id}
                    </td>

                    {/* Name & Phone */}
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onViewStudentHistory?.(student)}
                        className="text-left group hover:text-brand-600 transition-colors"
                        title="Click to view student attendance history"
                      >
                        <span className="font-semibold text-slate-900 group-hover:text-brand-600 group-hover:underline">
                          {student.name}
                        </span>
                        <span className="block text-[11px] font-normal text-slate-400 font-mono">
                          {student.phone}
                        </span>
                      </button>
                    </td>

                    {/* Course */}
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {student.course}
                    </td>

                    {/* Attendance Toggle Buttons */}
                    <td className="py-3 px-4 sm:px-6 text-center whitespace-nowrap">
                      <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 shadow-2xs">
                        {/* Present Option */}
                        <button
                          type="button"
                          onClick={() => onToggleStatus(student.id, 'present')}
                          className={`inline-flex items-center space-x-1 px-3 py-1 text-xs font-bold rounded-md transition-all ${
                            isPresent
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Present</span>
                        </button>

                        {/* Absent Option */}
                        <button
                          type="button"
                          onClick={() => onToggleStatus(student.id, 'absent')}
                          className={`inline-flex items-center space-x-1 px-3 py-1 text-xs font-bold rounded-md transition-all ${
                            !isPresent
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Absent</span>
                        </button>
                      </div>
                    </td>

                    {/* History Log Action */}
                    <td className="py-3 px-4 sm:px-6 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onViewStudentHistory?.(student)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-brand-700 bg-white hover:bg-brand-50 border border-slate-200 hover:border-brand-300 rounded-lg transition-colors shadow-2xs"
                        title={`View complete attendance log for ${student.name}`}
                      >
                        <History className="w-3.5 h-3.5 text-brand-600" />
                        <span className="hidden sm:inline">History</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Sticky Bottom Commit Bar */}
      <div className="sticky bottom-0 z-10 bg-white border-t border-slate-200 p-4 sm:px-6 flex items-center justify-between shadow-lg">
        <div className="text-xs text-slate-600 flex items-center space-x-3">
          <span>
            Total: <strong className="text-slate-900">{students.length}</strong>
          </span>
          <span className="text-emerald-700">
            Present: <strong>{presentCount}</strong>
          </span>
          <span className="text-rose-700">
            Absent: <strong>{absentCount}</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenReviewModal}
          className="inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-lg shadow-md hover:shadow-lg transition-all focus:outline-hidden focus:ring-2 focus:ring-brand-500"
        >
          <Save className="w-4 h-4" />
          <span>Save Attendance</span>
        </button>
      </div>
    </div>
  );
};
