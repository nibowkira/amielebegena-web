-- Migration: Affiliate System Hardening & Security
-- Purpose: Introduce robust fraud detection, referral expiration, secure commission attribution, and professional analytics.

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action text NOT NULL,
    details jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.get_user_role() = 'admin');
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (public.get_user_role() = 'admin');

-- 2. Create fraud_logs table
CREATE TABLE IF NOT EXISTS public.fraud_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason text NOT NULL,
    severity text NOT NULL DEFAULT 'low',
    details jsonb,
    resolved boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fraud_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view fraud logs" ON public.fraud_logs FOR SELECT USING (public.get_user_role() = 'admin');

-- 3. Add expiration to affiliate_clicks
ALTER TABLE public.affiliate_clicks ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '30 days');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_code_session ON public.affiliate_clicks(affiliate_code, session_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_affiliate ON public.orders(payment_status, affiliate_id);

-- 4. Update log_affiliate_click to include fraud detection and dynamic expiration
CREATE OR REPLACE FUNCTION public.log_affiliate_click(code_val text, session_val text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    clicks_in_24h integer;
BEGIN
    -- Fraud check: excessive clicks from this session
    SELECT COUNT(*) INTO clicks_in_24h
    FROM public.affiliate_clicks
    WHERE session_id = session_val AND created_at > now() - interval '24 hours';

    IF clicks_in_24h > 100 THEN
        INSERT INTO public.fraud_logs (reason, severity, details)
        VALUES (
            'Excessive clicks from session', 
            'high', 
            json_build_object('session_id', session_val, 'clicks_count', clicks_in_24h, 'affiliate_code', code_val)
        );
    END IF;

    -- Upsert click record
    INSERT INTO public.affiliate_clicks (affiliate_code, session_id, expires_at)
    VALUES (code_val, session_val, now() + interval '30 days')
    ON CONFLICT (affiliate_code, session_id) DO NOTHING;
END;
$$;

-- 5. Create resolve_valid_affiliate RPC
CREATE OR REPLACE FUNCTION public.resolve_valid_affiliate(code_val text, session_val text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    resolved_user_id uuid;
BEGIN
    SELECT a.user_id INTO resolved_user_id
    FROM public.affiliate_clicks c
    JOIN public.affiliates a ON a.referral_code = c.affiliate_code
    WHERE c.affiliate_code = code_val
      AND c.session_id = session_val
      AND c.expires_at > now()
    ORDER BY c.created_at DESC
    LIMIT 1;
    
    RETURN resolved_user_id;
END;
$$;

-- 6. Update approve_order_payment
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

    -- 4. If order has an affiliate, validate and attribute commission
    IF order_record.affiliate_id IS NOT NULL THEN
        -- DUPLICATE COMMISSION PROTECTION
        IF EXISTS (SELECT 1 FROM public.commissions WHERE order_id = target_order_id) THEN
            INSERT INTO public.audit_logs (action, details) 
            VALUES ('Commission Duplicate Avoided', json_build_object('order_id', target_order_id));
            RETURN json_build_object(
                'success', true,
                'order_id', target_order_id,
                'payment_status', 'paid',
                'commission_attributed', false,
                'message', 'Commission already existed.'
            );
        END IF;

        -- SELF-REFERRAL PROTECTION
        IF order_record.customer_id IS NOT NULL AND order_record.customer_id = order_record.affiliate_id THEN
            INSERT INTO public.fraud_logs (user_id, reason, severity, details)
            VALUES (
                order_record.customer_id, 
                'Self-Referral Attempt', 
                'high', 
                json_build_object('order_id', target_order_id)
            );
            INSERT INTO public.audit_logs (user_id, action, details)
            VALUES (
                auth.uid(), 
                'Self-Referral Blocked', 
                json_build_object('order_id', target_order_id, 'customer_id', order_record.customer_id)
            );
        ELSE
            SELECT * INTO affiliate_record FROM public.affiliates WHERE user_id = order_record.affiliate_id FOR UPDATE;
            
            IF FOUND THEN
                UPDATE public.affiliates
                SET sales_count = sales_count + 1,
                    updated_at = now()
                WHERE user_id = order_record.affiliate_id
                RETURNING sales_count INTO sales_total;

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

                DECLARE
                    prod_price numeric;
                BEGIN
                    SELECT price INTO prod_price FROM public.products WHERE id = order_record.product_id;
                    commission_amount := coalesce(prod_price, 0) * order_record.quantity * 120 * commission_rate;
                END;

                INSERT INTO public.commissions (order_id, affiliate_id, amount, rate, status)
                VALUES (target_order_id, order_record.affiliate_id, commission_amount, commission_rate, 'approved')
                RETURNING * INTO inserted_commission;

                INSERT INTO public.audit_logs (user_id, action, details)
                VALUES (
                    auth.uid(), 
                    'Commission Approved', 
                    json_build_object('order_id', target_order_id, 'affiliate_id', order_record.affiliate_id, 'amount', commission_amount)
                );
            END IF;
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

-- 7. get_affiliate_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_affiliate_dashboard_stats(user_id_val uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    sales_count int;
    paid_orders_count int;
    total_clicks int;
    unique_clicks int;
    clicks_today int;
    clicks_week int;
    clicks_month int;
    clicks_year int;
    aff_code text;
    calculated_tier text;
    comm_rate numeric;
BEGIN
    SELECT referral_code INTO aff_code FROM public.affiliates WHERE user_id = user_id_val;

    SELECT COUNT(*) INTO sales_count FROM public.orders WHERE affiliate_id = user_id_val AND status != 'cancelled';
    SELECT COUNT(*) INTO paid_orders_count FROM public.orders WHERE affiliate_id = user_id_val AND status != 'cancelled' AND payment_status = 'paid';

    IF paid_orders_count >= 30 THEN
        calculated_tier := 'gold';
        comm_rate := 0.15;
    ELSIF paid_orders_count >= 10 THEN
        calculated_tier := 'silver';
        comm_rate := 0.12;
    ELSE
        calculated_tier := 'bronze';
        comm_rate := 0.10;
    END IF;

    SELECT COUNT(*) INTO total_clicks FROM public.affiliate_clicks WHERE affiliate_code = aff_code;
    SELECT COUNT(DISTINCT session_id) INTO unique_clicks FROM public.affiliate_clicks WHERE affiliate_code = aff_code;
    SELECT COUNT(*) INTO clicks_today FROM public.affiliate_clicks WHERE affiliate_code = aff_code AND created_at >= date_trunc('day', now());
    SELECT COUNT(*) INTO clicks_week FROM public.affiliate_clicks WHERE affiliate_code = aff_code AND created_at >= date_trunc('week', now());
    SELECT COUNT(*) INTO clicks_month FROM public.affiliate_clicks WHERE affiliate_code = aff_code AND created_at >= date_trunc('month', now());
    SELECT COUNT(*) INTO clicks_year FROM public.affiliate_clicks WHERE affiliate_code = aff_code AND created_at >= date_trunc('year', now());

    RETURN json_build_object(
        'sales', COALESCE(paid_orders_count, 0),
        'total_orders', COALESCE(sales_count, 0),
        'tier', calculated_tier,
        'commission_rate', comm_rate,
        'clicks', COALESCE(total_clicks, 0),
        'unique_clicks', COALESCE(unique_clicks, 0),
        'clicks_today', COALESCE(clicks_today, 0),
        'clicks_week', COALESCE(clicks_week, 0),
        'clicks_month', COALESCE(clicks_month, 0),
        'clicks_year', COALESCE(clicks_year, 0)
    );
END;
$$;

-- 8. get_admin_analytics
CREATE OR REPLACE FUNCTION public.get_admin_analytics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_rev numeric;
    monthly_rev numeric;
    monthly_orders int;
    monthly_commissions numeric;
    avg_order_value numeric;
    conv_rate numeric;
    total_clicks int;
    total_orders int;
    top_affs json;
    top_prods json;
BEGIN
    IF public.get_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    SELECT COALESCE(SUM(o.quantity * p.price * 120), 0) INTO total_rev
    FROM public.orders o JOIN public.products p ON o.product_id = p.id
    WHERE o.payment_status = 'paid';

    SELECT COALESCE(SUM(o.quantity * p.price * 120), 0), COUNT(o.id)
    INTO monthly_rev, monthly_orders
    FROM public.orders o JOIN public.products p ON o.product_id = p.id
    WHERE o.payment_status = 'paid' AND o.created_at >= date_trunc('month', now());

    SELECT COALESCE(SUM(amount), 0) INTO monthly_commissions
    FROM public.commissions
    WHERE created_at >= date_trunc('month', now());

    SELECT COUNT(*) INTO total_clicks FROM public.affiliate_clicks;
    SELECT COUNT(*) INTO total_orders FROM public.orders WHERE affiliate_id IS NOT NULL;
    IF total_clicks > 0 THEN
        conv_rate := (total_orders::numeric / total_clicks::numeric) * 100.0;
    ELSE
        conv_rate := 0;
    END IF;

    IF total_orders > 0 THEN
        SELECT COALESCE(SUM(o.quantity * p.price * 120) / total_orders, 0) INTO avg_order_value
        FROM public.orders o JOIN public.products p ON o.product_id = p.id WHERE o.payment_status = 'paid';
    ELSE
        avg_order_value := 0;
    END IF;

    SELECT json_agg(row_to_json(t)) INTO top_affs
    FROM (
        SELECT a.referral_code, a.sales_count, p.full_name
        FROM public.affiliates a JOIN public.profiles p ON a.user_id = p.id
        ORDER BY a.sales_count DESC LIMIT 5
    ) t;

    SELECT json_agg(row_to_json(t)) INTO top_prods
    FROM (
        SELECT p.name, SUM(o.quantity) as qty_sold
        FROM public.orders o JOIN public.products p ON o.product_id = p.id
        WHERE o.payment_status = 'paid'
        GROUP BY p.name
        ORDER BY qty_sold DESC LIMIT 5
    ) t;

    RETURN json_build_object(
        'monthly_revenue', monthly_rev,
        'monthly_orders', monthly_orders,
        'monthly_commissions', monthly_commissions,
        'average_order_value', COALESCE(avg_order_value, 0),
        'conversion_rate', conv_rate,
        'top_affiliates', COALESCE(top_affs, '[]'::json),
        'top_products', COALESCE(top_prods, '[]'::json)
    );
END;
$$;
