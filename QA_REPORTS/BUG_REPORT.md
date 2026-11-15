# Z Institute Management System — Master Bug Report

## 1. Overview & Classification Standard

This document catalogs all defects and architectural findings identified during the Senior QA & Full-Stack Testing Campaign for the Z Institute Management System.

### Severity Definitions
- **P0 (Critical / Blocker):** Data loss, financial ledger corruption, privilege escalation, unauthenticated data exposure.
- **P1 (High):** Core fee collection or attendance workflow broken; runtime crash or major user-facing calculation error in normal flow.
- **P2 (Medium):** Important feature incorrect or degraded (export column mismatch, UI metric scoping error, missing overpayment warning).
- **P3 (Low):** Minor UI styling inconsistency, redundant internal query, or non-blocking cosmetic issue.

---

## 2. Bug Summary Table

| Bug ID | Severity | Module | Title | Root Cause | Status |
|---|---|---|---|---|---|
| **BUG-01** | **P1 (High)** | Attendance Service | `saveBatchAttendance` returns `NaN` in confirmation toast | RPC returns JSONB object `{ success: true, recorded_count: N }`; service ran `Number(data)` | **RESOLVED & VERIFIED** |
| **BUG-02** | **P1 (High)** | Fees Management UI | "Print Receipt" modal displays stale balance & 0 paid after payment | `RecordPaymentModal` passed un-updated initial summary to `onOpenReceipt` | **RESOLVED & VERIFIED** |
| **BUG-03** | **P2 (Medium)** | Data Portability | `exportPaymentsCsv` fails / exports empty receipt & reason fields | Query referenced non-existent columns `receipt_no` & `reversal_reason` instead of `receipt_number` & `void_reason` | **RESOLVED & VERIFIED** |
| **BUG-04** | **P2 (Medium)** | Fees Overview Page | Fees Page metric cards sum only current pagination page (15 items) | Metric calculations used `summaries.reduce` on current page rather than overall institute dataset | **RESOLVED & VERIFIED** |
| **BUG-05** | **P2 (Medium)** | Fees Validation | Overpayment exceeding balance due accepted without warning | No boundary check between payment amount and `balance_due` | **DOCUMENTED / MONITORED** |
| **PERF-01**| **P3 (Low)** | Attendance History | Redundant duplicate query fetching attendance history twice | `StudentAttendanceHistoryModal` called `getStudentAttendanceHistory` and `getStudentAttendanceStats` concurrently | **OPTIMIZED & VERIFIED** |

---

## 3. Detailed Bug Dossiers

---

### BUG-01: `saveBatchAttendance` returns `NaN` in confirmation toast
- **Severity:** P1 (High)
- **Module:** Batch Attendance Service (`client/src/services/attendance.ts`) & Attendance Page (`client/src/pages/AttendancePage.tsx`)
- **Found During:** Phase 4 Attendance Testing (TC-ATT-05)

#### Steps to Reproduce
1. Log in as an administrator and navigate to `/attendance`.
2. Keep active students defaulted to "Present" or toggle absentees.
3. Click "Review & Commit", then click "Confirm & Save".
4. Observe the green confirmation toast banner at the top of the screen.

#### Expected Result
Toast notification displays:
`Successfully saved attendance for 5 students on 2026-11-15!`

#### Actual Result
Toast notification displayed:
`Successfully saved attendance for NaN students on 2026-11-15!`

#### Root Cause Analysis
In `migrations/0003_create_stored_functions.sql`, the PostgreSQL stored function `public.mark_batch_attendance` returns a JSONB object:
```sql
RETURN jsonb_build_object(
    'success', true,
    'date', p_date,
    'recorded_count', v_count
);
```
In `client/src/services/attendance.ts` line 118, the service layer attempted to convert this object directly to a scalar number:
```ts
return Number(data);
```
In JavaScript, `Number({ success: true, ... })` evaluates to `NaN`.

#### Proposed & Applied Fix
Update `client/src/services/attendance.ts` to inspect the response and extract `recorded_count`:
```ts
if (typeof data === 'object' && data !== null && 'recorded_count' in (data as any)) {
  return Number((data as any).recorded_count);
}
return Number(data || 0);
```

