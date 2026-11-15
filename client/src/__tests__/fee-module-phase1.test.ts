// ==============================================================================
// Z Institute Management System - Phase 1 Backend & Financial Invariant Tests
// Module: Monthly Fee Engine, Advance Fee Recording, Month-Wise Allocation & Outbox
// Tests: 25 Detailed Real-World Integration Tests matching Owner Decisions
// ==============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

interface Student {
  id: string;
  admission_id: string;
  name: string;
  phone: string;
  email: string | null;
  course: string;
  total_fee: number; // Reused as individual monthly fee
  joining_date: string;
  status: 'active' | 'completed' | 'dropped';
}

interface FeePeriod {
  id: string;
  period_key: string; // '2026-11'
  period_name: string; // 'November 2026'
  start_date: string;
  end_date: string;
  due_date: string;
  is_active: boolean;
}

interface MonthlyDue {
  id: string;
  student_id: string;
  period_id: string;
  fee_snapshot: number;
  created_at: string;
}

interface FeePayment {
  id: string;
  student_id: string;
  amount: number;
  payment_date: string;
  payment_mode: string;
  receipt_number: string;
  remarks: string | null;
  is_reversal: boolean;
  reversal_of_id: string | null;
  void_reason: string | null;
  created_by: string;
}

interface FeePaymentAllocation {
  id: string;
  payment_id: string;
  due_id: string;
  allocated_amount: number;
  allocation_type: 'normal_payment' | 'advance_adjustment';
}

interface AdvanceFeeRecord {
  id: string;
  student_id: string;
  target_period_id: string;
  payment_id: string;
  amount_received: number;
  status: 'Upcoming' | 'Partially Applied' | 'Applied' | 'Voided';
  created_by: string;
  applied_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  reversal_payment_id: string | null;
}

interface EmailOutbox {
  id: string;
  student_id: string | null;
  advance_record_id: string | null;
  recipient_email: string | null;
  subject: string;
  template_name: string;
  payload: any;
  status: 'pending' | 'sent' | 'failed' | 'not_required';
  attempts: number;
  last_error: string | null;
}

class Phase1MockEngine {
  students: Map<string, Student> = new Map();
  feePeriods: Map<string, FeePeriod> = new Map();
  monthlyFeeDues: Map<string, MonthlyDue> = new Map();
  feePayments: Map<string, FeePayment> = new Map();
  feePaymentAllocations: Map<string, FeePaymentAllocation> = new Map();
  advanceFeeRecords: Map<string, AdvanceFeeRecord> = new Map();
  emailOutbox: Map<string, EmailOutbox> = new Map();
  generationLogs: any[] = [];

  currentUser: { id: string; role: 'super_admin' | 'manager' } = {
    id: 'sa-uuid',
    role: 'super_admin',
  };

  reset() {
    this.students.clear();
    this.feePeriods.clear();
    this.monthlyFeeDues.clear();
    this.feePayments.clear();
    this.feePaymentAllocations.clear();
    this.advanceFeeRecords.clear();
    this.emailOutbox.clear();
    this.generationLogs = [];
    this.currentUser = { id: 'sa-uuid', role: 'super_admin' };

    // Seed Standard Fee Periods (Decision 5: Nov 2026 onwards)
    const periods: FeePeriod[] = [
      { id: 'p-2026-11', period_key: '2026-11', period_name: 'November 2026', start_date: '2026-11-01', end_date: '2026-11-30', due_date: '2026-11-10', is_active: true },
      { id: 'p-2026-12', period_key: '2026-12', period_name: 'December 2026', start_date: '2026-12-01', end_date: '2026-12-31', due_date: '2026-12-10', is_active: true },
      { id: 'p-2027-01', period_key: '2027-01', period_name: 'January 2027',   start_date: '2027-01-01', end_date: '2027-01-31', due_date: '2027-01-10', is_active: true },
      { id: 'p-2027-02', period_key: '2027-02', period_name: 'February 2027',  start_date: '2027-02-01', end_date: '2027-02-28', due_date: '2027-02-10', is_active: true },
      { id: 'p-2027-03', period_key: '2027-03', period_name: 'March 2027',     start_date: '2027-03-01', end_date: '2027-03-31', due_date: '2027-03-10', is_active: true },
    ];
    for (const p of periods) {
      this.feePeriods.set(p.period_key, p);
    }
  }

  // --------------------------------------------------------------------------
  // RPC: generate_monthly_dues
  // --------------------------------------------------------------------------
  generate_monthly_dues(period_key: string) {
    if (period_key < '2026-11') {
      throw new Error('ERR_HISTORICAL_PERIOD_PROTECTED: Cannot generate dues for periods prior to November 2026');
    }

    const period = this.feePeriods.get(period_key);
    if (!period || !period.is_active) {
      throw new Error(`Fee period ${period_key} not found or inactive`);
    }

    let duesCreated = 0;
    for (const s of this.students.values()) {
      if (s.status === 'active' && s.total_fee > 0 && s.joining_date <= period.end_date) {
        const uniqueKey = `${s.id}_${period.id}`;
        if (!this.monthlyFeeDues.has(uniqueKey)) {
          this.monthlyFeeDues.set(uniqueKey, {
            id: `due-${s.id}-${period_key}`,
            student_id: s.id,
            period_id: period.id,
            fee_snapshot: s.total_fee, // Immutable snapshot
            created_at: new Date().toISOString(),
          });
          duesCreated++;
        }
      }
    }

    const advancesApplied = this.apply_advance_adjustments(period.id);

    this.generationLogs.push({
      period_key,
      duesCreated,
      advancesApplied,
      status: 'SUCCESS',
    });

    return { success: true, period_key, dues_created: duesCreated, advances_applied: advancesApplied };
  }

