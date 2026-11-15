# Master Testing & Acceptance Plan: Monthly Fee Engine & Advance Fee Module

**Document Version:** 1.1.0 (Synchronized with Owner Decisions of 15-Nov-2026)  
**Standard Timezone:** `Asia/Kolkata` (IST, UTC+05:30)  
**Verification Coverage:** 30 End-to-End Financial, Security, Concurrency & Invariant Test Cases

---

## 1. Test Strategy & Architecture

To guarantee financial correctness, zero data loss, and rock-solid reliability, the test suite is structured across four rigorous tiers:

1. **Database-Level Unit & Invariant Tests (PostgreSQL / PL/pgSQL)**:
   - Direct execution of triggers, constraints, RPCs, and pessimistic locking functions against an isolated test schema.
2. **Backend Service & Financial Integration Tests (Vitest & Node.js)**:
   - Verifying business logic, calculations, boundary conditions, idempotent execution, and error contract compliance without network or UI dependencies.
3. **Component & User-Workflow Tests (React Testing Library & Mock Service Worker)**:
   - Testing UI behaviors: exact-amount lockouts, advance ceiling indicators, optional email handling, receipt previews, and permission guards.
4. **End-to-End Concurrency & Integration Tests**:
   - Multi-agent simulations of concurrent cashier collections, simultaneous advance registrations, and month-end automated batch executions.

---

## 2. Master Test Suite: 30 Detailed Real-World Test Cases

