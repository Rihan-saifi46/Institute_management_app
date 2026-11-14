# Database Schema Specification

## 1. Overview

The database schema is designed for **PostgreSQL (version 15/16)** on **Supabase**. It enforces strict relational integrity, immutable financial accounting, and closed-system security directly at the PostgreSQL database engine level using the **Asia/Kolkata (IST)** operational timezone standard.

---

## 2. Table DDL Definitions

### 2.1 Table: `public.admins`
Stores authorized administrative accounts linked to Supabase Auth (`auth.users`).

```sql
CREATE TABLE public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('super_admin', 'manager')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'),

    CONSTRAINT check_admin_full_name_not_empty CHECK (length(trim(full_name)) > 0),
    CONSTRAINT check_admin_email_not_empty CHECK (length(trim(email)) > 0)
);

COMMENT ON TABLE public.admins IS 'Administrative profiles linked to Supabase Auth users with role-based privileges';
COMMENT ON COLUMN public.admins.role IS 'Authorized operational role: super_admin (Owner) or manager (Staff)';
```

---

### 2.2 Table: `public.students`
Stores authoritative student demographic and course enrollment records.

```sql
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    course TEXT NOT NULL,
    joining_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::DATE,
    total_fee NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'),

    -- Constraints
    CONSTRAINT check_total_fee_positive CHECK (total_fee >= 0),
    CONSTRAINT check_admission_id_not_empty CHECK (length(trim(admission_id)) > 0),
    CONSTRAINT check_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT check_phone_not_empty CHECK (length(trim(phone)) > 0),
    CONSTRAINT check_course_not_empty CHECK (length(trim(course)) > 0)
);

-- Case-insensitive and trimmed uniqueness index on manual Admission ID
CREATE UNIQUE INDEX unique_trimmed_lower_admission_id 
ON public.students (LOWER(TRIM(admission_id)));

COMMENT ON TABLE public.students IS 'Authoritative registry of enrolled students with normalized unique Admission IDs';
COMMENT ON COLUMN public.students.status IS 'Lifecycle state: active (enrolled), completed (graduated), dropped (withdrawn)';
```

---

### 2.3 Table: `public.fee_payments` (Immutable Financial Ledger)
Stores itemized, immutable fee payment installments and authorized reversal entries.

```sql
CREATE TABLE public.fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::DATE,
    payment_mode TEXT NOT NULL DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer', 'cheque')),
    receipt_number TEXT,
    remarks TEXT,
    
    -- Reversal & Audit Tracking
    is_reversal BOOLEAN NOT NULL DEFAULT false,
    reversal_of_id UUID REFERENCES public.fee_payments(id) ON DELETE RESTRICT,
    void_reason TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'),

    -- Constraints
    CONSTRAINT check_payment_amount_positive CHECK (amount > 0),
    CONSTRAINT check_reversal_integrity CHECK (
        (is_reversal = false AND reversal_of_id IS NULL AND void_reason IS NULL) OR
        (is_reversal = true AND reversal_of_id IS NOT NULL AND length(trim(void_reason)) >= 5)
    )
);

-- Ensure a payment can only be reversed at most once
CREATE UNIQUE INDEX unique_payment_reversal_idx 
ON public.fee_payments (reversal_of_id) 
WHERE is_reversal = true;

COMMENT ON TABLE public.fee_payments IS 'Immutable ledger of installment payments and authorized reversals';
COMMENT ON COLUMN public.fee_payments.student_id IS 'Foreign key with ON DELETE RESTRICT preventing student deletion while payment records exist';
COMMENT ON COLUMN public.fee_payments.reversal_of_id IS 'Unique reference to original payment record when recording an authorized void/reversal';
```

---

### 2.4 Table: `public.attendance`
Stores daily class attendance logs per student.

```sql
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::DATE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'),

    -- Constraints
    CONSTRAINT unique_student_daily_attendance UNIQUE (student_id, date)
);

COMMENT ON TABLE public.attendance IS 'Daily student attendance logs with composite uniqueness constraint';
COMMENT ON COLUMN public.attendance.student_id IS 'Foreign key with ON DELETE RESTRICT preventing deletion of students with attendance history';
```

---

## 3. Real-Time Balance View (Accounting for Reversals)

