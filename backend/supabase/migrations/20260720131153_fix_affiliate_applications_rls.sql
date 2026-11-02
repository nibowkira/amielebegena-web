-- Migration: Add explicit INSERT RLS policy for affiliate_applications table
-- Purpose: Ensures authenticated users can insert their own application. 
-- Shorthand policies (like FOR ALL) can sometimes fail on INSERT operations in Supabase due to missing implicit WITH CHECK validation on upserts.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'affiliate_applications' AND policyname = 'Allow users to insert their own application'
    ) THEN
        CREATE POLICY "Allow users to insert their own application"
            ON public.affiliate_applications
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;
