# Phase 7: Testing, Backup Pipeline & Production Deployment

## 1. Objective
Execute end-to-end integration testing, configure the automated daily encrypted backup pipeline to Cloudflare R2 and a secondary destination in GitHub Actions, execute a mandatory restore verification drill, deploy the React frontend to Cloudflare Pages via GitHub CI/CD, and run live production verification.

---

## 2. Scope
* **End-to-End Integration Testing:**
  - Verify complete lifecycle: Student Admission $\rightarrow$ Fee Collection $\rightarrow$ Authorized Reversal $\rightarrow$ Receipt Print $\rightarrow$ Batch Attendance $\rightarrow$ Data Export.
* **Automated Daily Backup Pipeline Setup:**
  - Create `.github/workflows/daily-backup.yml`.
  - Configure GitHub repository secrets (`SUPABASE_DB_URL`, `BACKUP_ENCRYPTION_KEY`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`).
* **Mandatory Restore Verification Drill (Deployment Gate):**
  - Download and decrypt an automated backup archive.
  - Execute a restore into a temporary PostgreSQL test database.
  - Run verification sanity queries to prove restore validity prior to production sign-off.
* **Cloudflare Pages Production Deployment:**
  - Connect private GitHub repository to Cloudflare Pages.
  - Configure production environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
  - Deploy to live `*.pages.dev` domain.
* **Post-Deployment Verification:**
  - Execute smoke-test suite against the live production application.

---

## 3. Out-of-Scope Items
* Custom domain purchase (free `*.pages.dev` used initially).
* Paid SSL certificates (Cloudflare Universal SSL included free).

---

## 4. Prerequisites
* Completion and approval of Phases 1 through 6.
* Private GitHub repository created.
* Cloudflare R2 bucket created (Free Tier).
* Cloudflare Pages connected to the repository.

---

## 5. Step-by-Step Tasks

### Task 7.1: Pre-Deployment Integration Testing
* Run complete cross-module integration tests validating:
  - Super Admin login and session persistence.
  - Normalized Admission ID uniqueness.
  - Immutable payment ledger and authorized payment reversal accounting.
  - Receipt print view CSS isolation.
  - Batch attendance save and update without duplicates.
  - In-app JSON/CSV data export download.

### Task 7.2: Configure Automated Daily Backup Workflow
Create `.github/workflows/daily-backup.yml`:
- Trigger: Daily cron (`cron: '0 0 * * *'`) and manual dispatch (`workflow_dispatch`).
- Steps:
  1. Checkout repository.
  2. Install `postgresql-client` and `rclone` (or AWS CLI).
  3. Execute `pg_dump` against `SUPABASE_DB_URL`.
  4. Encrypt using GPG (AES-256) with `BACKUP_ENCRYPTION_KEY`.
  5. Upload encrypted `.sql.gpg` archive to Cloudflare R2 bucket.
  6. Upload duplicate archive to GitHub Private Releases (secondary copy).
  7. Send alert if any step fails.

### Task 7.3: Mandatory Restore Verification Drill
Before deploying to production, execute the restore test:
1. Trigger `daily-backup.yml` manually via `workflow_dispatch`.
2. Download the resulting encrypted archive from Cloudflare R2.
3. Decrypt locally with GPG.
4. Restore into a local Docker Postgres container or test Supabase project.
5. Verify record counts and balance calculations match production.

### Task 7.4: Deploy Frontend to Cloudflare Pages
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com) $\rightarrow$ **Workers & Pages > Create > Pages > Connect to Git**.
2. Select private GitHub repository `institute-app`.
3. Build Settings:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Root directory: `client`
4. Environment Variables:
   - `VITE_SUPABASE_URL`: `https://<project-ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `<public-anon-key>`
5. Click **"Save and Deploy"**.

### Task 7.5: Live Smoke-Test Suite
Execute smoke-testing on the live `https://institute-app.pages.dev` URL:
- Verify HTTPS certificate is active.
- Log in with Super Admin credentials.
- Add test student, record test payment, print receipt to PDF.
- Mark attendance for today.
- Download JSON backup file and inspect contents.

---

## 6. Expected Files & Deliverables
* `.github/workflows/daily-backup.yml`
* Production deployment on `*.pages.dev`
* Restore drill verification audit log
* Smoke-test sign-off report

---

## 7. Database Changes
* None (production schema already active on Supabase).

---

## 8. Security Requirements
* Confirm that `service_role` key is **NOT** present in Cloudflare Pages or client code.
* Confirm that GPG encryption passphrase exists **only** in GitHub Secrets.
* Confirm that R2 bucket permissions block public internet reads.

---

## 9. Testing Strategy
* **Cross-Browser Verification:** Test on Google Chrome, Mozilla Firefox, Apple Safari, and Mobile Chrome.
* **Backup Failure Alert Test:** Intentionally trigger workflow with invalid database host $\rightarrow$ Verify failure alert email is received.

---

## 10. Acceptance Criteria
* [ ] Application is accessible globally via HTTPS on Cloudflare Pages.
* [ ] Admin login functions flawlessly on production.
* [ ] Daily automated backup workflow executes and uploads encrypted `.sql.gpg` to Cloudflare R2 and secondary destination.
* [ ] Restore verification drill is executed successfully before go-live.
* [ ] Total initial and ongoing running cost is verified at ₹0.00.

---

## 11. Rollback Plan
* Cloudflare Pages allows instant 1-click rollback to any previous deployment in the dashboard.

---

## 12. Dependencies on Previous Phases
* **Depends on:** All previous phases (0 through 6).
