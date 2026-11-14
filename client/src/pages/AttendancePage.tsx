// ==============================================================================
// Z Institute Management System - Daily Batch Attendance Page
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { AttendanceDateBar } from '../components/attendance/AttendanceDateBar';
import { BatchAttendanceSheet } from '../components/attendance/BatchAttendanceSheet';
import { AttendanceReviewModal } from '../components/attendance/AttendanceReviewModal';
import { StudentAttendanceHistoryModal } from '../components/attendance/StudentAttendanceHistoryModal';
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
import { CheckCircle2 } from 'lucide-react';

export const AttendancePage: React.FC = () => {
  // Today's date in YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [activeStudents, setActiveStudents] = useState<Student[]>([]);
  const [coursesList, setCoursesList] = useState<string[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [isAlreadyRecorded, setIsAlreadyRecorded] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Student history modal state
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Load active students and distinct courses once
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
    try {
      const existingRecords = await getAttendanceForDate(date);

      if (existingRecords.length > 0) {
        // Records already exist: map each student to their database status
        const map: Record<string, AttendanceStatus> = {};
        for (const rec of existingRecords) {
          map[rec.student_id] = rec.status;
        }

        // For any student who doesn't have a record yet, default to present
        for (const s of students) {
          if (!map[s.id]) {
            map[s.id] = 'present';
          }
        }

        setAttendanceMap(map);
        setIsAlreadyRecorded(true);
      } else {
        // No records on database for this date yet: DEFAULT ALL ACTIVE STUDENTS TO PRESENT
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Daily Batch Attendance
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mark student class attendance in seconds with batch defaulting and atomic upserts
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2.5 text-xs font-semibold text-emerald-800 shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
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

      {/* Date Picker & Live Counters Bar */}
      <AttendanceDateBar
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        isAlreadyRecorded={isAlreadyRecorded}
        totalStudents={activeStudents.length}
        presentCount={presentCount}
        absentCount={absentCount}
      />

      {/* Interactive Batch Attendance Table */}
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
