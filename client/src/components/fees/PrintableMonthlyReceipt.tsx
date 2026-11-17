// ==============================================================================
// Z Institute Management System - Printable Monthly Fee Receipt Modal
// Compact, Responsive, Never-Overflowing Receipt Modal with Persistent Close Controls
// ==============================================================================

import React, { useEffect } from 'react';
import { X, Printer, GraduationCap, CheckCircle2 } from 'lucide-react';

export interface MonthlyReceiptData {
  receipt_number: string;
  student_name: string;
  admission_id: string;
  student_phone?: string;
  student_course?: string;
  period_name: string; // e.g. 'November 2026'
  fee_snapshot: number;
  advance_applied: number;
  amount_paid: number;
  balance_remaining: number;
  payment_mode: string;
  payment_date: string;
  remarks?: string | null;
}

interface PrintableMonthlyReceiptProps {
  isOpen: boolean;
  data: MonthlyReceiptData | null;
  onClose: () => void;
}

export const PrintableMonthlyReceipt: React.FC<PrintableMonthlyReceiptProps> = ({
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
      aria-labelledby="monthly-receipt-title"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[82vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none">
        {/* Modal Top Actions (Sticky, Always Visible, Hidden during print) */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center space-x-2">
            <Printer className="w-4 h-4 text-brand-600" />
            <h3 id="monthly-receipt-title" className="text-xs font-bold text-slate-800">
              Receipt Preview
            </h3>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
              title="Print official receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              title="Close receipt (Esc)"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Card Body (Scrolls smoothly if screen is extremely small) */}
        <div
          id="printable-monthly-receipt-card"
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
              <span className="inline-block px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 rounded">
                Official Monthly Receipt
              </span>
              <p className="mt-0.5 text-[10px] text-slate-400 font-mono font-medium">
                {data.receipt_number}
              </p>
            </div>
          </div>

          {/* Student & Date Metadata Grid */}
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
              <span className="text-[10px] text-slate-500 block">Payment Date:</span>
              <span className="font-medium text-slate-800">{formatDate(data.payment_date)}</span>
            </div>
          </div>

          {/* Invoice Line Items */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2 px-3 text-left">Description / Billing Period</th>
                  <th className="py-2 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-900">
                    Monthly Tuition Fee — <span className="text-brand-700">{data.period_name}</span>
                  </td>
                  <td className="py-2 px-3 text-right font-medium">
                    {formatCurrency(data.fee_snapshot)}
                  </td>
                </tr>

                {data.advance_applied > 0 && (
                  <tr className="bg-amber-50/50 text-amber-900 text-[11px]">
                    <td className="py-1.5 px-3">
                      Less: Pre-allocated Advance Fee Credit
                    </td>
                    <td className="py-1.5 px-3 text-right font-semibold">
                      - {formatCurrency(data.advance_applied)}
                    </td>
                  </tr>
                )}

                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td className="py-2 px-3">
                    Net Collected (This Transaction)
                  </td>
                  <td className="py-2 px-3 text-right text-emerald-700 font-black text-xs">
                    {formatCurrency(data.amount_paid)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Settlement Status Banner */}
          <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-semibold text-[11px]">
                Status for {data.period_name}: Settled in Full
              </span>
            </div>
            <div className="text-right">
              <span className="text-emerald-700 block text-[9px] uppercase font-bold tracking-wider">
                Month Balance
              </span>
              <span className="font-black text-xs text-emerald-900">
                {formatCurrency(data.balance_remaining)}
              </span>
            </div>
          </div>

          {/* Payment Method & Transaction Note */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <div>
              <span>Mode of Payment: </span>
              <span className="font-bold uppercase text-slate-800">{data.payment_mode}</span>
              {data.remarks && (
                <span className="block text-[10px] text-slate-400 mt-0.5">
                  Ref: {data.remarks}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-[9px] block text-slate-400">System Timezone</span>
              <span className="font-mono text-slate-600 font-medium text-[10px]">Asia/Kolkata (IST)</span>
            </div>
          </div>

          {/* Signature & Authorization Stamp */}
          <div className="pt-4 border-t border-dashed border-slate-200 flex items-end justify-between text-[10px]">
            <div className="text-[9px] text-slate-400 leading-relaxed max-w-[200px]">
              Computer-generated official receipt. Valid without physical signature. All tuition fees once settled are non-refundable.
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

        {/* Modal Bottom Actions (Sticky, Hidden during print) */}
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
