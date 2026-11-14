# Backup & Disaster Recovery Operational Runbook

## 1. Overview & Operational Principles

This runbook establishes mandatory Standard Operating Procedures (SOPs) for executing backups, performing disaster recovery restorations, and conducting monthly restore verification drills for **Z Institute**.

> [!CRITICAL]
> **Cardinal Rules & Operational Realities:**
> 1. **Supabase Free Tier does NOT include automated daily downloadable backups or Point-in-Time Recovery (PITR).** The procedures in this runbook provide the sole authoritative disaster recovery mechanism for the institute.
> 2. **A backup that has never been restored in a verification drill is an unverified assumption.** Monthly isolated restore verification is a mandatory operational requirement.
> 3. **In-app CSV and JSON exports are data portability tools, NOT disaster recovery backups.** They do not restore schemas, constraints, credentials, RLS policies, views, or stored functions.
> 4. **Inactivity-related project pausing on Supabase Free is NOT data deletion.** Compute pauses after 7 days of inactivity; all data remains safely stored and is restored within 2–4 minutes via a single click in the Supabase Dashboard.

---

## 2. Standard Operating Procedures (SOP)

### SOP-01: Automated Daily Backup Execution & Integrity Verification
* **Frequency:** Scheduled daily at 00:00 UTC (automated via GitHub Actions).
* **Cron Jitter & Manual Trigger:** Scheduled workflows are subject to GitHub runner queue delays. A manual trigger (`workflow_dispatch`) is always available in the GitHub Actions tab for immediate on-demand execution.
* **Alert Recipient:** Backup failure alerts and stale backup notifications are delivered to **`saifirihan683@gmail.com`**.
* **Step-by-Step Workflow Pipeline:**
  1. Ephemeral runner installs `postgresql-client` and AWS CLI.
  2. Executes full PostgreSQL dump:
     ```bash
     pg_dump "$SUPABASE_DB_URL" \
       --clean --if-exists --no-owner --no-privileges \
       -F p -f daily_snapshot.sql
     ```
  3. **Integrity Verification Gate (Pre-Encryption):**
     - Verify file size exceeds minimum threshold ($\ge 10 \text{ KB}$):
       ```bash
       FILE_SIZE=$(stat -c%s daily_snapshot.sql 2>/dev/null || stat -f%z daily_snapshot.sql)
       if [ "$FILE_SIZE" -lt 10240 ]; then
         echo "ERROR: Backup file size ($FILE_SIZE bytes) below minimum expected threshold." >&2
         exit 1
       fi
       ```
     - Verify PostgreSQL trailer/header presence:
       ```bash
       grep -q "PostgreSQL database dump complete" daily_snapshot.sql || {
         echo "ERROR: PostgreSQL dump trailer missing or incomplete." >&2
         exit 1
       }
       ```
  4. **GPG Asymmetric Encryption:**
     - Imports the public encryption key (`GPG_PUBLIC_KEY` stored in GitHub Secrets):
       ```bash
       echo "$GPG_PUBLIC_KEY" | gpg --import
       gpg --batch --yes --trust-model always --encrypt \
         --recipient "Z Institute Backup" \
         -o "institute_backup_$(date +%Y%m%d).sql.gpg" daily_snapshot.sql
       ```
     - *Note:* The private decryption key is kept strictly offline by the institute owner and is never committed or uploaded.
  5. **Checksum Generation:**
     ```bash
     sha256sum "institute_backup_$(date +%Y%m%d).sql.gpg" > "institute_backup_$(date +%Y%m%d).sql.gpg.sha256"
     ```
  6. **Upload Primary Copy to Cloudflare R2:**
     ```bash
     aws s3 cp "institute_backup_$(date +%Y%m%d).sql.gpg" s3://$R2_BUCKET/daily/ --endpoint-url $R2_ENDPOINT
     aws s3 cp "institute_backup_$(date +%Y%m%d).sql.gpg.sha256" s3://$R2_BUCKET/daily/ --endpoint-url $R2_ENDPOINT
     ```
  7. **Upload Secondary Copy to GitHub Private Releases:**
     ```bash
     gh release upload "backup-$(date +%Y%m%d)" \
       "institute_backup_$(date +%Y%m%d).sql.gpg" \
       "institute_backup_$(date +%Y%m%d).sql.gpg.sha256"
     ```
  8. **Update Timestamp Heartbeat Metadata:**
     ```bash
     echo "{\"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"status\": \"SUCCESS\", \"size_bytes\": $FILE_SIZE}" > latest_backup_timestamp.json
     aws s3 cp latest_backup_timestamp.json s3://$R2_BUCKET/metadata/ --endpoint-url $R2_ENDPOINT
     ```
  9. **Alerting on Failure:** If any step fails, GitHub Actions triggers an immediate notification email to `saifirihan683@gmail.com`.

