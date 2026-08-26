-- ============================================================================
-- Migration: 20260826173000_optimize_rls_initplan_auth_queries.sql
-- Purpose:
--   Address Supabase Security Advisor performance recommendation: auth_rls_initplan
--   Wrap auth.uid() function calls with (select auth.uid()) across RLS policies
--   to enable PostgreSQL query plan scalar caching (InitPlan) and prevent per-row
--   re-evaluation without modifying any authorization semantics or permissions.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;
CREATE POLICY "Allow users to read their own profile"
    ON public.profiles
    FOR SELECT
    USING (((select auth.uid()) = id) OR (public.get_user_role() = 'admin'));

DROP POLICY IF EXISTS "Allow users to edit their own profile details" ON public.profiles;
CREATE POLICY "Allow users to edit their own profile details"
    ON public.profiles
    FOR UPDATE
    USING (((select auth.uid()) = id) OR (public.get_user_role() = 'admin'));

-- ---------------------------------------------------------------------------
-- 2. AFFILIATES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Affiliates can view own record" ON public.affiliates;
CREATE POLICY "Affiliates can view own record"
    ON public.affiliates
    FOR SELECT
    USING (((select auth.uid()) = user_id) OR (public.get_user_role() = 'admin'));

-- ---------------------------------------------------------------------------
-- 3. AFFILIATE APPLICATIONS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow users to view their own application" ON public.affiliate_applications;
CREATE POLICY "Allow users to view their own application"
    ON public.affiliate_applications
    FOR SELECT
    USING (((select auth.uid()) = user_id) OR (public.get_user_role() = 'admin'));

DROP POLICY IF EXISTS "Allow users to insert their own application" ON public.affiliate_applications;
CREATE POLICY "Allow users to insert their own application"
    ON public.affiliate_applications
    FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Allow users to update only their own pending application" ON public.affiliate_applications;
CREATE POLICY "Allow users to update only their own pending application"
    ON public.affiliate_applications
    FOR UPDATE
    USING ((select auth.uid()) = user_id)
    WITH CHECK (((select auth.uid()) = user_id) AND (status = 'pending') AND (reviewed_by IS NULL) AND (reviewed_at IS NULL));

-- ---------------------------------------------------------------------------
-- 4. AFFILIATE WITHDRAWALS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Affiliates can view own withdrawals" ON public.affiliate_withdrawals;
CREATE POLICY "Affiliates can view own withdrawals"
    ON public.affiliate_withdrawals
    FOR SELECT
    USING (((select auth.uid()) = affiliate_id) OR (public.get_user_role() = 'admin'));

DROP POLICY IF EXISTS "Affiliates can insert own withdrawals (verified email)" ON public.affiliate_withdrawals;
CREATE POLICY "Affiliates can insert own withdrawals (verified email)"
    ON public.affiliate_withdrawals
    FOR INSERT
    WITH CHECK (((select auth.uid()) = affiliate_id) AND (public.is_email_confirmed() OR (public.get_user_role() = 'admin')));

-- ---------------------------------------------------------------------------
-- 5. COMMISSIONS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Affiliates can view own commissions" ON public.commissions;
CREATE POLICY "Affiliates can view own commissions"
    ON public.commissions
    FOR SELECT
    USING (((select auth.uid()) = affiliate_id) OR (public.get_user_role() = 'admin'));

-- ---------------------------------------------------------------------------
-- 6. ORDERS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow customers and affiliates to view relevant orders" ON public.orders;
CREATE POLICY "Allow customers and affiliates to view relevant orders"
    ON public.orders
    FOR SELECT
    USING (((select auth.uid()) = customer_id) OR ((select auth.uid()) = affiliate_id) OR (public.get_user_role() = 'admin'));

-- ---------------------------------------------------------------------------
-- 7. ORDER FULFILLMENT HISTORY
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view fulfillment history" ON public.order_fulfillment_history;
CREATE POLICY "Admins can view fulfillment history"
    ON public.order_fulfillment_history
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role));

DROP POLICY IF EXISTS "Admins can insert fulfillment history" ON public.order_fulfillment_history;
CREATE POLICY "Admins can insert fulfillment history"
    ON public.order_fulfillment_history
    FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role));

-- ---------------------------------------------------------------------------
-- 8. NOTIFICATIONS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications
    FOR SELECT
    USING ((public.get_user_role() = 'admin') OR ((select auth.uid()) = user_id) OR ((user_id IS NULL) AND (user_role = public.get_user_role())));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications
    FOR UPDATE
    USING ((public.get_user_role() = 'admin') OR ((select auth.uid()) = user_id) OR ((user_id IS NULL) AND (user_role = public.get_user_role())));

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
    ON public.notifications
    FOR DELETE
    USING ((public.get_user_role() = 'admin') OR ((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK ((public.get_user_role() = 'admin') OR ((select auth.uid()) IS NOT NULL) OR true);

-- ---------------------------------------------------------------------------
-- 9. RELOAD SCHEMA CACHE
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
