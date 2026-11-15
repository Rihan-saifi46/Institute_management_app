// ==============================================================================
// Z Institute Management System — Master End-to-End QA Test Suite
// Verifies: Student Lifecycle, Monthly Fee Lifecycle (Scenarios A-F),
//           Daily Batch Attendance (Scenarios A-E), Export, Security & Constraints
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createStudent,
  updateStudent,
  deleteStudent,
  type Student,
} from '../services/students';
import {
  recordPayment,
  reversePayment,
  getStudentPaymentHistory,
  type StudentFeeSummary,
} from '../services/fees';
import {
  saveBatchAttendance,
  getAttendanceForDate,
  getStudentAttendanceStats,
  type BatchAttendanceItem,
} from '../services/attendance';
import { escapeCsvField } from '../services/export';
import { supabase } from '../lib/supabase';

/**
 * High-fidelity in-memory relational simulation of the PostgreSQL database engine.
 * Mimics tables, checks, unique indexes (lower/trimmed), foreign keys with ON DELETE RESTRICT,
 * atomic RPC procedures (mark_batch_attendance, reverse_payment), and student_fee_summary view.
 */
class MockDatabaseEngine {
  students: Map<string, any> = new Map();
  feePayments: Map<string, any> = new Map();
  attendance: Map<string, any> = new Map();
  admins: Map<string, any> = new Map();

  currentUser: { id: string; role: 'super_admin' | 'manager' } | null = {
    id: 'sa-uuid',
    role: 'super_admin',
  };

  reset() {
    this.students.clear();
    this.feePayments.clear();
    this.attendance.clear();
    this.admins.clear();
    this.admins.set('sa-uuid', {
      id: 'admin-1',
      user_id: 'sa-uuid',
      email: 'saifirihan683@gmail.com',
      full_name: 'Z Institute Owner',
      role: 'super_admin',
    });
    this.admins.set('mgr-uuid', {
      id: 'admin-2',
      user_id: 'mgr-uuid',
      email: 'manager@zinstitute.internal',
      full_name: 'Staff Manager',
      role: 'manager',
    });
    this.currentUser = { id: 'sa-uuid', role: 'super_admin' };
  }

