# Database Migrations & Versioning Runbook

## 1. Migration Management Overview

All database schema modifications are managed as sequential SQL migration files checked into the `migrations/` directory of the repository. This guarantees complete auditability, reproducible testing, and deterministic deployments.

---

## 2. Mandatory Pre-Migration Backup Rule

> [!CRITICAL]
> **Cardinal Operational Gate:** No database migration script may be executed against the production database without first generating an encrypted, verified full backup snapshot (`pg_dump` $\rightarrow$ GPG AES-256 $\rightarrow$ Cloudflare R2). If a migration fails or corrupts data, this snapshot provides an immediate zero-data-loss rollback point.

---

## 3. Migration Directory Structure & Naming Standard

Migration files adhere to a zero-padded 4-digit sequential prefix followed by a concise descriptive slug:

```
migrations/
  ├── 0001_initial_schema.sql          # Base tables, constraints & indexes (Asia/Kolkata timezone)
  ├── 0002_create_fee_summary_view.sql  # Real-time fee summary view (security_invoker = true)
  ├── 0003_create_stored_functions.sql  # Stored RPCs (mark_batch_attendance, reverse_payment)
  ├── 0004_enable_rls_policies.sql     # Row Level Security policies (super_admin & manager)
  ├── 0005_seed_super_admin.sql        # Initial Super Admin profile trigger (saifirihan683@gmail.com)
  └── tests/
      └── verify_phase1_security.sql   # Automated 14-point security and constraint verification suite
```

### 3.1 Schema Version Tracking Table
A lightweight metadata table tracks applied migrations in the database:

```sql
CREATE TABLE IF NOT EXISTS public._schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')
);
```

---

## 4. Migration Execution Runbook

### Step 1: Pre-Migration Backup
```bash
# Execute full snapshot before running any DDL in production
pg_dump "$SUPABASE_DB_URL" \
  --clean --if-exists --no-owner --no-privileges \
  -F p -f pre_migration_backup.sql

gpg --batch --yes --trust-model always --encrypt \
  --recipient "Z Institute Backup" \
  -o "pre_migration_$(date +%Y%m%d_%H%M%S).sql.gpg" pre_migration_backup.sql

# Upload to Cloudflare R2
aws s3 cp pre_migration_*.sql.gpg s3://$R2_BUCKET/pre-migrations/ --endpoint-url $R2_ENDPOINT
```

### Step 2: Apply Migrations
Execute sequentially via Supabase SQL Editor or `psql`:
```bash
psql "$SUPABASE_DB_URL" -f migrations/0001_initial_schema.sql
psql "$SUPABASE_DB_URL" -f migrations/0002_create_fee_summary_view.sql
psql "$SUPABASE_DB_URL" -f migrations/0003_create_stored_functions.sql
psql "$SUPABASE_DB_URL" -f migrations/0004_enable_rls_policies.sql
psql "$SUPABASE_DB_URL" -f migrations/0005_seed_super_admin.sql
```

### Step 3: Run Automated Verification Suite
Execute `migrations/tests/verify_phase1_security.sql`:
- Runs all 14 security, RLS, and constraint tests inside a self-contained transaction.
- Rolls back test data automatically.
- Every test must report `PASS`.

---

## 5. Rollback Procedures

If a migration fails or introduces anomalies:
1. Review test output from `verify_phase1_security.sql`.
2. Restore from the pre-migration snapshot generated in Step 1:
   ```bash
   gpg --batch --decrypt pre_migration_*.sql.gpg > restore.sql
   psql "$SUPABASE_DB_URL" -f restore.sql
   ```