#### Verification Evidence
- Automated test `bugs-verification.test.ts` line 13: RPC mock returns `{ recorded_count: 5 }`.
- Verified return value is integer `5` (`Number.isNaN(count) === false`).

---

### BUG-02: "Print Receipt" modal displays stale balance & 0 paid after payment
- **Severity:** P1 (High)
- **Module:** Fees Management (`client/src/components/fees/RecordPaymentModal.tsx`)
- **Found During:** Phase 3 Fees Testing (TC-FEE-17)

#### Steps to Reproduce
1. Select a student with Total Course Fee ₹2,000 and Paid ₹0 (Balance Due: ₹2,000).
2. Click "Collect Fee" to open `RecordPaymentModal`.
3. Enter Installment Amount: ₹500, Payment Mode: Cash.
4. Click "Record Installment".
5. In the success state, click "Print Receipt".
6. Observe the printable receipt layout in `PrintableReceipt.tsx`.

#### Expected Result
The receipt displays:
- Installment Amount Paid: ₹500
- Total Course Fee: ₹2,000
- Total Paid to Date: ₹500
- Remaining Balance: ₹1,500

#### Actual Result
The receipt displayed:
- Installment Amount Paid: ₹500
- Total Course Fee: ₹2,000
- Total Paid to Date: ₹0 (Stale!)
- Remaining Balance: ₹2,000 (Stale!)

#### Root Cause Analysis
In `RecordPaymentModal.tsx`, `handleSubmit` correctly constructed `updatedSummary` and dispatched it to `onPaymentSuccess(payment, updatedSummary)`. However, `updatedSummary` was not retained in modal state. When the user clicked "Print Receipt", `handlePrintAfterRecord` executed:
```ts
const handlePrintAfterRecord = () => {
  if (justRecordedPayment) {
    onOpenReceipt(justRecordedPayment, studentSummary); // <--- Passed initial, un-updated studentSummary!
    handleClose();
  }
};
```

#### Proposed & Applied Fix
1. Add state variable `const [latestSummary, setLatestSummary] = useState<StudentFeeSummary | null>(null);`
2. Update state upon successful payment: `setLatestSummary(updatedSummary);`
3. Pass `latestSummary || studentSummary` to `onOpenReceipt`:
```ts
const handlePrintAfterRecord = () => {
  if (justRecordedPayment) {
    onOpenReceipt(justRecordedPayment, latestSummary || studentSummary);
    handleClose();
  }
};
```
4. Reset `latestSummary` in `resetForm()`.

#### Verification Evidence
- Automated test `bugs-verification.test.ts` line 44: Verified that `latestSummary` retains `total_paid = 500` and `balance_due = 1500`.
- Printable receipt renders accurate real-time figures.

---

### BUG-03: `exportPaymentsCsv` fails / exports empty receipt & reason fields
- **Severity:** P2 (Medium)
- **Module:** Data Portability (`client/src/services/export.ts`)
- **Found During:** Phase 5 Export Testing (TC-EXP-04)

#### Steps to Reproduce
1. Log in as an administrator.
2. Click "Export" $\rightarrow$ "Export Fee Ledger CSV".
3. Trigger download and open the CSV.

#### Expected Result
Payment ledger CSV downloads with columns for Receipt No and Reversal Reason populated.

#### Actual Result
The PostgREST query failed with column not found errors (`column fee_payments.receipt_no does not exist`), or returned undefined values in CSV cells.

#### Root Cause Analysis
In `client/src/services/export.ts` lines 145-162 and 193-195:
```ts
const { data: payments, error } = await supabase
  .from('fee_payments')
  .select(`
    ...,
    receipt_no,
    reversal_reason,
    ...
  `);
...
escapeCsvField(p.receipt_no || ''),
escapeCsvField(p.reversal_reason || ''),
```
In `public.fee_payments` (`migrations/0001_initial_schema.sql`), the authoritative database column names are:
- `receipt_number` (not `receipt_no`)
- `void_reason` (not `reversal_reason`)

