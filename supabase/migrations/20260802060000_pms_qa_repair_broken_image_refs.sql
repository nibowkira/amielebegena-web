-- ============================================================================
-- Migration: PMS QA — repair broken product image references
-- Production QA audit found two products (Washint, Meleket) whose cover image
-- references a storage object that does not exist in the product-images bucket
-- (washint_flute_v2_*.png, meleket_trumpet_v2_*.png -> 404 / NoSuchKey), so
-- both the storefront card image and the PMS thumbnail were broken.
--
-- Fix: repoint those products to the site's standard default catalog image
-- (image/photo_2025-10-01_07-26-53.jpg, the same static asset the storefront
-- already uses as its no-image fallback and by the Begena product). Then drop
-- the now-unused media_assets entries + their usage rows so the library has no
-- broken/unused records.
-- Storefront read path and schema are otherwise untouched.
-- ============================================================================

UPDATE public.product_images
SET storage_path = 'image/photo_2025-10-01_07-26-53.jpg'
WHERE storage_path IN (
    'washint_flute_v2_1776883145689.png',
    'meleket_trumpet_v2_1776883415170.png'
);

DELETE FROM public.media_usages
WHERE media_asset_id IN (
    SELECT id FROM public.media_assets
    WHERE bucket = 'product-images'
      AND storage_path IN (
          'washint_flute_v2_1776883145689.png',
          'meleket_trumpet_v2_1776883415170.png'
      )
);

DELETE FROM public.media_assets
WHERE bucket = 'product-images'
  AND storage_path IN (
      'washint_flute_v2_1776883145689.png',
      'meleket_trumpet_v2_1776883415170.png'
  );

NOTIFY pgrst, 'reload schema';
