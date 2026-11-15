// ==============================================================================
// Z Institute Management System - Record Monthly Fee Payment Modal
// Enforces Owner-Approved Rule: Exact Full Payment Only (Partial & Excess Prohibited)
// ==============================================================================

import React, { useState } from 'react';
import { X, CreditCard, AlertCircle, Loader2, CheckCircle2, Lock, Info } from 'lucide-react';
import { collectMonthlyFee, type MonthlyDueStatusRecord } from '../../services/fees';
import type { PaymentMode } from '../../types/database';
import type { MonthlyReceiptData } from './PrintableMonthlyReceipt';

interface RecordMonthlyPaymentModalProps {
  isOpen: boolean;
  dueRecord: MonthlyDueStatusRecord | null;
  onClose: () => void;
  onPaymentSuccess: () => void;
  onOpenReceipt: (receiptData: MonthlyReceiptData) => void;
}

export const RecordMonthlyPaymentModal: React.FC<RecordMonthlyPaymentModalProps> = ({
  isOpen,
  dueRecord,
  onClose,
  onPaymentSuccess,
  onOpenReceipt,
}) => {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !dueRecord) return null;

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrorMessage(null);
      setReceiptNumber('');
      setRemarks('');
      setPaymentMode('cash');
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const payableAmount = dueRecord.balance_remaining;
    if (payableAmount <= 0) {
      setErrorMessage('This monthly fee is already fully paid.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result: any = await collectMonthlyFee({
        dueId: dueRecord.due_id,
        amount: payableAmount, // Enforcing exact full remaining amount
        paymentMode,
        receiptNumber: receiptNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });

      const receiptData: MonthlyReceiptData = {
        receipt_number: result?.receipt_number || `REC-${Date.now()}`,
        student_name: dueRecord.student_name,
        admission_id: dueRecord.admission_id,
        student_phone: dueRecord.student_phone,
        student_course: dueRecord.student_course,
        period_name: dueRecord.period_name,
        fee_snapshot: dueRecord.fee_snapshot,
        advance_applied: dueRecord.advance_applied_amount,
        amount_paid: payableAmount,
        balance_remaining: 0,
        payment_mode: paymentMode,
        payment_date: new Date().toISOString().split('T')[0],
        remarks: remarks.trim() || null,
      };

      onPaymentSuccess();
      onOpenReceipt(receiptData);
      handleClose();
    } catch (err: any) {
      console.error('[RecordMonthlyPaymentModal] Payment failed:', err);
      setErrorMessage(err.message || 'Payment collection failed. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-headline"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600/30 flex items-center justify-center text-brand-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 id="modal-headline" className="text-base font-bold text-white leading-tight">
                Collect Monthly Fee
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Billing Period: <span className="text-brand-300 font-semibold">{dueRecord.period_name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start space-x-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Student & Due Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-sm font-bold text-slate-900 block">{dueRecord.student_name}</span>
                <span className="text-xs text-slate-500 font-mono">Admission ID: {dueRecord.admission_id}</span>
              </div>
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-slate-200 text-slate-800 uppercase tracking-wider">
                {dueRecord.period_name}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Monthly Fee:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(dueRecord.fee_snapshot)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Advance Offset:</span>
                <span className="font-semibold text-amber-700">
                  {dueRecord.advance_applied_amount > 0 ? `- ${formatCurrency(dueRecord.advance_applied_amount)}` : '₹0'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Prior Paid:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(dueRecord.normal_paid_amount)}</span>
              </div>
            </div>

            {/* Payable Outstanding Callout */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Payable Outstanding:
              </span>
              <span className="text-lg font-black text-emerald-600">
                {formatCurrency(dueRecord.balance_remaining)}
              </span>
            </div>
          </div>

          {/* Locked Amount Input (Strict Full Payment) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="exact_amount" className="block text-xs font-bold text-slate-900 flex items-center space-x-1">
                <span>Amount to Collect (₹)</span>
                <Lock className="w-3 h-3 text-slate-400" />
              </label>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Exact Full Balance Only
              </span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 font-bold text-sm">
                ₹
              </span>
              <input
                id="exact_amount"
                type="text"
                readOnly
                disabled
                value={dueRecord.balance_remaining}
                className="w-full pl-8 pr-4 py-2.5 text-base font-bold bg-slate-100 border border-slate-300 rounded-xl text-slate-900 cursor-not-allowed select-none shadow-inner"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 flex items-start space-x-1">
              <Info className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
              <span>
                Per institute financial rules, partial collections and excess payments are prohibited. The exact remaining balance of <strong>{formatCurrency(dueRecord.balance_remaining)}</strong> must be collected.
              </span>
            </p>
          </div>

          {/* Payment Mode Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">
              Payment Mode <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['cash', 'upi', 'bank_transfer', 'cheque'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                    paymentMode === mode
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {mode === 'bank_transfer' ? 'Bank Transfer' : mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Transaction Reference / Receipt No */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="receipt_no" className="block text-xs font-semibold text-slate-700 mb-1">
                Custom Receipt No. <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="receipt_no"
                type="text"
                disabled={isSubmitting}
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="Auto-generated if empty"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>

            <div>
              <label htmlFor="remarks" className="block text-xs font-semibold text-slate-700 mb-1">
                Remarks / Notes <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="remarks"
                type="text"
                disabled={isSubmitting}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="UPI ref / Cheque no"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || dueRecord.balance_remaining <= 0}
              className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Collect {formatCurrency(dueRecord.balance_remaining)} & Print</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
