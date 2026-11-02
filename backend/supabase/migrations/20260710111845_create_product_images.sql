-- Migration 003: Create product_images table
-- Purpose: Normalizes product images by storing URLs separately from the products table.
-- Supports multiple images per product with sorting order and cover photo indicator.

create table public.product_images (
    id            uuid primary key default gen_random_uuid(),
    
    -- Links to products. CASCADE ensures deleting a product automatically deletes all its image rows.
    product_id    uuid not null references public.products(id) on delete cascade,

    -- The relative path or URL of the image file in Supabase Storage.
    storage_path  text not null,

    -- Defines the sorting order of the images in the carousel layout (must be 0 or positive).
    display_order integer not null default 0 constraint check_images_order check (display_order >= 0),

    -- Flag indicating if this image is the cover picture shown in catalog listing views.
    is_cover      boolean not null default false,

    created_at    timestamptz not null default now()
);

-- Performance Index: Speeds up queries joining products and their images.
create index idx_product_images_product_id on public.product_images(product_id);
