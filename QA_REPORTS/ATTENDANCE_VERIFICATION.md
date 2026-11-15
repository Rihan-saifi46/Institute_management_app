# Z Institute Management System — Attendance Verification Report

## 1. Executive Summary & Design Overview

The batch attendance module enables institute administrators to mark daily class attendance in under 15 seconds. Key architectural properties include:
1. **Pre-Populated Active Sheet:** Only students with `status = 'active'` appear on the sheet. All active students are defaulted to **"Present"** on load.
2. **One-Click Absentee Toggling:** Marking a student absent requires a single click on their status pill, updating live Present vs. Absent counters.
3. **Atomic Multi-Row Upsert:** All records for the selected date are committed inside a single PostgreSQL transaction via the trusted `public.mark_batch_attendance` RPC procedure.
4. **Hard Duplicate Prevention:** A database composite unique constraint `CONSTRAINT unique_student_daily_attendance UNIQUE (student_id, date)` blocks duplicate entries at the database engine level.

---

## 2. Verification of Scenario A — Daily Attendance (5 Students)

Five isolated test students were loaded onto the daily batch attendance sheet for `2026-11-15`:

| Student | Admission ID | Course | Selected Status | Remarks | Database Status |
|---|---|---|:---:|---|:---:|
| **Student A** | CIT-ATT-01 | Full Stack | **Present** | - | `present` |
| **Student B** | CIT-ATT-02 | Full Stack | **Present** | - | `present` |
| **Student C** | CIT-ATT-03 | Full Stack | **Absent** | Family function | `absent` |
| **Student D** | CIT-ATT-04 | Full Stack | **Present** | - | `present` |
| **Student E** | CIT-ATT-05 | Full Stack | **Absent** | Health issue | `absent` |

### Architectural Analysis: Status Values (`present` vs. `absent`)
- **Documented Schema Constraint:** In `migrations/0001_initial_schema.sql`, `public.attendance.status` is constrained to:
  ```sql
  CONSTRAINT attendance_status_check CHECK (status IN ('present', 'absent'))
  ```
- **Leaves & Lates Handling:** The MVP intentionally omits separate `leave` and `late` enums to maintain maximum operational speed and simplicity. If a student is on approved leave or late, the administrator marks them `present` or `absent` and records the specific context in the `remarks` text field.
- **Pre-Submission Review Modal:** Before committing, the review modal displays:
  - Total Enrolled: 5
  - Total Present: 3
  - Total Absent: 2
  - Absent Student Names: Student C, Student E
- **BUG-01 Fix Verification:** Previously, saving attendance displayed a toast with "NaN students" due to `Number(data)` on a JSONB object. Following our fix, the confirmation toast accurately reads:
  `Successfully saved attendance for 5 students on 2026-11-15!`

---

## 3. Verification of Scenario B — Duplicate Prevention & Atomic Upsert

### 3.1 Composite Uniqueness Enforcement
- Attempting to manually execute a raw SQL `INSERT` for an existing `(student_id, date)` pair throws PostgreSQL error `23505` (`unique_student_daily_attendance`).

### 3.2 In-Place Upsert Behavior
1. Marked date `2026-11-15` with 5 students (3 Present, 2 Absent). Total attendance rows in database = 5.
2. Re-opened date `2026-11-15` in the UI. The application accurately fetched existing records and loaded the exact statuses previously saved.
3. Toggled Student C from **Absent** to **Present** and re-saved.
4. **Result:** The stored function `mark_batch_attendance` executed:
   ```sql
   INSERT INTO public.attendance (student_id, date, status, remarks, created_at)
   VALUES (v_student_id, p_date, v_status, v_remarks, (now() AT TIME ZONE 'Asia/Kolkata'))
   ON CONFLICT (student_id, date)
   DO UPDATE SET
       status = EXCLUDED.status,
       remarks = EXCLUDED.remarks,
       created_at = (now() AT TIME ZONE 'Asia/Kolkata');
   ```
5. **Database State:** Student C's row was updated in place. Total attendance records in the database remained exactly 5 (zero duplicate rows created).

### 3.3 Atomic Rollback on Failure
- Tested passing a malformed UUID in the batch payload.
- Because the entire batch executes within a single PL/pgSQL block, the exception aborted the transaction immediately.
- Zero partial records were saved, preserving complete database consistency.

---

## 4. Verification of Scenario C — Attendance Calendar & Historical Records

- **Month-to-Month Transitions:** Attendance records for October 2026 and November 2026 remain permanently attached to their respective dates. Moving the calendar to December 2026 does not clear or alter past records.
- **Month-End & Year-End Boundaries:** Tested recording attendance on `2026-11-30`, `2026-12-31`, and `2027-01-01`. Dates are formatted as ISO `YYYY-MM-DD` and stored using the `Asia/Kolkata` operational timezone standard.
- **Leap Year Verification:** Validated attendance creation for `2024-02-29` (valid leap date accepted without exception).
- **Date Picker Future Block:** The date picker sets `max={todayStr}` to prevent accidental attendance logging for future dates.

---

## 5. Verification of Scenario D — Attendance Calculations

### 5.1 Monthly Rate Formula
The application calculates individual student attendance rates using the formula:
$$\text{Attendance Rate (\%)} = \frac{\text{Present Sessions}}{\text{Total Recorded Sessions}} \times 100\%$$

### 5.2 Test Scenarios & Results:
| Total Sessions | Present | Absent | Calculated Rate | Displayed Metric | Status |
|:---:|:---:|:---:|:---:|:---:|:---:|
| 20 | 18 | 2 | $\frac{18}{20} \times 100 = 90.0\%$ | **90%** | **PASS** |
| 18 | 15 | 3 | $\frac{15}{18} \times 100 = 83.33\%$ | **83%** (Rounded) | **PASS** |
| 24 | 22 | 2 | $\frac{22}{24} \times 100 = 91.66\%$ | **92%** (Rounded) | **PASS** |
| 0 | 0 | 0 | Division by zero check | **0%** (Safe default) | **PASS** |

Unmarked calendar days and official institute holidays are not entered into `public.attendance` and therefore are never incorrectly counted as absences.

---

## 6. Verification of Scenario E — Student Changes & Lifecycle Impact

- **Student Status Changed to 'Completed' or 'Dropped':**
  - Student is immediately excluded from daily attendance sheets.
  - Historical attendance records remain 100% intact in `public.attendance`.
  - When opening the student's historical attendance log from their profile, all past sessions and percentage metrics load accurately.
- **Protection Against Accidental Deletion:**
  - Attempting to delete a student who has attendance history is blocked at the database engine level by `CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT`.

---

## 7. Performance & Optimization Verification (PERF-01)

- **Issue:** In `StudentAttendanceHistoryModal.tsx`, `getStudentAttendanceHistory` and `getStudentAttendanceStats` were previously called concurrently, executing duplicate queries.
- **Optimization Applied:** History records are fetched once, and statistics (total, present, absent, rate) are calculated directly in memory.
- **Result:** 50% reduction in network queries when viewing attendance profiles.
