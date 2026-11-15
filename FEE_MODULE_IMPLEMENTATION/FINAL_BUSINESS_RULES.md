# Final Business Rules & Financial Policy Specification

**Document Version:** 1.1.0 (Synchronized with Owner Decisions of 15-Nov-2026)  
**Standard Timezone:** `Asia/Kolkata` (IST, UTC+05:30)  
**Effective Date:** 2026-11-15  
**Governing Architecture:** Independent Monthly Billing with Advance Allocation & Decoupled Email Outbox

---

## 1. Core Principles

1. **Independent Monthly Status (Overriding Invariant):** Every calendar month represents an independent financial due with its own independent status (`UNPAID`, `PARTIALLY_PAID`, `PAID`). Payment for a subsequent month (e.g. December) marks December `PAID` even if a prior month (e.g. November) remains `UNPAID`.
2. **Immutable Financial Ledger:** All monetary exchanges are recorded as append-only records in `public.fee_payments`. No transaction row may be updated or deleted.
3. **Strict Allocation Transparency:** Payments and advances must be explicitly allocated to specific monthly dues. No ambiguous or floating credits are allowed.
4. **Commencement Boundary:** System billing commences from **November 2026**. Historical data before November 2026 is preserved intact in the payment ledger without creating synthetic retroactive dues.

---

## 2. Rule Category A: Individual Monthly Fee Structure

- **Rule A1 (Reuse Existing Student Fee Field):** Each student's individual monthly fee is read directly from their existing record in `public.students.total_fee` (the value entered by the owner during student creation/enrollment). 
  - **No Artificial Baseline:** The system will **never** assign an arbitrary default (e.g. ₹2,000) or override this value.
  - **No Course Division:** The system will **never** derive monthly fees by dividing course total fees by duration.
  - Students in the same course can have different monthly fee amounts (e.g., Student A = ₹1,800/mo, Student B = ₹2,500/mo) based on their individual enrollment value.
- **Rule A2 (Historical Snapshot Immutability):** When a monthly fee due is generated for month $M$, it locks a permanent snapshot of `students.total_fee` into `monthly_fee_dues.fee_snapshot`. If a student's fee is later adjusted in their profile (e.g. from ₹2,000 to ₹2,500 effective January 2027), all previously generated dues (November 2026, December 2026) **must remain strictly unchanged at ₹2,000**.
- **Rule A3 (Effective Date for Rate Changes):** Any change to `students.total_fee` follows an effective-date rule for future months only. Past and already-generated dues are never recalculated.

---

## 3. Rule Category B: Independent Monthly Fee Status & Lifecycle

### 3.1 The Independence Matrix
Consider a student with an individual monthly fee of ₹2,000:

| Billing Month | Due Date | Payment Received | Target Month Due Status | Arrears Impact |
|:---:|:---:|:---:|:---:|:---:|
| **November 2026** | 10-Nov-2026 | None (₹0) | **UNPAID** (Balance: ₹2,000) | Carried as ₹2,000 Previous Arrears |
| **December 2026** | 10-Dec-2026 | ₹2,000 received for Dec | **PAID** (Balance: ₹0) | Cleared for December |
| **January 2027** | 10-Jan-2027 | None (₹0) | **UNPAID** (Balance: ₹2,000) | Current Month Due |

### 3.2 Mandatory Invariants
- **Rule B1 (No Global Fee Status):** The application must **never** maintain a single global fee status for a student. A student is not globally "Paid" or "Unpaid"; they are Paid or Unpaid for **specific calendar months**.
- **Rule B2 (No Auto-Cascading of Payments):** A payment recorded specifically for December 2026 **must only mark December 2026 as PAID**. It must **never** be silently reassigned to November 2026, and must **never** mark November as paid.
- **Rule B3 (Permanent Arrears Preservation):** An unpaid November due remains `UNPAID` until a payment specifically designated for November is recorded, or an advance explicitly assigned to November is applied.
- **Rule B4 (No Monthly Status Reset):** When the calendar transitions from November to December (at 00:00:00 IST on December 1st), November's payment status **must not reset**. Paid months remain `PAID`; unpaid months remain `UNPAID`.
- **Rule B5 (Prohibited Behaviors):**
  - Prohibited: Resetting student fee statuses on the 1st of each month.
  - Prohibited: Marking December unpaid simply because November was unpaid.
  - Prohibited: Combining all months into one undifferentiated lump-sum balance.

---

## 4. Rule Category C: Automatic Monthly Fee Due Generation

- **Rule C1 (Hybrid Generation Architecture):**
  - **Primary:** Automated PostgreSQL `pg_cron` execution at `00:01 Asia/Kolkata` on the 1st day of every month (`cron.schedule('1 18 * * *', ...)`).
  - **Fallback:** Idempotent on-demand execution triggered when an authorized user opens the Fees Section.
  - Both call the exact same database procedure `generate_monthly_dues(p_period_key)`.
- **Rule C2 (Database Engine Uniqueness):** Enforced by PostgreSQL unique constraint:
  `UNIQUE (student_id, fee_period_id)`. Re-running generation multiple times produces zero duplicate dues.
- **Rule C3 (Eligibility & Admission Boundaries):**
  - Dues are generated **only** for students with `status = 'active'`.
  - Dues are **not** generated for months prior to the student's `joining_date`. If a student enrolls on December 15, 2026, they are not billed for November 2026.
  - Inactive students (`completed`, `dropped`) receive no new monthly dues.
- **Rule C4 (Commencement Date - November 2026):**
  - Dues generation begins with **November 2026** (`2026-11`). No dues will be generated for October 2026 or prior periods.
  - Zero retroactive backfill. Legacy transactions remain accessible in payment history.
