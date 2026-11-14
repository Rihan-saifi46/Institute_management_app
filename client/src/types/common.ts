// ==============================================================================
// Z Institute Management System - Common Type Definitions
// ==============================================================================

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
