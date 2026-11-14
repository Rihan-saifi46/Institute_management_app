-- ==============================================================================
-- Migration: 0005_seed_super_admin.sql
-- Description: Bootstrap Initial Super Admin Profile for Z Institute Owner
-- Owner Email: saifirihan683@gmail.com
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Trigger Function: Automatically provision profile on Auth signup
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_admin_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Auto-assign super_admin role strictly to the confirmed owner email
    IF LOWER(TRIM(NEW.email)) = 'saifirihan683@gmail.com' THEN
        INSERT INTO public.admins (user_id, email, full_name, role, created_at, updated_at)
        VALUES (
            NEW.id, 
            LOWER(TRIM(NEW.email)), 
            'Z Institute Owner', 
            'super_admin',
            (now() AT TIME ZONE 'Asia/Kolkata'),
            (now() AT TIME ZONE 'Asia/Kolkata')
        )
        ON CONFLICT (user_id) DO UPDATE SET 
            role = 'super_admin',
            updated_at = (now() AT TIME ZONE 'Asia/Kolkata');
    END IF;
    RETURN NEW;
END;
$$;

-- Attach trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created_for_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_for_admin
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_admin_user_signup();

COMMENT ON FUNCTION public.handle_admin_user_signup IS 'Automatically provisions super_admin profile when the confirmed owner email registers';

-- ------------------------------------------------------------------------------
-- 2. Retroactive Bootstrap: If auth.users already has saifirihan683@gmail.com
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE LOWER(TRIM(email)) = 'saifirihan683@gmail.com'
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.admins (user_id, email, full_name, role, created_at, updated_at)
        VALUES (
            v_user_id, 
            'saifirihan683@gmail.com', 
            'Z Institute Owner', 
            'super_admin',
            (now() AT TIME ZONE 'Asia/Kolkata'),
            (now() AT TIME ZONE 'Asia/Kolkata')
        )
        ON CONFLICT (user_id) DO UPDATE SET 
            role = 'super_admin',
            updated_at = (now() AT TIME ZONE 'Asia/Kolkata');
    END IF;
END;
$$;