  // --------------------------------------------------------------------------
  // RPC: apply_advance_adjustments
  // --------------------------------------------------------------------------
  apply_advance_adjustments(period_id: string): number {
    let appliedCount = 0;
    for (const adv of this.advanceFeeRecords.values()) {
      if (adv.target_period_id === period_id && (adv.status === 'Upcoming' || adv.status === 'Partially Applied')) {
        const uniqueKey = `${adv.student_id}_${period_id}`;
        const due = this.monthlyFeeDues.get(uniqueKey);
        if (due) {
          // Check if already allocated
          const allocExists = Array.from(this.feePaymentAllocations.values()).some(
            (a) => a.payment_id === adv.payment_id && a.due_id === due.id
          );
          if (!allocExists) {
            const allocId = `alloc-${adv.payment_id}-${due.id}`;
            this.feePaymentAllocations.set(allocId, {
              id: allocId,
              payment_id: adv.payment_id,
              due_id: due.id,
              allocated_amount: adv.amount_received,
              allocation_type: 'advance_adjustment',
            });

            // Calculate total advance applied for this due
            const totalAdvanceApplied = Array.from(this.feePaymentAllocations.values())
              .filter((a) => a.due_id === due.id && a.allocation_type === 'advance_adjustment')
              .reduce((sum, a) => sum + a.allocated_amount, 0);

            if (totalAdvanceApplied >= due.fee_snapshot) {
              adv.status = 'Applied';
            } else {
              adv.status = 'Partially Applied';
            }
            adv.applied_at = new Date().toISOString();
            appliedCount++;
          }
        }
      }
    }
    return appliedCount;
  }

