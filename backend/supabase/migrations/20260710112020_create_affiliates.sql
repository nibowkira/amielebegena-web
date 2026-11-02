-- Migration 004: Create affiliates table
-- Purpose: Holds approved affiliate profiles, referral slug attributes, and performance metrics.
-- By using user_id as both the Primary Key and Foreign Key, we enforce a strict 1:1 relationship
-- between a user profile and their affiliate status.

create table public.affiliates (
    -- References public.profiles.id. CASCADE ensures deleting the profile removes the affiliate record.
    user_id       uuid primary key references public.profiles(id) on delete cascade,

    -- Referral code must be lowercase, alphanumeric, and hyphens only, with a minimum length of 3.
    referral_code text unique not null constraint check_aff_ref_code check (referral_code ~* '^[a-z0-9-]+$' and char_length(referral_code) >= 3),

    -- Running count of successfully attributed sales. Must be zero or positive.
    sales_count   integer not null default 0 constraint check_aff_sales check (sales_count >= 0),

    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);
