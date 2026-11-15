# Phase 1 Pre-Implementation Checklist & Technical Readiness

**Document Version:** 1.0.0 (Pre-Flight Gate)  
**Creation Date:** 2026-11-15  
**Execution Posture:** STRICT STOP ENFORCED — No migrations or code changes until authorized.

---

## 1. Technical Prerequisites & Blocker Matrix

Before executing Phase 1 (Database Migrations & Backend RPC Deployment), the following readiness checks and operational prerequisites must be verified:

| # | Domain / Component | Prerequisite Item | Status | Action Required Before Implementation | Blocker Level |
| :- | :--- | :--- | :-: | :--- | :-: |
| **1** | **Database Backup** | Pre-Migration Full Database Snapshot | ⚠️ PENDING | Execute `pg_dump` full schema + data snapshot to `backups/pre_fee_redesign_YYYYMMDD/` | **CRITICAL (Hard Gate)** |
| **2** | **Migration Sequence** | Migration File Versioning & Ordering | ✅ READY | Target migration file defined as `migrations/0006_monthly_fee_engine_and_advance_module.sql` with companion downward script `0006_fee_module_redesign_DOWN.sql` | NONE |
| **3** | **Student Fee Field** | Verification of `students.total_fee` | ✅ VERIFIED | Confirmed `students.total_fee` is `NUMERIC(10, 2) NOT NULL` and entered during student enrollment. No new baseline required. | NONE |
| **4** | **Student Email Column** | Schema Alteration for Optional Email | ✅ READY | DDL prepared: `ALTER TABLE public.students ADD COLUMN IF NOT EXISTS email TEXT DEFAULT NULL;` | NONE |
| **5** | **pg_cron Availability** | Verify Supabase `pg_cron` Extension | ⚠️ PENDING | Confirm whether `CREATE EXTENSION IF NOT EXISTS pg_cron;` is supported in the target Supabase database tier. If not supported, the system operates seamlessly on the on-demand fallback hook. | LOW (Non-blocking fallback exists) |
| **6** | **Resend API Credentials** | Provision `RESEND_API_KEY` | ⚠️ PENDING | Owner to create free account at `resend.com` and store `RESEND_API_KEY` in Supabase Secrets / backend `.env.local`. Must **never** be added with `VITE_` prefix. | MEDIUM (Outbox queues safely if key missing) |
| **7** | **Domain DNS Verification** | Resend Sender Domain Configuration | ⚠️ PENDING | To send receipts to arbitrary student emails, domain DNS records (SPF, DKIM, DMARC) must be configured in domain registrar. Until verified, test emails are restricted to owner email (`saifirihan683@gmail.com`). | LOW (Receipts printable physically) |
| **8** | **Baseline Regression** | Pre-Implementation Test Pass | ✅ VERIFIED | 61/61 automated QA regression tests passed in test suite. Zero compilation errors on `client` (`tsc --noEmit` clean). | NONE |
| **9** | **Owner Go-Ahead** | Explicit Written Owner Authorization | ⚠️ PENDING | Owner must send explicit message authorizing Phase 1 execution. | **CRITICAL (Hard Gate)** |

---

## 2. Phase 1 Implementation Roadmap (Upon Approval)

When the owner provides explicit written authorization to start Phase 1, the execution will follow this strict sequence:

### Step 1: Pre-Migration Backup
1. Execute full logical database dump (`pg_dump`).
2. Verify integrity of backup archive.

### Step 2: Database Migration (`migrations/0006_monthly_fee_engine_and_advance_module.sql`)
1. Add optional `email TEXT` to `public.students`.
2. Create `public.fee_periods` table and seed periods from `2026-11` onwards.
3. Create `public.monthly_fee_dues` table with snapshot column `fee_snapshot`.
4. Create `public.fee_payment_allocations` settlement table.
5. Create `public.advance_fee_records` table with admin reversal audit fields.
6. Create `public.email_outbox` transactional queue table (`not_required` status enabled).
7. Create `public.monthly_generation_logs` audit table.
8. Create `public.monthly_due_status_view` with independent status logic.
9. Deploy PostgreSQL stored procedures (RPCs):
   - `public.generate_monthly_dues(TEXT)`
   - `public.collect_monthly_fee(UUID, NUMERIC, TEXT, TEXT, TEXT)` (Exact full payment only)
   - `public.record_advance_fee(UUID, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT)`
   - `public.apply_advance_adjustments(UUID)`
   - `public.void_advance_fee(UUID, TEXT)` (Super Admin only)
10. Apply closed-door RLS security policies.

### Step 3: Verification & Initial Dues Generation
1. Verify schema integrity and execute downward migration test in dry-run mode.
2. Trigger `generate_monthly_dues('2026-11')` for active eligible students.
3. Run automated Vitest test suite (TC-FEE-01 through TC-FEE-30).

---

## 3. Strict Stop Notice

> [!CAUTION]
> **ENGINEERING STOP ENFORCED:**  
> All preparation, documentation, and design alignment for Phase 0 is complete. In strict adherence to safety directives:
> - No database tables or columns have been created.
> - No application source code has been altered.
> - No migration scripts have been run against any database.
> - No API keys or secrets have been configured.
> - No commits have been pushed to GitHub.
> 
> **The system is idling and awaiting the owner's explicit instruction to begin Phase 1.**
