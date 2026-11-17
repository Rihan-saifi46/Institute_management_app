// ==============================================================================
// Z Institute Management System - Fees Management & Monthly Billing Page
// Redesigned to Match Reference Screenshot 3
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
  Download,
  Wallet,
  Landmark,
  Users,
  ChevronDown,
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
import { WalletCoinsIllustration } from '../components/common/illustrations/WalletCoinsIllustration';
import { SparklineCurve } from '../components/common/illustrations/SparklineCurve';
import type { FeeStatus } from '../types/database';
import type { PaginatedResult } from '../types/common';

const avatarGradients = [
  'from-blue-500 to-blue-600',
  'from-purple-500 to-indigo-600',
  'from-sky-500 to-blue-500',
  'from-indigo-500 to-purple-600',
  'from-violet-500 to-purple-500',
];

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
    <div className="space-y-6 sm:space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : toastMessage.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-blue-50 text-blue-900 border-blue-200'
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

      {/* 1. Monthly Fees Collection Hero Banner (Matches Reference 3) */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#0D5BE1] via-[#1A73E8] to-[#2B87FF] text-white p-6 sm:p-9 shadow-lg overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left Column Content */}
        <div className="relative z-10 max-w-xl space-y-3">
          {/* Billing Period Pill Selector */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-black/15 backdrop-blur-md text-xs font-semibold border border-white/10 text-white shadow-2xs">
            <Calendar className="w-3.5 h-3.5" />
            <select
              value={selectedPeriodKey}
              onChange={(e) => {
                setSelectedPeriodKey(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-white font-semibold outline-none cursor-pointer pr-1"
            >
              {periods.map((p) => (
                <option key={p.period_key} value={p.period_key} className="text-slate-900">
                  {p.period_name}
                </option>
              ))}
            </select>
          </div>

          <h2 className="text-2xl sm:text-3.5xl font-extrabold tracking-tight">
            Monthly Fees Collection
          </h2>
          <p className="text-sm sm:text-base text-blue-100 font-normal leading-relaxed">
            Track and manage monthly fee collection with detailed insights and reports.
          </p>

          {/* Action CTAs inside banner */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleGenerateDues}
              disabled={isGeneratingDues}
              className="inline-flex items-center space-x-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 bg-white hover:bg-slate-50 active:bg-slate-100 rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-blue-600 ${isGeneratingDues ? 'animate-spin' : ''}`} />
              <span>{isGeneratingDues ? 'Generating...' : 'Generate Month Dues'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="inline-flex items-center space-x-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-white/15 hover:bg-white/25 active:bg-white/30 border border-white/20 rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'Exporting...' : 'Export Month CSV'}</span>
            </button>
          </div>
        </div>

        {/* Right 3D Wallet & Gold Coin Graphic (Matches Reference 3) */}
        <div className="relative z-10 shrink-0 self-center md:self-auto">
          <WalletCoinsIllustration className="w-60 h-44 sm:w-72 sm:h-48" />
        </div>
      </div>

      {/* 2. 5 Fee KPI Metric Cards with Sparklines (Matches Reference 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Expected Dues */}
        <div className="relative bg-white rounded-2xl p-4.5 border border-slate-100 shadow-sm flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
            <SparklineCurve color="blue" className="w-20 h-9" />
          </div>
          <div className="mt-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Expected Dues</p>
            <p className="text-xl font-extrabold text-slate-800 mt-0.5">
              {formatCurrency(monthMetrics.totalSnapshot)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Snapshot for {selectedPeriod?.period_name}</p>
          </div>
        </div>

        {/* Advance Adjusted */}
        <div className="relative bg-white rounded-2xl p-4.5 border border-slate-100 shadow-sm flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs">
              <Wallet className="w-5 h-5" />
            </div>
            <SparklineCurve color="amber" className="w-20 h-9" />
          </div>
          <div className="mt-3">
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Advance Adjusted</p>
            <p className="text-xl font-extrabold text-slate-800 mt-0.5">
              {formatCurrency(monthMetrics.advanceOffset)}
            </p>
            <p className="text-[10px] text-amber-600 mt-1">Offset from pre-payments</p>
          </div>
        </div>

        {/* Direct Collections */}
        <div className="relative bg-white rounded-2xl p-4.5 border border-slate-100 shadow-sm flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs">
              <Landmark className="w-5 h-5" />
            </div>
            <SparklineCurve color="emerald" className="w-20 h-9" />
          </div>
          <div className="mt-3">
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Direct Collections</p>
            <p className="text-xl font-extrabold text-slate-800 mt-0.5">
              {formatCurrency(monthMetrics.directCollected)}
            </p>
            <p className="text-[10px] text-emerald-600 mt-1">Cash / UPI / Bank payments</p>
          </div>
        </div>

        {/* Remaining Dues */}
        <div className="relative bg-white rounded-2xl p-4.5 border border-slate-100 shadow-sm flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
            <SparklineCurve color="rose" className="w-20 h-9" />
          </div>
          <div className="mt-3">
            <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Remaining Dues</p>
            <p className="text-xl font-extrabold text-slate-800 mt-0.5">
              {formatCurrency(monthMetrics.netOutstanding)}
            </p>
            <p className="text-[10px] text-rose-500 mt-1">Pending for this month</p>
          </div>
        </div>

        {/* Unpaid Students */}
        <div className="relative bg-white rounded-2xl p-4.5 border border-slate-100 shadow-sm flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <SparklineCurve color="purple" className="w-20 h-9" />
          </div>
          <div className="mt-3">
            <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Unpaid Students</p>
            <p className="text-xl font-extrabold text-slate-800 mt-0.5">
              {monthMetrics.unpaidCount}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Students with balance &gt; 0</p>
          </div>
        </div>
      </div>

      {/* 3. Search and Month Status Filter Tabs (Matches Reference 3) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search student by name, admission ID, or phone..."
            className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-white hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Month Status Tabs Filter */}
        <div className="flex items-center space-x-1.5 bg-white p-1 rounded-xl border border-slate-200/80 shadow-2xs self-start sm:self-auto">
          {/* All Months / Period selector pill */}
          <div className="relative">
            <select
              value={selectedPeriodKey}
              onChange={(e) => {
                setSelectedPeriodKey(e.target.value);
                setCurrentPage(1);
              }}
              className={`pl-3 pr-7 py-1.5 text-xs font-bold rounded-lg transition-all appearance-none cursor-pointer ${
                selectedStatus === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-transparent text-slate-700 hover:text-slate-900'
              }`}
            >
              <option value={selectedPeriodKey} className="text-slate-900">
                All Months
              </option>
              {periods.map((p) => (
                <option key={p.period_key} value={p.period_key} className="text-slate-900">
                  {p.period_name}
                </option>
              ))}
            </select>
            <ChevronDown className={`w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${selectedStatus === 'all' ? 'text-white' : 'text-slate-500'}`} />
          </div>

          {(['UNPAID', 'PARTIAL', 'PAID'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setSelectedStatus(st === selectedStatus ? 'all' : st);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                selectedStatus === st
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Month-Wise Dues Table (Matches Reference 3) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-600">Loading {selectedPeriod?.period_name} dues...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-xs font-bold">{error}</p>
            <button
              onClick={() => loadDues()}
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              Try again
            </button>
          </div>
        ) : duesResult.data.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto shadow-2xs">
              <Calendar className="w-7 h-7" />
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
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Generate Dues for {selectedPeriod?.period_name}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#EEF4FF] border-b border-blue-100/60 text-[11px] font-bold text-[#10234F] tracking-wide">
                  <th scope="col" className="py-3.5 px-4">STUDENT INFO</th>
                  <th scope="col" className="py-3.5 px-4">COURSE</th>
                  <th scope="col" className="py-3.5 px-4 text-right">FEE SNAPSHOT</th>
                  <th scope="col" className="py-3.5 px-4 text-right">ADVANCE OFFSET</th>
                  <th scope="col" className="py-3.5 px-4 text-right">PAID</th>
                  <th scope="col" className="py-3.5 px-4 text-right">REMAINING BALANCE</th>
                  <th scope="col" className="py-3.5 px-4 text-center">MONTH STATUS</th>
                  <th scope="col" className="py-3.5 px-4 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {duesResult.data.map((due, idx) => {
                  const grad = avatarGradients[idx % avatarGradients.length];
                  const initial = due.student_name ? due.student_name.charAt(0).toUpperCase() : '?';

                  return (
                    <tr key={due.due_id} className="hover:bg-blue-50/30 transition-colors">
                      {/* Student Info with Avatar */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${grad} text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0`}>
                            {initial}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 text-sm block">
                              {due.student_name}
                            </span>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                              <span className="font-mono font-semibold text-blue-600">ID: {due.admission_id}</span>
                              <span>•</span>
                              <span>{due.student_phone}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Course Pill */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100/60">
                          {due.student_course}
                        </span>
                      </td>

                      {/* Fee Snapshot */}
                      <td className="py-4 px-4 text-right font-bold text-slate-800 whitespace-nowrap text-sm">
                        {formatCurrency(due.fee_snapshot)}
                      </td>

                      {/* Advance Offset */}
                      <td className="py-4 px-4 text-right font-semibold text-amber-600 whitespace-nowrap">
                        {due.advance_applied_amount > 0 ? formatCurrency(due.advance_applied_amount) : '—'}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-4 px-4 text-right font-bold text-emerald-600 whitespace-nowrap text-sm">
                        {due.normal_paid_amount > 0 ? formatCurrency(due.normal_paid_amount) : '—'}
                      </td>

                      {/* Remaining Balance */}
                      <td className="py-4 px-4 text-right font-extrabold whitespace-nowrap text-sm">
                        <span className={due.balance_remaining > 0 ? 'text-rose-600' : 'text-slate-400'}>
                          {formatCurrency(due.balance_remaining)}
                        </span>
                      </td>

                      {/* Month Status Pill Badge */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${
                            due.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : due.status === 'PARTIAL'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              due.status === 'PAID'
                                ? 'bg-emerald-500'
                                : due.status === 'PARTIAL'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          {due.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setCollectingForDue(due)}
                            disabled={due.status === 'PAID' || due.balance_remaining <= 0}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs"
                            title="Collect exact full remaining balance for this month"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Collect</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {duesResult.totalPages > 1 && (
          <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-800">{(currentPage - 1) * 15 + 1}</span> to{' '}
              <span className="font-bold text-slate-800">{Math.min(currentPage * 15, duesResult.count)}</span> of{' '}
              <span className="font-bold text-slate-800">{duesResult.count}</span> students
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs shadow-2xs">
                {currentPage}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, duesResult.totalPages))}
                disabled={currentPage >= duesResult.totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600"
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