  // --- Students Engine ---
  insertStudent(payload: any) {
    const admissionId = String(payload.admission_id || '').trim();
    const name = String(payload.name || '').trim();
    const phone = String(payload.phone || '').trim();
    const course = String(payload.course || '').trim();
    const totalFee = Number(payload.total_fee);

    if (!admissionId) throw new Error('check_admission_id_not_empty');
    if (!name) throw new Error('check_name_not_empty');
    if (!phone) throw new Error('check_phone_not_empty');
    if (!course) throw new Error('check_course_not_empty');
    if (isNaN(totalFee) || totalFee < 0) throw new Error('check_total_fee_positive');

    // Case-insensitive & trimmed unique index
    const normalizedAdmission = admissionId.toLowerCase();
    for (const s of this.students.values()) {
      if (s.admission_id.trim().toLowerCase() === normalizedAdmission) {
        const err: any = new Error(`duplicate key value violates unique constraint "unique_trimmed_lower_admission_id"`);
        err.code = '23505';
        throw err;
      }
    }

    const id = payload.id || `stu-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const record = {
      id,
      admission_id: admissionId,
      name,
      phone,
      course,
      total_fee: totalFee,
      joining_date: payload.joining_date || '2026-11-15',
      status: payload.status || 'active',
      notes: payload.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.students.set(id, record);
    return record;
  }

  updateStudent(id: string, payload: any) {
    const existing = this.students.get(id);
    if (!existing) throw new Error('Student not found');

    if (payload.admission_id !== undefined) {
      const normalized = String(payload.admission_id).trim().toLowerCase();
      for (const [sId, s] of this.students.entries()) {
        if (sId !== id && s.admission_id.trim().toLowerCase() === normalized) {
          const err: any = new Error(`duplicate key value violates unique constraint "unique_trimmed_lower_admission_id"`);
          err.code = '23505';
          throw err;
        }
      }
      existing.admission_id = String(payload.admission_id).trim();
    }

    if (payload.name !== undefined) existing.name = String(payload.name).trim();
    if (payload.phone !== undefined) existing.phone = String(payload.phone).trim();
    if (payload.course !== undefined) existing.course = String(payload.course).trim();
    if (payload.total_fee !== undefined) {
      const fee = Number(payload.total_fee);
      if (fee < 0) throw new Error('check_total_fee_positive');
      existing.total_fee = fee;
    }
    if (payload.status !== undefined) existing.status = payload.status;
    if (payload.joining_date !== undefined) existing.joining_date = payload.joining_date;

    existing.updated_at = new Date().toISOString();
    return existing;
  }

  deleteStudent(id: string) {
    if (!this.students.has(id)) throw new Error('Student not found');

    // RLS Policy Check: Only super_admin can delete students
    if (this.currentUser?.role !== 'super_admin') {
      const err: any = new Error('new row violates row-level security policy for table "students"');
      err.code = '42501';
      throw err;
    }

    // Foreign Key Check: ON DELETE RESTRICT on fee_payments
    for (const p of this.feePayments.values()) {
      if (p.student_id === id) {
        const err: any = new Error(`update or delete on table "students" violates foreign key constraint "fee_payments_student_id_fkey"`);
        err.code = '23503';
        throw err;
      }
    }

    // Foreign Key Check: ON DELETE RESTRICT on attendance
    for (const a of this.attendance.values()) {
      if (a.student_id === id) {
        const err: any = new Error(`update or delete on table "students" violates foreign key constraint "attendance_student_id_fkey"`);
        err.code = '23503';
        throw err;
      }
    }

    this.students.delete(id);
    return true;
  }

  // --- Fee Payments Engine ---
  insertPayment(payload: any) {
    if (!this.students.has(payload.student_id)) {
      const err: any = new Error('Foreign key violation: student does not exist');
      err.code = '23503';
      throw err;
    }

    const amount = Number(payload.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('check_payment_amount_positive: amount must be > 0');
    }

    const id = payload.id || `pay-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const record = {
      id,
      student_id: payload.student_id,
      amount,
      payment_date: payload.payment_date || '2026-11-15',
      payment_mode: payload.payment_mode || 'cash',
      receipt_number: payload.receipt_number || null,
      remarks: payload.remarks || null,
      is_reversal: Boolean(payload.is_reversal),
      reversal_of_id: payload.reversal_of_id || null,
      void_reason: payload.void_reason || null,
      created_by: this.currentUser?.id || null,
      created_at: new Date().toISOString(),
    };

    // Check reversal integrity constraint
    if (!record.is_reversal) {
      if (record.reversal_of_id !== null || record.void_reason !== null) {
        throw new Error('check_reversal_integrity');
      }
    } else {
      if (!record.reversal_of_id || !record.void_reason || record.void_reason.trim().length < 5) {
        throw new Error('check_reversal_integrity: reversal requires reason >= 5 chars');
      }
      // Check unique payment reversal index (one reversal per original payment)
      for (const p of this.feePayments.values()) {
        if (p.is_reversal && p.reversal_of_id === record.reversal_of_id) {
          const err: any = new Error('duplicate key value violates unique constraint "unique_payment_reversal_idx"');
          err.code = '23505';
          throw err;
        }
      }
    }

    this.feePayments.set(id, record);
    return record;
  }

  // RPC: reverse_payment
  rpcReversePayment(paymentId: string, reason: string) {
    if (this.currentUser?.role !== 'super_admin') {
      throw new Error('Unauthorized: Only super_admin can reverse fee payments');
    }

    const cleanReason = (reason || '').trim();
    if (cleanReason.length < 5) {
      throw new Error('A meaningful justification reason (at least 5 characters) is mandatory for reversals');
    }

    const orig = this.feePayments.get(paymentId);
    if (!orig) {
      throw new Error(`Payment record ${paymentId} not found`);
    }

    if (orig.is_reversal) {
      throw new Error('Invalid operation: Cannot reverse an existing reversal entry');
    }

    for (const p of this.feePayments.values()) {
      if (p.is_reversal && p.reversal_of_id === paymentId) {
        throw new Error(`Invalid operation: Payment ${paymentId} has already been reversed`);
      }
    }

    const reversalId = `rev-${Date.now()}`;
    const reversalRecord = {
      id: reversalId,
      student_id: orig.student_id,
      amount: orig.amount,
      payment_date: '2026-11-15',
      payment_mode: orig.payment_mode,
      receipt_number: 'REV-' + (orig.receipt_number || orig.id.substring(0, 8)),
      remarks: 'Authorized reversal: ' + cleanReason,
      is_reversal: true,
      reversal_of_id: orig.id,
      void_reason: cleanReason,
      created_by: this.currentUser.id,
      created_at: new Date().toISOString(),
    };

    this.feePayments.set(reversalId, reversalRecord);
    return reversalId;
  }

