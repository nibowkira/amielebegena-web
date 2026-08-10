-- Migration: 20260809020000_fix_commission_approval_idempotency.sql
-- Description: Fix approve_order_payment RPC to be safe, idempotent, and able to attribute missing commissions on orders marked paid.

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

    -- 3. Resolve affiliate_id (from order or referral_code fallback)
    resolved_affiliate_id := order_record.affiliate_id;
    IF resolved_affiliate_id IS NULL AND order_record.referral_code IS NOT NULL AND trim(order_record.referral_code) <> '' THEN
        SELECT user_id INTO resolved_affiliate_id
        FROM public.affiliates
        WHERE lower(referral_code) = lower(trim(order_record.referral_code));

        IF resolved_affiliate_id IS NOT NULL THEN
            UPDATE public.orders SET affiliate_id = resolved_affiliate_id WHERE id = target_order_id;
        END IF;
    END IF;

    -- 4. Idempotency Check: If commission record already exists for target_order_id, return it cleanly
    IF EXISTS (SELECT 1 FROM public.commissions WHERE order_id = target_order_id) THEN
        SELECT * INTO inserted_commission FROM public.commissions WHERE order_id = target_order_id;
        
        -- Ensure order status is set to paid/confirmed
        UPDATE public.orders
        SET payment_status = 'paid',
            status = 'confirmed',
            updated_at = now()
        WHERE id = target_order_id;

        RETURN json_build_object(
            'success', true,
            'order_id', target_order_id,
            'payment_status', 'paid',
            'commission_attributed', false,
            'commission_amount', inserted_commission.amount,
            'commission_rate', inserted_commission.rate,
            'message', 'Commission already existed for this order.'
        );
    END IF;

    -- 5. Update order payment status to paid & confirmed
    UPDATE public.orders
    SET payment_status = 'paid',
        status = 'confirmed',
        updated_at = now()
    WHERE id = target_order_id;

    -- 6. Calculate & Attribute Commission if valid affiliate exists and no commission exists
    IF resolved_affiliate_id IS NOT NULL THEN
        SELECT * INTO affiliate_record FROM public.affiliates WHERE user_id = resolved_affiliate_id FOR UPDATE;
        
        IF FOUND THEN
            -- Increment sales count on affiliate profile exactly once
            UPDATE public.affiliates
            SET sales_count = sales_count + 1,
                updated_at = now()
            WHERE user_id = resolved_affiliate_id;

            -- Fetch product price & currency authoritatively from products
            SELECT price, COALESCE(currency, 'ETB') AS currency INTO prod_record FROM public.products WHERE id = order_record.product_id;
            
            IF prod_record.price IS NULL THEN
                prod_record.price := 8500.0;
            END IF;

            -- Calculate authoritative order amount in ETB
            IF upper(COALESCE(prod_record.currency, 'ETB')) = 'USD' THEN
                authoritative_order_amount := prod_record.price * COALESCE(order_record.quantity, 1) * 120.0;
            ELSIF upper(COALESCE(prod_record.currency, 'ETB')) = 'EUR' THEN
                authoritative_order_amount := prod_record.price * COALESCE(order_record.quantity, 1) * 130.0;
            ELSE
                authoritative_order_amount := prod_record.price * COALESCE(order_record.quantity, 1);
            END IF;

            -- Fetch current global commission rate (8%)
            current_global_rate := public.get_commission_rate();
            calc_commission_amount := round(authoritative_order_amount * (current_global_rate / 100.0), 2);

            -- Insert commission record
            INSERT INTO public.commissions (order_id, affiliate_id, amount, rate, status, created_at, updated_at)
            VALUES (target_order_id, resolved_affiliate_id, calc_commission_amount, current_global_rate, 'approved', now(), now())
            RETURNING * INTO inserted_commission;

            -- Audit log if table exists
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

GRANT EXECUTE ON FUNCTION public.approve_order_payment TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
