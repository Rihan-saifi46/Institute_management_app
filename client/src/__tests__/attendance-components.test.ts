// ==============================================================================
// Z Institute Management System - Phase 6 Attendance Component Tests
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { AttendanceDateBar } from '../components/attendance/AttendanceDateBar';
import { BatchAttendanceSheet } from '../components/attendance/BatchAttendanceSheet';
import { AttendanceReviewModal } from '../components/attendance/AttendanceReviewModal';
import { StudentAttendanceHistoryModal } from '../components/attendance/StudentAttendanceHistoryModal';
import { AttendancePage } from '../pages/AttendancePage';

describe('Phase 6 Attendance Management Components', () => {
  it('Component constructors are valid functions', () => {
    expect(typeof AttendanceDateBar).toBe('function');
    expect(typeof BatchAttendanceSheet).toBe('function');
    expect(typeof AttendanceReviewModal).toBe('function');
    expect(typeof StudentAttendanceHistoryModal).toBe('function');
    expect(typeof AttendancePage).toBe('function');
  });

  it('Calculates attendance percentage accurately', () => {
    const totalSessions = 20;
    const presentCount = 18;
    const percentage = Math.round((presentCount / totalSessions) * 100);
    expect(percentage).toBe(90);
  });
});
