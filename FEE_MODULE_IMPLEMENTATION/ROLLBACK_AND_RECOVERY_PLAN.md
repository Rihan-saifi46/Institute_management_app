# Rollback & Recovery Plan: Monthly Billing & Advance Fee Module

**Document Version:** 1.1.0 (Synchronized with Owner Decisions of 15-Nov-2026)  
**Target Tables:** Safe revert leaving `public.students` and `public.fee_payments` 100% intact.  
**Standard Timezone:** `Asia/Kolkata` (IST, UTC+05:30)

---

## 1. Safety & Rollback Philosophy

Financial systems demand zero tolerance for data loss or operational downtime. The architecture of the Monthly Fee & Advance Fee redesign was engineered specifically for **safe, non-destructive coexistence**:

1. **Pre-Existing Ledger Untouched**: The primary financial ledger `public.fee_payments` remains the underlying source of truth. Rollback does not require altering or deleting historical rows from `fee_payments`.
2. **Reversible Relational Topology**: All new tables (`fee_periods`, `monthly_fee_dues`, `advance_fee_records`, `fee_payment_allocations`, `email_outbox`, `monthly_generation_logs`) are additive junction tables that point to existing core tables via foreign keys. Dropping or disconnecting them leaves legacy core tables (`students`, `courses`, `batches`, `fee_payments`) fully intact.
3. **Point-In-Time Backup Mandate**: No migration or schema alteration will be executed without an explicit, timestamped database dump verified beforehand.
4. **Existing Student Fee Field Protected**: The student's fee column `students.total_fee` is pre-existing and is **never** dropped or altered during rollback.

---

## 2. Pre-Migration Safety Check & Backup Procedure

Prior to executing any migration scripts, the administrator must perform a full logical backup:

### 2.1. Manual Database Snapshot
Execute from an administrative shell with database connection:
```bash
# 1. Create a timestamped backup directory
mkdir -p backups/pre_fee_redesign_$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/pre_fee_redesign_$(date +%Y%m%d_%H%M%S)"

# 2. Dump full database (schema + data)
pg_dump --clean --if-exists --no-owner --no-privileges \
  --format=c \
  --file="${BACKUP_DIR}/pre_migration_full.dump" \
  "$DATABASE_URL"

# 3. Dump plain-text schema for instant visual diff
pg_dump --schema-only --no-owner --no-privileges \
  --file="${BACKUP_DIR}/pre_migration_schema.sql" \
  "$DATABASE_URL"

# 4. Verify integrity of dump
pg_restore --list "${BACKUP_DIR}/pre_migration_full.dump" > /dev/null
echo "Pre-migration backup verified successfully at ${BACKUP_DIR}"
```

---

## 3. Database Migration Rollback (Downward Migration Script)

If the owner or engineering team decides to abort or rollback the deployment, execute the following SQL rollback script. It tears down the new components in strict reverse dependency order without touching existing legacy tables.

### `migrations/0006_fee_module_redesign_DOWN.sql`

```sql
-- ============================================================================
-- DOWNWARD MIGRATION: REVERT MONTHLY FEE ENGINE & ADVANCE FEE REDESIGN
-- Safe Downward Script: Leaves 'students' and 'fee_payments' records intact.
-- ============================================================================

BEGIN;

-- 1. DROP SCHEDULED CRON JOBS (If registered)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('generate-monthly-dues-auto');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron unschedule skipped: %', SQLERRM;
END $$;

-- 2. DROP VIEWS
DROP VIEW IF EXISTS public.monthly_due_status_view CASCADE;

-- 3. DROP STORED PROCEDURES & RPCs
DROP FUNCTION IF EXISTS public.collect_monthly_fee(UUID, NUMERIC, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.record_advance_fee(UUID, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.apply_advance_adjustments(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.generate_monthly_dues(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.void_advance_fee(UUID, TEXT) CASCADE;

-- 4. DROP NEW TABLES (Reverse Foreign Key Order)
DROP TABLE IF EXISTS public.email_outbox CASCADE;
DROP TABLE IF EXISTS public.monthly_generation_logs CASCADE;
DROP TABLE IF EXISTS public.fee_payment_allocations CASCADE;
DROP TABLE IF EXISTS public.advance_fee_records CASCADE;
DROP TABLE IF EXISTS public.monthly_fee_dues CASCADE;
DROP TABLE IF EXISTS public.fee_periods CASCADE;

-- 5. REVERT NEW COLUMNS ON EXISTING TABLES (Optional / Safe)
-- Only drop the newly added optional email column; students.total_fee is PRESERVED intact!
ALTER TABLE public.students 
  DROP COLUMN IF EXISTS email;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERY POST-ROLLBACK
-- Ensures core tables exist and row counts match pre-migration state.
-- ============================================================================
SELECT 
  'students' as table_name, count(*) as row_count FROM public.students
UNION ALL
SELECT 
  'fee_payments', count(*) FROM public.fee_payments;
```

---

## 4. Frontend Code Rollback Procedure

The frontend codebase is managed under Git version control.

### Step-by-Step Git Revert:
1. **Identify Rollback Boundary**:
   Before merging the fee redesign branch into `main`, tag the pre-redesign commit:
   ```bash
   git tag pre-fee-redesign-baseline
   ```
2. **Revert Frontend Deployment**:
   If an issue occurs in production, revert the branch or checkout the baseline tag:
   ```bash
   git checkout pre-fee-redesign-baseline
   npm run build
   ```
3. **Feature Flag Fallback (Alternative Zero-Deployment Revert)**:
   The application router supports an environment flag `VITE_ENABLE_MONTHLY_FEE_ENGINE=false`.
   - When set to `false`, `App.tsx` routes `/fees` to the legacy `FeesPage.tsx` component and hides `/advance-fees` from the navigation sidebar.
   - This provides an instant, zero-downtime kill-switch if a production defect arises without requiring a Git revert or redeployment.

---

## 5. Post-Rollback Validation Checklist

After executing a database and/or frontend rollback, run this verification protocol:

1. **Database Integrity Verification**:
   - [ ] Execute `SELECT count(*) FROM public.students;` — count matches pre-migration count.
   - [ ] Execute `SELECT count(*) FROM public.fee_payments;` — count matches pre-migration count.
   - [ ] Execute `SELECT sum(amount) FROM public.fee_payments;` — total financial ledger matches exactly.
2. **Legacy Workflow Verification**:
   - [ ] Open `/fees` in browser.
   - [ ] Verify existing student fee summaries load without errors.
   - [ ] Record a test payment using the legacy payment modal on a disposable test record.
   - [ ] Verify payment appears in the payment history list and summary updates properly.
   - [ ] Verify CSV export generates correctly.
3. **Log & Sentry Check**:
   - [ ] Verify browser console is free of uncaught exceptions.
   - [ ] Verify server logs indicate zero missing table / missing RPC errors.

---

## 6. Disaster Recovery: Full Database Restore

If a catastrophe occurs during database migration (e.g. power failure during migration script):

```bash
# 1. Terminate active database connections
psql "$DATABASE_URL" -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE datname = current_database() AND pid <> pg_backend_pid();
"

# 2. Restore from full pre-migration snapshot
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="$DATABASE_URL" \
  "${BACKUP_DIR}/pre_migration_full.dump"

# 3. Re-run verification query
psql "$DATABASE_URL" -c "
  SELECT count(*) FROM public.students;
  SELECT count(*) FROM public.fee_payments;
"
```
Recovery time objective (RTO): $< 5 \text{ minutes}$.  
Recovery point objective (RPO): $0 \text{ seconds}$ (Zero transaction loss).
