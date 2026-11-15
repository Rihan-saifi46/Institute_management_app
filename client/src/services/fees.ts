// ==============================================================================
// Z Institute Management System - Fees Management Service Layer
// Updated for Migration 0006: Monthly Fee Engine & Advance Fee Module
// ==============================================================================

import { supabase } from '../lib/supabase';
import type {
  Database,
  FeeStatus,
  PaymentMode,
  AdvanceStatus,
  OutboxStatus,
  Json
} from '../types/database';
import type { PaginatedResult } from '../types/common';

export type { AdvanceStatus, OutboxStatus };
export type StudentFeeSummary = Database['public']['Views']['student_fee_summary']['Row'];
export type FeePayment = Database['public']['Tables']['fee_payments']['Row'];
export type FeePaymentInsert = Database['public']['Tables']['fee_payments']['Insert'];
export type FeePeriod = Database['public']['Tables']['fee_periods']['Row'];
export type MonthlyDueStatusRecord = Database['public']['Views']['monthly_due_status_view']['Row'];
export type AdvanceFeeRecord = Database['public']['Tables']['advance_fee_records']['Row'];

export interface FeeSummaryFilterOptions {
  query?: string;
  status?: FeeStatus | 'all';
  page?: number;
  pageSize?: number;
}

export interface MonthlyDuesFilterOptions {
  periodKey?: string;
  query?: string;
  status?: FeeStatus | 'all';
  page?: number;
  pageSize?: number;
}

// ------------------------------------------------------------------------------
// Legacy Support: Aggregate Course Fee Summaries
// ------------------------------------------------------------------------------

/**
 * Fetch financial fee summaries from the student_fee_summary view (Historical course aggregate).
 */
export async function getFeeSummaries(
  options: FeeSummaryFilterOptions = {}
): Promise<PaginatedResult<StudentFeeSummary>> {
  const {
    query,
    status = 'all',
    page = 1,
    pageSize = 20,
  } = options;

  let queryBuilder = supabase
    .from('student_fee_summary')
    .select('*', { count: 'exact' });

  if (status && status !== 'all') {
    queryBuilder = queryBuilder.eq('fee_status', status);
  }

  if (query && query.trim().length > 0) {
    const cleanQuery = query.trim();
    queryBuilder = queryBuilder.or(
      `name.ilike.%${cleanQuery}%,admission_id.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  queryBuilder = queryBuilder
    .order('balance_due', { ascending: false })
    .range(from, to);

  const { data, count, error } = await queryBuilder;

  if (error) {
    throw new Error(`Failed to fetch fee summaries: ${error.message}`);
  }

  const totalCount = count || 0;
  return {
    data: data || [],
    count: totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

/**
 * Fetch a single student's fee summary by their student ID.
 */
export async function getStudentFeeSummary(studentId: string): Promise<StudentFeeSummary> {
  const { data, error } = await supabase
    .from('student_fee_summary')
    .select('*')
    .eq('id', studentId)
    .single();

  if (error) {
    throw new Error(`Fee summary not found for student: ${error.message}`);
  }

  return data;
}

/**
 * Fetch the complete, immutable payment history for an individual student.
 */
export async function getStudentPaymentHistory(studentId: string): Promise<FeePayment[]> {
  const { data, error } = await supabase
    .from('fee_payments')
    .select('*')
    .eq('student_id', studentId)
    .order('payment_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch payment history: ${error.message}`);
  }

  return data || [];
}

/**
 * Record a legacy fee payment installment into the immutable ledger.
 */
