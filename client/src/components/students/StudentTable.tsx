// ==============================================================================
// Z Institute Management System - Student Table Component
// ==============================================================================

import React from 'react';
import {
  Edit2,
  Trash2,
  Eye,
  Users,
  ChevronLeft,
  ChevronRight,
  Phone,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { StudentStatusBadge } from './StudentStatusBadge';
import type { Student } from '../../services/students';
import type { PaginatedResult } from '../../types/common';

interface StudentTableProps {
  studentsResult: PaginatedResult<Student> | null;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (student: Student) => void;
  onOpenAddModal: () => void;
  onViewStudent?: (student: Student) => void;
}

const avatarGradients = [
  'from-blue-500 to-blue-600',
  'from-purple-500 to-indigo-600',
  'from-sky-500 to-blue-500',
  'from-indigo-500 to-purple-600',
  'from-violet-500 to-purple-500',
];

export const StudentTable: React.FC<StudentTableProps> = ({
  studentsResult,
  isLoading,
  onPageChange,
  onEditStudent,
  onDeleteStudent,
  onOpenAddModal,
  onViewStudent,
}) => {
  // Format currency in Indian Rupees (INR)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date (e.g. "15 Nov 2026")
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-8 space-y-4">
          <div className="h-6 bg-slate-100 rounded-md w-1/4 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const students = studentsResult?.data || [];
  const totalCount = studentsResult?.count || 0;
  const currentPage = studentsResult?.page || 1;
  const totalPages = studentsResult?.totalPages || 1;
  const pageSize = studentsResult?.pageSize || 15;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto mb-4 shadow-2xs">
          <Users className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-900">No students found</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          No student records matched your search query or filter criteria. You can clear filters or enroll a new student.
        </p>
        <button
          type="button"
          onClick={onOpenAddModal}
          className="mt-5 inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
        >
          <span>+ Add Student</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm flex flex-col">
      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#EEF4FF] border-b border-blue-100/60 text-[11px] font-bold text-[#10234F] tracking-wide">
              <th scope="col" className="py-3.5 px-4 text-center w-12">#</th>
              <th scope="col" className="py-3.5 px-4">Admission ID</th>
              <th scope="col" className="py-3.5 px-4">Student Name</th>
              <th scope="col" className="py-3.5 px-4">Phone</th>
              <th scope="col" className="py-3.5 px-4">Course</th>
              <th scope="col" className="py-3.5 px-4">Joining Date</th>
              <th scope="col" className="py-3.5 px-4 text-right">Monthly Fee</th>
              <th scope="col" className="py-3.5 px-4 text-center">Status</th>
              <th scope="col" className="py-3.5 px-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((student, idx) => {
              const rowNumber = (currentPage - 1) * pageSize + idx + 1;
              const grad = avatarGradients[idx % avatarGradients.length];
              const initial = student.name ? student.name.charAt(0).toUpperCase() : '?';

              return (
                <tr
                  key={student.id}
                  className="hover:bg-blue-50/30 transition-colors group"
                >
                  {/* Row # */}
                  <td className="py-4 px-4 text-center text-slate-400 font-medium">
                    {rowNumber}
                  </td>

                  {/* Admission ID */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100/60">
                      {student.admission_id}
                    </span>
                  </td>

                  {/* Name with Circular Avatar */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${grad} text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0`}>
                        {initial}
                      </div>
                      <span className="font-bold text-slate-800 text-sm">
                        {student.name}
                      </span>
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="py-4 px-4 text-slate-600 whitespace-nowrap font-medium">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{student.phone}</span>
                    </div>
                  </td>

                  {/* Course */}
                  <td className="py-4 px-4 text-slate-700 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                      <span className="font-semibold text-slate-700">{student.course}</span>
                    </div>
                  </td>

                  {/* Joining Date */}
                  <td className="py-4 px-4 text-slate-500 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(student.joining_date)}</span>
                    </div>
                  </td>

                  {/* Monthly Fee */}
                  <td className="py-4 px-4 text-right font-bold text-slate-800 whitespace-nowrap text-sm">
                    {formatCurrency(student.total_fee)}
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    <StudentStatusBadge status={student.status} />
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-6 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center space-x-1.5">
                      {/* View Action */}
                      <button
                        type="button"
                        onClick={() => (onViewStudent ? onViewStudent(student) : onEditStudent(student))}
                        className="p-1.5 text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 rounded-lg transition-colors"
                        title="View student profile"
                        aria-label={`View ${student.name}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Edit Action */}
                      <button
                        type="button"
                        onClick={() => onEditStudent(student)}
                        className="p-1.5 text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Edit student"
                        aria-label={`Edit ${student.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete Action */}
                      <button
                        type="button"
                        onClick={() => onDeleteStudent(student)}
                        className="p-1.5 text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                        title="Delete student"
                        aria-label={`Delete ${student.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing <span className="font-bold text-slate-800">{totalCount > 0 ? `${startItem}-${endItem}` : '0'}</span> of{' '}
          <span className="font-bold text-slate-800">{totalCount}</span> students
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs shadow-2xs">
            {currentPage}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
