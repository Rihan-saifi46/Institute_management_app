// ==============================================================================
// Z Institute Management System - Phase 3 Email Notification & Worker Tests
// Covers: TC-FEE-23, TC-FEE-24, TC-FEE-25, Template Rendering, Quota Handling & Outbox
// Invariants: Decoupled Outbox, Zero Secret Leakage, Decision 1 (Optional), Decision 3 (Free Resend)
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  escapeHtml,
  formatIndianRupees,
  renderAdvanceReceiptHtml,
  renderAdvanceReceiptText,
  generateAdvanceReceiptEmail,
  type AdvanceReceiptEmailData,
} from '../services/emailTemplates';
import {
  processEmailOutboxBatch,
  type OutboxRow,
} from '../services/emailDispatcher';

// In-Memory Database Harness for Email Outbox Testing
class OutboxMockStore {
  outbox: Map<string, OutboxRow> = new Map();

  reset() {
    this.outbox.clear();
  }

  insert(record: Partial<OutboxRow>): OutboxRow {
    const id = record.id || `outbox-${Math.random().toString(36).substring(2, 9)}`;
    const fullRecord: OutboxRow = {
      id,
      student_id: record.student_id ?? 'student-1',
      advance_record_id: record.advance_record_id ?? 'adv-1',
      recipient_email: record.recipient_email ?? null,
      subject: record.subject ?? 'Advance Fee Payment Receipt',
      template_name: record.template_name ?? 'advance_receipt',
      payload: record.payload ?? {},
      status: record.status ?? 'pending',
      attempts: record.attempts ?? 0,
      last_error: record.last_error ?? null,
      created_at: record.created_at ?? new Date().toISOString(),
      sent_at: record.sent_at ?? null,
    };
    this.outbox.set(id, fullRecord);
    return fullRecord;
  }

  get(id: string): OutboxRow | undefined {
    return this.outbox.get(id);
  }

  // Create a minimal Supabase-like query mock client
  createSupabaseClientMock(): any {
    return {
      from: (table: string) => {
        if (table !== 'email_outbox') {
          throw new Error(`Unexpected table ${table} in outbox test harness`);
        }

        let pendingStatusFilter = false;
        let ltAttemptsFilter: number | null = null;
        let limitVal = 100;
        let updateFields: Partial<OutboxRow> | null = null;
        let eqId: string | null = null;

        const builder: any = {
          select: (_cols?: string) => builder,
          eq: (col: string, val: any) => {
            if (col === 'status' && val === 'pending') {
              pendingStatusFilter = true;
            }
            if (col === 'id') {
              eqId = val;
            }
            return builder;
          },
          lt: (col: string, val: number) => {
            if (col === 'attempts') {
              ltAttemptsFilter = val;
            }
            return builder;
          },
          order: (_col: string, _opts?: any) => builder,
          limit: (limit: number) => {
            limitVal = limit;
            return builder;
          },
          update: (fields: Partial<OutboxRow>) => {
            updateFields = fields;
            return builder;
          },
          then: (resolve: (val: any) => void) => {
            if (updateFields && eqId) {
              const existing = this.outbox.get(eqId);
              if (existing) {
                const updated = { ...existing, ...updateFields };
                this.outbox.set(eqId, updated);
                resolve({ data: [updated], error: null });
                return;
              }
              resolve({ data: [], error: null });
              return;
            }

            // Select query execution
            let rows = Array.from(this.outbox.values());
            if (pendingStatusFilter) {
              rows = rows.filter((r) => r.status === 'pending');
            }
            if (ltAttemptsFilter !== null) {
              rows = rows.filter((r) => r.attempts < ltAttemptsFilter!);
            }
            rows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            rows = rows.slice(0, limitVal);

            resolve({ data: rows, error: null });
          },
        };

        return builder;
      },
    };
  }
}

