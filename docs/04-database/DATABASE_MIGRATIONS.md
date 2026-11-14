# Database Migrations & Versioning Runbook

## 1. Migration Management Overview

All database schema modifications are managed as sequential SQL migration files checked into the `migrations/` directory of the repository. This guarantees complete auditability, reproducible local testing, and deterministic deployments.

---

## 2. Mandatory Pre-Migration Backup Rule

> [!CRITICAL]
> **Cardinal Operational Gate:** No database migration script may be executed against the production database without first generating an encrypted, verified full backup snapshot (`pg_dump` $\rightarrow$ GPG AES-256 $\rightarrow$ Cloudflare R2). If a migration fails or corrupts data, this snapshot provides an immediate zero-data-loss rollback point.

---

## 3. Migration Directory Structure & Naming Standard

Migration files adhere to a zero-padded 4-digit sequential prefix followed by a concise descriptive slug:

```
migrations/
  ├── 0001_initial_schema.sql         # Base tables, constraints & indexes
  ├── 0002_create_fee_summary_view.sql # Real-time fee summary view
  ├── 0003_create_stored_functions.sql # Stored RPCs (batch attendance, reversals)
  ├── 0004_enable_rls_policies.sql    # Row Level Security policies
  └── 0005_seed_super_admin.sql       # Initial Super Admin profile seeding
```

### 3.1 Schema Version Tracking Table
A lightweight metadata table tracks applied migrations in the database:

```sql
CREATE TABLE IF NOT EXISTS public._schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
```

---

## 4. Migration Execution Runbook

### Step 1: Pre-Migration Backup
```bash
# Execute full snapshot before running any DDL
pg_dump "$SUPABASE_DB_URL" \
  --clean --if-exists --no-owner --no-privileges \
  -F p -f pre_migration_backup.sql

gpg --batch --yes --passphrase "$BACKUP_ENCRYPTION_KEY" \
  --symmetric --cipher-algo AES256 \
  -o "pre_migration_$(date +%Y%m%d_%H%M%S).sql.gpg" pre_migration_backup.sql

# Upload to Cloudflare R2
aws s3 cp pre_migration_*.sql.gpg s3://$R2_BUCKET/pre-migrations/ \
  --endpoint-url $R2_ENDPOINT
```

### Step 2: Apply Migration
```bash
psql "$SUPABASE_DB_URL" -f migrations/000X_new_migration.sql
```

### Step 3: Record Version
```sql
INSERT INTO public._schema_migrations (version) VALUES ('000X_new_migration.sql');
```

### Step 4: Post-Migration Verification
Execute smoke queries to verify that existing tables, views, and RLS policies remain functional.

---

## 5. Rollback Procedures

1. **Revert Scripts:** For every migration `migrations/000X_slug.sql`, a corresponding rollback file `migrations/revert/000X_slug_revert.sql` is authored and maintained.
2. **Emergency Database Restoration:** If a migration introduces severe data corruption or table lockouts, restore the pre-migration snapshot generated in Step 1:
   ```bash
   gpg --batch --passphrase "$BACKUP_ENCRYPTION_KEY" --decrypt pre_migration_*.sql.gpg > restore.sql
   psql "$SUPABASE_DB_URL" -f restore.sql
   ```
