# Production Deployment Guide

## 1. Overview & Architecture Recap

The application deploys across two cloud services with an independent disaster recovery storage pipeline:

1. **Supabase PostgreSQL:** Managed database, PostgREST API, and Supabase Auth.
2. **Cloudflare Pages:** Global static asset hosting for the compiled React SPA.
3. **Cloudflare R2:** Primary offsite encrypted backup storage (S3-compatible, zero egress fees).
4. **GitHub Private Repository:** Source code repository, CI/CD automated deployment, and secondary backup copy.

---

## 2. Step-by-Step Deployment Procedure

### Step 1: Provision & Configure Supabase Project
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard) and click **"New Project"**.
2. **Project Name:** `institute-app-prod`.
3. **Region:** Select the lowest-latency AWS region (e.g., `ap-south-1` Mumbai).
4. Save the database password and note the following credentials from **Project Settings > API**:
   - `Project URL`: `https://<project-ref>.supabase.co`
   - `anon public key`: `eyJh...`
   - Direct connection string from **Project Settings > Database** (`postgresql://postgres:[PASSWORD]@db.<project-ref>.supabase.co:5432/postgres`).
5. In **Authentication > Settings**:
   - **Disable "Enable email signups"** to close public registration.
6. Apply migrations sequentially via the Supabase SQL Editor or `psql`:
   ```bash
   psql "$SUPABASE_DB_URL" -f migrations/0001_initial_schema.sql
   psql "$SUPABASE_DB_URL" -f migrations/0002_create_fee_summary_view.sql
   psql "$SUPABASE_DB_URL" -f migrations/0003_create_stored_functions.sql
   psql "$SUPABASE_DB_URL" -f migrations/0004_enable_rls_policies.sql
   psql "$SUPABASE_DB_URL" -f migrations/0005_seed_super_admin.sql
   ```

---

### Step 2: Configure Cloudflare R2 Primary Backup Storage
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com) $\rightarrow$ **R2 Object Storage**.
2. Click **"Create bucket"** $\rightarrow$ Name: `institute-backups-prod`.
3. Set bucket location hint to matching region.
4. Navigate to **R2 > Manage R2 API Tokens** $\rightarrow$ Click **"Create API Token"**:
   - Permissions: `Object Read & Write`.
   - Specific bucket: `institute-backups-prod`.
5. Copy the generated `Access Key ID`, `Secret Access Key`, and `S3 Endpoint URL`.

---

### Step 3: Configure GitHub Repository Secrets
1. Push local codebase to your private GitHub repository:
   ```bash
   git remote add origin git@github.com:<your-user>/institute-app.git
   git push -u origin main
   ```
2. In GitHub repository $\rightarrow$ **Settings > Secrets and variables > Actions**, add the following repository secrets:
   - `SUPABASE_DB_URL`: Direct PostgreSQL connection string (`postgresql://postgres:[PASSWORD]@db.rununbjiqblmlttdmgxu.supabase.co:5432/postgres`).
   - `GPG_PUBLIC_KEY`: Asymmetric public GPG key (preferred) for zero-cloud-decryption security, OR `BACKUP_ENCRYPTION_KEY` (AES-256 passphrase).
   - `R2_ACCESS_KEY_ID`: Cloudflare R2 Access Key ID.
   - `R2_SECRET_ACCESS_KEY`: Cloudflare R2 Secret Access Key.
   - `R2_BUCKET_NAME`: `z-institute-backups-prod`.
   - `R2_ENDPOINT`: `https://<account-id>.r2.cloudflarestorage.com`.
   - `ALERT_EMAIL_RECIPIENT`: `saifirihan683@gmail.com`.

---

### Step 4: Deploy Frontend to Cloudflare Pages
1. In Cloudflare Dashboard $\rightarrow$ **Workers & Pages > Create > Pages > Connect to Git**.
2. Select private GitHub repository `institute-app`.
3. Configure Build Settings:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Build Output Directory:** `dist`
   - **Root Directory:** `client`
4. Configure Environment Variables in Cloudflare Pages:
   - `VITE_SUPABASE_URL`: `https://rununbjiqblmlttdmgxu.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `<your-public-anon-key>`
5. Click **"Save and Deploy"**.
6. Cloudflare Pages builds and assigns your live URL: `https://institute-app.pages.dev`.
7. SPA client-side routing is handled automatically by `dist/_redirects`, and HTTP security headers are enforced via `dist/_headers`.

---

## 3. Post-Deployment Verification Checklist

1. [ ] Navigate to `https://institute-app.pages.dev` in an incognito window.
2. [ ] Confirm SSL certificate displays a valid lock icon.
3. [ ] Log in with initial Super Admin credentials (`saifirihan683@gmail.com`).
4. [ ] Perform a test student admission, record a test fee payment, and test print the receipt.
5. [ ] Navigate to Batch Attendance, mark attendance for today, and test Present/Absent filter tabs.
6. [ ] Click "Export" in header and test downloading the Full System JSON and Students CSV backup files.
7. [ ] Navigate to GitHub $\rightarrow$ **Actions** $\rightarrow$ Trigger the `daily-backup.yml` workflow manually via "Run workflow".
8. [ ] Confirm that encrypted `.sql.gpg` archive is uploaded to Cloudflare R2 and GitHub Artifacts.

---

## 4. Rollback Procedures

* **Rollback Frontend (Cloudflare Pages):** In Cloudflare Pages dashboard $\rightarrow$ Deployments $\rightarrow$ Select any previous deployment $\rightarrow$ Click **"Rollback to this deployment"** (takes $< 5$ seconds).
* **Rollback Database:** Restore from pre-migration backup snapshot using `psql`.
