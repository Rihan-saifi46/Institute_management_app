// ==============================================================================
// Z Institute Management System - Student Table Component
// ==============================================================================

import React from 'react';
import { Edit2, Trash2, Users, ChevronLeft, ChevronRight, Phone, BookOpen, Calendar } from 'lucide-react';
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
}

export const StudentTable: React.FC<StudentTableProps> = ({
  studentsResult,
  isLoading,
  onPageChange,
  onEditStudent,
  onDeleteStudent,
  onOpenAddModal,
}) => {
  // Format currency in Indian Rupees (INR)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
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
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-8 space-y-4">
          <div className="h-6 bg-slate-100 rounded-md w-1/4 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse" />
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

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <Users className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900">No students found</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          No student records matched your search query or filter criteria. You can clear filters or enroll a new student.
        </p>
        <button
          type="button"
          onClick={onOpenAddModal}
          className="mt-5 inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs transition-colors"
        >
          <span>Admit New Student</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col">
      {/* Responsive Table for Desktop & Tablet */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th scope="col" className="py-3 px-4 sm:px-6">Admission ID</th>
              <th scope="col" className="py-3 px-4">Student Name</th>
              <th scope="col" className="py-3 px-4">Phone</th>
              <th scope="col" className="py-3 px-4">Course</th>
              <th scope="col" className="py-3 px-4">Joining Date</th>
              <th scope="col" className="py-3 px-4 text-right">Total Fee</th>
              <th scope="col" className="py-3 px-4 text-center">Status</th>
              <th scope="col" className="py-3 px-4 sm:px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((student) => (
              <tr
                key={student.id}
                className="hover:bg-slate-50/60 transition-colors group"
              >
                {/* Admission ID */}
                <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-brand-700 whitespace-nowrap">
                  {student.admission_id}
                </td>

                {/* Name */}
                <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                  {student.name}
                </td>

                {/* Phone */}
                <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                  <div className="flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{student.phone}</span>
                  </div>
                </td>

                {/* Course */}
                <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                  <div className="flex items-center space-x-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">{student.course}</span>
                  </div>
                </td>

                {/* Joining Date */}
                <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDate(student.joining_date)}</span>
                  </div>
                </td>

                {/* Total Fee */}
                <td className="py-3.5 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                  {formatCurrency(student.total_fee)}
                </td>

                {/* Status */}
                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                  <StudentStatusBadge status={student.status} />
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end space-x-1">
                    <button
                      type="button"
                      onClick={() => onEditStudent(student)}
                      className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                      title="Edit student"
                      aria-label={`Edit ${student.name}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteStudent(student)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title="Delete student"
                      aria-label={`Delete ${student.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Page <span className="font-semibold text-slate-900">{currentPage}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalPages}</span> ({totalCount} total students)
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

