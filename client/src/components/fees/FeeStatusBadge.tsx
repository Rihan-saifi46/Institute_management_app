// ==============================================================================
// Z Institute Management System - Fee Status Badge Component
// ==============================================================================

import React from 'react';
import type { FeeStatus } from '../../types/database';

interface FeeStatusBadgeProps {
  status: FeeStatus;
  className?: string;
}

export const FeeStatusBadge: React.FC<FeeStatusBadgeProps> = ({ status, className = '' }) => {
  const configs: Record<
    FeeStatus,
    { label: string; bg: string; text: string; dot: string; border: string }
  > = {
    PAID: {
      label: 'Fully Paid',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      border: 'border-emerald-200',
    },
    PARTIAL: {
      label: 'Partial Due',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
      border: 'border-amber-200',
    },
    UNPAID: {
      label: 'Unpaid / Due',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      dot: 'bg-rose-500',
      border: 'border-rose-200',
    },
  };

  const config = configs[status] || configs.UNPAID;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${config.dot}`} />
      {config.label}
    </span>
  );
};
