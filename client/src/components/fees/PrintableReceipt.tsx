// ==============================================================================
// Z Institute Management System - Printable Fee Receipt Modal
// ==============================================================================

import React from 'react';
import { X, Printer, GraduationCap } from 'lucide-react';
import type { FeePayment, StudentFeeSummary } from '../../services/fees';

interface PrintableReceiptProps {
  isOpen: boolean;
  payment: FeePayment | null;
  feeSummary: StudentFeeSummary | null;
  onClose: () => void;
}

export const PrintableReceipt: React.FC<PrintableReceiptProps> = ({
  isOpen,
  payment,
  feeSummary,
  onClose,
}) => {
  if (!isOpen || !payment || !feeSummary) return null;

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

  const handlePrint = () => {
    window.print();
  };

  const receiptNumber =
    payment.receipt_number ||
    `RCP-${payment.payment_date.replace(/-/g, '')}-${payment.id.substring(0, 6).toUpperCase()}`;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4 print:p-0 print:static print:bg-white print:backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-title"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden print:border-none print:shadow-none print:max-w-none print:w-full">
        {/* Modal Top Actions (Hidden during print) */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <Printer className="w-4 h-4 text-brand-600" />
            <h3 id="receipt-title" className="text-sm font-bold text-slate-900">
              Fee Payment Receipt Preview
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

        {/* =========================================================================
            PRINTABLE RECEIPT CARD CONTENT
            Formatted specifically for A4 half-page or letter printout
           ========================================================================= */}
        <div id="printable-receipt-card" className="p-8 sm:p-10 space-y-6 text-slate-800">
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
                <p className="text-xs font-medium text-slate-500">
                  Computer Management & Professional Training Center
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-2.5 py-0.5 rounded-sm bg-slate-100 text-[10px] font-black tracking-widest uppercase text-slate-800 border border-slate-300">
                Official Receipt
              </span>
              <p className="mt-1 text-xs font-mono font-bold text-slate-900">
                {receiptNumber}
              </p>
              <p className="text-[11px] text-slate-500">
                Date: <span className="font-semibold">{formatDate(payment.payment_date)}</span>
              </p>
            </div>
          </div>

          {/* Student Info Box */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Student Name
              </span>
              <span className="text-sm font-bold text-slate-900">{feeSummary.name}</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Admission ID / Roll No.
              </span>
              <span className="text-sm font-bold font-mono text-brand-700">
                {feeSummary.admission_id}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Course Enrolled
              </span>
              <span className="font-semibold text-slate-800">{feeSummary.course}</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Contact Phone
              </span>
              <span className="font-semibold text-slate-800">{feeSummary.phone}</span>
            </div>
          </div>

          {/* Payment Breakdown Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4 text-center">Payment Mode</th>
                  <th className="py-2.5 px-4 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-4 font-medium">
                    Course Fee Installment
                    {payment.remarks && (
                      <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                        Remarks: {payment.remarks}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center uppercase font-semibold text-slate-700">
                    {payment.payment_mode}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                    {formatCurrency(payment.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Ledger Summary Calculation */}
          <div className="flex justify-end pt-2">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Total Course Fee:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(feeSummary.total_fee)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Total Paid to Date:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(feeSummary.total_paid)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t-2 border-slate-200">
                <span>Remaining Balance:</span>
                <span className={feeSummary.balance_due > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                  {formatCurrency(feeSummary.balance_due)}
                </span>
              </div>
            </div>
          </div>

          {/* Signatures & Footer Note */}
          <div className="pt-8 border-t border-slate-200 flex items-end justify-between text-[11px] text-slate-500">
            <div className="space-y-1 max-w-xs">
              <p className="font-medium text-slate-700">Terms & Conditions:</p>
              <p>• Fees once paid are non-refundable after commencement of classes.</p>
              <p>• Retain this computer-generated receipt for future administrative reference.</p>
            </div>

            <div className="text-center pt-8">
              <div className="w-40 border-b border-slate-400 mb-1" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                Authorized Signatory
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
