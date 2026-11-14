// ==============================================================================
// Z Institute Management System - Attendance Service Layer
// ==============================================================================

import { supabase } from '../lib/supabase';
import type { Database, AttendanceStatus, Json } from '../types/database';

export type AttendanceRecord = Database['public']['Tables']['attendance']['Row'];

export interface AttendanceWithStudent extends AttendanceRecord {
  students?: {
    id: string;
    admission_id: string;
    name: string;
    course: string;
    status: string;
  } | null;
}

export interface BatchAttendanceItem {
  student_id: string;
  status: AttendanceStatus;
}

export interface AttendanceSummaryStats {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  attendancePercentage: number;
}

/**
 * Fetch date-wise attendance records for all students marked on that date,
 * including joined student profile data.
 */
export async function getAttendanceForDate(date: string): Promise<AttendanceWithStudent[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select(`
      id,
      student_id,
      date,
      status,
      created_at,
      updated_at,
      students (
        id,
        admission_id,
        name,
        course,
        status
      )
    `)
    .eq('date', date)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch attendance for date ${date}: ${error.message}`);
  }

  // Cast through unknown to accommodate nested PostgREST joined types
  return (data || []) as unknown as AttendanceWithStudent[];
}

/**
 * Fetch historical attendance records for an individual student.
 * Supports optional date range filtering.
 */
export async function getStudentAttendanceHistory(
  studentId: string,
  options: { startDate?: string; endDate?: string } = {}
): Promise<AttendanceRecord[]> {
  let query = supabase
    .from('attendance')
    .select('*')
    .eq('student_id', studentId);

  if (options.startDate) {
    query = query.gte('date', options.startDate);
  }
  if (options.endDate) {
    query = query.lte('date', options.endDate);
  }

  query = query.order('date', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch attendance history: ${error.message}`);
  }

  return data || [];
}

/**
 * Save batch attendance for multiple students on a specific date.
 * Calls the trusted database RPC 'mark_batch_attendance' to ensure 100% atomic
 * execution: upserts duplicate entries in-place and rolls back entirely if any error occurs.
 */
export async function saveBatchAttendance(
  date: string,
  records: BatchAttendanceItem[]
): Promise<number> {
  if (!records || records.length === 0) {
    return 0;
  }

  const { data, error } = await supabase.rpc('mark_batch_attendance', {
    p_date: date,
    p_records: records as unknown as Json,
  });

  if (error) {
    throw new Error(`Batch attendance failed: ${error.message}`);
  }

  return Number(data);
}

/**
 * Calculate attendance summary statistics (Total, Present, Absent, Percentage)
 * for an individual student.
 */
export async function getStudentAttendanceStats(
  studentId: string
): Promise<AttendanceSummaryStats> {
  const records = await getStudentAttendanceHistory(studentId);

  const totalSessions = records.length;
  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const attendancePercentage =
    totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

  return {
    totalSessions,
    presentCount,
    absentCount,
    attendancePercentage,
  };
}
