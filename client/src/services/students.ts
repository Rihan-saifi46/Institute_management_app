// ==============================================================================
// Z Institute Management System - Student Management Service Layer
// ==============================================================================

import { supabase } from '../lib/supabase';
import type { Database, StudentStatus } from '../types/database';
import type { PaginatedResult } from '../types/common';

export type Student = Database['public']['Tables']['students']['Row'];
export type StudentInsert = Database['public']['Tables']['students']['Insert'];
export type StudentUpdate = Database['public']['Tables']['students']['Update'];

export interface StudentFilterOptions {
  query?: string;
  course?: string;
  status?: StudentStatus | 'all';
  page?: number;
  pageSize?: number;
}

/**
 * Fetch students with search filtering (name, admission ID, phone),
 * optional course filter, status filter, and pagination.
 */
export async function getStudents(
  options: StudentFilterOptions = {}
): Promise<PaginatedResult<Student>> {
  const {
    query,
    course,
    status = 'active',
    page = 1,
    pageSize = 20,
  } = options;

  let queryBuilder = supabase
    .from('students')
    .select('*', { count: 'exact' });

  // Status filtering
  if (status && status !== 'all') {
    queryBuilder = queryBuilder.eq('status', status);
  }

  // Exact or partial course filter
  if (course && course.trim().length > 0) {
    queryBuilder = queryBuilder.ilike('course', `%${course.trim()}%`);
  }

  // Multi-field instant text search
  if (query && query.trim().length > 0) {
    const cleanQuery = query.trim();
    // Searches across name, admission_id, and phone number
    queryBuilder = queryBuilder.or(
      `name.ilike.%${cleanQuery}%,admission_id.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%`
    );
  }

  // Pagination calculation
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  queryBuilder = queryBuilder
    .order('created_at', { ascending: false })
    .range(from, to);

  const { data, count, error } = await queryBuilder;

  if (error) {
    throw new Error(`Failed to fetch students: ${error.message}`);
  }

  const totalCount = count || 0;
  return {
    data: data || [],
    count: totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

/**
 * Fetch a single student by internal UUID.
 */
export async function getStudentById(id: string): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Student not found: ${error.message}`);
  }

  return data;
}

/**
 * Register a new student record.
 * Admission ID is manually entered and strictly validated for uniqueness.
 */
export async function createStudent(
  payload: Omit<StudentInsert, 'id' | 'created_at' | 'updated_at'>
): Promise<Student> {
  // Client-side sanitization
  const cleanPayload = {
    ...payload,
    admission_id: payload.admission_id.trim(),
    name: payload.name.trim(),
    phone: payload.phone.trim(),
    course: payload.course.trim(),
    total_fee: Number(payload.total_fee),
  };

  if (!cleanPayload.admission_id) {
    throw new Error('Admission ID is required');
  }
  if (!cleanPayload.name) {
    throw new Error('Student name is required');
  }
  if (!cleanPayload.phone) {
    throw new Error('Contact phone number is required');
  }
  if (cleanPayload.total_fee < 0) {
    throw new Error('Total course fee cannot be negative');
  }

  const { data, error } = await supabase
    .from('students')
    .insert(cleanPayload)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Admission ID "${cleanPayload.admission_id}" is already in use.`);
    }
    throw new Error(`Failed to create student: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing student's details.
 */
export async function updateStudent(
  id: string,
  payload: StudentUpdate
): Promise<Student> {
  const updatePayload: StudentUpdate = { ...payload };

  if (typeof updatePayload.admission_id === 'string') {
    updatePayload.admission_id = updatePayload.admission_id.trim();
  }
  if (typeof updatePayload.name === 'string') {
    updatePayload.name = updatePayload.name.trim();
  }
  if (typeof updatePayload.phone === 'string') {
    updatePayload.phone = updatePayload.phone.trim();
  }
  if (typeof updatePayload.course === 'string') {
    updatePayload.course = updatePayload.course.trim();
  }
  if (typeof updatePayload.total_fee === 'number' && updatePayload.total_fee < 0) {
    throw new Error('Total course fee cannot be negative');
  }

  const { data, error } = await supabase
    .from('students')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Admission ID is already in use by another student.`);
    }
    throw new Error(`Failed to update student: ${error.message}`);
  }

  return data;
}

/**
 * Delete a student record.
 * Database foreign keys enforce ON DELETE RESTRICT: will fail if payment or attendance history exists.
 */
export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id);

  if (error) {
    if (error.code === '23503') {
      throw new Error('Cannot delete student with associated fee payments or attendance history. Archive status to "completed" or "dropped" instead.');
    }
    throw new Error(`Failed to delete student: ${error.message}`);
  }
}

/**
 * Retrieve unique existing course names to populate search suggestions.
 */
export async function getDistinctCourses(): Promise<string[]> {
  const { data, error } = await supabase
    .from('students')
    .select('course');

  if (error) {
    console.warn('[StudentService] Could not fetch courses:', error.message);
    return [];
  }

  const courses = Array.from(
    new Set((data || []).map((row) => row.course).filter(Boolean))
  ).sort();

  return courses;
}
