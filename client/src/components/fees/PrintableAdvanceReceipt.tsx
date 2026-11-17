// ==============================================================================
// Z Institute Management System - Printable Advance Fee Receipt Modal
// Compact, Responsive, Never-Overflowing Receipt Modal with Persistent Close Controls
// ==============================================================================

import React, { useEffect } from 'react';
import { X, Printer, GraduationCap, Clock } from 'lucide-react';

export interface AdvanceReceiptData {
  receipt_number: string;
  student_name: string;
  admission_id: string;
  student_phone?: string;
  student_course?: string;
  target_period_name: string; // e.g. 'December 2026'
  amount_paid: number;
  payment_mode: string;
  payment_date: string;
  recipient_email?: string | null;
  remarks?: string | null;
}

interface PrintableAdvanceReceiptProps {
  isOpen: boolean;
  data: AdvanceReceiptData | null;
  onClose: () => void;
}

export const PrintableAdvanceReceipt: React.FC<PrintableAdvanceReceiptProps> = ({
  isOpen,
  data,
  onClose,
}) => {
  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 print:p-0 print:static print:bg-white print:backdrop-blur-none animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="advance-receipt-title"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[82vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none">
        {/* Top Action Bar (Sticky, Always Visible, Hidden in Print) */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h3 id="advance-receipt-title" className="text-xs font-bold text-slate-800">
              Advance Receipt Preview
            </h3>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
              title="Print official advance receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              title="Close preview (Esc)"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Card Body */}
        <div
          id="printable-advance-receipt-card"
          className="p-4 sm:p-5 space-y-2.5 sm:space-y-3 text-slate-800 overflow-y-auto flex-1 text-xs"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
                  Z Institute
                </h1>
                <p className="text-[10px] text-slate-500 font-medium">
                  Computer Management &amp; Professional Skills Training
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-block px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-amber-100 text-amber-800 rounded">
                Advance Deposit Receipt
              </span>
              <p className="mt-0.5 text-[10px] text-slate-400 font-mono font-medium">
                {data.receipt_number}
              </p>
            </div>
          </div>

          {/* Student Info Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div>
              <span className="text-[10px] text-slate-500 block">Student Name:</span>
              <span className="font-bold text-xs text-slate-900">{data.student_name}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Admission ID:</span>
              <span className="font-mono font-bold text-xs text-slate-900">{data.admission_id}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Course:</span>
              <span className="font-medium text-slate-800 truncate block">{data.student_course || 'Enrolled Course'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Deposit Date:</span>
              <span className="font-medium text-slate-800">{formatDate(data.payment_date)}</span>
            </div>
          </div>

          {/* Transaction Summary Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2 px-3 text-left">Description</th>
                  <th className="py-2 px-3 text-right">Earmarked Period</th>
                  <th className="py-2 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    Advance Tuition Fee Deposit
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-brand-700">
                    {data.target_period_name}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-700 font-black text-xs">
                    {formatCurrency(data.amount_paid)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Advance Credit Notice Callout */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center space-x-1.5 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Earmarked Advance Credit Notice:</span>
            </div>
            <p className="text-[10px] leading-relaxed text-amber-800">
              This payment has been accepted as an advance tuition fee deposit specifically allocated towards the student's <strong>{data.target_period_name}</strong> monthly tuition fee. It will automatically apply against the monthly fee due upon period commencement.
            </p>
          </div>

          {/* Mode & Details */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <div>
              <span>Mode of Payment: </span>
              <span className="font-bold uppercase text-slate-800">{data.payment_mode}</span>
              {data.recipient_email && (
                <span className="block text-[10px] text-slate-400 mt-0.5">
                  Receipt sent to: {data.recipient_email}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-[9px] block text-slate-400">System Timezone</span>
              <span className="font-mono text-slate-600 font-medium text-[10px]">Asia/Kolkata (IST)</span>
            </div>
          </div>

          {/* Signature Stamp */}
          <div className="pt-4 border-t border-dashed border-slate-200 flex items-end justify-between text-[10px]">
            <div className="text-[9px] text-slate-400 leading-relaxed max-w-[200px]">
              Computer-generated official receipt. Valid without physical signature. Advance deposits are held in escrow for target billing period.
            </div>
            <div className="text-center">
              <div className="w-28 border-b border-slate-400 pb-0.5 mb-0.5 font-serif italic text-slate-700 text-[10px]">
                Authorized Signatory
              </div>
              <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold block">
                Accounts Office
              </span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (Sticky, Hidden in Print) */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2 shrink-0 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
