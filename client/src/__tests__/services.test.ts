// ==============================================================================
// Z Institute Management System - Phase 2 Service Layer Unit & Integration Tests
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabase';
import {
  signIn,
  signOut,
  getAdminProfile,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudents,
  getDistinctCourses,
  recordPayment,
  reversePayment,
  getFeeSummaries,
  getStudentPaymentHistory,
  saveBatchAttendance,
  getStudentAttendanceStats,
} from '../services';

describe('Auth Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('signIn trims email and passes credentials to supabase.auth', async () => {
    const mockSignIn = vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValueOnce({
      data: {
        session: { access_token: 'fake-jwt' } as any,
        user: { id: 'sa-user-id', email: 'saifirihan683@gmail.com' } as any,
      },
      error: null,
    });

    const result = await signIn('  saifirihan683@gmail.com  ', 'secret123');

    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'saifirihan683@gmail.com',
      password: 'secret123',
    });
    expect(result.user?.id).toBe('sa-user-id');
  });

  it('signOut invokes supabase.auth.signOut', async () => {
    const mockSignOut = vi.spyOn(supabase.auth, 'signOut').mockResolvedValueOnce({
      error: null,
    });

    await signOut();
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('getAdminProfile queries public.admins table by user_id', async () => {
    const mockSingle = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'admin-uuid',
        user_id: 'sa-user-id',
        email: 'saifirihan683@gmail.com',
        full_name: 'Super Admin',
        role: 'super_admin',
        created_at: '2026-11-14T10:00:00Z',
        updated_at: '2026-11-14T10:00:00Z',
      },
      error: null,
    });

    vi.spyOn(supabase, 'from').mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          single: mockSingle,
        }),
      }),
    } as any);

    const profile = await getAdminProfile('sa-user-id');
    expect(profile?.role).toBe('super_admin');
    expect(profile?.full_name).toBe('Super Admin');
  });
});

describe('Student Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('createStudent rejects empty Admission ID', async () => {
    await expect(
      createStudent({
        admission_id: '   ',
        name: 'John Doe',
        phone: '9876543210',
        course: 'Python',
        total_fee: 5000,
      })
    ).rejects.toThrow('Admission ID is required');
  });

  it('createStudent rejects negative course fees', async () => {
    await expect(
      createStudent({
        admission_id: 'Z-101',
        name: 'John Doe',
        phone: '9876543210',
        course: 'Python',
        total_fee: -500,
      })
    ).rejects.toThrow('Total course fee cannot be negative');
  });

  it('createStudent sanitizes inputs and inserts into students table', async () => {
    const mockSingle = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'student-uuid',
        admission_id: 'Z-101',
        name: 'Alice Johnson',
        phone: '9876543210',
        course: 'Python',
        total_fee: 10000,
        status: 'active',
        created_at: '2026-11-14T10:00:00Z',
        updated_at: '2026-11-14T10:00:00Z',
      },
      error: null,
    });

    vi.spyOn(supabase, 'from').mockReturnValueOnce({
      insert: vi.fn().mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          single: mockSingle,
        }),
      }),
    } as any);

    const student = await createStudent({
      admission_id: '  Z-101  ',
      name: '  Alice Johnson  ',
      phone: '  9876543210  ',
      course: '  Python  ',
      total_fee: 10000,
    });

    expect(student.admission_id).toBe('Z-101');
    expect(student.name).toBe('Alice Johnson');
  });

  it('updateStudent rejects negative fee values', async () => {
    await expect(
      updateStudent('student-uuid', { total_fee: -100 })
    ).rejects.toThrow('Total course fee cannot be negative');
  });

  it('deleteStudent handles foreign key deletion restriction cleanly', async () => {
    vi.spyOn(supabase, 'from').mockReturnValueOnce({
      delete: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockResolvedValueOnce({
          error: { code: '23503', message: 'foreign key violation' },
        }),
      }),
    } as any);

    await expect(deleteStudent('student-uuid')).rejects.toThrow(
      'Cannot delete student with associated fee payments or attendance history'
    );
  });

  it('getStudents constructs correct filters and pagination range', async () => {
    const mockRange = vi.fn().mockResolvedValueOnce({
      data: [{ id: 'student-1', name: 'Alice' }],
      count: 1,
      error: null,
    });
    const mockOrder = vi.fn().mockReturnValueOnce({ range: mockRange });
    const mockOr = vi.fn().mockReturnValueOnce({ order: mockOrder });
    const mockIlike = vi.fn().mockReturnValueOnce({ or: mockOr });
    const mockEq = vi.fn().mockReturnValueOnce({ ilike: mockIlike });

    vi.spyOn(supabase, 'from').mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: mockEq,
      }),
    } as any);

    const result = await getStudents({
      query: 'Alice',
      course: 'Python',
      status: 'active',
      page: 2,
      pageSize: 10,
    });

    expect(result.data.length).toBe(1);
    expect(result.page).toBe(2);
    expect(mockEq).toHaveBeenCalledWith('status', 'active');
    expect(mockIlike).toHaveBeenCalledWith('course', '%Python%');
    expect(mockOr).toHaveBeenCalledWith(
      'name.ilike.%Alice%,admission_id.ilike.%Alice%,phone.ilike.%Alice%'
    );
    expect(mockRange).toHaveBeenCalledWith(10, 19);
  });

  it('getDistinctCourses extracts and deduplicates courses', async () => {
    vi.spyOn(supabase, 'from').mockReturnValueOnce({
      select: vi.fn().mockResolvedValueOnce({
        data: [
          { course: 'Python' },
          { course: 'Web Dev' },
          { course: 'Python' },
        ],
        error: null,
      }),
    } as any);

    const courses = await getDistinctCourses();
    expect(courses).toEqual(['Python', 'Web Dev']);
  });
});