---

### SOP-02: Mandatory Pre-Migration Encrypted Backup
* **Trigger:** Must be executed immediately before applying any SQL migration file to production.
* **Procedure:**
  ```bash
  pg_dump "$SUPABASE_DB_URL" --clean --if-exists --no-owner --no-privileges -F p -f pre_migration.sql
  
  # Verify integrity
  test $(stat -c%s pre_migration.sql) -ge 10240 || exit 1
  grep -q "PostgreSQL database dump complete" pre_migration.sql || exit 1

  # Encrypt with public key
  gpg --batch --yes --trust-model always --encrypt --recipient "Z Institute Backup" \
    -o "pre_migration_$(date +%Y%m%d_%H%M%S).sql.gpg" pre_migration.sql
  
  sha256sum "pre_migration_$(date +%Y%m%d_%H%M%S).sql.gpg" > "pre_migration_$(date +%Y%m%d_%H%M%S).sql.gpg.sha256"

  # Upload
  aws s3 cp pre_migration_*.sql.gpg s3://$R2_BUCKET/pre-migrations/ --endpoint-url $R2_ENDPOINT
  aws s3 cp pre_migration_*.sha256 s3://$R2_BUCKET/pre-migrations/ --endpoint-url $R2_ENDPOINT
  ```

---

### SOP-03: Monthly Isolated Restore Verification Drill
* **Frequency:** First Sunday of every calendar month.
* **Objective:** Prove that backup files can be decrypted using the offline private key and fully restored without syntax or integrity errors.
* **Step-by-Step Procedure:**
  1. Download the latest daily backup archive and checksum from Cloudflare R2:
     ```bash
     aws s3 cp s3://$R2_BUCKET/daily/institute_backup_latest.sql.gpg ./restore_test/ --endpoint-url $R2_ENDPOINT
     aws s3 cp s3://$R2_BUCKET/daily/institute_backup_latest.sql.gpg.sha256 ./restore_test/ --endpoint-url $R2_ENDPOINT
     ```
  2. Verify SHA-256 Checksum:
     ```bash
     cd restore_test && sha256sum -c institute_backup_latest.sql.gpg.sha256
     # Must output: OK
     ```
  3. Decrypt using the owner's offline private key:
     ```bash
     gpg --batch --decrypt institute_backup_latest.sql.gpg > test_restore.sql
     ```
  4. Spin up an isolated PostgreSQL container via Docker:
     ```bash
     docker run --name pg-restore-drill -e POSTGRES_PASSWORD=testpass -p 5433:5432 -d postgres:16
     ```
  5. Restore the snapshot into the test database:
     ```bash
     psql "postgresql://postgres:testpass@localhost:5433/postgres" -f test_restore.sql
     ```
  6. Execute integrity verification queries:
     ```sql
     -- Verify all tables restored with records
     SELECT 'students' AS entity, count(*) FROM public.students
     UNION ALL
     SELECT 'fee_payments', count(*) FROM public.fee_payments
     UNION ALL
     SELECT 'attendance', count(*) FROM public.attendance;

     -- Verify calculated view executes cleanly
     SELECT id, name, balance_due FROM public.student_fee_summary LIMIT 5;
     ```
  7. Stop and clean up test container:
     ```bash
     docker stop pg-restore-drill && docker rm pg-restore-drill
     ```
  8. Log the successful drill date in `docs/06-project-tracking/CHANGELOG.md`.

