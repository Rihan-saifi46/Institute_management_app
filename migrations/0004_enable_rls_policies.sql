-- ==============================================================================
-- Migration: 0004_enable_rls_policies.sql
-- Description: Row Level Security (RLS) policies for Z Institute
-- Security Model: Strict closed system gating access to 'super_admin' & 'manager'
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Helper Functions for Role Checking
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_admin_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role FROM public.admins WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_admin_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_admin_role() TO authenticated;

-- Helper: Check if caller is any authorized admin (super_admin or manager)
CREATE OR REPLACE FUNCTION public.is_authorized_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admins 
        WHERE user_id = auth.uid() 
        AND role IN ('super_admin', 'manager')
    );
$$;

REVOKE ALL ON FUNCTION public.is_authorized_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_authorized_admin() TO authenticated;

-- Helper: Check if caller is specifically super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admins 
        WHERE user_id = auth.uid() 
        AND role = 'super_admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. Enable Row Level Security (RLS) on all Operational Tables
-- ------------------------------------------------------------------------------
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Revoke all default table permissions from anon and PUBLIC
REVOKE ALL ON public.admins FROM PUBLIC, anon;
REVOKE ALL ON public.students FROM PUBLIC, anon;
REVOKE ALL ON public.fee_payments FROM PUBLIC, anon;
REVOKE ALL ON public.attendance FROM PUBLIC, anon;

-- Grant standard DML to authenticated role (subject to RLS policies below)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT SELECT, INSERT ON public.fee_payments TO authenticated; -- Notice: UPDATE and DELETE strictly NOT granted
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. Policies: public.admins
-- ------------------------------------------------------------------------------
-- Any authorized admin (super_admin or manager) can read administrative profiles
CREATE POLICY "Admins can view admin profiles" 
ON public.admins FOR SELECT 
TO authenticated 
USING (public.is_authorized_admin());

-- Only super_admin can create new admin profiles
CREATE POLICY "Super admin can insert admin profiles" 
ON public.admins FOR INSERT 
TO authenticated 
WITH CHECK (public.is_super_admin());

-- Only super_admin can update admin profiles (prevent self-escalation by managers)
CREATE POLICY "Super admin can update admin profiles" 
ON public.admins FOR UPDATE 
TO authenticated 
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Only super_admin can delete admin profiles (cannot delete self)
CREATE POLICY "Super admin can delete other admin profiles" 
ON public.admins FOR DELETE 
TO authenticated 
USING (public.is_super_admin() AND user_id != auth.uid());

-- ------------------------------------------------------------------------------
-- 4. Policies: public.students
-- ------------------------------------------------------------------------------
-- Authorized admins can view all students (active, completed, dropped)
CREATE POLICY "Admins can view students" 
ON public.students FOR SELECT 
TO authenticated 
USING (public.is_authorized_admin());

-- Authorized admins can enroll new students
CREATE POLICY "Admins can insert students" 
ON public.students FOR INSERT 
TO authenticated 
WITH CHECK (public.is_authorized_admin());

-- Authorized admins can update student records & status
CREATE POLICY "Admins can update students" 
ON public.students FOR UPDATE 
TO authenticated 
USING (public.is_authorized_admin())
WITH CHECK (public.is_authorized_admin());

-- Only super_admin can delete student records (foreign keys protect historical data)
CREATE POLICY "Super admin can delete students without history" 
ON public.students FOR DELETE 
TO authenticated 
USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 5. Policies: public.fee_payments (IMMUTABLE LEDGER)
-- ------------------------------------------------------------------------------
-- Authorized admins can view the fee payment ledger
CREATE POLICY "Admins can view payment ledger" 
ON public.fee_payments FOR SELECT 
TO authenticated 
USING (public.is_authorized_admin());

-- Authorized admins can insert regular payment installments (non-reversals)
CREATE POLICY "Admins can record regular payments" 
ON public.fee_payments FOR INSERT 
TO authenticated 
WITH CHECK (
    public.is_authorized_admin() 
    AND is_reversal = false
);

-- STRICT INVARIANT: ZERO UPDATE OR DELETE POLICIES ARE CREATED FOR fee_payments
-- Direct SQL UPDATE and DELETE statements are unconditionally blocked by RLS for all users.

-- ------------------------------------------------------------------------------
-- 6. Policies: public.attendance
-- ------------------------------------------------------------------------------
-- Authorized admins can view attendance records
CREATE POLICY "Admins can view attendance" 
ON public.attendance FOR SELECT 
TO authenticated 
USING (public.is_authorized_admin());

-- Authorized admins can insert attendance records
CREATE POLICY "Admins can insert attendance" 
ON public.attendance FOR INSERT 
TO authenticated 
WITH CHECK (public.is_authorized_admin());

-- Authorized admins can update attendance records
CREATE POLICY "Admins can update attendance" 
ON public.attendance FOR UPDATE 
TO authenticated 
USING (public.is_authorized_admin())
WITH CHECK (public.is_authorized_admin());

-- Only super_admin can delete attendance records
CREATE POLICY "Super admin can delete attendance" 
ON public.attendance FOR DELETE 
TO authenticated 
USING (public.is_super_admin());
