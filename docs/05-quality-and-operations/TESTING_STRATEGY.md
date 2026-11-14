# Testing Strategy & Quality Assurance Plan

## 1. Quality Assurance Philosophy

The system's testing strategy is built around automated regression prevention, database constraint verification, and mandatory disaster recovery restore drills. Because this is a financial and operational system for an educational institute, data accuracy and constraint enforcement take precedence over superficial code coverage metrics.

---

## 2. Testing Levels & Scope

```
                ▲
               / \
              /   \     End-to-End (E2E) Integration Tests
             / E2E \    - Full User Journey: Login -> Enroll -> Pay -> Reverse -> Attendance
            /-------\
           /         \   Disaster Recovery Restore Drills (Mandatory Deployment Gate)
          /  Restore  \  - Automated Restore into Ephemeral PostgreSQL & Data Sanity Verification
         /-------------\
        /               \ Database Constraint & RPC Tests (psql test suite)
       /    DB Tests     \ - Unique Constraints, Check Constraints, RLS, Views, RPC Functions
      /-------------------\
     /                     \ Component & Service Tests (Vitest + Testing Library)
    /    Unit / Services    \ - Balance Calculations, Formatters, Service Handlers, Badge Renders
   /-------------------------\
```

---

## 3. Database & SQL Verification Suite

Executed against a staging or test PostgreSQL instance prior to code merges:

| Test Case ID | Target Entity | Test Action | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-DB-01** | `students` | Insert student with duplicate `admission_id` (case variation: `cit-101` vs `CIT-101`) | Database throws unique constraint violation error code `23505`. |
| **TC-DB-02** | `students` | Insert student with negative fee (`-1000`) | Database throws check constraint violation error code `23514`. |
| **TC-DB-03** | `fee_payments` | Insert payment installment with amount `0.00` | Database throws check constraint violation error code `23514`. |
| **TC-DB-04** | `fee_payments` | Attempt `UPDATE public.fee_payments SET amount = 100` | Database throws RLS violation or operation denied (immutable ledger). |
| **TC-DB-05** | `fee_payments` | Attempt `DELETE FROM students WHERE id = ...` (student has payments) | Database aborts deletion with foreign key violation code `23503` (`ON DELETE RESTRICT`). |
| **TC-DB-06** | `attendance` | Insert attendance for same student and same date twice | Database throws unique key violation code `23505` (`unique_student_daily_attendance`). |
| **TC-DB-07** | `student_fee_summary` | Insert student with 10,000 fee, payment of 4,000, and reversal of 4,000 | View returns `total_paid = 0.00`, `balance_due = 10000.00`, `fee_status = 'UNPAID'`. |
| **TC-DB-08** | `RLS` | Execute `SELECT * FROM public.students` as `anon` | Zero rows returned. |

---

## 4. Service Layer Integration Testing

Executed using Vitest against the Supabase Client service layer:

* **TC-SVC-01: Unauthorized Request Interception:**
  - Execute `services/students.ts` without active session $\rightarrow$ Supabase returns permission denied.
* **TC-SVC-02: Payment Reversal RPC:**
  - Call `services/fees.ts:reversePayment` as `admin` $\rightarrow$ Throws exception: "Unauthorized: Only super_admin can reverse payments".
  - Call `reversePayment` as `super_admin` with valid reason $\rightarrow$ Returns new reversal record ID and updates balance view.
* **TC-SVC-03: Batch Attendance RPC:**
  - Call `services/attendance.ts:saveBatchAttendance` with 20 student records $\rightarrow$ Returns `{ success: true, recorded_count: 20 }`.
  - Re-call for the same date with updated statuses $\rightarrow$ Updates in place without duplicate records.

---

## 5. Frontend Component & Unit Testing

* **Form Validation:** Verify that Add Student form blocks submission if Admission ID, Name, or Phone is empty.
* **Currency Formatting:** Verify currency formatting handles numbers cleanly (e.g. `5000` formats as `₹5,000.00`).
* **Attendance Toggle:** Verify that clicking "Toggle Absent" flips the student status badge between green (Present) and red (Absent).
* **Print Isolation:** Verify that the `@media print` style sheet isolates the receipt card and hides sidebar/navigation elements.

---

## 6. Mandatory Disaster Recovery Restore Drill (Deployment Gate)

Prior to Phase 7 production go-live, a full restoration drill must be executed and audited:

1. **Trigger Backup:** Run automated GitHub Actions workflow to generate `backup.sql.gpg`.
2. **Download & Decrypt:** Retrieve from Cloudflare R2 and decrypt with master key.
3. **Restore into Test PostgreSQL:** Execute `psql -f restore.sql` against an isolated database container.
4. **Audit Record Counts:**
   ```sql
   SELECT count(*) FROM public.students;
   SELECT count(*) FROM public.fee_payments;
   SELECT count(*) FROM public.attendance;
   ```
5. **Verify Financial Balance:**
   ```sql
   SELECT sum(total_paid), sum(balance_due) FROM public.student_fee_summary;
   ```
6. **Pass Condition:** Restored record counts and calculated balances must match production state with 100% precision.
