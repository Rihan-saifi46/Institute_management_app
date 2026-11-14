// ==============================================================================
// Z Institute Management System - Student Search & Filter Toolbar
// ==============================================================================

import React from 'react';
import { Search, UserPlus, X, Filter } from 'lucide-react';
import type { StudentStatus } from '../../types/database';

interface StudentFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCourse: string;
  onCourseChange: (course: string) => void;
  selectedStatus: StudentStatus | 'all';
  onStatusChange: (status: StudentStatus | 'all') => void;
  coursesList: string[];
  onOpenAddModal: () => void;
  totalStudents: number;
}

export const StudentFilters: React.FC<StudentFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedCourse,
  onCourseChange,
  selectedStatus,
  onStatusChange,
  coursesList,
  onOpenAddModal,
  totalStudents,
}) => {
  const statusOptions: { value: StudentStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'dropped', label: 'Dropped' },
  ];

  const hasActiveFilters = searchQuery !== '' || selectedCourse !== '' || selectedStatus !== 'all';

  const handleClearFilters = () => {
    onSearchChange('');
    onCourseChange('');
    onStatusChange('all');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Top row: Search input, Course Filter, and Register CTA button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, Admission ID, or phone..."
            className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              aria-label="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right side controls: Course selector + Add button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dynamic Course Filter */}
          <div className="relative min-w-[160px]">
            <select
              value={selectedCourse}
              onChange={(e) => onCourseChange(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 appearance-none cursor-pointer"
            >
              <option value="">All Courses</option>
              {coursesList.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
              <Filter className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Register Student Button */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-lg shadow-xs hover:shadow-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Admit Student</span>
          </button>
        </div>
      </div>

      {/* Bottom row: Status filter tabs & active count */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
        <div className="flex items-center space-x-1">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onStatusChange(opt.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedStatus === opt.value
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="ml-2 text-xs text-brand-600 hover:text-brand-800 font-medium underline underline-offset-2"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-800">{totalStudents}</span> student{totalStudents === 1 ? '' : 's'}
        </div>
      </div>
    </div>
  );
};
