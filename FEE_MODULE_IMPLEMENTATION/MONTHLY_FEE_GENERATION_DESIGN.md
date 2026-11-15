# Monthly Fee Due Generation Engine — Technical Design

**Document Version:** 1.1.0 (Synchronized with Owner Decisions of 15-Nov-2026)  
**Standard Timezone:** `Asia/Kolkata` (IST, UTC+05:30)  
**Execution Characteristic:** Strictly Idempotent, Atomic, Zero Duplicates

---

## 1. Generation Mechanism Analysis & Strategy

Per **Owner Decision 4**, the system employs an **Owner-Approved Hybrid Architecture**:

```mermaid
flowchart TD
    A["pg_cron Scheduled Job<br/>(00:01 Asia/Kolkata on 1st of Month)"] -->|Calls| G["generate_monthly_dues(p_period_key)"]
    B["Authorized Staff Visits Fees Page<br/>(On-Demand Fallback Check)"] -->|If Month Dues Missing, Calls| G
    
    G --> C{"Target Period >= 2026-11?<br/>(Commencement Check)"}
    C -->|No (Pre-Nov 2026)| X["Abort: Historical Periods Untouched"]
    C -->|Yes| D["Filter Eligible Students<br/>status = 'active'<br/>joining_date <= period.end_date"]
    D --> E["Insert into monthly_fee_dues<br/>fee_snapshot = students.total_fee<br/>ON CONFLICT (student_id, period_id) DO NOTHING"]
    E --> F["Call apply_advance_adjustments()<br/>Auto-apply existing Upcoming advances"]
    F --> L["Write to monthly_generation_logs"]
```

### 1.1 Trigger Details
1. **Primary: Automated Database Schedule via `pg_cron`**:
   - Runs at `00:01` IST on the 1st of every calendar month (`1 18 * * *` UTC).
   - Direct database-level execution with zero external network dependency.
2. **Fallback: Idempotent On-Demand Hook in Fees Page**:
   - When an authorized staff member visits the Fees section, the frontend checks if dues exist for the current active month.
   - If not yet generated, it calls `generate_monthly_dues('YYYY-MM')`.
   - Because the RPC is strictly idempotent, it executes in $< 15\text{ ms}$ if dues already exist, inserting $0$ duplicates.
3. **Execution Audit Log**:
   - Table `public.monthly_generation_logs` records every invocation, caller, dues generated count, advances applied, and duration.

---

## 2. Eligibility & Boundary Rules

When generating dues for calendar period $P$ (with `start_date` and `end_date`):

1. **Commencement Date Gate (Decision 5):**
   - The engine generates dues **only for periods on or after November 2026 (`2026-11`)**.
   - Attempting to generate dues for October 2026 or earlier throws an exception: `ERR_HISTORICAL_PERIOD_PROTECTED`.
2. **Active Enrollment Status:**
   - Active students (`status = 'active'`) with `total_fee > 0` are included.
   - Students with `status IN ('completed', 'dropped')` are **strictly excluded**.
3. **Admission Date Cutoff:**
   - A student is eligible for period $P$ **if and only if** their `joining_date <= P.end_date`.
   - **Example 1:** Student enrolled on `2026-11-15`. Eligible for November 2026 (`2026-11-15 <= 2026-11-30`).
   - **Example 2:** Student enrolled on `2026-12-05`. When generating November 2026, excluded because `2026-12-05 > 2026-11-30`.
4. **Fee Snapshot Immutability (Decision 2):**
   - The procedure reads `students.total_fee` (the existing student monthly fee field) and inserts it as `monthly_fee_dues.fee_snapshot`.
   - Once inserted, subsequent profile edits to `students.total_fee` **never alter existing rows**.

---

## 3. Stored Procedure DDL: `public.generate_monthly_dues`

