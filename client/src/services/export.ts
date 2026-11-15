// ==============================================================================
// Z Institute Management System - Data Portability & In-App Export Service
// Aligned with Migration 0006 (Monthly Fee Engine & Advance Fee Module)
// ==============================================================================

import { supabase } from '../lib/supabase';
import { getStudents } from './students';
import { getFeeSummaries } from './fees';
import type { FeeStatus, AdvanceStatus } from '../types/database';

/**
 * Triggers a native browser file download for text/blob data.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return;
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Escapes fields for CSV compliance (RFC 4180).
 */
export function escapeCsvField(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates and downloads a complete system data dump in structured JSON format.
 * Includes students, monthly fee dues, fee payment ledger, advance deposits,
 * outbox notifications, and attendance logs.
 */
export async function exportCompleteSystemJson(): Promise<{ recordCount: number; filename: string }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `z_institute_system_backup_${timestamp}.json`;

  // Fetch all students
  const studentsRes = await getStudents({ pageSize: 5000 });
  const students = studentsRes.data;

  // Fetch aggregate fee summaries (legacy course fee view)
  const feeSummariesRes = await getFeeSummaries({ pageSize: 5000 });
  const feeSummaries = feeSummariesRes.data;

  // Fetch all fee periods
  const { data: periodsData } = await supabase
    .from('fee_periods')
    .select('*')
    .order('period_key', { ascending: true });

  // Fetch all monthly fee dues
  const { data: monthlyDuesData } = await supabase
    .from('monthly_fee_dues')
    .select('*')
    .order('created_at', { ascending: false });

  // Fetch all advance fee records
  const { data: advancesData } = await supabase
    .from('advance_fee_records')
    .select('*')
    .order('created_at', { ascending: false });

  // Fetch all fee payments (immutable ledger)
  const { data: paymentsData, error: paymentsError } = await supabase
    .from('fee_payments')
    .select('*')
    .order('payment_date', { ascending: false });

  if (paymentsError) {
    throw new Error(`Failed to export fee payments: ${paymentsError.message}`);
  }

  // Fetch all attendance logs
  const { data: attendanceData, error: attendanceError } = await supabase
    .from('attendance')
    .select('*')
    .order('date', { ascending: false });

  if (attendanceError) {
    throw new Error(`Failed to export attendance logs: ${attendanceError.message}`);
  }

  // Fetch email outbox notifications
  const { data: outboxData } = await supabase
    .from('email_outbox')
    .select('*')
    .order('created_at', { ascending: false });

  const exportPayload = {
    metadata: {
      institute_name: 'Z Institute',
      export_type: 'full_system_json_portability',
      generated_at: new Date().toISOString(),
      version: '2.0.0-monthly-fee-engine',
    },
    students,
    fee_periods: periodsData || [],
    monthly_fee_dues: monthlyDuesData || [],
    advance_fee_records: advancesData || [],
    fee_summaries: feeSummaries,
    fee_payments: paymentsData || [],
    email_outbox: outboxData || [],
    attendance: attendanceData || [],
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  downloadFile(jsonString, filename, 'application/json;charset=utf-8');

  const totalRecords =
    students.length +
    (periodsData?.length || 0) +
    (monthlyDuesData?.length || 0) +
    (advancesData?.length || 0) +
    (paymentsData?.length || 0) +
    (outboxData?.length || 0) +
    (attendanceData?.length || 0);

  return { recordCount: totalRecords, filename };
}

/**
 * Generates and downloads the student directory with fee details as CSV.
 */
export async function exportStudentsCsv(): Promise<{ recordCount: number; filename: string }> {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `z_institute_students_${timestamp}.csv`;

  const feeSummariesRes = await getFeeSummaries({ pageSize: 5000 });
  const records = feeSummariesRes.data;

  const headers = [
    'Admission ID',
    'Student Name',
    'Phone',
    'Course',
    'Monthly Tuition Fee (INR)',
    'Paid Fee (INR)',
    'Balance (INR)',
    'Fee Status',
    'Lifecycle Status',
    'Enrolled Date',
  ];

  const rows = records.map((r) => [
    escapeCsvField(r.admission_id),
    escapeCsvField(r.name),
    escapeCsvField(r.phone),
    escapeCsvField(r.course),
    escapeCsvField(r.total_fee),
    escapeCsvField(r.total_paid),
    escapeCsvField(r.balance_due),
    escapeCsvField(r.fee_status),
    escapeCsvField(r.status),
    escapeCsvField(r.joining_date ? r.joining_date.split('T')[0] : ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8');

  return { recordCount: records.length, filename };
}

/**
 * Generates and downloads month-wise student dues from public.monthly_due_status_view as CSV.
 * Includes student identifiers, applicable fee snapshot, advance applied, normal payment,
 * balance remaining, and payment status.
 */
export async function exportMonthlyDuesCsv(options?: {
  periodKey?: string;
  status?: FeeStatus | 'all';
  query?: string;
}): Promise<{ recordCount: number; filename: string }> {
  const timestamp = new Date().toISOString().split('T')[0];
  const periodLabel = options?.periodKey && options.periodKey !== 'all' ? options.periodKey : 'all_months';
  const filename = `z_institute_monthly_dues_${periodLabel}_${timestamp}.csv`;

  let queryBuilder = supabase
    .from('monthly_due_status_view')
    .select('*')
    .order('period_key', { ascending: false })
    .order('student_name', { ascending: true });

  if (options?.periodKey && options.periodKey !== 'all') {
    queryBuilder = queryBuilder.eq('period_key', options.periodKey);
  }

  if (options?.status && options.status !== 'all') {
    queryBuilder = queryBuilder.eq('status', options.status);
  }

  const { data: dues, error } = await queryBuilder;
  if (error) {
    throw new Error(`Failed to export monthly dues: ${error.message}`);
  }

  let filteredDues = dues || [];
  if (options?.query && options.query.trim()) {
    const q = options.query.toLowerCase().trim();
    filteredDues = filteredDues.filter(
      (d) =>
        d.student_name?.toLowerCase().includes(q) ||
        d.admission_id?.toLowerCase().includes(q) ||
        d.student_phone?.toLowerCase().includes(q) ||
        d.student_course?.toLowerCase().includes(q)
    );
  }

  const headers = [
    'Admission ID',
    'Student Name',
    'Course',
    'Phone',
    'Email',
    'Fee Period',
    'Period Key',
    'Monthly Fee Snapshot (INR)',
    'Advance Offset (INR)',
    'Normal Paid (INR)',
    'Total Settled (INR)',
    'Balance Remaining (INR)',
    'Fee Status',
    'Is Arrears',
    'Due Date',
  ];

  const rows = filteredDues.map((d) => [
    escapeCsvField(d.admission_id),
    escapeCsvField(d.student_name),
    escapeCsvField(d.student_course),
    escapeCsvField(d.student_phone),
    escapeCsvField(d.student_email || ''),
    escapeCsvField(d.period_name),
    escapeCsvField(d.period_key),
    escapeCsvField(d.fee_snapshot),
    escapeCsvField(d.advance_applied_amount),
    escapeCsvField(d.normal_paid_amount),
    escapeCsvField(d.total_settled_amount),
    escapeCsvField(d.balance_remaining),
    escapeCsvField(d.status),
    escapeCsvField(d.is_arrears ? 'YES' : 'NO'),
    escapeCsvField(d.due_date ? d.due_date.split('T')[0] : ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8');

  return { recordCount: filteredDues.length, filename };
}

/**
 * Generates and downloads advance tuition fee records from public.advance_fee_records as CSV.
 * Includes student info, target month, monthly ceiling, deposit amount, and email status.
 */
export async function exportAdvancesCsv(options?: {
  status?: AdvanceStatus | 'active' | 'all';
  query?: string;
}): Promise<{ recordCount: number; filename: string }> {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `z_institute_advance_deposits_${timestamp}.csv`;

  let queryBuilder = supabase
    .from('advance_fee_records')
    .select('*, students(id, name, admission_id, phone, course, total_fee), fee_periods(id, period_key, period_name), email_outbox(status, recipient_email)')
    .order('created_at', { ascending: false });

  if (options?.status && options.status !== 'all') {
    if (options.status === 'active') {
      queryBuilder = queryBuilder.in('status', ['Upcoming', 'Partially Applied']);
    } else {
      queryBuilder = queryBuilder.eq('status', options.status);
    }
  }

  const { data: advances, error } = await queryBuilder;
  if (error) {
    throw new Error(`Failed to export advance fees: ${error.message}`);
  }

  let filteredAdvances = (advances as any[]) || [];
  if (options?.query && options.query.trim()) {
    const q = options.query.toLowerCase().trim();
    filteredAdvances = filteredAdvances.filter(
      (a) =>
        a.students?.name?.toLowerCase().includes(q) ||
        a.students?.admission_id?.toLowerCase().includes(q) ||
        a.students?.phone?.toLowerCase().includes(q) ||
        a.students?.course?.toLowerCase().includes(q)
    );
  }

  const headers = [
    'Advance ID',
    'Date Recorded',
    'Admission ID',
    'Student Name',
    'Course',
    'Phone',
    'Target Fee Period',
    'Target Period Key',
    'Monthly Fee Ceiling (INR)',
    'Advance Deposited (INR)',
    'Status',
    'Email Delivery Status',
    'Void Reason',
    'Reversal Payment ID',
  ];

  const rows = filteredAdvances.map((a) => {
    const emailStatus = a.email_outbox && a.email_outbox.length > 0 ? a.email_outbox[0].status : 'none';
    return [
      escapeCsvField(a.id),
      escapeCsvField(a.created_at ? a.created_at.split('T')[0] : ''),
      escapeCsvField(a.students?.admission_id || ''),
      escapeCsvField(a.students?.name || ''),
      escapeCsvField(a.students?.course || ''),
      escapeCsvField(a.students?.phone || ''),
      escapeCsvField(a.fee_periods?.period_name || ''),
      escapeCsvField(a.fee_periods?.period_key || ''),
      escapeCsvField(a.students?.total_fee || 0),
      escapeCsvField(a.amount_received),
      escapeCsvField(a.status),
      escapeCsvField(emailStatus),
      escapeCsvField(a.void_reason || ''),
      escapeCsvField(a.reversal_payment_id || ''),
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8');

  return { recordCount: filteredAdvances.length, filename };
}

/**
 * Generates and downloads the financial payments ledger as CSV.
 */
export async function exportPaymentsCsv(): Promise<{ recordCount: number; filename: string }> {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `z_institute_fee_ledger_${timestamp}.csv`;

  const { data: payments, error } = await supabase
    .from('fee_payments')
    .select(`
      id,
      student_id,
      amount,
      payment_date,
      payment_mode,
      receipt_number,
      remarks,
      is_reversal,
      void_reason,
      reversal_of_id,
      created_at,
      students (
        admission_id,
        name,
        course
      )
    `)
    .order('payment_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to export payments: ${error.message}`);
  }

  const headers = [
    'Transaction ID',
    'Payment Date',
    'Admission ID',
    'Student Name',
    'Course',
    'Amount (INR)',
    'Payment Mode',
    'Receipt No',
    'Is Reversal',
    'Reversal Reason',
    'Remarks',
  ];

  const rows = (payments || []).map((p: any) => {
    const student = p.students || {};
    return [
      escapeCsvField(p.id),
      escapeCsvField(p.payment_date ? p.payment_date.split('T')[0] : ''),
      escapeCsvField(student.admission_id || ''),
      escapeCsvField(student.name || ''),
      escapeCsvField(student.course || ''),
      escapeCsvField(p.amount),
      escapeCsvField(p.payment_mode),
      escapeCsvField(p.receipt_number || ''),
      escapeCsvField(p.is_reversal ? 'YES' : 'NO'),
      escapeCsvField(p.void_reason || ''),
      escapeCsvField(p.remarks || ''),
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8');

  return { recordCount: (payments || []).length, filename };
}

/**
 * Generates and downloads attendance logs as CSV.
 */
export async function exportAttendanceCsv(): Promise<{ recordCount: number; filename: string }> {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `z_institute_attendance_logs_${timestamp}.csv`;

  const { data: records, error } = await supabase
    .from('attendance')
    .select(`
      id,
      date,
      status,
      remarks,
      created_at,
      students (
        admission_id,
        name,
        course
      )
    `)
    .order('date', { ascending: false });

  if (error) {
    throw new Error(`Failed to export attendance: ${error.message}`);
  }

  const headers = [
    'Attendance ID',
    'Date',
    'Admission ID',
    'Student Name',
    'Course',
    'Status',
    'Remarks',
  ];

  const rows = (records || []).map((r: any) => {
    const student = r.students || {};
    return [
      escapeCsvField(r.id),
      escapeCsvField(r.date),
      escapeCsvField(student.admission_id || ''),
      escapeCsvField(student.name || ''),
      escapeCsvField(student.course || ''),
      escapeCsvField(r.status ? r.status.toUpperCase() : ''),
      escapeCsvField(r.remarks || ''),
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8');

  return { recordCount: (records || []).length, filename };
}
