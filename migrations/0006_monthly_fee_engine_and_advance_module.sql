-- ============================================================================
-- MIGRATION: 0006_monthly_fee_engine_and_advance_module.sql
-- Module: Monthly Fee Engine, Advance Fee Recording, Month-Wise Allocation & Outbox
-- Author: Senior Database Architect
-- Standard Timezone: Asia/Kolkata (IST, UTC+05:30)
-- Governing Invariants: Absolute Ledger Immutability, Exact NUMERIC(10, 2) Math,
--                       Independent Monthly Statuses, Strict Full Payment Collection
-- ============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Schema Alterations on public.students
-- ------------------------------------------------------------------------------
-- Decision 1: Add optional student/parent email address
-- Decision 2: Reuse existing students.total_fee as authoritative monthly fee
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS email TEXT DEFAULT NULL;

COMMENT ON COLUMN public.students.total_fee IS 'Authoritative individual monthly tuition fee entered during student enrollment';
COMMENT ON COLUMN public.students.email IS 'Optional student/parent email address for advance receipts and notices';

-- ------------------------------------------------------------------------------
-- 2. Table: public.fee_periods (Billing Cycles)
-- ------------------------------------------------------------------------------
-- Standardized monthly billing calendar periods starting November 2026 (Decision 5)
CREATE TABLE IF NOT EXISTS public.fee_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_key TEXT NOT NULL UNIQUE, -- Standard format: 'YYYY-MM' (e.g. '2026-11')
    period_name TEXT NOT NULL,       -- Display name: 'November 2026'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    due_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'),

    CONSTRAINT check_period_dates CHECK (start_date <= end_date AND due_date >= start_date),
    CONSTRAINT check_period_key_format CHECK (period_key ~ '^\d{4}-\d{2}$')
);

CREATE INDEX IF NOT EXISTS idx_fee_periods_dates ON public.fee_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_fee_periods_active ON public.fee_periods(is_active);

COMMENT ON TABLE public.fee_periods IS 'Standardized monthly billing calendar periods starting November 2026';

-- Seed initial operational periods starting from November 2026
INSERT INTO public.fee_periods (period_key, period_name, start_date, end_date, due_date, is_active)
VALUES 
    ('2026-11', 'November 2026', '2026-11-01', '2026-11-30', '2026-11-10', true),
    ('2026-12', 'December 2026', '2026-12-01', '2026-12-31', '2026-12-10', true),
    ('2027-01', 'January 2027',   '2027-01-01', '2027-01-31', '2027-01-10', true),
    ('2027-02', 'February 2027',  '2027-02-01', '2027-02-28', '2027-02-10', true),
    ('2027-03', 'March 2027',     '2027-03-01', '2027-03-31', '2027-03-10', true)
ON CONFLICT (period_key) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 3. Table: public.monthly_fee_dues (Monthly Fee Due Obligations)
-- ------------------------------------------------------------------------------
-- Stores exactly one fee obligation per student per applicable month with snapshot
CREATE TABLE IF NOT EXISTS public.monthly_fee_dues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    period_id UUID NOT NULL REFERENCES public.fee_periods(id) ON DELETE RESTRICT,
    fee_snapshot NUMERIC(10, 2) NOT NULL, -- Permanent historical snapshot of students.total_fee
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'),

    CONSTRAINT check_due_amount_positive CHECK (fee_snapshot > 0),
    CONSTRAINT unique_student_period_due UNIQUE (student_id, period_id)
);

CREATE INDEX IF NOT EXISTS idx_monthly_dues_student ON public.monthly_fee_dues(student_id);
CREATE INDEX IF NOT EXISTS idx_monthly_dues_period ON public.monthly_fee_dues(period_id);

COMMENT ON TABLE public.monthly_fee_dues IS 'Authoritative monthly fee dues per student with immutable fee snapshots';

