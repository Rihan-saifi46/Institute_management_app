// ==============================================================================
// Z Institute Management System - Edit Student Modal Component
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { X, Edit3, AlertCircle, Loader2 } from 'lucide-react';
import { updateStudent, type Student } from '../../services/students';
import type { StudentStatus } from '../../types/database';

interface EditStudentModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
  onStudentUpdated: (updatedStudent: Student) => void;
  existingCourses: string[];
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  student,
  onClose,
  onStudentUpdated,
  existingCourses,
}) => {
  const [admissionId, setAdmissionId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [course, setCourse] = useState('');
  const [totalFee, setTotalFee] = useState<string>('');
  const [status, setStatus] = useState<StudentStatus>('active');
  const [joiningDate, setJoiningDate] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      setAdmissionId(student.admission_id);
      setName(student.name);
      setPhone(student.phone);
      setCourse(student.course);
      setTotalFee(student.total_fee.toString());
      setStatus(student.status);
      setJoiningDate(student.joining_date);
      setErrorMessage(null);
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanAdmissionId = admissionId.trim();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanCourse = course.trim();
    const parsedFee = parseFloat(totalFee);

    if (!cleanAdmissionId) {
      setErrorMessage('Admission ID cannot be empty.');
      return;
    }
    if (!cleanName) {
      setErrorMessage('Student Full Name is required.');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage('Please provide a valid 10-digit phone number.');
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
      const updated = await updateStudent(student.id, {
        admission_id: cleanAdmissionId,
        name: cleanName,
        phone: cleanPhone,
        course: cleanCourse,
        total_fee: parsedFee,
        status,
        joining_date: joiningDate,
      });

      onStudentUpdated(updated);
      onClose();
    } catch (err: any) {
      console.error('[EditStudentModal] Error:', err);
      setErrorMessage(err.message || 'Failed to update student profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-student-title"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 id="edit-student-title" className="text-base font-bold text-slate-900 leading-tight">
                Edit Student Profile
              </h3>
              <p className="text-xs text-slate-500 font-mono">Admission ID: {student.admission_id}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Admission ID & Lifecycle Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit_admission_id" className="block text-xs font-semibold text-slate-800 mb-1">
                Admission ID <span className="text-rose-500">*</span>
              </label>
              <input
                id="edit_admission_id"
                type="text"
                required
                disabled={isSubmitting}
                value={admissionId}
                onChange={(e) => setAdmissionId(e.target.value)}
                className="w-full px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label htmlFor="edit_status" className="block text-xs font-semibold text-slate-800 mb-1">
                Lifecycle Status
              </label>
              <select
                id="edit_status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StudentStatus)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100"
              >
                <option value="active">Active</option>
                <option value="completed">Completed (Graduated)</option>
                <option value="dropped">Dropped (Withdrawn)</option>
              </select>
            </div>
          </div>

          {/* Full Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit_name" className="block text-xs font-semibold text-slate-800 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="edit_name"
                type="text"
                required
                disabled={isSubmitting}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label htmlFor="edit_phone" className="block text-xs font-semibold text-slate-800 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                id="edit_phone"
                type="tel"
                required
                disabled={isSubmitting}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Course Name with suggestions */}
          <div>
            <label htmlFor="edit_course" className="block text-xs font-semibold text-slate-800 mb-1">
              Course Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit_course"
              type="text"
              required
              list="edit-courses-list"
              disabled={isSubmitting}
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100"
            />
            <datalist id="edit-courses-list">
              {existingCourses.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          {/* Monthly Tuition Fee & Joining Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit_total_fee" className="block text-xs font-semibold text-slate-800 mb-1">
                Monthly Tuition Fee (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-semibold">
                  ₹
                </span>
                <input
                  id="edit_total_fee"
                  type="number"
                  min="0"
                  step="1"
                  required
                  disabled={isSubmitting}
                  value={totalFee}
                  onChange={(e) => setTotalFee(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100 font-medium"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Effective for future billing months. Historical dues snapshots remain unchanged.
              </p>
            </div>

            <div>
              <label htmlFor="edit_joining_date" className="block text-xs font-semibold text-slate-800 mb-1">
                Joining Date
              </label>
              <input
                id="edit_joining_date"
                type="date"
                disabled={isSubmitting}
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-1.5 px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs hover:shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

