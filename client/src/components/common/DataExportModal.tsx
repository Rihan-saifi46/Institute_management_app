// ==============================================================================
// Z Institute Management System - Data Export & Portability Modal
// Aligned with Migration 0006: Monthly Fee Engine & Advance Fee Module
// ==============================================================================

import React, { useState } from 'react';
import {
  X,
  Download,
  FileJson,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Calendar,
  CreditCard,
  Users,
  CalendarDays,
  Clock,
} from 'lucide-react';
import {
  exportCompleteSystemJson,
  exportStudentsCsv,
  exportMonthlyDuesCsv,
  exportAdvancesCsv,
  exportPaymentsCsv,
  exportAttendanceCsv,
} from '../../services/export';

interface DataExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportType =
  | 'json'
  | 'students_csv'
  | 'monthly_dues_csv'
  | 'advances_csv'
  | 'payments_csv'
  | 'attendance_csv';

export const DataExportModal: React.FC<DataExportModalProps> = ({ isOpen, onClose }) => {
  const [activeExport, setActiveExport] = useState<ExportType | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ message: string; filename: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async (type: ExportType) => {
    setActiveExport(type);
    setErrorMessage(null);
    setSuccessInfo(null);

    try {
      let res: { recordCount: number; filename: string };

      if (type === 'json') {
        res = await exportCompleteSystemJson();
        setSuccessInfo({
          message: `Exported ${res.recordCount} records across all tables (students, dues, advances, payments, outbox, attendance).`,
          filename: res.filename,
        });
      } else if (type === 'students_csv') {
        res = await exportStudentsCsv();
        setSuccessInfo({
          message: `Exported ${res.recordCount} student directory records to CSV.`,
          filename: res.filename,
        });
      } else if (type === 'monthly_dues_csv') {
        res = await exportMonthlyDuesCsv();
        setSuccessInfo({
          message: `Exported ${res.recordCount} monthly fee dues across all periods to CSV.`,
          filename: res.filename,
        });
      } else if (type === 'advances_csv') {
        res = await exportAdvancesCsv();
        setSuccessInfo({
          message: `Exported ${res.recordCount} advance fee deposits to CSV.`,
          filename: res.filename,
        });
      } else if (type === 'payments_csv') {
        res = await exportPaymentsCsv();
        setSuccessInfo({
          message: `Exported ${res.recordCount} payment ledger entries to CSV.`,
          filename: res.filename,
        });
      } else {
        res = await exportAttendanceCsv();
        setSuccessInfo({
          message: `Exported ${res.recordCount} attendance logs to CSV.`,
          filename: res.filename,
        });
      }
    } catch (err: any) {
      console.error('[DataExportModal] Export failed:', err);
      setErrorMessage(err.message || 'Failed to generate export file.');
    } finally {
      setActiveExport(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 id="export-modal-title" className="text-base font-bold text-slate-900 leading-tight">
                Export &amp; Download Institute Data
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Data Portability, Monthly Dues Audits &amp; Offline Spreadsheets
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Informational Notice */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">User Data Portability &amp; Audit Ready</p>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                In-app CSV and JSON exports generate portable snapshots for offline record keeping or Excel/Google Sheets auditing. Automated full database disaster recovery backups run daily to encrypted offsite cloud storage.
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successInfo && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-start space-x-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-semibold">{successInfo.message}</p>
                <p className="text-[11px] font-mono text-emerald-700 mt-0.5">{successInfo.filename}</p>
              </div>
            </div>
          )}

          {/* Export Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* 1. Complete System JSON */}
            <div className="p-4 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50/20 transition-all flex flex-col justify-between space-y-3 bg-white shadow-2xs">
              <div>
                <div className="flex items-center space-x-2 text-brand-700 mb-1.5 font-bold">
                  <FileJson className="w-4 h-4" />
                  <span>Full System JSON Backup</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Export complete structured snapshot: students, monthly fee dues, advance deposits, payments ledger, outbox, and attendance history in a single JSON file.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleExport('json')}
                disabled={activeExport !== null}
                className="w-full inline-flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 rounded-lg shadow-xs transition-colors"
              >
                {activeExport === 'json' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating JSON...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JSON Backup</span>
                  </>
                )}
              </button>
            </div>

            {/* 2. Monthly Fee Dues CSV (New) */}
            <div className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all flex flex-col justify-between space-y-3 bg-white shadow-2xs">
              <div>
                <div className="flex items-center space-x-2 text-indigo-700 mb-1.5 font-bold">
                  <CalendarDays className="w-4 h-4" />
                  <span>Monthly Fee Dues CSV</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Export month-by-month student dues, fee snapshot amounts, advance offsets applied, normal collections, arrears flags, and payment statuses.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleExport('monthly_dues_csv')}
                disabled={activeExport !== null}
                className="w-full inline-flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 disabled:opacity-50 rounded-lg transition-colors"
              >
                {activeExport === 'monthly_dues_csv' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating CSV...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Download Monthly Dues</span>
                  </>
                )}
              </button>
            </div>

            {/* 3. Advance Deposits CSV (New) */}
            <div className="p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/20 transition-all flex flex-col justify-between space-y-3 bg-white shadow-2xs">
              <div>
                <div className="flex items-center space-x-2 text-amber-700 mb-1.5 font-bold">
                  <Clock className="w-4 h-4" />
                  <span>Advance Fee Deposits CSV</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Export advance tuition fee records: target billing month, monthly fee ceiling, deposited amount, email notification status, and void audit logs.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleExport('advances_csv')}
                disabled={activeExport !== null}
                className="w-full inline-flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 disabled:opacity-50 rounded-lg transition-colors"
              >
                {activeExport === 'advances_csv' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating CSV...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Download Advances CSV</span>
                  </>
                )}
              </button>
            </div>

            {/* 4. Students Directory CSV */}
            <div className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition-all flex flex-col justify-between space-y-3 bg-white shadow-2xs">
              <div>
                <div className="flex items-center space-x-2 text-blue-700 mb-1.5 font-bold">
                  <Users className="w-4 h-4" />
                  <span>Students Directory CSV</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Export student roster with admission IDs, contact details, individual monthly fees, total payments, and lifecycle statuses.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleExport('students_csv')}
                disabled={activeExport !== null}
                className="w-full inline-flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 disabled:opacity-50 rounded-lg transition-colors"
              >
                {activeExport === 'students_csv' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating CSV...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Download Students CSV</span>
                  </>
                )}
              </button>
            </div>

            {/* 5. Fee Payments Ledger CSV */}
            <div className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all flex flex-col justify-between space-y-3 bg-white shadow-2xs">
              <div>
                <div className="flex items-center space-x-2 text-emerald-700 mb-1.5 font-bold">
                  <CreditCard className="w-4 h-4" />
                  <span>Financial Ledger CSV</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Export immutable financial payment audit records: dates, amounts, payment modes, receipt numbers, and reversal justification reasons.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleExport('payments_csv')}
                disabled={activeExport !== null}
                className="w-full inline-flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 rounded-lg transition-colors"
              >
                {activeExport === 'payments_csv' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating CSV...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Download Ledger CSV</span>
                  </>
                )}
              </button>
            </div>

            {/* 6. Attendance History CSV */}
            <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all flex flex-col justify-between space-y-3 bg-white shadow-2xs">
              <div>
                <div className="flex items-center space-x-2 text-slate-700 mb-1.5 font-bold">
                  <Calendar className="w-4 h-4" />
                  <span>Attendance Logs CSV</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Export historical daily class attendance records with dates, student admission IDs, names, and present/absent statuses.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleExport('attendance_csv')}
                disabled={activeExport !== null}
                className="w-full inline-flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-50 rounded-lg transition-colors"
              >
                {activeExport === 'attendance_csv' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating CSV...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Download Attendance CSV</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