- **Rule C5 (Default Status on Generation):** When a new month's due is generated, its default status is `UNPAID` ($balance = \text{fee\_snapshot}$) unless an approved advance payment was previously recorded for that specific month.

---

## 5. Rule Category D: Normal Fees Section — Full Payment Only

- **Rule D1 (Explicit Target Month Selection):** The administrator selects a student and an explicit billing month (e.g. "Rahul Sharma — November 2026").
- **Rule D2 (Full Outstanding Payment Only):** The normal Fees Section accepts **only the exact remaining outstanding balance** for that selected month.
  $$\text{Payable Amount} = \text{Fee Snapshot} - \text{Advance Allocated} - \text{Previously Paid}$$
- **Rule D3 (Strict Prohibition of Partial Payments):** Partial payments (e.g. paying ₹1,000 on a ₹2,000 balance) are **strictly rejected** by frontend validation and database RPC assertions.
- **Rule D4 (Strict Prohibition of Overpayments):** Paying an amount greater than the remaining balance for that month is **strictly rejected**.
- **Rule D5 (Already-Paid Protection):** A month with $\text{Remaining Balance} = 0$ rejects any further payment collection.
- **Rule D6 (Concurrency & Double-Collection Protection):** Database transactions use row-level locking (`SELECT ... FOR UPDATE`) inside the collection RPC to ensure concurrent requests cannot double-collect on the same monthly due.
- **Rule D7 (Receipt Generation):** Receipts generated from normal fee collections explicitly state the student name, admission ID, **billing month paid (e.g. 'November 2026')**, payment date, amount, mode, and transaction reference.

---

## 6. Rule Category E: Advance Fee Records & Automatic Adjustment

- **Rule E1 (Dedicated Section):** A distinct navigation section titled **"Advance Fees"** manages advance receipts.
- **Rule E2 (Mandatory Future Period Linkage):** Every advance entry must be linked to a specific active student and an **explicitly selected future fee period** (strictly $> \text{current\_month}$).
- **Rule E3 (Over-Allocation Ceiling):** The total advance allocated to a target month can **never exceed the student's applicable monthly fee** (`students.total_fee`) for that month.
- **Rule E4 (Multiple Advance Installments Permitted):** Multiple advance installments may be received for the same future month (e.g. ₹1,000 advance on Nov 10, and ₹1,000 advance on Nov 20 for December 2026), provided their sum does not exceed the monthly fee ceiling.
- **Rule E5 (Advance Status Lifecycle):**
  $$\text{Upcoming} \longrightarrow \begin{cases} \text{Applied} & \text{if full due covered upon period start} \\ \text{Partially Applied} & \text{if partial due covered upon period start} \\ \text{Voided} & \text{if authorized admin reversal executed} \end{cases}$$
- **Rule E6 (Automatic Adjustment Trigger):** When the target month starts (or upon generation of that month's due), `apply_advance_adjustments` links the advance record to the newly generated due:
  - If advance = ₹2,000 (100% of fee): Due becomes `PAID`; advance status becomes `Applied`.
  - If advance = ₹1,200 (partial): Due records ₹1,200 allocated, remaining balance is ₹800 (`PARTIALLY_PAID`); advance status becomes `Partially Applied`. The remaining ₹800 is collectible in one full payment via the normal Fees section.
- **Rule E7 (Audit & History Retention):** Applied advance records are never deleted. They transition to the "Applied Advance History" view.
- **Rule E8 (Admin-Only Audited Advance Cancellation):**
  - Privileged to `super_admin` only (managers and receptionists strictly forbidden).
  - Original advance receipt and ledger rows are **never deleted**.
  - Creates an auditable reversal entry in `fee_payments` (`is_void = true` or negative balancing entry).
  - Reverses any applied allocations transactionally, restores due balances, and marks advance status `VOIDED`.
  - Records cancellation actor, timestamp, and audit reason.

---

## 7. Rule Category F: Email Notifications

- **Rule F1 (Student Email is Optional):**
  - Student email is **not mandatory** for student creation or advance fee recording.
  - If a registered email exists in `students.email`, use it for confirmation.
  - If no email exists, the cashier may optionally enter an email during advance recording.
  - If no email is provided, the transaction records normally, prints a physical receipt, and sets outbox status to `NOT_REQUIRED`.
  - Missing email **never** blocks advance recording.
  - An entered email must **never** silently overwrite an existing profile email without explicit user consent.
- **Rule F2 (Provider: Resend Free Tier):**
  - Resend Free Plan: 3,000 emails/month, 100 emails/day, 1 verified domain.
  - API credentials stored **server-side only** (`.env.local` / Supabase secrets). Never exposed to client bundle.
  - Live sending to arbitrary student inboxes requires verified custom sender domain.
  - If quota is reached, outbox records remain in `FAILED` / `RETRYABLE` state; no automated paid overages.
- **Rule F3 (Zero Financial Coupling):** Email dispatch failure must **never** roll back or invalidate a committed financial transaction.
- **Rule F4 (Outbox Architecture):** Transactional `public.email_outbox` table decouples email delivery from payment persistence.

---

## 8. Rule Category G: Dashboard & Reporting Differentiation

The dashboard and fee reports must categorize figures into five distinct financial metrics:
1. **Current Month Dues:** Total fee amount due for the current active calendar month.
2. **Previous Month Arrears:** Total unpaid balances from past calendar months ($due\_date < \text{current\_date}$).
3. **Total Outstanding:** $\text{Current Month Dues} + \text{Previous Month Arrears}$.
4. **Month Collections:** Net payments collected in the selected calendar month.
5. **Unpaid Students Count:** Count of students with outstanding dues for the current active month.
