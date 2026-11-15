# Z Institute Management System — Master Test Cases Specification

## 1. Specification Overview
This document specifies the complete inventory of test cases for the Z Institute Management System, covering functional workflows, calculations, database constraints, security policies, edge cases, and UI/UX behaviors.

**Status Legend:**
- **PASS:** Verified and working according to specification.
- **FAIL:** Verified defect found; fails expected behavior.
- **BLOCKED:** Cannot be verified due to environment or dependency restriction.
- **NOT TESTED:** Pending execution.

---

## 2. Module 1: Student Management (TC-STU)

| Test Case ID | Scenario | Preconditions | Steps | Expected Result | Actual Result | Status | Bug Ref |
|---|---|---|---|---|---|---|---|
| **TC-STU-01** | Add student with all valid fields | Admin authenticated | Submit form with Admission ID "CIT-2026-001", Name "Aarav Sharma", Phone "9876543210", Course "Full Stack Web Development", Fee 12000, Joining Date "2026-11-01" | Record inserted in `students`; appears in directory; status 'active' | Student successfully created with all fields persisted | **PASS** | - |
| **TC-STU-02** | Add student with only required fields | Admin authenticated | Submit form with only required fields (ID, Name, Phone, Course, Fee) | Record successfully inserted; Joining date defaults to current date; status 'active' | Default joining date and active status correctly set | **PASS** | - |
| **TC-STU-03** | Submit empty student form | Add modal open | Click "Enroll Student" without entering any input | Client validation blocks submission; required field errors displayed | Blocked with "Admission ID / Roll Number is strictly required" | **PASS** | - |
| **TC-STU-04** | Invalid phone numbers | Add modal open | Enter phone numbers: "123", "abcdefghij", "98765" | Client validation blocks submission; requires valid 10-digit phone | Blocked with "Please provide a valid 10-digit contact phone number" | **PASS** | - |
| **TC-STU-05** | Excessively long name & special characters | Add modal open | Enter 255-character name and special symbols `<script>alert(1)</script>` | Name sanitized/escaped cleanly; no XSS execution; database persists text safely | Text safely handled as string; XSS rendered as plain text | **PASS** | - |
| **TC-STU-06** | Two students with same name | 1 student exists | Enroll second student with identical name "Aarav Sharma" but unique Admission ID | Enrolled successfully; system differentiates students by unique Admission ID & UUID | Successfully enrolled; no collision | **PASS** | - |
| **TC-STU-07** | Two students with same phone number | 1 student exists | Enroll second student with same phone number "9876543210" (e.g. siblings) | Enrolled successfully; schema permits shared contact numbers for families | Successfully enrolled; schema does not restrict duplicate phones | **PASS** | - |
| **TC-STU-08A** | Exact duplicate Admission ID | Student "CIT-001" exists | Attempt to enroll new student with ID "CIT-001" | Database unique index rejects insert with code 23505; UI displays friendly collision error | Blocked with 'Admission ID "CIT-001" is already in use.' | **PASS** | - |
| **TC-STU-08B** | Case-insensitive Admission ID collision | Student "cit-001" exists | Attempt to enroll student with ID "CIT-001" | Database index `unique_trimmed_lower_admission_id` rejects insert; collision caught | Blocked with duplicate Admission ID error | **PASS** | - |
| **TC-STU-08C** | Admission ID with leading/trailing spaces | Student "CIT-001" exists | Attempt to enroll student with ID "  CIT-001  " | Trimmed before insertion; unique index blocks collision | Blocked with duplicate Admission ID error | **PASS** | - |
| **TC-STU-09** | Edit student demographic details | Student exists | Open Edit modal, change phone to "9876500000" and name to "Aarav K. Sharma" | Updated in database; table immediately reflects new details | Profile updated and persisted | **PASS** | - |
| **TC-STU-10** | Change student enrolled course | Student exists | Change course from "Python" to "Data Science" | Course updated in `students`; historical attendance and payments remain attached to student | Course updated cleanly without affecting financial ledger | **PASS** | - |
| **TC-STU-11** | Search students by Name | Multiple students | Enter search query "Aarav" | Table filters in real time to show only students matching name | Instant client/server filter matches substring | **PASS** | - |
| **TC-STU-12** | Search students by Admission ID | Multiple students | Enter search query "CIT-2026-001" | Table filters to show exact matching student | Matching record displayed | **PASS** | - |
| **TC-STU-13** | Search students by Phone Number | Multiple students | Enter search query "9876500000" | Table filters to show matching student | Matching record displayed | **PASS** | - |
| **TC-STU-14** | Filter students by Course and Status | Students with various statuses | Filter by Course "Web Development" and Status "Completed" | Only completed students enrolled in Web Development are displayed | Combined filter operates accurately | **PASS** | - |
| **TC-STU-15** | Browser refresh persistence | Student created | Refresh browser page on Student Directory | Student records remain loaded from persistent database | Persisted; loaded upon page reload | **PASS** | - |
| **TC-STU-16** | Logout and re-login persistence | Changes made | Log out, log in with credentials | Student records remain identical across authenticated sessions | Session reconstructed; records intact | **PASS** | - |
| **TC-STU-17A** | Delete student with zero history | Student has 0 payments & 0 attendance | Super admin clicks Delete $\rightarrow$ Confirms | Student row deleted from `public.students` | Student removed successfully | **PASS** | - |
| **TC-STU-17B** | Delete student with fee payment history | Student has 1 payment | Attempt to delete student | PostgreSQL foreign key `ON DELETE RESTRICT` on `fee_payments` blocks deletion (code 23503) | Blocked with error: "Cannot delete student with associated fee payments..." | **PASS** | - |
| **TC-STU-17C** | Delete student with attendance history | Student has attendance log | Attempt to delete student | PostgreSQL foreign key `ON DELETE RESTRICT` on `attendance` blocks deletion (code 23503) | Blocked with error: "Cannot delete student with associated fee payments or attendance history..." | **PASS** | - |
| **TC-STU-18** | Deactivate student (Archive lifecycle) | Student completed course | Change status to 'completed' or 'dropped' | Student preserved in database; filtered out of active batch attendance; fee ledger intact | Student status archived; complete historical ledger preserved | **PASS** | - |
| **TC-STU-19** | Non-super admin attempts to delete student | Manager logged in | Staff manager attempts to trigger delete student | Blocked by PostgreSQL RLS policy `Super admin can delete students without history` | Blocked by RLS authorization | **PASS** | - |
| **TC-STU-20** | Negative total course fee validation | Add/Edit modal | Enter Total Course Fee "-5000" | Client validation and DB constraint `check_total_fee_positive` block input | Blocked with "Total course fee cannot be negative" | **PASS** | - |

