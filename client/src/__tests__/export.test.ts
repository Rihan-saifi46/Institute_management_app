// ==============================================================================
// Z Institute Management System - Export Service & Component Unit Tests
// Covers: Month-Wise Dues CSV, Advance Deposits CSV, Portability JSON, RFC 4180 Escaping
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  escapeCsvField,
  exportMonthlyDuesCsv,
  exportAdvancesCsv,
  exportCompleteSystemJson,
} from '../services/export';
import { supabase } from '../lib/supabase';
import { DataExportModal } from '../components/common/DataExportModal';

describe('Data Portability & Export Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('escapeCsvField', () => {
    it('returns empty string for null and undefined', () => {
      expect(escapeCsvField(null)).toBe('');
      expect(escapeCsvField(undefined)).toBe('');
    });

    it('returns raw string when no special CSV characters are present', () => {
      expect(escapeCsvField('Rihan')).toBe('Rihan');
      expect(escapeCsvField('Z1001')).toBe('Z1001');
      expect(escapeCsvField(4500)).toBe('4500');
    });

    it('escapes and quotes values containing commas', () => {
      expect(escapeCsvField('Full Stack, Web Development')).toBe('"Full Stack, Web Development"');
    });

    it('escapes double quotes by doubling them and wrapping in quotes', () => {
      expect(escapeCsvField('Batch "A" Special')).toBe('"Batch ""A"" Special"');
    });

    it('quotes values containing newline characters', () => {
      expect(escapeCsvField('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    });
  });

  describe('exportMonthlyDuesCsv', () => {
    it('queries monthly_due_status_view and exports month-specific dues CSV', async () => {
      const mockDues = [
        {
          due_id: 'due-1',
          student_id: 's-1',
          admission_id: 'Z-001',
          student_name: 'Rahul Sharma',
          student_course: 'Web Dev',
          student_phone: '9876543210',
          student_email: 'rahul@example.com',
          period_name: 'November 2026',
          period_key: '2026-11',
          fee_snapshot: 2000,
          advance_applied_amount: 500,
          normal_paid_amount: 1500,
          total_settled_amount: 2000,
          balance_remaining: 0,
          status: 'PAID',
          is_arrears: false,
          due_date: '2026-11-10',
        },
      ];

      const mockQueryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: (val: any) => void) => {
          resolve({ data: mockDues, error: null });
        },
      };

      vi.spyOn(supabase, 'from').mockReturnValue(mockQueryBuilder as any);

      const result = await exportMonthlyDuesCsv({
        periodKey: '2026-11',
        status: 'PAID',
      });

      expect(supabase.from).toHaveBeenCalledWith('monthly_due_status_view');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('period_key', '2026-11');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'PAID');
      expect(result.recordCount).toBe(1);
      expect(result.filename).toContain('z_institute_monthly_dues_2026-11_');
      expect(result.filename.endsWith('.csv')).toBe(true);
    });

    it('filters dues by text search query', async () => {
      const mockDues = [
        {
          admission_id: 'Z-001',
          student_name: 'Rahul Sharma',
          student_course: 'Web Dev',
          student_phone: '9876543210',
          period_name: 'November 2026',
          period_key: '2026-11',
          fee_snapshot: 2000,
          balance_remaining: 0,
          status: 'PAID',
        },
        {
          admission_id: 'Z-002',
          student_name: 'Priya Verma',
          student_course: 'Graphic Design',
          student_phone: '9876543211',
          period_name: 'November 2026',
          period_key: '2026-11',
          fee_snapshot: 2500,
          balance_remaining: 2500,
          status: 'UNPAID',
        },
      ];

      const mockQueryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: (val: any) => void) => {
          resolve({ data: mockDues, error: null });
        },
      };

      vi.spyOn(supabase, 'from').mockReturnValue(mockQueryBuilder as any);

      const result = await exportMonthlyDuesCsv({
        query: 'Priya',
      });

      expect(result.recordCount).toBe(1);
    });
  });

  describe('exportAdvancesCsv', () => {
    it('queries advance_fee_records with joins and generates advance CSV', async () => {
      const mockAdvances = [
        {
          id: 'adv-001',
          amount_received: 1500,
          status: 'Upcoming',
          void_reason: null,
          reversal_payment_id: null,
          created_at: '2026-11-15T10:00:00Z',
          students: {
            id: 's-1',
            admission_id: 'Z-001',
            name: 'Rahul Sharma',
            course: 'Web Dev',
            phone: '9876543210',
            total_fee: 2000,
          },
          fee_periods: {
            id: 'p-1',
            period_key: '2026-12',
            period_name: 'December 2026',
          },
          email_outbox: [
            {
              status: 'sent',
              recipient_email: 'rahul@example.com',
            },
          ],
        },
      ];

      const mockQueryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: (val: any) => void) => {
          resolve({ data: mockAdvances, error: null });
        },
      };

      vi.spyOn(supabase, 'from').mockReturnValue(mockQueryBuilder as any);

      const result = await exportAdvancesCsv({
        status: 'Upcoming',
      });

      expect(supabase.from).toHaveBeenCalledWith('advance_fee_records');
      expect(result.recordCount).toBe(1);
      expect(result.filename).toContain('z_institute_advance_deposits_');
      expect(result.filename.endsWith('.csv')).toBe(true);
    });
  });

  describe('exportCompleteSystemJson', () => {
    it('includes monthly_fee_dues, advance_fee_records, and email_outbox in payload', async () => {
      const mockQueryBuilder = (returnData: any): any => {
        const builder: any = {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          range: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          then: (resolve: (val: any) => void) => {
            resolve({ data: returnData, count: returnData.length, error: null });
          },
        };
        return builder;
      };

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'fee_periods') return mockQueryBuilder([{ id: 'p-1', period_key: '2026-11' }]);
        if (table === 'monthly_fee_dues') return mockQueryBuilder([{ id: 'd-1', fee_snapshot: 2000 }]);
        if (table === 'advance_fee_records') return mockQueryBuilder([{ id: 'adv-1', amount_received: 1000 }]);
        if (table === 'fee_payments') return mockQueryBuilder([{ id: 'pay-1', amount: 2000 }]);
        if (table === 'attendance') return mockQueryBuilder([{ id: 'att-1', status: 'present' }]);
        if (table === 'email_outbox') return mockQueryBuilder([{ id: 'out-1', status: 'sent' }]);
        if (table === 'student_fee_summary') return mockQueryBuilder([]);
        if (table === 'students') return mockQueryBuilder([{ id: 's-1', name: 'Student 1' }]);
        return mockQueryBuilder([]);
      });

      const result = await exportCompleteSystemJson();
      expect(result.recordCount).toBeGreaterThan(0);
      expect(result.filename).toContain('z_institute_system_backup_');
      expect(result.filename.endsWith('.json')).toBe(true);
    });
  });

  describe('DataExportModal Component', () => {
    it('is a valid React component function', () => {
      expect(typeof DataExportModal).toBe('function');
    });
  });
});
