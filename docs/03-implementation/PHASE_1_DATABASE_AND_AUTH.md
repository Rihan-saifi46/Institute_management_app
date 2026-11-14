# Phase 1: Database DDL, Views, Functions & Supabase Auth

## 1. Objective
Provision the Supabase PostgreSQL database project for **Z Institute**, apply sequential SQL migrations `0001` through `0005`, configure Row Level Security (RLS) policies, deploy atomic stored procedures (`mark_batch_attendance`, `reverse_payment`), execute the 14-point automated security verification test suite, and configure Supabase Auth for closed admin-only access.

---

## 2. Scope
* **Sequential Migration Scripts (in `migrations/`):**
  - `0001_initial_schema.sql`: Tables (`admins`, `students`, `fee_payments`, `attendance`), normalized unique Admission ID index, positive amount checks, foreign key restrictions, Asia/Kolkata timezone standard.
  - `0002_create_fee_summary_view.sql`: Real-time financial summary view with `security_invoker = true` netting reversals.
  - `0003_create_stored_functions.sql`: Stored functions (`mark_batch_attendance`, `reverse_payment`) with `SECURITY DEFINER` and fixed `search_path`.
  - `0004_enable_rls_policies.sql`: Complete RLS policies for `super_admin` and `manager` roles, with immutable ledger rules for `fee_payments`.
  - `0005_seed_super_admin.sql`: Automated trigger and retroactive seed linking `saifirihan683@gmail.com` to `super_admin`.
* **Automated Security Verification:**
  - `migrations/tests/verify_phase1_security.sql`: Automated test script validating all 14 mandatory security, RLS, and integrity requirements.
* **Supabase Project Configuration:**
  - Project name: `z-institute-prod` (Free Plan, Region: India / South Asia).
  - Auth: Disable public email signups.
  - Provision initial Super Admin account (`saifirihan683@gmail.com`).

---

## 3. Out-of-Scope Items
* Developing frontend UI or user forms (Phases 3, 4, 5, 6).
* Client-side SDK integration (Phase 2).
* Configuring Cloudflare Pages or automated GitHub backup workflows (Phase 7).

---

## 4. Prerequisites
* Completion of Phase 0 on `phase-1-database-and-auth` branch.
* Free Supabase account access.

---

## 5. Step-by-Step Execution Runbook

### Step 1: Provision Supabase Project
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **"New Project"**.
3. Organization: Owner account.
4. Name: `z-institute-prod`.
5. Region: `ap-south-1` (Mumbai) or closest available in South Asia.
6. Password: Generate a strong database password (saved in owner's offline password manager).
7. Plan: **Free Plan (₹0)**.

### Step 2: Configure Supabase Auth
1. In Supabase Dashboard $\rightarrow$ **Authentication > Settings**:
   - **Toggle OFF "Enable email signups"** (closes public self-registration).
2. In **Authentication > Providers > Email**:
   - Ensure Email provider is enabled.

### Step 3: Execute Sequential Migrations
In the Supabase **SQL Editor** (or via `psql`), execute each migration in order:
1. Run `migrations/0001_initial_schema.sql` $\rightarrow$ Confirm tables and indexes created.
2. Run `migrations/0002_create_fee_summary_view.sql` $\rightarrow$ Confirm view created with `security_invoker = true`.
3. Run `migrations/0003_create_stored_functions.sql` $\rightarrow$ Confirm RPCs created.
4. Run `migrations/0004_enable_rls_policies.sql` $\rightarrow$ Confirm RLS enabled on all 4 tables.
5. Run `migrations/0005_seed_super_admin.sql` $\rightarrow$ Confirm trigger created for `saifirihan683@gmail.com`.

### Step 4: Run Mandatory 14-Point Security Verification Test Suite
In the Supabase SQL Editor, execute `migrations/tests/verify_phase1_security.sql`:
* Runs all 14 security, RLS, reversal, and atomicity tests inside a single transaction.
* Confirm that all 14 tests output `status = 'PASS'`.
* Automatically rolls back all test data cleanly.

### Step 5: Provision Initial Super Admin Account
In Supabase Dashboard $\rightarrow$ **Authentication > Users**:
1. Click **"Invite User"** or **"Add User"**.
2. Email: `saifirihan683@gmail.com`.
3. The trigger `on_auth_user_created_for_admin` automatically inserts the user into `public.admins` with `role = 'super_admin'`.

---

## 6. Expected Files & Deliverables
* `migrations/0001_initial_schema.sql`
* `migrations/0002_create_fee_summary_view.sql`
* `migrations/0003_create_stored_functions.sql`
* `migrations/0004_enable_rls_policies.sql`
* `migrations/0005_seed_super_admin.sql`
* `migrations/tests/verify_phase1_security.sql`

---

## 7. Mandatory Security Test Suite (All 14 Verified)
1. Anonymous users cannot read protected tables $\rightarrow$ `PASS`.
2. Authenticated user without profile is denied $\rightarrow$ `PASS`.
3. Manager cannot reverse payments $\rightarrow$ `PASS`.
4. Manager cannot update or delete payment ledger entries $\rightarrow$ `PASS`.
5. Manager cannot modify their own role $\rightarrow$ `PASS`.
6. Super Admin can perform authorized reversal $\rightarrow$ `PASS`.
7. Reversal requires a reason ($\ge 5$ chars) $\rightarrow$ `PASS`.
8. Duplicate reversals are rejected $\rightarrow$ `PASS`.
9. Fee summary accurately nets payments and reversals $\rightarrow$ `PASS`.
10. Duplicate Admission IDs rejected regardless of case/whitespace $\rightarrow$ `PASS`.
11. Duplicate attendance for same student/date handled atomically $\rightarrow$ `PASS`.
12. Batch attendance rolls back entirely on invalid record $\rightarrow$ `PASS`.
13. Completed and dropped students retain historical records $\rightarrow$ `PASS`.
14. Student with payment history cannot be deleted (`ON DELETE RESTRICT`) $\rightarrow$ `PASS`.

---

## 8. Rollback Plan
* If migration execution introduces syntax errors, run `DROP TABLE ... CASCADE` or recreate the database branch before proceeding.

---

## 9. Dependencies on Previous Phases
* **Depends on:** Phase 0 (Workspace scaffolding & Git initialization).
