-- ============================================================================
-- Migration: Production-Grade Commission Engine
-- Purpose:
--   1. Store commission_percentage on every product (single source of truth).
--   2. Expand commission lifecycle: pending -> available -> paid (rejected).
--   3. Link commissions to withdrawals so payouts never double-count.
--   4. Store payout account number on withdrawals (from the payout form).
--   5. Automatically release commissions when an order is Delivered.
--   6. Automate affiliate notifications across the full commission lifecycle.
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PRODUCTS: commission_percentage (single source of truth for commission rate)
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS commission_percentage numeric NOT NULL DEFAULT 8
    CONSTRAINT chk_product_commission_percentage CHECK (commission_percentage >= 0 AND commission_percentage <= 100);

-- ---------------------------------------------------------------------------
-- 2. COMMISSIONS: expand lifecycle status + link to withdrawals
-- ---------------------------------------------------------------------------
ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS check_comm_status;
ALTER TABLE public.commissions
    ADD CONSTRAINT check_comm_status CHECK (status IN ('pending', 'approved', 'available', 'paid', 'rejected'));

ALTER TABLE public.commissions
    ADD COLUMN IF NOT EXISTS withdrawal_id uuid REFERENCES public.affiliate_withdrawals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_commissions_withdrawal_id ON public.commissions(withdrawal_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON public.commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate_status ON public.commissions(affiliate_id, status);

-- ---------------------------------------------------------------------------
-- 3. WITHDRAWALS: store payout account number / wallet id
-- ---------------------------------------------------------------------------
ALTER TABLE public.affiliate_withdrawals
    ADD COLUMN IF NOT EXISTS account text;

-- ---------------------------------------------------------------------------
-- 4. UPDATE approve_order_payment: use product.commission_percentage and
--    create the commission as 'pending' (only becomes 'available' on delivery).
--    Keeps the existing referral-code resolution and duplicate protection.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_order_payment(target_order_id uuid)
RETURNS json security definer set search_path = public AS $$
DECLARE
    order_record record;
    affiliate_record record;
    commission_amount numeric;
    commission_rate numeric;
    sales_total integer;
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

        IF resolved_affiliate_id IS NOT NULL THEN
            UPDATE public.orders SET affiliate_id = resolved_affiliate_id WHERE id = target_order_id;
        END IF;
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

            -- Commission rate from the product itself (single source of truth)
            SELECT p.commission_percentage
            INTO commission_rate
            FROM public.products p
            WHERE p.id = order_record.product_id;

            commission_rate := COALESCE(commission_rate, 8);
            commission_amount := round(
                (COALESCE((SELECT price FROM public.products WHERE id = order_record.product_id), 100)
                 * order_record.quantity * 120 * commission_rate) / 100.0
            );

            INSERT INTO public.commissions (order_id, affiliate_id, amount, rate, status)
            VALUES (target_order_id, resolved_affiliate_id, commission_amount, commission_rate, 'pending')
            RETURNING * INTO inserted_commission;

            INSERT INTO public.audit_logs (user_id, action, details)
            VALUES (
                auth.uid(),
                'Commission Reserved',
                json_build_object('order_id', target_order_id, 'affiliate_id', resolved_affiliate_id, 'amount', commission_amount)
            );
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

-- ---------------------------------------------------------------------------
-- 5. TRIGGER: release commission when order is Delivered, reject on cancel
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_commission_lifecycle_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Order delivered -> pending/approved commissions become available
    IF NEW.fulfillment_status = 'Delivered' AND (OLD.fulfillment_status IS DISTINCT FROM 'Delivered') THEN
        UPDATE public.commissions
        SET status = 'available',
            updated_at = now()
        WHERE order_id = NEW.id
          AND status IN ('pending', 'approved');
    END IF;

    -- Order cancelled -> commissions are rejected and released from any withdrawal
    IF (NEW.status = 'cancelled' OR NEW.fulfillment_status = 'Cancelled')
       AND (OLD.status IS DISTINCT FROM 'cancelled' OR OLD.fulfillment_status IS DISTINCT FROM 'Cancelled') THEN
        UPDATE public.commissions
        SET status = 'rejected',
            withdrawal_id = NULL,
            updated_at = now()
        WHERE order_id = NEW.id
          AND status IN ('pending', 'approved', 'available');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_commission_lifecycle_on_order ON public.orders;
CREATE TRIGGER trg_commission_lifecycle_on_order
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE PROCEDURE public.fn_commission_lifecycle_on_order();

-- ---------------------------------------------------------------------------
-- 6. NOTIFICATIONS: Payment Verified message + commission lifecycle + withdrawals
-- ---------------------------------------------------------------------------
-- 6a. Payment verified -> notify affiliate (exact spec message)
CREATE OR REPLACE FUNCTION public.fn_notify_on_order_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_num text;
    v_aff_user_id uuid;
BEGIN
    v_order_num := COALESCE(NEW.order_number, 'AM-' || substring(NEW.id::text from 1 for 8));

    IF (TG_OP = 'INSERT') THEN
        PERFORM public.create_system_notification(
            NULL, 'admin', 'order_created', 'New Order Received',
            'Order ' || v_order_num || ' has been placed.', 'order', NEW.id
        );
        RETURN NEW;
    END IF;

    IF (TG_OP = 'UPDATE') THEN
        -- Payment Verified
        IF (NEW.payment_status IN ('verified', 'Paid', 'paid') AND (OLD.payment_status IS NULL OR OLD.payment_status NOT IN ('verified', 'Paid', 'paid'))) THEN
            IF NEW.customer_id IS NOT NULL THEN
                PERFORM public.create_system_notification(
                    NEW.customer_id, 'customer', 'payment_verified', 'Payment Verified',
                    'Your order payment has been verified.', 'order', NEW.id
                );
            END IF;

            IF NEW.affiliate_id IS NOT NULL THEN
                PERFORM public.create_system_notification(
                    NEW.affiliate_id, 'affiliate', 'payment_verified', 'Payment Verified',
                    'Your order payment has been verified.', 'order', NEW.id
                );
            ELSIF NEW.referral_code IS NOT NULL AND NEW.referral_code <> '' THEN
                SELECT a.user_id INTO v_aff_user_id
                FROM public.affiliates a
                WHERE lower(a.referral_code) = lower(NEW.referral_code)
                LIMIT 1;
                IF v_aff_user_id IS NOT NULL THEN
                    PERFORM public.create_system_notification(
                        v_aff_user_id, 'affiliate', 'payment_verified', 'Payment Verified',
                        'Your order payment has been verified.', 'order', NEW.id
                    );
                END IF;
            END IF;
        END IF;

        -- Fulfillment Stage Updates -> Notify Customer (unchanged)
        IF (NEW.fulfillment_status IS DISTINCT FROM OLD.fulfillment_status AND NEW.customer_id IS NOT NULL) THEN
            CASE NEW.fulfillment_status
                WHEN 'Preparing' THEN
                    PERFORM public.create_system_notification(NEW.customer_id, 'customer', 'fulfillment_preparing', 'Preparing Your Instrument', 'We have started preparing your order (' || v_order_num || ').', 'order', NEW.id);
                WHEN 'Crafting' THEN
                    PERFORM public.create_system_notification(NEW.customer_id, 'customer', 'fulfillment_crafting', 'Crafting in Progress', 'Our Ethiopian craftsmen are now handcrafting your instrument.', 'order', NEW.id);
                WHEN 'Packed' THEN
                    PERFORM public.create_system_notification(NEW.customer_id, 'customer', 'fulfillment_packed', 'Order Packed', 'Your order (' || v_order_num || ') has been carefully packed.', 'order', NEW.id);
                WHEN 'Shipped' THEN
                    PERFORM public.create_system_notification(NEW.customer_id, 'customer', 'fulfillment_shipped', 'Order Shipped', 'Your order (' || v_order_num || ') has been shipped.' || CASE WHEN NEW.tracking_number IS NOT NULL AND NEW.tracking_number <> '' THEN ' Tracking Number: ' || NEW.tracking_number ELSE '' END, 'order', NEW.id);
                WHEN 'Delivered' THEN
                    PERFORM public.create_system_notification(NEW.customer_id, 'customer', 'fulfillment_delivered', 'Delivered', 'Your order (' || v_order_num || ') has been delivered. Thank you for supporting Ethiopian craftsmanship.', 'order', NEW.id);
                ELSE
                    NULL;
            END CASE;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6b. Withdrawal events -> also notify affiliate when requested
CREATE OR REPLACE FUNCTION public.fn_notify_on_withdrawal_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_aff_name text;
BEGIN
    SELECT full_name INTO v_aff_name FROM public.profiles WHERE id = NEW.affiliate_id;

    IF (TG_OP = 'INSERT') THEN
        PERFORM public.create_system_notification(
            NULL, 'admin', 'withdrawal_requested', 'Withdrawal Request',
            'Affiliate ' || COALESCE(v_aff_name, 'Partner') || ' requested a withdrawal of ETB ' || trim(to_char(NEW.amount, '999,999,999.00')) || '.',
            'withdrawal', NEW.id
        );
        PERFORM public.create_system_notification(
            NEW.affiliate_id, 'affiliate', 'withdrawal_requested', 'Withdrawal Requested',
            'Your withdrawal request of ETB ' || trim(to_char(NEW.amount, '999,999,999.00')) || ' has been submitted.',
            'withdrawal', NEW.id
        );
        RETURN NEW;
    END IF;

    IF (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
        IF NEW.status = 'approved' THEN
            PERFORM public.create_system_notification(
                NEW.affiliate_id, 'affiliate', 'withdrawal_approved', 'Withdrawal Approved',
                'Your withdrawal request of ETB ' || trim(to_char(NEW.amount, '999,999,999.00')) || ' has been approved.',
                'withdrawal', NEW.id
            );
        ELSIF NEW.status = 'paid' THEN
            PERFORM public.create_system_notification(
                NEW.affiliate_id, 'affiliate', 'commission_paid', 'Commission Paid',
                'ETB ' || trim(to_char(NEW.amount, '999,999,999.00')) || ' has been sent to your account.',
                'withdrawal', NEW.id
            );
        ELSIF NEW.status = 'rejected' THEN
            PERFORM public.create_system_notification(
                NEW.affiliate_id, 'affiliate', 'withdrawal_rejected', 'Withdrawal Rejected',
                'Your withdrawal request of ETB ' || trim(to_char(NEW.amount, '999,999,999.00')) || ' was rejected.',
                'withdrawal', NEW.id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6c. Commission events -> available & paid notifications
CREATE OR REPLACE FUNCTION public.fn_notify_on_commission_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        PERFORM public.create_system_notification(
            NEW.affiliate_id, 'affiliate', 'commission_pending', 'Commission Pending',
            'A commission of ETB ' || trim(to_char(NEW.amount, '999,999,999.00')) || ' has been reserved for your referral order.',
            'commission', NEW.id
        );
        RETURN NEW;
    END IF;

    IF (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
        IF NEW.status = 'available' THEN
            PERFORM public.create_system_notification(
                NEW.affiliate_id, 'affiliate', 'commission_available', 'Commission Available',
                'Your commission of ETB ' || trim(to_char(NEW.amount, '999,999,999.00')) || ' is now available.',
                'commission', NEW.id
            );
        ELSIF NEW.status = 'paid' THEN
            PERFORM public.create_system_notification(
                NEW.affiliate_id, 'affiliate', 'commission_paid', 'Commission Paid',
                'ETB ' || trim(to_char(NEW.amount, '999,999,999.00')) || ' has been sent to your account.',
                'commission', NEW.id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

NOTIFY pgrst, 'reload schema';
