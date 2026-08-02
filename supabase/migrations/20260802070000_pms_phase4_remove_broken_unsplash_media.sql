-- ============================================================================
-- Migration: PMS Phase 4 — remove broken Unsplash media assets from the library
-- Deployment verification found the two expired Unsplash hotlinks were still
-- registered in the media library (broken thumbnails in the PMS Media Library).
-- Both products (Conditioning Wax, Padded Registry Case) were already repointed
-- to the default catalog image in 20260802060001, so these assets + their usage
-- rows are now orphaned and permanently dead (Unsplash removed the photos).
-- Storefront read path is unaffected (products no longer reference these URLs).
-- ============================================================================

DELETE FROM public.media_usages
WHERE media_asset_id IN (
    SELECT id FROM public.media_assets
    WHERE bucket = 'product-images'
      AND storage_path IN (
          'https://images.unsplash.com/photo-1542868725-783aafa0d5fe?q=80&w=400&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1544943961-4ca3fbd72cc7?q=80&w=400&auto=format&fit=crop'
      )
);

DELETE FROM public.media_assets
WHERE bucket = 'product-images'
  AND storage_path IN (
      'https://images.unsplash.com/photo-1542868725-783aafa0d5fe?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1544943961-4ca3fbd72cc7?q=80&w=400&auto=format&fit=crop'
  );

NOTIFY pgrst, 'reload schema';
