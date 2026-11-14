# Database Schema Specification

## 1. Overview

The database schema is designed for **PostgreSQL (version 15/16)** on **Supabase**. It enforces strict relational integrity, immutable financial accounting, and closed-system security directly at the PostgreSQL database engine level.

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
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.admins IS 'Administrative profiles linked to Supabase Auth users with role-based privileges';
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
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_fee NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

    -- Constraints
    CONSTRAINT check_total_fee_positive CHECK (total_fee >= 0),
    CONSTRAINT check_admission_id_not_empty CHECK (length(trim(admission_id)) > 0),
    CONSTRAINT check_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT check_phone_not_empty CHECK (length(trim(phone)) > 0)
);

-- Case-insensitive and trimmed uniqueness index on manual Admission ID
CREATE UNIQUE INDEX unique_trimmed_lower_admission_id 
ON public.students (LOWER(TRIM(admission_id)));

COMMENT ON TABLE public.students IS 'Authoritative registry of enrolled students with normalized unique Admission IDs';
```

---

### 2.3 Table: `public.fee_payments` (Immutable Financial Ledger)
Stores itemized, immutable fee payment installments and authorized reversal entries.

```sql
CREATE TABLE public.fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_mode TEXT NOT NULL DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer', 'cheque')),
    receipt_number TEXT,
    remarks TEXT,
    
    -- Reversal & Audit Tracking
    is_reversal BOOLEAN NOT NULL DEFAULT false,
    reversal_of_id UUID REFERENCES public.fee_payments(id) ON DELETE RESTRICT,
    void_reason TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

    -- Constraints
    CONSTRAINT check_payment_amount_positive CHECK (amount > 0),
    CONSTRAINT check_reversal_integrity CHECK (
        (is_reversal = false AND reversal_of_id IS NULL AND void_reason IS NULL) OR
        (is_reversal = true AND reversal_of_id IS NOT NULL AND length(trim(void_reason)) >= 5)
    )
);

COMMENT ON TABLE public.fee_payments IS 'Immutable ledger of fee payments and authorized reversals';
COMMENT ON COLUMN public.fee_payments.student_id IS 'Foreign key with ON DELETE RESTRICT preventing student deletion while payment records exist';
COMMENT ON COLUMN public.fee_payments.reversal_of_id IS 'References original payment record when recording an authorized void/reversal';
```

---

### 2.4 Table: `public.attendance`
Stores daily class attendance logs per student.

```sql
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

    -- Constraints
    CONSTRAINT unique_student_daily_attendance UNIQUE (student_id, date)
);

COMMENT ON TABLE public.attendance IS 'Daily student attendance logs with composite uniqueness constraint';
```

---

## 3. Real-Time Balance View (Accounting for Reversals)

```sql
CREATE OR REPLACE VIEW public.student_fee_summary AS
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

COMMENT ON VIEW public.student_fee_summary IS 'Real-time financial summary view netting payment installments against reversals';
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
SET search_path = public
AS $$
DECLARE
    v_rec JSONB;
    v_count INT := 0;
BEGIN
    -- Verify caller is an authorized admin
    IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not an authorized administrator';
    END IF;

    FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        INSERT INTO public.attendance (student_id, date, status, remarks)
        VALUES (
            (v_rec->>'student_id')::UUID,
            p_date,
            v_rec->>'status',
            v_rec->>'remarks'
        )
        ON CONFLICT (student_id, date)
        DO UPDATE SET
            status = EXCLUDED.status,
            remarks = EXCLUDED.remarks,
            created_at = timezone('utc', now());
        
        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'recorded_count', v_count);
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
SET search_path = public
AS $$
DECLARE
    v_orig public.fee_payments%ROWTYPE;
    v_reversal_id UUID;
    v_actor_role TEXT;
BEGIN
    -- Only super_admin can reverse payments
    SELECT role INTO v_actor_role FROM public.admins WHERE user_id = auth.uid();
    IF v_actor_role IS NULL OR v_actor_role != 'super_admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only super_admin can reverse payments';
    END IF;

    IF length(trim(p_reason)) < 5 THEN
        RAISE EXCEPTION 'A valid justification reason (at least 5 characters) is required';
    END IF;

    SELECT * INTO v_orig FROM public.fee_payments WHERE id = p_payment_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment record not found';
    END IF;

    IF v_orig.is_reversal THEN
        RAISE EXCEPTION 'Cannot reverse an existing reversal entry';
    END IF;

    IF EXISTS (SELECT 1 FROM public.fee_payments WHERE reversal_of_id = p_payment_id) THEN
        RAISE EXCEPTION 'This payment has already been reversed';
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
        created_by
    ) VALUES (
        v_orig.student_id,
        v_orig.amount,
        CURRENT_DATE,
        v_orig.payment_mode,
        'REV-' || COALESCE(v_orig.receipt_number, v_orig.id::TEXT),
        'Authorized reversal: ' || p_reason,
        true,
        v_orig.id,
        p_reason,
        auth.uid()
    ) RETURNING id INTO v_reversal_id;

    RETURN v_reversal_id;
END;
$$;
```

---

## 5. Performance Indexes

```sql
-- Students search & filter indexes
CREATE INDEX idx_students_name ON public.students(name);
CREATE INDEX idx_students_phone ON public.students(phone);
CREATE INDEX idx_students_course ON public.students(course);
CREATE INDEX idx_students_status ON public.students(status);

-- Payments indexes
CREATE INDEX idx_payments_student_id ON public.fee_payments(student_id);
CREATE INDEX idx_payments_date ON public.fee_payments(payment_date);
CREATE INDEX idx_payments_reversal ON public.fee_payments(reversal_of_id);

-- Attendance indexes
CREATE INDEX idx_attendance_date ON public.attendance(date);
CREATE INDEX idx_attendance_student_date ON public.attendance(student_id, date);
```
