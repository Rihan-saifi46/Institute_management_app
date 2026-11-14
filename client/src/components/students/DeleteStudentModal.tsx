// ==============================================================================
// Z Institute Management System - Delete Student Confirmation Modal
// ==============================================================================

import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, Loader2, Info } from 'lucide-react';
import { deleteStudent, type Student } from '../../services/students';

interface DeleteStudentModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
  onStudentDeleted: (studentId: string) => void;
}

export const DeleteStudentModal: React.FC<DeleteStudentModalProps> = ({
  isOpen,
  student,
  onClose,
  onStudentDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !student) return null;

  const handleDelete = async () => {
    setErrorMessage(null);
    setIsDeleting(true);

    try {
      await deleteStudent(student.id);
      onStudentDeleted(student.id);
      onClose();
    } catch (err: any) {
      console.error('[DeleteStudentModal] Error:', err);
      setErrorMessage(
        err.message ||
        'Failed to delete student. Note: Students with recorded payments or attendance history cannot be deleted.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-student-title"
    >
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 id="delete-student-title" className="text-base font-bold text-slate-900 leading-tight">
                Delete Student Record
              </h3>
              <p className="text-xs text-rose-700 font-medium">Data Safety Check</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {errorMessage ? (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-800">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
              <p className="text-[11px] text-slate-600 pl-6">
                <strong>Tip:</strong> If the student has already graduated or discontinued classes, you can edit their status to <em>Completed</em> or <em>Dropped</em> to keep your audit ledger intact.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">
                Are you sure you want to permanently delete student{' '}
                <strong className="text-slate-900">{student.name}</strong> (
                <span className="font-mono text-brand-700 font-medium">{student.admission_id}</span>)?
              </p>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-2 text-xs text-amber-800">
                <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  The system will verify if any fee payments or attendance records exist. Deletion will be rejected if financial history is found.
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs hover:shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Confirm Permanent Delete</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
