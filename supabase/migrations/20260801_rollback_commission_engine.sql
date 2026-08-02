-- ============================================================================
-- Rollback Migration: Reverse 20260801 Commission Engine Changes
-- Purpose: Safely restore database triggers, functions, and schema if applied.
-- ============================================================================

-- 1. Drop trigger and function added by 20260801_commission_engine.sql
DROP TRIGGER IF EXISTS trg_commission_lifecycle_on_order ON public.orders;
DROP FUNCTION IF EXISTS public.fn_commission_lifecycle_on_order();

-- 2. Revert approve_order_payment to pre-20260801 logic (20260722_affiliate_improvements version)
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
    IF public.get_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can approve payments.';
    END IF;

    SELECT * INTO order_record FROM public.orders WHERE id = target_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found.';
    END IF;

    IF order_record.payment_status = 'paid' THEN
        RAISE EXCEPTION 'Order is already marked as paid.';
    END IF;

    resolved_affiliate_id := order_record.affiliate_id;
    IF resolved_affiliate_id IS NULL AND order_record.referral_code IS NOT NULL AND order_record.referral_code <> '' THEN
        SELECT user_id INTO resolved_affiliate_id 
        FROM public.affiliates 
        WHERE lower(referral_code) = lower(trim(order_record.referral_code))
           OR lower(referral_code) = lower(replace(trim(order_record.referral_code), '5', ''));
        
        UPDATE public.orders 
        SET affiliate_id = resolved_affiliate_id 
        WHERE id = target_order_id;
    END IF;

    UPDATE public.orders
    SET payment_status = 'paid',
        status = 'confirmed',
        updated_at = now()
    WHERE id = target_order_id;

    IF resolved_affiliate_id IS NOT NULL THEN
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

-- 3. Restore status constraint on public.commissions
ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS check_comm_status;
ALTER TABLE public.commissions ADD CONSTRAINT check_comm_status CHECK (status IN ('pending', 'approved', 'rejected'));

-- 4. Clean up columns added by 20260801_commission_engine.sql (optional safe drop)
ALTER TABLE public.commissions DROP COLUMN IF EXISTS withdrawal_id;
ALTER TABLE public.affiliate_withdrawals DROP COLUMN IF EXISTS account;
ALTER TABLE public.products DROP COLUMN IF EXISTS commission_percentage;

NOTIFY pgrst, 'reload schema';
