# Owner Decisions & Architectural Directives: Fee Module Phase 0

> **Status: FULLY DECIDED & LOCKED BY OWNER (15-Nov-2026)**  
> This document records the owner's binding decisions for the Monthly Fee Engine and Advance Fee Module. All 12 planning documents have been synchronized with these directives.

---

## Final Decisions Summary Table

| # | Domain | Owner Decision | Approved Architecture & Implementation Rule |
| :--- | :--- | :--- | :--- |
| **1** | **Student Email** | **OPTIONAL** | Email is strictly optional. Advance receipts send if email is available; cashier can optionally enter email during advance recording; missing email logs `NOT_REQUIRED` without blocking payment. Does not silently overwrite profile email. |
| **2** | **Individual Monthly Fee** | **REUSE EXISTING FIELD (`students.total_fee`)** | **Overrides baseline proposal.** The owner already enters the student's individual monthly fee during student enrollment into `students.total_fee`. We reuse this existing source of truth directly. No ₹2,000 baseline; no course division; snapshot upon due creation. |
| **3** | **Email Provider** | **RESEND (Free Plan: 3k/mo, 100/day)** | Resend approved on Free tier. Server-side credentials only. Domain verification required for arbitrary sending. Decoupled via `email_outbox`. Retain retryable failures on quota hit; no auto-paid upgrades. |
| **4** | **Generation Engine** | **HYBRID (`pg_cron` + On-Demand Fallback)** | Primary: `pg_cron` runs at `00:01 Asia/Kolkata` on the 1st of each month. Fallback: Idempotent on-demand execution when authorized staff visits Fees page. Both call `generate_monthly_dues(p_period_key)`. |
| **5** | **Commencement** | **NOVEMBER 2026** | Billing engine officially commences with November 2026 (`2026-11`). Zero dues generated prior to Nov 2026. Zero retroactive backfill. All legacy payment records preserved intact in immutable ledger. |
| **6** | **Advance Cancellation** | **ADMIN-ONLY AUDITED REVERSAL** | Privileged to `super_admin` only (managers/receptionists strictly forbidden). Zero hard-deletions. Reversal entry recorded in immutable `fee_payments` ledger. Any applied allocations reversed transactionally; advance status $\to$ `VOIDED`. |

---

## Detailed Specifications of Approved Decisions

### Decision 1 — Student Email: OPTIONAL
- **Registration**: Student enrollment does not require an email address (`students.email` is nullable `TEXT`).
- **Advance Receipt Dispatch**:
  - If a student has an email registered, send the HTML receipt automatically.
  - If no email exists, the modal displays an optional "Student Email" input. If the cashier provides one, send the receipt and offer to save it to their profile (prompted, never silent).
  - If no email is provided, the advance payment succeeds immediately, a paper receipt is printed, and `email_outbox.status` is set to `NOT_REQUIRED`.
  - Financial transactions are **never** blocked or aborted due to missing email.

### Decision 2 — Individual Monthly Fee: REUSE EXISTING STUDENT FEE FIELD
- **Verified Source of Truth**:
  - Database Column: `public.students.total_fee NUMERIC(10, 2) NOT NULL`
  - Frontend Input: `total_fee` in `client/src/components/students/AddStudentModal.tsx` & `EditStudentModal.tsx`
- **Owner-Approved Reality**:
  - When creating a student, the owner enters that student's monthly fee into this field (which was originally labeled "Total Course Fee" in the initial prototype).
  - **No New Baseline**: We reject the ₹2,000 flat default and reject course division.
  - **Due Snapshotting**: When `generate_monthly_dues(period_key)` runs, it reads `students.total_fee` and locks it as `monthly_fee_dues.fee_snapshot`.
  - **Effective-Date Rule**: If an admin edits `students.total_fee`, all past and current generated dues remain completely unchanged. The new amount only applies to future months when their dues are generated.

### Decision 3 — Transactional Email Provider: RESEND
- **Tier**: Free Plan (3,000 emails/month, 100 emails/day, 3 domains).
- **Security**: `RESEND_API_KEY` stored exclusively in server-side environment (`.env.local` / Supabase Vault). It is never bundled into client Vite code.
- **Domain Verification**: Before live emailing to arbitrary student inboxes, a sending domain must be verified in Resend via DNS (SPF/DKIM/DMARC). Until verified, live delivery is restricted to test inboxes.
- **Quota & Failures**: If daily (100) or monthly (3,000) limits are reached, the background worker logs the quota error and keeps the item in `RETRYABLE` / `FAILED` state. No paid upgrades will occur without owner approval.

### Decision 4 — Monthly Generation Automation: HYBRID
- **pg_cron**:
  - Cron schedule: `1 18 * * *` UTC (which evaluates to `00:01` IST on day 1 of every month).
  - Calls `SELECT generate_monthly_dues('YYYY-MM')`.
- **On-Demand Fallback**:
  - When an authorized user (`super_admin`, `admin`, `receptionist`) opens the Fees Page, a check runs. If current month dues do not exist, it triggers `generate_monthly_dues('YYYY-MM')`.
- **Idempotency Guarantee**:
  - The function is strictly idempotent. Re-running it 1,000 times produces exactly the same result with 0 duplicate rows.
  - Logs execution results to an audit table `monthly_generation_logs`.

### Decision 5 — Billing Commencement: NOVEMBER 2026
- **Starting Period**: November 2026 (`2026-11`).
- **Legacy Protection**: No dues will be generated for October 2026 or earlier. Historical payments remain untouched in `fee_payments` for past auditing.
- **Admission Eligibility**: A student only receives a November 2026 due if `students.joining_date <= '2026-11-30'` and `students.status = 'active'`.

### Decision 6 — Advance Cancellation: ADMIN-ONLY AUDITED REVERSAL
- **Authorization**: Only `super_admin` can invoke `void_advance_fee`.
- **Ledger Invariant**: Original payment record in `fee_payments` is preserved. A reversal row with negative amount (`-amount`) or `is_void = true` is appended with audit reason.
- **Allocation Rollback**: If the advance was already applied to a due, the allocation row is voided, and the due's `advance_applied` and `outstanding_balance` are restored.
- **Advance Status**: Transitions from `UPCOMING` or `APPLIED` to `VOIDED`.

---

## Critical Monthly Status Rule (Reconfirmed)

Every monthly fee due has a 100% independent status:
- **November 2026**: `UNPAID`
- **December 2026**: `PAID`
- **January 2027**: `UNPAID`

Paying December has **zero effect** on November or January. November remains `UNPAID` until explicitly paid via normal collection for November or covered by an advance targeting November.
