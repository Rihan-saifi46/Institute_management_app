// ==============================================================================
// Z Institute Management System - Phase 5 Fees Management Component Tests
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { FeeStatusBadge } from '../components/fees/FeeStatusBadge';
import { RecordPaymentModal } from '../components/fees/RecordPaymentModal';
import { ReversePaymentModal } from '../components/fees/ReversePaymentModal';
import { PaymentHistoryModal } from '../components/fees/PaymentHistoryModal';
import { PrintableReceipt } from '../components/fees/PrintableReceipt';
import { FeesPage } from '../pages/FeesPage';

describe('Phase 5 Fees Management Components', () => {
  it('Component constructors are valid functions', () => {
    expect(typeof FeeStatusBadge).toBe('function');
    expect(typeof RecordPaymentModal).toBe('function');
    expect(typeof ReversePaymentModal).toBe('function');
    expect(typeof PaymentHistoryModal).toBe('function');
    expect(typeof PrintableReceipt).toBe('function');
    expect(typeof FeesPage).toBe('function');
  });

  it('Formats currency in INR correctly', () => {
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(10000);

    expect(formatted).toContain('10,000');
  });
});
