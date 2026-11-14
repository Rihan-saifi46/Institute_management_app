# Security & Compliance Checklist

## 1. Overview

This checklist serves as the authoritative security verification gate before declaring any implementation phase or production release complete. Every check must be evaluated and verified prior to production deployment.

---

## 2. Pre-Deployment Security Gates

### 2.1 Credential & Secret Isolation
- [ ] **No `service_role` in Frontend:** Verify that the Supabase `service_role` key does NOT appear anywhere in `client/.env`, `client/src/*`, or compiled JavaScript bundles (`dist/assets/*.js`).
- [ ] **Public Anon Key Safety:** Verify that `VITE_SUPABASE_ANON_KEY` is restricted by PostgreSQL Row Level Security (RLS) on all tables.
- [ ] **No Secrets in Git:** Verify that `.env`, `.env.local`, and `.sql` dump files are explicitly excluded in `.gitignore`.
- [ ] **GitHub Actions Secrets:** Verify that database connection strings, R2 credentials, and GPG encryption passphrases are stored strictly in encrypted **GitHub Repository Secrets**.
- [ ] **Encryption Key Isolation:** Verify that the GPG encryption passphrase (`BACKUP_ENCRYPTION_KEY`) is **NOT** stored in Cloudflare R2 or alongside encrypted backup files.

### 2.2 Network & Edge Security
- [ ] **HTTPS Enforcement:** Verify that Cloudflare Pages and Supabase enforce HTTPS / TLS 1.3 exclusively.
- [ ] **Security Headers:** Verify the following HTTP headers are returned on all edge responses:
  ```http
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; connect-src 'self' https://*.supabase.co;
  ```

### 2.3 Authentication & Authorization
- [ ] **Closed Registration:** Verify that public sign-up is completely disabled in Supabase Auth settings ("Enable email signups" = unchecked).
- [ ] **Route Guard Fails Closed:** Verify that navigating directly to `/students`, `/fees`, or `/attendance` in an unauthenticated incognito window immediately bounces to `/login`.
- [ ] **Session Expiry:** Verify that expired or revoked JWT tokens prompt immediate re-authentication.
- [ ] **Role Verification:** Verify that destructive actions and payment reversals strictly require the `super_admin` role.

### 2.4 Database Engine & RLS Verification
- [ ] **RLS Active on All Tables:** Verify `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';` returns `rowsecurity = true` for `admins`, `students`, `fee_payments`, and `attendance`.
- [ ] **Anonymous Query Blocking:** Test querying `public.students` using the unauthenticated `anon` role $\rightarrow$ Verify zero rows are returned.
- [ ] **Fee Ledger Immutability:** Verify that `UPDATE` and `DELETE` queries on `public.fee_payments` fail for all roles.
- [ ] **Authorized Reversal Only:** Verify that regular `admin` accounts cannot invoke `public.reverse_payment`.

---

## 3. Operational Data Integrity Gates

- [ ] **Student Deletion Protection:** Verify that deleting a student who has payment records is blocked by `ON DELETE RESTRICT`.
- [ ] **Admission ID Uniqueness:** Verify that inserting duplicate manual Admission IDs (including case-variation duplicates like `cit-1` and `CIT-1`) is blocked by `unique_trimmed_lower_admission_id`.
- [ ] **Attendance Daily Uniqueness:** Verify that inserting duplicate attendance for the same student on the same date is blocked by `unique_student_daily_attendance` or updated cleanly via RPC upsert.
- [ ] **Negative Number Guard:** Verify that negative total fees or negative payment installments are rejected by PostgreSQL `CHECK` constraints.

---

## 4. Disaster Recovery & Backup Verification Gates

- [ ] **Automated Backup Functional:** Trigger GitHub Actions backup manually via `workflow_dispatch` $\rightarrow$ Verify encrypted `.sql.gpg` artifact is uploaded to Cloudflare R2 and secondary destination.
- [ ] **Isolated Restore Verification Drill:** Download the backup archive, decrypt locally using GPG, restore into an isolated PostgreSQL instance, and verify data integrity before production go-live.
- [ ] **Failure Alerts Active:** Verify that backup job failure dispatches an automated notification email to the institute owner.
