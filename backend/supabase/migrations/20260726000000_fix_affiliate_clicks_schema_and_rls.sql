-- Migration: Fix affiliate_clicks table schema and RLS policies for anonymous click tracking

-- 1. Create table if not exists with all required columns
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id uuid REFERENCES public.affiliates(user_id) ON DELETE CASCADE,
    referral_code text NOT NULL,
    page_url text,
    user_agent text,
    ip_address text,
    created_at timestamptz DEFAULT now()
);

-- Ensure missing columns are added if table pre-existed
ALTER TABLE public.affiliate_clicks ADD COLUMN IF NOT EXISTS affiliate_id uuid REFERENCES public.affiliates(user_id) ON DELETE CASCADE;
ALTER TABLE public.affiliate_clicks ADD COLUMN IF NOT EXISTS referral_code text;
ALTER TABLE public.affiliate_clicks ADD COLUMN IF NOT EXISTS page_url text;
ALTER TABLE public.affiliate_clicks ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE public.affiliate_clicks ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE public.affiliate_clicks ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 2. Enable Row Level Security
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- 3. Grant INSERT policy to anon and authenticated roles
DROP POLICY IF EXISTS "Allow anon and authenticated insert into affiliate_clicks" ON public.affiliate_clicks;
CREATE POLICY "Allow anon and authenticated insert into affiliate_clicks"
    ON public.affiliate_clicks
    FOR INSERT
    WITH CHECK (true);

-- 4. Grant SELECT policy to everyone so stats can be read
DROP POLICY IF EXISTS "Allow select affiliate_clicks for all" ON public.affiliate_clicks;
CREATE POLICY "Allow select affiliate_clicks for all"
    ON public.affiliate_clicks
    FOR SELECT
    USING (true);

-- 5. Grant table permissions explicitly to anon and authenticated roles
GRANT ALL ON public.affiliate_clicks TO anon, authenticated, service_role;