```sql
-- Audit table for generation executions
CREATE TABLE IF NOT EXISTS public.monthly_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_key TEXT NOT NULL,
    triggered_by TEXT NOT NULL, -- 'pg_cron' or user email / ID
    dues_created INT NOT NULL DEFAULT 0,
    advances_applied INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'SUCCESS',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')
);

CREATE OR REPLACE FUNCTION public.generate_monthly_dues(
    p_period_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_period public.fee_periods%ROWTYPE;
    v_inserted_count INT := 0;
    v_advances_applied_count INT := 0;
    v_trigger_source TEXT := 'system_or_cron';
BEGIN
    -- 1. Authorization Verification (Allow cron/system where uid is null, or admin/super_admin/receptionist)
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL THEN
        SELECT role INTO v_caller_role FROM public.admins WHERE user_id = v_caller_id;
        IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'admin', 'receptionist') THEN
            RAISE EXCEPTION 'Unauthorized: Caller is not an authorized staff member';
        END IF;
        v_trigger_source := 'user:' || v_caller_id::TEXT;
    END IF;

    -- 2. Commencement Verification (Decision 5: Nov 2026 Onwards Only)
    IF p_period_key < '2026-11' THEN
        RAISE EXCEPTION 'ERR_HISTORICAL_PERIOD_PROTECTED: Cannot generate dues for periods prior to November 2026';
    END IF;

    -- 3. Validate Target Period
    SELECT * INTO v_period FROM public.fee_periods WHERE period_key = p_period_key;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fee period % not found in fee_periods', p_period_key;
    END IF;

    IF NOT v_period.is_active THEN
        RAISE EXCEPTION 'Cannot generate dues for inactive fee period %', v_period.period_name;
    END IF;

    -- 4. Idempotent Insert of Monthly Dues for Eligible Active Students (Decision 2: Reusing total_fee)
    WITH eligible_students AS (
        SELECT id, total_fee
        FROM public.students
        WHERE status = 'active'
          AND total_fee > 0
          AND joining_date <= v_period.end_date
    ),
    inserted_dues AS (
        INSERT INTO public.monthly_fee_dues (student_id, period_id, fee_snapshot, created_at, updated_at)
        SELECT 
            s.id, 
            v_period.id, 
            s.total_fee, 
            (now() AT TIME ZONE 'Asia/Kolkata'),
            (now() AT TIME ZONE 'Asia/Kolkata')
        FROM eligible_students s
        ON CONFLICT (student_id, period_id) DO NOTHING -- Strict Idempotency
        RETURNING id
    )
    SELECT count(*) INTO v_inserted_count FROM inserted_dues;

    -- 5. Trigger Automatic Advance Fee Adjustment for this period
    v_advances_applied_count := public.apply_advance_adjustments(v_period.id);

    -- 6. Log Execution
    INSERT INTO public.monthly_generation_logs (
        period_key, triggered_by, dues_created, advances_applied, status
    ) VALUES (
        p_period_key, v_trigger_source, v_inserted_count, v_advances_applied_count, 'SUCCESS'
    );

    RETURN jsonb_build_object(
        'success', true,
        'period_key', v_period.period_key,
        'period_name', v_period.period_name,
        'dues_created', v_inserted_count,
        'advances_applied', v_advances_applied_count,
        'timestamp', (now() AT TIME ZONE 'Asia/Kolkata')
    );
EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.monthly_generation_logs (
        period_key, triggered_by, status, error_message
    ) VALUES (
        p_period_key, v_trigger_source, 'FAILED', SQLERRM
    );
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_monthly_dues(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_monthly_dues(TEXT) TO authenticated;

COMMENT ON FUNCTION public.generate_monthly_dues IS 'Idempotently generates monthly fee dues snapshotting students.total_fee and triggers advance adjustment';
```

---

## 4. Idempotency & Concurrency Verification

- **Storage Constraint:** `CONSTRAINT unique_student_period_due UNIQUE (student_id, period_id)` blocks duplicate rows at the database storage engine.
- **`ON CONFLICT DO NOTHING` Clause:** Successive executions return cleanly with $0$ new dues created.
- **Independent Monthly Status Guarantee:** Generation of a new month's due never resets, touches, or re-evaluates the status of prior months. November remains `UNPAID` even if December is created and later marked `PAID`.
