-- Migration: Resolve affiliate by referral_code fallback in approve_order_payment
-- Purpose: Ensures that if click-tracking fails or is bypassed during manual testing, the affiliate still receives commission.

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
    resolved_affiliate_id uuid;
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

    -- Resolve affiliate_id if it was null but a referral_code exists
    resolved_affiliate_id := order_record.affiliate_id;
    IF resolved_affiliate_id IS NULL AND order_record.referral_code IS NOT NULL AND order_record.referral_code <> '' THEN
        SELECT user_id INTO resolved_affiliate_id 
        FROM public.affiliates 
        WHERE lower(referral_code) = lower(trim(order_record.referral_code));
        
        -- Update the order record affiliate_id so it persists correctly
        UPDATE public.orders 
        SET affiliate_id = resolved_affiliate_id 
        WHERE id = target_order_id;
    END IF;

    -- 3. Update order payment status and order fulfillment status
    UPDATE public.orders
    SET payment_status = 'paid',
        status = 'confirmed',
        updated_at = now()
    WHERE id = target_order_id;

    -- 4. If order has an affiliate, validate and attribute commission
    IF resolved_affiliate_id IS NOT NULL THEN
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
        IF order_record.customer_id IS NOT NULL AND order_record.customer_id = resolved_affiliate_id THEN
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
            SELECT * INTO affiliate_record FROM public.affiliates WHERE user_id = resolved_affiliate_id FOR UPDATE;
            
            IF FOUND THEN
                UPDATE public.affiliates
                SET sales_count = sales_count + 1,
                    updated_at = now()
                WHERE user_id = resolved_affiliate_id
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
                VALUES (target_order_id, resolved_affiliate_id, commission_amount, commission_rate, 'approved')
                RETURNING * INTO inserted_commission;

                INSERT INTO public.audit_logs (user_id, action, details)
                VALUES (
                    auth.uid(), 
                    'Commission Approved', 
                    json_build_object('order_id', target_order_id, 'affiliate_id', resolved_affiliate_id, 'amount', commission_amount)
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
$$;
