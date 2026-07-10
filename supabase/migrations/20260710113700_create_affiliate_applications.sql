-- Migration 006: Create affiliate_applications table
-- Purpose: Manages user onboarding requests to join the affiliate program.
-- Setting user_id as the primary key enforces a strict 1-to-1 relationship,
-- preventing a user from submitting multiple applications.

create table public.affiliate_applications (
    -- References the applicant's profile. Cascade ensures deleting the profile removes the application.
    user_id       uuid primary key references public.profiles(id) on delete cascade,

    motivation    text not null,
    social_link   text not null,

    status        text not null default 'pending' constraint check_apps_status check (status in ('pending', 'approved', 'rejected')),

    -- References the administrator who reviewed the application.
    reviewed_by   uuid references public.profiles(id) on delete set null,
    reviewed_at   timestamptz,

    created_at    timestamptz not null default now()
);

-- Performance Index: Faster lookups when filtering applications reviewed by specific admins.
create index idx_affiliate_apps_reviewed_by on public.affiliate_applications(reviewed_by);
