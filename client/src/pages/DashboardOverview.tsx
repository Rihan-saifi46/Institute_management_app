// ==============================================================================
// Z Institute Management System - Dashboard Overview View (Matches Reference 2)
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { BooksGraduationCapIllustration } from '../components/common/illustrations/BooksGraduationCapIllustration';
import { SparklineCurve } from '../components/common/illustrations/SparklineCurve';
import { StudentFilters } from '../components/students/StudentFilters';
import { StudentTable } from '../components/students/StudentTable';
import { AddStudentModal } from '../components/students/AddStudentModal';
import { EditStudentModal } from '../components/students/EditStudentModal';
import { DeleteStudentModal } from '../components/students/DeleteStudentModal';
import {
  getStudents,
  getDistinctCourses,
  type Student,
} from '../services/students';
import { supabase } from '../lib/supabase';
import type { PaginatedResult } from '../types/common';
import {
  Users,
  CreditCard,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const DashboardOverview: React.FC = () => {
  const { adminProfile, user } = useAuth();
  const displayName = adminProfile?.full_name || user?.email?.split('@')[0] || 'Administrator';

  // Metrics state
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    collectedFees: 0,
    pendingFees: 0,
    thisMonthFees: 0,
  });

  // Students filter & data state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsResult, setStudentsResult] = useState<PaginatedResult<Student> | null>(null);
  const [existingCourses, setExistingCourses] = useState<string[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Format today's date (e.g. "Monday, 15 Nov 2026")
  const formattedToday = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Load high-level institute KPI metrics
  const loadMetrics = useCallback(async () => {
    try {
      // 1. Total Students
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      // 2. Fee Aggregates from student_fee_summary
      const { data: feeSummaries } = await supabase
        .from('student_fee_summary')
        .select('total_paid, balance_due');

      let totalCollected = 0;
      let totalPending = 0;
      if (feeSummaries && feeSummaries.length > 0) {
        for (const row of feeSummaries) {
          totalCollected += Number(row.total_paid || 0);
          totalPending += Number(row.balance_due || 0);
        }
      }

      // 3. This month's collected dues
      const currentMonthPrefix = new Date().toISOString().substring(0, 7);
      const { data: monthPayments } = await supabase
        .from('fee_payments')
        .select('amount, payment_date, is_reversal')
        .gte('payment_date', `${currentMonthPrefix}-01`)
        .lte('payment_date', `${currentMonthPrefix}-31`);

      let thisMonthAmount = 0;
      if (monthPayments && monthPayments.length > 0) {
        for (const p of monthPayments) {
          if (!p.is_reversal) {
            thisMonthAmount += Number(p.amount || 0);
          }
        }
      }

      setMetrics({
        totalStudents: studentCount || 0,
        collectedFees: totalCollected,
        pendingFees: totalPending,
        thisMonthFees: thisMonthAmount,
      });
    } catch (err) {
      console.warn('[DashboardOverview] Metrics fetch failed:', err);
    }
  }, []);

  // Fetch courses list
  const loadCourses = useCallback(async () => {
    try {
      const courses = await getDistinctCourses();
      setExistingCourses(courses);
    } catch (err) {
      console.warn('[DashboardOverview] Failed to fetch courses:', err);
    }
  }, []);

  // Fetch student records
  const loadStudents = useCallback(async () => {
    setIsLoadingStudents(true);
    try {
      const result = await getStudents({
        query: searchQuery,
        course: selectedCourse,
        status: 'all',
        page: currentPage,
        pageSize: 10,
      });
      setStudentsResult(result);
    } catch (err) {
      console.error('[DashboardOverview] Failed to fetch students:', err);
    } finally {
      setIsLoadingStudents(false);
    }
  }, [searchQuery, selectedCourse, currentPage]);

  useEffect(() => {
    loadMetrics();
    loadCourses();
  }, [loadMetrics, loadCourses]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleStudentCreated = (newStudent: Student) => {
    showToast(`Student ${newStudent.name} (${newStudent.admission_id}) enrolled successfully!`);
    loadStudents();
    loadCourses();
    loadMetrics();
  };

  const handleStudentUpdated = (updated: Student) => {
    showToast(`Updated profile for ${updated.name} (${updated.admission_id}).`);
    loadStudents();
    loadCourses();
  };

  const handleStudentDeleted = () => {
    showToast('Student record removed successfully.');
    loadStudents();
    loadCourses();
    loadMetrics();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center space-x-2.5 text-xs font-semibold shadow-xs transition-all ${
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

      {/* 1. Hero / Welcome Banner (Matches Reference 2) */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#0D5BE1] via-[#1A73E8] to-[#2B87FF] text-white p-6 sm:p-9 shadow-lg overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left Welcome Copy */}
        <div className="relative z-10 max-w-xl space-y-3">
          <h2 className="text-2xl sm:text-3.5xl font-extrabold tracking-tight">
            Welcome back, {displayName}! 👋
          </h2>
          <p className="text-sm sm:text-base text-blue-100 font-normal leading-relaxed">
            Manage your institute efficiently with Z Institute Management System.
          </p>

          <div className="pt-2">
            <span className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-black/15 backdrop-blur-md text-xs font-semibold border border-white/10 text-white shadow-2xs">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedToday}</span>
            </span>
          </div>
        </div>

        {/* Right 3D Graduation & Books Illustration */}
        <div className="relative z-10 shrink-0 self-center md:self-auto">
          <BooksGraduationCapIllustration className="w-60 h-44 sm:w-72 sm:h-48" />
        </div>
      </div>

      {/* 2. 4 Modern KPI Summary Cards with Sparklines (Matches Reference 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total Students */}
        <div className="relative bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
              <Users className="w-6 h-6" />
            </div>
            <SparklineCurve color="blue" className="w-24 h-10" />
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400">Total Students</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-800">
                {metrics.totalStudents}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold text-emerald-600 bg-emerald-50">
                ↑ +1
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Collected Fees */}
        <div className="relative bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs">
              <CreditCard className="w-6 h-6" />
            </div>
            <SparklineCurve color="emerald" className="w-24 h-10" />
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400">Collected Fees</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-800">
                {formatCurrency(metrics.collectedFees)}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold text-emerald-600 bg-emerald-50">
                ↑ +12%
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Pending Fees */}
        <div className="relative bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs">
              <Calendar className="w-6 h-6" />
            </div>
            <SparklineCurve color="amber" className="w-24 h-10" />
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400">Pending Fees</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-800">
                {formatCurrency(metrics.pendingFees)}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold text-amber-600 bg-amber-50">
                ↑ +0%
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: This Month */}
        <div className="relative bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-2xs">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <SparklineCurve color="purple" className="w-24 h-10" />
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400">This Month</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-800">
                {formatCurrency(metrics.thisMonthFees)}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold text-emerald-600 bg-emerald-50">
                ↑ +8%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Students Management Table Section (Directly on Overview, Matches Reference 2) */}
      <div className="space-y-4">
        {/* Section Header with Title and Search/Filters/Add button */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Students Management
              </h3>
              <p className="text-xs text-slate-400">
                View and manage all enrolled students
              </p>
            </div>
          </div>

          {/* Search, Course Filter & Add Student */}
          <StudentFilters
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setCurrentPage(1);
            }}
            selectedCourse={selectedCourse}
            onCourseChange={(c) => {
              setSelectedCourse(c);
              setCurrentPage(1);
            }}
            coursesList={existingCourses}
            onOpenAddModal={() => setIsAddModalOpen(true)}
          />
        </div>

        {/* Data Table */}
        <StudentTable
          studentsResult={studentsResult}
          isLoading={isLoadingStudents}
          onPageChange={setCurrentPage}
          onEditStudent={(s) => setEditingStudent(s)}
          onDeleteStudent={(s) => setDeletingStudent(s)}
          onOpenAddModal={() => setIsAddModalOpen(true)}
        />
      </div>

      {/* Modal Dialogs */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onStudentCreated={handleStudentCreated}
        existingCourses={existingCourses}
      />

      <EditStudentModal
        isOpen={Boolean(editingStudent)}
        student={editingStudent}
        onClose={() => setEditingStudent(null)}
        onStudentUpdated={handleStudentUpdated}
        existingCourses={existingCourses}
      />

      <DeleteStudentModal
        isOpen={Boolean(deletingStudent)}
        student={deletingStudent}
        onClose={() => setDeletingStudent(null)}
        onStudentDeleted={handleStudentDeleted}
      />
    </div>
  );
};