```sql
CREATE OR REPLACE VIEW public.student_fee_summary 
WITH (security_invoker = true) AS
SELECT 
    s.id,
    s.admission_id,
    s.name,
    s.phone,
    s.course,
    s.joining_date,
    s.status,
    s.total_fee,
    COALESCE(
        SUM(
            CASE 
                WHEN p.is_reversal THEN -p.amount 
                ELSE p.amount 
            END
        ), 0.00
    ) AS total_paid,
    (
        s.total_fee - COALESCE(
            SUM(
                CASE 
                    WHEN p.is_reversal THEN -p.amount 
                    ELSE p.amount 
                END
            ), 0.00
        )
    ) AS balance_due,
    CASE 
        WHEN COALESCE(SUM(CASE WHEN p.is_reversal THEN -p.amount ELSE p.amount END), 0.00) >= s.total_fee THEN 'PAID'
        WHEN COALESCE(SUM(CASE WHEN p.is_reversal THEN -p.amount ELSE p.amount END), 0.00) > 0 THEN 'PARTIAL'
        ELSE 'UNPAID'
    END AS fee_status
FROM public.students s
LEFT JOIN public.fee_payments p ON s.id = p.student_id
GROUP BY s.id;

COMMENT ON VIEW public.student_fee_summary IS 'Real-time financial summary view netting payment installments against reversals with security_invoker enabled';
```

---

## 4. Stored Procedures (RPCs)

### 4.1 Batch Attendance Upsert Function
```sql
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

    IF p_date IS NULL THEN
        RAISE EXCEPTION 'Invalid date: Attendance date must not be null';
    END IF;

    IF p_records IS NULL OR jsonb_typeof(p_records) != 'array' OR jsonb_array_length(p_records) = 0 THEN
        RAISE EXCEPTION 'Invalid records payload: Must be a non-empty JSON array';
    END IF;

    FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        BEGIN
            v_student_id := (v_rec->>'student_id')::UUID;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Malformed student_id: %', (v_rec->>'student_id');
        END;

        IF v_student_id IS NULL THEN
            RAISE EXCEPTION 'student_id is required in all batch records';
        END IF;

        v_status := v_rec->>'status';
        IF v_status IS NULL OR v_status NOT IN ('present', 'absent') THEN
            RAISE EXCEPTION 'Invalid attendance status "%" for student %. Must be "present" or "absent".', v_status, v_student_id;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = v_student_id AND status = 'active'
        ) THEN
            RAISE EXCEPTION 'Student % is not an active enrolled student or does not exist.', v_student_id;
        END IF;

        v_remarks := NULLIF(trim(v_rec->>'remarks'), '');

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
```

### 4.2 Authorized Payment Reversal Function
```sql
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
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: auth.uid() is null';
    END IF;

    SELECT role INTO v_caller_role 
    FROM public.admins 
    WHERE user_id = v_caller_id;

    IF v_caller_role IS NULL OR v_caller_role != 'super_admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only super_admin can reverse fee payments';
    END IF;

    v_clean_reason := trim(p_reason);
    IF v_clean_reason IS NULL OR length(v_clean_reason) < 5 THEN
        RAISE EXCEPTION 'A meaningful justification reason (at least 5 characters) is mandatory for reversals';
    END IF;

    SELECT * INTO v_orig 
    FROM public.fee_payments 
    WHERE id = p_payment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment record % not found', p_payment_id;
    END IF;

    IF v_orig.is_reversal THEN
        RAISE EXCEPTION 'Invalid operation: Cannot reverse an existing reversal entry';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.fee_payments 
        WHERE reversal_of_id = p_payment_id AND is_reversal = true
    ) THEN
        RAISE EXCEPTION 'Invalid operation: Payment % has already been reversed', p_payment_id;
    END IF;

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
```

---

## 5. Performance Indexes

```sql
-- Students search & filter indexes
CREATE INDEX IF NOT EXISTS idx_students_name ON public.students(name);
CREATE INDEX IF NOT EXISTS idx_students_phone ON public.students(phone);
CREATE INDEX IF NOT EXISTS idx_students_course ON public.students(course);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.fee_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_reversal ON public.fee_payments(reversal_of_id);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance(student_id, date);
```