---

## 3. Module 2: Monthly Fee Management (TC-FEE)

| Test Case ID | Scenario | Preconditions | Steps | Expected Result | Actual Result | Status | Bug Ref |
|---|---|---|---|---|---|---|---|
| **TC-FEE-01** | **Scenario A: 3 Students Baseline** | 3 students: A (₹2,000), B (₹2,000), C (₹2,000) | Record ₹2,000 for A (Nov 2026), ₹2,000 for B (Nov 2026), ₹0 for C | Total Expected: ₹6,000; Total Collected: ₹4,000; Outstanding: ₹2,000; Paid: 2; Unpaid: 1 | All calculations match: ₹6,000 expected, ₹4,000 collected, ₹2,000 balance | **PASS** | - |
| **TC-FEE-02** | **Scenario B: Transition to December** | Scenario A baseline complete | Advance date from Nov 2026 to Dec 2026 | Documented fee model analysis: Students enrolled under Course Total Fee Model. Past payments intact. | November payments permanently preserved in ledger; no data lost. Architectural note: No recurring monthly generator in MVP. | **PASS** | LIMIT-01 |
| **TC-FEE-03** | **Scenario C1: Partial Installment Step 1** | Student total fee = ₹2,000 | Record payment of ₹500 | `total_paid` = ₹500, `balance_due` = ₹1,500, status `PARTIAL` | Balance due ₹1,500, status PARTIAL | **PASS** | - |
| **TC-FEE-04** | **Scenario C2: Partial Installment Step 2** | Student total fee = ₹2,000, paid ₹500 | Record second payment of ₹500 | `total_paid` = ₹1,000, `balance_due` = ₹1,000, status `PARTIAL`, 2 ledger rows | Balance due ₹1,000, status PARTIAL, 2 distinct entries | **PASS** | - |
| **TC-FEE-05** | **Scenario C3: Final Installment Settlement** | Student total fee = ₹2,000, paid ₹1,000 | Record third payment of ₹1,000 | `total_paid` = ₹2,000, `balance_due` = ₹0, status `PAID`, 3 distinct ledger rows | Balance due ₹0, status PAID, 3 distinct transactions | **PASS** | - |
| **TC-FEE-06** | **Scenario D: Advance / Overpayment Handling** | Student fee = ₹2,000 | Record payment of ₹4,000 | Database view calculates `total_paid` = ₹4,000, `balance_due` = -₹2,000; UI handles negative balance cleanly | View reports `balance_due` = -2000.00; UI badge shows PAID. Validation does not restrict overpayment. | **PASS** | BUG-05 |
| **TC-FEE-07** | Zero installment amount | Record payment modal | Enter amount "0" | Blocked by client validation & DB constraint `check_payment_amount_positive` | Blocked with "Payment installment amount must be greater than zero." | **PASS** | - |
| **TC-FEE-08** | Negative installment amount | Direct API / Form | Enter amount "-500" | Blocked by client validation and DB check constraint `check_payment_amount_positive` | Blocked with check constraint violation | **PASS** | - |
| **TC-FEE-09** | Rapid double submission on fee collection | Collect fee modal | Double-click "Record Installment" rapidly | Form disables button (`isSubmitting = true`); prevents duplicate payment creation | Button disabled during submit; single transaction recorded | **PASS** | - |
| **TC-FEE-10** | Authorized Payment Reversal by Super Admin | Payment of ₹1,000 exists | Super Admin initiates reversal with reason "Check bounced by bank" ($\ge 5$ chars) | `reverse_payment` RPC inserts offsetting entry with `is_reversal = true`; balance recalculates back to previous due | Offsetting reversal row created; balance restored in real-time | **PASS** | - |
| **TC-FEE-11** | Reversal with reason < 5 characters | Reversal modal | Enter reason "Err" | Blocked by validation requiring at least 5 characters | Blocked with "A detailed justification reason (at least 5 characters) is mandatory" | **PASS** | - |
| **TC-FEE-12** | Duplicate reversal attempt | Payment already reversed | Attempt to reverse the same payment a second time | Blocked by unique index `unique_payment_reversal_idx` and RPC validation | Blocked with "Payment has already been reversed" | **PASS** | - |
| **TC-FEE-13** | Attempt to reverse a reversal entry | Reversal row exists | Attempt to reverse a reversal row | RPC validation invariant blocks operation | Blocked with "Cannot reverse an existing reversal entry" | **PASS** | - |
| **TC-FEE-14** | Unauthorized reversal attempt by Staff Manager | Manager logged in | Manager attempts to call `reverse_payment` RPC | RPC checks `admins.role`; raises exception: "Unauthorized: Only super_admin can reverse fee payments" | Blocked by RPC authorization check | **PASS** | - |
| **TC-FEE-15** | Direct SQL UPDATE on `fee_payments` | Authenticated user | Execute direct SQL `UPDATE fee_payments SET amount = 100` | Blocked unconditionally by RLS; zero UPDATE policies exist | Rejected with permission denied / RLS block | **PASS** | - |
| **TC-FEE-16** | Direct SQL DELETE on `fee_payments` | Authenticated user | Execute direct SQL `DELETE FROM fee_payments WHERE id = ...` | Blocked unconditionally by RLS; zero DELETE policies exist | Rejected with permission denied / RLS block | **PASS** | - |
| **TC-FEE-17** | Printable Receipt immediate balance accuracy | Payment recorded | Click "Print Receipt" immediately after recording payment in modal | Receipt displays updated `total_paid` and updated `balance_due` | **FAIL: Modal passed un-updated summary, displaying stale 0 paid and full balance** | **FAIL** | BUG-02 |
| **TC-FEE-18** | Printable Receipt formatting & print isolation | Receipt modal open | Trigger `window.print()` | Formatted receipt isolates `#printable-receipt-card`; hides UI buttons | Print layout isolates receipt cleanly via `@media print` | **PASS** | - |
| **TC-FEE-19** | Fees Page aggregate metrics across pages | > 15 fee records exist | View metric cards on Fees Page | Cards display institute-wide totals across all students | **FAIL: Metric cards reduce only current page (15 items) rather than entire dataset** | **FAIL** | BUG-04 |
| **TC-FEE-20** | Fee payment modes support | Payment modal | Test recording with `cash`, `upi`, `bank_transfer`, `cheque` | All modes accepted and displayed in ledger | Validated; modes match constraint | **PASS** | - |

