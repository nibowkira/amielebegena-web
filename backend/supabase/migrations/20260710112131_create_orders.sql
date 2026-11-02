-- Migration 005: Create orders table
-- Purpose: Logs individual item checkout submissions before redirecting to WhatsApp.
-- Normalizes purchases at the database level by mapping orders directly to products.

create table public.orders (
    id             uuid primary key default gen_random_uuid(),

    -- References the product. RESTRICT prevents deleting products that are linked to active customer orders.
    product_id     uuid not null references public.products(id) on delete restrict,

    -- Quantity purchased (must be greater than 0).
    quantity       integer not null constraint check_orders_qty check (quantity > 0),

    -- References the customer profile (nullable for guest checkout). SET NULL retains transaction history on profile deletion.
    customer_id    uuid references public.profiles(id) on delete set null,

    -- References the affiliate account that referred the sale (nullable). SET NULL retains transaction history on affiliate removal.
    affiliate_id   uuid references public.affiliates(user_id) on delete set null,

    status         text not null default 'pending' constraint check_orders_status check (status in ('pending', 'confirmed', 'delivered', 'cancelled')),
    
    notes          text,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

-- Performance Indexes: Speed up dashboard metrics, customer lookups, and affiliate attribution lookups.
create index idx_orders_customer_id on public.orders(customer_id);
create index idx_orders_product_id on public.orders(product_id);
create index idx_orders_affiliate_id on public.orders(affiliate_id);
