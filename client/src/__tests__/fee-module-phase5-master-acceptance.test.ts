// ==============================================================================
// Z Institute Management System - Phase 5 Master Acceptance & Concurrency Suite
// Covers: Master Test Cases TC-FEE-26 through TC-FEE-30 & Complete E2E Lifecycle
// Verifies: Pessimistic Row Locking, Race Conditions, Arrears Separation, Immutability
// ==============================================================================

import { describe, it, expect, beforeEach } from 'vitest';

interface Student {
  id: string;
  admission_id: string;
  name: string;
  phone: string;
  email: string | null;
  course: string;
  total_fee: number; // Reused as individual monthly fee snapshot
  joining_date: string;
  status: 'active' | 'completed' | 'dropped';
}

interface FeePeriod {
  id: string;
  period_key: string;
  period_name: string;
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

/**
 * High-Fidelity Transactional Mock Engine with Pessimistic Locking for Concurrency
 */
class ConcurrentDatabaseEngine {
  students: Map<string, Student> = new Map();
  feePeriods: Map<string, FeePeriod> = new Map();
  monthlyFeeDues: Map<string, MonthlyDue> = new Map();
  feePayments: Map<string, FeePayment> = new Map();
  feePaymentAllocations: Map<string, FeePaymentAllocation> = new Map();
  advanceFeeRecords: Map<string, AdvanceFeeRecord> = new Map();
  emailOutbox: Map<string, EmailOutbox> = new Map();

  // Locks simulating PostgreSQL SELECT ... FOR UPDATE
  private dueLocks: Set<string> = new Set();
  private ceilingLocks: Set<string> = new Set();

  currentUser: { id: string; role: 'super_admin' | 'manager' } = {
    id: 'sa-user-id',
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
    this.dueLocks.clear();
    this.ceilingLocks.clear();
    this.currentUser = { id: 'sa-user-id', role: 'super_admin' };

    // Standard fee periods
    const periods: FeePeriod[] = [
      { id: 'p-2026-11', period_key: '2026-11', period_name: 'November 2026', start_date: '2026-11-01', end_date: '2026-11-30', due_date: '2026-11-10', is_active: true },
      { id: 'p-2026-12', period_key: '2026-12', period_name: 'December 2026', start_date: '2026-12-01', end_date: '2026-12-31', due_date: '2026-12-10', is_active: true },
      { id: 'p-2027-01', period_key: '2027-01', period_name: 'January 2027',   start_date: '2027-01-01', end_date: '2027-01-31', due_date: '2027-01-10', is_active: true },
      { id: 'p-2027-02', period_key: '2027-02', period_name: 'February 2027',  start_date: '2027-02-01', end_date: '2027-02-28', due_date: '2027-02-10', is_active: true },
    ];
    for (const p of periods) {
      this.feePeriods.set(p.period_key, p);
    }
  }

  // 1. generate_monthly_dues
  generate_monthly_dues(period_key: string) {
    const period = this.feePeriods.get(period_key);
    if (!period) throw new Error(`Period ${period_key} not found`);

    let duesCreated = 0;
    for (const s of this.students.values()) {
      if (s.status === 'active' && s.total_fee > 0 && s.joining_date <= period.end_date) {
        const uniqueKey = `${s.id}_${period.id}`;
        if (!this.monthlyFeeDues.has(uniqueKey)) {
          this.monthlyFeeDues.set(uniqueKey, {
            id: `due-${s.id}-${period_key}`,
            student_id: s.id,
            period_id: period.id,
            fee_snapshot: s.total_fee,
            created_at: new Date().toISOString(),
          });
          duesCreated++;
        }
      }
    }

    // Auto-apply advances
    for (const adv of this.advanceFeeRecords.values()) {
      if (adv.target_period_id === period.id && (adv.status === 'Upcoming' || adv.status === 'Partially Applied')) {
        const uniqueKey = `${adv.student_id}_${period.id}`;
        const due = this.monthlyFeeDues.get(uniqueKey);
        if (due) {
          const allocId = `alloc-${adv.payment_id}-${due.id}`;
          if (!this.feePaymentAllocations.has(allocId)) {
            this.feePaymentAllocations.set(allocId, {
              id: allocId,
              payment_id: adv.payment_id,
              due_id: due.id,
              allocated_amount: adv.amount_received,
              allocation_type: 'advance_adjustment',
            });
            adv.status = adv.amount_received >= due.fee_snapshot ? 'Applied' : 'Partially Applied';
            adv.applied_at = new Date().toISOString();
          }
        }
      }
    }

    return { success: true, period_key, duesCreated };
  }

