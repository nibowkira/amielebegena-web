-- ============================================================================
-- Migration: Production-Grade Commission Engine (Global 8% Fixed Rate)
-- Purpose:
--   1. Global commission_settings table storing the 8% commission rate.
--   2. Authoritative server-side commission calculation: order_amount * 0.08.
--   3. Snapshots rate (8%) and calculated amount on commission row upon creation.
--   4. Idempotent payment approval and repair functions.
--   5. Seed/Update test products with confirmed ETB pricing.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. GLOBAL COMMISSION SETTINGS TABLE & RPC
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commission_settings (
    id int PRIMARY KEY DEFAULT 1 CONSTRAINT chk_single_row CHECK (id = 1),
    rate numeric NOT NULL DEFAULT 8.0 CONSTRAINT chk_rate_range CHECK (rate >= 0 AND rate <= 100),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.commission_settings (id, rate)
VALUES (1, 8.0)
ON CONFLICT (id) DO UPDATE SET rate = 8.0;

-- Function to fetch current global commission rate
CREATE OR REPLACE FUNCTION public.get_commission_rate()
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rate numeric;
BEGIN
    SELECT rate INTO v_rate FROM public.commission_settings WHERE id = 1;
    RETURN COALESCE(v_rate, 8.0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_commission_rate() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. ENSURE COMMISSIONS TABLE CONSTRAINTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commissions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    affiliate_id   uuid NOT NULL REFERENCES public.affiliates(user_id) ON DELETE CASCADE,
    amount         numeric NOT NULL CONSTRAINT check_comm_amount CHECK (amount >= 0),
    rate           numeric NOT NULL,
    status         text NOT NULL DEFAULT 'approved' CONSTRAINT check_comm_status CHECK (status IN ('pending', 'approved', 'available', 'paid', 'rejected')),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT unique_order_commission UNIQUE (order_id)
);

ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS check_comm_status;
ALTER TABLE public.commissions ADD CONSTRAINT check_comm_status CHECK (status IN ('pending', 'approved', 'available', 'paid', 'rejected'));

-- ---------------------------------------------------------------------------
-- 3. UPDATE TEST PRODUCTS WITH ETB PRICING (SAFE SLUG RESOLUTION)
-- ---------------------------------------------------------------------------
-- Begena -> 8,500 ETB
UPDATE public.products 
SET price = 8500.00, currency = 'ETB', status = 'active', updated_at = now()
WHERE slug = 'begena' OR id = 'a0000000-0000-0000-0000-000000000001';

-- Mesenko Wood -> 4,500 ETB
UPDATE public.products 
SET name = 'Mesenko — Wood', slug = 'mesenko-wood', price = 4500.00, currency = 'ETB', status = 'active', updated_at = now()
WHERE slug IN ('masinko', 'mesenko-wood') OR id = 'a0000000-0000-0000-0000-000000000003';

-- Mesenko Steel -> 5,500 ETB
INSERT INTO public.products (id, name, slug, category, short_description, price, currency, stock, featured, status)
VALUES ('a0000000-0000-0000-0000-000000000020', 'Mesenko — Steel', 'mesenko-steel', 'strings', 'Handcrafted Steel Resonance Fiddle', 5500.00, 'ETB', 40, true, 'active')
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    status = EXCLUDED.status;


-- ---------------------------------------------------------------------------
-- 4. AUTHORITATIVE SERVER-SIDE PAYMENT APPROVAL RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_order_payment(target_order_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    order_record record;
    affiliate_record record;
    prod_record record;
    current_global_rate numeric;
    authoritative_order_amount numeric;
    calc_commission_amount numeric;
    inserted_commission record;
    resolved_affiliate_id uuid;
BEGIN
    -- 1. Check if caller is admin
    IF public.get_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can approve payments.';
    END IF;

    -- 2. Lock order row and fetch details
    SELECT * INTO order_record FROM public.orders WHERE id = target_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found.';
    END IF;

    IF order_record.payment_status = 'paid' THEN
        RAISE EXCEPTION 'Order is already marked as paid.';
    END IF;

    -- 3. Resolve affiliate_id (from order or referral_code fallback)
    resolved_affiliate_id := order_record.affiliate_id;
    IF resolved_affiliate_id IS NULL AND order_record.referral_code IS NOT NULL AND trim(order_record.referral_code) <> '' THEN
        SELECT user_id INTO resolved_affiliate_id
        FROM public.affiliates
        WHERE lower(referral_code) = lower(trim(order_record.referral_code))
           OR lower(referral_code) = lower(replace(trim(order_record.referral_code), '5', ''));

        IF resolved_affiliate_id IS NOT NULL THEN
            UPDATE public.orders SET affiliate_id = resolved_affiliate_id WHERE id = target_order_id;
        END IF;
    END IF;

    -- 4. Update order payment status
    UPDATE public.orders
    SET payment_status = 'paid',
        status = 'confirmed',
        updated_at = now()
    WHERE id = target_order_id;

    -- 5. Calculate & Attribute Commission if valid affiliate exists
    IF resolved_affiliate_id IS NOT NULL THEN
        -- Check if affiliate profile exists
        SELECT * INTO affiliate_record FROM public.affiliates WHERE user_id = resolved_affiliate_id FOR UPDATE;
        
        IF FOUND THEN
            -- Idempotency check: return cleanly if commission record already exists
            IF EXISTS (SELECT 1 FROM public.commissions WHERE order_id = target_order_id) THEN
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
                    INSERT INTO public.audit_logs (action, details)
                    VALUES ('Commission Duplicate Avoided', json_build_object('order_id', target_order_id));
                END IF;
                RETURN json_build_object(
                    'success', true,
                    'order_id', target_order_id,
                    'payment_status', 'paid',
                    'commission_attributed', false,
                    'message', 'Commission already existed.'
                );
            END IF;

            -- Increment sales count on affiliate profile
            UPDATE public.affiliates
            SET sales_count = sales_count + 1,
                updated_at = now()
            WHERE user_id = resolved_affiliate_id;

            -- Fetch product price & currency
            SELECT price, COALESCE(currency, 'ETB') INTO prod_record FROM public.products WHERE id = order_record.product_id;
            
            IF prod_record.price IS NULL THEN
                prod_record.price := 100.0;
            END IF;

            -- Calculate authoritative order amount in ETB
            IF upper(COALESCE(prod_record.currency, 'ETB')) = 'USD' THEN
                authoritative_order_amount := prod_record.price * COALESCE(order_record.quantity, 1) * 120.0;
            ELSE
                authoritative_order_amount := prod_record.price * COALESCE(order_record.quantity, 1);
            END IF;

            -- Fetch current global commission rate (snapshot)
            current_global_rate := public.get_commission_rate();
            calc_commission_amount := round(authoritative_order_amount * (current_global_rate / 100.0), 2);

            -- Insert commission record (snapshot rate & amount)
            INSERT INTO public.commissions (order_id, affiliate_id, amount, rate, status, created_at, updated_at)
            VALUES (target_order_id, resolved_affiliate_id, calc_commission_amount, current_global_rate, 'approved', now(), now())
            RETURNING * INTO inserted_commission;

            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
                INSERT INTO public.audit_logs (user_id, action, details)
                VALUES (
                    auth.uid(),
                    'Commission Approved',
                    json_build_object('order_id', target_order_id, 'affiliate_id', resolved_affiliate_id, 'amount', calc_commission_amount, 'rate', current_global_rate)
                );
            END IF;
        END IF;
    END IF;

    RETURN json_build_object(
        'success', true,
        'order_id', target_order_id,
        'payment_status', 'paid',
        'commission_attributed', (inserted_commission IS NOT NULL),
        'commission_amount', COALESCE(calc_commission_amount, 0),
        'commission_rate', COALESCE(current_global_rate, 8.0)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_order_payment(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. IDEMPOTENT SERVER-SIDE REPAIR RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_missing_commissions()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    order_rec record;
    prod_record record;
    current_global_rate numeric;
    authoritative_order_amount numeric;
    calc_commission_amount numeric;
    paid_checked_count integer := 0;
    missing_count integer := 0;
    created_count integer := 0;
BEGIN
    current_global_rate := public.get_commission_rate();

    FOR order_rec IN
        SELECT o.id, o.affiliate_id, o.quantity, o.product_id, o.created_at
        FROM public.orders o
        WHERE o.payment_status = 'paid'
          AND o.affiliate_id IS NOT NULL
    LOOP
        paid_checked_count := paid_checked_count + 1;

        -- Check if commission row exists for this order
        IF NOT EXISTS (
            SELECT 1 FROM public.commissions c WHERE c.order_id = order_rec.id
        ) THEN
            missing_count := missing_count + 1;

            -- Get product price & currency
            SELECT price, COALESCE(currency, 'ETB') INTO prod_record
            FROM public.products
            WHERE id = order_rec.product_id;

            IF prod_record.price IS NULL THEN
                prod_record.price := 100.0;
            END IF;

            IF upper(COALESCE(prod_record.currency, 'ETB')) = 'USD' THEN
                authoritative_order_amount := prod_record.price * COALESCE(order_rec.quantity, 1) * 120.0;
            ELSE
                authoritative_order_amount := prod_record.price * COALESCE(order_rec.quantity, 1);
            END IF;

            calc_commission_amount := round(authoritative_order_amount * (current_global_rate / 100.0), 2);

            INSERT INTO public.commissions (
                affiliate_id,
                order_id,
                amount,
                rate,
                status,
                created_at,
                updated_at
            ) VALUES (
                order_rec.affiliate_id,
                order_rec.id,
                calc_commission_amount,
                current_global_rate,
                'approved',
                COALESCE(order_rec.created_at, now()),
                now()
            );

            created_count := created_count + 1;
        END IF;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'paid_orders_checked', paid_checked_count,
        'missing_found', missing_count,
        'created_count', created_count,
        'applied_rate', current_global_rate
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.repair_missing_commissions() TO authenticated;

NOTIFY pgrst, 'reload schema';
