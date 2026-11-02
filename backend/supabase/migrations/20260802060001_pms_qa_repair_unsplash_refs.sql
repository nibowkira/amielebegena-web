-- ============================================================================
-- Migration: PMS QA — repair expired external Unsplash image references
-- Production QA audit found two accessories (Conditioning Wax, Padded Registry
-- Case) whose cover image is an external Unsplash hotlink that now returns 404
-- (Unsplash removed/expired the photos), so their storefront card images were
-- broken too.
--
-- Fix: repoint those products to the site's standard default catalog image
-- (image/photo_2025-10-01_07-26-53.jpg) — the same static asset the storefront
-- already uses as its no-image fallback. A follow-up content task should upload
-- real product photos for these two accessories.
-- Storefront read path and schema are otherwise untouched.
-- ============================================================================

UPDATE public.product_images
SET storage_path = 'image/photo_2025-10-01_07-26-53.jpg'
WHERE storage_path IN (
    'https://images.unsplash.com/photo-1542868725-783aafa0d5fe?q=80&w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1544943961-4ca3fbd72cc7?q=80&w=400&auto=format&fit=crop'
);

NOTIFY pgrst, 'reload schema';
