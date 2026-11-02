-- ============================================================================
-- Migration: PMS Phase 3 — Collections, Media Library & Templates (DB layer)
-- Part 1: Collections gain color + archive columns; safe delete with product
--         reassignment (products are never deleted).
-- Part 2: Media Library RPCs: register assets, delete unused media (with
--         usage protection), and keep media_usages in sync with products.
-- Part 3: Product templates already exist (product_templates); no schema
--         change needed here.
-- Storefront read paths are untouched; everything is admin-gated and
-- additive-only.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Part 1 — Collections
-- ----------------------------------------------------------------------------
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Delete a collection WITHOUT deleting products: reassign them to another
-- collection, or leave them uncategorized. Never orphans data silently.
CREATE OR REPLACE FUNCTION public.pms_collection_delete(
    p_collection_id uuid,
    p_move_to_slug text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_slug text;
    v_reassigned integer := 0;
BEGIN
    IF public.get_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can delete collections.';
    END IF;

    SELECT slug INTO v_slug FROM public.collections WHERE id = p_collection_id;
    IF v_slug IS NULL THEN
        RAISE EXCEPTION 'Collection not found: %', p_collection_id;
    END IF;

    IF p_move_to_slug IS NOT NULL AND p_move_to_slug <> '' THEN
        UPDATE public.products
        SET category = p_move_to_slug
        WHERE category = v_slug AND deleted_at IS NULL;
    ELSE
        UPDATE public.products
        SET category = ''
        WHERE category = v_slug AND deleted_at IS NULL;
    END IF;
    GET DIAGNOSTICS v_reassigned = ROW_COUNT;

    DELETE FROM public.collections WHERE id = p_collection_id;

    RETURN json_build_object('success', true, 'products_reassigned', v_reassigned);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pms_collection_delete(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pms_collection_delete(uuid, text) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Part 2 — Media Library RPCs
-- ----------------------------------------------------------------------------

-- Register (or re-tag) a media asset. Returns the asset id.
CREATE OR REPLACE FUNCTION public.pms_register_media_asset(
    p_bucket text,
    p_storage_path text,
    p_file_name text DEFAULT NULL,
    p_mime_type text DEFAULT NULL,
    p_size_bytes bigint DEFAULT NULL,
    p_kind text DEFAULT 'image',
    p_alt_text text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id uuid;
BEGIN
    IF public.get_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can manage media.';
    END IF;

    SELECT id INTO v_id
    FROM public.media_assets
    WHERE storage_path = p_storage_path AND bucket = p_bucket
    LIMIT 1;

    IF v_id IS NULL THEN
        INSERT INTO public.media_assets (bucket, storage_path, file_name, mime_type, size_bytes, kind, alt_text, uploaded_by)
        VALUES (p_bucket, p_storage_path, p_file_name, p_mime_type, p_size_bytes, p_kind, p_alt_text, auth.uid())
        RETURNING id INTO v_id;
    ELSE
        UPDATE public.media_assets
        SET file_name   = COALESCE(p_file_name, file_name),
            mime_type   = COALESCE(p_mime_type, mime_type),
            size_bytes  = COALESCE(p_size_bytes, size_bytes),
            kind        = p_kind,
            alt_text    = COALESCE(p_alt_text, alt_text),
            uploaded_by = COALESCE(uploaded_by, auth.uid())
        WHERE id = v_id;
    END IF;

    RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pms_register_media_asset(text, text, text, text, bigint, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pms_register_media_asset(text, text, text, text, bigint, text, text) TO authenticated, service_role;

-- Delete a media asset. Protected: refuses to delete assets still used by
-- products unless p_force is true. Removes the storage object best-effort.
CREATE OR REPLACE FUNCTION public.pms_delete_media_asset(
    p_asset_id uuid DEFAULT NULL,
    p_storage_path text DEFAULT NULL,
    p_bucket text DEFAULT NULL,
    p_force boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id uuid;
    v_bucket text;
    v_path text;
    v_usage integer;
    v_storage_err text;
BEGIN
    IF public.get_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can manage media.';
    END IF;

    IF p_asset_id IS NOT NULL THEN
        SELECT id, bucket, storage_path INTO v_id, v_bucket, v_path
        FROM public.media_assets WHERE id = p_asset_id;
    ELSIF p_storage_path IS NOT NULL THEN
        SELECT id, bucket, storage_path INTO v_id, v_bucket, v_path
        FROM public.media_assets
        WHERE storage_path = p_storage_path AND (p_bucket IS NULL OR bucket = p_bucket)
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    IF v_id IS NULL THEN
        RETURN json_build_object('success', true, 'already_gone', true, 'deleted', 0);
    END IF;

    SELECT count(*) INTO v_usage FROM public.media_usages WHERE media_asset_id = v_id;

    IF v_usage > 0 AND NOT p_force THEN
        RAISE EXCEPTION 'This media file is used by % product(s). Remove those usages first or force delete.', v_usage;
    END IF;

    BEGIN
        DELETE FROM storage.objects WHERE bucket_id = v_bucket AND name = v_path;
    EXCEPTION WHEN OTHERS THEN
        v_storage_err := SQLERRM;
    END;

    DELETE FROM public.media_assets WHERE id = v_id;

    RETURN json_build_object(
        'success', true, 'deleted', 1,
        'bucket', v_bucket, 'path', v_path,
        'usages_removed', v_usage,
        'storage_error', v_storage_err
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pms_delete_media_asset(uuid, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pms_delete_media_asset(uuid, text, text, boolean) TO authenticated, service_role;

-- Reconcile media_usages for one product from its current images + audio.
-- Idempotent; deletes then re-creates usage rows for that product.
CREATE OR REPLACE FUNCTION public.pms_sync_media_usages(p_product_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_audio_url text;
    v_image_usages integer;
    v_audio_usages integer := 0;
BEGIN
    IF public.get_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can manage media.';
    END IF;

    DELETE FROM public.media_usages WHERE product_id = p_product_id;

    INSERT INTO public.media_usages (media_asset_id, product_id, usage_type, display_order, is_cover)
    SELECT ma.id, pi.product_id, 'image', pi.display_order, pi.is_cover
    FROM public.product_images pi
    JOIN public.media_assets ma
      ON ma.storage_path = pi.storage_path AND ma.bucket = 'product-images'
    WHERE pi.product_id = p_product_id;
    GET DIAGNOSTICS v_image_usages = ROW_COUNT;

    SELECT audio_url INTO v_audio_url FROM public.products WHERE id = p_product_id;
    IF v_audio_url IS NOT NULL AND v_audio_url <> '' THEN
        INSERT INTO public.media_usages (media_asset_id, product_id, usage_type)
        SELECT ma.id, p_product_id, 'audio'
        FROM public.media_assets ma
        WHERE ma.storage_path = v_audio_url AND ma.bucket = 'product-audio';
        GET DIAGNOSTICS v_audio_usages = ROW_COUNT;
    END IF;

    RETURN json_build_object(
        'success', true, 'product_id', p_product_id,
        'image_usages', v_image_usages, 'audio_usages', v_audio_usages
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pms_sync_media_usages(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pms_sync_media_usages(uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Part 2 — Keep usages accurate: pms_upsert_product now syncs media_usages
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pms_upsert_product(
    p_product jsonb,
    p_images jsonb DEFAULT '[]'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_product_id uuid;
    v_product record;
    v_img jsonb;
BEGIN
    IF public.get_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can manage products.';
    END IF;

    IF p_product ? 'id' AND p_product->>'id' <> '' THEN
        v_product_id := (p_product->>'id')::uuid;
        UPDATE public.products
        SET name              = COALESCE(p_product->>'name', name),
            slug              = COALESCE(p_product->>'slug', slug),
            category          = COALESCE(p_product->>'category', category),
            short_description = COALESCE(p_product->>'short_description', short_description),
            description       = COALESCE(p_product->>'description', description),
            price             = COALESCE((p_product->>'price')::numeric, price),
            stock             = COALESCE((p_product->>'stock')::integer, stock),
            featured          = COALESCE((p_product->>'featured')::boolean, featured),
            status            = COALESCE(p_product->>'status', status),
            details_link      = COALESCE(p_product->>'details_link', details_link),
            audio_url         = COALESCE(p_product->>'audio_url', audio_url),
            audio_enabled     = COALESCE((p_product->>'audio_enabled')::boolean, audio_enabled),
            badge             = COALESCE(p_product->>'badge', badge),
            sort_order        = COALESCE((p_product->>'sort_order')::integer, sort_order),
            meta_title        = COALESCE(p_product->>'meta_title', meta_title),
            meta_description  = COALESCE(p_product->>'meta_description', meta_description),
            currency          = COALESCE(p_product->>'currency', currency),
            deleted_at        = CASE WHEN (p_product->>'deleted_at') IS NULL THEN deleted_at
                                     WHEN (p_product->>'deleted_at') = '' THEN NULL
                                     ELSE (p_product->>'deleted_at')::timestamptz END
        WHERE id = v_product_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product not found: %', v_product_id;
        END IF;
    ELSE
        INSERT INTO public.products (
            name, slug, category, short_description, description,
            price, stock, featured, status, details_link, audio_url,
            audio_enabled, badge, sort_order, meta_title, meta_description, currency
        ) VALUES (
            p_product->>'name', p_product->>'slug', p_product->>'category',
            p_product->>'short_description', p_product->>'description',
            COALESCE((p_product->>'price')::numeric, 0),
            COALESCE((p_product->>'stock')::integer, 0),
            COALESCE((p_product->>'featured')::boolean, false),
            COALESCE(p_product->>'status', 'draft'),
            p_product->>'details_link', p_product->>'audio_url',
            COALESCE((p_product->>'audio_enabled')::boolean, false),
            p_product->>'badge',
            COALESCE((p_product->>'sort_order')::integer, 0),
            p_product->>'meta_title', p_product->>'meta_description',
            COALESCE(p_product->>'currency', 'USD')
        )
        RETURNING id INTO v_product_id;
    END IF;

    DELETE FROM public.product_images WHERE product_id = v_product_id;
    FOR v_img IN SELECT * FROM jsonb_array_elements(COALESCE(p_images, '[]'::jsonb))
    LOOP
        INSERT INTO public.product_images (product_id, storage_path, display_order, is_cover, alt_text)
        VALUES (
            v_product_id,
            v_img->>'storage_path',
            COALESCE((v_img->>'display_order')::integer, 0),
            COALESCE((v_img->>'is_cover')::boolean, false),
            v_img->>'alt_text'
        );
    END LOOP;

    -- Keep the media library's usage counts accurate for this product.
    PERFORM public.pms_sync_media_usages(v_product_id);

    SELECT * INTO v_product FROM public.products WHERE id = v_product_id;

    RETURN json_build_object('success', true, 'product_id', v_product_id, 'product', to_jsonb(v_product));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pms_upsert_product(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pms_upsert_product(jsonb, jsonb) TO authenticated, service_role;

-- Duplicates also need media usage rows for their new image set + audio.
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

    PERFORM public.pms_sync_media_usages(v_new_id);

    RETURN json_build_object(
        'success', true,
        'product_id', v_new_id,
        'slug', v_slug,
        'name', v_name
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pms_duplicate_product(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pms_duplicate_product(uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Part 2 — Backfill: register existing images/audio in the library and link
-- their usage counts, so the media library reflects the live catalog.
-- ----------------------------------------------------------------------------
INSERT INTO public.media_assets (bucket, storage_path, kind, alt_text)
SELECT DISTINCT 'product-images', pi.storage_path, 'image', pi.alt_text
FROM public.product_images pi
WHERE pi.storage_path IS NOT NULL AND pi.storage_path <> ''
  AND NOT EXISTS (
      SELECT 1 FROM public.media_assets ma
      WHERE ma.storage_path = pi.storage_path AND ma.bucket = 'product-images'
  );

INSERT INTO public.media_assets (bucket, storage_path, kind)
SELECT DISTINCT 'product-audio', p.audio_url, 'audio'
FROM public.products p
WHERE p.audio_url IS NOT NULL AND p.audio_url <> ''
  AND NOT EXISTS (
      SELECT 1 FROM public.media_assets ma
      WHERE ma.storage_path = p.audio_url AND ma.bucket = 'product-audio'
  );

INSERT INTO public.media_usages (media_asset_id, product_id, usage_type, display_order, is_cover)
SELECT ma.id, pi.product_id, 'image', pi.display_order, pi.is_cover
FROM public.media_assets ma
JOIN public.product_images pi
  ON pi.storage_path = ma.storage_path AND ma.bucket = 'product-images'
ON CONFLICT (media_asset_id, product_id, usage_type) DO NOTHING;

INSERT INTO public.media_usages (media_asset_id, product_id, usage_type)
SELECT ma.id, p.id, 'audio'
FROM public.media_assets ma
JOIN public.products p
  ON p.audio_url = ma.storage_path AND ma.bucket = 'product-audio'
WHERE p.audio_url IS NOT NULL AND p.audio_url <> ''
ON CONFLICT (media_asset_id, product_id, usage_type) DO NOTHING;

NOTIFY pgrst, 'reload schema';
