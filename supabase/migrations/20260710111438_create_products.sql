-- Migration 002: Create products table
-- Purpose: Houses inventory items for Ethiopian instruments (Begenna and Kirar).

-- Create check constraints to ensure clean categories, positive prices/stock, and safe URLs.
create table public.products (
    id                uuid primary key default gen_random_uuid(),
    
    name              text not null,

    -- Slug must be unique and only contain lowercase letters, numbers, and hyphens for SEO-friendly URLs.
    slug              text unique not null constraint check_products_slug check (slug ~* '^[a-z0-9-]+$'),

    -- Enforce specific category classifications.
    category          text not null constraint check_products_category check (category in ('begenna', 'kirar')),

    short_description text,
    description       text,

    -- Financial amounts must not be negative.
    price             numeric not null default 0.00 constraint check_products_price check (price >= 0),

    -- Stock count must be zero or positive.
    stock             integer not null default 0 constraint check_products_stock check (stock >= 0),

    featured          boolean not null default false,

    -- Status allows soft-disabling or showing out-of-stock items in the catalog.
    status            text not null default 'active' constraint check_products_status check (status in ('active', 'inactive', 'out_of_stock')),

    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);