  // View: student_fee_summary
  getStudentFeeSummary(studentId: string): StudentFeeSummary {
    const student = this.students.get(studentId);
    if (!student) throw new Error('Student not found');

    let totalPaid = 0;
    for (const p of this.feePayments.values()) {
      if (p.student_id === studentId) {
        if (p.is_reversal) {
          totalPaid -= p.amount;
        } else {
          totalPaid += p.amount;
        }
      }
    }

    const balanceDue = student.total_fee - totalPaid;
    let feeStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = 'UNPAID';
    if (totalPaid >= student.total_fee) {
      feeStatus = 'PAID';
    } else if (totalPaid > 0) {
      feeStatus = 'PARTIAL';
    }

    return {
      id: student.id,
      admission_id: student.admission_id,
      name: student.name,
      phone: student.phone,
      course: student.course,
      joining_date: student.joining_date,
      status: student.status,
      total_fee: student.total_fee,
      total_paid: totalPaid,
      balance_due: balanceDue,
      fee_status: feeStatus,
    };
  }

  // RPC: mark_batch_attendance
  rpcMarkBatchAttendance(p_date: string, p_records: any[]) {
    if (!this.currentUser || !['super_admin', 'manager'].includes(this.currentUser.role)) {
      throw new Error('Unauthorized: Caller is not an authorized administrator');
    }
    if (!p_date) throw new Error('Invalid date: Attendance date must not be null');
    if (!Array.isArray(p_records) || p_records.length === 0) {
      throw new Error('Invalid records payload: Must be a non-empty JSON array');
    }

    let recordedCount = 0;
    for (const rec of p_records) {
      const studentId = rec.student_id;
      if (!studentId) throw new Error('student_id is required in all batch records');

      const student = this.students.get(studentId);
      if (!student || student.status !== 'active') {
        throw new Error(`Student ${studentId} is not an active enrolled student or does not exist.`);
      }

      const status = rec.status;
      if (!['present', 'absent'].includes(status)) {
        throw new Error(`Invalid attendance status "${status}"`);
      }

      const key = `${studentId}_${p_date}`;
      this.attendance.set(key, {
        id: `att-${key}`,
        student_id: studentId,
        date: p_date,
        status,
        remarks: rec.remarks ? String(rec.remarks).trim() : null,
        created_at: new Date().toISOString(),
      });
      recordedCount++;
    }

    // Actual RPC returns JSONB object
    return {
      success: true,
      date: p_date,
      recorded_count: recordedCount,
    };
  }
}

const db = new MockDatabaseEngine();