-- ------------------------------------------------------------------------------
-- 4. Table: public.fee_payment_allocations (Settlement Junction)
-- ------------------------------------------------------------------------------
-- Bridges immutable payment rows in public.fee_payments to specific monthly dues
CREATE TABLE IF NOT EXISTS public.fee_payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.fee_payments(id) ON DELETE RESTRICT,
    due_id UUID NOT NULL REFERENCES public.monthly_fee_dues(id) ON DELETE RESTRICT,
    allocated_amount NUMERIC(10, 2) NOT NULL,
    allocation_type TEXT NOT NULL DEFAULT 'normal_payment' 
        CHECK (allocation_type IN ('normal_payment', 'advance_adjustment')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'),

    CONSTRAINT check_allocated_amount_positive CHECK (allocated_amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_allocations_payment ON public.fee_payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_allocations_due ON public.fee_payment_allocations(due_id);

COMMENT ON TABLE public.fee_payment_allocations IS 'Immutable allocation mapping payments to specific monthly dues';

-- ------------------------------------------------------------------------------
-- 5. Table: public.advance_fee_records (Advance Deposits Registry)
-- ------------------------------------------------------------------------------
-- Manages future-period advance fee receipts and their lifecycle with audit tracking
CREATE TABLE IF NOT EXISTS public.advance_fee_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    target_period_id UUID NOT NULL REFERENCES public.fee_periods(id) ON DELETE RESTRICT,
    payment_id UUID NOT NULL REFERENCES public.fee_payments(id) ON DELETE RESTRICT,
    amount_received NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'Upcoming' 
        CHECK (status IN ('Upcoming', 'Partially Applied', 'Applied', 'Voided')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'),
    applied_at TIMESTAMPTZ,

    -- Admin Reversal Audit Fields (Decision 6)
    voided_by UUID REFERENCES auth.users(id),
    voided_at TIMESTAMPTZ,
    void_reason TEXT,
    reversal_payment_id UUID REFERENCES public.fee_payments(id),

    CONSTRAINT check_advance_amount_positive CHECK (amount_received > 0)
);

CREATE INDEX IF NOT EXISTS idx_advance_student ON public.advance_fee_records(student_id);
CREATE INDEX IF NOT EXISTS idx_advance_target_period ON public.advance_fee_records(target_period_id);
CREATE INDEX IF NOT EXISTS idx_advance_status ON public.advance_fee_records(status);

COMMENT ON TABLE public.advance_fee_records IS 'Ledger of advance tuition fees earmarked for specific future billing periods';

-- ------------------------------------------------------------------------------
-- 6. Table: public.email_outbox (Asynchronous Notification Queue)
-- ------------------------------------------------------------------------------
-- Decoupled transactional outbox for Resend Free Plan (Decision 1 & Decision 3)
CREATE TABLE IF NOT EXISTS public.email_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    advance_record_id UUID REFERENCES public.advance_fee_records(id) ON DELETE CASCADE,
    recipient_email TEXT,
    subject TEXT NOT NULL,
    template_name TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'sent', 'failed', 'not_required')),
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'),
    sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending 
ON public.email_outbox(status, created_at) 
WHERE status = 'pending';

COMMENT ON TABLE public.email_outbox IS 'Transactional outbox for asynchronous email notifications with retry capabilities';

-- ------------------------------------------------------------------------------
-- 7. Table: public.monthly_generation_logs (Execution Audit Trail)
-- ------------------------------------------------------------------------------
-- Records automated and on-demand monthly dues generation runs (Decision 4)
CREATE TABLE IF NOT EXISTS public.monthly_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_key TEXT NOT NULL,
    triggered_by TEXT NOT NULL,
    dues_created INT NOT NULL DEFAULT 0,
    advances_applied INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'SUCCESS',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')
);

COMMENT ON TABLE public.monthly_generation_logs IS 'Audit log of automated pg_cron and on-demand monthly fee generation executions';