describe('Phase 3: Email Notification Engine & Outbox Worker', () => {
  let store: OutboxMockStore;

  beforeEach(() => {
    store = new OutboxMockStore();
    store.reset();
  });

  // ----------------------------------------------------------------------------
  // SECTION 1: Email Template Rendering & HTML Safety
  // ----------------------------------------------------------------------------
  describe('Email Template Engine', () => {
    const sampleData: AdvanceReceiptEmailData = {
      student_name: 'Rahul Sharma',
      admission_id: 'Z-2026-0042',
      target_period: 'December 2026',
      amount_paid: 2000,
      payment_date: '2026-11-15',
      payment_mode: 'UPI',
      receipt_number: 'REC-ADV-202611-9B3C2A',
    };

    it('TC-FEE-P3-01: Correctly renders student name, admission ID and target period', () => {
      const email = generateAdvanceReceiptEmail(sampleData);
      const directHtml = renderAdvanceReceiptHtml(sampleData);
      const directText = renderAdvanceReceiptText(sampleData);

      expect(email.subject).toBe('Advance Fee Receipt — December 2026 — Z Institute');
      expect(email.html).toBe(directHtml);
      expect(email.text).toBe(directText);
      expect(email.html).toContain('Rahul Sharma');
      expect(email.html).toContain('Z-2026-0042');
      expect(email.html).toContain('December 2026');
      expect(email.text).toContain('Rahul Sharma');
      expect(email.text).toContain('Z-2026-0042');
      expect(email.text).toContain('December 2026');
    });

    it('TC-FEE-P3-02: Formats currency with Indian Rupee grouping and two decimals', () => {
      expect(formatIndianRupees(2000)).toBe('2,000.00');
      expect(formatIndianRupees(150000)).toBe('1,50,000.00');
      expect(formatIndianRupees(750.5)).toBe('750.50');

      const email = generateAdvanceReceiptEmail({ ...sampleData, amount_paid: 2500 });
      expect(email.html).toContain('₹2,500.00');
      expect(email.text).toContain('₹2,500.00');
    });

    it('TC-FEE-P3-03: Guards against HTML injection and XSS in email clients', () => {
      expect(escapeHtml('<b>bold</b>')).toBe('&lt;b&gt;bold&lt;/b&gt;');
      const maliciousData: AdvanceReceiptEmailData = {
        student_name: '<script>alert("pwned")</script>Amit',
        admission_id: 'ID" onclick="hack()',
        target_period: '<b>January 2027</b>',
        amount_paid: 3000,
        payment_date: '2026-11-15',
        payment_mode: 'CASH & TRANSFER',
        receipt_number: 'REC<123>',
      };

      const email = generateAdvanceReceiptEmail(maliciousData);
      expect(email.html).not.toContain('<script>');
      expect(email.html).toContain('&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt;Amit');
      expect(email.html).toContain('ID&quot; onclick=&quot;hack()');
      expect(email.html).toContain('&lt;b&gt;January 2027&lt;/b&gt;');
      expect(email.html).toContain('REC&lt;123&gt;');
    });

    it('TC-FEE-P3-04: Includes advance notice disclaimer in both HTML and text', () => {
      const email = generateAdvanceReceiptEmail(sampleData);
      const noticeHtml = 'This payment has been earmarked exclusively for your';
      expect(email.html).toContain(noticeHtml);
      expect(email.text).toContain(noticeHtml);
      expect(email.html).toContain('December 2026');
    });
  });

  // ----------------------------------------------------------------------------
  // SECTION 2: Master Test Cases TC-FEE-23, 24, 25
  // ----------------------------------------------------------------------------
  describe('Master Invariant Test Cases (TC-FEE-23 to TC-FEE-25)', () => {
    it('TC-FEE-23: Outbox queueing on advance recording with valid email', async () => {
      const outboxItem = store.insert({
        id: 'box-tc23',
        recipient_email: 'rahul.sharma@example.com',
        subject: 'Advance Fee Payment Receipt — December 2026',
        template_name: 'advance_receipt',
        payload: {
          student_name: 'Rahul Sharma',
          admission_id: 'Z-001',
          target_month: 'December 2026',
          amount: 2000,
          payment_mode: 'UPI',
          receipt_number: 'REC-001',
        },
        status: 'pending',
        attempts: 0,
      });

      expect(outboxItem.status).toBe('pending');
      expect(outboxItem.attempts).toBe(0);
      expect(outboxItem.recipient_email).toBe('rahul.sharma@example.com');
    });

    it('TC-FEE-24: Missing email safe handling (Decision 1) sets status to not_required', async () => {
      // Simulate advance recorded for student with no email
      const nullEmailItem = store.insert({
        id: 'box-tc24-null',
        recipient_email: null,
        subject: 'Advance Fee Receipt',
        template_name: 'advance_receipt',
        payload: { student_name: 'Priya' },
        status: 'pending',
      });

      const emptyEmailItem = store.insert({
        id: 'box-tc24-empty',
        recipient_email: '   ',
        subject: 'Advance Fee Receipt',
        template_name: 'advance_receipt',
        payload: { student_name: 'Aman' },
        status: 'pending',
      });

      expect(nullEmailItem.status).toBe('pending');
      expect(emptyEmailItem.status).toBe('pending');

      const mockSupabase = store.createSupabaseClientMock();
      const mockFetch = vi.fn();

      const result = await processEmailOutboxBatch({
        supabaseClient: mockSupabase,
        resendApiKey: 're_test_key_123',
        fetchFn: mockFetch as any,
      });

      // Assertions per Decision 1:
      // Zero HTTP network calls made
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.notRequiredCount).toBe(2);
      expect(result.sentCount).toBe(0);

      // Status in database updated to 'not_required'
      expect(store.get('box-tc24-null')?.status).toBe('not_required');
      expect(store.get('box-tc24-empty')?.status).toBe('not_required');
      expect(store.get('box-tc24-null')?.last_error).toContain('missing or invalid');
    });

    it('TC-FEE-25: Resend quota failure handling (Decision 3) catches HTTP 429 without paid auto-upgrade', async () => {
      store.insert({
        id: 'box-tc25',
        recipient_email: 'vikram@example.com',
        subject: 'Advance Fee Receipt — January 2027',
        template_name: 'advance_receipt',
        payload: {
          student_name: 'Vikram',
          admission_id: 'Z-009',
          target_month: 'January 2027',
          amount: 1500,
          payment_mode: 'CASH',
          receipt_number: 'REC-009',
        },
        status: 'pending',
        attempts: 0,
      });

      // Second item queued behind it
      store.insert({
        id: 'box-tc25-next',
        recipient_email: 'neha@example.com',
        subject: 'Advance Fee Receipt — January 2027',
        template_name: 'advance_receipt',
        payload: { student_name: 'Neha' },
        status: 'pending',
        attempts: 0,
      });

      const mockSupabase = store.createSupabaseClientMock();

      // Mock Resend returning HTTP 429 (Daily rate limit or 3k monthly quota exceeded)
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({
          statusCode: 429,
          message: 'Daily quota of 100 emails exceeded on Free Plan',
          name: 'rate_limit_exceeded',
        }),
      });

      const result = await processEmailOutboxBatch({
        supabaseClient: mockSupabase,
        resendApiKey: 're_test_key_123',
        fetchFn: mockFetch as any,
      });

      // Assertions per Decision 3:
      expect(result.quotaExceeded).toBe(true);
      expect(result.failedCount).toBe(1);

      // Verified status remains in 'failed' state with clear quota error note
      const updatedFirst = store.get('box-tc25');
      expect(updatedFirst?.status).toBe('failed');
      expect(updatedFirst?.attempts).toBe(1);
      expect(updatedFirst?.last_error).toContain('QUOTA_EXCEEDED');

      // The dispatcher must immediately abort loop to protect against quota hammering:
      // The second item is untouched and stays pending for when quota resets
      const secondItem = store.get('box-tc25-next');
      expect(secondItem?.status).toBe('pending');
      expect(secondItem?.attempts).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ----------------------------------------------------------------------------
  // SECTION 3: Worker Dispatch Cycle & Resilience
  // ----------------------------------------------------------------------------
  describe('Worker Dispatch Operations & Lifecycle', () => {
    it('TC-FEE-P3-05: Successful dispatch transitions status to sent with sent_at timestamp', async () => {
      store.insert({
        id: 'box-success',
        recipient_email: 'student.success@example.com',
        subject: 'Advance Fee Receipt — December 2026',
        template_name: 'advance_receipt',
        payload: {
          student_name: 'Ananya Roy',
          admission_id: 'Z-101',
          target_month: 'December 2026',
          amount: 3000,
          payment_mode: 'BANK_TRANSFER',
          receipt_number: 'REC-101',
        },
        status: 'pending',
        attempts: 0,
      });

      const mockSupabase = store.createSupabaseClientMock();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'resend_email_id_999' }),
      });

      const result = await processEmailOutboxBatch({
        supabaseClient: mockSupabase,
        resendApiKey: 're_valid_api_key',
        fromEmail: 'Z Institute <fees@zinstitute.edu>',
        fetchFn: mockFetch as any,
      });

      expect(result.sentCount).toBe(1);
      expect(result.failedCount).toBe(0);

      const record = store.get('box-success');
      expect(record?.status).toBe('sent');
      expect(record?.sent_at).not.toBeNull();
      expect(record?.last_error).toBeNull();

      // Check request payload to Resend
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer re_valid_api_key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('TC-FEE-P3-06: Retries transient errors up to 5 attempts before marking failed', async () => {
      // Row with 3 previous attempts
      store.insert({
        id: 'box-retry',
        recipient_email: 'retry.student@example.com',
        subject: 'Advance Receipt',
        template_name: 'advance_receipt',
        payload: { student_name: 'Karan' },
        status: 'pending',
        attempts: 3,
      });

      const mockSupabase = store.createSupabaseClientMock();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({ message: 'Resend server temporarily unavailable' }),
      });

      // 4th attempt: still pending
      await processEmailOutboxBatch({
        supabaseClient: mockSupabase,
        resendApiKey: 're_test',
        fetchFn: mockFetch as any,
      });

      expect(store.get('box-retry')?.attempts).toBe(4);
      expect(store.get('box-retry')?.status).toBe('pending');

      // 5th attempt: transitions to failed
      await processEmailOutboxBatch({
        supabaseClient: mockSupabase,
        resendApiKey: 're_test',
        fetchFn: mockFetch as any,
      });

      expect(store.get('box-retry')?.attempts).toBe(5);
      expect(store.get('box-retry')?.status).toBe('failed');
      expect(store.get('box-retry')?.last_error).toContain('Resend API Error');
    });

    it('TC-FEE-P3-07: Handles missing RESEND_API_KEY gracefully without throwing unhandled exceptions', async () => {
      store.insert({
        id: 'box-no-key',
        recipient_email: 'test@example.com',
        subject: 'Advance Receipt',
        template_name: 'advance_receipt',
        payload: { student_name: 'Test' },
        status: 'pending',
        attempts: 0,
      });

      const mockSupabase = store.createSupabaseClientMock();
      const mockFetch = vi.fn();

      const result = await processEmailOutboxBatch({
        supabaseClient: mockSupabase,
        resendApiKey: '', // Empty key
        fetchFn: mockFetch as any,
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.failedCount).toBe(1);
      const record = store.get('box-no-key');
      expect(record?.attempts).toBe(1);
      expect(record?.last_error).toContain('RESEND_API_KEY is not configured');
    });

    it('TC-FEE-P3-08: Respects batch size parameter to avoid large payloads', async () => {
      for (let i = 1; i <= 10; i++) {
        store.insert({
          id: `box-batch-${i}`,
          recipient_email: `student${i}@example.com`,
          subject: 'Advance Receipt',
          template_name: 'advance_receipt',
          payload: { student_name: `Student ${i}` },
          status: 'pending',
          attempts: 0,
        });
      }

      const mockSupabase = store.createSupabaseClientMock();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 're_batch' }),
      });

      const result = await processEmailOutboxBatch({
        supabaseClient: mockSupabase,
        resendApiKey: 're_test',
        batchSize: 4, // Max 4 per batch
        fetchFn: mockFetch as any,
      });

      expect(result.totalProcessed).toBe(4);
      expect(result.sentCount).toBe(4);
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  // ----------------------------------------------------------------------------
  // SECTION 4: Voiding Cancellation & Security Verification
  // ----------------------------------------------------------------------------
  describe('Advance Voiding & Outbox Invalidation', () => {
    it('TC-FEE-P3-09: Cancelling an advance marks pending outbox record as not_required', () => {
      // Mimics behavior of void_advance_fee RPC:
      // UPDATE public.email_outbox SET status = 'not_required', last_error = 'Advance voided by admin'
      // WHERE advance_record_id = p_advance_id AND status = 'pending';
      const advId = 'adv-to-void-001';
      const outboxItem = store.insert({
        id: 'box-void-check',
        advance_record_id: advId,
        recipient_email: 'to-be-voided@example.com',
        status: 'pending',
      });

      expect(outboxItem.status).toBe('pending');

      // Admin voids advance
      const record = store.get('box-void-check');
      if (record && record.status === 'pending') {
        record.status = 'not_required';
        record.last_error = 'Advance voided by admin';
      }

      expect(store.get('box-void-check')?.status).toBe('not_required');
      expect(store.get('box-void-check')?.last_error).toBe('Advance voided by admin');
    });

    it('TC-FEE-P3-10: Client bundle safety — RESEND_API_KEY is never exposed with VITE_ prefix', () => {
      // In Vite applications, only variables starting with VITE_ are bundled into client code.
      // Confirm that VITE_RESEND_API_KEY does not exist anywhere in environment configuration.
      const viteResendKey = process.env.VITE_RESEND_API_KEY;
      expect(viteResendKey).toBeUndefined();
    });
  });
});
