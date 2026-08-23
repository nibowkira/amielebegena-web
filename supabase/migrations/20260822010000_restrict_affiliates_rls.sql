-- ============================================================================
-- Migration: 20260822010000_restrict_affiliates_rls.sql
-- Purpose:
--   P1-2: Restrict SELECT policy on affiliates table to prevent enumeration
--   of affiliate codes, user IDs, earnings, and sales numbers by anonymous callers.
--   Provides a secure, minimal-disclosure RPC validate_referral_code for
--   anonymous referral link validation and checkout attribution.
-- ============================================================================

-- 1. Ensure RLS is enabled on affiliates
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- 2. Drop overly permissive open SELECT policy if present
DROP POLICY IF EXISTS "Allow select check for active referral codes" ON public.affiliates;
DROP POLICY IF EXISTS "Affiliates can view own record" ON public.affiliates;
DROP POLICY IF EXISTS "Allow admins full control on affiliates" ON public.affiliates;

-- 3. Create strict RLS policies:
--    - Affiliates can only view their own affiliate row.
--    - Admins retain full management control.
CREATE POLICY "Affiliates can view own record" 
    ON public.affiliates 
    FOR SELECT 
    USING (auth.uid() = user_id OR public.get_user_role() = 'admin');

CREATE POLICY "Allow admins full control on affiliates" 
    ON public.affiliates 
    FOR ALL 
    USING (public.get_user_role() = 'admin');

-- 4. Create secure minimal RPC for public referral-code validation
--    Returns only referral_code and user_id necessary for client-side routing and attribution.
--    Does NOT disclose earnings, balances, or unrelated profile records.
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_code text;
    v_aff record;
BEGIN
    IF p_code IS NULL OR trim(p_code) = '' THEN
        RETURN json_build_object('valid', false, 'error', 'Referral code is required.');
    END IF;

    v_clean_code := trim(p_code);

    SELECT user_id, referral_code INTO v_aff
    FROM public.affiliates
    WHERE lower(referral_code) = lower(v_clean_code)
    LIMIT 1;

    IF v_aff.user_id IS NOT NULL THEN
        RETURN json_build_object(
            'valid', true,
            'referral_code', v_aff.referral_code,
            'user_id', v_aff.user_id
        );
    ELSE
        RETURN json_build_object(
            'valid', false,
            'error', 'Referral code not found.'
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_referral_code(text) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
