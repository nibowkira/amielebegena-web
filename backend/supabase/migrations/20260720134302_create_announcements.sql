-- Migration: Create affiliate_announcements table
-- Purpose: Broadcast bulletin announcements inside the affiliate console.

CREATE TABLE IF NOT EXISTS public.affiliate_announcements (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title           text NOT NULL,
    content         text NOT NULL,
    type            text NOT NULL DEFAULT 'general' CONSTRAINT check_ann_type CHECK (type IN ('general', 'policy', 'bonus', 'milestone')),
    urgency         text NOT NULL DEFAULT 'normal' CONSTRAINT check_ann_urgency CHECK (urgency IN ('normal', 'important', 'critical')),
    created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_announcements ENABLE ROW LEVEL SECURITY;

-- Select policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'affiliate_announcements' AND policyname = 'Anyone can view announcements'
    ) THEN
        CREATE POLICY "Anyone can view announcements" 
            ON public.affiliate_announcements
            FOR SELECT USING (true);
    END IF;
END
$$;

-- Admin policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'affiliate_announcements' AND policyname = 'Admins full control on announcements'
    ) THEN
        CREATE POLICY "Admins full control on announcements" 
            ON public.affiliate_announcements
            FOR ALL USING (public.get_user_role() = 'admin');
    END IF;
END
$$;