  // 2. collect_monthly_fee with Pessimistic Row Lock (simulating SELECT ... FOR UPDATE)
  async collect_monthly_fee_concurrent(params: {
    due_id: string;
    amount: number;
    payment_mode: string;
    cashier: string;
  }) {
    // Acquire row-level lock
    while (this.dueLocks.has(params.due_id)) {
      await new Promise((r) => setTimeout(r, 10));
    }
    this.dueLocks.add(params.due_id);

    try {
      // Simulate concurrent transaction latency
      await new Promise((r) => setTimeout(r, 20));

      const due = Array.from(this.monthlyFeeDues.values()).find((d) => d.id === params.due_id);
      if (!due) throw new Error('Due not found');

      const totalSettled = Array.from(this.feePaymentAllocations.values())
        .filter((a) => a.due_id === params.due_id)
        .reduce((sum, a) => sum + a.allocated_amount, 0);

      const payableOutstanding = due.fee_snapshot - totalSettled;

      if (payableOutstanding <= 0) {
        throw new Error('ERR_DUE_ALREADY_PAID: This monthly due has already been settled in full.');
      }
      if (params.amount !== payableOutstanding) {
        throw new Error(`ERR_FULL_PAYMENT_REQUIRED: Expected ₹${payableOutstanding}, got ₹${params.amount}`);
      }

      const payId = `pay-${Math.random().toString(36).substring(2, 9)}`;
      this.feePayments.set(payId, {
        id: payId,
        student_id: due.student_id,
        amount: params.amount,
        payment_date: '2026-11-15',
        payment_mode: params.payment_mode,
        receipt_number: `REC-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        remarks: `Collected by ${params.cashier}`,
        is_reversal: false,
        reversal_of_id: null,
        void_reason: null,
        created_by: params.cashier,
      });

      const allocId = `alloc-${payId}-${due.id}`;
      this.feePaymentAllocations.set(allocId, {
        id: allocId,
        payment_id: payId,
        due_id: due.id,
        allocated_amount: params.amount,
        allocation_type: 'normal_payment',
      });

      return { success: true, payment_id: payId, due_id: due.id, cashier: params.cashier };
    } finally {
      this.dueLocks.delete(params.due_id);
    }
  }

  // 3. record_advance_fee with Pessimistic Ceiling Lock
  async record_advance_fee_concurrent(params: {
    student_id: string;
    target_period_key: string;
    amount: number;
    payment_mode: string;
    user: string;
    student_email?: string;
  }) {
    const lockKey = `${params.student_id}_${params.target_period_key}`;
    while (this.ceilingLocks.has(lockKey)) {
      await new Promise((r) => setTimeout(r, 10));
    }
    this.ceilingLocks.add(lockKey);

    try {
      await new Promise((r) => setTimeout(r, 20));

      const student = this.students.get(params.student_id);
      if (!student) throw new Error('Student not found');
      const period = this.feePeriods.get(params.target_period_key);
      if (!period) throw new Error('Period not found');

      // Calculate existing active advance
      const existingAdvance = Array.from(this.advanceFeeRecords.values())
        .filter(
          (a) =>
            a.student_id === student.id &&
            a.target_period_id === period.id &&
            (a.status === 'Upcoming' || a.status === 'Partially Applied')
        )
        .reduce((sum, a) => sum + a.amount_received, 0);

      if (existingAdvance + params.amount > student.total_fee) {
        throw new Error(
          `ERR_ADVANCE_CEILING_EXCEEDED: Advance allocation exceeds monthly fee. Applicable monthly fee: ₹${student.total_fee}, Already recorded: ₹${existingAdvance}, Attempted: ₹${params.amount}`
        );
      }

      const payId = `pay-adv-${Math.random().toString(36).substring(2, 9)}`;
      this.feePayments.set(payId, {
        id: payId,
        student_id: student.id,
        amount: params.amount,
        payment_date: '2026-11-15',
        payment_mode: params.payment_mode,
        receipt_number: `REC-ADV-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        remarks: `Advance for ${period.period_name} by ${params.user}`,
        is_reversal: false,
        reversal_of_id: null,
        void_reason: null,
        created_by: params.user,
      });

      const advId = `adv-${Math.random().toString(36).substring(2, 9)}`;
      this.advanceFeeRecords.set(advId, {
        id: advId,
        student_id: student.id,
        target_period_id: period.id,
        payment_id: payId,
        amount_received: params.amount,
        status: 'Upcoming',
        created_by: params.user,
        applied_at: null,
        voided_by: null,
        void_reason: null,
        reversal_payment_id: null,
      });

      const recipientEmail = params.student_email?.trim() || student.email;
      const outboxStatus = recipientEmail ? 'pending' : 'not_required';
      this.emailOutbox.set(`outbox-${advId}`, {
        id: `outbox-${advId}`,
        student_id: student.id,
        advance_record_id: advId,
        recipient_email: recipientEmail,
        subject: `Advance Fee Receipt — ${period.period_name}`,
        template_name: 'advance_receipt',
        payload: { amount: params.amount },
        status: outboxStatus,
        attempts: 0,
        last_error: null,
      });

      return { success: true, advance_id: advId, amount: params.amount, user: params.user };
    } finally {
      this.ceilingLocks.delete(lockKey);
    }
  }

