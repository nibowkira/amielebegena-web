-- Migration: Add WhatsApp orders fields and create commissions table
-- Purpose: Support manual payment validation checkout flow.

-- 1. Alter orders table to add checkout columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number text UNIQUE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS referral_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending_payment';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS whatsapp_sent_at timestamptz DEFAULT now();

-- Drop existing status constraint if we need to expand, but 'pending', 'confirmed', 'delivered', 'cancelled' fit the fulfillment flow perfectly.
-- Add check constraint for payment_status
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_payment_status;
ALTER TABLE public.orders ADD CONSTRAINT check_payment_status CHECK (payment_status IN ('pending_payment', 'paid', 'failed'));

-- 2. Create sequence for order numbers starting at 1001
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1001;

-- 3. Trigger to assign sequential order numbers AM-YYYY-XXXXXX
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER AS $$
DECLARE
    seq_val bigint;
    year_val text;
BEGIN
    IF NEW.order_number IS NULL THEN
        seq_val := nextval('public.order_number_seq');
        year_val := to_char(now(), 'YYYY');
        NEW.order_number := 'AM-' || year_val || '-' || lpad(seq_val::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_set_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_number();

-- 4. Create commissions table
CREATE TABLE IF NOT EXISTS public.commissions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    affiliate_id   uuid NOT NULL REFERENCES public.affiliates(user_id) ON DELETE CASCADE,
    amount         numeric NOT NULL CONSTRAINT check_comm_amount CHECK (amount >= 0),
    rate           numeric NOT NULL,
    status         text NOT NULL DEFAULT 'approved' CONSTRAINT check_comm_status CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT unique_order_commission UNIQUE (order_id)
);

-- Enable RLS on commissions
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Select policy: Affiliates can see their own commissions, admins can see all.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'commissions' AND policyname = 'Affiliates can view own commissions'
    ) THEN
        CREATE POLICY "Affiliates can view own commissions" 
            ON public.commissions
            FOR SELECT USING (auth.uid() = affiliate_id or public.get_user_role() = 'admin');
    END IF;
END
$$;

-- Admin full control
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'commissions' AND policyname = 'Admins full control on commissions'
    ) THEN
        CREATE POLICY "Admins full control on commissions" 
            ON public.commissions
            FOR ALL USING (public.get_user_role() = 'admin');
    END IF;
END
$$;

-- 5. RPC function to approve payment and calculate commission
CREATE OR REPLACE FUNCTION public.approve_order_payment(target_order_id uuid)
RETURNS json security definer set search_path = public AS $$
DECLARE
    order_record record;
    affiliate_record record;
    commission_amount numeric;
    commission_rate numeric;
    sales_total integer;
    affiliate_tier text;
    inserted_commission record;
BEGIN
    -- 1. Check if caller is admin
    IF public.get_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can approve payments.';
    END IF;

    -- 2. Lock the order row and fetch details
    SELECT * INTO order_record FROM public.orders WHERE id = target_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found.';
    END IF;

    -- Check if already paid
    IF order_record.payment_status = 'paid' THEN
        RAISE EXCEPTION 'Order is already marked as paid.';
    END IF;

    -- 3. Update order payment status and order fulfillment status
    UPDATE public.orders
    SET payment_status = 'paid',
        status = 'confirmed',
        updated_at = now()
    WHERE id = target_order_id;

    -- 4. If order has an affiliate, attribute commission
    IF order_record.affiliate_id IS NOT NULL THEN
        -- Get affiliate record
        SELECT * INTO affiliate_record FROM public.affiliates WHERE user_id = order_record.affiliate_id FOR UPDATE;
        
        IF FOUND THEN
            -- Increment sales count
            UPDATE public.affiliates
            SET sales_count = sales_count + 1,
                updated_at = now()
            WHERE user_id = order_record.affiliate_id
            RETURNING sales_count INTO sales_total;

            -- Calculate tier dynamically based on new sales count
            IF sales_total >= 30 THEN
                affiliate_tier := 'gold';
                commission_rate := 0.15;
            ELSIF sales_total >= 10 THEN
                affiliate_tier := 'silver';
                commission_rate := 0.12;
            ELSE
                affiliate_tier := 'bronze';
                commission_rate := 0.10;
            END IF;

            -- Calculate commission amount in ETB
            -- (product price in USD * quantity * 120 exchange rate * commission_rate)
            DECLARE
                prod_price numeric;
            BEGIN
                SELECT price INTO prod_price FROM public.products WHERE id = order_record.product_id;
                commission_amount := coalesce(prod_price, 0) * order_record.quantity * 120 * commission_rate;
            END;

            -- Create commission record
            INSERT INTO public.commissions (order_id, affiliate_id, amount, rate, status)
            VALUES (target_order_id, order_record.affiliate_id, commission_amount, commission_rate, 'approved')
            RETURNING * INTO inserted_commission;
        END IF;
    END IF;

    RETURN json_build_object(
        'success', true,
        'order_id', target_order_id,
        'payment_status', 'paid',
        'commission_attributed', (inserted_commission IS NOT NULL),
        'commission_amount', coalesce(commission_amount, 0)
    );
END;
$$ LANGUAGE plpgsql;