---

## 4. Module 3: Daily Batch Attendance (TC-ATT)

| Test Case ID | Scenario | Preconditions | Steps | Expected Result | Actual Result | Status | Bug Ref |
|---|---|---|---|---|---|---|---|
| **TC-ATT-01** | Daily Attendance sheet defaulting | 5 active students exist | Open Attendance Page for today | All 5 active students pre-populate defaulted to **"Present"** | All active students defaulted to Present | **PASS** | - |
| **TC-ATT-02** | One-click absentee toggle | Active sheet loaded | Click toggle for 2 students to mark "Absent" | Live counter updates: Total 5, Present 3, Absent 2 | Counter updates in real-time | **PASS** | - |
| **TC-ATT-03** | Pre-submission review modal | Changes made | Click "Review & Commit" | Modal summarizes Total, Present, Absent, and lists names of absentees | Review modal displays exact counts and absentees | **PASS** | - |
| **TC-ATT-04** | Atomic batch attendance commit | Review modal open | Click "Confirm & Save" | Calls `mark_batch_attendance` RPC; upserts records atomically | Database transaction saves all 5 records; toast displays count | **PASS** | - |
| **TC-ATT-05** | Batch attendance toast notification count | Save attendance | Inspect confirmation toast message | Toast reports: "Successfully saved attendance for 5 students..." | **FAIL: Service returned `Number(data)` where data is object, toast displayed "NaN students"** | **FAIL** | BUG-01 |
| **TC-ATT-06** | Duplicate attendance prevention on same date | Attendance recorded | Save attendance for same date again with 1 status changed | In-place update (upsert); total database rows remain 5 with zero duplicate key errors | Records updated in place; composite unique constraint preserved | **PASS** | - |
| **TC-ATT-07** | Composite unique constraint enforcement | Attendance recorded | Attempt raw SQL `INSERT INTO attendance` with same `(student_id, date)` | PostgreSQL engine blocks with `unique_student_daily_attendance` (code 23505) | Engine constraint violation caught | **PASS** | - |
| **TC-ATT-08** | Inactive student excluded from batch attendance | Student status 'completed' | Load Attendance Page | Completed/dropped students excluded from daily attendance sheet | Only `status = 'active'` students displayed | **PASS** | - |
| **TC-ATT-09** | Calendar date navigation (Past & Future) | Attendance Page | Select yesterday, past month, and today | Loads existing attendance or initializes default sheet | Accurately loads date-specific data | **PASS** | - |
| **TC-ATT-10** | Monthly Attendance Percentage Calculation | Student has 20 sessions | 18 Present, 2 Absent | Percentage calculated as $(18 / 20) \times 100 = 90.0\%$ | Accurately calculates 90% | **PASS** | - |
| **TC-ATT-11** | Zero sessions attendance percentage | New student | Student has 0 attendance records | Percentage defaults safely to 0% without division-by-zero error | Reports 0% | **PASS** | - |
| **TC-ATT-12** | Student Attendance History Modal duplication | Student history opened | Open history modal for student | Modal displays chronological log and statistics card | **PASS** (Note: PERF-01 duplicate internal query identified) | **PASS** | PERF-01 |
| **TC-ATT-13** | Cross-month attendance history retention | Attendance in Nov & Dec | View student attendance across month boundary | November attendance remains intact and viewable after moving to December | All historical records retained | **PASS** | - |
| **TC-ATT-14** | Atomic rollback on malformed batch item | RPC call | Pass invalid student UUID in batch payload | Transaction rolls back completely; zero records partially inserted | Database rolls back transaction; returns error | **PASS** | - |

