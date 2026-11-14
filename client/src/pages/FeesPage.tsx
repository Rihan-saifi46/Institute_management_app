// ==============================================================================
// Z Institute Management System - Fees Management & Accounting Page
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  X,
  CreditCard,
  Plus,
  History,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  getFeeSummaries,
  type StudentFeeSummary,
  type FeePayment,
} from '../services/fees';
import { FeeStatusBadge } from '../components/fees/FeeStatusBadge';
import { RecordPaymentModal } from '../components/fees/RecordPaymentModal';
import { PaymentHistoryModal } from '../components/fees/PaymentHistoryModal';
import { ReversePaymentModal } from '../components/fees/ReversePaymentModal';
import { PrintableReceipt } from '../components/fees/PrintableReceipt';
import type { FeeStatus } from '../types/database';
import type { PaginatedResult } from '../types/common';

export const FeesPage: React.FC = () => {
  // Query & Tab states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<FeeStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Data states
  const [summariesResult, setSummariesResult] = useState<PaginatedResult<StudentFeeSummary> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Modals
  const [recordingForStudent, setRecordingForStudent] = useState<StudentFeeSummary | null>(null);
  const [historyForStudent, setHistoryForStudent] = useState<StudentFeeSummary | null>(null);
  const [reversingPayment, setReversingPayment] = useState<FeePayment | null>(null);

  // Receipt Modal State
  const [receiptPayment, setReceiptPayment] = useState<FeePayment | null>(null);
  const [receiptSummary, setReceiptSummary] = useState<StudentFeeSummary | null>(null);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const loadSummaries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getFeeSummaries({
        query: searchQuery,
        status: selectedStatus,
        page: currentPage,
        pageSize: 15,
      });
      setSummariesResult(result);
    } catch (err: any) {
      console.error('[FeesPage] Error loading fee summaries:', err);
      setError(err.message || 'Failed to load fee summaries.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedStatus, currentPage]);

  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  // Handle payment recorded successfully
  const handlePaymentSuccess = (payment: FeePayment, updatedSummary: StudentFeeSummary) => {
    showToast(`Payment of ${formatCurrency(payment.amount)} recorded successfully!`);
    loadSummaries();
    if (historyForStudent && historyForStudent.id === updatedSummary.id) {
      setHistoryForStudent(updatedSummary);
    }
  };

  // Handle payment reversal successfully
  const handlePaymentReversed = () => {
    showToast(`Payment reversal executed. Audit ledger updated.`);
    loadSummaries();
    setHistoryForStudent(null);
  };

  const handleOpenReceipt = (payment: FeePayment, summary: StudentFeeSummary) => {
    setReceiptPayment(payment);
    setReceiptSummary(summary);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  const handleStatusChange = (status: FeeStatus | 'all') => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const summaries: StudentFeeSummary[] = summariesResult?.data || [];
  const totalStudents = summariesResult?.count || 0;
  const totalPages = summariesResult?.totalPages || 1;

  // Aggregate metrics from current view
  const totalExpected = summaries.reduce((acc: number, curr: StudentFeeSummary) => acc + (curr.total_fee || 0), 0);
  const totalCollected = summaries.reduce((acc: number, curr: StudentFeeSummary) => acc + (curr.total_paid || 0), 0);
  const totalDue = summaries.reduce((acc: number, curr: StudentFeeSummary) => acc + (curr.balance_due || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Fees Management & Accounting
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time fee collection, immutable audit ledger, and printable receipts
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2.5 text-xs font-semibold text-emerald-800 shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadSummaries}
            className="text-xs font-bold underline ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Expected */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Course Fees</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(totalExpected)}</p>
          <span className="text-[11px] text-slate-400">Total billed across visible records</span>
        </div>

        {/* Card 2: Total Collected */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Fees Collected</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-bold text-emerald-600">{formatCurrency(totalCollected)}</p>
          <span className="text-[11px] text-slate-400">Net installments after reversals</span>
        </div>

        {/* Card 3: Total Due */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Outstanding Balance</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-bold text-rose-600">{formatCurrency(totalDue)}</p>
          <span className="text-[11px] text-slate-400">Pending collections</span>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by student name, Admission ID, phone..."
              className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center space-x-1 border border-slate-200 p-1 rounded-lg bg-slate-50">
            {(
              [
                { value: 'all', label: 'All Records' },
                { value: 'PARTIAL', label: 'Pending Dues' },
                { value: 'PAID', label: 'Fully Paid' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleStatusChange(tab.value)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  selectedStatus === tab.value
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fee Summaries Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col">
        {isLoading ? (
          <div className="p-8 space-y-4">
            <div className="h-6 bg-slate-100 rounded-md w-1/4 animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ) : summaries.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Filter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800">No fee records found</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search query or switching to "All Records".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th scope="col" className="py-3 px-4 sm:px-6">Admission ID</th>
                  <th scope="col" className="py-3 px-4">Student Name</th>
                  <th scope="col" className="py-3 px-4">Course</th>
                  <th scope="col" className="py-3 px-4 text-right">Total Fee</th>
                  <th scope="col" className="py-3 px-4 text-right">Total Paid</th>
                  <th scope="col" className="py-3 px-4 text-right">Balance Due</th>
                  <th scope="col" className="py-3 px-4 text-center">Status</th>
                  <th scope="col" className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaries.map((summary: StudentFeeSummary) => (
                  <tr key={summary.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Admission ID */}
                    <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-brand-700 whitespace-nowrap">
                      {summary.admission_id}
                    </td>

                    {/* Student Name */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {summary.name}
                      <span className="block text-[11px] font-normal text-slate-400">{summary.phone}</span>
                    </td>

                    {/* Course */}
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap font-medium">
                      {summary.course}
                    </td>

                    {/* Total Fee */}
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {formatCurrency(summary.total_fee)}
                    </td>

                    {/* Total Paid */}
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 whitespace-nowrap">
                      {formatCurrency(summary.total_paid)}
                    </td>

                    {/* Balance Due */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className={`font-bold ${summary.balance_due > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                        {formatCurrency(summary.balance_due)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <FeeStatusBadge status={summary.fee_status} />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Collect Fee CTA */}
                        {summary.balance_due > 0 ? (
                          <button
                            type="button"
                            onClick={() => setRecordingForStudent(summary)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-2xs transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Collect</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setRecordingForStudent(summary)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                            title="Record additional payment"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        )}

                        {/* View Ledger */}
                        <button
                          type="button"
                          onClick={() => setHistoryForStudent(summary)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors"
                          title="View complete payment history & reversals"
                        >
                          <History className="w-3.5 h-3.5 text-slate-500" />
                          <span>Ledger</span>
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
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Page <span className="font-semibold text-slate-900">{currentPage}</span> of{' '}
              <span className="font-semibold text-slate-900">{totalPages}</span> ({totalStudents} total students)
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={recordingForStudent !== null}
        studentSummary={recordingForStudent}
        onClose={() => setRecordingForStudent(null)}
        onPaymentSuccess={handlePaymentSuccess}
        onOpenReceipt={handleOpenReceipt}
      />

      {/* Payment History / Ledger Modal */}
      <PaymentHistoryModal
        isOpen={historyForStudent !== null}
        studentSummary={historyForStudent}
        onClose={() => setHistoryForStudent(null)}
        onOpenRecordModal={(summary) => {
          setHistoryForStudent(null);
          setRecordingForStudent(summary);
        }}
        onOpenReceiptModal={handleOpenReceipt}
        onOpenReverseModal={(payment) => setReversingPayment(payment)}
      />

      {/* Authorized Reversal Modal (Super Admin Only) */}
      <ReversePaymentModal
        isOpen={reversingPayment !== null}
        payment={reversingPayment}
        onClose={() => setReversingPayment(null)}
        onPaymentReversed={handlePaymentReversed}
      />

      {/* Printable Receipt Modal */}
      <PrintableReceipt
        isOpen={receiptPayment !== null}
        payment={receiptPayment}
        feeSummary={receiptSummary}
        onClose={() => {
          setReceiptPayment(null);
          setReceiptSummary(null);
        }}
      />
    </div>
  );
};
