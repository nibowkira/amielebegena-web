-- ============================================================================
-- Migration: PMS Phase 2.1 — Bug fix migration (QA fixes E & F)
--   E) pms_duplicate_product now copies audio, details_link and sort_order so
--      a duplicate carries the full product settings. History, orders,
--      analytics and restore history are still NOT copied.
--   F) pms_create_restore_point now snapshots product_images together with each
--      product, and pms_restore_point_apply restores those image rows. Storage
--      objects (actual files) are referenced by path and are not deleted by the
--      restore flow, so file availability is preserved. Old-format snapshots
--      (no image payload) are applied gracefully without touching images.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- E) Duplicate product: copy audio, details link, sort order too.
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
        v_src.price, v_src.stock, v_src.featured, 'draft', v_src.details_link, v_src.audio_url,
        v_src.audio_enabled, v_src.badge, v_src.sort_order, v_src.meta_title, v_src.meta_description, v_src.currency
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

-- ----------------------------------------------------------------------------
-- F) Restore points: snapshot images with each product.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pms_create_restore_point(
    p_name text,
    p_description text DEFAULT NULL,
    p_filter jsonb DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_snapshot jsonb;
    v_point_id uuid;
BEGIN
    IF public.get_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can create restore points.';
    END IF;

    IF p_filter IS NOT NULL AND p_filter ? 'status' THEN
        SELECT jsonb_agg(
            to_jsonb(p) || jsonb_build_object(
                '_images', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'storage_path', pi.storage_path,
                        'display_order', pi.display_order,
                        'is_cover', pi.is_cover,
                        'alt_text', pi.alt_text
                    ) ORDER BY pi.display_order)
                    FROM public.product_images pi
                    WHERE pi.product_id = p.id
                ), '[]'::jsonb)
            ) ORDER BY p.sort_order, p.created_at
        )
        INTO v_snapshot
        FROM public.products p
        WHERE p.status = p_filter->>'status' AND p.deleted_at IS NULL;
    ELSE
        SELECT jsonb_agg(
            to_jsonb(p) || jsonb_build_object(
                '_images', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'storage_path', pi.storage_path,
                        'display_order', pi.display_order,
                        'is_cover', pi.is_cover,
                        'alt_text', pi.alt_text
                    ) ORDER BY pi.display_order)
                    FROM public.product_images pi
                    WHERE pi.product_id = p.id
                ), '[]'::jsonb)
            ) ORDER BY p.sort_order, p.created_at
        )
        INTO v_snapshot
        FROM public.products p
        WHERE p.deleted_at IS NULL;
    END IF;

    IF v_snapshot IS NULL THEN
        v_snapshot := '[]'::jsonb;
    END IF;

    INSERT INTO public.restore_points (name, description, created_by, snapshot)
    VALUES (p_name, p_description, auth.uid(), v_snapshot)
    RETURNING id INTO v_point_id;

    RETURN json_build_object('success', true, 'restore_point_id', v_point_id, 'products_snapshotted', jsonb_array_length(v_snapshot));
END;
$$;

-- ----------------------------------------------------------------------------
-- F) Restore points: apply restores product fields AND image rows.
--     Known limitation (documented, not silent):
--       - Products hard-deleted after the snapshot are not resurrected
--         (their row no longer exists).
--       - Products created after the snapshot are left untouched.
--       - Storage objects referenced by image paths are never deleted by this
--         function, so restored image rows keep pointing at existing files.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pms_restore_point_apply(p_restore_point_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_snapshot jsonb;
    v_product jsonb;
    v_image jsonb;
    v_applied integer := 0;
    v_prod_id uuid;
BEGIN
    IF public.get_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can apply restore points.';
    END IF;

    SELECT snapshot INTO v_snapshot
    FROM public.restore_points
    WHERE id = p_restore_point_id;

    IF v_snapshot IS NULL THEN
        RAISE EXCEPTION 'Restore point not found: %', p_restore_point_id;
    END IF;

    IF jsonb_typeof(v_snapshot) = 'array' THEN
        FOR v_product IN SELECT * FROM jsonb_array_elements(v_snapshot)
        LOOP
            IF v_product ? 'id' THEN
                v_prod_id := (v_product->>'id')::uuid;
                UPDATE public.products
                SET name              = COALESCE(v_product->>'name', name),
                    slug              = COALESCE(v_product->>'slug', slug),
                    category          = COALESCE(v_product->>'category', category),
                    short_description = COALESCE(v_product->>'short_description', short_description),
                    description       = COALESCE(v_product->>'description', description),
                    price             = COALESCE((v_product->>'price')::numeric, price),
                    stock             = COALESCE((v_product->>'stock')::integer, stock),
                    featured          = COALESCE((v_product->>'featured')::boolean, featured),
                    status            = COALESCE(v_product->>'status', status),
                    details_link      = COALESCE(v_product->>'details_link', details_link),
                    audio_url         = COALESCE(v_product->>'audio_url', audio_url),
                    audio_enabled     = COALESCE((v_product->>'audio_enabled')::boolean, audio_enabled),
                    badge             = COALESCE(v_product->>'badge', badge),
                    sort_order        = COALESCE((v_product->>'sort_order')::integer, sort_order),
                    meta_title        = COALESCE(v_product->>'meta_title', meta_title),
                    meta_description  = COALESCE(v_product->>'meta_description', meta_description),
                    currency          = COALESCE(v_product->>'currency', currency),
                    deleted_at        = NULL
                WHERE id = v_prod_id;
                IF FOUND THEN
                    v_applied := v_applied + 1;
                    -- Restore image rows if this snapshot captured them.
                    IF v_product ? '_images' AND jsonb_typeof(v_product->'_images') = 'array' THEN
                        DELETE FROM public.product_images WHERE product_id = v_prod_id;
                        FOR v_image IN SELECT * FROM jsonb_array_elements(v_product->'_images')
                        LOOP
                            INSERT INTO public.product_images (product_id, storage_path, display_order, is_cover, alt_text)
                            VALUES (
                                v_prod_id,
                                v_image->>'storage_path',
                                COALESCE((v_image->>'display_order')::integer, 0),
                                COALESCE((v_image->>'is_cover')::boolean, false),
                                v_image->>'alt_text'
                            );
                        END LOOP;
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END IF;

    RETURN json_build_object('success', true, 'products_restored', v_applied);
END;
$$;

NOTIFY pgrst, 'reload schema';
