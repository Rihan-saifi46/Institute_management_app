// ==============================================================================
// Z Institute Management System - Record Fee Payment Modal
// ==============================================================================

import React, { useState } from 'react';
import { X, CreditCard, AlertCircle, Loader2, CheckCircle2, Printer } from 'lucide-react';
import { recordPayment, type FeePayment, type StudentFeeSummary } from '../../services/fees';
import type { PaymentMode } from '../../types/database';

interface RecordPaymentModalProps {
  isOpen: boolean;
  studentSummary: StudentFeeSummary | null;
  onClose: () => void;
  onPaymentSuccess: (payment: FeePayment, summary: StudentFeeSummary) => void;
  onOpenReceipt: (payment: FeePayment, summary: StudentFeeSummary) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  studentSummary,
  onClose,
  onPaymentSuccess,
  onOpenReceipt,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [justRecordedPayment, setJustRecordedPayment] = useState<FeePayment | null>(null);

  if (!isOpen || !studentSummary) return null;

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const resetForm = () => {
    setAmount('');
    setPaymentDate(todayStr);
    setPaymentMode('cash');
    setReceiptNumber('');
    setRemarks('');
    setErrorMessage(null);
    setJustRecordedPayment(null);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Payment installment amount must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payment = await recordPayment({
        student_id: studentSummary.id,
        amount: parsedAmount,
        payment_date: paymentDate || todayStr,
        payment_mode: paymentMode,
        receipt_number: receiptNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });

      // Update local state to show print option
      setJustRecordedPayment(payment);

      // Create an updated temporary summary for immediate receipt printing
      const updatedSummary: StudentFeeSummary = {
        ...studentSummary,
        total_paid: studentSummary.total_paid + parsedAmount,
        balance_due: Math.max(0, studentSummary.balance_due - parsedAmount),
        fee_status:
          studentSummary.total_paid + parsedAmount >= studentSummary.total_fee
            ? 'PAID'
            : 'PARTIAL',
      };

      onPaymentSuccess(payment, updatedSummary);
    } catch (err: any) {
      console.error('[RecordPaymentModal] Error:', err);
      setErrorMessage(err.message || 'Failed to record payment in ledger.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintAfterRecord = () => {
    if (justRecordedPayment) {
      onOpenReceipt(justRecordedPayment, studentSummary);
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-payment-title"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 id="record-payment-title" className="text-base font-bold text-slate-900 leading-tight">
                Record Fee Installment
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {studentSummary.name} ({studentSummary.admission_id})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If payment was just recorded successfully, offer receipt view */}
        {justRecordedPayment ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Payment Recorded in Ledger</h4>
              <p className="mt-1 text-xs text-slate-500">
                Amount of <strong className="text-slate-800">{formatCurrency(justRecordedPayment.amount)}</strong> was committed to the immutable ledger.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={handlePrintAfterRecord}
                className="inline-flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>View & Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Student Financial Context Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Total Fee</span>
                <span className="font-semibold text-slate-800">{formatCurrency(studentSummary.total_fee)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Paid So Far</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(studentSummary.total_paid)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Balance Due</span>
                <span className={`font-bold ${studentSummary.balance_due > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {formatCurrency(studentSummary.balance_due)}
                </span>
              </div>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Amount & Payment Date in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="payment_amount" className="block text-xs font-semibold text-slate-800 mb-1">
                  Amount Received (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-semibold">
                    ₹
                  </span>
                  <input
                    id="payment_amount"
                    type="number"
                    min="1"
                    step="1"
                    required
                    disabled={isSubmitting}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 2000"
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-bold disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="payment_date" className="block text-xs font-semibold text-slate-800 mb-1">
                  Payment Date
                </label>
                <input
                  id="payment_date"
                  type="date"
                  disabled={isSubmitting}
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Payment Mode & Reference Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="payment_mode" className="block text-xs font-semibold text-slate-800 mb-1">
                  Payment Mode
                </label>
                <select
                  id="payment_mode"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="receipt_number" className="block text-xs font-semibold text-slate-800 mb-1">
                  Receipt / Ref No. <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="receipt_number"
                  type="text"
                  disabled={isSubmitting}
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="e.g. UPI Ref, Cheque No"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 font-mono"
                />
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label htmlFor="payment_remarks" className="block text-xs font-semibold text-slate-800 mb-1">
                Remarks / Notes <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="payment_remarks"
                type="text"
                disabled={isSubmitting}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Installment 1 of 2, Google Pay"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center space-x-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs hover:shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Payment...</span>
                  </>
                ) : (
                  <span>Record Payment</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