export async function recordPayment(payload: {
  student_id: string;
  amount: number;
  payment_date?: string;
  payment_mode?: PaymentMode;
  receipt_number?: string;
  remarks?: string;
}): Promise<FeePayment> {
  if (payload.amount <= 0) {
    throw new Error('Payment installment amount must be greater than zero');
  }

  const insertData: FeePaymentInsert = {
    student_id: payload.student_id,
    amount: Number(payload.amount),
    payment_mode: payload.payment_mode || 'cash',
    payment_date: payload.payment_date,
    receipt_number: payload.receipt_number ? payload.receipt_number.trim() : null,
    remarks: payload.remarks ? payload.remarks.trim() : null,
    is_reversal: false,
  };

  const { data, error } = await supabase
    .from('fee_payments')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record payment: ${error.message}`);
  }

  return data;
}

/**
 * Reverse an erroneous payment record via the secure stored database procedure.
 */
export async function reversePayment(params: {
  paymentId: string;
  reason: string;
}): Promise<string> {
  const cleanReason = params.reason.trim();
  if (cleanReason.length < 5) {
    throw new Error('A detailed justification reason (at least 5 characters) is mandatory to reverse a payment');
  }

  const { data, error } = await supabase.rpc('reverse_payment', {
    p_payment_id: params.paymentId,
    p_reason: cleanReason,
  });

  if (error) {
    throw new Error(`Reversal rejected by database: ${error.message}`);
  }

  return data as string;
}

// ------------------------------------------------------------------------------
// Monthly Fee Engine & Advance Module Service Methods (Migration 0006)
// ------------------------------------------------------------------------------

/**
 * Fetch all configured fee periods (Nov 2026 onwards).
 */
export async function getFeePeriods(): Promise<FeePeriod[]> {
  const { data, error } = await supabase
    .from('fee_periods')
    .select('*')
    .eq('is_active', true)
    .order('period_key', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch fee periods: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch month-wise student dues from the monthly_due_status_view.
 * Calculates snapshot, advance offsets, normal payments, and independent status in real-time.
 */
export async function getMonthlyDues(
  options: MonthlyDuesFilterOptions = {}
): Promise<PaginatedResult<MonthlyDueStatusRecord>> {
  const {
    periodKey,
    query,
    status = 'all',
    page = 1,
    pageSize = 20,
  } = options;

  let queryBuilder = supabase
    .from('monthly_due_status_view')
    .select('*', { count: 'exact' });

  if (periodKey) {
    queryBuilder = queryBuilder.eq('period_key', periodKey);
  }

  if (status && status !== 'all') {
    queryBuilder = queryBuilder.eq('status', status);
  }

  if (query && query.trim().length > 0) {
    const clean = query.trim();
    queryBuilder = queryBuilder.or(
      `student_name.ilike.%${clean}%,admission_id.ilike.%${clean}%,student_phone.ilike.%${clean}%`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  queryBuilder = queryBuilder
    .order('balance_remaining', { ascending: false })
    .range(from, to);

  const { data, count, error } = await queryBuilder;

  if (error) {
    throw new Error(`Failed to fetch monthly dues: ${error.message}`);
  }

  const totalCount = count || 0;
  return {
    data: (data as MonthlyDueStatusRecord[]) || [],
    count: totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

/**
 * Trigger generation of monthly dues for active eligible students (Idempotent RPC).
 */
export async function generateMonthlyDues(periodKey: string): Promise<{
  success: boolean;
  period_key: string;
  dues_created: number;
  advances_applied: number;
}> {
  const { data, error } = await supabase.rpc('generate_monthly_dues', {
    p_period_key: periodKey,
  });

  if (error) {
    throw new Error(`Monthly fee generation failed: ${error.message}`);
  }

  return data as any;
}

/**
 * Collect exact full payment for a single monthly fee due (Full Payment Only).
 * Rejects partial payments and overpayments directly at database level.
 */
export async function collectMonthlyFee(params: {
  dueId: string;
  amount: number;
  paymentMode: PaymentMode;
  receiptNumber?: string;
  remarks?: string;
}): Promise<Json> {
  const { data, error } = await supabase.rpc('collect_monthly_fee', {
    p_due_id: params.dueId,
    p_amount: params.amount,
    p_payment_mode: params.paymentMode,
    p_receipt_number: params.receiptNumber?.trim() || undefined,
    p_remarks: params.remarks?.trim() || undefined,
  });

  if (error) {
    throw new Error(`Collection rejected: ${error.message}`);
  }

  return data;
}

/**
 * Record an advance fee deposit earmarked for a future billing month.
 * Validates ceiling <= student.total_fee and enqueues receipt in email_outbox.
 */
export async function recordAdvanceFee(params: {
  studentId: string;
  targetPeriodKey: string;
  amount: number;
  paymentMode: PaymentMode;
  receiptNumber?: string;
  remarks?: string;
  studentEmail?: string;
}): Promise<Json> {
  const { data, error } = await supabase.rpc('record_advance_fee', {
    p_student_id: params.studentId,
    p_target_period_key: params.targetPeriodKey,
    p_amount: params.amount,
    p_payment_mode: params.paymentMode,
    p_receipt_number: params.receiptNumber?.trim() || undefined,
    p_remarks: params.remarks?.trim() || undefined,
    p_student_email: params.studentEmail?.trim() || undefined,
  });

  if (error) {
    throw new Error(`Advance registration failed: ${error.message}`);
  }

  return data;
}

/**
 * Fetch upcoming active advance payments for a student or all students.
 */
export async function getUpcomingAdvances(studentId?: string): Promise<AdvanceFeeRecord[]> {
  let queryBuilder = supabase
    .from('advance_fee_records')
    .select('*')
    .in('status', ['Upcoming', 'Partially Applied'])
    .order('created_at', { ascending: false });

  if (studentId) {
    queryBuilder = queryBuilder.eq('student_id', studentId);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    throw new Error(`Failed to fetch upcoming advances: ${error.message}`);
  }

  return (data as AdvanceFeeRecord[]) || [];
}

export interface EnrichedAdvanceRecord extends AdvanceFeeRecord {
  students?: {
    id: string;
    name: string;
    admission_id: string;
    phone: string;
    course: string;
    total_fee: number;
    email: string | null;
  } | null;
  fee_periods?: {
    id: string;
    period_key: string;
    period_name: string;
    start_date: string;
  } | null;
  email_outbox?: Array<{
    id: string;
    status: OutboxStatus;
    recipient_email: string | null;
    sent_at: string | null;
    attempts: number;
    last_error: string | null;
  }> | null;
}

/**
 * Fetch enriched advance fee records joined with student profile, target period, and outbox delivery status.
 */
export async function getEnrichedAdvances(statusFilter?: AdvanceStatus | 'all'): Promise<EnrichedAdvanceRecord[]> {
  let queryBuilder = supabase
    .from('advance_fee_records')
    .select('*, students(id, name, admission_id, phone, course, total_fee, email), fee_periods(id, period_key, period_name, start_date), email_outbox(id, status, recipient_email, sent_at, attempts, last_error)')
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    queryBuilder = queryBuilder.eq('status', statusFilter);
  }

  const { data, error } = await queryBuilder;
  if (error) {
    throw new Error(`Failed to fetch advances: ${error.message}`);
  }
  return (data as any) || [];
}

/**
 * Privileged cancellation of an advance fee record (Super Admin Only).
 * Creates an immutable balancing reversal entry in public.fee_payments.
 */
export async function voidAdvanceFee(params: {
  advanceId: string;
  voidReason: string;
}): Promise<Json> {
  const cleanReason = params.voidReason.trim();
  if (cleanReason.length < 5) {
    throw new Error('A detailed cancellation justification (at least 5 characters) is required');
  }

  const { data, error } = await supabase.rpc('void_advance_fee', {
    p_advance_id: params.advanceId,
    p_void_reason: cleanReason,
  });

  if (error) {
    throw new Error(`Advance cancellation rejected: ${error.message}`);
  }

  return data;
}
