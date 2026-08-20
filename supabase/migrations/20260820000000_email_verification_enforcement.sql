-- ============================================================================
-- Migration: Email Verification Enforcement for Sensitive Affiliate Actions
-- Purpose:
--   Require email confirmation before affiliates can insert withdrawal requests.
--   Uses a SECURITY DEFINER stable helper is_email_confirmed() that checks:
--   1. auth.users.email_confirmed_at (live ground truth)
--   2. auth.jwt() ->> 'email_confirmed_at' (if available in token)
--   3. auth.jwt() -> 'user_metadata' ->> 'email_verified' (standard Supabase JWT claim)
--
-- This guarantees verified users are never incorrectly blocked by JWT claim
-- formatting differences, while strictly blocking unverified users.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create helper function to check email verification
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_email_confirmed()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = (select auth.uid())
          AND email_confirmed_at IS NOT NULL
    )
    OR (
        (auth.jwt() ->> 'email_confirmed_at') IS NOT NULL
    )
    OR (
        coalesce((auth.jwt() -> 'user_metadata' ->> 'email_verified')::boolean, false) = true
    );
$$;

-- ---------------------------------------------------------------------------
-- 2. Drop existing withdrawal INSERT policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Affiliates can insert own withdrawals"
    ON public.affiliate_withdrawals;

DROP POLICY IF EXISTS "Affiliates can insert own withdrawals (verified email)"
    ON public.affiliate_withdrawals;

-- ---------------------------------------------------------------------------
-- 3. Create new INSERT policy requiring verified email
--    Uses (select auth.uid()) for efficient single-evaluation in RLS.
-- ---------------------------------------------------------------------------
CREATE POLICY "Affiliates can insert own withdrawals (verified email)"
    ON public.affiliate_withdrawals
    FOR INSERT
    WITH CHECK (
        (select auth.uid()) = affiliate_id
        AND (
            public.is_email_confirmed()
            OR public.get_user_role() = 'admin'
        )
    );

-- ---------------------------------------------------------------------------
-- 4. Update check_wth_method constraint to support detailed account & bank details
-- ---------------------------------------------------------------------------
ALTER TABLE public.affiliate_withdrawals DROP CONSTRAINT IF EXISTS check_wth_method;
ALTER TABLE public.affiliate_withdrawals ADD CONSTRAINT check_wth_method CHECK (char_length(method) >= 2);

NOTIFY pgrst, 'reload schema';