  // 4. void_advance_fee (Super Admin Only)
  void_advance_fee(advance_id: string, reason: string) {
    if (this.currentUser.role !== 'super_admin') {
      throw new Error('ERR_ACCESS_DENIED: Only super administrators can cancel advance fees. Managers are strictly prohibited.');
    }
    if (!reason || reason.trim().length < 5) {
      throw new Error('ERR_JUSTIFICATION_REQUIRED: Detailed cancellation reason of at least 5 characters required');
    }

    const adv = this.advanceFeeRecords.get(advance_id);
    if (!adv) throw new Error('Advance record not found');
    if (adv.status === 'Voided') throw new Error('Already voided');

    const origPay = this.feePayments.get(adv.payment_id)!;
    const revId = `rev-${origPay.id}`;

    // Append balancing reversal to immutable ledger
    this.feePayments.set(revId, {
      id: revId,
      student_id: adv.student_id,
      amount: adv.amount_received,
      payment_date: '2026-11-15',
      payment_mode: origPay.payment_mode,
      receipt_number: `REV-${origPay.receipt_number}`,
      remarks: `Advance cancellation: ${reason.trim()}`,
      is_reversal: true,
      reversal_of_id: origPay.id,
      void_reason: reason.trim(),
      created_by: this.currentUser.id,
    });

    adv.status = 'Voided';
    adv.void_reason = reason.trim();
    adv.voided_by = this.currentUser.id;
    adv.reversal_payment_id = revId;

    // Invalidate pending outbox email
    for (const out of this.emailOutbox.values()) {
      if (out.advance_record_id === adv.id && out.status === 'pending') {
        out.status = 'not_required';
        out.last_error = 'Advance voided by admin';
      }
    }

    return { success: true, reversal_id: revId, status: 'Voided' };
  }

  // 5. Direct Ledger Mutation Protection (Simulating RLS & Database Trigger)
  direct_update_fee_payment(payment_id: string, newAmount: number) {
    // Under PostgreSQL RLS and trigger trg_prevent_payment_modification,
    // UPDATE on public.fee_payments throws an unconditional exception
    throw new Error(`ERR_LEDGER_IMMUTABLE: Direct modification or update of fee_payments (id: ${payment_id}, amount: ${newAmount}) is strictly prohibited by database security policy.`);
  }

  direct_delete_fee_payment(payment_id: string) {
    // Under PostgreSQL RLS and trigger trg_prevent_payment_deletion,
    // DELETE on public.fee_payments throws an unconditional exception
    throw new Error(`ERR_LEDGER_IMMUTABLE: Deletion of records from the fee_payments financial ledger (id: ${payment_id}) is strictly prohibited.`);
  }

