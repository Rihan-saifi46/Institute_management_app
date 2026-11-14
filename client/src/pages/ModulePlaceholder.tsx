// ==============================================================================
// Z Institute Management System - Module Placeholder View
// ==============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, LucideIcon } from 'lucide-react';

interface ModulePlaceholderProps {
  title: string;
  description: string;
  targetPhase: string;
  icon: LucideIcon;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  title,
  description,
  targetPhase,
  icon: Icon,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-2xs">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
        <Icon className="w-8 h-8" />
      </div>

      <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-3">
        <Clock className="w-3.5 h-3.5 text-slate-500" />
        <span>Scheduled Deliverable: {targetPhase}</span>
      </div>

      <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
        {description}
      </p>

      <div className="mt-8 pt-6 border-t border-slate-100">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard Overview</span>
        </Link>
      </div>
    </div>
  );
};
