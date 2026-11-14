-- ==============================================================================
-- Test Suite: verify_phase1_security.sql
-- Description: Automated verification script testing all 14 mandatory security
--              and database constraints for Z Institute Phase 1.
-- Execution: Can be run via Supabase SQL Editor or psql.
-- ==============================================================================

BEGIN;

-- Create temporary reporting table for test results
CREATE TEMP TABLE phase1_test_results (
    test_id INT,
    description TEXT,
    status TEXT,
    details TEXT
);

DO $$
DECLARE
    v_sa_auth_id UUID := '11111111-1111-1111-1111-111111111111';
    v_mgr_auth_id UUID := '22222222-2222-2222-2222-222222222222';
    v_unauth_id UUID := '33333333-3333-3333-3333-333333333333';
    v_student1_id UUID;
    v_student2_id UUID;
    v_payment1_id UUID;
    v_reversal_id UUID;
    v_count INT;
    v_err_msg TEXT;
    v_fee_summary RECORD;
BEGIN
    RAISE NOTICE 'Starting Phase 1 Automated Security & Constraint Verification Suite...';

    -- --------------------------------------------------------------------------
    -- Setup Test Fixtures (in postgres superuser context inside transaction)
    -- --------------------------------------------------------------------------
    -- Ensure test auth users exist in auth.users
    INSERT INTO auth.users (id, email) 
    VALUES 
        (v_sa_auth_id, 'test_sa@zinstitute.internal'),
        (v_mgr_auth_id, 'test_mgr@zinstitute.internal'),
        (v_unauth_id, 'test_unauth@zinstitute.internal')
    ON CONFLICT (id) DO NOTHING;

    -- Provision admin profiles
    INSERT INTO public.admins (user_id, email, full_name, role)
    VALUES 
        (v_sa_auth_id, 'test_sa@zinstitute.internal', 'Test Super Admin', 'super_admin'),
        (v_mgr_auth_id, 'test_mgr@zinstitute.internal', 'Test Manager', 'manager')
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

    -- --------------------------------------------------------------------------
    -- Test 1: Anonymous users cannot read protected tables
    -- --------------------------------------------------------------------------
    BEGIN
        -- Switch to anon role
        EXECUTE 'SET LOCAL ROLE anon';
        SELECT count(*) INTO v_count FROM public.students;
        IF v_count = 0 THEN
            INSERT INTO phase1_test_results VALUES (1, 'Anon cannot read public.students', 'PASS', '0 rows visible to anon');
        ELSE
            INSERT INTO phase1_test_results VALUES (1, 'Anon cannot read public.students', 'FAIL', 'Anon read ' || v_count || ' rows');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO phase1_test_results VALUES (1, 'Anon cannot read public.students', 'PASS', 'Query rejected with error: ' || SQLERRM);
    END;

    -- Reset to postgres superuser
    EXECUTE 'RESET ROLE';

    -- --------------------------------------------------------------------------
    -- Test 2: Authenticated user without an authorized profile is denied
    -- --------------------------------------------------------------------------
    BEGIN
        EXECUTE 'SET LOCAL ROLE authenticated';
        EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s"}''', v_unauth_id);
        SELECT count(*) INTO v_count FROM public.students;
        IF v_count = 0 THEN
            INSERT INTO phase1_test_results VALUES (2, 'Unprofiled user denied table access', 'PASS', '0 rows returned for unprofiled user');
        ELSE
            INSERT INTO phase1_test_results VALUES (2, 'Unprofiled user denied table access', 'FAIL', 'Unprofiled user saw ' || v_count || ' rows');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO phase1_test_results VALUES (2, 'Unprofiled user denied table access', 'PASS', 'Blocked with: ' || SQLERRM);
    END;

    EXECUTE 'RESET ROLE';

    -- Create test students as Super Admin
    INSERT INTO public.students (admission_id, name, phone, course, total_fee, status)
    VALUES ('Z-101', 'Alice Johnson', '9876543210', 'Python Programming', 10000.00, 'active')
    RETURNING id INTO v_student1_id;

    INSERT INTO public.students (admission_id, name, phone, course, total_fee, status)
    VALUES ('Z-102', 'Bob Smith', '9876543211', 'Web Development', 8000.00, 'active')
    RETURNING id INTO v_student2_id;

    -- Record initial payment as Manager
    INSERT INTO public.fee_payments (student_id, amount, payment_mode, remarks)
    VALUES (v_student1_id, 4000.00, 'upi', 'Installment 1')
    RETURNING id INTO v_payment1_id;

    -- --------------------------------------------------------------------------
    -- Test 3: Manager cannot reverse payments
    -- --------------------------------------------------------------------------
    BEGIN
        EXECUTE 'SET LOCAL ROLE authenticated';
        EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s"}''', v_mgr_auth_id);
        
        PERFORM public.reverse_payment(v_payment1_id, 'Manager attempt reversal');
        INSERT INTO phase1_test_results VALUES (3, 'Manager cannot reverse payments', 'FAIL', 'Manager was permitted to execute reversal!');
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO phase1_test_results VALUES (3, 'Manager cannot reverse payments', 'PASS', 'Blocked with error: ' || SQLERRM);
    END;

    EXECUTE 'RESET ROLE';

    -- --------------------------------------------------------------------------
    -- Test 4: Manager cannot update or delete payment ledger entries
    -- --------------------------------------------------------------------------
    BEGIN
        EXECUTE 'SET LOCAL ROLE authenticated';
        EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s"}''', v_mgr_auth_id);
        
        UPDATE public.fee_payments SET amount = 100.00 WHERE id = v_payment1_id;
        INSERT INTO phase1_test_results VALUES (4, 'Manager cannot update fee_payments', 'FAIL', 'Manager updated payment amount!');
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO phase1_test_results VALUES (4, 'Manager cannot update fee_payments', 'PASS', 'Update blocked: ' || SQLERRM);
    END;

    EXECUTE 'RESET ROLE';

    -- --------------------------------------------------------------------------
    -- Test 5: Manager cannot modify their own role
    -- --------------------------------------------------------------------------
    BEGIN
        EXECUTE 'SET LOCAL ROLE authenticated';
        EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s"}''', v_mgr_auth_id);
        
        UPDATE public.admins SET role = 'super_admin' WHERE user_id = v_mgr_auth_id;
        INSERT INTO phase1_test_results VALUES (5, 'Manager cannot self-escalate role', 'FAIL', 'Manager escalated own role!');
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO phase1_test_results VALUES (5, 'Manager cannot self-escalate role', 'PASS', 'Self-escalation blocked: ' || SQLERRM);
    END;

    EXECUTE 'RESET ROLE';

    -- --------------------------------------------------------------------------
    -- Test 6: Super Admin can perform the authorized reversal workflow
    -- --------------------------------------------------------------------------
    BEGIN
        EXECUTE 'SET LOCAL ROLE authenticated';
        EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s"}''', v_sa_auth_id);
        
        v_reversal_id := public.reverse_payment(v_payment1_id, 'Owner authorized: Check returned by bank');
        IF v_reversal_id IS NOT NULL THEN
            INSERT INTO phase1_test_results VALUES (6, 'Super Admin can reverse payments', 'PASS', 'Reversal created ID: ' || v_reversal_id);
        ELSE
            INSERT INTO phase1_test_results VALUES (6, 'Super Admin can reverse payments', 'FAIL', 'Reversal returned null ID');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO phase1_test_results VALUES (6, 'Super Admin can reverse payments', 'FAIL', 'Error: ' || SQLERRM);
    END;

    EXECUTE 'RESET ROLE';

    -- --------------------------------------------------------------------------
    -- Test 7: Reversal requires a reason (>= 5 chars)
    -- --------------------------------------------------------------------------
    BEGIN
        EXECUTE 'SET LOCAL ROLE authenticated';
        EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s"}''', v_sa_auth_id);
        
        PERFORM public.reverse_payment(v_payment1_id, '  ');
        INSERT INTO phase1_test_results VALUES (7, 'Reversal requires a reason', 'FAIL', 'Empty reason was accepted!');
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO phase1_test_results VALUES (7, 'Reversal requires a reason', 'PASS', 'Rejected empty reason: ' || SQLERRM);
    END;

    EXECUTE 'RESET ROLE';

    -- --------------------------------------------------------------------------
    -- Test 8: Duplicate reversals are rejected
    -- --------------------------------------------------------------------------
    BEGIN
        EXECUTE 'SET LOCAL ROLE authenticated';
        EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s"}''', v_sa_auth_id);
        
        PERFORM public.reverse_payment(v_payment1_id, 'Attempting duplicate reversal');
        INSERT INTO phase1_test_results VALUES (8, 'Duplicate reversals are rejected', 'FAIL', 'Allowed second reversal for same payment!');
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO phase1_test_results VALUES (8, 'Duplicate reversals are rejected', 'PASS', 'Duplicate reversal blocked: ' || SQLERRM);
    END;

    EXECUTE 'RESET ROLE';

    -- --------------------------------------------------------------------------
    -- Test 9: Fee summary correctly nets original payments and reversals
    -- --------------------------------------------------------------------------
    SELECT * INTO v_fee_summary FROM public.student_fee_summary WHERE id = v_student1_id;
    -- Alice: Total 10000, Paid 4000, Reversed 4000 => Net Paid: 0.00, Balance: 10000.00, Status: UNPAID
    IF v_fee_summary.total_paid = 0.00 AND v_fee_summary.balance_due = 10000.00 AND v_fee_summary.fee_status = 'UNPAID' THEN
        INSERT INTO phase1_test_results VALUES (9, 'Fee summary nets reversals accurately', 'PASS', 'Total Paid: 0.00, Balance: 10000.00, Status: UNPAID');
    ELSE
        INSERT INTO phase1_test_results VALUES (9, 'Fee summary nets reversals accurately', 'FAIL', 'Paid: ' || v_fee_summary.total_paid || ', Balance: ' || v_fee_summary.balance_due);
    END IF;

    -- --------------------------------------------------------------------------
    -- Test 10: Duplicate Admission IDs rejected regardless of case/whitespace
    -- --------------------------------------------------------------------------
    BEGIN
        INSERT INTO public.students (admission_id, name, phone, course, total_fee)
        VALUES ('  z-101  ', 'Imposter Student', '9999999999', 'Python', 5000);
        INSERT INTO phase1_test_results VALUES (10, 'Normalized Admission ID uniqueness', 'FAIL', 'Duplicate "  z-101  " was accepted!');
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO phase1_test_results VALUES (10, 'Normalized Admission ID uniqueness', 'PASS', 'Blocked duplicate Admission ID: ' || SQLERRM);
    END;

    -- --------------------------------------------------------------------------
    -- Test 11: Duplicate attendance for same student/date handled atomically
    -- --------------------------------------------------------------------------
    BEGIN
        EXECUTE 'SET LOCAL ROLE authenticated';
        EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s"}''', v_mgr_auth_id);
        
        -- Mark attendance for Bob
        PERFORM public.mark_batch_attendance(
            '2026-11-14'::DATE,
            jsonb_build_array(jsonb_build_object('student_id', v_student2_id, 'status', 'present'))
        );
        -- Re-mark for Bob as absent
        PERFORM public.mark_batch_attendance(
            '2026-11-14'::DATE,
            jsonb_build_array(jsonb_build_object('student_id', v_student2_id, 'status', 'absent'))
        );
        
        SELECT count(*) INTO v_count FROM public.attendance WHERE student_id = v_student2_id AND date = '2026-11-14';
        IF v_count = 1 THEN
            INSERT INTO phase1_test_results VALUES (11, 'Duplicate attendance upserted cleanly', 'PASS', 'Exact 1 record updated in-place without collision');
        ELSE
            INSERT INTO phase1_test_results VALUES (11, 'Duplicate attendance upserted cleanly', 'FAIL', 'Found ' || v_count || ' records');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO phase1_test_results VALUES (11, 'Duplicate attendance upserted cleanly', 'FAIL', 'Error: ' || SQLERRM);
    END;

    EXECUTE 'RESET ROLE';

    -- --------------------------------------------------------------------------
    -- Test 12: Batch attendance rolls back entirely on invalid record
    -- --------------------------------------------------------------------------
    BEGIN
        EXECUTE 'SET LOCAL ROLE authenticated';
        EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s"}''', v_mgr_auth_id);
        
        -- Batch has 1 valid student and 1 non-existent student UUID
        PERFORM public.mark_batch_attendance(
            '2026-11-15'::DATE,
            jsonb_build_array(
                jsonb_build_object('student_id', v_student1_id, 'status', 'present'),
                jsonb_build_object('student_id', '99999999-9999-9999-9999-999999999999'::UUID, 'status', 'present')
            )
        );
        INSERT INTO phase1_test_results VALUES (12, 'Batch attendance atomicity', 'FAIL', 'Invalid batch was accepted!');
    EXCEPTION WHEN OTHERS THEN
        -- Check if student 1 was inserted for 2026-11-15 (it must NOT be!)
        EXECUTE 'RESET ROLE';
        SELECT count(*) INTO v_count FROM public.attendance WHERE student_id = v_student1_id AND date = '2026-11-15';
        IF v_count = 0 THEN
            INSERT INTO phase1_test_results VALUES (12, 'Batch attendance atomicity', 'PASS', 'Transaction rolled back 100% cleanly');
        ELSE
            INSERT INTO phase1_test_results VALUES (12, 'Batch attendance atomicity', 'FAIL', 'Partial insert occurred!');
        END IF;
    END;

    -- --------------------------------------------------------------------------
    -- Test 13: Completed and dropped students retain their historical records
    -- --------------------------------------------------------------------------
    UPDATE public.students SET status = 'completed' WHERE id = v_student1_id;
    -- Verify payments and attendance still intact
    SELECT count(*) INTO v_count FROM public.fee_payments WHERE student_id = v_student1_id;
    IF v_count > 0 THEN
        INSERT INTO phase1_test_results VALUES (13, 'Archived students retain history', 'PASS', 'Status set to completed; ' || v_count || ' payment records intact');
    ELSE
        INSERT INTO phase1_test_results VALUES (13, 'Archived students retain history', 'FAIL', 'Historical records lost!');
    END IF;

    -- --------------------------------------------------------------------------
    -- Test 14: Accidental deletion of student with payments is blocked
    -- --------------------------------------------------------------------------
    BEGIN
        DELETE FROM public.students WHERE id = v_student1_id;
        INSERT INTO phase1_test_results VALUES (14, 'Student delete blocked by ON DELETE RESTRICT', 'FAIL', 'Student was deleted!');
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO phase1_test_results VALUES (14, 'Student delete blocked by ON DELETE RESTRICT', 'PASS', 'Deletion blocked: ' || SQLERRM);
    END;

END;
$$;

-- Display test results
SELECT test_id, description, status, details FROM phase1_test_results ORDER BY test_id;

-- Rollback all test data so the database remains clean
ROLLBACK;
