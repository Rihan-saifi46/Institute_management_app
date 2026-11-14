-- ==============================================================================
-- Migration: 0001_initial_schema.sql
-- Description: Core schema for Z Institute Management System
-- Entities: admins, students, fee_payments, attendance
-- Timezone Standard: Asia/Kolkata (IST)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Table: public.admins (Linked to Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admins (
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

-- ------------------------------------------------------------------------------
-- 2. Table: public.students (Authoritative Student Registry)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
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

    -- Data integrity constraints
    CONSTRAINT check_total_fee_positive CHECK (total_fee >= 0),
    CONSTRAINT check_admission_id_not_empty CHECK (length(trim(admission_id)) > 0),
    CONSTRAINT check_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT check_phone_not_empty CHECK (length(trim(phone)) > 0),
    CONSTRAINT check_course_not_empty CHECK (length(trim(course)) > 0)
);

-- Case-insensitive & trimmed unique index on manual Admission ID
CREATE UNIQUE INDEX IF NOT EXISTS unique_trimmed_lower_admission_id 
ON public.students (LOWER(TRIM(admission_id)));

COMMENT ON TABLE public.students IS 'Authoritative registry of enrolled students with normalized unique Admission IDs';
COMMENT ON COLUMN public.students.status IS 'Lifecycle state: active (enrolled), completed (graduated), dropped (withdrawn)';

-- ------------------------------------------------------------------------------
-- 3. Table: public.fee_payments (Immutable Financial Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fee_payments (
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
CREATE UNIQUE INDEX IF NOT EXISTS unique_payment_reversal_idx 
ON public.fee_payments (reversal_of_id) 
WHERE is_reversal = true;

COMMENT ON TABLE public.fee_payments IS 'Immutable ledger of installment payments and authorized reversals';
COMMENT ON COLUMN public.fee_payments.student_id IS 'Foreign key with ON DELETE RESTRICT preventing student deletion while payment records exist';
COMMENT ON COLUMN public.fee_payments.reversal_of_id IS 'Unique reference to original payment record when recording an authorized void/reversal';

-- ------------------------------------------------------------------------------
-- 4. Table: public.attendance (Daily Attendance Logs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::DATE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'),

    -- Prevent multiple attendance entries for the same student on the same date
    CONSTRAINT unique_student_daily_attendance UNIQUE (student_id, date)
);

COMMENT ON TABLE public.attendance IS 'Daily student attendance logs with composite uniqueness constraint';
COMMENT ON COLUMN public.attendance.student_id IS 'Foreign key with ON DELETE RESTRICT preventing deletion of students with attendance history';

-- ------------------------------------------------------------------------------
-- 5. Performance Indexes
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_students_name ON public.students(name);
CREATE INDEX IF NOT EXISTS idx_students_phone ON public.students(phone);
CREATE INDEX IF NOT EXISTS idx_students_course ON public.students(course);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);

CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.fee_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_reversal ON public.fee_payments(reversal_of_id);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance(student_id, date);
