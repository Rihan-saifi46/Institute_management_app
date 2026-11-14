-- ==============================================================================
-- Migration: 0003_create_stored_functions.sql
-- Description: Trusted PostgreSQL Stored Functions (RPC)
-- Security Standard: SECURITY DEFINER with fixed search_path & explicit auth checks
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Function 1: public.mark_batch_attendance
-- Atomically processes batch attendance entries for active students
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_batch_attendance(
    p_date DATE,
    p_records JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_rec JSONB;
    v_student_id UUID;
    v_status TEXT;
    v_remarks TEXT;
    v_count INT := 0;
BEGIN
    -- 1. Identify and verify caller authorization via auth.uid()
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: auth.uid() is null';
    END IF;

    SELECT role INTO v_caller_role 
    FROM public.admins 
    WHERE user_id = v_caller_id;

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'manager') THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not an authorized administrator';
    END IF;

    -- 2. Validate input date (cannot be NULL)
    IF p_date IS NULL THEN
        RAISE EXCEPTION 'Invalid date: Attendance date must not be null';
    END IF;

    -- 3. Validate input array structure
    IF p_records IS NULL OR jsonb_typeof(p_records) != 'array' OR jsonb_array_length(p_records) = 0 THEN
        RAISE EXCEPTION 'Invalid records payload: Must be a non-empty JSON array';
    END IF;

    -- 4. Process each attendance entry atomically
    FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        -- Extract and validate student_id
        BEGIN
            v_student_id := (v_rec->>'student_id')::UUID;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Malformed student_id: %', (v_rec->>'student_id');
        END;

        IF v_student_id IS NULL THEN
            RAISE EXCEPTION 'student_id is required in all batch records';
        END IF;

        -- Extract and validate status
        v_status := v_rec->>'status';
        IF v_status IS NULL OR v_status NOT IN ('present', 'absent') THEN
            RAISE EXCEPTION 'Invalid attendance status "%" for student %. Must be "present" or "absent".', v_status, v_student_id;
        END IF;

        -- Verify student exists and is active
        IF NOT EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = v_student_id AND status = 'active'
        ) THEN
            RAISE EXCEPTION 'Student % is not an active enrolled student or does not exist.', v_student_id;
        END IF;

        v_remarks := NULLIF(trim(v_rec->>'remarks'), '');

        -- Upsert record atomically
        INSERT INTO public.attendance (student_id, date, status, remarks, created_at)
        VALUES (v_student_id, p_date, v_status, v_remarks, (now() AT TIME ZONE 'Asia/Kolkata'))
        ON CONFLICT (student_id, date)
        DO UPDATE SET
            status = EXCLUDED.status,
            remarks = EXCLUDED.remarks,
            created_at = (now() AT TIME ZONE 'Asia/Kolkata');
        
        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'date', p_date,
        'recorded_count', v_count
    );
END;
$$;

-- Restrict execution permissions
REVOKE ALL ON FUNCTION public.mark_batch_attendance(DATE, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_batch_attendance(DATE, JSONB) TO authenticated;

COMMENT ON FUNCTION public.mark_batch_attendance IS 'Atomically upserts batch attendance for active students with server-side authorization check';

-- ------------------------------------------------------------------------------
-- Function 2: public.reverse_payment
-- Authorized payment reversal restricted strictly to super_admin (Institute Owner)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reverse_payment(
    p_payment_id UUID,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_orig public.fee_payments%ROWTYPE;
    v_reversal_id UUID;
    v_clean_reason TEXT;
BEGIN
    -- 1. Identify and verify caller authorization via auth.uid()
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: auth.uid() is null';
    END IF;

    SELECT role INTO v_caller_role 
    FROM public.admins 
    WHERE user_id = v_caller_id;

    -- Strict authorization check: Only super_admin may reverse payments
    IF v_caller_role IS NULL OR v_caller_role != 'super_admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only super_admin can reverse fee payments';
    END IF;

    -- 2. Validate reason string (must be non-empty and at least 5 characters)
    v_clean_reason := trim(p_reason);
    IF v_clean_reason IS NULL OR length(v_clean_reason) < 5 THEN
        RAISE EXCEPTION 'A meaningful justification reason (at least 5 characters) is mandatory for reversals';
    END IF;

    -- 3. Fetch and validate original payment record
    SELECT * INTO v_orig 
    FROM public.fee_payments 
    WHERE id = p_payment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment record % not found', p_payment_id;
    END IF;

    -- 4. Invariant: Cannot reverse an existing reversal entry
    IF v_orig.is_reversal THEN
        RAISE EXCEPTION 'Invalid operation: Cannot reverse an existing reversal entry';
    END IF;

    -- 5. Invariant: Cannot reverse an already-reversed payment
    IF EXISTS (
        SELECT 1 FROM public.fee_payments 
        WHERE reversal_of_id = p_payment_id AND is_reversal = true
    ) THEN
        RAISE EXCEPTION 'Invalid operation: Payment % has already been reversed', p_payment_id;
    END IF;

    -- 6. Insert offsetting reversal record
    INSERT INTO public.fee_payments (
        student_id,
        amount,
        payment_date,
        payment_mode,
        receipt_number,
        remarks,
        is_reversal,
        reversal_of_id,
        void_reason,
        created_by,
        created_at
    ) VALUES (
        v_orig.student_id,
        v_orig.amount,
        (now() AT TIME ZONE 'Asia/Kolkata')::DATE,
        v_orig.payment_mode,
        'REV-' || COALESCE(v_orig.receipt_number, substring(v_orig.id::TEXT, 1, 8)),
        'Authorized reversal: ' || v_clean_reason,
        true,
        v_orig.id,
        v_clean_reason,
        v_caller_id,
        (now() AT TIME ZONE 'Asia/Kolkata')
    ) RETURNING id INTO v_reversal_id;

    RETURN v_reversal_id;
END;
$$;

-- Restrict execution permissions
REVOKE ALL ON FUNCTION public.reverse_payment(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reverse_payment(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.reverse_payment IS 'Executes an authorized payment reversal with audit reason, restricted strictly to super_admin';
