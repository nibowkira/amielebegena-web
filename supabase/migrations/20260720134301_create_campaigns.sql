-- Migration: Create affiliate_campaigns table
-- Purpose: Manages gamified challenges and rewards in the affiliate system.

CREATE TABLE IF NOT EXISTS public.affiliate_campaigns (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title           text NOT NULL,
    description     text NOT NULL,
    target_sales    integer NOT NULL CONSTRAINT check_cmp_target CHECK (target_sales > 0),
    reward          numeric(12,2) NOT NULL CONSTRAINT check_cmp_reward CHECK (reward > 0),
    starts_at       timestamptz NOT NULL DEFAULT now(),
    ends_at         timestamptz NOT NULL,
    status          text NOT NULL DEFAULT 'active' CONSTRAINT check_cmp_status CHECK (status IN ('active', 'ended', 'draft')),
    created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_campaigns ENABLE ROW LEVEL SECURITY;

-- Select policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'affiliate_campaigns' AND policyname = 'Anyone can view active campaigns'
    ) THEN
        CREATE POLICY "Anyone can view active campaigns" 
            ON public.affiliate_campaigns
            FOR SELECT USING (true);
    END IF;
END
$$;

-- Admin policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'affiliate_campaigns' AND policyname = 'Admins full control on campaigns'
    ) THEN
        CREATE POLICY "Admins full control on campaigns" 
            ON public.affiliate_campaigns
            FOR ALL USING (public.get_user_role() = 'admin');
    END IF;
END
$$;
