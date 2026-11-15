// ==============================================================================
// Z Institute Management System - Email Outbox Dispatcher
// Aligned with FEE_MODULE_IMPLEMENTATION/EMAIL_NOTIFICATION_DESIGN.md
// Implements Transactional Outbox Worker for Resend Free Tier
// ==============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, OutboxStatus } from '../types/database';
import {
  generateAdvanceReceiptEmail,
  type AdvanceReceiptEmailData
} from './emailTemplates';

export interface DispatchEmailOptions {
  supabaseClient: SupabaseClient<Database>;
  resendApiKey?: string;
  fromEmail?: string;
  fetchFn?: typeof fetch;
  batchSize?: number;
}

export interface OutboxItemResult {
  id: string;
  status: OutboxStatus;
  resendId?: string;
  error?: string;
}

export interface DispatchBatchResult {
  totalProcessed: number;
  sentCount: number;
  failedCount: number;
  notRequiredCount: number;
  quotaExceeded: boolean;
  results: OutboxItemResult[];
}

export type OutboxRow = Database['public']['Tables']['email_outbox']['Row'];

const DEFAULT_FROM_EMAIL = 'Z Institute <onboarding@resend.dev>';
const RESEND_API_URL = 'https://api.resend.com/emails';
const MAX_ATTEMPTS = 5;

/**
 * Validates whether an email string looks reasonably like an email address.
 */
function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim();
  return clean.length >= 5 && clean.includes('@') && clean.includes('.');
}

/**
 * Process a batch of pending emails from the outbox table.
 * Designed to be executed asynchronously by a background worker, edge function, or cron job.
 */
