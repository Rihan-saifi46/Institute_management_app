// ==============================================================================
// Z Institute Management System - Data Portability & In-App Export Service
// ==============================================================================

import { supabase } from '../lib/supabase';
import { getStudents } from './students';
import { getFeeSummaries } from './fees';

/**
 * Triggers a native browser file download for text/blob data.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
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
 * Includes students, fee payment ledger, and attendance history.
 */
export async function exportCompleteSystemJson(): Promise<{ recordCount: number; filename: string }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `z_institute_system_backup_${timestamp}.json`;

  // Fetch all active and past students
  const studentsRes = await getStudents({ pageSize: 5000 });
  const students = studentsRes.data;

  // Fetch all fee summaries
  const feeSummariesRes = await getFeeSummaries({ pageSize: 5000 });
  const feeSummaries = feeSummariesRes.data;

  // Fetch all fee payments
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

  const exportPayload = {
    metadata: {
      institute_name: 'Z Institute',
      export_type: 'full_system_json_portability',
      generated_at: new Date().toISOString(),
      version: '1.0.0-mvp',
    },
    students,
    fee_summaries: feeSummaries,
    fee_payments: paymentsData || [],
    attendance: attendanceData || [],
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  downloadFile(jsonString, filename, 'application/json;charset=utf-8');

  const totalRecords =
    students.length + (paymentsData?.length || 0) + (attendanceData?.length || 0);

  return { recordCount: totalRecords, filename };
}

/**
 * Generates and downloads the student directory with fee statuses as CSV.
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
    'Total Fee (INR)',
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
      receipt_no,
      remarks,
      is_reversal,
      reversal_reason,
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
      escapeCsvField(p.receipt_no || ''),
      escapeCsvField(p.is_reversal ? 'YES' : 'NO'),
      escapeCsvField(p.reversal_reason || ''),
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