describe('Fees Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('recordPayment rejects zero or negative amounts', async () => {
    await expect(
      recordPayment({
        student_id: 'student-uuid',
        amount: 0,
      })
    ).rejects.toThrow('Payment installment amount must be greater than zero');

    await expect(
      recordPayment({
        student_id: 'student-uuid',
        amount: -200,
      })
    ).rejects.toThrow('Payment installment amount must be greater than zero');
  });

  it('reversePayment enforces minimum 5 characters justification reason', async () => {
    await expect(
      reversePayment({
        paymentId: 'payment-uuid',
        reason: 'err',
      })
    ).rejects.toThrow('A detailed justification reason (at least 5 characters) is mandatory');
  });

  it('reversePayment delegates to trusted database RPC reverse_payment', async () => {
    const mockRpc = vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: 'reversal-uuid',
      error: null,
    } as any);

    const reversalId = await reversePayment({
      paymentId: 'payment-uuid-1',
      reason: 'Bank bounced cheque',
    });

    expect(mockRpc).toHaveBeenCalledWith('reverse_payment', {
      p_payment_id: 'payment-uuid-1',
      p_reason: 'Bank bounced cheque',
    });
    expect(reversalId).toBe('reversal-uuid');
  });

  it('getFeeSummaries builds correct status filter and pagination', async () => {
    const mockRange = vi.fn().mockResolvedValueOnce({
      data: [{ id: 'student-uuid', fee_status: 'PARTIAL', balance_due: 4000 }],
      count: 1,
      error: null,
    });
    const mockOrder = vi.fn().mockReturnValueOnce({ range: mockRange });
    const mockEq = vi.fn().mockReturnValueOnce({ order: mockOrder });

    vi.spyOn(supabase, 'from').mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: mockEq,
      }),
    } as any);

    const summaries = await getFeeSummaries({ status: 'PARTIAL', page: 1, pageSize: 20 });
    expect(summaries.data.length).toBe(1);
    expect(mockEq).toHaveBeenCalledWith('fee_status', 'PARTIAL');
  });

  it('getStudentPaymentHistory orders by payment_date and created_at descending', async () => {
    const mockSecondOrder = vi.fn().mockResolvedValueOnce({
      data: [{ id: 'payment-1', amount: 4000 }],
      error: null,
    });
    const mockFirstOrder = vi.fn().mockReturnValueOnce({ order: mockSecondOrder });
    const mockEq = vi.fn().mockReturnValueOnce({ order: mockFirstOrder });

    vi.spyOn(supabase, 'from').mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: mockEq,
      }),
    } as any);

    const history = await getStudentPaymentHistory('student-uuid');
    expect(history.length).toBe(1);
    expect(mockFirstOrder).toHaveBeenCalledWith('payment_date', { ascending: false });
    expect(mockSecondOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });
});

describe('Attendance Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('saveBatchAttendance returns 0 immediately if records array is empty', async () => {
    const mockRpc = vi.spyOn(supabase, 'rpc');
    const result = await saveBatchAttendance('2026-11-14', []);
    expect(result).toBe(0);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('saveBatchAttendance calls mark_batch_attendance RPC with exact payload', async () => {
    const mockRpc = vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: 2,
      error: null,
    } as any);

    const items = [
      { student_id: 'uuid-1', status: 'present' as const },
      { student_id: 'uuid-2', status: 'absent' as const },
    ];

    const count = await saveBatchAttendance('2026-11-14', items);

    expect(mockRpc).toHaveBeenCalledWith('mark_batch_attendance', {
      p_date: '2026-11-14',
      p_records: items,
    });
    expect(count).toBe(2);
  });

  it('getStudentAttendanceStats calculates percentage and session counts accurately', async () => {
    vi.spyOn(supabase, 'from').mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          order: vi.fn().mockResolvedValueOnce({
            data: [
              { id: '1', date: '2026-11-01', status: 'present' },
              { id: '2', date: '2026-11-02', status: 'present' },
              { id: '3', date: '2026-11-03', status: 'absent' },
              { id: '4', date: '2026-11-04', status: 'present' },
            ],
            error: null,
          }),
        }),
      }),
    } as any);

    const stats = await getStudentAttendanceStats('uuid-1');

    expect(stats.totalSessions).toBe(4);
    expect(stats.presentCount).toBe(3);
    expect(stats.absentCount).toBe(1);
    expect(stats.attendancePercentage).toBe(75);
  });
});
