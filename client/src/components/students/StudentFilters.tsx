// ==============================================================================
// Z Institute Management System - Student Search & Filter Toolbar
// ==============================================================================

import React from 'react';
import { Search, Plus, X, ChevronDown } from 'lucide-react';
import type { StudentStatus } from '../../types/database';

interface StudentFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCourse: string;
  onCourseChange: (course: string) => void;
  selectedStatus?: StudentStatus | 'all';
  onStatusChange?: (status: StudentStatus | 'all') => void;
  coursesList: string[];
  onOpenAddModal: () => void;
  totalStudents?: number;
}

export const StudentFilters: React.FC<StudentFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedCourse,
  onCourseChange,
  coursesList,
  onOpenAddModal,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, Admission ID or phone..."
          className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-white hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs"
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

      {/* Right Controls: Course Dropdown + Add Student CTA Button */}
      <div className="flex items-center space-x-2.5">
        {/* Dynamic Course Filter Dropdown */}
        <div className="relative min-w-[150px]">
          <select
            value={selectedCourse}
            onChange={(e) => onCourseChange(e.target.value)}
            className="w-full pl-3.5 pr-8 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer shadow-2xs"
          >
            <option value="">All Courses</option>
            {coursesList.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {/* Add Student Primary Blue Button */}
        <button
          type="button"
          onClick={onOpenAddModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-glow-blue transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Student</span>
        </button>
      </div>
    </div>
  );
};
