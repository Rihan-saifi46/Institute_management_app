// ==============================================================================
// Z Institute Management System - Student Status Badge Component
// ==============================================================================

import React from 'react';
import type { StudentStatus } from '../../types/database';

interface StudentStatusBadgeProps {
  status: StudentStatus;
  className?: string;
}

export const StudentStatusBadge: React.FC<StudentStatusBadgeProps> = ({ status, className = '' }) => {
  const configs: Record<
    StudentStatus,
    { label: string; bg: string; text: string; dot: string; border: string }
  > = {
    active: {
      label: 'Active',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      border: 'border-emerald-200',
    },
    completed: {
      label: 'Completed',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
      border: 'border-blue-200',
    },
    dropped: {
      label: 'Dropped',
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      dot: 'bg-slate-400',
      border: 'border-slate-200',
    },
  };

  const config = configs[status] || configs.active;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${config.dot}`} />
      {config.label}
    </span>
  );
};
