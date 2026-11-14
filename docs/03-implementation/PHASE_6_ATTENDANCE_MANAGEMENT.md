# Phase 6: Module B – Batch Attendance Management

## 1. Objective
Implement the daily attendance management module, enabling administrators to mark class attendance in a 15-second batch workflow with all students defaulted to "Present", review summary metrics before saving, edit previously marked dates without duplicate key errors, and review individual student attendance history with monthly percentages.

---

## 2. Scope
* **Date Selection & Status Bar:**
  - Date picker defaulting to the current calendar date.
  - Quick buttons: "Today", "Yesterday".
  - Status indicator: "Not Recorded Yet" vs. "Recorded on [Timestamp]".
* **Batch Attendance Sheet:**
  - Lists all active students (`status = 'active'`).
  - Automatically defaults all active students to **"Present"**.
  - One-click checkbox / toggle button to mark a student **"Absent"**.
  - Dynamic live counter: *Total Active: 45 | Present: 42 | Absent: 3*.
  - Optional remarks text box per student.
* **Pre-Submission Review Modal:**
  - Confirmation modal displaying overall counts and specifically listing the names of absent students before final commit.
* **Atomic Batch Upsert:**
  - Invokes `public.mark_batch_attendance` RPC, saving all records inside a single PostgreSQL transaction.
  - If records for the selected date already exist, the procedure updates existing rows in place without creating duplicate records.
* **Student Attendance History & Summary:**
  - View individual student attendance logs.
  - Monthly attendance percentage calculation: $\frac{\text{Present Days}}{\text{Total Recorded Days}} \times 100\%$.

---

## 3. Out-of-Scope Items
* Biometric fingerprint or RFID integration.
* Automated absentee SMS alerts.
* Holiday calendar scheduling module.

---

## 4. Prerequisites
* Completion and approval of Phase 4 (Active student records established).
* Functional Supabase attendance services and RPC from Phase 2.

---

## 5. Step-by-Step Tasks

### Task 6.1: Build Date Picker & Attendance Toolbar
Create `client/src/components/attendance/AttendanceDateBar.tsx`:
- Date input with date validation (cannot select future dates).
- Displays status badge indicating whether attendance exists for this date.

### Task 6.2: Build Batch Attendance Table
Create `client/src/components/attendance/BatchAttendanceSheet.tsx`:
- Table columns: Admission ID, Student Name, Course, Attendance Status Toggle (Present/Absent), Remarks.
- "Mark All Present" and "Mark All Absent" master toggle buttons.
- Real-time counter of Present vs. Absent counts.

### Task 6.3: Build Attendance Review Modal
Create `client/src/components/attendance/AttendanceReviewModal.tsx`:
- Triggered when clicking "Save Attendance".
- Displays summary: Total Students, Present Count, Absent Count.
- Lists absent student names for final verification.
- "Confirm & Save" button dispatching the batch RPC call.

### Task 6.4: Build Student Attendance History Modal
Create `client/src/components/attendance/StudentAttendanceHistory.tsx`:
- Accessible from the Student Profile view.
- Displays monthly statistics card (e.g. November 2026: 22/24 days — 91.6%).
- Chronological table of past attendance records with status and remarks.

### Task 6.5: Assemble Attendance Page
Assemble `client/src/pages/AttendancePage.tsx` integrating date selection, batch sheet, review modal, and state synchronization.

---

## 6. Expected Files & Deliverables
* `client/src/pages/AttendancePage.tsx`
* `client/src/components/attendance/AttendanceDateBar.tsx`
* `client/src/components/attendance/BatchAttendanceSheet.tsx`
* `client/src/components/attendance/AttendanceReviewModal.tsx`
* `client/src/components/attendance/StudentAttendanceHistory.tsx`
* `client/src/types/attendance.ts`

---

## 7. Database Changes
* None (uses `public.attendance` and RPC `public.mark_batch_attendance` from Phase 1).

---

## 8. Security Requirements
* Attendance submissions must be authenticated and authorized.
* Multi-row batch submissions must execute within an atomic transaction inside the RPC.
* Date values sanitized to ISO `YYYY-MM-DD` format.

---

## 9. Testing Strategy
* **Batch Upsert Test:**
  - Mark 10 students for date `2026-11-14` $\rightarrow$ Records saved successfully.
  - Re-open date `2026-11-14`, toggle 1 student from Present to Absent, and save $\rightarrow$ Record updates in-place; table count remains exactly 10 with zero duplicate rows.
* **Duplicate Prevention Test:**
  - Attempt to insert duplicate attendance manually via SQL $\rightarrow$ Blocked by `unique_student_daily_attendance`.
* **Percentage Calculation Test:**
  - Student with 18 Present and 2 Absent days in a month $\rightarrow$ UI correctly reports $90.0\%$ attendance.

---

## 10. Acceptance Criteria
* [ ] Active students pre-populate defaulted to "Present".
* [ ] Absentees can be unchecked with one click.
* [ ] Pre-submission modal displays accurate counts and lists absentees.
* [ ] Duplicate attendance for the same student on the same date is impossible.
* [ ] Existing attendance can be reviewed and edited seamlessly.
* [ ] Monthly attendance percentage calculates accurately.

---

## 11. Rollback Plan
* If attendance batch logic causes data anomalies, revert component updates via Git.

---

## 12. Dependencies on Previous Phases
* **Depends on:** Phase 4 (Student directory) and Phase 2 (Attendance services & RPC).
