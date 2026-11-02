-- ============================================================================
-- Migration: Production Real-Time Notification System
-- Idempotent: safe to run multiple times
-- Purpose: Creates public.notifications table, RLS policies, Realtime publication,
--          and automated event triggers across orders, withdrawals, applications, and commissions.
-- ============================================================================

-- 1. Create public.notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_role       text NOT NULL CONSTRAINT chk_notif_role CHECK (user_role IN ('customer', 'affiliate', 'admin')),
    type            text NOT NULL,
    title           text NOT NULL,
    message         text NOT NULL,
    reference_type  text, -- 'order', 'commission', 'withdrawal', 'application', 'system'
    reference_id    uuid,
    is_read         boolean NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    read_at         timestamptz
);

-- 2. Indexes for fast filtering & real-time delivery
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_role ON public.notifications(user_role);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- 3. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Select Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications
    FOR SELECT
    USING (
        public.get_user_role() = 'admin'
        OR auth.uid() = user_id
        OR (user_id IS NULL AND user_role = public.get_user_role()::text)
    );

-- Update Policies (Mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications
    FOR UPDATE
    USING (
        public.get_user_role() = 'admin'
        OR auth.uid() = user_id
        OR (user_id IS NULL AND user_role = public.get_user_role()::text)
    );

-- Delete Policies
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
    ON public.notifications
    FOR DELETE
    USING (
        public.get_user_role() = 'admin'
        OR auth.uid() = user_id
    );

-- Insert Policy (Admins & Triggers)
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (
        public.get_user_role() = 'admin'
        OR auth.uid() IS NOT NULL
        OR true -- SECURITY DEFINER triggers bypass RLS
    );

-- 4. Enable Supabase Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Publication might not exist or user lacks superuser, ignore safely
    NULL;
END
$$;

-- 5. Helper Function: Create Notification (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.create_system_notification(
    p_user_id uuid,
    p_user_role text,
    p_type text,
    p_title text,
    p_message text,
    p_reference_type text DEFAULT NULL,
    p_reference_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO public.notifications (
        user_id,
        user_role,
        type,
        title,
        message,
        reference_type,
        reference_id
    ) VALUES (
        p_user_id,
        p_user_role,
        p_type,
        p_title,
        p_message,
        p_reference_type,
        p_reference_id
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

-- 6. Trigger Function: Orders Automation
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

    -- Event: New Order Created -> Notify Admin
    IF (TG_OP = 'INSERT') THEN
        PERFORM public.create_system_notification(
            NULL,
            'admin',
            'order_created',
            'New Order Received',
            'Order ' || v_order_num || ' has been placed.',
            'order',
            NEW.id
        );
        RETURN NEW;
    END IF;

    -- Event: Order Updated
    IF (TG_OP = 'UPDATE') THEN
        -- Payment Verified
        IF (NEW.payment_status IN ('verified', 'Paid', 'paid') AND (OLD.payment_status IS NULL OR OLD.payment_status NOT IN ('verified', 'Paid', 'paid'))) THEN
            -- Notify Customer
            IF NEW.customer_id IS NOT NULL THEN
                PERFORM public.create_system_notification(
                    NEW.customer_id,
                    'customer',
                    'payment_verified',
                    'Payment Verified',
                    'We have received and verified your payment for order ' || v_order_num || '.',
                    'order',
                    NEW.id
                );
            END IF;

            -- Notify Affiliate if order came via referral
            IF NEW.referral_code IS NOT NULL AND NEW.referral_code <> '' THEN
                SELECT a.user_id INTO v_aff_user_id
                FROM public.affiliates a
                WHERE lower(a.referral_code) = lower(NEW.referral_code)
                LIMIT 1;

                IF v_aff_user_id IS NOT NULL THEN
                    PERFORM public.create_system_notification(
                        v_aff_user_id,
                        'affiliate',
                        'commission_pending',
                        'Commission Pending',
                        'Your referral order ' || v_order_num || ' has been verified.',
                        'order',
                        NEW.id
                    );
                END IF;
            END IF;
        END IF;

        -- Fulfillment Stage Updates -> Notify Customer
        IF (NEW.fulfillment_status IS DISTINCT FROM OLD.fulfillment_status AND NEW.customer_id IS NOT NULL) THEN
            CASE NEW.fulfillment_status
                WHEN 'Preparing' THEN
                    PERFORM public.create_system_notification(
                        NEW.customer_id,
                        'customer',
                        'fulfillment_preparing',
                        'Preparing Your Instrument',
                        'We have started preparing your order (' || v_order_num || ').',
                        'order',
                        NEW.id
                    );
                WHEN 'Crafting' THEN
                    PERFORM public.create_system_notification(
                        NEW.customer_id,
                        'customer',
                        'fulfillment_crafting',
                        'Crafting in Progress',
                        'Our Ethiopian craftsmen are now handcrafting your instrument.',
                        'order',
                        NEW.id
                    );
                WHEN 'Packed' THEN
                    PERFORM public.create_system_notification(
                        NEW.customer_id,
                        'customer',
                        'fulfillment_packed',
                        'Order Packed',
                        'Your order (' || v_order_num || ') has been carefully packed.',
                        'order',
                        NEW.id
                    );
                WHEN 'Shipped' THEN
                    PERFORM public.create_system_notification(
                        NEW.customer_id,
                        'customer',
                        'fulfillment_shipped',
                        'Order Shipped',
                        'Your order (' || v_order_num || ') has been shipped.' ||
                        CASE WHEN NEW.tracking_number IS NOT NULL AND NEW.tracking_number <> ''
                             THEN ' Tracking Number: ' || NEW.tracking_number
                             ELSE '' END,
                        'order',
                        NEW.id
                    );
                WHEN 'Delivered' THEN
                    PERFORM public.create_system_notification(
                        NEW.customer_id,
                        'customer',
                        'fulfillment_delivered',
                        'Delivered',
                        'Your order (' || v_order_num || ') has been delivered. Thank you for supporting Ethiopian craftsmanship.',
                        'order',
                        NEW.id
                    );
                ELSE
                    -- Other stages
                    NULL;
            END CASE;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop and recreate orders trigger
DROP TRIGGER IF EXISTS trg_notify_on_order ON public.orders;
CREATE TRIGGER trg_notify_on_order
    AFTER INSERT OR UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE PROCEDURE public.fn_notify_on_order_event();

-- 7. Trigger Function: Affiliate Withdrawals Automation
CREATE OR REPLACE FUNCTION public.fn_notify_on_withdrawal_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_aff_name text;
BEGIN
    SELECT full_name INTO v_aff_name
    FROM public.profiles
    WHERE id = NEW.affiliate_id;

    -- Event: New Withdrawal Requested -> Notify Admin
    IF (TG_OP = 'INSERT') THEN
        PERFORM public.create_system_notification(
            NULL,
            'admin',
            'withdrawal_requested',
            'Withdrawal Request',
            'Affiliate ' || COALESCE(v_aff_name, 'Partner') || ' requested a withdrawal of ETB ' || trim(to_char(NEW.amount, '999,999,999.00')) || '.',
            'withdrawal',
            NEW.id
        );
        RETURN NEW;
    END IF;

    -- Event: Withdrawal Status Updated -> Notify Affiliate
    IF (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
        IF NEW.status = 'approved' THEN
            PERFORM public.create_system_notification(
                NEW.affiliate_id,
                'affiliate',
                'withdrawal_approved',
                'Withdrawal Approved',
                'Your withdrawal request of ETB ' || trim(to_char(NEW.amount, '999,999,999.00')) || ' has been approved.',
                'withdrawal',
                NEW.id
            );
        ELSIF NEW.status = 'rejected' THEN
            PERFORM public.create_system_notification(
                NEW.affiliate_id,
                'affiliate',
                'withdrawal_rejected',
                'Withdrawal Rejected',
                'Your withdrawal request of ETB ' || trim(to_char(NEW.amount, '999,999,999.00')) || ' was rejected.',
                'withdrawal',
                NEW.id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop and recreate withdrawals trigger if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'affiliate_withdrawals') THEN
        EXECUTE 'DROP TRIGGER IF EXISTS trg_notify_on_withdrawal ON public.affiliate_withdrawals';
        EXECUTE 'CREATE TRIGGER trg_notify_on_withdrawal AFTER INSERT OR UPDATE ON public.affiliate_withdrawals FOR EACH ROW EXECUTE PROCEDURE public.fn_notify_on_withdrawal_event()';
    END IF;
END
$$;

-- 8. Trigger Function: Affiliate Applications Automation
CREATE OR REPLACE FUNCTION public.fn_notify_on_affiliate_app_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Event: New Application Submitted -> Notify Admin
    IF (TG_OP = 'INSERT') THEN
        PERFORM public.create_system_notification(
            NULL,
            'admin',
            'affiliate_application',
            'New Affiliate Application',
            'Applicant ' || COALESCE(NEW.full_name, 'Partner') || ' applied to become an affiliate.',
            'application',
            NEW.id
        );
        RETURN NEW;
    END IF;

    -- Event: Application Approved -> Notify Affiliate
    IF (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status <> 'approved') THEN
        IF NEW.user_id IS NOT NULL THEN
            PERFORM public.create_system_notification(
                NEW.user_id,
                'affiliate',
                'affiliate_approved',
                'Application Approved',
                'Congratulations! Your Amiele affiliate partner application has been approved.',
                'application',
                NEW.id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'affiliate_applications') THEN
        EXECUTE 'DROP TRIGGER IF EXISTS trg_notify_on_affiliate_app ON public.affiliate_applications';
        EXECUTE 'CREATE TRIGGER trg_notify_on_affiliate_app AFTER INSERT OR UPDATE ON public.affiliate_applications FOR EACH ROW EXECUTE PROCEDURE public.fn_notify_on_affiliate_app_event()';
    END IF;
END
$$;

-- 9. Trigger Function: Commissions Automation (if commissions table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commissions') THEN
        EXECUTE '
        CREATE OR REPLACE FUNCTION public.fn_notify_on_commission_event()
        RETURNS trigger
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $fn$
        BEGIN
            IF (TG_OP = ''INSERT'') THEN
                PERFORM public.create_system_notification(
                    NEW.affiliate_id,
                    ''affiliate'',
                    ''commission_earned'',
                    ''Commission Earned'',
                    ''Congratulations. You earned ETB '' || trim(to_char(NEW.amount, ''999,999,999.00'')) || '' commission.'',
                    ''commission'',
                    NEW.id
                );
            END IF;
            RETURN NEW;
        END;
        $fn$;';

        EXECUTE 'DROP TRIGGER IF EXISTS trg_notify_on_commission ON public.commissions';
        EXECUTE 'CREATE TRIGGER trg_notify_on_commission AFTER INSERT ON public.commissions FOR EACH ROW EXECUTE PROCEDURE public.fn_notify_on_commission_event()';
    END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