-- ------------------------------------------------------------------------------
-- 8. View: public.monthly_due_status_view (Atomic Real-Time Status Calculation)
-- ------------------------------------------------------------------------------
-- Calculates payments, advances, outstanding balances, and independent month status
CREATE OR REPLACE VIEW public.monthly_due_status_view
WITH (security_invoker = true) AS
SELECT 
    d.id AS due_id,
    s.id AS student_id,
    s.admission_id,
    s.name AS student_name,
    s.phone AS student_phone,
    s.email AS student_email,
    s.course AS student_course,
    p.id AS period_id,
    p.period_key,
    p.period_name,
    p.start_date AS period_start,
    p.end_date AS period_end,
    p.due_date,
    d.fee_snapshot,
    
    -- Allocations from normal payments (net of reversals)
    COALESCE(
        SUM(
            CASE 
                WHEN a.allocation_type = 'normal_payment' AND pay.is_reversal = false THEN a.allocated_amount
                WHEN a.allocation_type = 'normal_payment' AND pay.is_reversal = true THEN -a.allocated_amount
                ELSE 0.00 
            END
        ), 0.00
    ) AS normal_paid_amount,

    -- Allocations from advances applied (net of reversals)
    COALESCE(
        SUM(
            CASE 
                WHEN a.allocation_type = 'advance_adjustment' AND pay.is_reversal = false THEN a.allocated_amount
                WHEN a.allocation_type = 'advance_adjustment' AND pay.is_reversal = true THEN -a.allocated_amount
                ELSE 0.00 
            END
        ), 0.00
    ) AS advance_applied_amount,

    -- Total Net Settled
    COALESCE(
        SUM(
            CASE 
                WHEN pay.is_reversal = true THEN -a.allocated_amount
                ELSE a.allocated_amount 
            END
        ), 0.00
    ) AS total_settled_amount,

    -- Outstanding Balance
    (
        d.fee_snapshot - COALESCE(
            SUM(
                CASE 
                    WHEN pay.is_reversal = true THEN -a.allocated_amount
                    ELSE a.allocated_amount 
                END
            ), 0.00
        )
    ) AS balance_remaining,

    -- Independent Monthly Status (PAID / PARTIAL / UNPAID)
    CASE 
        WHEN COALESCE(SUM(CASE WHEN pay.is_reversal = true THEN -a.allocated_amount ELSE a.allocated_amount END), 0.00) >= d.fee_snapshot THEN 'PAID'
        WHEN COALESCE(SUM(CASE WHEN pay.is_reversal = true THEN -a.allocated_amount ELSE a.allocated_amount END), 0.00) > 0 THEN 'PARTIAL'
        ELSE 'UNPAID'
    END AS status,

    -- Arrears Flag: Period has ended with balance remaining
    CASE 
        WHEN p.end_date < (now() AT TIME ZONE 'Asia/Kolkata')::DATE 
             AND (d.fee_snapshot - COALESCE(SUM(CASE WHEN pay.is_reversal = true THEN -a.allocated_amount ELSE a.allocated_amount END), 0.00)) > 0 
        THEN true 
        ELSE false 
    END AS is_arrears

FROM public.monthly_fee_dues d
JOIN public.students s ON d.student_id = s.id
JOIN public.fee_periods p ON d.period_id = p.id
LEFT JOIN public.fee_payment_allocations a ON d.id = a.due_id
LEFT JOIN public.fee_payments pay ON a.payment_id = pay.id
GROUP BY d.id, s.id, p.id;

COMMENT ON VIEW public.monthly_due_status_view IS 'Real-time calculation of month-wise fee dues, advance adjustments, remaining balances and independent statuses';

