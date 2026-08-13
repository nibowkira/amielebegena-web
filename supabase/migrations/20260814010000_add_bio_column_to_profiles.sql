-- Migration: Add optional bio column to profiles
-- Allows customers and affiliates to store an optional biography or curator note.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'bio'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN bio text DEFAULT '';
    END IF;
END $$;
