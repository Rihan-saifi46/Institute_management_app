# Project Changelog & Revision History

All notable changes, architectural pivots, and documentation milestones for the Computer Institute Management System are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.5.0-p1-verified] - 2026-11-14

### Completed & Verified
* **Phase 1 Production Verification:**
  - Owner provisioned Supabase production instance: Project Reference `rununbjiqblmlttdmgxu`.
  - Migrations `0001` through `0005` applied successfully.
  - All 14 automated security verification tests in `verify_phase1_security.sql` verified and passed with 100% success.
  - Zero-cost Free Tier baseline verified (PostgreSQL, PostgREST API, Supabase Auth).
  - Test reporting harness updated to explicitly reset session role before writing logs to avoid permission collisions.

## [0.4.0-p1-migrations] - 2026-11-14

### Added
* **Phase 1 Database Migrations Authored (in `migrations/`):**
  - `0001_initial_schema.sql`: Core relational tables (`admins`, `students`, `fee_payments`, `attendance`) with UUID primary keys, normalized case-insensitive unique Admission ID index (`LOWER(TRIM(admission_id))`), non-negative payment constraints, foreign key deletion protections, and `Asia/Kolkata` timezone defaults.
  - `0002_create_fee_summary_view.sql`: Real-time financial summary view with `WITH (security_invoker = true)` calculating net payments after subtracting authorized reversals.
  - `0003_create_stored_functions.sql`: Trusted stored functions (`mark_batch_attendance`, `reverse_payment`) with `SECURITY DEFINER`, fixed `search_path = public, pg_temp`, and server-side role validation.
  - `0004_enable_rls_policies.sql`: Complete PostgreSQL Row Level Security (RLS) policies for `super_admin` and `manager` roles, with immutable ledger rules for `fee_payments` (zero `UPDATE` or `DELETE` policies).
  - `0005_seed_super_admin.sql`: Automated trigger and retroactive bootstrap linking `saifirihan683@gmail.com` to `super_admin`.
* **Automated Security Verification Suite:**
  - `migrations/tests/verify_phase1_security.sql`: Comprehensive test suite verifying all 14 mandatory security, RLS, reversal, and atomicity requirements inside a transactional rollback harness.
* **Git Branching:**
  - Created and checked out dedicated Phase 1 working branch: `phase-1-database-and-auth`.

---

## [0.3.0-p0] - 2026-11-14

### Added
* **Phase 0 Execution Completed:**
  - Initialized Git repository on `main` branch.
  - Configured comprehensive `.gitignore`.
  - Scaffolding established: `client/`, `migrations/`, and `docs/` directories.
  - Environment templates created without real credentials.
  - Initial commit created: `chore: initial project scaffolding`.

---

## [0.2.0-plan] - 2026-11-14

### Changed & Finalized
* **Platform Finalization (Supabase Preference):** Finalized system architecture around **Supabase** and **Cloudflare Pages**.
* **Architecture Simplification (Worker Removal):** Omitted the intermediate Cloudflare Worker API gateway for ordinary CRUD in favor of direct `@supabase/supabase-js` client access with strict PostgreSQL Row Level Security (RLS) policies and trusted database stored functions (`rpc`).
