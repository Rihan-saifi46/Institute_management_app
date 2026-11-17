// ==============================================================================
// Z Institute Management System - Daily Batch Attendance Page (Matches Reference 1)
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { AttendanceDateBar } from '../components/attendance/AttendanceDateBar';
import { BatchAttendanceSheet } from '../components/attendance/BatchAttendanceSheet';
import { AttendanceReviewModal } from '../components/attendance/AttendanceReviewModal';
import { StudentAttendanceHistoryModal } from '../components/attendance/StudentAttendanceHistoryModal';
import { ClipboardAttendanceIllustration } from '../components/common/illustrations/ClipboardAttendanceIllustration';
import {
  getStudents,
  getDistinctCourses,
  type Student,
} from '../services/students';
import {
  getAttendanceForDate,
  saveBatchAttendance,
  type BatchAttendanceItem,
} from '../services/attendance';
import type { AttendanceStatus } from '../types/database';
import { CheckCircle2, CalendarCheck } from 'lucide-react';

export const AttendancePage: React.FC = () => {
  // Today's date in YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [activeStudents, setActiveStudents] = useState<Student[]>([]);
  const [coursesList, setCoursesList] = useState<string[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [isAlreadyRecorded, setIsAlreadyRecorded] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent'>('all');

  // Student history modal state
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Load active students and distinct courses
  const loadInitialData = useCallback(async () => {
    try {
      const [studentsRes, coursesRes] = await Promise.all([
        getStudents({ status: 'active', pageSize: 1000 }),
        getDistinctCourses(),
      ]);
      setActiveStudents(studentsRes.data);
      setCoursesList(coursesRes);
    } catch (err: any) {
      console.error('[AttendancePage] Failed to fetch initial data:', err);
      setError(err.message || 'Failed to fetch student directory.');
    }
  }, []);

  // Fetch or initialize attendance for the selected date
  const loadAttendanceForDate = useCallback(async (date: string, students: Student[]) => {
    setIsLoading(true);
    setError(null);
    setIsEditMode(false);
    try {
      const existingRecords = await getAttendanceForDate(date);

      if (existingRecords.length > 0) {
        const map: Record<string, AttendanceStatus> = {};
        for (const rec of existingRecords) {
          map[rec.student_id] = rec.status;
        }

        for (const s of students) {
          if (!map[s.id]) {
            map[s.id] = 'present';
          }
        }

        setAttendanceMap(map);
        setIsAlreadyRecorded(true);
      } else {
        const defaultMap: Record<string, AttendanceStatus> = {};
        for (const s of students) {
          defaultMap[s.id] = 'present';
        }

        setAttendanceMap(defaultMap);
        setIsAlreadyRecorded(false);
      }
    } catch (err: any) {
      console.error('[AttendancePage] Failed to load date attendance:', err);
      setError(err.message || 'Failed to load attendance records for selected date.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (activeStudents.length > 0) {
      loadAttendanceForDate(selectedDate, activeStudents);
    } else {
      setIsLoading(false);
    }
  }, [selectedDate, activeStudents, loadAttendanceForDate]);

  // Toggle single student status between present and absent
  const handleToggleStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  // Master toggle: mark all present or all absent
  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    for (const s of activeStudents) {
      updated[s.id] = status;
    }
    setAttendanceMap(updated);
  };

  // Submit batch attendance via atomic RPC
  const handleConfirmSave = async () => {
    setIsSaving(true);
    setSaveErrorMessage(null);

    const recordsToSave: BatchAttendanceItem[] = activeStudents.map((s) => ({
      student_id: s.id,
      status: attendanceMap[s.id] ?? 'present',
    }));

    try {
      const savedCount = await saveBatchAttendance(selectedDate, recordsToSave);
      setIsReviewModalOpen(false);
      setIsAlreadyRecorded(true);
      setIsEditMode(false);
      showToast(`Successfully saved attendance for ${savedCount} students on ${selectedDate}!`);
    } catch (err: any) {
      console.error('[AttendancePage] Error saving attendance:', err);
      setSaveErrorMessage(err.message || 'Failed to commit batch attendance.');
    } finally {
      setIsSaving(false);
    }
  };

  const presentCount = activeStudents.filter(
    (s) => (attendanceMap[s.id] ?? 'present') === 'present'
  ).length;
  const absentCount = activeStudents.filter((s) => attendanceMap[s.id] === 'absent').length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Daily Batch Attendance Hero Banner (Matches Reference 1) */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#0D5BE1] via-[#1A73E8] to-[#2B87FF] text-white p-6 sm:p-9 shadow-lg overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 max-w-xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-black/15 backdrop-blur-md text-xs font-semibold border border-white/10 text-white shadow-2xs">
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Real-time Attendance Tracking</span>
          </div>

          <h2 className="text-2xl sm:text-3.5xl font-extrabold tracking-tight">
            Daily Batch Attendance
          </h2>
          <p className="text-sm sm:text-base text-blue-100 font-normal leading-relaxed">
            Mark student class attendance in seconds with batch filtering and atomic updates.
          </p>
        </div>

        <div className="relative z-10 shrink-0 self-center md:self-auto">
          <ClipboardAttendanceIllustration className="w-60 h-44 sm:w-72 sm:h-48" />
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-2.5 text-xs font-semibold text-emerald-800 shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadAttendanceForDate(selectedDate, activeStudents)}
            className="text-xs font-bold underline ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Date Picker & Live Metric Counters Bar (Matches Reference 1) */}
      <AttendanceDateBar
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        isAlreadyRecorded={isAlreadyRecorded}
        totalStudents={activeStudents.length}
        presentCount={presentCount}
        absentCount={absentCount}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {/* 3. Interactive Batch Attendance Table (Matches Reference 1) */}
      <BatchAttendanceSheet
        students={activeStudents}
        attendanceMap={attendanceMap}
        onToggleStatus={handleToggleStatus}
        onMarkAll={handleMarkAll}
        onOpenReviewModal={() => {
          setSaveErrorMessage(null);
          setIsReviewModalOpen(true);
        }}
        coursesList={coursesList}
        isLoading={isLoading}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onViewStudentHistory={(student) => setHistoryStudent(student)}
        isAlreadyRecorded={isAlreadyRecorded}
        isEditMode={isEditMode}
        onToggleEditMode={setIsEditMode}
      />

      {/* Pre-Submission Review Modal */}
      <AttendanceReviewModal
        isOpen={isReviewModalOpen}
        date={selectedDate}
        students={activeStudents}
        attendanceMap={attendanceMap}
        onClose={() => setIsReviewModalOpen(false)}
        onConfirmSave={handleConfirmSave}
        isSaving={isSaving}
        errorMessage={saveErrorMessage}
      />

      {/* Individual Student Attendance History Modal */}
      <StudentAttendanceHistoryModal
        isOpen={historyStudent !== null}
        student={historyStudent}
        onClose={() => setHistoryStudent(null)}
      />
    </div>
  );
};
