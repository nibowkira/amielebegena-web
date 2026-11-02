-- Migration: Create affiliate_withdrawals table
-- Purpose: Logs partner payout requests and processes reviews via Supabase.

CREATE TABLE IF NOT EXISTS public.affiliate_withdrawals (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount          numeric(12,2) NOT NULL CONSTRAINT check_wth_amount CHECK (amount >= 500),
    method          text NOT NULL CONSTRAINT check_wth_method CHECK (method IN ('Telebirr', 'CBE (Commercial Bank of Ethiopia)', 'Awash Bank', 'Dashen Bank', 'PayPal / International Transfer')),
    phone           text NOT NULL,
    status          text NOT NULL DEFAULT 'pending' CONSTRAINT check_wth_status CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    processed_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    processed_at    timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;

-- Select policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'affiliate_withdrawals' AND policyname = 'Affiliates can view own withdrawals'
    ) THEN
        CREATE POLICY "Affiliates can view own withdrawals" 
            ON public.affiliate_withdrawals
            FOR SELECT USING (auth.uid() = affiliate_id OR public.get_user_role() = 'admin');
    END IF;
END
$$;

-- Insert policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'affiliate_withdrawals' AND policyname = 'Affiliates can insert own withdrawals'
    ) THEN
        CREATE POLICY "Affiliates can insert own withdrawals" 
            ON public.affiliate_withdrawals
            FOR INSERT WITH CHECK (auth.uid() = affiliate_id);
    END IF;
END
$$;

-- Admin update policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'affiliate_withdrawals' AND policyname = 'Admins full control on withdrawals'
    ) THEN
        CREATE POLICY "Admins full control on withdrawals" 
            ON public.affiliate_withdrawals
            FOR ALL USING (public.get_user_role() = 'admin');
    END IF;
END
$$;
