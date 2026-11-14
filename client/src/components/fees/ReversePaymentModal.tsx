// ==============================================================================
// Z Institute Management System - Reverse Payment Modal Component (Super Admin)
// ==============================================================================

import React, { useState } from 'react';
import { X, RotateCcw, AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import { reversePayment, type FeePayment } from '../../services/fees';
import { useAuth } from '../../context/AuthContext';

interface ReversePaymentModalProps {
  isOpen: boolean;
  payment: FeePayment | null;
  onClose: () => void;
  onPaymentReversed: (reversalId: string) => void;
}

export const ReversePaymentModal: React.FC<ReversePaymentModalProps> = ({
  isOpen,
  payment,
  onClose,
  onPaymentReversed,
}) => {
  const { role } = useAuth();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSuperAdmin = role === 'super_admin';

  if (!isOpen || !payment) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanReason = reason.trim();
    if (!cleanReason || cleanReason.length < 5) {
      setErrorMessage('A meaningful justification reason (at least 5 characters) is mandatory.');
      return;
    }

    setIsSubmitting(true);
    try {
      const reversalId = await reversePayment({
        paymentId: payment.id,
        reason: cleanReason,
      });

      setReason('');
      onPaymentReversed(reversalId);
      onClose();
    } catch (err: any) {
      console.error('[ReversePaymentModal] Error:', err);
      setErrorMessage(err.message || 'Failed to reverse payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reverse-payment-title"
    >
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 id="reverse-payment-title" className="text-base font-bold text-slate-900 leading-tight">
                Reverse Fee Payment
              </h3>
              <p className="text-xs text-amber-700 font-medium">Owner Authorization Required</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permission Check */}
        {!isSuperAdmin ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Restricted Action</h4>
              <p className="mt-1 text-xs text-slate-500">
                Only the Super Admin (Institute Owner) can execute payment reversals. Regular manager accounts do not have permission to modify financial balances.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Ledger Warning */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start space-x-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <p>
                Ledger entries cannot be deleted. An offsetting <strong>reversal entry</strong> of{' '}
                <span className="font-bold">{formatCurrency(payment.amount)}</span> will be permanently added to the student's audit trail.
              </p>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {errorMessage}
              </div>
            )}

            {/* Payment Details Context */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Amount:</span>
                <span className="font-bold text-slate-900">{formatCurrency(payment.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Recorded Date:</span>
                <span className="font-medium text-slate-800">{formatDate(payment.payment_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-medium uppercase text-slate-800">{payment.payment_mode}</span>
              </div>
              {payment.receipt_number && (
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">Receipt Ref:</span>
                  <span className="font-medium text-slate-800">{payment.receipt_number}</span>
                </div>
              )}
            </div>

            {/* Mandatory Justification Reason */}
            <div>
              <label htmlFor="reversal_reason" className="block text-xs font-semibold text-slate-800 mb-1">
                Justification / Audit Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="reversal_reason"
                rows={3}
                required
                disabled={isSubmitting}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Check bounced by bank, entered under wrong student ID, cash refund granted."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-slate-100"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Minimum 5 characters. This reason is permanently recorded in the immutable audit ledger.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-all disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Reversal...</span>
                  </>
                ) : (
                  <span>Confirm Authorized Reversal</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
