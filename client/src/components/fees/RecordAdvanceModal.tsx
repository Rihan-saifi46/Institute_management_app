// ==============================================================================
// Z Institute Management System - Record Advance Fee Deposit Modal
// Manages Earmarked Future Tuition Deposits with Strict Ceiling Enforcement
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Search,
  Mail,
  Info,
} from 'lucide-react';
import {
  getFeePeriods,
  getUpcomingAdvances,
  recordAdvanceFee,
  type FeePeriod,
} from '../../services/fees';
import { getStudents, updateStudent, type Student } from '../../services/students';
import type { PaymentMode } from '../../types/database';
import type { AdvanceReceiptData } from './PrintableAdvanceReceipt';

interface RecordAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (receiptData: AdvanceReceiptData) => void;
}

export const RecordAdvanceModal: React.FC<RecordAdvanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Students & Periods data
  const [students, setStudents] = useState<Student[]>([]);
  const [futurePeriods, setFuturePeriods] = useState<FeePeriod[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);

  // Form selections
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedPeriodKey, setSelectedPeriodKey] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  // Email state (Decision 1: Optional)
  const [emailInput, setEmailInput] = useState('');
  const [saveEmailToProfile, setSaveEmailToProfile] = useState(false);

  // Ceiling calculations
  const [existingAdvanceForPeriod, setExistingAdvanceForPeriod] = useState(0);
  const [isLoadingCeiling, setIsLoadingCeiling] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  // Load students and future periods when modal opens
  useEffect(() => {
    if (!isOpen) return;

    async function loadMeta() {
      setIsLoadingMeta(true);
      setErrorMessage(null);
      try {
        const [studentRes, periodList] = await Promise.all([
          getStudents({ status: 'active', pageSize: 1000 }),
          getFeePeriods(),
        ]);

        setStudents(studentRes.data);

        // Filter strictly future periods (start_date > today in IST)
        const todayStr = new Date().toISOString().split('T')[0];
        const future = periodList.filter((p) => p.start_date > todayStr);
        setFuturePeriods(future);

        if (future.length > 0) {
          setSelectedPeriodKey(future[0].period_key);
        }
      } catch (err: any) {
        console.error('[RecordAdvanceModal] Failed to load metadata:', err);
        setErrorMessage(err.message || 'Failed to initialize form.');
      } finally {
        setIsLoadingMeta(false);
      }
    }

    loadMeta();
  }, [isOpen]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const selectedPeriod = futurePeriods.find((p) => p.period_key === selectedPeriodKey);

  // Pre-fill email when student changes
  useEffect(() => {
    if (selectedStudent) {
      setEmailInput(selectedStudent.email || '');
      setSaveEmailToProfile(false);
    } else {
      setEmailInput('');
    }
  }, [selectedStudent]);

  // Query existing advances for selected student + target period to calculate ceiling
  useEffect(() => {
    if (!selectedStudentId || !selectedPeriodKey) {
      setExistingAdvanceForPeriod(0);
      return;
    }

    async function checkCeiling() {
      setIsLoadingCeiling(true);
      try {
        const advances = await getUpcomingAdvances(selectedStudentId);
        const targetPeriod = futurePeriods.find((p) => p.period_key === selectedPeriodKey);
        if (targetPeriod) {
          const sumForPeriod = advances
            .filter((a) => a.target_period_id === targetPeriod.id && (a.status === 'Upcoming' || a.status === 'Partially Applied'))
            .reduce((acc, curr) => acc + curr.amount_received, 0);
          setExistingAdvanceForPeriod(sumForPeriod);
        }
      } catch (err) {
        console.error('[RecordAdvanceModal] Error checking ceiling:', err);
      } finally {
        setIsLoadingCeiling(false);
      }
    }

    checkCeiling();
  }, [selectedStudentId, selectedPeriodKey, futurePeriods]);

  if (!isOpen) return null;

  // Maximum allowed advance based on student's monthly fee (students.total_fee per Decision 2)
  const studentMonthlyFee = selectedStudent?.total_fee || 0;
  const maxAllowableAdvance = Math.max(studentMonthlyFee - existingAdvanceForPeriod, 0);

  const resetForm = () => {
    setSelectedStudentId('');
    setStudentSearch('');
    setAdvanceAmount('');
    setReceiptNumber('');
    setRemarks('');
    setEmailInput('');
    setSaveEmailToProfile(false);
    setErrorMessage(null);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedStudent) {
      setErrorMessage('Please select a student.');
      return;
    }
    if (!selectedPeriod) {
      setErrorMessage('Please select a future billing month.');
      return;
    }

    const parsedAmount = parseFloat(advanceAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Advance amount must be greater than zero.');
      return;
    }

    if (parsedAmount > maxAllowableAdvance) {
      setErrorMessage(
        `Advance allocation exceeds monthly fee ceiling. Maximum allowable advance for ${selectedPeriod.period_name} is ${formatCurrency(maxAllowableAdvance)}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Optionally save email to profile if requested and student didn't have one
      const cleanEmail = emailInput.trim();
      if (saveEmailToProfile && cleanEmail.length > 0 && cleanEmail !== selectedStudent.email) {
        await updateStudent(selectedStudent.id, { email: cleanEmail });
      }

      // 2. Record advance payment via RPC
      const result: any = await recordAdvanceFee({
        studentId: selectedStudent.id,
        targetPeriodKey: selectedPeriod.period_key,
        amount: parsedAmount,
        paymentMode,
        receiptNumber: receiptNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
        studentEmail: cleanEmail || undefined,
      });

      const receiptData: AdvanceReceiptData = {
        receipt_number: result?.receipt_number || `REC-ADV-${Date.now()}`,
        student_name: selectedStudent.name,
        admission_id: selectedStudent.admission_id,
        student_phone: selectedStudent.phone,
        student_course: selectedStudent.course,
        target_period_name: selectedPeriod.period_name,
        amount_paid: parsedAmount,
        payment_mode: paymentMode,
        payment_date: new Date().toISOString().split('T')[0],
        recipient_email: cleanEmail || null,
        remarks: remarks.trim() || null,
      };

      onSuccess(receiptData);
      resetForm();
      onClose();
    } catch (err: any) {
      console.error('[RecordAdvanceModal] Advance recording failed:', err);
      setErrorMessage(err.message || 'Failed to record advance fee.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter students for search dropdown
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.admission_id.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.phone.includes(studentSearch)
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="advance-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 id="advance-modal-title" className="text-base font-bold text-white leading-tight">
                Record Advance Tuition Fee
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Pre-payment earmarked for a future billing month
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start space-x-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Student Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Select Student <span className="text-rose-500">*</span>
            </label>
            {selectedStudent ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-900 block">{selectedStudent.name}</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    ID: {selectedStudent.admission_id} • Monthly Fee: {formatCurrency(selectedStudent.total_fee)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudentId('')}
                  className="text-xs text-brand-600 font-bold hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search by name, ID, or phone..."
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                  {isLoadingMeta ? (
                    <div className="p-3 text-center text-xs text-slate-400">Loading students...</div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">No active students found.</div>
                  ) : (
                    filteredStudents.slice(0, 10).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(s.id);
                          setStudentSearch('');
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-900 block">{s.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {s.admission_id}</span>
                        </div>
                        <span className="font-bold text-slate-700">{formatCurrency(s.total_fee)}/mo</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Target Future Period Selector */}
          <div>
            <label htmlFor="target_period" className="block text-xs font-bold text-slate-800 mb-1">
              Target Billing Month <span className="text-rose-500">*</span>
            </label>
            <select
              id="target_period"
              value={selectedPeriodKey}
              onChange={(e) => setSelectedPeriodKey(e.target.value)}
              disabled={futurePeriods.length === 0 || isSubmitting}
              className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              {futurePeriods.length === 0 ? (
                <option value="">No future periods configured</option>
              ) : (
                futurePeriods.map((p) => (
                  <option key={p.period_key} value={p.period_key}>
                    {p.period_name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Ceiling Indicator Banner (Decision 2) */}
          {selectedStudent && selectedPeriod && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Advance Ceiling Verification:</span>
                </span>
                <span className="text-[11px] font-bold text-amber-800">
                  {selectedPeriod.period_name}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-amber-200/60">
                <div>
                  <span className="text-amber-700 block">Monthly Fee:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(studentMonthlyFee)}</span>
                </div>
                <div>
                  <span className="text-amber-700 block">Already Received:</span>
                  <span className="font-bold text-amber-800">
                    {isLoadingCeiling ? '...' : formatCurrency(existingAdvanceForPeriod)}
                  </span>
                </div>
                <div>
                  <span className="text-amber-700 block">Max Allowable:</span>
                  <span className="font-black text-emerald-700">
                    {isLoadingCeiling ? '...' : formatCurrency(maxAllowableAdvance)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Advance Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="adv_amount" className="block text-xs font-bold text-slate-800">
                Advance Amount (₹) <span className="text-rose-500">*</span>
              </label>
              {selectedStudent && (
                <span className="text-[11px] text-slate-500 font-medium">
                  Max: <strong className="text-emerald-700">{formatCurrency(maxAllowableAdvance)}</strong>
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-sm">
                ₹
              </span>
              <input
                id="adv_amount"
                type="number"
                min="1"
                max={maxAllowableAdvance || undefined}
                step="1"
                required
                disabled={isSubmitting || maxAllowableAdvance <= 0}
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                placeholder="Enter deposit amount"
                className="w-full pl-7 pr-3 py-2 text-sm font-bold border border-slate-300 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100 font-medium"
              />
            </div>
          </div>

          {/* Optional Student Email for Receipt (Decision 1) */}
          <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <label htmlFor="receipt_email" className="block text-xs font-bold text-slate-800 flex items-center space-x-1">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>Student / Parent Email</span>
              </label>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Optional</span>
            </div>
            <input
              id="receipt_email"
              type="email"
              disabled={isSubmitting}
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="e.g. parent@example.com"
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-brand-500"
            />
            {emailInput.trim().length > 0 && selectedStudent && !selectedStudent.email && (
              <label className="flex items-center space-x-2 pt-1 text-[11px] text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveEmailToProfile}
                  onChange={(e) => setSaveEmailToProfile(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                />
                <span>Save this email to student profile for future receipts</span>
              </label>
            )}
            <p className="text-[10px] text-slate-400 flex items-center space-x-1">
              <Info className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Email is optional. Missing email never blocks advance fee recording.</span>
            </p>
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Payment Mode <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['upi', 'cash', 'bank_transfer', 'cheque'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setPaymentMode(mode)}
                  className={`py-1.5 px-1 text-center rounded-lg text-xs font-bold border transition-all ${
                    paymentMode === mode
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {mode === 'bank_transfer' ? 'Bank' : mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Receipt Number & Remarks */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="adv_receipt_no" className="block text-xs font-semibold text-slate-700 mb-1">
                Receipt No. <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="adv_receipt_no"
                type="text"
                disabled={isSubmitting}
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="Auto-generated"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white font-mono"
              />
            </div>
            <div>
              <label htmlFor="adv_remarks" className="block text-xs font-semibold text-slate-700 mb-1">
                Remarks <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="adv_remarks"
                type="text"
                disabled={isSubmitting}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Notes / UPI ref"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedStudent || maxAllowableAdvance <= 0}
              className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording Advance...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Record Advance Deposit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