| Test ID | Module / Feature | Scenario | Preconditions | Test Steps | Expected Result | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-FEE-01** | Student Monthly Fee | Configurable Individual Fee | Two active students registered | Set Student A `total_fee = 2000.00`, Student B `total_fee = 3500.00` | Both values stored accurately in `students.total_fee` | Reuses existing `total_fee` column per Decision 2 |
| **TC-FEE-02** | Student Monthly Fee | Historical Snapshot Immutability | Student A has Nov 2026 due generated at ₹2,000 | Update Student A's `total_fee` to ₹2,500 on Dec 1st. Generate Dec 2026 due | Nov 2026 due remains ₹2,000. Dec 2026 due is ₹2,500 | Historical `fee_snapshot` is strictly immutable |
| **TC-FEE-03** | Monthly Due Generation | Idempotent Batch Execution | 10 active students for Nov 2026 | Run `generate_monthly_dues('2026-11')` twice sequentially | Run 1 creates 10 dues. Run 2 creates 0 dues, returns existing records | Zero duplicate dues created; unique constraint `(student_id, period_id)` holds |
| **TC-FEE-04** | Monthly Due Generation | Admission Date Filtering | Student C admitted Dec 10, 2026 | Run `generate_monthly_dues('2026-11')` and `generate_monthly_dues('2026-12')` | Nov due is NOT generated. Dec due IS generated | Students are only billed for periods on or after their admission date |
| **TC-FEE-05** | Monthly Due Generation | Inactive / Left Student Filter | Student D marked `status = 'dropped'` on Oct 31, 2026 | Run `generate_monthly_dues('2026-11')` | No due is generated for Student D | Inactive/archived students receive no monthly dues |
| **TC-FEE-06** | Monthly Due Generation | Timezone Boundary Precision | System clock at `2026-11-30 23:59:59 IST` vs `2026-12-01 00:00:01 IST` | Generate dues across boundary | Period boundaries calculate strictly according to `Asia/Kolkata` midnight | No UTC date drift alters period assignment |
| **TC-FEE-07** | Normal Collection | Exact Full Payment Succeeded | Student has Nov due of ₹2,000, 0 advance, 0 paid | Submit `collect_monthly_fee` with `amount = 2000.00` | Payment recorded; `monthly_fee_dues.status = 'PAID'`; `outstanding = 0.00` | Status transitions to `PAID`, immutable payment ledger row created |
| **TC-FEE-08** | Normal Collection | Rejection of Partial Payment | Nov due is ₹2,000 | Submit `collect_monthly_fee` with `amount = 1500.00` | RPC throws Exception: `ERR_FULL_PAYMENT_REQUIRED` | Transaction aborted; zero payment recorded |
| **TC-FEE-09** | Normal Collection | Rejection of Overpayment | Nov due is ₹2,000 | Submit `collect_monthly_fee` with `amount = 2500.00` | RPC throws Exception: `ERR_OVERPAYMENT_PROHIBITED` | Transaction aborted; zero payment recorded |
| **TC-FEE-10** | Normal Collection | Rejection of Duplicate Collection | Nov due is already marked `PAID` | Submit second `collect_monthly_fee` for Nov due | RPC throws Exception: `ERR_DUE_ALREADY_PAID` | Re-collection on fully paid month is strictly blocked |
| **TC-FEE-11** | Normal Collection | Payment Methods Verification | 4 separate students with ₹2,000 due | Collect via `cash`, `upi`, `bank_transfer`, `cheque` | All 4 succeed, recording corresponding method in `fee_payments` | All valid enum values accepted and stored |
| **TC-FEE-12** | Normal Collection | Audit Receipt Generation | Payment collected successfully | Query receipt data from `PrintableMonthlyReceipt` | Displays month `November 2026`, base snapshot, zero balance, unique receipt no | Receipt reflects exact month metadata |
| **TC-FEE-13** | Advance Recording | Single Partial Advance Entry | Monthly fee (`total_fee`) is ₹3,000; Target period `2027-01` | Record advance of ₹1,000 for `2027-01` | Record created with status `Upcoming`; `remaining_ceiling = 2000.00` | Advance accepted; ledger row created |
| **TC-FEE-14** | Advance Recording | Multiple Partial Advances up to Ceiling | Existing advance of ₹1,000 on ₹3,000 fee | Record second advance of ₹2,000 for `2027-01` | Record created; total advance = ₹3,000 (`remaining_ceiling = 0.00`) | Multiple advances summing to ceiling allowed |
| **TC-FEE-15** | Advance Recording | Rejection Exceeding Ceiling | Existing advance of ₹3,000 on ₹3,000 fee | Attempt third advance of ₹1.00 for `2027-01` | RPC throws Exception: `ERR_ADVANCE_CEILING_EXCEEDED` | Rejects advance > monthly fee ceiling |
| **TC-FEE-16** | Advance Recording | Past Month Rejection | Current month is `2026-11` | Attempt recording advance for `2026-10` | RPC throws Exception: `ERR_ADVANCE_PAST_MONTH_PROHIBITED` | Advance only allowed for future periods |
| **TC-FEE-17** | Advance Recording | Current Month Rejection | Current month is `2026-11` | Attempt recording advance for `2026-11` | RPC throws Exception: `ERR_USE_NORMAL_COLLECTION` | Current month must be collected via normal collection |
| **TC-FEE-18** | Advance Allocation | Full Advance Automatic Offset | Advance of ₹2,000 recorded for `2026-12` (Fee = ₹2,000) | Period `2026-12` arrives; generate dues | Dec due generated; advance applied immediately; due status = `PAID`; payable = ₹0 | Student owes ₹0 for Dec; advance status becomes `Applied` |
| **TC-FEE-19** | Advance Allocation | Partial Advance Automatic Offset | Advance of ₹1,200 recorded for `2026-12` (Fee = ₹2,000) | Period `2026-12` arrives; generate dues | Dec due has `advance_applied = 1200.00`, `status = 'PARTIALLY_PAID'`, `payable = 800.00` | Advance status = `Partially Applied`; remaining balance is exactly ₹800 |
| **TC-FEE-20** | Advance Allocation | Normal Collection After Partial Advance | Student has Dec due with ₹1,200 advance applied (₹800 due) | Open normal collection modal; collect fee | Modal locks payable amount to ₹800.00. Payment of ₹800 succeeds, status -> `PAID` | Normal collection only accepts the exact remaining ₹800 |
| **TC-FEE-21** | Independent Status | Unpaid Past Month with Paid Future Month | Nov 2026 due is UNPAID (₹2,000) | Collect full payment for Dec 2026 (₹2,000) | Dec 2026 becomes `PAID`. Nov 2026 remains `UNPAID` | Months are completely independent |
| **TC-FEE-22** | Independent Status | Delayed Past Month Resolution | Nov 2026 is UNPAID, Dec 2026 is PAID | Collect full payment for Nov 2026 (₹2,000) | Nov becomes `PAID`. Dec remains `PAID`. Total arrears = ₹0 | Paying past month clears past month without touching other months |
| **TC-FEE-23** | Email Notifications | Outbox Queueing on Advance | Student with valid email pays ₹1,500 advance | Record advance payment | Advance recorded; `email_outbox` contains queued row with status `'pending'` | Transaction completes; email ready for dispatch |
| **TC-FEE-24** | Email Notifications | Missing Email Safe Handling (Decision 1) | Student with `email = NULL` pays advance | Record advance payment | Advance succeeds; outbox logs status `'not_required'` | Missing email does NOT crash, block, or abort payment |
| **TC-FEE-25** | Email Notifications | Resend Quota Failure Handling (Decision 3) | Resend API returns HTTP 429 / quota limit | Outbox worker attempts dispatch | Outbox status remains `'failed'`, `attempts = 1`; payment is unaffected | Financial transaction is completely decoupled; no paid auto-upgrades |
| **TC-FEE-26** | Concurrency Safety | Simultaneous Dual Collection | Student has Nov due of ₹2,000 | Cashier 1 and Cashier 2 submit payment concurrently | One request acquires row lock and succeeds; second request fails with `ERR_DUE_ALREADY_PAID` | Zero duplicate payment; exactly ₹2,000 recorded in ledger |
| **TC-FEE-27** | Concurrency Safety | Simultaneous Dual Advance Exceeding Ceiling | Fee = ₹2,000, 0 advance exists | User 1 submits ₹1,500; User 2 submits ₹1,000 concurrently for Jan 2027 | Transaction 1 commits ₹1,500. Transaction 2 sees ceiling exceeded (1500+1000>2000) and rolls back | Database constraint / transaction lock prevents over-advance |
| **TC-FEE-28** | Dashboard & Metrics | Current Dues vs Arrears Separation | Nov due = ₹2,000 (UNPAID); Dec due = ₹2,000 (PAID) | View Dashboard in Dec 2026 | Current Dues = ₹2,000 (Dec); Current Collected = ₹2,000; Arrears = ₹2,000 (Nov) | Clear distinction between current period and historical arrears |
| **TC-FEE-29** | Security & Advance Voiding | Admin-Only Advance Cancellation (Decision 6) | Advance exists for `2027-01`. Manager tries voiding; then Super Admin voids | Manager gets `403 Forbidden` / exception. Super Admin void succeeds, creates reversal in `fee_payments`, transitions status to `Voided` | Privileged cancellation strictly enforced; immutable ledger preserved |
| **TC-FEE-30** | Ledger Immutability | Direct Update / Delete Prevention | Direct Supabase client connected as authenticated user | Execute `UPDATE fee_payments SET amount = 0` or `DELETE FROM fee_payments` | Database rejects operation with RLS policy / Trigger error | Financial ledger entries are permanent and append-only |

