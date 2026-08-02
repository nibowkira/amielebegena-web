-- ============================================================================
-- Rollback: PMS Phase 1 — Database Preparation (20260802000000 + 20260802010000)
-- WARNING: This script DESTROYS Phase 1 data (products history, restore points,
--          media library, collections). It should only be run if Phase 1 must
--          be fully reversed. Run via: supabase db execute --linked -f <this>
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Functions (drop first since triggers depend on them)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.pms_upsert_product(jsonb, jsonb);
DROP FUNCTION IF EXISTS public.pms_bulk_status_update(uuid[], text);
DROP FUNCTION IF EXISTS public.pms_bulk_soft_delete(uuid[]);
DROP FUNCTION IF EXISTS public.pms_bulk_restore(uuid[]);
DROP FUNCTION IF EXISTS public.pms_restore_point_apply(uuid);
DROP FUNCTION IF EXISTS public.pms_create_restore_point(text, text, jsonb);
DROP FUNCTION IF EXISTS public.pms_log_product_change();

-- ----------------------------------------------------------------------------
-- 2. Triggers on products
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_product_history_delete ON public.products;
DROP TRIGGER IF EXISTS trg_product_history ON public.products;

-- ----------------------------------------------------------------------------
-- 3. Phase 1 tables (order respects FKs)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.media_usages;
DROP TABLE IF EXISTS public.media_assets;
DROP TABLE IF EXISTS public.product_history;
DROP TABLE IF EXISTS public.restore_points;
DROP TABLE IF EXISTS public.product_templates;
DROP TABLE IF EXISTS public.collections;

-- ----------------------------------------------------------------------------
-- 4. Storage bucket + policies for product-audio
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read of product-audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin insert of product-audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin update of product-audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin delete of product-audio" ON storage.objects;
DELETE FROM storage.buckets WHERE id = 'product-audio';

-- ----------------------------------------------------------------------------
-- 5. product_images: drop alt_text
-- ----------------------------------------------------------------------------
ALTER TABLE public.product_images DROP COLUMN IF EXISTS alt_text;

-- ----------------------------------------------------------------------------
-- 6. products: drop new columns (data in these is lost)
-- ----------------------------------------------------------------------------
ALTER TABLE public.products DROP COLUMN IF EXISTS details_link;
ALTER TABLE public.products DROP COLUMN IF EXISTS audio_url;
ALTER TABLE public.products DROP COLUMN IF EXISTS audio_enabled;
ALTER TABLE public.products DROP COLUMN IF EXISTS badge;
ALTER TABLE public.products DROP COLUMN IF EXISTS sort_order;
ALTER TABLE public.products DROP COLUMN IF EXISTS meta_title;
ALTER TABLE public.products DROP COLUMN IF EXISTS meta_description;
ALTER TABLE public.products DROP COLUMN IF EXISTS currency;
ALTER TABLE public.products DROP COLUMN IF EXISTS deleted_at;

-- Restore the original status ladder (pre-Phase-1). Only safe when no rows use
-- the new states 'draft'/'archived'; otherwise the restore must be manual.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS check_products_status;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.products WHERE status NOT IN ('active', 'inactive', 'out_of_stock')) THEN
        RAISE WARNING 'Some products use Phase 1 statuses (draft/archived); check_products_status NOT restored. Fix statuses first, then re-add: CHECK (status IN (''active'',''inactive'',''out_of_stock''))';
    ELSE
        ALTER TABLE public.products ADD CONSTRAINT check_products_status
            CHECK (status IN ('active', 'inactive', 'out_of_stock'));
    END IF;
END
$$;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS check_products_currency;

-- ----------------------------------------------------------------------------
-- 7. Indexes created by Phase 1
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_products_status;
DROP INDEX IF EXISTS public.idx_products_category;
DROP INDEX IF EXISTS public.idx_products_sort_order;
DROP INDEX IF EXISTS public.idx_products_deleted_at;
DROP INDEX IF EXISTS public.idx_products_created_at;
DROP INDEX IF EXISTS public.idx_product_images_cover;
DROP INDEX IF EXISTS public.idx_media_assets_kind;
DROP INDEX IF EXISTS public.idx_media_assets_uploaded_by;
DROP INDEX IF EXISTS public.idx_media_usages_product_id;
DROP INDEX IF EXISTS public.idx_media_usages_asset_id;
DROP INDEX IF EXISTS public.idx_product_history_product_id;
DROP INDEX IF EXISTS public.idx_product_history_created_at;
DROP INDEX IF EXISTS public.idx_restore_points_created_by;
DROP INDEX IF EXISTS public.idx_restore_points_created_at;

-- ----------------------------------------------------------------------------
-- 8. Reload PostgREST schema cache
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
