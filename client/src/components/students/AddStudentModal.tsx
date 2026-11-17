// ==============================================================================
// Z Institute Management System - Add Student Modal Component
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle, Loader2, Info, Check } from 'lucide-react';
import { createStudent, type Student } from '../../services/students';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentCreated: (newStudent: Student) => void;
  existingCourses: string[];
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  onStudentCreated,
  existingCourses,
}) => {
  // Today's date in YYYY-MM-DD formatted for input default
  const todayStr = new Date().toISOString().split('T')[0];

  const [admissionId, setAdmissionId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [course, setCourse] = useState('');
  const [totalFee, setTotalFee] = useState<string>('');
  const [joiningDate, setJoiningDate] = useState(todayStr);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setAdmissionId('');
    setName('');
    setPhone('');
    setCourse('');
    setTotalFee('');
    setJoiningDate(todayStr);
    setErrorMessage(null);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  // Listen for Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only accept numeric digits, maximum 10 digits
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanAdmissionId = admissionId.trim();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanCourse = course.trim();
    const parsedFee = parseFloat(totalFee);

    // Client-side validations
    if (!cleanAdmissionId) {
      setErrorMessage('Admission ID / Roll Number is strictly required.');
      return;
    }
    if (!cleanName) {
      setErrorMessage('Student Full Name is required.');
      return;
    }

    // Strict 10-digit Indian mobile validation (starts with 6, 7, 8, or 9)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      if (cleanPhone.length !== 10) {
        setErrorMessage(`Phone number must be exactly 10 digits (currently ${cleanPhone.length}).`);
      } else {
        setErrorMessage(
          `Phone number must start with a valid mobile prefix (6, 7, 8, or 9). Entered number starts with '${cleanPhone[0]}'.`
        );
      }
      return;
    }

    if (!cleanCourse) {
      setErrorMessage('Course name is required.');
      return;
    }
    if (isNaN(parsedFee) || parsedFee < 0) {
      setErrorMessage('Total course fee cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createStudent({
        admission_id: cleanAdmissionId,
        name: cleanName,
        phone: cleanPhone,
        course: cleanCourse,
        total_fee: parsedFee,
        joining_date: joiningDate || todayStr,
        status: 'active',
      });

      resetForm();
      onStudentCreated(created);
      onClose();
    } catch (err: any) {
      console.error('[AddStudentModal] Error:', err);
      setErrorMessage(err.message || 'Failed to enroll student. Please check input details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) handleClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-student-title"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[86vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 text-white flex items-center justify-center shadow-glow-blue shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 id="add-student-title" className="text-base font-bold text-slate-900 leading-tight">
                Admit New Student
              </h3>
              <p className="text-xs text-slate-400">Manual Admission ID enrollment</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Admission ID (Manual Entry) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="admission_id" className="block text-xs font-semibold text-slate-800">
                  Admission ID / Roll No. <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Case-insensitive unique</span>
              </div>
              <input
                id="admission_id"
                type="text"
                required
                disabled={isSubmitting}
                value={admissionId}
                onChange={(e) => setAdmissionId(e.target.value)}
                placeholder="e.g. Z-101 or 2026-001"
                className="w-full px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100"
              />
              <p className="mt-1 text-[11px] text-slate-500 flex items-center space-x-1">
                <Info className="w-3 h-3 shrink-0 text-slate-400" />
                <span>Assigned manually by institute. Never generated randomly.</span>
              </p>
            </div>

            {/* Full Name & Phone in 2 cols */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="student_name" className="block text-xs font-semibold text-slate-800 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="student_name"
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Student full name"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="student_phone" className="block text-xs font-semibold text-slate-800">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">10 digits</span>
                </div>
                <input
                  id="student_phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  disabled={isSubmitting}
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100"
                />
                <div className="mt-1 min-h-[16px] text-[11px]">
                  {phone.length === 0 ? (
                    <span className="text-slate-400">Must start with 6, 7, 8, or 9</span>
                  ) : !['6', '7', '8', '9'].includes(phone[0]) ? (
                    <span className="text-rose-600 font-semibold">Must start with 6, 7, 8, or 9</span>
                  ) : phone.length < 10 ? (
                    <span className="text-amber-600 font-medium">{phone.length}/10 digits entered</span>
                  ) : (
                    <span className="text-emerald-600 font-bold flex items-center space-x-1">
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Valid 10-digit mobile number</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

          {/* Course Name with autocomplete datalist */}
          <div>
            <label htmlFor="student_course" className="block text-xs font-semibold text-slate-800 mb-1">
              Course Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="student_course"
              type="text"
              required
              list="existing-courses-list"
              disabled={isSubmitting}
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="e.g. Python Programming, Web Dev"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100"
            />
            <datalist id="existing-courses-list">
              {existingCourses.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <p className="mt-1 text-[11px] text-slate-400">
              Type any new course name or pick from existing suggestions.
            </p>
          </div>

          {/* Monthly Fee & Joining Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="total_fee" className="block text-xs font-semibold text-slate-800 mb-1">
                Monthly Tuition Fee (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-semibold">
                  ₹
                </span>
                <input
                  id="total_fee"
                  type="number"
                  min="0"
                  step="1"
                  required
                  disabled={isSubmitting}
                  value={totalFee}
                  onChange={(e) => setTotalFee(e.target.value)}
                  placeholder="e.g. 2000"
                  className="w-full pl-7 pr-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100 font-medium"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Individual monthly fee snapshot for student billing.
              </p>
            </div>

            <div>
              <label htmlFor="joining_date" className="block text-xs font-semibold text-slate-800 mb-1">
                Joining Date
              </label>
              <input
                id="joining_date"
                type="date"
                disabled={isSubmitting}
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Sticky Actions Footer */}
          <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-1.5 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-glow-blue transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enrolling Student...</span>
                </>
              ) : (
                <span>Complete Admission</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

