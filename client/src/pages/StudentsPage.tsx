// ==============================================================================
// Z Institute Management System - Student Management Page View
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { StudentFilters } from '../components/students/StudentFilters';
import { StudentTable } from '../components/students/StudentTable';
import { AddStudentModal } from '../components/students/AddStudentModal';
import { EditStudentModal } from '../components/students/EditStudentModal';
import { DeleteStudentModal } from '../components/students/DeleteStudentModal';
import { BooksGraduationCapIllustration } from '../components/common/illustrations/BooksGraduationCapIllustration';
import {
  getStudents,
  getDistinctCourses,
  type Student,
} from '../services/students';
import type { StudentStatus } from '../types/database';
import type { PaginatedResult } from '../types/common';
import { CheckCircle2, AlertCircle, Users } from 'lucide-react';

export const StudentsPage: React.FC = () => {
  // Query & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StudentStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Data states
  const [studentsResult, setStudentsResult] = useState<PaginatedResult<Student> | null>(null);
  const [existingCourses, setExistingCourses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notification Banner
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Fetch courses list for suggestions
  const loadCourses = useCallback(async () => {
    try {
      const courses = await getDistinctCourses();
      setExistingCourses(courses);
    } catch (err) {
      console.warn('[StudentsPage] Failed to fetch courses list:', err);
    }
  }, []);

  // Fetch paginated student data
  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getStudents({
        query: searchQuery,
        course: selectedCourse,
        status: selectedStatus,
        page: currentPage,
        pageSize: 15,
      });
      setStudentsResult(result);
    } catch (err: any) {
      console.error('[StudentsPage] Error loading students:', err);
      setError(err.message || 'Failed to load students directory.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCourse, selectedStatus, currentPage]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Handlers for modal completions
  const handleStudentCreated = (newStudent: Student) => {
    showToast(`Student ${newStudent.name} (${newStudent.admission_id}) enrolled successfully!`);
    loadStudents();
    loadCourses();
  };

  const handleStudentUpdated = (updated: Student) => {
    showToast(`Updated profile for ${updated.name} (${updated.admission_id}).`);
    loadStudents();
    loadCourses();
  };

  const handleStudentDeleted = (_deletedId: string) => {
    showToast(`Student record removed successfully.`);
    loadStudents();
    loadCourses();
  };

  // Reset page to 1 when filters change
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  const handleCourseChange = (c: string) => {
    setSelectedCourse(c);
    setCurrentPage(1);
  };

  const handleStatusChange = (s: StudentStatus | 'all') => {
    setSelectedStatus(s);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#0D5BE1] via-[#1A73E8] to-[#2B87FF] text-white p-6 sm:p-9 shadow-lg overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 max-w-xl space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-black/15 backdrop-blur-md text-xs font-semibold text-white">
            <Users className="w-3.5 h-3.5" />
            <span>Admissions & Student Registry</span>
          </div>
          <h2 className="text-2xl sm:text-3.5xl font-extrabold tracking-tight">
            Students Management
          </h2>
          <p className="text-sm sm:text-base text-blue-100 font-normal leading-relaxed">
            View, filter, admit, and manage active student records and courses.
          </p>
        </div>

        <div className="relative z-10 shrink-0 self-center md:self-auto">
          <BooksGraduationCapIllustration className="w-56 h-40 sm:w-64 sm:h-44" />
        </div>
      </div>

      {/* Floating / Inline Toast Notification */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center space-x-2.5 text-xs font-semibold shadow-xs transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Error alert if fetch failed */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadStudents}
            className="text-xs font-bold underline ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters & Actions Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <StudentFilters
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          selectedCourse={selectedCourse}
          onCourseChange={handleCourseChange}
          selectedStatus={selectedStatus}
          onStatusChange={handleStatusChange}
          coursesList={existingCourses}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          totalStudents={studentsResult?.count || 0}
        />
      </div>

      {/* Student List Table */}
      <StudentTable
        studentsResult={studentsResult}
        isLoading={isLoading}
        onPageChange={setCurrentPage}
        onEditStudent={(student) => setEditingStudent(student)}
        onDeleteStudent={(student) => setDeletingStudent(student)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onStudentCreated={handleStudentCreated}
        existingCourses={existingCourses}
      />

      {/* Edit Student Modal */}
      <EditStudentModal
        isOpen={editingStudent !== null}
        student={editingStudent}
        onClose={() => setEditingStudent(null)}
        onStudentUpdated={handleStudentUpdated}
        existingCourses={existingCourses}
      />

      {/* Delete Confirmation Modal */}
      <DeleteStudentModal
        isOpen={deletingStudent !== null}
        student={deletingStudent}
        onClose={() => setDeletingStudent(null)}
        onStudentDeleted={handleStudentDeleted}
      />
    </div>
  );
};