describe('Master QA End-to-End Test Suite', () => {
  beforeEach(() => {
    db.reset();
    vi.restoreAllMocks();

    // Hook Supabase mocks into our MockDatabaseEngine
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'students') {
        return {
          insert: (payload: any) => ({
            select: () => ({
              single: async () => {
                try {
                  const res = db.insertStudent(payload);
                  return { data: res, error: null };
                } catch (err: any) {
                  return { data: null, error: err };
                }
              },
            }),
          }),
          update: (payload: any) => ({
            eq: (_col: string, id: string) => ({
              select: () => ({
                single: async () => {
                  try {
                    const res = db.updateStudent(id, payload);
                    return { data: res, error: null };
                  } catch (err: any) {
                    return { data: null, error: err };
                  }
                },
              }),
            }),
          }),
          delete: () => ({
            eq: (_col: string, id: string) => {
              try {
                db.deleteStudent(id);
                return Promise.resolve({ error: null });
              } catch (err: any) {
                return Promise.resolve({ error: err });
              }
            },
          }),
          select: (_cols?: string, _opts?: any) => {
            const studentsList = Array.from(db.students.values());
            return {
              eq: (_col: string, val: any) => ({
                single: async () => ({
                  data: db.students.get(val) || null,
                  error: db.students.has(val) ? null : { message: 'Not found' },
                }),
              }),
              order: () => ({
                range: (from: number, to: number) =>
                  Promise.resolve({
                    data: studentsList.slice(from, to + 1),
                    count: studentsList.length,
                    error: null,
                  }),
              }),
              ilike: () => ({
                order: () => ({
                  range: () => Promise.resolve({ data: studentsList, count: studentsList.length, error: null }),
                }),
              }),
              or: () => ({
                order: () => ({
                  range: () => Promise.resolve({ data: studentsList, count: studentsList.length, error: null }),
                }),
              }),
              then: (resolve: any) => resolve({ data: studentsList, error: null }),
            } as any;
          },
        } as any;
      }

      if (table === 'fee_payments') {
        return {
          insert: (payload: any) => ({
            select: () => ({
              single: async () => {
                const res = db.insertPayment(payload);
                return { data: res, error: null };
              },
            }),
          }),
          select: () => ({
            eq: (_col: string, studentId: string) => ({
              order: () => ({
                order: () =>
                  Promise.resolve({
                    data: Array.from(db.feePayments.values()).filter((p) => p.student_id === studentId),
                    error: null,
                  }),
              }),
            }),
            order: () =>
              Promise.resolve({
                data: Array.from(db.feePayments.values()),
                error: null,
              }),
          }),
        } as any;
      }

      if (table === 'student_fee_summary') {
        return {
          select: () => {
            const summaries = Array.from(db.students.keys()).map((id) => db.getStudentFeeSummary(id));
            return {
              eq: (_col: string, val: any) => ({
                single: async () => ({
                  data: db.getStudentFeeSummary(val),
                  error: null,
                }),
              }),
              order: () => ({
                range: (from: number, to: number) =>
                  Promise.resolve({
                    data: summaries.slice(from, to + 1),
                    count: summaries.length,
                    error: null,
                  }),
              }),
            } as any;
          },
        } as any;
      }

      if (table === 'attendance') {
        return {
          select: () => ({
            eq: (col: string, val: string) => {
              if (col === 'date') {
                return {
                  order: () =>
                    Promise.resolve({
                      data: Array.from(db.attendance.values()).filter((a) => a.date === val),
                      error: null,
                    }),
                };
              }
              if (col === 'student_id') {
                return {
                  order: () =>
                    Promise.resolve({
                      data: Array.from(db.attendance.values()).filter((a) => a.student_id === val),
                      error: null,
                    }),
                  gte: () => ({
                    lte: () => ({
                      order: () =>
                        Promise.resolve({
                          data: Array.from(db.attendance.values()).filter((a) => a.student_id === val),
                          error: null,
                        }),
                    }),
                  }),
                };
              }
              return Promise.resolve({ data: [], error: null });
            },
            order: () =>
              Promise.resolve({
                data: Array.from(db.attendance.values()),
                error: null,
              }),
          }),
        } as any;
      }

      return {} as any;
    });

    vi.spyOn(supabase, 'rpc').mockImplementation((fn: string, params: any) => {
      if (fn === 'reverse_payment') {
        try {
          const revId = db.rpcReversePayment(params.p_payment_id, params.p_reason);
          return Promise.resolve({ data: revId, error: null } as any);
        } catch (err: any) {
          return Promise.resolve({ data: null, error: { message: err.message } } as any);
        }
      }
      if (fn === 'mark_batch_attendance') {
        try {
          const res = db.rpcMarkBatchAttendance(params.p_date, params.p_records);
          return Promise.resolve({ data: res, error: null } as any);
        } catch (err: any) {
          return Promise.resolve({ data: null, error: { message: err.message } } as any);
        }
      }
      return Promise.resolve({ data: null, error: new Error('Unknown RPC') } as any);
    });
  });

  // ============================================================================
  // PHASE 2: STUDENT MANAGEMENT LIFECYCLE
  // ============================================================================
  describe('Student Lifecycle & Constraints', () => {
    it('TC-STU-01: Creates a new student with all valid fields', async () => {
      const student = await createStudent({
        admission_id: 'CIT-2026-001',
        name: 'Aarav Sharma',
        phone: '9876543210',
        course: 'Full Stack Development',
        total_fee: 12000,
        joining_date: '2026-11-01',
        status: 'active',
      });

      expect(student.id).toBeDefined();
      expect(student.admission_id).toBe('CIT-2026-001');
      expect(student.name).toBe('Aarav Sharma');
      expect(student.total_fee).toBe(12000);
      expect(student.status).toBe('active');
    });

    it('TC-STU-03: Submitting an empty form is rejected by client validation', async () => {
      await expect(
        createStudent({
          admission_id: '   ',
          name: '',
          phone: '',
          course: '',
          total_fee: 0,
        })
      ).rejects.toThrow('Admission ID is required');
    });

    it('TC-STU-08A & 08B: Blocks duplicate admission ID (case-insensitive & trimmed)', async () => {
      await createStudent({
        admission_id: 'CIT-100',
        name: 'First Student',
        phone: '9876543210',
        course: 'Python',
        total_fee: 5000,
      });

      // Exact duplicate
      await expect(
        createStudent({
          admission_id: 'CIT-100',
          name: 'Duplicate Student',
          phone: '9876543211',
          course: 'Python',
          total_fee: 5000,
        })
      ).rejects.toThrow(/already in use/);

      // Lowercase duplicate
      await expect(
        createStudent({
          admission_id: '  cit-100  ',
          name: 'Lowercase Collision',
          phone: '9876543212',
          course: 'Web',
          total_fee: 5000,
        })
      ).rejects.toThrow(/already in use/);
    });

    it('TC-STU-09 & 10: Edits student demographic details and course cleanly', async () => {
      const created = await createStudent({
        admission_id: 'CIT-102',
        name: 'Rohan Mehra',
        phone: '9876543210',
        course: 'Python',
        total_fee: 6000,
      });

      const updated = await updateStudent(created.id, {
        phone: '9876599999',
        course: 'Data Science',
      });

      expect(updated.phone).toBe('9876599999');
      expect(updated.course).toBe('Data Science');
    });

    it('TC-STU-17A: Super Admin can delete student with zero history', async () => {
      const student = await createStudent({
        admission_id: 'CIT-TEMP-01',
        name: 'Temp Student',
        phone: '9876543210',
        course: 'Demo',
        total_fee: 1000,
      });

      await expect(deleteStudent(student.id)).resolves.not.toThrow();
      expect(db.students.has(student.id)).toBe(false);
    });

    it('TC-STU-17B & 17C: Foreign key ON DELETE RESTRICT blocks deletion of student with financial or attendance history', async () => {
      const student = await createStudent({
        admission_id: 'CIT-LOCKED-01',
        name: 'Locked Student',
        phone: '9876543210',
        course: 'Python',
        total_fee: 5000,
      });

      // Add payment history
      await recordPayment({
        student_id: student.id,
        amount: 2000,
      });

      // Attempt deletion -> MUST FAIL with foreign key violation
      await expect(deleteStudent(student.id)).rejects.toThrow(/Cannot delete student with associated fee payments/);
    });

    it('TC-STU-19: Non-super admin (manager) cannot delete students', async () => {
      const student = await createStudent({
        admission_id: 'CIT-MGR-01',
        name: 'Manager Target',
        phone: '9876543210',
        course: 'Demo',
        total_fee: 1000,
      });

      // Switch role to manager
      db.currentUser = { id: 'mgr-uuid', role: 'manager' };

      await expect(deleteStudent(student.id)).rejects.toThrow();
    });

    it('TC-STU-20: Rejects negative course fee', async () => {
      await expect(
        createStudent({
          admission_id: 'CIT-NEG-01',
          name: 'Negative Fee',
          phone: '9876543210',
          course: 'Demo',
          total_fee: -100,
        })
      ).rejects.toThrow('Total course fee cannot be negative');
    });
  });

  // ============================================================================
  // PHASE 3: MONTHLY FEE MANAGEMENT (SCENARIOS A-F)
  // ============================================================================
  describe('Fee Management & Accounting Lifecycle', () => {
    it('Scenario A: 3 Students Baseline (₹2,000 each) in November 2026', async () => {
      // 1. Enroll 3 students
      const studentA = await createStudent({
        admission_id: 'CIT-A',
        name: 'Student A',
        phone: '9876543211',
        course: 'Web Development',
        total_fee: 2000,
      });
      const studentB = await createStudent({
        admission_id: 'CIT-B',
        name: 'Student B',
        phone: '9876543212',
        course: 'Web Development',
        total_fee: 2000,
      });
      const studentC = await createStudent({
        admission_id: 'CIT-C',
        name: 'Student C',
        phone: '9876543213',
        course: 'Web Development',
        total_fee: 2000,
      });

      // 2. Record full payments for A and B in Nov 2026
      await recordPayment({
        student_id: studentA.id,
        amount: 2000,
        payment_date: '2026-11-05',
        payment_mode: 'cash',
        receipt_number: 'RCP-2026-A1',
      });
      await recordPayment({
        student_id: studentB.id,
        amount: 2000,
        payment_date: '2026-11-06',
        payment_mode: 'upi',
        receipt_number: 'RCP-2026-B1',
      });
      // Student C pays nothing (Unpaid)

      // 3. Verify individual summaries
      const summaryA = db.getStudentFeeSummary(studentA.id);
      const summaryB = db.getStudentFeeSummary(studentB.id);
      const summaryC = db.getStudentFeeSummary(studentC.id);

      expect(summaryA.total_paid).toBe(2000);
      expect(summaryA.balance_due).toBe(0);
      expect(summaryA.fee_status).toBe('PAID');

      expect(summaryB.total_paid).toBe(2000);
      expect(summaryB.balance_due).toBe(0);
      expect(summaryB.fee_status).toBe('PAID');

      expect(summaryC.total_paid).toBe(0);
      expect(summaryC.balance_due).toBe(2000);
      expect(summaryC.fee_status).toBe('UNPAID');

      // 4. Verify institute aggregate totals
      const allSummaries = [summaryA, summaryB, summaryC];
      const totalExpected = allSummaries.reduce((acc, curr) => acc + curr.total_fee, 0);
      const totalCollected = allSummaries.reduce((acc, curr) => acc + curr.total_paid, 0);
      const totalOutstanding = allSummaries.reduce((acc, curr) => acc + curr.balance_due, 0);
      const paidCount = allSummaries.filter((s) => s.fee_status === 'PAID').length;
      const unpaidCount = allSummaries.filter((s) => s.fee_status === 'UNPAID').length;

      expect(totalExpected).toBe(6000);
      expect(totalCollected).toBe(4000);
      expect(totalOutstanding).toBe(2000);
      expect(paidCount).toBe(2);
      expect(unpaidCount).toBe(1);
    });

    it('Scenario B: December Fee Cycle Transition Analysis', async () => {
      // Historical data verification: November payments must never be deleted
      const studentA = await createStudent({
        admission_id: 'CIT-NOV-A',
        name: 'Student A',
        phone: '9876543211',
        course: 'Python',
        total_fee: 2000,
      });
      await recordPayment({
        student_id: studentA.id,
        amount: 2000,
        payment_date: '2026-11-10',
      });

      // Transition to December 2026
      const historyBefore = await getStudentPaymentHistory(studentA.id);
      expect(historyBefore.length).toBe(1);
      expect(historyBefore[0].amount).toBe(2000);

      // Verify that November records remain unchanged
      const summaryInDec = db.getStudentFeeSummary(studentA.id);
      expect(summaryInDec.total_paid).toBe(2000);
      expect(summaryInDec.balance_due).toBe(0);

      // NOTE FOR AUDIT: The application utilizes a Course Total Fee with Installment Ledger model.
      // There is no automated recurring monthly subscription billing table in the MVP database.
    });

    it('Scenario C: Partial Payments Lifecycle (₹500 + ₹500 + ₹1,000 against ₹2,000)', async () => {
      const student = await createStudent({
        admission_id: 'CIT-PARTIAL-01',
        name: 'Partial Payer',
        phone: '9876543210',
        course: 'Python',
        total_fee: 2000,
      });

      // Step 1: Pays ₹500
      await recordPayment({ student_id: student.id, amount: 500, remarks: 'First installment' });
      let summary = db.getStudentFeeSummary(student.id);
      expect(summary.total_paid).toBe(500);
      expect(summary.balance_due).toBe(1500);
      expect(summary.fee_status).toBe('PARTIAL');

      // Step 2: Pays another ₹500
      await recordPayment({ student_id: student.id, amount: 500, remarks: 'Second installment' });
      summary = db.getStudentFeeSummary(student.id);
      expect(summary.total_paid).toBe(1000);
      expect(summary.balance_due).toBe(1000);
      expect(summary.fee_status).toBe('PARTIAL');

      // Step 3: Pays remaining ₹1,000
      await recordPayment({ student_id: student.id, amount: 1000, remarks: 'Final settlement' });
      summary = db.getStudentFeeSummary(student.id);
      expect(summary.total_paid).toBe(2000);
      expect(summary.balance_due).toBe(0);
      expect(summary.fee_status).toBe('PAID');

      // Verify ledger has 3 distinct transactions
      const history = await getStudentPaymentHistory(student.id);
      expect(history.length).toBe(3);
      expect(history.reduce((acc, p) => acc + p.amount, 0)).toBe(2000);
    });

    it('Scenario D: Advance / Overpayment Behavior', async () => {
      const student = await createStudent({
        admission_id: 'CIT-ADV-01',
        name: 'Advance Payer',
        phone: '9876543210',
        course: 'Python',
        total_fee: 2000,
      });

      // Pays ₹4,000 (advance/overpayment)
      await recordPayment({ student_id: student.id, amount: 4000 });
      const summary = db.getStudentFeeSummary(student.id);

      expect(summary.total_paid).toBe(4000);
      expect(summary.balance_due).toBe(-2000); // Negative balance indicating surplus/advance
      expect(summary.fee_status).toBe('PAID');
    });

    it('Scenario E: Payment Reversal Workflow & Security Restrictions', async () => {
      const student = await createStudent({
        admission_id: 'CIT-REV-01',
        name: 'Reversal Test',
        phone: '9876543210',
        course: 'Python',
        total_fee: 5000,
      });

      const payment = await recordPayment({
        student_id: student.id,
        amount: 2500,
        remarks: 'Erroneous check',
      });

      let summary = db.getStudentFeeSummary(student.id);
      expect(summary.total_paid).toBe(2500);
      expect(summary.balance_due).toBe(2500);

      // Super Admin reverses payment with valid reason
      const reversalId = await reversePayment({
        paymentId: payment.id,
        reason: 'Bank returned check as unpaid',
      });
      expect(reversalId).toBeDefined();

      // Net balance restores to original fee
      summary = db.getStudentFeeSummary(student.id);
      expect(summary.total_paid).toBe(0);
      expect(summary.balance_due).toBe(5000);
      expect(summary.fee_status).toBe('UNPAID');

      // Attempting to reverse the SAME payment again is BLOCKED
      await expect(
        reversePayment({
          paymentId: payment.id,
          reason: 'Attempt duplicate reversal',
        })
      ).rejects.toThrow(/already been reversed/);

      // Attempting to reverse with reason < 5 chars is BLOCKED
      await expect(
        reversePayment({
          paymentId: payment.id,
          reason: 'Err',
        })
      ).rejects.toThrow(/at least 5 characters/);

      // Manager role attempting reversal is BLOCKED
      db.currentUser = { id: 'mgr-uuid', role: 'manager' };
      const payment2 = await recordPayment({
        student_id: student.id,
        amount: 1000,
      });
      await expect(
        reversePayment({
          paymentId: payment2.id,
          reason: 'Manager attempting unauthorized reversal',
        })
      ).rejects.toThrow(/Only super_admin can reverse/);
    });

    it('Scenario F: Zero and Negative Payments are strictly rejected', async () => {
      const student = await createStudent({
        admission_id: 'CIT-ZERO-01',
        name: 'Zero Test',
        phone: '9876543210',
        course: 'Python',
        total_fee: 5000,
      });

      await expect(
        recordPayment({
          student_id: student.id,
          amount: 0,
        })
      ).rejects.toThrow(/greater than zero/);

      await expect(
        recordPayment({
          student_id: student.id,
          amount: -500,
        })
      ).rejects.toThrow(/greater than zero/);
    });
  });

  // ============================================================================
  // PHASE 4: DAILY BATCH ATTENDANCE (SCENARIOS A-E)
  // ============================================================================
  describe('Attendance Lifecycle & Batch Operations', () => {
    it('Scenario A: Daily Attendance Batch Upsert (5 students)', async () => {
      const students: Student[] = [];
      for (let i = 1; i <= 5; i++) {
        const s = await createStudent({
          admission_id: `CIT-ATT-0${i}`,
          name: `Student ${String.fromCharCode(64 + i)}`,
          phone: `987654321${i}`,
          course: 'Full Stack',
          total_fee: 5000,
        });
        students.push(s);
      }

      // Batch attendance items: A=present, B=present, C=absent, D=present, E=absent
      const items: BatchAttendanceItem[] = [
        { student_id: students[0].id, status: 'present' },
        { student_id: students[1].id, status: 'present' },
        { student_id: students[2].id, status: 'absent' },
        { student_id: students[3].id, status: 'present' },
        { student_id: students[4].id, status: 'absent' },
      ];

      await saveBatchAttendance('2026-11-15', items);

      // Verify records on date
      const recorded = await getAttendanceForDate('2026-11-15');
      expect(recorded.length).toBe(5);

      const presentCount = recorded.filter((r) => r.status === 'present').length;
      const absentCount = recorded.filter((r) => r.status === 'absent').length;
      expect(presentCount).toBe(3);
      expect(absentCount).toBe(2);
    });

    it('Scenario B: Duplicate Prevention on same date updates in-place', async () => {
      const student = await createStudent({
        admission_id: 'CIT-DUP-01',
        name: 'Dup Test',
        phone: '9876543210',
        course: 'Python',
        total_fee: 5000,
      });

      // Submit once as Present
      await saveBatchAttendance('2026-11-15', [{ student_id: student.id, status: 'present' }]);
      expect(db.attendance.size).toBe(1);
      expect(db.attendance.get(`${student.id}_2026-11-15`).status).toBe('present');

      // Submit again on same date as Absent
      await saveBatchAttendance('2026-11-15', [{ student_id: student.id, status: 'absent' }]);
      // Size MUST remain 1 (no duplicate rows)
      expect(db.attendance.size).toBe(1);
      expect(db.attendance.get(`${student.id}_2026-11-15`).status).toBe('absent');
    });

    it('Scenario C & D: Monthly Attendance History & Percentage Calculations', async () => {
      const student = await createStudent({
        admission_id: 'CIT-CALC-01',
        name: 'Calculation Test',
        phone: '9876543210',
        course: 'Python',
        total_fee: 5000,
      });

      // Simulate 20 sessions: 18 Present, 2 Absent
      for (let day = 1; day <= 18; day++) {
        const dateStr = `2026-11-${String(day).padStart(2, '0')}`;
        await saveBatchAttendance(dateStr, [{ student_id: student.id, status: 'present' }]);
      }
      for (let day = 19; day <= 20; day++) {
        const dateStr = `2026-11-${String(day).padStart(2, '0')}`;
        await saveBatchAttendance(dateStr, [{ student_id: student.id, status: 'absent' }]);
      }

      const stats = await getStudentAttendanceStats(student.id);
      expect(stats.totalSessions).toBe(20);
      expect(stats.presentCount).toBe(18);
      expect(stats.absentCount).toBe(2);
      expect(stats.attendancePercentage).toBe(90); // 18 / 20 = 90%
    });

    it('Scenario E: Inactive students excluded from active attendance marking', async () => {
      const student = await createStudent({
        admission_id: 'CIT-INACT-01',
        name: 'Inactive Student',
        phone: '9876543210',
        course: 'Python',
        total_fee: 5000,
        status: 'completed',
      });

      // Attempting to submit attendance for inactive student raises exception in RPC
      await expect(
        saveBatchAttendance('2026-11-15', [{ student_id: student.id, status: 'present' }])
      ).rejects.toThrow(/not an active enrolled student/);
    });
  });

  // ============================================================================
  // PHASE 5: EXPORT & DATA PORTABILITY (RFC 4180)
  // ============================================================================
  describe('Data Portability & CSV Compliance', () => {
    it('TC-EXP-01: Correctly escapes fields containing commas, quotes, and newlines', () => {
      expect(escapeCsvField('Sharma, Aarav')).toBe('"Sharma, Aarav"');
      expect(escapeCsvField('Batch "A" Special')).toBe('"Batch ""A"" Special"');
      expect(escapeCsvField('First Line\nSecond Line')).toBe('"First Line\nSecond Line"');
      expect(escapeCsvField(null)).toBe('');
      expect(escapeCsvField(undefined)).toBe('');
    });
  });
});
