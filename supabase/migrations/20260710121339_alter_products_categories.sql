-- Migration: Alter products category check constraint to support all frontend categories
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS check_products_category;

ALTER TABLE public.products ADD CONSTRAINT check_products_category 
    CHECK (category IN ('strings', 'percussion', 'wind', 'accessories', 'bags', 'books'));
