-- ============================================================================
-- Migration: Email Verification Enforcement for Sensitive Affiliate Actions
-- Purpose:
--   Require email_confirmed_at (from Supabase Auth JWT) before affiliates can
--   insert withdrawal requests. This is the database-level enforcement layer
--   that cannot be bypassed by frontend manipulation.
--
-- Does NOT touch: profiles, affiliates, affiliate_applications, commissions,
-- orders, products, notifications, audit_logs, or any other table/policy.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop the existing permissive withdrawal INSERT policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Affiliates can insert own withdrawals"
    ON public.affiliate_withdrawals;

-- ---------------------------------------------------------------------------
-- 2. Create new INSERT policy requiring verified email
--    Uses (select auth.uid()) for efficient single-evaluation in RLS.
--    Uses auth.jwt() ->> 'email_confirmed_at' to check verification state
--    directly from the Supabase Auth token — cannot be forged by clients.
-- ---------------------------------------------------------------------------
CREATE POLICY "Affiliates can insert own withdrawals (verified email)"
    ON public.affiliate_withdrawals
    FOR INSERT
    WITH CHECK (
        (select auth.uid()) = affiliate_id
        AND (auth.jwt() ->> 'email_confirmed_at') IS NOT NULL
    );

-- ---------------------------------------------------------------------------
-- 3. Verify existing SELECT and admin policies are untouched
--    (These are NOT modified — listed here for documentation only)
--
--    "Affiliates can view own withdrawals"
--        FOR SELECT USING (auth.uid() = affiliate_id OR get_user_role() = 'admin')
--
--    "Admins full control on withdrawals"
--        FOR ALL USING (get_user_role() = 'admin')
-- ---------------------------------------------------------------------------

NOTIFY pgrst, 'reload schema';
