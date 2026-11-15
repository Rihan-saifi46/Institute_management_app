// ==============================================================================
// Z Institute Management System - Printable Advance Fee Receipt Modal
// ==============================================================================

import React from 'react';
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
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4 print:p-0 print:static print:bg-white print:backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="advance-receipt-title"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden print:border-none print:shadow-none print:max-w-none print:w-full">
        {/* Top Action Bar (Hidden in Print) */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-brand-600" />
            <h3 id="advance-receipt-title" className="text-sm font-bold text-slate-900">
              Advance Fee Receipt Preview
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Card */}
        <div id="printable-advance-receipt-card" className="p-8 sm:p-10 space-y-6 text-slate-800">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                  Z Institute
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Computer Management & Professional Skills Training
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase bg-amber-100 text-amber-800 rounded-md">
                Advance Deposit Receipt
              </span>
              <p className="mt-1 text-xs text-slate-400 font-mono font-medium">
                {data.receipt_number}
              </p>
            </div>
          </div>

          {/* Student Info Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-500 block">Student Name:</span>
              <span className="font-bold text-sm text-slate-900">{data.student_name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Admission ID:</span>
              <span className="font-mono font-bold text-sm text-slate-900">{data.admission_id}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Course:</span>
              <span className="font-semibold text-slate-800">{data.student_course || 'Enrolled Course'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Deposit Date:</span>
              <span className="font-semibold text-slate-800">{formatDate(data.payment_date)}</span>
            </div>
          </div>

          {/* Transaction Summary Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 text-left">Description</th>
                  <th className="py-2.5 px-4 text-right">Earmarked Period</th>
                  <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    Advance Tuition Fee Deposit
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-brand-700">
                    {data.target_period_name}
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-700 font-black text-sm">
                    {formatCurrency(data.amount_paid)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Advance Credit Notice Callout */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Earmarked Advance Credit Notice:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              This payment has been accepted as an advance tuition fee deposit specifically allocated towards the student's <strong>{data.target_period_name}</strong> monthly tuition fee. It will automatically apply against the monthly fee due upon period commencement.
            </p>
          </div>

          {/* Mode & Email details */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <div>
              <span>Mode of Payment: </span>
              <span className="font-bold uppercase text-slate-800">{data.payment_mode}</span>
              {data.recipient_email && (
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  Receipt dispatched to: {data.recipient_email}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] block text-slate-400">System Timezone</span>
              <span className="font-mono text-slate-600 font-medium">Asia/Kolkata (IST)</span>
            </div>
          </div>

          {/* Signature & Stamp */}
          <div className="pt-8 border-t border-dashed border-slate-200 flex items-end justify-between text-xs">
            <div className="text-[10px] text-slate-400 leading-relaxed max-w-xs">
              Computer-generated advance deposit receipt. Valid without physical signature. Subject to institute fee terms.
            </div>
            <div className="text-center">
              <div className="w-32 border-b border-slate-400 pb-1 mb-1 font-serif italic text-slate-700 text-xs">
                Authorized Signatory
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Accounts Office
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