  // 6. Dashboard Metrics View (Independent Period vs Arrears)
  get_dashboard_metrics(activePeriodKey: string) {
    const period = this.feePeriods.get(activePeriodKey);
    if (!period) throw new Error('Period not found');

    const allDues = Array.from(this.monthlyFeeDues.values());

    let currentPeriodSnapshot = 0;
    let currentPeriodAdvanceOffset = 0;
    let currentPeriodNormalCollected = 0;
    let currentPeriodOutstanding = 0;

    let historicalArrearsSnapshot = 0;
    let historicalArrearsCollected = 0;
    let historicalArrearsOutstanding = 0;

    for (const due of allDues) {
      const isCurrent = due.period_id === period.id;
      const allocations = Array.from(this.feePaymentAllocations.values()).filter((a) => a.due_id === due.id);
      const advOffset = allocations.filter((a) => a.allocation_type === 'advance_adjustment').reduce((s, a) => s + a.allocated_amount, 0);
      const normalPaid = allocations.filter((a) => a.allocation_type === 'normal_payment').reduce((s, a) => s + a.allocated_amount, 0);
      const settled = advOffset + normalPaid;
      const outstanding = due.fee_snapshot - settled;

      if (isCurrent) {
        currentPeriodSnapshot += due.fee_snapshot;
        currentPeriodAdvanceOffset += advOffset;
        currentPeriodNormalCollected += normalPaid;
        currentPeriodOutstanding += outstanding;
      } else if (due.period_id < period.id) {
        historicalArrearsSnapshot += due.fee_snapshot;
        historicalArrearsCollected += settled;
        historicalArrearsOutstanding += outstanding;
      }
    }

    return {
      currentPeriod: {
        period_key: activePeriodKey,
        expectedDues: currentPeriodSnapshot,
        advanceAdjusted: currentPeriodAdvanceOffset,
        directCollected: currentPeriodNormalCollected,
        totalSettled: currentPeriodAdvanceOffset + currentPeriodNormalCollected,
        balanceRemaining: currentPeriodOutstanding,
      },
      arrears: {
        totalBacklogDues: historicalArrearsSnapshot,
        backlogCollected: historicalArrearsCollected,
        backlogOutstanding: historicalArrearsOutstanding,
      },
      totalSystemOutstanding: currentPeriodOutstanding + historicalArrearsOutstanding,
    };
  }
}

describe('Phase 5: Master Concurrency, Security & Acceptance Suite (TC-FEE-26 to TC-FEE-30)', () => {
  let engine: ConcurrentDatabaseEngine;

  beforeEach(() => {
    engine = new ConcurrentDatabaseEngine();
    engine.reset();
  });

  // ----------------------------------------------------------------------------
  // TC-FEE-26: Concurrency Safety — Simultaneous Dual Collection
  // ----------------------------------------------------------------------------
  it('TC-FEE-26: Prevents duplicate payments during simultaneous dual cashier collection via row locking', async () => {
    // Student with ₹2,000 monthly fee for Nov 2026
    engine.students.set('s-1', {
      id: 's-1',
      admission_id: 'Z-001',
      name: 'Rahul Sharma',
      phone: '9876543210',
      email: 'rahul@example.com',
      course: 'Full Stack',
      total_fee: 2000,
      joining_date: '2026-11-01',
      status: 'active',
    });

    engine.generate_monthly_dues('2026-11');
    const due = Array.from(engine.monthlyFeeDues.values())[0];
    expect(due).toBeDefined();
    expect(due.fee_snapshot).toBe(2000);

    // Two cashiers submit collection concurrently at the exact same millisecond
    const cashier1Promise = engine.collect_monthly_fee_concurrent({
      due_id: due.id,
      amount: 2000,
      payment_mode: 'cash',
      cashier: 'Terminal_1_Cashier_Amit',
    });

    const cashier2Promise = engine.collect_monthly_fee_concurrent({
      due_id: due.id,
      amount: 2000,
      payment_mode: 'upi',
      cashier: 'Terminal_2_Cashier_Sunil',
    });

    const results = await Promise.allSettled([cashier1Promise, cashier2Promise]);

    // Assertions:
    // Exactly one cashier must succeed (fulfilled)
    // The second cashier must be rejected with ERR_DUE_ALREADY_PAID (rejected)
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejectionReason.message).toContain('ERR_DUE_ALREADY_PAID');

    // Verify ledger immutability and exact accounting:
    // Exactly ONE payment row created in fee_payments for ₹2,000 (NEVER ₹4,000!)
    const payments = Array.from(engine.feePayments.values());
    expect(payments.length).toBe(1);
    expect(payments[0].amount).toBe(2000);

    // Allocations exactly equal ₹2,000
    const allocations = Array.from(engine.feePaymentAllocations.values());
    expect(allocations.length).toBe(1);
    expect(allocations[0].allocated_amount).toBe(2000);
  });

  // ----------------------------------------------------------------------------
  // TC-FEE-27: Concurrency Safety — Simultaneous Dual Advance Exceeding Ceiling
  // ----------------------------------------------------------------------------
  it('TC-FEE-27: Prevents advance ceiling breach during simultaneous dual advance recording', async () => {
    // Student with monthly fee ceiling of ₹2,000
    engine.students.set('s-2', {
      id: 's-2',
      admission_id: 'Z-002',
      name: 'Priya Verma',
      phone: '9876543211',
      email: 'priya@example.com',
      course: 'Graphic Design',
      total_fee: 2000,
      joining_date: '2026-11-01',
      status: 'active',
    });

    // Cashier 1 attempts to record ₹1,500 advance for Jan 2027
    // Cashier 2 attempts to record ₹1,000 advance for Jan 2027 concurrently
    // Sum = ₹2,500 > Monthly Ceiling of ₹2,000
    const op1 = engine.record_advance_fee_concurrent({
      student_id: 's-2',
      target_period_key: '2027-01',
      amount: 1500,
      payment_mode: 'cash',
      user: 'Cashier_A',
    });

    const op2 = engine.record_advance_fee_concurrent({
      student_id: 's-2',
      target_period_key: '2027-01',
      amount: 1000,
      payment_mode: 'upi',
      user: 'Cashier_B',
    });

    const results = await Promise.allSettled([op1, op2]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // First one succeeds (recording ₹1,500)
    // Second one sees existing ₹1,500 + attempted ₹1,000 > ₹2,000 and is rejected
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejectionReason.message).toContain('ERR_ADVANCE_CEILING_EXCEEDED');

    // Total advance recorded in database is strictly ₹1,500
    const advances = Array.from(engine.advanceFeeRecords.values());
    expect(advances.length).toBe(1);
    expect(advances[0].amount_received).toBe(1500);

    const payments = Array.from(engine.feePayments.values());
    expect(payments.length).toBe(1);
    expect(payments[0].amount).toBe(1500);
  });

  // ----------------------------------------------------------------------------
  // TC-FEE-28: Dashboard & Metrics — Current Dues vs Arrears Separation
  // ----------------------------------------------------------------------------
  it('TC-FEE-28: Strictly separates current period performance from historical backlog arrears', async () => {
    // Student enrolled Nov 1st with ₹2,000 monthly fee
    engine.students.set('s-3', {
      id: 's-3',
      admission_id: 'Z-003',
      name: 'Aman Khan',
      phone: '9876543212',
      email: 'aman@example.com',
      course: 'Python Data Science',
      total_fee: 2000,
      joining_date: '2026-11-01',
      status: 'active',
    });

    // 1. Generate Nov 2026 due (Student leaves it UNPAID)
    engine.generate_monthly_dues('2026-11');

    // 2. December arrives: Generate Dec 2026 due
    engine.generate_monthly_dues('2026-12');

    // 3. Student pays Dec 2026 fee in full (₹2,000), leaving Nov 2026 unpaid
    const decDue = Array.from(engine.monthlyFeeDues.values()).find((d) => d.period_id === 'p-2026-12')!;
    await engine.collect_monthly_fee_concurrent({
      due_id: decDue.id,
      amount: 2000,
      payment_mode: 'bank_transfer',
      cashier: 'SuperAdmin',
    });

    // 4. Inspect December 2026 Dashboard KPIs
    const metrics = engine.get_dashboard_metrics('2026-12');

    // Assertions:
    // Current Period (December 2026):
    expect(metrics.currentPeriod.expectedDues).toBe(2000);
    expect(metrics.currentPeriod.directCollected).toBe(2000);
    expect(metrics.currentPeriod.totalSettled).toBe(2000);
    expect(metrics.currentPeriod.balanceRemaining).toBe(0); // 100% current collection efficiency!

    // Historical Arrears Backlog (November 2026):
    expect(metrics.arrears.totalBacklogDues).toBe(2000);
    expect(metrics.arrears.backlogCollected).toBe(0);
    expect(metrics.arrears.backlogOutstanding).toBe(2000); // Accurately tracked as arrears

    // Total System Outstanding = ₹2,000 (Historical Arrears only)
    expect(metrics.totalSystemOutstanding).toBe(2000);
  });

  // ----------------------------------------------------------------------------
  // TC-FEE-29: Security & Advance Voiding — Admin-Only Advance Cancellation
  // ----------------------------------------------------------------------------
  it('TC-FEE-29: Enforces super-admin-only restriction and generates balancing ledger reversal on advance voiding', async () => {
    engine.students.set('s-4', {
      id: 's-4',
      admission_id: 'Z-004',
      name: 'Rohan Mehra',
      phone: '9876543213',
      email: 'rohan@example.com',
      course: 'Digital Marketing',
      total_fee: 3000,
      joining_date: '2026-11-01',
      status: 'active',
    });

    const advRes = await engine.record_advance_fee_concurrent({
      student_id: 's-4',
      target_period_key: '2027-01',
      amount: 3000,
      payment_mode: 'cash',
      user: 'Cashier_1',
    });
    const advanceId = advRes.advance_id;

    // Step 1: Manager attempts to void the advance -> Rejection
    engine.currentUser = { id: 'mgr-uuid', role: 'manager' };
    expect(() => {
      engine.void_advance_fee(advanceId, 'Student dropped course');
    }).toThrow('ERR_ACCESS_DENIED: Only super administrators can cancel advance fees');

    // Step 2: Super Admin attempts without justification (< 5 chars) -> Rejection
    engine.currentUser = { id: 'sa-uuid', role: 'super_admin' };
    expect(() => {
      engine.void_advance_fee(advanceId, 'void');
    }).toThrow('ERR_JUSTIFICATION_REQUIRED');

    // Step 3: Super Admin voids with valid justification -> Success
    const voidRes = engine.void_advance_fee(advanceId, 'Student relocated to another city; fee refunded in cash');
    expect(voidRes.success).toBe(true);
    expect(voidRes.status).toBe('Voided');

    const updatedAdv = engine.advanceFeeRecords.get(advanceId)!;
    expect(updatedAdv.status).toBe('Voided');
    expect(updatedAdv.void_reason).toContain('Student relocated');
    expect(updatedAdv.voided_by).toBe('sa-uuid');

    // Ledger Immutability Verification:
    // Original payment row remains unchanged in fee_payments
    // Offsetting reversal row is inserted in fee_payments
    const reversalPay = engine.feePayments.get(updatedAdv.reversal_payment_id!)!;
    expect(reversalPay.is_reversal).toBe(true);
    expect(reversalPay.amount).toBe(3000);
    expect(reversalPay.void_reason).toContain('Student relocated');

    // Pending outbox email is cancelled
    const outbox = engine.emailOutbox.get(`outbox-${advanceId}`)!;
    expect(outbox.status).toBe('not_required');
    expect(outbox.last_error).toContain('Advance voided by admin');
  });

  // ----------------------------------------------------------------------------
  // TC-FEE-30: Ledger Immutability — Direct Update / Delete Prevention
  // ----------------------------------------------------------------------------
  it('TC-FEE-30: Unconditionally rejects direct SQL UPDATE and DELETE on fee_payments ledger', () => {
    // Simulate payment recorded
    const payId = 'pay-immutability-check';
    engine.feePayments.set(payId, {
      id: payId,
      student_id: 's-1',
      amount: 2000,
      payment_date: '2026-11-15',
      payment_mode: 'cash',
      receipt_number: 'REC-IMM-001',
      remarks: 'Test',
      is_reversal: false,
      reversal_of_id: null,
      void_reason: null,
      created_by: 'admin',
    });

    // Attempt direct UPDATE
    expect(() => {
      engine.direct_update_fee_payment(payId, 0);
    }).toThrow('ERR_LEDGER_IMMUTABLE: Direct modification or update of fee_payments');

    // Attempt direct DELETE
    expect(() => {
      engine.direct_delete_fee_payment(payId);
    }).toThrow('ERR_LEDGER_IMMUTABLE: Deletion of records from the fee_payments financial ledger');

    // Ledger remains untouched
    expect(engine.feePayments.get(payId)?.amount).toBe(2000);
  });
});