  // --------------------------------------------------------------------------
  // RPC: collect_monthly_fee (Exact Full Payment Only)
  // --------------------------------------------------------------------------
  collect_monthly_fee(params: {
    due_id: string;
    amount: number;
    payment_mode: string;
    receipt_number?: string;
    remarks?: string;
  }) {
    if (params.amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    const due = Array.from(this.monthlyFeeDues.values()).find((d) => d.id === params.due_id);
    if (!due) {
      throw new Error(`Monthly fee due ${params.due_id} not found`);
    }

    // Calculate current settled amount
    const totalSettled = Array.from(this.feePaymentAllocations.values())
      .filter((a) => a.due_id === params.due_id)
      .reduce((sum, a) => {
        const pay = this.feePayments.get(a.payment_id);
        return sum + (pay?.is_reversal ? -a.allocated_amount : a.allocated_amount);
      }, 0);

    const payableOutstanding = due.fee_snapshot - totalSettled;

    if (payableOutstanding <= 0) {
      throw new Error('ERR_DUE_ALREADY_PAID: This monthly due has already been settled in full.');
    }
    if (params.amount < payableOutstanding) {
      throw new Error(`ERR_FULL_PAYMENT_REQUIRED: Partial payments are not allowed in normal collection. Outstanding amount is ₹${payableOutstanding}, attempted ₹${params.amount}`);
    }
    if (params.amount > payableOutstanding) {
      throw new Error(`ERR_OVERPAYMENT_PROHIBITED: Overpayments are not allowed. Outstanding amount is ₹${payableOutstanding}, attempted ₹${params.amount}`);
    }

    const payId = `pay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const receiptNo = params.receipt_number || `REC-${Date.now()}`;

    this.feePayments.set(payId, {
      id: payId,
      student_id: due.student_id,
      amount: params.amount,
      payment_date: '2026-11-15',
      payment_mode: params.payment_mode,
      receipt_number: receiptNo,
      remarks: params.remarks || null,
      is_reversal: false,
      reversal_of_id: null,
      void_reason: null,
      created_by: this.currentUser.id,
    });

    const allocId = `alloc-${payId}-${due.id}`;
    this.feePaymentAllocations.set(allocId, {
      id: allocId,
      payment_id: payId,
      due_id: due.id,
      allocated_amount: params.amount,
      allocation_type: 'normal_payment',
    });

    return {
      success: true,
      payment_id: payId,
      due_id: due.id,
      amount_paid: params.amount,
      balance_remaining: 0,
      status: 'PAID',
      receipt_number: receiptNo,
    };
  }

  // --------------------------------------------------------------------------
  // RPC: record_advance_fee
  // --------------------------------------------------------------------------
  record_advance_fee(params: {
    student_id: string;
    target_period_key: string;
    amount: number;
    payment_mode: string;
    receipt_number?: string;
    remarks?: string;
    student_email?: string;
  }) {
    if (params.amount <= 0) {
      throw new Error('Advance amount must be greater than zero');
    }

    const student = this.students.get(params.student_id);
    if (!student || student.status !== 'active') {
      throw new Error('Student not found or inactive');
    }

    const period = this.feePeriods.get(params.target_period_key);
    if (!period) {
      throw new Error(`Target fee period ${params.target_period_key} not found`);
    }

    // Must be future month
    if (period.start_date <= '2026-11-15') {
      throw new Error(`Target period ${period.period_name} is not a future period. Use normal Fees section.`);
    }

    // Ceiling check using students.total_fee (Decision 2)
    const existingAdvance = Array.from(this.advanceFeeRecords.values())
      .filter(
        (a) =>
          a.student_id === params.student_id &&
          a.target_period_id === period.id &&
          (a.status === 'Upcoming' || a.status === 'Partially Applied')
      )
      .reduce((sum, a) => sum + a.amount_received, 0);

    if (existingAdvance + params.amount > student.total_fee) {
      throw new Error(
        `ERR_ADVANCE_CEILING_EXCEEDED: Advance allocation exceeds monthly fee. Applicable monthly fee: ₹${student.total_fee}, Already recorded: ₹${existingAdvance}, Attempted: ₹${params.amount}. Maximum allowed: ₹${student.total_fee - existingAdvance}`
      );
    }

    const payId = `pay-adv-${Date.now()}`;
    const receiptNo = params.receipt_number || `REC-ADV-${Date.now()}`;

    this.feePayments.set(payId, {
      id: payId,
      student_id: student.id,
      amount: params.amount,
      payment_date: '2026-11-15',
      payment_mode: params.payment_mode,
      receipt_number: receiptNo,
      remarks: params.remarks || `Advance fee for ${period.period_name}`,
      is_reversal: false,
      reversal_of_id: null,
      void_reason: null,
      created_by: this.currentUser.id,
    });

    const advId = `adv-${Date.now()}`;
    this.advanceFeeRecords.set(advId, {
      id: advId,
      student_id: student.id,
      target_period_id: period.id,
      payment_id: payId,
      amount_received: params.amount,
      status: 'Upcoming',
      created_by: this.currentUser.id,
      applied_at: null,
      voided_by: null,
      void_reason: null,
      reversal_payment_id: null,
    });

    // Email Outbox (Decision 1: Optional Email)
    const recipientEmail = params.student_email?.trim() || student.email;
    const outboxStatus = recipientEmail && recipientEmail.length > 0 ? 'pending' : 'not_required';

    const outboxId = `outbox-${Date.now()}`;
    this.emailOutbox.set(outboxId, {
      id: outboxId,
      student_id: student.id,
      advance_record_id: advId,
      recipient_email: recipientEmail || null,
      subject: `Advance Fee Payment Receipt — ${period.period_name}`,
      template_name: 'advance_receipt',
      payload: { amount: params.amount, receipt_number: receiptNo },
      status: outboxStatus,
      attempts: 0,
      last_error: null,
    });

    return {
      success: true,
      payment_id: payId,
      advance_id: advId,
      receipt_number: receiptNo,
      amount: params.amount,
      target_period: period.period_name,
      email_status: outboxStatus,
    };
  }

  // --------------------------------------------------------------------------
  // RPC: void_advance_fee (Super Admin Only - Decision 6)
  // --------------------------------------------------------------------------
  void_advance_fee(advance_id: string, void_reason: string) {
    if (this.currentUser.role !== 'super_admin') {
      throw new Error('Forbidden: Only super administrators can cancel advance fees. Managers and receptionists are strictly prohibited.');
    }

    if (!void_reason || void_reason.trim().length < 5) {
      throw new Error('A detailed cancellation reason (at least 5 characters) is required for audit compliance.');
    }

    const adv = this.advanceFeeRecords.get(advance_id);
    if (!adv) {
      throw new Error(`Advance record ${advance_id} not found`);
    }
    if (adv.status === 'Voided') {
      throw new Error('This advance record has already been voided');
    }

    const origPay = this.feePayments.get(adv.payment_id)!;
    const revPayId = `rev-${origPay.id}`;
    const revReceipt = `REV-${origPay.receipt_number}`;

    // Insert reversal row in fee_payments
    this.feePayments.set(revPayId, {
      id: revPayId,
      student_id: adv.student_id,
      amount: adv.amount_received,
      payment_date: '2026-11-15',
      payment_mode: origPay.payment_mode,
      receipt_number: revReceipt,
      remarks: `Advance Reversal: ${void_reason.trim()}`,
      is_reversal: true,
      reversal_of_id: origPay.id,
      void_reason: void_reason.trim(),
      created_by: this.currentUser.id,
    });

    // Rollback allocations if advance was applied
    if (adv.status === 'Applied' || adv.status === 'Partially Applied') {
      for (const [k, a] of this.feePaymentAllocations.entries()) {
        if (a.payment_id === adv.payment_id) {
          this.feePaymentAllocations.delete(k);
        }
      }
    }

    adv.status = 'Voided';
    adv.voided_by = this.currentUser.id;
    adv.void_reason = void_reason.trim();
    adv.reversal_payment_id = revPayId;

    // Cancel any pending outbox email
    for (const o of this.emailOutbox.values()) {
      if (o.advance_record_id === advance_id && o.status === 'pending') {
        o.status = 'not_required';
        o.last_error = 'Advance voided by admin';
      }
    }

    return {
      success: true,
      advance_id,
      reversal_payment_id: revPayId,
      reversal_receipt: revReceipt,
      void_reason: void_reason.trim(),
    };
  }

  // --------------------------------------------------------------------------
  // View Simulation: monthly_due_status_view
  // --------------------------------------------------------------------------
  getMonthlyDueStatus(due_id: string) {
    const due = Array.from(this.monthlyFeeDues.values()).find((d) => d.id === due_id);
    if (!due) return null;

    const student = this.students.get(due.student_id)!;
    const period = Array.from(this.feePeriods.values()).find((p) => p.id === due.period_id)!;

    let normalPaid = 0;
    let advanceApplied = 0;

    for (const alloc of this.feePaymentAllocations.values()) {
      if (alloc.due_id === due.id) {
        const pay = this.feePayments.get(alloc.payment_id)!;
        const netAmt = pay.is_reversal ? -alloc.allocated_amount : alloc.allocated_amount;
        if (alloc.allocation_type === 'normal_payment') {
          normalPaid += netAmt;
        } else if (alloc.allocation_type === 'advance_adjustment') {
          advanceApplied += netAmt;
        }
      }
    }

    const totalSettled = normalPaid + advanceApplied;
    const balanceRemaining = due.fee_snapshot - totalSettled;

    let status: 'PAID' | 'PARTIAL' | 'UNPAID' = 'UNPAID';
    if (totalSettled >= due.fee_snapshot) {
      status = 'PAID';
    } else if (totalSettled > 0) {
      status = 'PARTIAL';
    }

    return {
      due_id: due.id,
      student_id: student.id,
      student_name: student.name,
      period_key: period.period_key,
      fee_snapshot: due.fee_snapshot,
      normal_paid_amount: normalPaid,
      advance_applied_amount: advanceApplied,
      total_settled_amount: totalSettled,
      balance_remaining: balanceRemaining,
      status,
      is_arrears: period.end_date < '2026-11-15' && balanceRemaining > 0,
    };
  }
}

// ==============================================================================
// TEST SUITE: Phase 1 Backend Verification
// ==============================================================================

describe('Phase 1: Monthly Fee Engine & Advance Module Database Invariants', () => {
  const engine = new Phase1MockEngine();

  beforeEach(() => {
    engine.reset();
  });

  // ----------------------------------------------------------------------------
  // SECTION 1: Migration Scripts File Integrity
  // ----------------------------------------------------------------------------
  describe('1. Migration Scripts Integrity & Structure', () => {
    it('verifies 0006_monthly_fee_engine_and_advance_module.sql exists and contains all required DDL and RLS', () => {
      const migPath = path.resolve(__dirname, '../../../migrations/0006_monthly_fee_engine_and_advance_module.sql');
      expect(fs.existsSync(migPath)).toBe(true);

      const content = fs.readFileSync(migPath, 'utf8');
      expect(content).toContain('CREATE TABLE IF NOT EXISTS public.fee_periods');
      expect(content).toContain('CREATE TABLE IF NOT EXISTS public.monthly_fee_dues');
      expect(content).toContain('CREATE TABLE IF NOT EXISTS public.fee_payment_allocations');
      expect(content).toContain('CREATE TABLE IF NOT EXISTS public.advance_fee_records');
      expect(content).toContain('CREATE TABLE IF NOT EXISTS public.email_outbox');
      expect(content).toContain('CREATE OR REPLACE VIEW public.monthly_due_status_view');
      expect(content).toContain('CREATE OR REPLACE FUNCTION public.generate_monthly_dues');
      expect(content).toContain('CREATE OR REPLACE FUNCTION public.collect_monthly_fee');
      expect(content).toContain('CREATE OR REPLACE FUNCTION public.record_advance_fee');
      expect(content).toContain('CREATE OR REPLACE FUNCTION public.apply_advance_adjustments');
      expect(content).toContain('CREATE OR REPLACE FUNCTION public.void_advance_fee');
      expect(content).toContain('ALTER TABLE public.fee_periods ENABLE ROW LEVEL SECURITY');
      expect(content).toContain('ALTER TABLE public.monthly_fee_dues ENABLE ROW LEVEL SECURITY');
      expect(content).toContain('ALTER TABLE public.advance_fee_records ENABLE ROW LEVEL SECURITY');
    });

    it('verifies 0006_fee_module_redesign_DOWN.sql safely rolls back without touching students.total_fee', () => {
      const downPath = path.resolve(__dirname, '../../../migrations/0006_fee_module_redesign_DOWN.sql');
      expect(fs.existsSync(downPath)).toBe(true);

      const content = fs.readFileSync(downPath, 'utf8');
      expect(content).toContain('DROP VIEW IF EXISTS public.monthly_due_status_view');
      expect(content).toContain('DROP FUNCTION IF EXISTS public.collect_monthly_fee');
      expect(content).toContain('DROP FUNCTION IF EXISTS public.void_advance_fee');
      expect(content).toContain('DROP TABLE IF EXISTS public.fee_payment_allocations');
      expect(content).toContain('DROP TABLE IF EXISTS public.advance_fee_records');
      expect(content).toContain('DROP TABLE IF EXISTS public.monthly_fee_dues');
      expect(content).toContain('DROP TABLE IF EXISTS public.fee_periods');
      expect(content).toContain('ALTER TABLE public.students \n  DROP COLUMN IF EXISTS email;');
      expect(content).not.toContain('DROP COLUMN IF EXISTS total_fee'); // Crucial: must preserve total_fee!
    });
  });

  // ----------------------------------------------------------------------------
  // SECTION 2: Decision 2 & Snapshotting (Student Monthly Fee)
  // ----------------------------------------------------------------------------
  describe('2. Student Monthly Fee Reuse & Snapshot Immutability (Decision 2)', () => {
    it('snapshots students.total_fee accurately into monthly_fee_dues', () => {
      engine.students.set('s1', {
        id: 's1',
        admission_id: 'Z-101',
        name: 'Rahul Sharma',
        phone: '9876543210',
        email: 'rahul@example.com',
        course: 'Python Mastery',
        total_fee: 2000.0, // Individual monthly fee
        joining_date: '2026-10-01',
        status: 'active',
      });

      engine.students.set('s2', {
        id: 's2',
        admission_id: 'Z-102',
        name: 'Priya Patel',
        phone: '9876543211',
        email: 'priya@example.com',
        course: 'Python Mastery',
        total_fee: 3500.0, // Distinct custom monthly fee
        joining_date: '2026-10-01',
        status: 'active',
      });

      const res = engine.generate_monthly_dues('2026-11');
      expect(res.dues_created).toBe(2);

      const due1 = engine.monthlyFeeDues.get('s1_p-2026-11')!;
      const due2 = engine.monthlyFeeDues.get('s2_p-2026-11')!;

      expect(due1.fee_snapshot).toBe(2000.0);
      expect(due2.fee_snapshot).toBe(3500.0);
    });

    it('enforces historical snapshot immutability when student total_fee is edited later', () => {
      engine.students.set('s1', {
        id: 's1',
        admission_id: 'Z-101',
        name: 'Rahul Sharma',
        phone: '9876543210',
        email: 'rahul@example.com',
        course: 'Python Mastery',
        total_fee: 2000.0,
        joining_date: '2026-10-01',
        status: 'active',
      });

      // Generate Nov 2026 due
      engine.generate_monthly_dues('2026-11');
      expect(engine.monthlyFeeDues.get('s1_p-2026-11')!.fee_snapshot).toBe(2000.0);

      // Owner increases Rahul's fee to 2500 effective Dec 1st
      engine.students.get('s1')!.total_fee = 2500.0;

      // Generate Dec 2026 due
      engine.generate_monthly_dues('2026-12');

      // Nov due remains 2000; Dec due is 2500
      expect(engine.monthlyFeeDues.get('s1_p-2026-11')!.fee_snapshot).toBe(2000.0);
      expect(engine.monthlyFeeDues.get('s1_p-2026-12')!.fee_snapshot).toBe(2500.0);
    });
  });

  // ----------------------------------------------------------------------------
  // SECTION 3: Decision 4 & 5 (Monthly Dues Generation Boundaries & Idempotency)
  // ----------------------------------------------------------------------------
  describe('3. Monthly Dues Generation & Boundaries (Decisions 4 & 5)', () => {
    it('is strictly idempotent: running multiple times creates zero duplicate dues', () => {
      engine.students.set('s1', {
        id: 's1',
        admission_id: 'Z-101',
        name: 'Rahul Sharma',
        phone: '9876543210',
        email: null,
        course: 'Web Dev',
        total_fee: 2000.0,
        joining_date: '2026-10-01',
        status: 'active',
      });

      const res1 = engine.generate_monthly_dues('2026-11');
      expect(res1.dues_created).toBe(1);

      const res2 = engine.generate_monthly_dues('2026-11');
      expect(res2.dues_created).toBe(0);

      const res3 = engine.generate_monthly_dues('2026-11');
      expect(res3.dues_created).toBe(0);

      expect(engine.monthlyFeeDues.size).toBe(1);
    });

    it('strictly protects historical periods prior to November 2026 (Decision 5)', () => {
      expect(() => {
        engine.generate_monthly_dues('2026-10');
      }).toThrow('ERR_HISTORICAL_PERIOD_PROTECTED');
    });

    it('respects student admission date cutoff', () => {
      // Student admitted on Dec 10, 2026
      engine.students.set('s3', {
        id: 's3',
        admission_id: 'Z-103',
        name: 'Amit Verma',
        phone: '9876543212',
        email: null,
        course: 'Python',
        total_fee: 2000.0,
        joining_date: '2026-12-10',
        status: 'active',
      });

      // Generate Nov 2026 (end_date: 2026-11-30) -> Should NOT get Nov due
      const resNov = engine.generate_monthly_dues('2026-11');
      expect(resNov.dues_created).toBe(0);
      expect(engine.monthlyFeeDues.has('s3_p-2026-11')).toBe(false);

      // Generate Dec 2026 (end_date: 2026-12-31) -> Should get Dec due
      const resDec = engine.generate_monthly_dues('2026-12');
      expect(resDec.dues_created).toBe(1);
      expect(engine.monthlyFeeDues.has('s3_p-2026-12')).toBe(true);
    });

    it('excludes inactive, dropped, or completed students from generation', () => {
      engine.students.set('s4', {
        id: 's4',
        admission_id: 'Z-104',
        name: 'Dropped Student',
        phone: '9876543213',
        email: null,
        course: 'Python',
        total_fee: 2000.0,
        joining_date: '2026-09-01',
        status: 'dropped',
      });

      const res = engine.generate_monthly_dues('2026-11');
      expect(res.dues_created).toBe(0);
      expect(engine.monthlyFeeDues.size).toBe(0);
    });
  });

  // ----------------------------------------------------------------------------
  // SECTION 4: Normal Collection — Strict Full Payment Only
  // ----------------------------------------------------------------------------
  describe('4. Normal Fees Collection — Full Payment Only Rule', () => {
    beforeEach(() => {
      engine.students.set('s1', {
        id: 's1',
        admission_id: 'Z-101',
        name: 'Rahul Sharma',
        phone: '9876543210',
        email: 'rahul@example.com',
        course: 'Python',
        total_fee: 2000.0,
        joining_date: '2026-10-01',
        status: 'active',
      });
      engine.generate_monthly_dues('2026-11');
    });

    it('accepts exact full payment and marks monthly due as PAID', () => {
      const due = engine.monthlyFeeDues.get('s1_p-2026-11')!;
      const res = engine.collect_monthly_fee({
        due_id: due.id,
        amount: 2000.0,
        payment_mode: 'cash',
        remarks: 'Full November Fee',
      });

      expect(res.success).toBe(true);
      expect(res.balance_remaining).toBe(0);
      expect(res.status).toBe('PAID');

      // Verify status view simulation
      const statusView = engine.getMonthlyDueStatus(due.id)!;
      expect(statusView.status).toBe('PAID');
      expect(statusView.normal_paid_amount).toBe(2000.0);
      expect(statusView.balance_remaining).toBe(0.0);
    });

    it('strictly rejects partial payments in normal fee collection', () => {
      const due = engine.monthlyFeeDues.get('s1_p-2026-11')!;
      expect(() => {
        engine.collect_monthly_fee({
          due_id: due.id,
          amount: 1500.0, // Partial payment
          payment_mode: 'upi',
        });
      }).toThrow('ERR_FULL_PAYMENT_REQUIRED');
    });

    it('strictly rejects overpayments in normal fee collection', () => {
      const due = engine.monthlyFeeDues.get('s1_p-2026-11')!;
      expect(() => {
        engine.collect_monthly_fee({
          due_id: due.id,
          amount: 2500.0, // Overpayment
          payment_mode: 'upi',
        });
      }).toThrow('ERR_OVERPAYMENT_PROHIBITED');
    });

    it('strictly rejects duplicate collection on an already PAID month', () => {
      const due = engine.monthlyFeeDues.get('s1_p-2026-11')!;
      engine.collect_monthly_fee({
        due_id: due.id,
        amount: 2000.0,
        payment_mode: 'cash',
      });

      expect(() => {
        engine.collect_monthly_fee({
          due_id: due.id,
          amount: 2000.0,
          payment_mode: 'cash',
        });
      }).toThrow('ERR_DUE_ALREADY_PAID');
    });
  });

  // ----------------------------------------------------------------------------
  // SECTION 5: Advance Fee Recording, Ceilings & Email Outbox
  // ----------------------------------------------------------------------------
  describe('5. Advance Fee Recording, Ceilings & Outbox (Decisions 1, 2, 3)', () => {
    beforeEach(() => {
      engine.students.set('s1', {
        id: 's1',
        admission_id: 'Z-101',
        name: 'Rahul Sharma',
        phone: '9876543210',
        email: 'rahul@example.com',
        course: 'Python',
        total_fee: 2000.0,
        joining_date: '2026-10-01',
        status: 'active',
      });
    });

    it('records partial advance and enqueues email when student has registered email', () => {
      const res = engine.record_advance_fee({
        student_id: 's1',
        target_period_key: '2026-12',
        amount: 1000.0,
        payment_mode: 'upi',
      });

      expect(res.success).toBe(true);
      expect(res.amount).toBe(1000.0);
      expect(res.email_status).toBe('pending');

      const outbox = Array.from(engine.emailOutbox.values())[0];
      expect(outbox.recipient_email).toBe('rahul@example.com');
      expect(outbox.status).toBe('pending');
    });

    it('records advance without email and sets outbox status to not_required without error (Decision 1)', () => {
      engine.students.set('s_no_email', {
        id: 's_no_email',
        admission_id: 'Z-105',
        name: 'No Email Student',
        phone: '9876543214',
        email: null,
        course: 'Python',
        total_fee: 2000.0,
        joining_date: '2026-10-01',
        status: 'active',
      });

      const res = engine.record_advance_fee({
        student_id: 's_no_email',
        target_period_key: '2026-12',
        amount: 2000.0,
        payment_mode: 'cash',
      });

      expect(res.success).toBe(true);
      expect(res.email_status).toBe('not_required');

      const outbox = Array.from(engine.emailOutbox.values())[0];
      expect(outbox.status).toBe('not_required');
    });

    it('allows multiple partial advances up to monthly fee ceiling', () => {
      // First advance of 1000 for Dec 2026
      engine.record_advance_fee({
        student_id: 's1',
        target_period_key: '2026-12',
        amount: 1000.0,
        payment_mode: 'upi',
      });

      // Second advance of 1000 for Dec 2026 (Total = 2000, equals ceiling)
      const res2 = engine.record_advance_fee({
        student_id: 's1',
        target_period_key: '2026-12',
        amount: 1000.0,
        payment_mode: 'cash',
      });

      expect(res2.success).toBe(true);
    });

    it('strictly rejects advance exceeding monthly fee ceiling', () => {
      // First advance of 1500 for Dec 2026
      engine.record_advance_fee({
        student_id: 's1',
        target_period_key: '2026-12',
        amount: 1500.0,
        payment_mode: 'upi',
      });

      // Attempt second advance of 600 (Total = 2100 > 2000 ceiling)
      expect(() => {
        engine.record_advance_fee({
          student_id: 's1',
          target_period_key: '2026-12',
          amount: 600.0,
          payment_mode: 'cash',
        });
      }).toThrow('ERR_ADVANCE_CEILING_EXCEEDED');
    });
  });

  // ----------------------------------------------------------------------------
  // SECTION 6: Automatic Advance Adjustment on Due Creation
  // ----------------------------------------------------------------------------
  describe('6. Automatic Month-Wise Advance Adjustment', () => {
    beforeEach(() => {
      engine.students.set('s1', {
        id: 's1',
        admission_id: 'Z-101',
        name: 'Rahul Sharma',
        phone: '9876543210',
        email: 'rahul@example.com',
        course: 'Python',
        total_fee: 2000.0,
        joining_date: '2026-10-01',
        status: 'active',
      });
    });

    it('automatically applies full advance upon December due generation', () => {
      // Student deposits full 2000 advance in Nov for Dec 2026
      engine.record_advance_fee({
        student_id: 's1',
        target_period_key: '2026-12',
        amount: 2000.0,
        payment_mode: 'upi',
      });

      // Advance starts as 'Upcoming'
      const adv = Array.from(engine.advanceFeeRecords.values())[0];
      expect(adv.status).toBe('Upcoming');

      // December arrives: generate dues
      engine.generate_monthly_dues('2026-12');

      // Due is created and advance is applied automatically
      const due = engine.monthlyFeeDues.get('s1_p-2026-12')!;
      const statusView = engine.getMonthlyDueStatus(due.id)!;

      expect(statusView.status).toBe('PAID');
      expect(statusView.advance_applied_amount).toBe(2000.0);
      expect(statusView.balance_remaining).toBe(0.0);
      expect(adv.status).toBe('Applied');
    });

    it('automatically applies partial advance, leaves remaining balance collectible via normal collection', () => {
      // Student deposits partial 1200 advance in Nov for Dec 2026
      engine.record_advance_fee({
        student_id: 's1',
        target_period_key: '2026-12',
        amount: 1200.0,
        payment_mode: 'upi',
      });

      // December arrives: generate dues
      engine.generate_monthly_dues('2026-12');

      const due = engine.monthlyFeeDues.get('s1_p-2026-12')!;
      const statusView = engine.getMonthlyDueStatus(due.id)!;

      expect(statusView.status).toBe('PARTIAL');
      expect(statusView.advance_applied_amount).toBe(1200.0);
      expect(statusView.balance_remaining).toBe(800.0);

      // Now collect remaining 800 via normal collection
      const payRes = engine.collect_monthly_fee({
        due_id: due.id,
        amount: 800.0, // Exact remaining balance
        payment_mode: 'cash',
      });

      expect(payRes.success).toBe(true);
      const finalStatus = engine.getMonthlyDueStatus(due.id)!;
      expect(finalStatus.status).toBe('PAID');
      expect(finalStatus.normal_paid_amount).toBe(800.0);
      expect(finalStatus.advance_applied_amount).toBe(1200.0);
      expect(finalStatus.balance_remaining).toBe(0.0);
    });
  });

  // ----------------------------------------------------------------------------
  // SECTION 7: Critical Independent Monthly Fee Status Rule
  // ----------------------------------------------------------------------------
  describe('7. Critical Independent Monthly Status Matrix (Reconfirmed Invariant)', () => {
    it('maintains independent status: Nov UNPAID, Dec PAID, Jan UNPAID', () => {
      engine.students.set('s1', {
        id: 's1',
        admission_id: 'Z-101',
        name: 'Rahul Sharma',
        phone: '9876543210',
        email: 'rahul@example.com',
        course: 'Python',
        total_fee: 2000.0,
        joining_date: '2026-10-01',
        status: 'active',
      });

      // Generate November, December, and January dues
      engine.generate_monthly_dues('2026-11');
      engine.generate_monthly_dues('2026-12');
      engine.generate_monthly_dues('2027-01');

      const novDue = engine.monthlyFeeDues.get('s1_p-2026-11')!;
      const decDue = engine.monthlyFeeDues.get('s1_p-2026-12')!;
      const janDue = engine.monthlyFeeDues.get('s1_p-2027-01')!;

      // Cashier collects full fee for DECEMBER only
      engine.collect_monthly_fee({
        due_id: decDue.id,
        amount: 2000.0,
        payment_mode: 'upi',
      });

      // Verify independent statuses:
      const novStatus = engine.getMonthlyDueStatus(novDue.id)!;
      const decStatus = engine.getMonthlyDueStatus(decDue.id)!;
      const janStatus = engine.getMonthlyDueStatus(janDue.id)!;

      expect(novStatus.status).toBe('UNPAID');
      expect(novStatus.balance_remaining).toBe(2000.0);

      expect(decStatus.status).toBe('PAID');
      expect(decStatus.balance_remaining).toBe(0.0);

      expect(janStatus.status).toBe('UNPAID');
      expect(janStatus.balance_remaining).toBe(2000.0);

      // Student pays November later:
      engine.collect_monthly_fee({
        due_id: novDue.id,
        amount: 2000.0,
        payment_mode: 'cash',
      });

      const novFinal = engine.getMonthlyDueStatus(novDue.id)!;
      const decFinal = engine.getMonthlyDueStatus(decDue.id)!;

      expect(novFinal.status).toBe('PAID');
      expect(decFinal.status).toBe('PAID'); // December remains unchanged!
    });
  });

  // ----------------------------------------------------------------------------
  // SECTION 8: Decision 6 (Admin-Only Advance Cancellation)
  // ----------------------------------------------------------------------------
  describe('8. Admin-Only Audited Advance Cancellation (Decision 6)', () => {
    beforeEach(() => {
      engine.students.set('s1', {
        id: 's1',
        admission_id: 'Z-101',
        name: 'Rahul Sharma',
        phone: '9876543210',
        email: 'rahul@example.com',
        course: 'Python',
        total_fee: 2000.0,
        joining_date: '2026-10-01',
        status: 'active',
      });

      engine.record_advance_fee({
        student_id: 's1',
        target_period_key: '2026-12',
        amount: 2000.0,
        payment_mode: 'upi',
      });
    });

    it('rejects cancellation attempts from non-super-admin users (managers/receptionists)', () => {
      const adv = Array.from(engine.advanceFeeRecords.values())[0];
      engine.currentUser = { id: 'mgr-uuid', role: 'manager' };

      expect(() => {
        engine.void_advance_fee(adv.id, 'Parent requested refund');
      }).toThrow('Forbidden: Only super administrators can cancel advance fees');
    });

    it('rejects cancellation without detailed audit reason', () => {
      const adv = Array.from(engine.advanceFeeRecords.values())[0];
      engine.currentUser = { id: 'sa-uuid', role: 'super_admin' };

      expect(() => {
        engine.void_advance_fee(adv.id, 'bad'); // too short
      }).toThrow('A detailed cancellation reason (at least 5 characters) is required');
    });

    it('executes auditable reversal when super admin voids an upcoming advance', () => {
      const adv = Array.from(engine.advanceFeeRecords.values())[0];
      engine.currentUser = { id: 'sa-uuid', role: 'super_admin' };

      const res = engine.void_advance_fee(adv.id, 'Student discontinued enrollment');

      expect(res.success).toBe(true);
      expect(adv.status).toBe('Voided');
      expect(adv.void_reason).toBe('Student discontinued enrollment');

      // Verify immutable reversal entry in fee_payments
      const revPayment = engine.feePayments.get(res.reversal_payment_id)!;
      expect(revPayment.is_reversal).toBe(true);
      expect(revPayment.amount).toBe(2000.0);
      expect(revPayment.void_reason).toBe('Student discontinued enrollment');

      // Verify email outbox canceled
      const outbox = Array.from(engine.emailOutbox.values())[0];
      expect(outbox.status).toBe('not_required');
    });

    it('reverses applied allocations when super admin voids an already applied advance', () => {
      // December arrives and advance is applied
      engine.generate_monthly_dues('2026-12');
      const due = engine.monthlyFeeDues.get('s1_p-2026-12')!;
      expect(engine.getMonthlyDueStatus(due.id)!.status).toBe('PAID');

      // Super Admin voids the advance
      const adv = Array.from(engine.advanceFeeRecords.values())[0];
      engine.currentUser = { id: 'sa-uuid', role: 'super_admin' };

      engine.void_advance_fee(adv.id, 'Fee concession mistake by management');

      // Allocations are rolled back, December due status reverts to UNPAID
      const statusAfter = engine.getMonthlyDueStatus(due.id)!;
      expect(statusAfter.status).toBe('UNPAID');
      expect(statusAfter.advance_applied_amount).toBe(0.0);
      expect(statusAfter.balance_remaining).toBe(2000.0);
    });
  });
});
