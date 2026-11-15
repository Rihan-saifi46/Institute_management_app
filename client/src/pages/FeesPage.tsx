// ==============================================================================
// Z Institute Management System - Fees Management & Monthly Billing Page
// Redesigned for Migration 0006: Month-Wise Dues & Strict Full-Payment Normal Dues
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  X,
  CreditCard,
  History,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Download,
} from 'lucide-react';
import {
  getFeePeriods,
  getMonthlyDues,
  generateMonthlyDues,
  type FeePeriod,
  type MonthlyDueStatusRecord,
  type StudentFeeSummary,
} from '../services/fees';
import { exportMonthlyDuesCsv } from '../services/export';
import { RecordMonthlyPaymentModal } from '../components/fees/RecordMonthlyPaymentModal';
import { PaymentHistoryModal } from '../components/fees/PaymentHistoryModal';
import { PrintableMonthlyReceipt, type MonthlyReceiptData } from '../components/fees/PrintableMonthlyReceipt';
import type { FeeStatus } from '../types/database';
import type { PaginatedResult } from '../types/common';

export const FeesPage: React.FC = () => {
  // Period states
  const [periods, setPeriods] = useState<FeePeriod[]>([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('2026-11');
  const [isGeneratingDues, setIsGeneratingDues] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Query & Tab states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<FeeStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Data states
  const [duesResult, setDuesResult] = useState<PaginatedResult<MonthlyDueStatusRecord>>({
    data: [],
    count: 0,
    page: 1,
    pageSize: 15,
    totalPages: 0,
  });
  const [monthMetrics, setMonthMetrics] = useState({
    totalSnapshot: 0,
    advanceOffset: 0,
    directCollected: 0,
    netOutstanding: 0,
    unpaidCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Active Modals
  const [collectingForDue, setCollectingForDue] = useState<MonthlyDueStatusRecord | null>(null);
  const [historyStudentSummary, setHistoryStudentSummary] = useState<StudentFeeSummary | null>(null);
  const [monthlyReceiptData, setMonthlyReceiptData] = useState<MonthlyReceiptData | null>(null);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Load available billing periods on mount
  useEffect(() => {
    async function loadPeriods() {
      try {
        const periodList = await getFeePeriods();
        setPeriods(periodList);
        if (periodList.length > 0) {
          // Default to first period >= current month or 2026-11
          const nowKey = new Date().toISOString().substring(0, 7);
          const currentOrNov = periodList.find((p) => p.period_key === nowKey) || periodList[0];
          setSelectedPeriodKey(currentOrNov.period_key);
        }
      } catch (err: any) {
        console.error('[FeesPage] Failed to load fee periods:', err);
      }
    }
    loadPeriods();
  }, []);

  // Load monthly dues and metrics
  const loadDues = useCallback(async () => {
    if (!selectedPeriodKey) return;
    setIsLoading(true);
    setError(null);
    try {
      const [paged, all] = await Promise.all([
        getMonthlyDues({
          periodKey: selectedPeriodKey,
          query: searchQuery,
          status: selectedStatus,
          page: currentPage,
          pageSize: 15,
        }),
        getMonthlyDues({
          periodKey: selectedPeriodKey,
          query: searchQuery,
          status: selectedStatus,
          page: 1,
          pageSize: 5000,
        }),
      ]);

      setDuesResult(paged);

      const allRecords = all.data;
      setMonthMetrics({
        totalSnapshot: allRecords.reduce((acc, curr) => acc + (curr.fee_snapshot || 0), 0),
        advanceOffset: allRecords.reduce((acc, curr) => acc + (curr.advance_applied_amount || 0), 0),
        directCollected: allRecords.reduce((acc, curr) => acc + (curr.normal_paid_amount || 0), 0),
        netOutstanding: allRecords.reduce((acc, curr) => acc + (curr.balance_remaining || 0), 0),
        unpaidCount: allRecords.filter((r) => r.status !== 'PAID').length,
      });
    } catch (err: any) {
      console.error('[FeesPage] Error loading monthly dues:', err);
      setError(err.message || 'Failed to load monthly fee dues.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriodKey, searchQuery, selectedStatus, currentPage]);

  useEffect(() => {
    loadDues();
  }, [loadDues]);

  // Handle on-demand dues generation
  const handleGenerateDues = async () => {
    if (!selectedPeriodKey) return;
    setIsGeneratingDues(true);
    try {
      const res = await generateMonthlyDues(selectedPeriodKey);
      showToast(
        `Monthly Dues Processed! ${res.dues_created} new dues created, ${res.advances_applied} advances adjusted.`,
        'success'
      );
      loadDues();
    } catch (err: any) {
      console.error('[FeesPage] Dues generation failed:', err);
      showToast(err.message || 'Failed to generate monthly dues.', 'error');
    } finally {
      setIsGeneratingDues(false);
    }
  };

  // Handle month-wise dues CSV export
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const res = await exportMonthlyDuesCsv({
        periodKey: selectedPeriodKey,
        status: selectedStatus,
        query: searchQuery,
      });
      showToast(`Exported ${res.recordCount} monthly dues to ${res.filename}`, 'success');
    } catch (err: any) {
      console.error('[FeesPage] CSV Export failed:', err);
      showToast(err.message || 'Failed to export monthly dues CSV.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedPeriod = periods.find((p) => p.period_key === selectedPeriodKey);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : toastMessage.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-brand-50 text-brand-900 border-brand-200'
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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center space-x-2.5">
            <span>Monthly Fees Collection</span>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-brand-50 text-brand-700 border border-brand-200">
              {selectedPeriod?.period_name || 'Billing Period'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Granular month-by-month billing engine with strict full-payment collection and independent statuses.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Period Dropdown Selector */}
          <div className="relative">
            <select
              value={selectedPeriodKey}
              onChange={(e) => {
                setSelectedPeriodKey(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none bg-white border border-slate-300 hover:border-slate-400 pl-3.5 pr-8 py-2 text-xs font-bold text-slate-900 rounded-xl shadow-xs focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              {periods.map((p) => (
                <option key={p.period_key} value={p.period_key}>
                  {p.period_name}
                </option>
              ))}
            </select>
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Generate Dues Button */}
          <button
            type="button"
            onClick={handleGenerateDues}
            disabled={isGeneratingDues}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            title="Generate monthly dues for active eligible students"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingDues ? 'animate-spin' : ''}`} />
            <span>{isGeneratingDues ? 'Generating...' : 'Generate Month Dues'}</span>
          </button>

          {/* Export Month Dues CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            title="Download month-wise dues and status as CSV"
          >
            <Download className={`w-3.5 h-3.5 text-slate-600 ${isExporting ? 'animate-bounce' : ''}`} />
            <span>{isExporting ? 'Exporting...' : 'Export Month CSV'}</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Expected Due */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Expected Dues
          </span>
          <span className="text-lg font-black text-slate-900 block">
            {formatCurrency(monthMetrics.totalSnapshot)}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Snapshot for {selectedPeriod?.period_name}
          </span>
        </div>

        {/* Advance Offset */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
            Advance Adjusted
          </span>
          <span className="text-lg font-black text-amber-800 block">
            {formatCurrency(monthMetrics.advanceOffset)}
          </span>
          <span className="text-[10px] text-amber-600 mt-1 block">
            Offset from pre-payments
          </span>
        </div>

        {/* Direct Collections */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
            Direct Collections
          </span>
          <span className="text-lg font-black text-emerald-800 block">
            {formatCurrency(monthMetrics.directCollected)}
          </span>
          <span className="text-[10px] text-emerald-600 mt-1 block">
            Cash / UPI / Bank payments
          </span>
        </div>

        {/* Net Outstanding */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-1">
            Remaining Dues
          </span>
          <span className="text-lg font-black text-rose-800 block">
            {formatCurrency(monthMetrics.netOutstanding)}
          </span>
          <span className="text-[10px] text-rose-600 mt-1 block">
            Pending for this month
          </span>
        </div>

        {/* Unpaid Student Count */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs col-span-2 lg:col-span-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Unpaid Students
          </span>
          <span className="text-lg font-black text-slate-900 block">
            {monthMetrics.unpaidCount}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Students with balance &gt; 0
          </span>
        </div>
      </div>

      {/* Search & Status Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search student by name, admission ID, or phone..."
            className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 self-start md:self-auto bg-slate-100 p-1 rounded-xl">
          {(['all', 'UNPAID', 'PARTIAL', 'PAID'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setSelectedStatus(st);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                selectedStatus === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'all' ? 'All Months' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Dues Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-600">Loading {selectedPeriod?.period_name} dues...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-xs font-bold">{error}</p>
            <button
              onClick={() => loadDues()}
              className="text-xs text-brand-600 font-bold hover:underline"
            >
              Try again
            </button>
          </div>
        ) : duesResult.data.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              No dues found for {selectedPeriod?.period_name}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              If this billing period just started, click "Generate Month Dues" to create obligations for all active students.
            </p>
            <button
              onClick={handleGenerateDues}
              disabled={isGeneratingDues}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Dues for {selectedPeriod?.period_name}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-3 px-4">Student Info</th>
                  <th scope="col" className="py-3 px-4">Course</th>
                  <th scope="col" className="py-3 px-4 text-right">Fee Snapshot</th>
                  <th scope="col" className="py-3 px-4 text-right">Advance Offset</th>
                  <th scope="col" className="py-3 px-4 text-right">Paid</th>
                  <th scope="col" className="py-3 px-4 text-right">Remaining Balance</th>
                  <th scope="col" className="py-3 px-4 text-center">Month Status</th>
                  <th scope="col" className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {duesResult.data.map((due) => (
                  <tr key={due.due_id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Student Info */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{due.student_name}</span>
                      <span className="font-mono text-[11px] text-slate-500 block">ID: {due.admission_id}</span>
                      <span className="text-[11px] text-slate-400">{due.student_phone}</span>
                    </td>

                    {/* Course */}
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {due.student_course}
                    </td>

                    {/* Fee Snapshot */}
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                      {formatCurrency(due.fee_snapshot)}
                    </td>

                    {/* Advance Offset */}
                    <td className="py-3.5 px-4 text-right font-semibold text-amber-700">
                      {due.advance_applied_amount > 0 ? formatCurrency(due.advance_applied_amount) : '—'}
                    </td>

                    {/* Paid Amount */}
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-700">
                      {due.normal_paid_amount > 0 ? formatCurrency(due.normal_paid_amount) : '—'}
                    </td>

                    {/* Remaining Balance */}
                    <td className="py-3.5 px-4 text-right font-black">
                      <span className={due.balance_remaining > 0 ? 'text-rose-600' : 'text-slate-400'}>
                        {formatCurrency(due.balance_remaining)}
                      </span>
                    </td>

                    {/* Status Badge (Independent Status) */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                          due.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : due.status === 'PARTIAL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {due.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setCollectingForDue(due)}
                          disabled={due.status === 'PAID' || due.balance_remaining <= 0}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
                          title="Collect exact full remaining balance for this month"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Collect</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            // Synthesize student summary for legacy history modal
                            setHistoryStudentSummary({
                              id: due.student_id,
                              admission_id: due.admission_id,
                              name: due.student_name,
                              phone: due.student_phone,
                              course: due.student_course,
                              joining_date: '2026-10-01',
                              status: 'active',
                              total_fee: due.fee_snapshot,
                              total_paid: due.normal_paid_amount + due.advance_applied_amount,
                              balance_due: due.balance_remaining,
                              fee_status: due.status,
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Payment History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {duesResult.totalPages > 1 && (
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {(currentPage - 1) * 15 + 1} to{' '}
              {Math.min(currentPage * 15, duesResult.count)} of {duesResult.count} dues
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1}
                className="p-1.5 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-700">
                Page {currentPage} of {duesResult.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, duesResult.totalPages))}
                disabled={currentPage >= duesResult.totalPages}
                className="p-1.5 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Payment Modal */}
      <RecordMonthlyPaymentModal
        isOpen={!!collectingForDue}
        dueRecord={collectingForDue}
        onClose={() => setCollectingForDue(null)}
        onPaymentSuccess={() => {
          showToast('Payment collected successfully!', 'success');
          loadDues();
        }}
        onOpenReceipt={(receiptData) => {
          setMonthlyReceiptData(receiptData);
        }}
      />

      {/* Printable Monthly Receipt Preview Modal */}
      <PrintableMonthlyReceipt
        isOpen={!!monthlyReceiptData}
        data={monthlyReceiptData}
        onClose={() => setMonthlyReceiptData(null)}
      />

      {/* Payment History Modal */}
      <PaymentHistoryModal
        isOpen={!!historyStudentSummary}
        studentSummary={historyStudentSummary}
        onClose={() => setHistoryStudentSummary(null)}
        onOpenRecordModal={() => {}}
        onOpenReceiptModal={() => {}}
        onOpenReverseModal={() => {}}
      />
    </div>
  );
};
