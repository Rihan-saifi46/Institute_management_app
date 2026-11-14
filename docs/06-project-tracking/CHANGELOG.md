# Project Changelog & Revision History

All notable changes, architectural pivots, and documentation milestones for the Computer Institute Management System are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.8.0-p4-completed] - 2026-11-14

### Added
* **Phase 4 Module A1 (Student Management) Completed:**
  - `client/src/components/students/StudentStatusBadge.tsx`: Badge rendering for `active`, `completed`, and `dropped` student statuses.
  - `client/src/components/students/StudentFilters.tsx`: Search toolbar with multi-field search (`name`, `admission_id`, `phone`), dynamic course filter dropdown, status tabs (`all`, `active`, `completed`, `dropped`), and clear filters button.
  - `client/src/components/students/AddStudentModal.tsx`: Admission dialog enforcing mandatory manual Admission ID entry (case-normalized), non-negative fee validation, course suggestions datalist, and duplicate index collision error banner.
  - `client/src/components/students/EditStudentModal.tsx`: Full profile editing modal with lifecycle status selection.
  - `client/src/components/students/DeleteStudentModal.tsx`: Safety modal with clear guidance on database `ON DELETE RESTRICT` foreign key protections.
  - `client/src/components/students/StudentTable.tsx`: Tabular directory view with Indian Rupee currency formatting, skeleton loading states, empty state with CTA, and pagination controls.
  - `client/src/pages/StudentsPage.tsx`: Full page view integrating search, table, filters, modals, auto-refresh, and notification alerts.
  - `client/src/App.tsx`: Wired `/students` route directly to `StudentsPage`.
  - `client/src/__tests__/students-components.test.ts`: Component test suite.
  - Verified 0 TypeScript compilation errors and 27/27 Vitest unit/integration tests passing.
  - Verified Vite production build (`dist/index.html`, `dist/assets/`).

## [0.7.0-p3-completed] - 2026-11-14

### Added
* **Phase 3 Frontend Foundation & Authentication Shell Completed:**
  - `client/vite.config.ts`, `client/tailwind.config.js`, `client/postcss.config.js`: Production-ready build toolchain with brand color palette and container utilities.
  - `client/index.html` & `client/src/index.css`: HTML template with Inter typography and scrollbar styles.
  - `client/src/context/AuthContext.tsx`: Client-side authentication context managing active sessions, token refresh, and admin profile resolution (`super_admin` vs `manager`).
  - `client/src/components/ProtectedRoute.tsx`: Route guard redirecting unauthenticated visitors to `/login` with target path state preservation.
  - `client/src/components/layout/DashboardLayout.tsx`: Responsive application shell with sticky header, collapsible sidebar, and mobile backdrop drawer.
  - `client/src/components/layout/Header.tsx`: Top navigation with institute branding, role badge, profile metadata, and sign-out action.
  - `client/src/components/layout/Sidebar.tsx`: Navigation bar with active link indicators for all core modules and live connection status badge.
  - `client/src/pages/Login.tsx`: Focused sign-in screen with email trimming, password visibility toggle, error notifications, and disabled submit states.
  - `client/src/pages/DashboardOverview.tsx`: Administrative dashboard overview with welcome hero, module shortcut cards, and active security policy overview.
  - `client/src/pages/ModulePlaceholder.tsx`: User-friendly module placeholder with roadmaps for upcoming phases.
  - `client/src/App.tsx`: Centralized React Router configuration.
  - `client/src/__tests__/auth-shell.test.ts`: Component structure and interface test suite.
  - All 26 automated unit/integration tests pass with 100% success.
  - Vite production bundle verified (`dist/index.html`, `dist/assets/`).

## [0.6.0-p2-completed] - 2026-11-14

### Added
* **Phase 2 Supabase Client Integration & RPC Layer Completed:**
  - `client/package.json` & `client/tsconfig.json`: TypeScript build workspace established with strict checks.
  - `client/src/types/database.ts`: Complete TypeScript database definition mapping all tables, views, RPCs, and custom enum types.
  - `client/src/types/common.ts`: Common pagination and utility interfaces.
  - `client/src/lib/supabase.ts`: Singleton typed `@supabase/supabase-js` client configured for Vite environment variables with custom auth token persistence.
  - `client/src/services/auth.ts`: Authentication service for email/password sign-in, session retrieval, admin role profile resolution, and auth state listeners.
  - `client/src/services/students.ts`: Student CRUD operations with client-side sanitization, instant multi-field search (`name`, `admission_id`, `phone`), course filtering, and distinct course query.
  - `client/src/services/fees.ts`: Financial ledger services reading the real-time `student_fee_summary` view, recording immutable payment installments, fetching student payment ledgers, and invoking the trusted `reverse_payment` database RPC.
  - `client/src/services/attendance.ts`: Date-wise attendance queries with joined student details, date range history, student percentage calculation, and atomic `mark_batch_attendance` database RPC execution.
  - `client/src/__tests__/services.test.ts`: 18-point automated Vitest integration test suite covering input sanitization, error boundaries, RPC parameter handling, and data transformation. 100% PASS.
  - Zero TypeScript compilation errors (`tsc --noEmit`).

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
