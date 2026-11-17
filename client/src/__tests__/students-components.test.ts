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

  it('Validates 10-digit Indian phone number prefix (6, 7, 8, or 9)', () => {
    const phoneRegex = /^[6-9]\d{9}$/;

    // Valid numbers
    expect(phoneRegex.test('9876543210')).toBe(true);
    expect(phoneRegex.test('8123456789')).toBe(true);
    expect(phoneRegex.test('7000000000')).toBe(true);
    expect(phoneRegex.test('6999999999')).toBe(true);

    // Invalid: wrong starting digit
    expect(phoneRegex.test('1234567890')).toBe(false);
    expect(phoneRegex.test('2345678901')).toBe(false);
    expect(phoneRegex.test('3456782541')).toBe(false); // User's screenshot student phone
    expect(phoneRegex.test('4567890123')).toBe(false);
    expect(phoneRegex.test('5678901234')).toBe(false);

    // Invalid: length != 10
    expect(phoneRegex.test('987654321')).toBe(false);
    expect(phoneRegex.test('98765432100')).toBe(false);

    // Invalid: non-digit characters
    expect(phoneRegex.test('98765abcde')).toBe(false);
    expect(phoneRegex.test('+9198765432')).toBe(false);
  });
});

