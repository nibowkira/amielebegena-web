-- Migration 001: Create profiles table
-- Purpose: Extends Supabase auth.users with public user metadata.
-- The id column references auth.users directly, ensuring a 1:1 relationship
-- between the authentication record and the public profile.

-- Create enum for user roles to enforce valid values at the type level.
-- Using an enum instead of a CHECK constraint allows PostgreSQL to validate
-- the value once at type definition, and makes future role additions a single
-- ALTER TYPE statement rather than modifying constraints on every table.
create type public.user_role as enum ('user', 'affiliate', 'admin');

-- Create the profiles table
create table public.profiles (
    -- References auth.users.id directly. CASCADE ensures that when a user
    -- deletes their auth account, their profile is automatically removed.
    id          uuid primary key references auth.users(id) on delete cascade,

    full_name   text not null,

    -- Email is stored here for convenient querying and display without
    -- needing to join against the protected auth.users schema.
    email       text unique not null,

    phone       text,
    avatar_url  text,

    -- Role determines access level. Defaults to 'user' on signup.
    role        public.user_role not null default 'user',

    -- Allows admins to disable accounts without deleting data.
    is_active   boolean not null default true,

    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);