export async function processEmailOutboxBatch(
  options: DispatchEmailOptions
): Promise<DispatchBatchResult> {
  const {
    supabaseClient,
    resendApiKey = process.env.RESEND_API_KEY || '',
    fromEmail = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL,
    fetchFn = globalThis.fetch,
    batchSize = 20,
  } = options;

  const result: DispatchBatchResult = {
    totalProcessed: 0,
    sentCount: 0,
    failedCount: 0,
    notRequiredCount: 0,
    quotaExceeded: false,
    results: [],
  };

  // 1. Fetch pending outbox records
  const { data: rows, error: fetchError } = await supabaseClient
    .from('email_outbox')
    .select('*')
    .eq('status', 'pending')
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (fetchError) {
    throw new Error(`Failed to query email_outbox: ${fetchError.message}`);
  }

  if (!rows || rows.length === 0) {
    return result;
  }

  // 2. Process each item sequentially to respect rate limits
  for (const item of rows) {
    result.totalProcessed += 1;

    // Decision 1: Missing or invalid email -> status = 'not_required'
    if (!isValidEmail(item.recipient_email)) {
      await supabaseClient
        .from('email_outbox')
        .update({
          status: 'not_required',
          last_error: 'Recipient email missing or invalid format',
        })
        .eq('id', item.id);

      result.notRequiredCount += 1;
      result.results.push({
        id: item.id,
        status: 'not_required',
        error: 'Recipient email missing or invalid',
      });
      continue;
    }

    // Check API Key
    if (!resendApiKey || resendApiKey.trim() === '') {
      const nextAttempts = item.attempts + 1;
      const status: OutboxStatus = nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending';

      await supabaseClient
        .from('email_outbox')
        .update({
          attempts: nextAttempts,
          status,
          last_error: 'RESEND_API_KEY is not configured on server',
        })
        .eq('id', item.id);

      result.failedCount += 1;
      result.results.push({
        id: item.id,
        status,
        error: 'RESEND_API_KEY missing',
      });
      continue;
    }

    // 3. Render email content
    let subject = item.subject;
    let htmlContent = '';
    let textContent = '';

    try {
      const payload = (item.payload as any) || {};

      if (item.template_name === 'advance_receipt') {
        const emailData: AdvanceReceiptEmailData = {
          student_name: payload.student_name || 'Student',
          admission_id: payload.admission_id || '—',
          target_period: payload.target_month || payload.target_period || 'Tuition Fee',
          amount_paid: Number(payload.amount ?? payload.amount_paid ?? 0),
          payment_date: payload.date || payload.payment_date || new Date().toISOString().split('T')[0],
          payment_mode: payload.payment_mode || 'Cash',
          receipt_number: payload.receipt_number || 'ADV-RECEIPT',
        };

        const rendered = generateAdvanceReceiptEmail(emailData);
        subject = item.subject || rendered.subject;
        htmlContent = rendered.html;
        textContent = rendered.text;
      } else {
        htmlContent = `<pre>${JSON.stringify(payload, null, 2)}</pre>`;
        textContent = JSON.stringify(payload, null, 2);
      }
    } catch (renderError: any) {
      const nextAttempts = item.attempts + 1;
      await supabaseClient
        .from('email_outbox')
        .update({
          attempts: nextAttempts,
          status: 'failed',
          last_error: `Template rendering error: ${renderError.message}`,
        })
        .eq('id', item.id);

      result.failedCount += 1;
      result.results.push({
        id: item.id,
        status: 'failed',
        error: renderError.message,
      });
      continue;
    }

    // 4. Dispatch via Resend REST API
    try {
      const res = await fetchFn(RESEND_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [item.recipient_email!.trim()],
          subject,
          html: htmlContent,
          text: textContent,
        }),
      });

      if (res.ok) {
        // Success: 200 or 201
        const resData: any = await res.json().catch(() => ({}));
        const resendId = resData?.id || undefined;

        await supabaseClient
          .from('email_outbox')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            last_error: null,
          })
          .eq('id', item.id);

        result.sentCount += 1;
        result.results.push({
          id: item.id,
          status: 'sent',
          resendId,
        });
      } else if (res.status === 429) {
        // Decision 3: Quota / Rate limit exceeded
        // Retain in failed/retryable state, alert owner, do not hammer API
        const errorBody: any = await res.json().catch(() => ({}));
        const errorMsg = errorBody?.message || 'Rate limit or monthly quota limit reached';

        await supabaseClient
          .from('email_outbox')
          .update({
            status: 'failed',
            attempts: item.attempts + 1,
            last_error: `QUOTA_EXCEEDED: ${errorMsg} (HTTP 429)`,
          })
          .eq('id', item.id);

        result.failedCount += 1;
        result.quotaExceeded = true;
        result.results.push({
          id: item.id,
          status: 'failed',
          error: `QUOTA_EXCEEDED: ${errorMsg}`,
        });

        // Abort processing the remainder of the batch to protect API quotas
        break;
      } else {
        // Other HTTP error (e.g. 401 Unauthorized, 422 Unprocessable)
        const errorBody: any = await res.json().catch(() => ({}));
        const errorMsg = errorBody?.message || `HTTP ${res.status} ${res.statusText}`;
        const nextAttempts = item.attempts + 1;
        const status: OutboxStatus = nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending';

        await supabaseClient
          .from('email_outbox')
          .update({
            attempts: nextAttempts,
            status,
            last_error: `Resend API Error: ${errorMsg}`,
          })
          .eq('id', item.id);

        result.failedCount += 1;
        result.results.push({
          id: item.id,
          status,
          error: errorMsg,
        });
      }
    } catch (networkError: any) {
      // Network failure / DNS timeout / fetch exception
      const nextAttempts = item.attempts + 1;
      const status: OutboxStatus = nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending';

      await supabaseClient
        .from('email_outbox')
        .update({
          attempts: nextAttempts,
          status,
          last_error: `Network Exception: ${networkError.message}`,
        })
        .eq('id', item.id);

      result.failedCount += 1;
      result.results.push({
        id: item.id,
        status,
        error: networkError.message,
      });
    }
  }

  return result;
}

/**
 * Fetch pending emails from the outbox.
 */
export async function fetchPendingOutboxEmails(
  supabaseClient: SupabaseClient<Database>,
  limit = 50
): Promise<OutboxRow[]> {
  const { data, error } = await supabaseClient
    .from('email_outbox')
    .select('*')
    .eq('status', 'pending')
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch pending emails: ${error.message}`);
  }

  return data || [];
}

/**
 * Get delivery status of email linked to a specific advance record.
 */
export async function getOutboxStatusForAdvance(
  supabaseClient: SupabaseClient<Database>,
  advanceRecordId: string
): Promise<OutboxRow | null> {
  const { data, error } = await supabaseClient
    .from('email_outbox')
    .select('*')
    .eq('advance_record_id', advanceRecordId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to query outbox for advance: ${error.message}`);
  }

  return data;
}

/**
 * List recent outbox rows with optional status filter.
 */
export async function listOutboxRecords(
  supabaseClient: SupabaseClient<Database>,
  options?: {
    status?: OutboxStatus;
    studentId?: string;
    limit?: number;
  }
): Promise<OutboxRow[]> {
  let query = supabaseClient
    .from('email_outbox')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.studentId) {
    query = query.eq('student_id', options.studentId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list outbox records: ${error.message}`);
  }

  return data || [];
}
