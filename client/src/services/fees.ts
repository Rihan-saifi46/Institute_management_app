// ==============================================================================
// Z Institute Management System - Fees Management Service Layer
// ==============================================================================

import { supabase } from '../lib/supabase';
import type { Database, FeeStatus, PaymentMode } from '../types/database';
import type { PaginatedResult } from '../types/common';

export type StudentFeeSummary = Database['public']['Views']['student_fee_summary']['Row'];
export type FeePayment = Database['public']['Tables']['fee_payments']['Row'];
export type FeePaymentInsert = Database['public']['Tables']['fee_payments']['Insert'];

export interface FeeSummaryFilterOptions {
  query?: string;
  status?: FeeStatus | 'all';
  page?: number;
  pageSize?: number;
}

/**
 * Fetch financial fee summaries from the student_fee_summary view.
 * The view calculates net payments by subtracting authorized reversals in real-time.
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

  // Filter by fee status ('PAID', 'PARTIAL', 'UNPAID')
  if (status && status !== 'all') {
    queryBuilder = queryBuilder.eq('fee_status', status);
  }

  // Multi-field text search (student name, admission id, phone)
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
 * Returns all installment records and any audit-logged reversal entries.
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
 * Record a fee payment installment into the immutable ledger.
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
 * Enforces server-side authorization: Super Admin role only.
 * Reason must be at least 5 characters.
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
