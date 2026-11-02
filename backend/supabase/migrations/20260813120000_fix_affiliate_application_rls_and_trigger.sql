-- ============================================================================
-- Migration: Lock down affiliate application approval (RLS + trigger auth)
-- Purpose:
--   1. Replace the permissive FOR ALL policy on public.affiliate_applications
--      so normal users can no longer UPDATE their own application's status to
--      'approved' (the self-approval bypass).
--   2. Add an explicit server-side admin authorization check inside the
--      handle_affiliate_approval() trigger so a pending -> approved transition
--      can NEVER be caused by a non-admin, even if RLS is relaxed later.
--   3. Preserves legitimate user flows:
--        - Insert a new application (status = 'pending')
--        - Re-apply after rejection (affiliate-service.submitApplication sets
--          status = 'pending', reviewed_by = NULL, reviewed_at = NULL)
--        - Admin approve / reject (get_user_role() = 'admin')
-- Does NOT touch: the global 8% commission engine, payment approval, withdrawals,
-- affiliate balances, historical commissions, products, or the dashboard.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. DROP old permissive policy and any previous versions of new policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow users to submit and view their own application"
    ON public.affiliate_applications;
DROP POLICY IF EXISTS "Allow users to view their own application"
    ON public.affiliate_applications;
DROP POLICY IF EXISTS "Allow admins to review affiliate applications"
    ON public.affiliate_applications;
DROP POLICY IF EXISTS "Allow users to update only their own pending application"
    ON public.affiliate_applications;
DROP POLICY IF EXISTS "Allow admins to delete affiliate applications"
    ON public.affiliate_applications;

-- ---------------------------------------------------------------------------
-- 2. SELECT: users may view their own application; admins may view all.
-- ---------------------------------------------------------------------------
CREATE POLICY "Allow users to view their own application"
    ON public.affiliate_applications
    FOR SELECT
    USING (auth.uid() = user_id OR public.get_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 3. UPDATE (admin): admins may approve/reject and edit any field.
-- ---------------------------------------------------------------------------
CREATE POLICY "Allow admins to review affiliate applications"
    ON public.affiliate_applications
    FOR UPDATE
    USING (public.get_user_role() = 'admin')
    WITH CHECK (public.get_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 4. UPDATE (owner): users may edit ONLY non-privileged fields of their own
--    application. status must remain 'pending' (the only value the re-apply
--    flow ever writes) and the review audit fields must stay NULL.
--    Setting status = 'approved' (or planting review metadata) is impossible.
-- ---------------------------------------------------------------------------
CREATE POLICY "Allow users to update only their own pending application"
    ON public.affiliate_applications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id
        AND status = 'pending'
        AND reviewed_by IS NULL
        AND reviewed_at IS NULL
    );

-- ---------------------------------------------------------------------------
-- 5. DELETE (admin): preserves the previous capability admins had via the
--    dropped FOR ALL policy.
-- ---------------------------------------------------------------------------
CREATE POLICY "Allow admins to delete affiliate applications"
    ON public.affiliate_applications
    FOR DELETE
    USING (public.get_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 6. TRIGGER AUTHORIZATION SAFEGUARD
--    handle_affiliate_approval() now refuses to promote an application unless
--    the triggering session belongs to an administrator. Uses the same
--    get_user_role() = 'admin' check as protect_profile_roles() and
--    approve_order_payment(). RLS runs before this BEFORE-update trigger, so
--    this is the defense-in-depth backstop for the pending -> approved path.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_affiliate_approval()
RETURNS trigger security definer set search_path = public AS $$
declare
    base_code text;
    ref_code text;
    attempts integer := 0;
begin
    -- Only execute when status transitions from 'pending' to 'approved'
    if new.status = 'approved' and old.status = 'pending' then

        -- Server-side authorization: only administrators may approve
        if public.get_user_role() <> 'admin' then
            raise exception 'Access Denied: Only administrators can approve affiliate applications.';
        end if;

        -- 1. Generate clean, alphanumeric base code from applicant name
        select full_name into base_code from public.profiles where id = new.user_id;
        base_code := lower(regexp_replace(base_code, '[^a-zA-Z0-9]', '', 'g'));
        if length(base_code) < 3 then
            base_code := 'aff';
        end if;
        base_code := substring(base_code from 1 for 10);

        -- 2. Find a unique referral code suffix
        loop
            attempts := attempts + 1;
            if attempts > 100 then
                raise exception 'Transaction Failed: Could not generate a unique referral code after 100 attempts.';
            end if;

            ref_code := base_code || '-' || floor(random() * 9000 + 1000)::text;

            if not exists (select 1 from public.affiliates where referral_code = ref_code) then
                exit;
            end if;
        end loop;

        -- 3. Create the affiliate record
        insert into public.affiliates (user_id, referral_code, sales_count)
        values (new.user_id, ref_code, 0);

        -- 4. Update the user role to 'affiliate'
        update public.profiles
        set role = 'affiliate'
        where id = new.user_id;

        -- Record audit details
        new.reviewed_at := now();
        new.reviewed_by := auth.uid();

    end if;

    return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Ensure the trigger still points at the (replaced) function. The CREATE OR
-- REPLACE above already updates the function the trigger calls; this guard
-- simply guarantees the trigger exists even if it was ever dropped.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_affiliate_approved ON public.affiliate_applications;
CREATE TRIGGER on_affiliate_approved
    before update on public.affiliate_applications
    for each row execute procedure public.handle_affiliate_approval();

NOTIFY pgrst, 'reload schema';