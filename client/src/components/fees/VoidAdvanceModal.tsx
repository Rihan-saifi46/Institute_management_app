// ==============================================================================
// Z Institute Management System - Privileged Advance Cancellation Modal
// Enforces Owner Decision 6: Super Admin Only, Audited Reversal
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import { voidAdvanceFee } from '../../services/fees';

interface VoidAdvanceModalProps {
  isOpen: boolean;
  advanceRecord: {
    id: string;
    student_name: string;
    admission_id: string;
    target_period_name: string;
    amount_received: number;
    receipt_number?: string;
  } | null;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export const VoidAdvanceModal: React.FC<VoidAdvanceModalProps> = ({
  isOpen,
  advanceRecord,
  onClose,
  onSuccess,
}) => {
  const [voidReason, setVoidReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClose = () => {
    if (!isSubmitting) {
      setVoidReason('');
      setErrorMessage(null);
      onClose();
    }
  };

  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting]);

  if (!isOpen || !advanceRecord) return null;

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanReason = voidReason.trim();
    if (cleanReason.length < 5) {
      setErrorMessage('A detailed cancellation justification (at least 5 characters) is required for audit compliance.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await voidAdvanceFee({
        advanceId: advanceRecord.id,
        voidReason: cleanReason,
      });

      onSuccess(result);
      handleClose();
    } catch (err: any) {
      console.error('[VoidAdvanceModal] Cancellation failed:', err);
      setErrorMessage(err.message || 'Failed to cancel advance fee.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) handleClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="void-modal-title"
    >
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header - Sticky shrink-0 */}
        <div className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 id="void-modal-title" className="text-base font-bold text-slate-900 leading-tight">
                Privileged Advance Cancellation
              </h3>
              <p className="text-[11px] text-rose-600 font-medium">
                Super Admin Authorized Reversal (Decision 6)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Element wrapping scrollable content and pinned footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          {/* Scrollable Form Body */}
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {/* Warning Banner */}
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-rose-950">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Permanent Reversal Warning</span>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-800">
              This action will mark the advance record as <strong>Voided</strong>, cancel any pending email receipts, and append an immutable reversal entry to the financial ledger. This action cannot be undone.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-xs text-rose-900 font-semibold">
              {errorMessage}
            </div>
          )}

          {/* Record Details Summary */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Student:</span>
              <span className="font-bold text-slate-900">{advanceRecord.student_name} ({advanceRecord.admission_id})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Target Month:</span>
              <span className="font-bold text-brand-700">{advanceRecord.target_period_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount Deposited:</span>
              <span className="font-black text-rose-700 text-sm">{formatCurrency(advanceRecord.amount_received)}</span>
            </div>
          </div>

          {/* Audit Reason Textarea */}
          <div>
            <label htmlFor="void_reason" className="block text-xs font-bold text-slate-900 mb-1">
              Cancellation / Refund Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="void_reason"
              rows={3}
              required
              disabled={isSubmitting}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g. Student withdrawn from institute / Concession mistakenly entered"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-rose-500 font-medium"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Minimum 5 characters required for administrative audit tracking.
            </p>
          </div>
        </div>

        {/* Sticky Actions Footer */}
        <div className="px-5 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
          >
            Dismiss
          </button>
          <button
            type="submit"
            disabled={isSubmitting || voidReason.trim().length < 5}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Voiding Advance...</span>
              </>
            ) : (
              <span>Confirm Reversal & Void</span>
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
);
};
