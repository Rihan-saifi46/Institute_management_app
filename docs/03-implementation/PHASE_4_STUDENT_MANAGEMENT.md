# Phase 4: Module A1 – Student Management

## 1. Objective
Implement the student management interface, allowing the institute owner and manager to register students with mandatory manual Admission IDs, view the student directory with real-time search and filtering, update existing student profiles, and manage student lifecycle statuses (`active`, `completed`, `dropped`).

---

## 2. Scope
* **Student Directory Table:**
  - Displays Admission ID, Full Name, Phone, Course, Joining Date, Total Course Fee, and Status Badge.
  - Real-time search by Name, Phone Number, and Admission ID.
  - Dropdown filter by Course name and Status (`active`, `completed`, `dropped`).
* **Add Student Modal:**
  - Form fields:
    - **Admission ID:** Required text input (e.g. `CIT-101`), trimmed, case-normalized client validation.
    - **Full Name:** Required text input.
    - **Phone Number:** Required text input (phone validation).
    - **Course Name:** Plain text input (no forced dropdown).
    - **Joining Date:** Date input (defaults to today).
    - **Total Course Fee:** Required numeric input ($\ge 0$).
    - **Notes:** Optional text area.
  - Server validation feedback on duplicate Admission ID collision.
* **Edit Student Modal:**
  - Pre-populates existing data.
  - Allows editing contact details, course, total fee, and lifecycle status.
* **Student Profile View:**
  - Summary card displaying student profile details, status, and quick links to fee payment and attendance history.

---

## 3. Out-of-Scope Items
* Processing or recording fee installment payments (handled in Phase 5).
* Attendance logging (handled in Phase 6).
* Student photo uploads.

---

## 4. Prerequisites
* Completion and approval of Phase 3 (Frontend Foundation & Shell).
* Functional Supabase student services from Phase 2.

---

## 5. Step-by-Step Tasks

### Task 4.1: Build Student Table Component
Create `client/src/components/students/StudentTable.tsx`:
- Clean tabular view with columns: Admission ID, Name, Phone, Course, Joined, Fee, Status, Actions.
- Skeleton loader state during data fetching.
- Action buttons: "Edit", "View Profile", "Record Fee".

### Task 4.2: Build Search & Filter Toolbar
Create `client/src/components/students/StudentFilters.tsx`:
- Text search input with instant debounce (300ms) querying name, phone, or Admission ID.
- Dynamic course filter dropdown.
- Status filter pills (`All`, `Active`, `Completed`, `Dropped`).

### Task 4.3: Build Add Student Form & Modal
Create `client/src/components/students/AddStudentModal.tsx`:
- Implements strict input validation:
  - Admission ID must not be empty or whitespace.
  - Total Fee amount must be $\ge 0$.
- Calls `createStudent` service and displays clear feedback on unique index collision.

### Task 4.4: Build Edit Student Form
Create `client/src/components/students/EditStudentModal.tsx`:
- Pre-populates existing data.
- Allows updating lifecycle status (`active`, `completed`, `dropped`).
- Calls `updateStudent` service.

### Task 4.5: Assemble Student Directory Page
Assemble `client/src/pages/StudentsPage.tsx` integrating Table, Filters, and Modals.

---

## 6. Expected Files & Deliverables
* `client/src/pages/StudentsPage.tsx`
* `client/src/components/students/StudentTable.tsx`
* `client/src/components/students/StudentFilters.tsx`
* `client/src/components/students/AddStudentModal.tsx`
* `client/src/components/students/EditStudentModal.tsx`
* `client/src/components/students/StudentStatusBadge.tsx`
* `client/src/types/student.ts`

---

## 7. Database Changes
* None (uses `public.students` table created in Phase 1).

---

## 8. Security Requirements
* Enforce authentication session on all Supabase calls.
* Validate that `total_fee` cannot be negative.
* Prevent XSS by sanitizing student name and course text inputs.

---

## 9. Testing Strategy
* **Manual ID Uniqueness Test:** Register a student with Admission ID `CIT-001`. Attempt to register a second student with `cit-001` $\rightarrow$ System must reject with "Admission ID already in use".
* **Search Filter Test:** Search for a 4-digit phone snippet $\rightarrow$ Table instantly filters matching rows.
* **Negative Fee Test:** Enter `-500` in Total Fee $\rightarrow$ Form validation blocks submission before database call.

---

## 10. Acceptance Criteria
* [ ] Students can be registered with a custom Admission ID.
* [ ] Duplicate Admission IDs (including case-variation duplicates) are rejected.
* [ ] Table correctly lists all admitted students with responsive columns.
* [ ] Instant search by name, phone, and Admission ID operates smoothly.
* [ ] Student details and status can be edited and persisted.

---

## 11. Rollback Plan
* If UI regressions occur, roll back component changes via Git.

---

## 12. Dependencies on Previous Phases
* **Depends on:** Phase 2 (Supabase client & services) and Phase 3 (Frontend Foundation).