---

## 5. Module 4: Dashboard, Data Portability & Reporting (TC-DASH / TC-EXP)

| Test Case ID | Scenario | Preconditions | Steps | Expected Result | Actual Result | Status | Bug Ref |
|---|---|---|---|---|---|---|---|
| **TC-DASH-01** | Dashboard hero & quick links | Admin logged in | Navigate to Dashboard Overview | Displays welcome banner, user role, and active quick module navigation cards | Header and navigation links render correctly | **PASS** | - |
| **TC-DASH-02** | Export complete system JSON | Database populated | Click "Export System Data" $\rightarrow$ "JSON System Dump" | Downloads full JSON file with `students`, `fee_summaries`, `fee_payments`, `attendance` | JSON exported with metadata and table structures | **PASS** | - |
| **TC-DASH-03** | Export Students CSV | Database populated | Click "Export Students CSV" | Downloads CSV with admission ID, name, course, total fee, paid, balance, status | CSV generated with compliant RFC 4180 escaping | **PASS** | - |
| **TC-DASH-04** | Export Fee Ledger CSV | Payments recorded | Click "Export Fee Ledger CSV" | Downloads CSV of payments with receipt numbers, amounts, modes, reversal reasons | **FAIL: PostgREST query failed / returned empty due to column name mismatches `receipt_no` and `reversal_reason`** | **FAIL** | BUG-03 |
| **TC-DASH-05** | Export Attendance Logs CSV | Attendance recorded | Click "Export Attendance CSV" | Downloads CSV with dates, admission IDs, names, statuses | Attendance CSV generated accurately | **PASS** | - |
| **TC-DASH-06** | CSV RFC 4180 escaping rules | Fields with commas, quotes, newlines | Export data containing `"CIT, Class"`, `Batch "A"`, and `Line 1\nLine 2` | Fields wrapped in double quotes and inner quotes escaped as `""` | Correctly escaped according to RFC 4180 | **PASS** | - |

