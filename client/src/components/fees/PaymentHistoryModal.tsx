// ==============================================================================
// Z Institute Management System - Student Fee Payment History & Ledger Modal
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { X, History, Plus, Printer, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { getStudentPaymentHistory, type FeePayment, type StudentFeeSummary } from '../../services/fees';
import { FeeStatusBadge } from './FeeStatusBadge';
import { useAuth } from '../../context/AuthContext';

interface PaymentHistoryModalProps {
  isOpen: boolean;
  studentSummary: StudentFeeSummary | null;
  onClose: () => void;
  onOpenRecordModal: (summary: StudentFeeSummary) => void;
  onOpenReceiptModal: (payment: FeePayment, summary: StudentFeeSummary) => void;
  onOpenReverseModal: (payment: FeePayment) => void;
}

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  studentSummary,
  onClose,
  onOpenRecordModal,
  onOpenReceiptModal,
  onOpenReverseModal,
}) => {
  const { role } = useAuth();
  const isSuperAdmin = role === 'super_admin';

  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
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

  const loadHistory = useCallback(async () => {
    if (!studentSummary) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getStudentPaymentHistory(studentSummary.id);
      setPayments(data);
    } catch (err: any) {
      console.error('[PaymentHistoryModal] Error loading ledger:', err);
      setError(err.message || 'Failed to load fee ledger.');
    } finally {
      setIsLoading(false);
    }
  }, [studentSummary]);

  useEffect(() => {
    if (isOpen && studentSummary) {
      loadHistory();
    }
  }, [isOpen, studentSummary, loadHistory]);

  if (!isOpen || !studentSummary) return null;

  // Set of payment IDs that have an offsetting reversal
  const reversedPaymentIds = new Set(
    payments
      .filter((p) => p.is_reversal && p.reversal_of_id)
      .map((p) => p.reversal_of_id!)
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 id="history-modal-title" className="text-base font-bold text-slate-900 leading-tight">
                Student Fee Ledger & Audit Trail
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {studentSummary.name} ({studentSummary.admission_id})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student Financial Summary Bar */}
        <div className="bg-slate-100/70 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-slate-500">Course:</span>{' '}
              <span className="font-semibold text-slate-800">{studentSummary.course}</span>
            </div>
            <div>
              <span className="text-slate-500">Total Fee:</span>{' '}
              <span className="font-bold text-slate-900">{formatCurrency(studentSummary.total_fee)}</span>
            </div>
            <div>
              <span className="text-slate-500">Paid:</span>{' '}
              <span className="font-bold text-emerald-600">{formatCurrency(studentSummary.total_paid)}</span>
            </div>
            <div>
              <span className="text-slate-500">Balance:</span>{' '}
              <span className={`font-bold ${studentSummary.balance_due > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                {formatCurrency(studentSummary.balance_due)}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <FeeStatusBadge status={studentSummary.fee_status} />
            <button
              type="button"
              onClick={() => onOpenRecordModal(studentSummary)}
              className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Collect Fee</span>
            </button>
          </div>
        </div>

        {/* Ledger Transactions List (Scrollable) */}
        <div className="flex-1 p-6 overflow-y-auto">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              <p className="text-xs">Loading ledger records...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : payments.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-slate-700">No payment records found</p>
              <p className="text-xs text-slate-400 mt-1">
                No installments have been recorded for this student yet.
              </p>
              <button
                type="button"
                onClick={() => onOpenRecordModal(studentSummary)}
                className="mt-4 inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Record First Payment</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Ledger Entries ({payments.length})
              </h4>

              {payments.map((p) => {
                const isReversal = p.is_reversal;
                const wasReversed = reversedPaymentIds.has(p.id);

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isReversal
                        ? 'bg-rose-50/50 border-rose-200 text-rose-900'
                        : wasReversed
                        ? 'bg-slate-50 border-slate-200 opacity-60 text-slate-500'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-2xs'
                    }`}
                  >
                    {/* Left: Info */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm">
                          {isReversal ? `-${formatCurrency(p.amount)}` : formatCurrency(p.amount)}
                        </span>

                        {isReversal ? (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                            Reversal Entry
                          </span>
                        ) : wasReversed ? (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-200 text-slate-600">
                            Reversed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Valid Installment
                          </span>
                        )}

                        <span className="text-[11px] text-slate-500 font-medium">
                          via {p.payment_mode.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Date: <strong className="text-slate-700">{formatDate(p.payment_date)}</strong></span>
                        {p.receipt_number && (
                          <span className="font-mono">Ref: {p.receipt_number}</span>
                        )}
                      </div>

                      {p.remarks && !isReversal && (
                        <p className="text-[11px] text-slate-600 italic">"{p.remarks}"</p>
                      )}

                      {isReversal && p.void_reason && (
                        <p className="text-[11px] text-rose-700 font-medium">
                          Audit Reason: "{p.void_reason}"
                        </p>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center space-x-2 shrink-0">
                      {!isReversal && !wasReversed && (
                        <>
                          <button
                            type="button"
                            onClick={() => onOpenReceiptModal(p, studentSummary)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                            title="Print receipt for this installment"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </button>

                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => onOpenReverseModal(p)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors"
                              title="Authorized reversal"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reverse</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