---

## 3. Disaster Recovery Runbooks by Failure Scenario

### Scenario 1: Accidental Record Deletion / Human Error
* **Trigger:** An administrator accidentally updates or deletes records, or an unverified script corrupts data.
* **RTO Target:** $\le 30$ minutes | **RPO:** $\le 24$ hours (or latest snapshot).
* **Recovery Steps:**
  1. Download and verify the most recent daily backup snapshot and checksum.
  2. Decrypt using the owner's offline private key.
  3. Restore the dump into a temporary test database.
  4. Extract only the missing/corrupted rows (e.g. `pg_dump -t public.students --data-only ...`).
  5. Reinsert the missing rows into the live production database.

---

### Scenario 2: Severe Data Corruption / Software Regression
* **Trigger:** A flawed migration script or application defect corrupts table relationships.
* **RTO Target:** $\le 45$ minutes | **RPO:** 0 hours (using pre-migration snapshot).
* **Recovery Steps:**
  1. Retrieve the pre-migration snapshot `pre_migration_*.sql.gpg` and checksum from Cloudflare R2.
  2. Decrypt with the offline private key.
  3. Connect to live Supabase database with administrator credentials.
  4. Execute full restoration:
     ```bash
     psql "$SUPABASE_DB_URL" -f pre_migration_decrypted.sql
     ```
  5. Run sanity queries to verify system returns to operational state.

---

### Scenario 3: Cloudflare Account Compromise or Storage Failure
* **Trigger:** Cloudflare account is suspended, credentials compromised, or R2 bucket corrupted.
* **RTO Target:** $\le 45$ minutes | **RPO:** $\le 24$ hours.
* **Recovery Steps:**
  1. Access the **secondary backup destination** (GitHub Private Releases).
  2. Download the duplicate encrypted `.sql.gpg` archive and checksum.
  3. Verify checksum and decrypt using the owner's offline private key.
  4. Restore into the production database.

---

### Scenario 4: Supabase Platform Outage or Total Provider Loss
* **Trigger:** Supabase experiences an unrecoverable extended outage or account lockout.
* **RTO Target:** $\le 60$ minutes | **RPO:** $\le 24$ hours.
* **Recovery Steps:**
  1. Retrieve the latest encrypted backup from Cloudflare R2 or GitHub Releases and decrypt locally with the offline private key.
  2. Provision a clean PostgreSQL instance on an alternate cloud provider (e.g. Neon, AWS RDS, DigitalOcean, or an on-premise institute PC).
  3. Restore full schema and data:
     ```bash
     psql "$NEW_DATABASE_URL" -f decrypted_backup.sql
     ```
  4. Update `VITE_SUPABASE_URL` in Cloudflare Pages to point to the new provider or updated edge API, and redeploy frontend.

---

## 4. Inactivity Pausing vs. Disaster Recovery Procedure

When the institute closes for extended holidays (e.g. 10-day break), Supabase Free may pause the project compute.

* **This is NOT a disaster recovery scenario.**
* **Do NOT attempt to restore backup files.**
* **Procedure to Resume Paused Project:**
  1. Institute owner logs into [Supabase Dashboard](https://supabase.com/dashboard).
  2. Locate the project card displaying the **"Paused"** badge.
  3. Click the green button: **"Restore Project"**.
  4. Wait approximately 2 to 4 minutes while Supabase reconnects the storage volume to an active compute container.
  5. Status changes to **"Active"**. The web application resumes immediate normal operation with 100% data intact.
