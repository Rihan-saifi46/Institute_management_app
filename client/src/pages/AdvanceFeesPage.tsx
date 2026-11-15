// ==============================================================================
// Z Institute Management System - Advance Fees Management Page
// Dedicated Module for Future Billing Month Deposits & Automatic Month Adjustments
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Plus,
  Search,
  X,
  Printer,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Info,
  MinusCircle,
  Download,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getEnrichedAdvances,
  type EnrichedAdvanceRecord,
} from '../services/fees';
import { exportAdvancesCsv } from '../services/export';
import { RecordAdvanceModal } from '../components/fees/RecordAdvanceModal';
import { VoidAdvanceModal } from '../components/fees/VoidAdvanceModal';
import { PrintableAdvanceReceipt, type AdvanceReceiptData } from '../components/fees/PrintableAdvanceReceipt';

export const AdvanceFeesPage: React.FC = () => {
  const { role } = useAuth();
  const isSuperAdmin = role === 'super_admin';

  // Tab & Search states
  const [activeTab, setActiveTab] = useState<'active' | 'Applied' | 'Voided' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [advances, setAdvances] = useState<EnrichedAdvanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [voidingAdvance, setVoidingAdvance] = useState<{
    id: string;
    student_name: string;
    admission_id: string;
    target_period_name: string;
    amount_received: number;
    receipt_number?: string;
  } | null>(null);
  const [receiptData, setReceiptData] = useState<AdvanceReceiptData | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const loadAdvances = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const records = await getEnrichedAdvances('all');
      setAdvances(records);
    } catch (err: any) {
      console.error('[AdvanceFeesPage] Error loading advances:', err);
      setError(err.message || 'Failed to load advance fee records.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdvances();
  }, [loadAdvances]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const res = await exportAdvancesCsv({
        status: activeTab,
        query: searchQuery,
      });
      showToast(`Exported ${res.recordCount} advances to ${res.filename}`, 'success');
    } catch (err: any) {
      console.error('[AdvanceFeesPage] CSV Export failed:', err);
      showToast(err.message || 'Failed to export advances CSV.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Filtered advances based on tab and search
  const filteredAdvances = advances.filter((adv) => {
    // Tab filtering
    if (activeTab === 'active' && adv.status !== 'Upcoming' && adv.status !== 'Partially Applied') {
      return false;
    }
    if (activeTab === 'Applied' && adv.status !== 'Applied') {
      return false;
    }
    if (activeTab === 'Voided' && adv.status !== 'Voided') {
      return false;
    }

    // Search query filtering
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      const studentName = adv.students?.name?.toLowerCase() || '';
      const admissionId = adv.students?.admission_id?.toLowerCase() || '';
      const phone = adv.students?.phone || '';
      const period = adv.fee_periods?.period_name?.toLowerCase() || '';
      return studentName.includes(q) || admissionId.includes(q) || phone.includes(q) || period.includes(q);
    }

    return true;
  });

  // KPI Metrics Calculations
  const upcomingTotal = advances
    .filter((a) => a.status === 'Upcoming' || a.status === 'Partially Applied')
    .reduce((sum, a) => sum + a.amount_received, 0);

  const appliedTotal = advances
    .filter((a) => a.status === 'Applied')
    .reduce((sum, a) => sum + a.amount_received, 0);

  const activeCount = advances.filter(
    (a) => a.status === 'Upcoming' || a.status === 'Partially Applied'
  ).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center space-x-2.5">
            <Clock className="w-6 h-6 text-amber-600" />
            <span>Advance Fees Management</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Accept and track tuition payments earmarked for future billing months with automatic month-wise adjustment.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => loadAdvances()}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Export Advances CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-xs transition-colors disabled:opacity-50"
            title="Download advances list as CSV"
          >
            <Download className={`w-3.5 h-3.5 text-slate-500 ${isExporting ? 'animate-bounce' : ''}`} />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRecordModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Advance Fee</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Upcoming Advance Pool */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Active Upcoming Advance Pool
            </span>
            <span className="text-2xl font-black text-amber-800 block">
              {formatCurrency(upcomingTotal)}
            </span>
            <span className="text-[11px] text-slate-400">
              {activeCount} active pre-payment deposit{activeCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Applied Advances */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Advances Applied to Dues
            </span>
            <span className="text-2xl font-black text-emerald-800 block">
              {formatCurrency(appliedTotal)}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">
              Credited automatically on month arrival
            </span>
          </div>
        </div>

        {/* Advance Ceiling Governance Notice */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-xs flex items-start space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block mb-1">
              Ceiling &amp; Void Rules Enforced
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Advances cannot exceed the student's monthly fee ceiling. Only Super Admins can void advances with an audited ledger reversal.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, ID, phone, or month..."
            className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center space-x-1.5 self-start md:self-auto bg-slate-100 p-1 rounded-xl">
          {[
            { key: 'active', label: 'Upcoming & Active' },
            { key: 'Applied', label: 'Applied to Dues' },
            { key: 'Voided', label: 'Voided' },
            { key: 'all', label: 'All Records' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advance Records Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-600">Loading advance records...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-xs font-bold">{error}</p>
            <button
              onClick={() => loadAdvances()}
              className="text-xs text-amber-600 font-bold hover:underline"
            >
              Try again
            </button>
          </div>
        ) : filteredAdvances.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto text-amber-500">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              No advance records found
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are currently no advance payments matching the active filter. Click "Record Advance Fee" to register a new pre-payment deposit.
            </p>
            <button
              onClick={() => setIsRecordModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record New Advance Deposit</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-3 px-4">Student</th>
                  <th scope="col" className="py-3 px-4">Course</th>
                  <th scope="col" className="py-3 px-4">Target Period</th>
                  <th scope="col" className="py-3 px-4 text-right">Monthly Fee Ceiling</th>
                  <th scope="col" className="py-3 px-4 text-right">Advance Received</th>
                  <th scope="col" className="py-3 px-4 text-center">Status</th>
                  <th scope="col" className="py-3 px-4 text-center">Email</th>
                  <th scope="col" className="py-3 px-4">Date Recorded</th>
                  <th scope="col" className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdvances.map((adv) => (
                  <tr key={adv.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Student Info */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">
                        {adv.students?.name || 'Unknown Student'}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 block">
                        ID: {adv.students?.admission_id || '—'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {adv.students?.phone || ''}
                      </span>
                    </td>

                    {/* Course */}
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {adv.students?.course || '—'}
                    </td>

                    {/* Target Period */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-brand-700 block">
                        {adv.fee_periods?.period_name || 'Future Period'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Key: {adv.fee_periods?.period_key || '—'}
                      </span>
                    </td>

                    {/* Monthly Fee Ceiling */}
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-600">
                      {formatCurrency(adv.students?.total_fee || 0)}
                    </td>

                    {/* Advance Received */}
                    <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm">
                      {formatCurrency(adv.amount_received)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                          adv.status === 'Applied'
                            ? 'bg-emerald-100 text-emerald-800'
                            : adv.status === 'Partially Applied'
                            ? 'bg-blue-100 text-blue-800'
                            : adv.status === 'Upcoming'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {adv.status}
                      </span>
                      {adv.status === 'Voided' && adv.void_reason && (
                        <span className="block text-[9px] text-rose-600 italic max-w-xs mx-auto truncate mt-0.5">
                          "{adv.void_reason}"
                        </span>
                      )}
                    </td>

                    {/* Email Delivery Status */}
                    <td className="py-3.5 px-4 text-center">
                      {adv.email_outbox && adv.email_outbox.length > 0 ? (
                        (() => {
                          const outbox = adv.email_outbox[0];
                          if (outbox.status === 'sent') {
                            return (
                              <span
                                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                title={`Delivered to ${outbox.recipient_email || 'student'} on ${outbox.sent_at ? formatDate(outbox.sent_at) : 'recently'}`}
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Sent</span>
                              </span>
                            );
                          }
                          if (outbox.status === 'pending') {
                            return (
                              <span
                                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"
                                title={`Queued for dispatch to ${outbox.recipient_email || 'student'}`}
                              >
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Queued</span>
                              </span>
                            );
                          }
                          if (outbox.status === 'failed') {
                            return (
                              <span
                                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 cursor-help"
                                title={outbox.last_error || 'Dispatch failed'}
                              >
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                <span>Failed</span>
                              </span>
                            );
                          }
                          return (
                            <span
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200"
                              title="No email address provided"
                            >
                              <MinusCircle className="w-3 h-3 text-slate-400" />
                              <span>None</span>
                            </span>
                          );
                        })()
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>

                    {/* Date Recorded */}
                    <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {formatDate(adv.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        {/* Print Receipt Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptData({
                              receipt_number: `REC-ADV-${adv.id.substring(0, 8).toUpperCase()}`,
                              student_name: adv.students?.name || 'Student',
                              admission_id: adv.students?.admission_id || '',
                              student_phone: adv.students?.phone,
                              student_course: adv.students?.course,
                              target_period_name: adv.fee_periods?.period_name || 'Future Period',
                              amount_paid: adv.amount_received,
                              payment_mode: 'UPI/Cash',
                              payment_date: adv.created_at.split('T')[0],
                              recipient_email: adv.students?.email || null,
                              remarks: adv.void_reason || null,
                            });
                          }}
                          className="p-1.5 text-slate-500 hover:text-brand-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Print Advance Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* Void Button - Visible ONLY to Super Admin (Decision 6) */}
                        {isSuperAdmin && adv.status !== 'Voided' && (
                          <button
                            type="button"
                            onClick={() => {
                              setVoidingAdvance({
                                id: adv.id,
                                student_name: adv.students?.name || 'Student',
                                admission_id: adv.students?.admission_id || '',
                                target_period_name: adv.fee_periods?.period_name || 'Period',
                                amount_received: adv.amount_received,
                              });
                            }}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Privileged Void / Reversal (Super Admin Only)"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Advance Deposit Modal */}
      <RecordAdvanceModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={(receipt) => {
          showToast('Advance payment recorded successfully!', 'success');
          setReceiptData(receipt);
          loadAdvances();
        }}
      />

      {/* Printable Receipt Modal */}
      <PrintableAdvanceReceipt
        isOpen={!!receiptData}
        data={receiptData}
        onClose={() => setReceiptData(null)}
      />

      {/* Super Admin Privileged Void Modal */}
      <VoidAdvanceModal
        isOpen={!!voidingAdvance}
        advanceRecord={voidingAdvance}
        onClose={() => setVoidingAdvance(null)}
        onSuccess={() => {
          showToast('Advance record voided and reversed in ledger.', 'success');
          loadAdvances();
        }}
      />
    </div>
  );
};

export default AdvanceFeesPage;