-- ------------------------------------------------------------------------------
-- 9. Stored Procedure: public.apply_advance_adjustments
-- ------------------------------------------------------------------------------
-- Links existing upcoming advances to newly generated monthly dues
CREATE OR REPLACE FUNCTION public.apply_advance_adjustments(
    p_period_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_rec RECORD;
    v_due RECORD;
    v_applied_count INT := 0;
    v_total_applied NUMERIC(10, 2);
BEGIN
    FOR v_rec IN
        SELECT a.id AS advance_id, a.student_id, a.payment_id, a.amount_received
        FROM public.advance_fee_records a
        WHERE a.target_period_id = p_period_id
          AND a.status IN ('Upcoming', 'Partially Applied')
        ORDER BY a.created_at ASC
    LOOP
        -- Find target monthly due
        SELECT id, fee_snapshot INTO v_due
        FROM public.monthly_fee_dues
        WHERE student_id = v_rec.student_id AND period_id = p_period_id;

        IF FOUND THEN
            -- Check if allocation already exists for this payment + due
            IF NOT EXISTS (
                SELECT 1 FROM public.fee_payment_allocations 
                WHERE payment_id = v_rec.payment_id AND due_id = v_due.id
            ) THEN
                INSERT INTO public.fee_payment_allocations (
                    payment_id, due_id, allocated_amount, allocation_type
                ) VALUES (
                    v_rec.payment_id, v_due.id, v_rec.amount_received, 'advance_adjustment'
                );

                -- Determine total applied advance for this student and period
                SELECT COALESCE(SUM(allocated_amount), 0.00) INTO v_total_applied
                FROM public.fee_payment_allocations
                WHERE due_id = v_due.id AND allocation_type = 'advance_adjustment';

                -- Update advance status
                IF v_total_applied >= v_due.fee_snapshot THEN
                    UPDATE public.advance_fee_records
                    SET status = 'Applied', applied_at = (now() AT TIME ZONE 'Asia/Kolkata')
                    WHERE id = v_rec.advance_id;
                ELSE
                    UPDATE public.advance_fee_records
                    SET status = 'Partially Applied', applied_at = (now() AT TIME ZONE 'Asia/Kolkata')
                    WHERE id = v_rec.advance_id;
                END IF;

                v_applied_count := v_applied_count + 1;
            END IF;
        END IF;
    END LOOP;

    RETURN v_applied_count;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_advance_adjustments(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_advance_adjustments(UUID) TO authenticated;

COMMENT ON FUNCTION public.apply_advance_adjustments IS 'Applies upcoming advances for a billing period to generated monthly dues';

-- ------------------------------------------------------------------------------
-- 10. Stored Procedure: public.generate_monthly_dues
-- ------------------------------------------------------------------------------
-- Idempotently generates monthly fee dues snapshotting students.total_fee (Decisions 2, 4, 5)
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
    -- 1. Authorization Verification (Allow cron/system where uid is null, or admin/super_admin/manager)
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL THEN
        SELECT role INTO v_caller_role FROM public.admins WHERE user_id = v_caller_id;
        IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'manager') THEN
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

-- ------------------------------------------------------------------------------
-- 11. Stored Procedure: public.collect_monthly_fee
-- ------------------------------------------------------------------------------
-- Enforces Owner-Approved Rule: Exact Full Payment Only, Rejects Partial & Overpayments
CREATE OR REPLACE FUNCTION public.collect_monthly_fee(
    p_due_id UUID,
    p_amount NUMERIC,
    p_payment_mode TEXT,
    p_receipt_number TEXT DEFAULT NULL,
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_due RECORD;
    v_student RECORD;
    v_period RECORD;
    v_allocated_total NUMERIC(10, 2) := 0.00;
    v_payable_outstanding NUMERIC(10, 2) := 0.00;
    v_payment_id UUID;
    v_allocation_id UUID;
    v_clean_receipt TEXT;
    v_clean_remarks TEXT;
BEGIN
    -- 1. Authorization check
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL THEN
        SELECT role INTO v_caller_role FROM public.admins WHERE user_id = v_caller_id;
        IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'manager') THEN
            RAISE EXCEPTION 'Unauthorized: Caller is not an authorized administrator';
        END IF;
    END IF;

    -- 2. Input validations
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero';
    END IF;

    IF p_payment_mode IS NULL OR p_payment_mode NOT IN ('cash', 'upi', 'bank_transfer', 'cheque') THEN
        RAISE EXCEPTION 'Invalid payment mode %', p_payment_mode;
    END IF;

    -- 3. Pessimistic Row Lock on target due
    SELECT * INTO v_due 
    FROM public.monthly_fee_dues 
    WHERE id = p_due_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Monthly fee due % not found', p_due_id;
    END IF;

    SELECT * INTO v_student FROM public.students WHERE id = v_due.student_id;
    SELECT * INTO v_period FROM public.fee_periods WHERE id = v_due.period_id;

    -- 4. Calculate current settled amount and net payable balance
    SELECT COALESCE(
        SUM(
            CASE 
                WHEN pay.is_reversal = true THEN -a.allocated_amount
                ELSE a.allocated_amount 
            END
        ), 0.00
    ) INTO v_allocated_total
    FROM public.fee_payment_allocations a
    JOIN public.fee_payments pay ON a.payment_id = pay.id
    WHERE a.due_id = p_due_id;

    v_payable_outstanding := v_due.fee_snapshot - v_allocated_total;

    -- 5. Strict Full Payment Invariants
    IF v_payable_outstanding <= 0.00 THEN
        RAISE EXCEPTION 'ERR_DUE_ALREADY_PAID: This monthly due has already been settled in full.';
    END IF;

    IF p_amount < v_payable_outstanding THEN
        RAISE EXCEPTION 'ERR_FULL_PAYMENT_REQUIRED: Partial payments are not allowed in normal collection. Outstanding amount is ₹%, attempted ₹%',
            v_payable_outstanding, p_amount;
    END IF;

    IF p_amount > v_payable_outstanding THEN
        RAISE EXCEPTION 'ERR_OVERPAYMENT_PROHIBITED: Overpayments are not allowed. Outstanding amount is ₹%, attempted ₹%',
            v_payable_outstanding, p_amount;
    END IF;

    -- 6. Insert immutable transaction row in fee_payments
    v_clean_receipt := NULLIF(trim(p_receipt_number), '');
    IF v_clean_receipt IS NULL THEN
        v_clean_receipt := 'REC-' || to_char((now() AT TIME ZONE 'Asia/Kolkata'), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6));
    END IF;
    v_clean_remarks := 'Fee for ' || v_period.period_name || COALESCE(': ' || trim(p_remarks), '');

    INSERT INTO public.fee_payments (
        student_id, amount, payment_date, payment_mode, receipt_number, remarks, is_reversal, created_by
    ) VALUES (
        v_due.student_id, p_amount, (now() AT TIME ZONE 'Asia/Kolkata')::DATE, p_payment_mode, v_clean_receipt, v_clean_remarks, false, v_caller_id
    ) RETURNING id INTO v_payment_id;

    -- 7. Insert allocation linking payment to due
    INSERT INTO public.fee_payment_allocations (
        payment_id, due_id, allocated_amount, allocation_type
    ) VALUES (
        v_payment_id, p_due_id, p_amount, 'normal_payment'
    ) RETURNING id INTO v_allocation_id;

    -- 8. Return comprehensive receipt json
    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'allocation_id', v_allocation_id,
        'due_id', p_due_id,
        'student_id', v_due.student_id,
        'student_name', v_student.name,
        'admission_id', v_student.admission_id,
        'period_key', v_period.period_key,
        'period_name', v_period.period_name,
        'amount_paid', p_amount,
        'fee_snapshot', v_due.fee_snapshot,
        'balance_remaining', 0.00,
        'status', 'PAID',
        'receipt_number', v_clean_receipt,
        'payment_mode', p_payment_mode,
        'payment_date', (now() AT TIME ZONE 'Asia/Kolkata')::DATE
    );