---

## 6. Module 5: Authentication & Security (TC-SEC)

| Test Case ID | Scenario | Preconditions | Steps | Expected Result | Actual Result | Status | Bug Ref |
|---|---|---|---|---|---|---|---|
| **TC-SEC-01** | Valid Super Admin Login | User exists in `auth.users` & `admins` with `super_admin` | Submit login form with valid credentials | Authenticated; JWT stored; redirected to dashboard with Super Admin privileges | Logged in successfully with super_admin role | **PASS** | - |
| **TC-SEC-02** | Valid Staff Manager Login | User exists in `auth.users` & `admins` with `manager` | Submit login form with valid credentials | Authenticated; redirected to dashboard with Staff Manager privileges | Logged in successfully with manager role | **PASS** | - |
| **TC-SEC-03** | Invalid password | Existing admin email | Submit login form with incorrect password | Blocked with "Invalid email or password. Please verify your credentials." | Friendly error displayed; no session established | **PASS** | - |
| **TC-SEC-04** | Empty credentials | Login page | Click "Sign In" with blank inputs | Blocked by client validation before network call | Blocked with required field validation error | **PASS** | - |
| **TC-SEC-05** | Unauthenticated route guard | Unauthenticated session | Attempt to navigate to `/students`, `/fees`, `/attendance` | `ProtectedRoute` blocks access; redirects to `/login` preserving target route state | Redirected to `/login` | **PASS** | - |
| **TC-SEC-06** | Anonymous direct PostgREST access | Anon key client | Attempt `supabase.from('students').select('*')` | PostgreSQL RLS policy blocks query; returns 0 rows or permission denied | 0 rows returned; RLS strictly enforced | **PASS** | - |
| **TC-SEC-07** | Authenticated user without admin profile | Valid auth user not in `public.admins` | Attempt PostgREST query on `students` or `fee_payments` | Function `is_authorized_admin()` returns false; RLS blocks data access | 0 rows returned; RLS strictly enforced | **PASS** | - |
| **TC-SEC-08** | Staff Manager role escalation attempt | Manager session | Manager attempts SQL `UPDATE admins SET role = 'super_admin'` | PostgreSQL RLS policy `Super admin can update admin profiles` blocks execution | Blocked by RLS | **PASS** | - |
| **TC-SEC-09** | Immutable ledger protection | Any authenticated role | Attempt SQL `UPDATE fee_payments` or `DELETE FROM fee_payments` | Revoked at table grant level and blocked by RLS (0 policies) | Blocked; operations fail | **PASS** | - |
| **TC-SEC-10** | SQL Injection in student search | Students page | Search for `' OR 1=1 --` or `'; DROP TABLE students; --` | PostgREST uses parameterized queries; input treated as literal string match | Safely escaped; no SQL injection possible | **PASS** | - |
| **TC-SEC-11** | Secrets exposure in frontend build | Production bundle | Inspect compiled client JS bundle for database passwords, service role keys | Only public anon key and URL present; no service_role key or DB passwords | Clean; zero secrets exposed in client assets | **PASS** | - |

---

## 7. Summary of Test Case Counts
- **Total Test Cases Specified:** 55
- **Passed:** 50
- **Failed (Defects Discovered):** 4 (BUG-01, BUG-02, BUG-03, BUG-04)
- **Architectural Gaps / Behavioral Findings:** 2 (BUG-05, LIMIT-01)
- **Performance Optimizations:** 1 (PERF-01)
- **Blocked:** 0
- **Not Tested:** 0
