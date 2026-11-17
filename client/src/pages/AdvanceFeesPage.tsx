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
import { WalletCoinsIllustration } from '../components/common/illustrations/WalletCoinsIllustration';
import { SparklineCurve } from '../components/common/illustrations/SparklineCurve';

const avatarGradients = [
  'from-blue-500 to-blue-600',
  'from-purple-500 to-indigo-600',
  'from-sky-500 to-blue-500',
  'from-indigo-500 to-purple-600',
  'from-violet-500 to-purple-500',
];

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
    if (activeTab === 'active' && adv.status !== 'Upcoming' && adv.status !== 'Partially Applied') {
      return false;
    }
    if (activeTab === 'Applied' && adv.status !== 'Applied') {
      return false;
    }
    if (activeTab === 'Voided' && adv.status !== 'Voided') {
      return false;
    }

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
    <div className="space-y-6 sm:space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
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

      {/* 1. Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#0D5BE1] via-[#1A73E8] to-[#2B87FF] text-white p-6 sm:p-9 shadow-lg overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 max-w-xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-black/15 backdrop-blur-md text-xs font-semibold border border-white/10 text-white shadow-2xs">
            <Clock className="w-3.5 h-3.5" />
            <span>Advance Tuition Escrow</span>
          </div>

          <h2 className="text-2xl sm:text-3.5xl font-extrabold tracking-tight">
            Advance Fees Management
          </h2>
          <p className="text-sm sm:text-base text-blue-100 font-normal leading-relaxed">
            Accept and track tuition payments earmarked for future billing months with automatic month-wise adjustment.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsRecordModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 bg-white hover:bg-slate-50 active:bg-slate-100 rounded-xl shadow-xs transition-all"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Record Advance Fee</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="inline-flex items-center space-x-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-white/15 hover:bg-white/25 active:bg-white/30 border border-white/20 rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          </div>
        </div>

        <div className="relative z-10 shrink-0 self-center md:self-auto">
          <WalletCoinsIllustration className="w-60 h-44 sm:w-72 sm:h-48" />
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Upcoming Advance Pool */}
        <div className="relative bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs">
              <Clock className="w-6 h-6" />
            </div>
            <SparklineCurve color="amber" className="w-20 h-9" />
          </div>
          <div className="mt-3">
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Active Upcoming Advance Pool</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-0.5">
              {formatCurrency(upcomingTotal)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {activeCount} active pre-payment deposit{activeCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Applied Advances */}
        <div className="relative bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <SparklineCurve color="emerald" className="w-20 h-9" />
          </div>
          <div className="mt-3">
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Advances Applied to Dues</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-0.5">
              {formatCurrency(appliedTotal)}
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-1">Credited automatically on month arrival</p>
          </div>
        </div>

        {/* Governance Notice */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block mb-1">
              Ceiling &amp; Void Rules Enforced
            </span>
            <p className="text-xs text-slate-500 leading-relaxed">
              Advances cannot exceed the student's monthly fee ceiling. Only Super Admins can void advances with an audited ledger reversal.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Search and Tab Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, ID, phone, or month..."
            className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-white hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs Filter */}
        <div className="flex items-center space-x-1.5 bg-white p-1 rounded-xl border border-slate-200/80 shadow-2xs self-start sm:self-auto">
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
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Advance Records Data Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-600">Loading advance records...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-xs font-bold">{error}</p>
            <button
              onClick={() => loadAdvances()}
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              Try again
            </button>
          </div>
        ) : filteredAdvances.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto shadow-2xs">
              <Clock className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              No advance records found
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are currently no advance payments matching the active filter. Click "Record Advance Fee" to register a new pre-payment deposit.
            </p>
            <button
              onClick={() => setIsRecordModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record New Advance Deposit</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#EEF4FF] border-b border-blue-100/60 text-[11px] font-bold text-[#10234F] tracking-wide">
                  <th scope="col" className="py-3.5 px-4">STUDENT</th>
                  <th scope="col" className="py-3.5 px-4">COURSE</th>
                  <th scope="col" className="py-3.5 px-4">TARGET PERIOD</th>
                  <th scope="col" className="py-3.5 px-4 text-right">MONTHLY FEE CEILING</th>
                  <th scope="col" className="py-3.5 px-4 text-right">ADVANCE RECEIVED</th>
                  <th scope="col" className="py-3.5 px-4 text-center">STATUS</th>
                  <th scope="col" className="py-3.5 px-4 text-center">EMAIL</th>
                  <th scope="col" className="py-3.5 px-4">DATE RECORDED</th>
                  <th scope="col" className="py-3.5 px-4 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdvances.map((adv, idx) => {
                  const grad = avatarGradients[idx % avatarGradients.length];
                  const initial = adv.students?.name ? adv.students.name.charAt(0).toUpperCase() : '?';

                  return (
                    <tr key={adv.id} className="hover:bg-blue-50/30 transition-colors">
                      {/* Student Info */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${grad} text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0`}>
                            {initial}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 text-sm block">
                              {adv.students?.name || 'Unknown Student'}
                            </span>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                              <span className="font-mono font-semibold text-blue-600">ID: {adv.students?.admission_id || '—'}</span>
                              <span>•</span>
                              <span>{adv.students?.phone || ''}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Course */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100/60">
                          {adv.students?.course || '—'}
                        </span>
                      </td>

                      {/* Target Period */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-bold text-blue-600 block">
                          {adv.fee_periods?.period_name || 'Future Period'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Key: {adv.fee_periods?.period_key || '—'}
                        </span>
                      </td>

                      {/* Monthly Fee Ceiling */}
                      <td className="py-4 px-4 text-right font-bold text-slate-600 whitespace-nowrap">
                        {formatCurrency(adv.students?.total_fee || 0)}
                      </td>

                      {/* Advance Received */}
                      <td className="py-4 px-4 text-right font-extrabold text-emerald-600 text-sm whitespace-nowrap">
                        {formatCurrency(adv.amount_received)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${
                            adv.status === 'Applied'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : adv.status === 'Partially Applied'
                              ? 'bg-blue-50 text-blue-700 border-blue-100'
                              : adv.status === 'Upcoming'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              adv.status === 'Applied'
                                ? 'bg-emerald-500'
                                : adv.status === 'Partially Applied'
                                ? 'bg-blue-500'
                                : adv.status === 'Upcoming'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          {adv.status}
                        </span>
                        {adv.status === 'Voided' && adv.void_reason && (
                          <span className="block text-[10px] text-rose-600 italic max-w-xs mx-auto truncate mt-1">
                            "{adv.void_reason}"
                          </span>
                        )}
                      </td>

                      {/* Email Delivery */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {adv.email_outbox && adv.email_outbox.length > 0 ? (
                          (() => {
                            const outbox = adv.email_outbox[0];
                            if (outbox.status === 'sent') {
                              return (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Sent</span>
                                </span>
                              );
                            }
                            if (outbox.status === 'pending') {
                              return (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Queued</span>
                                </span>
                              );
                            }
                            if (outbox.status === 'failed') {
                              return (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Failed</span>
                                </span>
                              );
                            }
                            return <span className="text-slate-400 text-xs">—</span>;
                          })()
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Date Recorded */}
                      <td className="py-4 px-4 text-slate-500 font-medium whitespace-nowrap">
                        {formatDate(adv.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Print Receipt */}
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
                            className="p-1.5 text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Print Advance Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Void Button (Super Admin Only) */}
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
                              className="p-1.5 text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                              title="Privileged Void / Reversal (Super Admin Only)"
                            >
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
