-- ============================================================================
-- Migration: 20260822000000_verify_profile_role_trigger.sql
-- Purpose: 
--   P1-1: Ensure robust server-side protection against privilege escalation on profiles.
--   Prevents non-admin users from altering their own (or others') role or is_active fields.
--   Uses IS DISTINCT FROM to be fully NULL-safe.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_profile_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Allow administrators full update rights
    IF public.get_user_role() = 'admin' THEN
        RETURN NEW;
    END IF;

    -- For non-admins, reject changes to role
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Access Denied: Non-administrators cannot modify user roles.';
    END IF;

    -- For non-admins, reject changes to is_active
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        RAISE EXCEPTION 'Access Denied: Non-administrators cannot modify account active status.';
    END IF;

    RETURN NEW;
END;
$$;

-- Drop trigger if already exists to ensure it is cleanly recreated
DROP TRIGGER IF EXISTS enforce_profile_security ON public.profiles;

CREATE TRIGGER enforce_profile_security
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_roles();

NOTIFY pgrst, 'reload schema';
