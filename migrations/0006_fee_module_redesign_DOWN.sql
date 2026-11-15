-- ============================================================================
-- DOWNWARD MIGRATION: 0006_fee_module_redesign_DOWN.sql
-- Module: Reverts Monthly Fee Engine, Advance Fee Module & Outbox
-- Safety: Preserves public.students demographic data, total_fee, and 
--         public.fee_payments transaction rows with ZERO data loss.
-- ============================================================================

BEGIN;

-- 1. UNSCHEDULE PG_CRON JOB (If registered)
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

-- 5. REVERT NEW COLUMNS ON EXISTING TABLES
-- Note: Only drop the newly added optional email column.
-- students.total_fee is pre-existing and remains 100% untouched!
ALTER TABLE public.students 
  DROP COLUMN IF EXISTS email;

COMMIT;

-- Verification of core table integrity post-rollback
SELECT 
  'students' as table_name, count(*) as row_count FROM public.students
UNION ALL
SELECT 
  'fee_payments', count(*) FROM public.fee_payments;
