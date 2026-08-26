-- ============================================================================
-- Migration: 20260826143000_enable_rls_commission_settings.sql
-- Purpose:
--   Fix Supabase Security Advisor warning: rls_disabled_in_public
--   Enable Row Level Security (RLS) on public.commission_settings table and
--   apply least-privilege security policies.
--
-- Security Architecture:
--   1. Enable RLS on public.commission_settings to prevent unauthorized direct
--      REST API access (SELECT, INSERT, UPDATE, DELETE) by anonymous or non-admin users.
--   2. Grant full management access exclusively to authenticated administrators
--      (public.get_user_role() = 'admin').
--   3. Anonymous and authenticated public callers retrieve the commission rate
--      strictly through the existing SECURITY DEFINER RPC public.get_commission_rate(),
--      ensuring zero direct table exposure while preserving public rate visibility.
-- ============================================================================

-- 1. Enable Row Level Security on commission_settings
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing/stale policies if present
DROP POLICY IF EXISTS "Allow admins full control on commission_settings" ON public.commission_settings;
DROP POLICY IF EXISTS "Admins full control on commission_settings" ON public.commission_settings;
DROP POLICY IF EXISTS "Allow admin select commission_settings" ON public.commission_settings;
DROP POLICY IF EXISTS "Allow admin update commission_settings" ON public.commission_settings;

-- 3. Create administrator-only policy
-- Why: Only authenticated administrators are authorized to inspect or modify
-- global commission configuration parameters.
CREATE POLICY "Allow admins full control on commission_settings"
    ON public.commission_settings
    FOR ALL
    USING (public.get_user_role() = 'admin')
    WITH CHECK (public.get_user_role() = 'admin');

-- 4. Re-affirm SECURITY DEFINER RPC for public rate retrieval
CREATE OR REPLACE FUNCTION public.get_commission_rate()
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rate numeric;
BEGIN
    SELECT rate INTO v_rate FROM public.commission_settings WHERE id = 1;
    RETURN COALESCE(v_rate, 8.0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_commission_rate() TO anon, authenticated, service_role;

-- 5. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
