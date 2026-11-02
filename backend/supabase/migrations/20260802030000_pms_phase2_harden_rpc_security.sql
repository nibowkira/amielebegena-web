-- ============================================================================
-- Migration: PMS Phase 2 — Harden RPC security (SECURITY CRITICAL)
-- Why: During Phase 2 verification, anonymous (anon) users were able to call
--      the PMS SECURITY DEFINER RPCs and create/duplicate/delete products.
--      Root causes:
--        1) New functions get EXECUTE granted to PUBLIC by default in
--           PostgreSQL, so the anon key could invoke the RPCs.
--        2) public.get_user_role() returns NULL when there is no profile row
--           (anonymous), and `NULL <> 'admin'` evaluates to NULL (not true),
--           so the admin guard `IF get_user_role() <> 'admin' THEN RAISE`
--           never fired for anonymous callers.
-- Fix:
--        1) REVOKE EXECUTE ... FROM PUBLIC on all PMS RPCs (defense in depth).
--        2) Make get_user_role() NULL-safe (return '' instead of NULL). This
--           repairs every existing `<> 'admin'` guard at once, while leaving
--           the `= 'admin'` RLS policy comparisons unchanged in outcome.
--        3) Clean up test rows created during verification.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Null-safe role helper
--    BEFORE: NULL for anonymous -> `<> 'admin'` guards are bypassed.
--    AFTER : '' for anonymous   -> `<> 'admin'` evaluates to true (raise).
--            `= 'admin'` comparisons still return false for anonymous.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN COALESCE((SELECT role::text FROM public.profiles WHERE id = auth.uid()), '');
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Revoke PUBLIC execute from every PMS RPC (anon can no longer call them).
--    Re-grant to authenticated + service_role (dashboard sessions only).
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.pms_slugify(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pms_slugify(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.pms_product_slug_available(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pms_product_slug_available(text, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.pms_duplicate_product(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pms_duplicate_product(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.pms_upsert_product(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pms_upsert_product(jsonb, jsonb) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.pms_bulk_status_update(uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pms_bulk_status_update(uuid[], text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.pms_bulk_soft_delete(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pms_bulk_soft_delete(uuid[]) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.pms_bulk_restore(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pms_bulk_restore(uuid[]) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.pms_restore_point_apply(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pms_restore_point_apply(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.pms_create_restore_point(text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pms_create_restore_point(text, text, jsonb) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. Cleanup test rows created during RPC verification (anon probes).
--    - Duplicate product created by pms_duplicate_product probe.
--    - Product created by the pms_upsert_product probe.
--    - Restore point snapshot created by the pms_create_restore_point probe.
-- ----------------------------------------------------------------------------
DELETE FROM public.products WHERE id = '2db59e38-951b-4280-8b15-9d044369ca8c'::uuid;
DELETE FROM public.products WHERE id = '32bac6d2-d345-4a02-9f48-28d56e3fe792'::uuid;
DELETE FROM public.restore_points WHERE id = '343f0156-7333-4942-949b-f10247aa729e'::uuid;

NOTIFY pgrst, 'reload schema';