END;
$$;

REVOKE ALL ON FUNCTION public.collect_monthly_fee(UUID, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.collect_monthly_fee(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.collect_monthly_fee IS 'Enforces exact full payment of remaining monthly balance with pessimistic concurrency locking';

-- ------------------------------------------------------------------------------
-- 12. Stored Procedure: public.record_advance_fee
-- ------------------------------------------------------------------------------
-- Accepts advance for future periods, enforces ceiling on students.total_fee, enqueues email
CREATE OR REPLACE FUNCTION public.record_advance_fee(
    p_student_id UUID,
    p_target_period_key TEXT,
    p_amount NUMERIC,
    p_payment_mode TEXT,
    p_receipt_number TEXT DEFAULT NULL,
    p_remarks TEXT DEFAULT NULL,
    p_student_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_student public.students%ROWTYPE;
    v_period public.fee_periods%ROWTYPE;
    v_existing_advances NUMERIC(10, 2) := 0.00;
    v_payment_id UUID;
    v_advance_id UUID;
    v_clean_receipt TEXT;
    v_clean_remarks TEXT;
    v_recipient_email TEXT;
    v_outbox_status TEXT := 'not_required';
BEGIN
    -- 1. Authorization Check
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL THEN
        SELECT role INTO v_caller_role FROM public.admins WHERE user_id = v_caller_id;
        IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'manager') THEN
            RAISE EXCEPTION 'Unauthorized: Caller is not an authorized administrator';
        END IF;
    END IF;

    -- 2. Input Validations
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Advance amount must be greater than zero';
    END IF;

    IF p_payment_mode IS NULL OR p_payment_mode NOT IN ('cash', 'upi', 'bank_transfer', 'cheque') THEN
        RAISE EXCEPTION 'Invalid payment mode %', p_payment_mode;
    END IF;

    -- 3. Validate Student & Existing Monthly Fee (Decision 2)
    SELECT * INTO v_student FROM public.students WHERE id = p_student_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student % not found', p_student_id;
    END IF;

    IF v_student.status != 'active' THEN
        RAISE EXCEPTION 'Cannot record advance fee for inactive student (status: %)', v_student.status;
    END IF;

    IF v_student.total_fee IS NULL OR v_student.total_fee <= 0 THEN
        RAISE EXCEPTION 'Student % does not have a configured monthly fee amount', v_student.name;
    END IF;

    -- 4. Validate Target Period (Must be in future)
    SELECT * INTO v_period FROM public.fee_periods WHERE period_key = p_target_period_key;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target fee period % not found', p_target_period_key;
    END IF;

    IF v_period.start_date <= (now() AT TIME ZONE 'Asia/Kolkata')::DATE THEN
        RAISE EXCEPTION 'Target period % is not a future period. Use normal Fees section for current/past dues.', v_period.period_name;
    END IF;

    -- 5. Validate Ceiling Invariant using students.total_fee (Decision 2)
    SELECT COALESCE(SUM(amount_received), 0.00) INTO v_existing_advances
    FROM public.advance_fee_records
    WHERE student_id = p_student_id
      AND target_period_id = v_period.id
      AND status IN ('Upcoming', 'Partially Applied');

    IF (v_existing_advances + p_amount) > v_student.total_fee THEN
        RAISE EXCEPTION 'ERR_ADVANCE_CEILING_EXCEEDED: Advance allocation exceeds monthly fee. Applicable monthly fee: ₹%, Already recorded: ₹%, Attempted: ₹%. Maximum allowed: ₹%',
            v_student.total_fee, v_existing_advances, p_amount, (v_student.total_fee - v_existing_advances);
    END IF;

    -- 6. Insert Immutable Transaction Row in public.fee_payments
    v_clean_receipt := NULLIF(trim(p_receipt_number), '');
    IF v_clean_receipt IS NULL THEN
        v_clean_receipt := 'REC-ADV-' || to_char((now() AT TIME ZONE 'Asia/Kolkata'), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6));
    END IF;
    v_clean_remarks := 'Advance fee for ' || v_period.period_name || COALESCE(': ' || trim(p_remarks), '');

    INSERT INTO public.fee_payments (
        student_id, amount, payment_date, payment_mode, receipt_number, remarks, is_reversal, created_by
    ) VALUES (
        p_student_id, p_amount, (now() AT TIME ZONE 'Asia/Kolkata')::DATE, p_payment_mode, v_clean_receipt, v_clean_remarks, false, v_caller_id
    ) RETURNING id INTO v_payment_id;

    -- 7. Insert Advance Record
    INSERT INTO public.advance_fee_records (
        student_id, target_period_id, payment_id, amount_received, status, created_by
    ) VALUES (
        p_student_id, v_period.id, v_payment_id, p_amount, 'Upcoming', v_caller_id
    ) RETURNING id INTO v_advance_id;

    -- 8. Email Outbox Enqueueing (Decision 1: Optional Email)
    v_recipient_email := COALESCE(NULLIF(trim(p_student_email), ''), v_student.email);
    IF v_recipient_email IS NOT NULL AND length(v_recipient_email) > 0 THEN
        v_outbox_status := 'pending';
    END IF;

    INSERT INTO public.email_outbox (
        student_id, advance_record_id, recipient_email, subject, template_name, payload, status
    ) VALUES (
        p_student_id,
        v_advance_id,
        v_recipient_email,
        'Advance Fee Payment Receipt — ' || v_period.period_name,
        'advance_receipt',
        jsonb_build_object(
            'student_name', v_student.name,
            'admission_id', v_student.admission_id,
            'target_month', v_period.period_name,
            'amount', p_amount,
            'receipt_number', v_clean_receipt,
            'payment_mode', p_payment_mode,
            'date', (now() AT TIME ZONE 'Asia/Kolkata')::DATE
        ),
        v_outbox_status
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'advance_id', v_advance_id,
        'receipt_number', v_clean_receipt,
        'amount', p_amount,
        'target_period', v_period.period_name,
        'email_status', v_outbox_status
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_advance_fee(UUID, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_advance_fee(UUID, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.record_advance_fee IS 'Records advance fee earmarked for future billing month, validates ceiling, and enqueues receipt';

-- ------------------------------------------------------------------------------
-- 13. Stored Procedure: public.void_advance_fee (Decision 6)
-- ------------------------------------------------------------------------------
-- Super-Admin RPC that creates an auditable reversal in fee_payments and voids advance
CREATE OR REPLACE FUNCTION public.void_advance_fee(
    p_advance_id UUID,
    p_void_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_adv public.advance_fee_records%ROWTYPE;
    v_orig_pay public.fee_payments%ROWTYPE;
    v_reversal_pay_id UUID;
    v_reversal_receipt TEXT;
BEGIN
    -- 1. Strict Super-Admin Authorization Check (Decision 6)
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT role INTO v_caller_role FROM public.admins WHERE user_id = v_caller_id;
    IF v_caller_role IS NULL OR v_caller_role != 'super_admin' THEN
        RAISE EXCEPTION 'Forbidden: Only super administrators can cancel advance fees. Managers and receptionists are strictly prohibited.';
    END IF;

    -- 2. Validate Reason
    IF p_void_reason IS NULL OR length(trim(p_void_reason)) < 5 THEN
        RAISE EXCEPTION 'A detailed cancellation reason (at least 5 characters) is required for audit compliance.';
    END IF;

    -- 3. Lock & Retrieve Advance Record
    SELECT * INTO v_adv 
    FROM public.advance_fee_records 
    WHERE id = p_advance_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Advance record % not found', p_advance_id;
    END IF;

    IF v_adv.status = 'Voided' THEN
        RAISE EXCEPTION 'This advance record has already been voided';
    END IF;

    SELECT * INTO v_orig_pay FROM public.fee_payments WHERE id = v_adv.payment_id;

    -- 4. Create Reversal Transaction in public.fee_payments (Append-Only Ledger)
    v_reversal_receipt := 'REV-' || v_orig_pay.receipt_number;

    INSERT INTO public.fee_payments (
        student_id, amount, payment_date, payment_mode, receipt_number, remarks,
        is_reversal, reversal_of_id, void_reason, created_by
    ) VALUES (
        v_adv.student_id,
        v_adv.amount_received,
        (now() AT TIME ZONE 'Asia/Kolkata')::DATE,
        v_orig_pay.payment_mode,
        v_reversal_receipt,
        'Advance Reversal: ' || trim(p_void_reason),
        true,
        v_adv.payment_id,
        trim(p_void_reason),
        v_caller_id
    ) RETURNING id INTO v_reversal_pay_id;

    -- 5. Rollback Allocations If Advance Was Already Applied
    IF v_adv.status IN ('Applied', 'Partially Applied') THEN
        DELETE FROM public.fee_payment_allocations 
        WHERE payment_id = v_adv.payment_id;
    END IF;

    -- 6. Transition Advance Status to Voided
    UPDATE public.advance_fee_records
    SET status = 'Voided',
        voided_at = (now() AT TIME ZONE 'Asia/Kolkata'),
        voided_by = v_caller_id,
        void_reason = trim(p_void_reason),
        reversal_payment_id = v_reversal_pay_id
    WHERE id = p_advance_id;

    -- 7. Cancel Any Pending Outbox Email
    UPDATE public.email_outbox
    SET status = 'not_required', last_error = 'Advance voided by admin'
    WHERE advance_record_id = p_advance_id AND status = 'pending';

    RETURN jsonb_build_object(
        'success', true,
        'advance_id', p_advance_id,
        'reversal_payment_id', v_reversal_pay_id,
        'reversal_receipt', v_reversal_receipt,
        'void_reason', trim(p_void_reason),
        'timestamp', (now() AT TIME ZONE 'Asia/Kolkata')
    );
END;
$$;

REVOKE ALL ON FUNCTION public.void_advance_fee(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_advance_fee(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.void_advance_fee IS 'Privileged Super-Admin RPC that creates an auditable reversal in fee_payments and voids an advance record';

-- ------------------------------------------------------------------------------
-- 14. Row Level Security (RLS) Policies on All New Tables
-- ------------------------------------------------------------------------------

-- 14.1 public.fee_periods
ALTER TABLE public.fee_periods ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fee_periods FROM PUBLIC, anon;
GRANT SELECT ON public.fee_periods TO authenticated;

CREATE POLICY "Admins can view fee periods"
ON public.fee_periods FOR SELECT
TO authenticated
USING (public.is_authorized_admin());

CREATE POLICY "Super admin can manage fee periods"
ON public.fee_periods FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- 14.2 public.monthly_fee_dues
ALTER TABLE public.monthly_fee_dues ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.monthly_fee_dues FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.monthly_fee_dues TO authenticated;

CREATE POLICY "Admins can view monthly fee dues"
ON public.monthly_fee_dues FOR SELECT
TO authenticated
USING (public.is_authorized_admin());

CREATE POLICY "Admins can insert monthly dues"
ON public.monthly_fee_dues FOR INSERT
TO authenticated
WITH CHECK (public.is_authorized_admin());

CREATE POLICY "Admins can update dues metadata"
ON public.monthly_fee_dues FOR UPDATE
TO authenticated
USING (public.is_authorized_admin())
WITH CHECK (public.is_authorized_admin());

-- 14.3 public.fee_payment_allocations
ALTER TABLE public.fee_payment_allocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fee_payment_allocations FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.fee_payment_allocations TO authenticated;

CREATE POLICY "Admins can view payment allocations"
ON public.fee_payment_allocations FOR SELECT
TO authenticated
USING (public.is_authorized_admin());

CREATE POLICY "Admins can insert payment allocations"
ON public.fee_payment_allocations FOR INSERT
TO authenticated
WITH CHECK (public.is_authorized_admin());

-- 14.4 public.advance_fee_records
ALTER TABLE public.advance_fee_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.advance_fee_records FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.advance_fee_records TO authenticated;

CREATE POLICY "Staff can view advance fee records"
ON public.advance_fee_records FOR SELECT
TO authenticated
USING (public.is_authorized_admin());

CREATE POLICY "Staff can record advance fees"
ON public.advance_fee_records FOR INSERT
TO authenticated
WITH CHECK (public.is_authorized_admin());

CREATE POLICY "Staff can update advance status"
ON public.advance_fee_records FOR UPDATE
TO authenticated
USING (public.is_authorized_admin())
WITH CHECK (public.is_authorized_admin());

-- 14.5 public.email_outbox
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_outbox FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.email_outbox TO authenticated;

CREATE POLICY "Admins can view email outbox"
ON public.email_outbox FOR SELECT
TO authenticated
USING (public.is_authorized_admin());

CREATE POLICY "Admins can enqueue emails"
ON public.email_outbox FOR INSERT
TO authenticated
WITH CHECK (public.is_authorized_admin());

-- 14.6 public.monthly_generation_logs
ALTER TABLE public.monthly_generation_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.monthly_generation_logs FROM PUBLIC, anon;
GRANT SELECT ON public.monthly_generation_logs TO authenticated;

CREATE POLICY "Admins can view generation logs"
ON public.monthly_generation_logs FOR SELECT
TO authenticated
USING (public.is_authorized_admin());

-- ------------------------------------------------------------------------------
-- 15. Automated pg_cron Job Registration (Decision 4)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('generate-monthly-dues-auto');
    -- Runs at 00:01 Asia/Kolkata on the 1st of every month (18:31 UTC previous day)
    PERFORM cron.schedule(
      'generate-monthly-dues-auto',
      '31 18 28-31 * *',
      'SELECT public.generate_monthly_dues(to_char((now() AT TIME ZONE ''Asia/Kolkata''), ''YYYY-MM''))'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron extension not available or schedule skipped: %', SQLERRM;
END $$;

COMMIT;
