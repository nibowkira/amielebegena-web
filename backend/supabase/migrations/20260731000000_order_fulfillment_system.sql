-- Migration 026: Order Fulfillment Workflow & Tracking History
-- Purpose: Adds fulfillment status stages, shipping/tracking details, and audit history log table.
-- Idempotent script: Safe for repeated execution without errors.

DO $$ 
BEGIN
    -- 1. Add fulfillment columns to public.orders if they don't already exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='fulfillment_status') THEN
        ALTER TABLE public.orders ADD COLUMN fulfillment_status text DEFAULT 'Pending';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='tracking_number') THEN
        ALTER TABLE public.orders ADD COLUMN tracking_number text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipping_company') THEN
        ALTER TABLE public.orders ADD COLUMN shipping_company text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipping_notes') THEN
        ALTER TABLE public.orders ADD COLUMN shipping_notes text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='estimated_delivery') THEN
        ALTER TABLE public.orders ADD COLUMN estimated_delivery text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='packed_at') THEN
        ALTER TABLE public.orders ADD COLUMN packed_at timestamptz;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipped_at') THEN
        ALTER TABLE public.orders ADD COLUMN shipped_at timestamptz;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='delivered_at') THEN
        ALTER TABLE public.orders ADD COLUMN delivered_at timestamptz;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='last_status_update') THEN
        ALTER TABLE public.orders ADD COLUMN last_status_update timestamptz DEFAULT now();
    END IF;
END $$;

-- 2. Create order_fulfillment_history table for auditing status changes
CREATE TABLE IF NOT EXISTS public.order_fulfillment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    admin_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Index for History Queries
CREATE INDEX IF NOT EXISTS idx_fulfillment_history_order_id ON public.order_fulfillment_history(order_id);

-- Enable RLS on order_fulfillment_history
ALTER TABLE public.order_fulfillment_history ENABLE ROW LEVEL SECURITY;

-- Policies for order_fulfillment_history (Idempotent creation)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'order_fulfillment_history' AND policyname = 'Admins can view fulfillment history'
    ) THEN
        CREATE POLICY "Admins can view fulfillment history" ON public.order_fulfillment_history
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'order_fulfillment_history' AND policyname = 'Admins can insert fulfillment history'
    ) THEN
        CREATE POLICY "Admins can insert fulfillment history" ON public.order_fulfillment_history
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
                )
            );
    END IF;
END $$;
