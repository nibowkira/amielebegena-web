-- ============================================================================
-- Migration: PMS Phase 2 — Product Management RPCs
-- Purpose: Small additive RPC layer for the Product Management dashboard.
--          Reuses the Phase 1 schema (pms_upsert_product, bulk ops, restore
--          points, product_history trigger) with no structural changes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Slug generator (URL-safe, unique-aware)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pms_slugify(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT COALESCE(
        regexp_replace(
            lower(trim(regexp_replace(coalesce(p_name, ''), '[^a-zA-Z0-9]+', '-', 'g'))),
            '^-+|-+$', '', 'g'
        ),
        ''
    );
$$;

-- ----------------------------------------------------------------------------
-- 2. Check slug availability (used by the Add/Edit form)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pms_product_slug_available(p_slug text, p_exclude_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_slug IS NULL OR p_slug = '' THEN
        RETURN false;
    END IF;
    RETURN NOT EXISTS (
        SELECT 1 FROM public.products
        WHERE slug = p_slug
          AND (p_exclude_id IS NULL OR id <> p_exclude_id)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.pms_slugify(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pms_product_slug_available(text, uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Duplicate a product (name, images, pricing, collection, settings).
--    Orders, analytics and history are intentionally NOT copied.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pms_duplicate_product(p_product_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_src public.products%ROWTYPE;
    v_new_id uuid;
    v_slug text;
    v_base_slug text;
    v_suffix integer := 1;
    v_name text;
BEGIN
    IF public.get_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can duplicate products.';
    END IF;

    SELECT * INTO v_src FROM public.products WHERE id = p_product_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found: %', p_product_id;
    END IF;

    v_name := v_src.name || ' (Copy)';
    v_base_slug := COALESCE(public.pms_slugify(v_src.name || '-copy'), 'copy');
    v_slug := v_base_slug;
    WHILE NOT public.pms_product_slug_available(v_slug) LOOP
        v_slug := v_base_slug || '-' || v_suffix;
        v_suffix := v_suffix + 1;
    END LOOP;

    INSERT INTO public.products (
        name, slug, category, short_description, description,
        price, stock, featured, status, details_link, audio_url,
        audio_enabled, badge, sort_order, meta_title, meta_description, currency
    ) VALUES (
        v_name, v_slug, v_src.category, v_src.short_description, v_src.description,
        v_src.price, v_src.stock, v_src.featured, 'draft', NULL, NULL,
        false, v_src.badge, 0, v_src.meta_title, v_src.meta_description, v_src.currency
    )
    RETURNING id INTO v_new_id;

    INSERT INTO public.product_images (product_id, storage_path, display_order, is_cover, alt_text)
    SELECT v_new_id, storage_path, display_order, is_cover, alt_text
    FROM public.product_images
    WHERE product_id = p_product_id;

    RETURN json_build_object(
        'success', true,
        'product_id', v_new_id,
        'slug', v_slug,
        'name', v_name
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.pms_duplicate_product(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
