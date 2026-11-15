# Z Institute Management System — Master QA Test Plan

## 1. Document Control
- **Document Version:** 1.0.0
- **Lead QA Engineer & Security Auditor:** Antigravity Senior QA & Security Testing Team
- **Target Application:** Z Institute Management System
- **Current Operational Date:** 2026-11-15 (Timezone: Asia/Kolkata / IST)
- **Target Release:** Version 0.1.0 (MVP)

---

## 2. Executive Summary & Objective

This Master QA Test Plan defines the scope, strategy, testing environment, test suites, risk matrix, and acceptance criteria for the comprehensive evaluation of the Z Institute Management System.

The application serves a single-tenant computer education institute with daily operational requirements:
1. **Student Administration:** Manual Admission ID tracking, demographic registry, and lifecycle management (`active`, `completed`, `dropped`).
2. **Financial Fee Management:** Installment collection, audit-grade immutable ledger, authorized reversals (`super_admin` only), real-time balance calculations, and browser-native receipt printing.
3. **Daily Batch Attendance:** 15-second batch attendance sheet with "Present" defaulting, one-click absentee toggling, atomic database upserts via PostgreSQL RPC, and monthly rate analytics.
4. **Data Portability & Security:** Role-based access control (Super Admin vs. Staff Manager), closed registration, PostgreSQL Row Level Security (RLS), and in-app CSV/JSON portability.

Testing is executed against actual database schemas, business rules, API boundaries, security policies, edge cases, and UI workflows.

---

## 3. Scope of Testing

### 3.1 In-Scope Modules & Features
| Module | Components & Features Tested |
|---|---|
| **Authentication & AuthZ** | Supabase Auth, login/logout, JWT persistence, session guard, role differentiation (`super_admin` vs `manager`), RLS policy enforcement. |
| **Student Management** | Create, Read, Update, Delete (restricted), manual Admission ID trimming/case-insensitivity, phone validation, course filtering, multi-field search. |
| **Fee Management** | Installment collection, immutable ledger, authorized reversals with mandatory audit reasons, view `student_fee_summary`, overpayment handling, printable receipts. |
| **Batch Attendance** | Date bar, "Present" defaulting, absentee toggle, review modal, atomic upsert RPC (`mark_batch_attendance`), composite uniqueness, percentage calculations. |
| **Dashboard & Reports** | Metric cards, real-time counters, search and filter interactions, empty states, pagination integrity. |
| **Data Portability** | In-app CSV and JSON export routines, RFC 4180 compliance, column mapping fidelity. |
| **Database Integrity** | Constraints, triggers, indexes, views, foreign key `ON DELETE RESTRICT`, timezone compliance (Asia/Kolkata). |

### 3.2 Out-of-Scope (Documented MVP Boundaries)
- Third-party payment gateways (Razorpay, Stripe) — out of scope per DEC-004.
- Automated SMS / WhatsApp reminder gateways — deferred to post-MVP.
- Biometric fingerprint hardware integrations.
- Multi-tenant / multi-branch franchise partitioning.

---

## 4. Test Strategy & Execution Architecture

### 4.1 Safety First Rules
- **Zero Production Deletion:** Existing records are safeguarded.
- **Isolated Testing Harness:** Automated integration tests run in a dedicated in-memory deterministic PostgreSQL emulation harness mimicking all constraints, foreign keys, triggers, stored functions, and views.
- **Zero Secret Exposure:** Credentials and JWT secrets are excluded from logs and reports.

### 4.2 Test Levels
1. **Unit Testing:** Individual utility functions, currency formatters, date formatters, CSV escaping.
2. **Service Integration Testing:** Service layer APIs (`students.ts`, `fees.ts`, `attendance.ts`, `export.ts`).
3. **Database Behavioral Testing:** Verification of table DDL, checks, unique constraints, foreign keys, RLS policies, and stored procedures (`mark_batch_attendance`, `reverse_payment`).
4. **End-to-End Workflow Testing:** End-to-end simulation of student enrollment $\rightarrow$ fee collection $\rightarrow$ receipt generation $\rightarrow$ attendance marking $\rightarrow$ student deactivation/archival $\rightarrow$ export.
5. **Security & Penetration Testing:** Anon table access, unprofiled user access, manager privilege escalation, SQL injection vectors, immutable ledger bypass attempts.
6. **Edge Case & Stress Testing:** Concurrent payments, duplicate attendance submissions, leap year / month boundary transitions, boundary values (0, negative, $\ge 10^7$).

---

## 5. Environment Specifications
- **Client OS / Host:** Windows 11 (x64)
- **Node.js Runtime:** v22.12.0
- **Test Runner:** Vitest v2.1.9
- **Frontend Stack:** React 18.3.1, TypeScript 5.7.2, Vite 6.0.7, TailwindCSS 3.4.16
- **Database Architecture:** PostgreSQL 15+ / Supabase PostgREST
- **Timezone:** Asia/Kolkata (IST)

---

## 6. Defect Severity & Classification Standard
- **P0 (Critical / Blocker):** Data loss, financial ledger corruption, privilege escalation, unauthenticated data exposure.
- **P1 (High):** Core fee collection or attendance workflow broken; runtime exception in standard happy path.
- **P2 (Medium):** Important feature incorrect (e.g. export column mismatch, metric card pagination limitation, overpayment validation gap).
- **P3 (Low):** Minor UI cosmetic glitch, duplicate internal query, or styling alignment issue.

---

## 7. Deliverables & Acceptance Criteria
The test campaign concludes when all test cases are executed, all discovered defects are classified and safely addressed according to the Bug Fixing Policy, and the following 10 reports are delivered in `QA_REPORTS/`:
1. `QA_MASTER_TEST_PLAN.md`
2. `TEST_CASES.md`
3. `TEST_EXECUTION_REPORT.md`
4. `BUG_REPORT.md`
5. `FEE_CYCLE_VERIFICATION.md`
6. `ATTENDANCE_VERIFICATION.md`
7. `DATABASE_INTEGRITY_REPORT.md`
8. `SECURITY_TEST_REPORT.md`
9. `REGRESSION_TEST_REPORT.md`
10. `FINAL_QA_SUMMARY.md`
