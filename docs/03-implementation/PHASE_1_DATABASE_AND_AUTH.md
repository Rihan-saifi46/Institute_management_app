# Phase 1: Database DDL, Views, Functions & Supabase Auth

## 1. Objective
Provision the Supabase PostgreSQL database project, execute sequential SQL migration files to establish tables, constraints, indexes, views, stored functions (RPCs), and Row Level Security (RLS) policies, and configure Supabase Auth for closed admin-only authentication.

---

## 2. Scope
* Provision the Supabase project on the Free Plan (AWS region: `ap-south-1` Mumbai or nearest available).
* Create schema migrations in `migrations/`:
  - `0001_initial_schema.sql` (Tables: `admins`, `students`, `fee_payments` with reversal support, `attendance`)
  - `0002_create_fee_summary_view.sql` (Real-time financial summary view netting reversals)
  - `0003_create_stored_functions.sql` (Stored procedures for atomic batch attendance and authorized reversals)
  - `0004_enable_rls_policies.sql` (PostgreSQL RLS security rules)
* Configure Supabase Auth (disable public signups).
* Bootstrap the initial Super Admin account (Institute Owner).

---

## 3. Out-of-Scope Items
* Developing frontend UI or user forms.
* Building external automated backup workflows (handled in Phase 7).

---

## 4. Prerequisites
* Completion and approval of Phase 0.
* Supabase account access on the Free Plan.
* Supabase direct and pooled PostgreSQL connection strings saved securely.

---

## 5. Step-by-Step Tasks

### Task 1.1: Provision Supabase Project
* Log in to [Supabase Dashboard](https://supabase.com/dashboard) and click **"New Project"**.
* Name: `institute-app-prod`.
* Region: Choose the lowest-latency AWS region (e.g. `ap-south-1` Mumbai).
* Save the database password and project API keys (`URL`, `anon_key`, and `service_role` key).

### Task 1.2: Author Migration Scripts
Create sequential migration files in `migrations/`:
1. `0001_initial_schema.sql`: Base tables with UUID primary keys, normalized unique Admission ID index, check constraints, and foreign keys.
2. `0002_create_fee_summary_view.sql`: Creates `public.student_fee_summary` view with reversal netting.
3. `0003_create_stored_functions.sql`: Stored functions `mark_batch_attendance` and `reverse_payment`.
4. `0004_enable_rls_policies.sql`: Enables RLS and grants permissions to authenticated admins.

### Task 1.3: Execute Migrations
Apply migrations using the Supabase SQL Editor or `psql`:
```bash
psql "$SUPABASE_DB_URL" -f migrations/0001_initial_schema.sql
psql "$SUPABASE_DB_URL" -f migrations/0002_create_fee_summary_view.sql
psql "$SUPABASE_DB_URL" -f migrations/0003_create_stored_functions.sql
psql "$SUPABASE_DB_URL" -f migrations/0004_enable_rls_policies.sql
```

### Task 1.4: Configure Supabase Auth Settings
* In Supabase Dashboard $\rightarrow$ **Authentication > Providers > Email**:
  - Enable Email provider.
  - Disable "Confirm email" if not needed, or verify owner email.
* In **Authentication > Settings**:
  - **Disable "Enable email signups"** (guarantees closed-system security; no public self-registration).

### Task 1.5: Seed Initial Super Admin Account
* Create the owner user account in Supabase Auth via the dashboard or SQL.
* Insert corresponding record into `public.admins` with `role = 'super_admin'`.

---

## 6. Expected Files & Changes
* `migrations/0001_initial_schema.sql`
* `migrations/0002_create_fee_summary_view.sql`
* `migrations/0003_create_stored_functions.sql`
* `migrations/0004_enable_rls_policies.sql`
* `migrations/0005_seed_super_admin.sql`
* Environment template: `.env.example`

---

## 7. Database Changes
* **Schemas:** `public`, `auth` (managed)
* **Tables created:** `public.admins`, `public.students`, `public.fee_payments`, `public.attendance`
* **Views created:** `public.student_fee_summary`
* **Functions created:** `public.mark_batch_attendance`, `public.reverse_payment`
* **Constraints enforced:** `unique_trimmed_lower_admission_id`, `check_total_fee_positive`, `check_payment_amount_positive`, `unique_student_daily_attendance`

---

## 8. Security Requirements
* Direct database connection strings must only reside in untracked `.env` files.
* Confirm that all four `public` tables have `ROW LEVEL SECURITY` enabled.
* Confirm that anonymous (`anon`) role queries return zero rows.
* Confirm that `public.fee_payments` has no `UPDATE` or `DELETE` policies.

---

## 9. Testing Strategy
1. **Admission ID Uniqueness:**
   - Insert `CIT-001`. Attempt to insert `cit-001` $\rightarrow$ Must throw unique constraint violation error.
2. **Attendance Uniqueness:**
   - Attempt to insert attendance for the same student and date twice $\rightarrow$ Must throw duplicate key violation error.
3. **Student Deletion Protection:**
   - Attempt to delete a student who has payment records $\rightarrow$ Must be blocked by `ON DELETE RESTRICT`.
4. **Reversal Netting:**
   - Insert a student with fee 10,000 and payment of 5,000. Reverse the payment via `reverse_payment` RPC. Query `student_fee_summary` $\rightarrow$ Must return `total_paid = 0.00`, `balance_due = 10000.00`, `fee_status = 'UNPAID'`.

---

## 10. Acceptance Criteria
* [ ] All migrations apply cleanly without errors or warnings.
* [ ] Database constraints block invalid data insertion in automated tests.
* [ ] `student_fee_summary` view computes accurate balances netting reversals.
* [ ] Stored functions execute with appropriate role checks.
* [ ] Supabase Auth is active and the Super Admin user can authenticate.

---

## 11. Rollback Plan
* If a migration fails, drop and recreate tables or restore from a pre-migration database snapshot.

---

## 12. Dependencies on Previous Phases
* **Depends on:** Phase 0 (Workspace & version control setup).
