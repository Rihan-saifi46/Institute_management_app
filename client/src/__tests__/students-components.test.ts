// ==============================================================================
// Z Institute Management System - Phase 4 Student Management Component Tests
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { StudentStatusBadge } from '../components/students/StudentStatusBadge';
import { StudentFilters } from '../components/students/StudentFilters';
import { StudentTable } from '../components/students/StudentTable';
import { AddStudentModal } from '../components/students/AddStudentModal';
import { EditStudentModal } from '../components/students/EditStudentModal';
import { DeleteStudentModal } from '../components/students/DeleteStudentModal';
import { StudentsPage } from '../pages/StudentsPage';

describe('Phase 4 Student Management Components', () => {
  it('Component constructors are valid functions', () => {
    expect(typeof StudentStatusBadge).toBe('function');
    expect(typeof StudentFilters).toBe('function');
    expect(typeof StudentTable).toBe('function');
    expect(typeof AddStudentModal).toBe('function');
    expect(typeof EditStudentModal).toBe('function');
    expect(typeof DeleteStudentModal).toBe('function');
    expect(typeof StudentsPage).toBe('function');
  });
});