---

## 3. Automated Test Execution Framework

### Vitest Test Suite Setup
We configure a dedicated Vitest test suite at `client/src/__tests__/fee-module/`:
- `monthly-due-generation.test.ts` (TC-01 through TC-06)
- `normal-fee-collection.test.ts` (TC-07 through TC-12)
- `advance-fee-recording.test.ts` (TC-13 through TC-17)
- `advance-allocation-engine.test.ts` (TC-18 through TC-20)
- `independent-monthly-status.test.ts` (TC-21 through TC-22)
- `email-outbox-worker.test.ts` (TC-23 through TC-25)
- `concurrency-and-race-conditions.test.ts` (TC-26 through TC-27)
- `dashboard-metrics-and-security.test.ts` (TC-28 through TC-30)

### Mock Database Engine Harness
Tests utilize the transactional `MockDatabaseEngine` developed during QA verification to ensure 100% reproducible execution in sandboxed and offline environments, with zero mock leakage.

---

## 4. Acceptance Criteria & Owner Sign-Off Checklist

Before the new fee module is promoted to production:
- [ ] All 30 automated test cases pass with 0 failures and 0 flaky runs.
- [ ] TypeScript compiles cleanly with `tsc --noEmit` (zero errors, zero warnings).
- [ ] Database schema passes PostgreSQL linter (`sqlfluff` or equivalent syntax check).
- [ ] Both Normal Fees collection and Advance Fees recording tested in local browser environment.
- [ ] Printable receipts verified for formatting on 80mm thermal and A4 print media.
- [ ] Email outbox dispatch verified with sandbox email destination.
- [ ] Rollback script verified in dry-run mode against isolated test schema.