#### Proposed & Applied Fix
Update `client/src/services/export.ts` to query `receipt_number` and `void_reason`, and map `p.receipt_number` and `p.void_reason` into the CSV rows:
```ts
escapeCsvField(p.receipt_number || ''),
escapeCsvField(p.is_reversal ? 'YES' : 'NO'),
escapeCsvField(p.void_reason || ''),
```

#### Verification Evidence
- Automated test `bugs-verification.test.ts` line 74: Verified zero column discrepancies between query list and database schema.

---

### BUG-04: Fees Page metric cards sum only current pagination page (15 items)
- **Severity:** P2 (Medium)
- **Module:** Fees Overview (`client/src/pages/FeesPage.tsx`)
- **Found During:** Phase 3 Fees Testing (TC-FEE-19)

#### Steps to Reproduce
1. Populate database with 40 students each having ₹2,000 course fee (Total Institute Revenue: ₹80,000).
2. Open `/fees`.
3. View the three metric cards at the top: "Total Course Fees", "Total Fees Collected", "Outstanding Balance".

#### Expected Result
Top cards display institute-wide totals:
- Total Course Fees: ₹80,000
- Outstanding Balance: ₹80,000

#### Actual Result
Top cards displayed:
- Total Course Fees: ₹30,000 (only the 15 students on Page 1)
- When clicking Page 2, the numbers changed to ₹30,000, and Page 3 changed to ₹20,000!

#### Root Cause Analysis
In `client/src/pages/FeesPage.tsx` lines 128-132:
```ts
const summaries: StudentFeeSummary[] = summariesResult?.data || [];
const totalExpected = summaries.reduce((acc, curr) => acc + (curr.total_fee || 0), 0);
const totalCollected = summaries.reduce((acc, curr) => acc + (curr.total_paid || 0), 0);
const totalDue = summaries.reduce((acc, curr) => acc + (curr.balance_due || 0), 0);
```
`summaries` was scoped strictly to the current paginated slice (up to 15 records).

#### Proposed & Applied Fix
In `FeesPage.tsx`, fetch overall matching dataset in `loadSummaries` using `Promise.all` alongside paginated results, storing institute-wide metrics in `overallMetrics`:
```ts
const [pagedResult, allResult] = await Promise.all([
  getFeeSummaries({ query: searchQuery, status: selectedStatus, page: currentPage, pageSize: 15 }),
  getFeeSummaries({ query: searchQuery, status: selectedStatus, page: 1, pageSize: 5000 }),
]);
setSummariesResult(pagedResult);
const allRecords = allResult.data;
setOverallMetrics({
  totalExpected: allRecords.reduce((acc, curr) => acc + (curr.total_fee || 0), 0),
  totalCollected: allRecords.reduce((acc, curr) => acc + (curr.total_paid || 0), 0),
  totalDue: allRecords.reduce((acc, curr) => acc + (curr.balance_due || 0), 0),
});
```

#### Verification Evidence
- Automated test `bugs-verification.test.ts` line 112: Verified that with 30 students, `overallMetrics` calculates ₹60,000 expected revenue regardless of pagination slice size.

---

### PERF-01: Redundant duplicate query fetching attendance history twice
- **Severity:** P3 (Low / Performance)
- **Module:** Student Attendance History (`client/src/components/attendance/StudentAttendanceHistoryModal.tsx`)
- **Found During:** Code & Performance Review

#### Root Cause Analysis
In `StudentAttendanceHistoryModal.tsx` line 49:
```ts
const [historyData, statsData] = await Promise.all([
  getStudentAttendanceHistory(student.id),
  getStudentAttendanceStats(student.id),
]);
```
`getStudentAttendanceStats` already called `getStudentAttendanceHistory(studentId)` internally. This executed two identical queries over the network.

#### Proposed & Applied Fix
Fetch `historyData` once and compute `statsData` directly in memory from `historyData`:
```ts
const historyData = await getStudentAttendanceHistory(student.id);
const totalSessions = historyData.length;
const presentCount = historyData.filter((r) => r.status === 'present').length;
const absentCount = historyData.filter((r) => r.status === 'absent').length;
const attendancePercentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
setRecords(historyData);
setStats({ totalSessions, presentCount, absentCount, attendancePercentage });
```

#### Verification Evidence
Redundant network call eliminated; statistics card renders identical calculations with 50% fewer queries.
