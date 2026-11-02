-- ============================================================================
-- Migration: PMS Phase 1 — Database Preparation
-- Purpose: Additive-only foundation for the Product Management System (PMS).
--          No existing tables/columns/policies are dropped. The live schema
--          is preserved; new objects are added and defaults backfill old rows.
--          Storefront read path (products + product_images join) is untouched.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Products: new PMS columns (idempotent adds, existing rows get defaults)
-- ----------------------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS details_link text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS audio_url text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS audio_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS badge text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_title text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Extend the status ladder: draft -> active -> inactive | out_of_stock | archived
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS check_products_status;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_products_status' AND conrelid = 'public.products'::regclass
    ) THEN
        ALTER TABLE public.products ADD CONSTRAINT check_products_status
            CHECK (status IN ('draft', 'active', 'inactive', 'out_of_stock', 'archived'));
    END IF;
END
$$;

-- Currency sanity constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_products_currency' AND conrelid = 'public.products'::regclass
    ) THEN
        ALTER TABLE public.products ADD CONSTRAINT check_products_currency
            CHECK (currency IN ('USD', 'ETB', 'EUR'));
    END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 2. Product Images: alt text for accessibility / SEO
-- ----------------------------------------------------------------------------
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS alt_text text;

-- ----------------------------------------------------------------------------
-- 3. Performance indexes (idempotent)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_status        ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_category      ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_sort_order    ON public.products(sort_order);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at    ON public.products(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_created_at    ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_images_cover   ON public.product_images(product_id) WHERE is_cover = true;

-- ----------------------------------------------------------------------------
-- 4. Collections table (storefront categories) + seed of the 5 frozen tabs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collections (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          text UNIQUE NOT NULL CONSTRAINT check_collections_slug CHECK (slug ~* '^[a-z0-9-]+$'),
    name_en       text NOT NULL,
    name_am       text NOT NULL,
    icon          text,
    description   text,
    display_order integer NOT NULL DEFAULT 0 CONSTRAINT check_collections_order CHECK (display_order >= 0),
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to view collections" ON public.collections
    FOR SELECT USING (true);

CREATE POLICY "Allow admins full control on collections" ON public.collections
    FOR ALL USING (public.get_user_role() = 'admin');

CREATE TRIGGER set_collections_updated_at
    BEFORE UPDATE ON public.collections
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Seed exactly matches the 5 frozen storefront tabs (idempotent)
INSERT INTO public.collections (slug, name_en, name_am, icon, display_order)
VALUES
    ('strings',      'Strings',      'ገመድ መሳሪያዎች', '🪕', 1),
    ('percussion',   'Percussion',   'ምት መሳሪያዎች',   '🥁', 2),
    ('accessories',  'Accessories',  'መለዋወጫዎች',   '🪶', 3),
    ('books',        'Books',        'መጻሕፍት',        '📚', 4),
    ('bags',         'Bags',         'ቦርሳዎች',       '🎒', 5)
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. Product templates (reusable presets for creating products quickly)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_templates (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name          text NOT NULL,
    category      text,
    template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins full control on product templates" ON public.product_templates
    FOR ALL USING (public.get_user_role() = 'admin');

CREATE TRIGGER set_product_templates_updated_at
    BEFORE UPDATE ON public.product_templates
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 6. Media assets library + media usage links
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_assets (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket       text NOT NULL,
    storage_path text NOT NULL,
    file_name    text,
    mime_type    text,
    size_bytes   bigint,
    kind         text NOT NULL DEFAULT 'image' CONSTRAINT check_media_kind CHECK (kind IN ('image', 'audio', 'document')),
    alt_text     text,
    uploaded_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to view media assets" ON public.media_assets
    FOR SELECT USING (true);

CREATE POLICY "Allow admins full control on media assets" ON public.media_assets
    FOR ALL USING (public.get_user_role() = 'admin');

CREATE TABLE IF NOT EXISTS public.media_usages (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    media_asset_id uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
    product_id    uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    usage_type    text NOT NULL DEFAULT 'image' CONSTRAINT check_media_usage_type CHECK (usage_type IN ('image', 'audio', 'document', 'attachment')),
    display_order integer NOT NULL DEFAULT 0,
    is_cover      boolean NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (media_asset_id, product_id, usage_type)
);

ALTER TABLE public.media_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to view media usages" ON public.media_usages
    FOR SELECT USING (true);

CREATE POLICY "Allow admins full control on media usages" ON public.media_usages
    FOR ALL USING (public.get_user_role() = 'admin');

CREATE INDEX IF NOT EXISTS idx_media_assets_kind         ON public.media_assets(kind);
CREATE INDEX IF NOT EXISTS idx_media_assets_uploaded_by  ON public.media_assets(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_usages_product_id   ON public.media_usages(product_id);
CREATE INDEX IF NOT EXISTS idx_media_usages_asset_id     ON public.media_usages(media_asset_id);

-- ----------------------------------------------------------------------------
-- 7. Product history (audit trail) + automatic logging trigger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_history (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id    uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    changed_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action        text NOT NULL CONSTRAINT check_product_history_action CHECK (action IN ('create', 'update', 'status_change', 'delete', 'restore')),
    field_changes jsonb NOT NULL DEFAULT '{}'::jsonb,
    snapshot      jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins to view product history" ON public.product_history
    FOR SELECT USING (public.get_user_role() = 'admin');

CREATE INDEX IF NOT EXISTS idx_product_history_product_id ON public.product_history(product_id);
CREATE INDEX IF NOT EXISTS idx_product_history_created_at ON public.product_history(created_at DESC);

CREATE OR REPLACE FUNCTION public.pms_log_product_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_action text;
    v_changes jsonb := '{}'::jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'create';
        v_changes := '{}'::jsonb;
        INSERT INTO public.product_history (product_id, changed_by, action, field_changes, snapshot)
        VALUES (NEW.id, auth.uid(), v_action, v_changes, to_jsonb(NEW));
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        v_action := 'delete';
        INSERT INTO public.product_history (product_id, changed_by, action, field_changes, snapshot)
        VALUES (OLD.id, auth.uid(), v_action, '{}'::jsonb, to_jsonb(OLD));
        RETURN OLD;
    END IF;

    -- UPDATE: detect meaningful changes; classify status changes separately
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        v_action := 'status_change';
        v_changes := jsonb_build_object('status', jsonb_build_object('from', OLD.status, 'to', NEW.status));
    ELSE
        v_action := 'update';
        SELECT jsonb_object_agg(k.key, jsonb_build_object('from', v.oldv, 'to', v.newv))
        INTO v_changes
        FROM jsonb_each(to_jsonb(NEW)) k,
             LATERAL (SELECT to_jsonb(OLD) ->> k.key AS oldv,
                             to_jsonb(NEW) ->> k.key AS newv) v
        WHERE to_jsonb(OLD) ->> k.key IS DISTINCT FROM to_jsonb(NEW) ->> k.key;
        IF v_changes IS NULL THEN
            v_changes := '{}'::jsonb;
        END IF;
    END IF;

    -- Ignore pure updated_at touches with no real field changes
    IF v_changes = '{}'::jsonb THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.product_history (product_id, changed_by, action, field_changes, snapshot)
    VALUES (NEW.id, auth.uid(), v_action, v_changes, to_jsonb(NEW));
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_history ON public.products;
CREATE TRIGGER trg_product_history
    AFTER INSERT OR UPDATE OR DELETE ON public.products
    FOR EACH ROW EXECUTE PROCEDURE public.pms_log_product_change();

-- ----------------------------------------------------------------------------
-- 8. Restore points (manual snapshots for rolling back product state)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restore_points (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name         text NOT NULL,
    description  text,
    created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    snapshot     jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.restore_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins full control on restore points" ON public.restore_points
    FOR ALL USING (public.get_user_role() = 'admin');

CREATE INDEX IF NOT EXISTS idx_restore_points_created_by ON public.restore_points(created_by);
CREATE INDEX IF NOT EXISTS idx_restore_points_created_at ON public.restore_points(created_at DESC);

-- ----------------------------------------------------------------------------
-- 9. PMS RPCs (admin-only, SECURITY DEFINER, replaceable)
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

    -- Upsert the product
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

    -- Replace the image set (admin editor semantics)
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

    SELECT * INTO v_product FROM public.products WHERE id = v_product_id;

    RETURN json_build_object('success', true, 'product_id', v_product_id, 'product', to_jsonb(v_product));
END;
$$;

GRANT EXECUTE ON FUNCTION public.pms_upsert_product(jsonb, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.pms_bulk_status_update(
    p_ids uuid[],
    p_status text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count integer;
BEGIN
    IF public.get_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can update product statuses.';
    END IF;

    UPDATE public.products
    SET status = p_status
    WHERE id = ANY(p_ids)
      AND deleted_at IS NULL;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN json_build_object('success', true, 'updated', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.pms_bulk_status_update(uuid[], text) TO authenticated;

CREATE OR REPLACE FUNCTION public.pms_bulk_soft_delete(p_ids uuid[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count integer;
BEGIN
    IF public.get_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can delete products.';
    END IF;

    UPDATE public.products
    SET deleted_at = now()
    WHERE id = ANY(p_ids)
      AND deleted_at IS NULL;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN json_build_object('success', true, 'soft_deleted', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.pms_bulk_soft_delete(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.pms_bulk_restore(p_ids uuid[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count integer;
BEGIN
    IF public.get_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can restore products.';
    END IF;

    UPDATE public.products
    SET deleted_at = NULL
    WHERE id = ANY(p_ids)
      AND deleted_at IS NOT NULL;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN json_build_object('success', true, 'restored', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.pms_bulk_restore(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.pms_restore_point_apply(p_restore_point_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_snapshot jsonb;
    v_product jsonb;
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
                END IF;
            END IF;
        END LOOP;
    END IF;

    RETURN json_build_object('success', true, 'products_restored', v_applied);
END;
$$;

GRANT EXECUTE ON FUNCTION public.pms_restore_point_apply(uuid) TO authenticated;

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

    -- Snapshot all non-deleted products (or a filtered subset via {status: '...'})
    IF p_filter IS NOT NULL AND p_filter ? 'status' THEN
        SELECT jsonb_agg(to_jsonb(p) ORDER BY p.sort_order, p.created_at)
        INTO v_snapshot
        FROM public.products p
        WHERE p.status = p_filter->>'status' AND p.deleted_at IS NULL;
    ELSE
        SELECT jsonb_agg(to_jsonb(p) ORDER BY p.sort_order, p.created_at)
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

GRANT EXECUTE ON FUNCTION public.pms_create_restore_point(text, text, jsonb) TO authenticated;

-- ----------------------------------------------------------------------------
-- 10. Storage: product-audio bucket + admin-only write policies (public read)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-audio', 'product-audio', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read of product-audio" ON storage.objects
    FOR SELECT USING (bucket_id = 'product-audio');

CREATE POLICY "Allow admin insert of product-audio" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'product-audio' AND public.get_user_role() = 'admin');

CREATE POLICY "Allow admin update of product-audio" ON storage.objects
    FOR UPDATE USING (bucket_id = 'product-audio' AND public.get_user_role() = 'admin');

CREATE POLICY "Allow admin delete of product-audio" ON storage.objects
    FOR DELETE USING (bucket_id = 'product-audio' AND public.get_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 11. Reload PostgREST schema cache
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
