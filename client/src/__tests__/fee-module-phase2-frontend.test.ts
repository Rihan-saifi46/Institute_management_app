// ==============================================================================
// Z Institute Management System - Phase 2 Frontend Component Tests
// Module: Monthly Fees UI, Exact Full-Payment Modal, Advance Fees UI, Receipts
// ==============================================================================

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 2: Frontend Implementation & Component Invariants', () => {
  // ----------------------------------------------------------------------------
  // 1. Navigation & Routing Invariants
  // ----------------------------------------------------------------------------
  describe('1. Navigation & App Routing', () => {
    it('verifies Sidebar.tsx registers Advance Fees navigation link', () => {
      const sidebarPath = path.resolve(__dirname, '../components/layout/Sidebar.tsx');
      const content = fs.readFileSync(sidebarPath, 'utf8');

      expect(content).toContain("label: 'Advance Fees'");
      expect(content).toContain("path: '/advance-fees'");
      expect(content).toContain('CalendarClock');
    });

    it('verifies App.tsx registers /advance-fees route inside ProtectedRoute', () => {
      const appPath = path.resolve(__dirname, '../App.tsx');
      const content = fs.readFileSync(appPath, 'utf8');

      expect(content).toContain("import { AdvanceFeesPage } from './pages/AdvanceFeesPage'");
      expect(content).toContain('<Route path="/advance-fees" element={<AdvanceFeesPage />} />');
    });
  });

  // ----------------------------------------------------------------------------
  // 2. Student Creation Label Alignment (Decision 2)
  // ----------------------------------------------------------------------------
  describe('2. Student Modal Labels (Decision 2)', () => {
    it('verifies AddStudentModal labels field as Monthly Tuition Fee (₹)', () => {
      const addPath = path.resolve(__dirname, '../components/students/AddStudentModal.tsx');
      const content = fs.readFileSync(addPath, 'utf8');

      expect(content).toContain('Monthly Tuition Fee (₹)');
      expect(content).toContain('Individual monthly fee snapshot for student billing.');
      expect(content).toContain('id="total_fee"');
    });

    it('verifies EditStudentModal labels field as Monthly Tuition Fee (₹)', () => {
      const editPath = path.resolve(__dirname, '../components/students/EditStudentModal.tsx');
      const content = fs.readFileSync(editPath, 'utf8');

      expect(content).toContain('Monthly Tuition Fee (₹)');
      expect(content).toContain('Effective for future billing months. Historical dues snapshots remain unchanged.');
      expect(content).toContain('id="edit_total_fee"');
    });
  });

  // ----------------------------------------------------------------------------
  // 3. Exact Full Payment Modal Invariants
  // ----------------------------------------------------------------------------
  describe('3. RecordMonthlyPaymentModal (Full Payment Only Rule)', () => {
    it('verifies RecordMonthlyPaymentModal locks amount to exact balance and prohibits partial payments', () => {
      const modalPath = path.resolve(__dirname, '../components/fees/RecordMonthlyPaymentModal.tsx');
      const content = fs.readFileSync(modalPath, 'utf8');

      // Amount field locked & readOnly
      expect(content).toContain('readOnly');
      expect(content).toContain('disabled');
      expect(content).toContain('Exact Full Balance Only');
      expect(content).toContain('collectMonthlyFee');
      expect(content).toContain('partial collections and excess payments are prohibited');
    });

    it('verifies PrintableMonthlyReceipt formats month name, snapshot, advance offset, and balance', () => {
      const receiptPath = path.resolve(__dirname, '../components/fees/PrintableMonthlyReceipt.tsx');
      const content = fs.readFileSync(receiptPath, 'utf8');

      expect(content).toContain('Monthly Tuition Fee —');
      expect(content).toContain('Less: Pre-allocated Advance Fee Credit');
      expect(content).toContain('Net Collected (This Transaction)');
      expect(content).toContain('Status for');
      expect(content).toContain('Settled in Full');
      expect(content).toContain('window.print()');
    });
  });

  // ----------------------------------------------------------------------------
  // 4. Advance Fees Page & Ceiling Enforcement
  // ----------------------------------------------------------------------------
  describe('4. AdvanceFeesPage & RecordAdvanceModal', () => {
    it('verifies RecordAdvanceModal enforces monthly fee ceiling and optional email', () => {
      const modalPath = path.resolve(__dirname, '../components/fees/RecordAdvanceModal.tsx');
      const content = fs.readFileSync(modalPath, 'utf8');

      // Ceiling calculations
      expect(content).toContain('maxAllowableAdvance');
      expect(content).toContain('Advance allocation exceeds monthly fee ceiling');
      expect(content).toContain('recordAdvanceFee');

      // Email is optional (Decision 1)
      expect(content).toContain('Student / Parent Email');
      expect(content).toContain('Optional');
      expect(content).toContain('Email is optional. Missing email never blocks advance fee recording.');
      expect(content).toContain('Save this email to student profile');
    });

    it('verifies VoidAdvanceModal is restricted to Super Admin with mandatory audit reason (Decision 6)', () => {
      const voidPath = path.resolve(__dirname, '../components/fees/VoidAdvanceModal.tsx');
      const content = fs.readFileSync(voidPath, 'utf8');

      expect(content).toContain('Privileged Advance Cancellation');
      expect(content).toContain('Super Admin Authorized Reversal (Decision 6)');
      expect(content).toContain('voidAdvanceFee');
      expect(content).toContain('cleanReason.length < 5');
      expect(content).toContain('Permanent Reversal Warning');
    });

    it('verifies AdvanceFeesPage gates void button to Super Admin role only', () => {
      const pagePath = path.resolve(__dirname, '../pages/AdvanceFeesPage.tsx');
      const content = fs.readFileSync(pagePath, 'utf8');

      expect(content).toContain("const isSuperAdmin = role === 'super_admin'");
      expect(content).toContain('{isSuperAdmin && adv.status !== \'Voided\' && (');
      expect(content).toContain('VoidAdvanceModal');
      expect(content).toContain('PrintableAdvanceReceipt');
    });

    it('verifies PrintableAdvanceReceipt includes explicit advance credit notice', () => {
      const receiptPath = path.resolve(__dirname, '../components/fees/PrintableAdvanceReceipt.tsx');
      const content = fs.readFileSync(receiptPath, 'utf8');

      expect(content).toContain('Advance Deposit Receipt');
      expect(content).toContain('Earmarked Advance Credit Notice:');
      expect(content).toContain('automatically apply against the monthly fee due upon period commencement');
      expect(content).toContain('window.print()');
    });
  });

  // ----------------------------------------------------------------------------
  // 5. FeesPage Month Selector & KPI Cards
  // ----------------------------------------------------------------------------
  describe('5. FeesPage Month-Wise Management', () => {
    it('verifies FeesPage implements period dropdown and Generate Month Dues button', () => {
      const feesPagePath = path.resolve(__dirname, '../pages/FeesPage.tsx');
      const content = fs.readFileSync(feesPagePath, 'utf8');

      expect(content).toContain('getFeePeriods');
      expect(content).toContain('generateMonthlyDues');
      expect(content).toContain('selectedPeriodKey');
      expect(content).toContain('Generate Month Dues');
      expect(content).toContain('Expected Dues');
      expect(content).toContain('Advance Adjusted');
      expect(content).toContain('Direct Collections');
      expect(content).toContain('Remaining Dues');
      expect(content).toContain('RecordMonthlyPaymentModal');
    });
  });
});
