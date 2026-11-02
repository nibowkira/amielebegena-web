-- ============================================================================
-- Migration: 20260822020000_harden_guest_order_and_rate_limiting.sql
-- Purpose:
--   P0-4: Hardens create_guest_order RPC to require authoritative product resolution
--         ONLY (removes fuzzy LIKE product_name matching and removes any arbitrary
--         LIMIT 1 product fallback). Rejects orders for invalid/inactive products.
--   P1-3: Adds server-side rate limiting to prevent automated guest order spam
--         (maximum 5 orders per phone number per hour).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_guest_order(
    p_customer_name text,
    p_phone text,
    p_customer_email text DEFAULT NULL::text,
    p_country text DEFAULT NULL::text,
    p_product_id text DEFAULT NULL::text,
    p_product_name text DEFAULT NULL::text,
    p_quantity integer DEFAULT 1,
    p_referral_code text DEFAULT NULL::text,
    p_session_id text DEFAULT NULL::text,
    p_notes text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_name text;
    v_clean_phone text;
    v_clean_email text;
    v_clean_country text;
    v_clean_notes text;
    v_qty integer;
    v_recent_order_count integer;
    v_prod_id uuid;
    v_prod_name text;
    v_prod_price numeric;
    v_prod_currency text;
    v_affiliate_id uuid;
    v_resolved_ref_code text;
    v_new_order record;
BEGIN
    -- 1. Input Sanitization & Validation
    v_clean_name := trim(COALESCE(p_customer_name, ''));
    IF length(v_clean_name) < 2 THEN
        RAISE EXCEPTION 'Customer full name must be at least 2 characters.';
    END IF;
    IF length(v_clean_name) > 200 THEN
        v_clean_name := substring(v_clean_name from 1 for 200);
    END IF;

    v_clean_phone := trim(COALESCE(p_phone, ''));
    IF length(v_clean_phone) < 5 THEN
        RAISE EXCEPTION 'A valid contact phone number is required.';
    END IF;
    IF length(v_clean_phone) > 30 THEN
        v_clean_phone := substring(v_clean_phone from 1 for 30);
    END IF;

    v_clean_email := trim(COALESCE(p_customer_email, 'N/A'));
    IF length(v_clean_email) > 254 THEN
        v_clean_email := substring(v_clean_email from 1 for 254);
    END IF;

    v_clean_country := trim(COALESCE(p_country, 'Ethiopia'));
    IF length(v_clean_country) > 100 THEN
        v_clean_country := substring(v_clean_country from 1 for 100);
    END IF;

    v_clean_notes := trim(COALESCE(p_notes, 'Guest WhatsApp Checkout'));
    IF length(v_clean_notes) > 500 THEN
        v_clean_notes := substring(v_clean_notes from 1 for 500);
    END IF;

    v_qty := COALESCE(p_quantity, 1);
    IF v_qty < 1 OR v_qty > 100 THEN
        RAISE EXCEPTION 'Order quantity must be between 1 and 100.';
    END IF;

    -- 2. P1-3: Rate Limiting Enforcement
    -- Maximum 5 orders per phone number per hour to protect against automated spam.
    SELECT COUNT(*) INTO v_recent_order_count
    FROM public.orders
    WHERE phone = v_clean_phone
      AND created_at > (now() - interval '1 hour');

    IF v_recent_order_count >= 5 THEN
        -- Log to fraud_logs if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fraud_logs') THEN
            INSERT INTO public.fraud_logs (reason, severity, details)
            VALUES (
                'Guest order rate limit exceeded',
                'medium',
                json_build_object(
                    'phone', v_clean_phone,
                    'customer_name', v_clean_name,
                    'recent_orders_in_hour', v_recent_order_count
                )
            );
        END IF;
        RAISE EXCEPTION 'Order limit reached. You can place at most 5 orders per hour. Please contact support or try again later.';
    END IF;

    -- 3. P0-4: Authoritative Product Resolution ONLY
    -- Step 3a: Strict UUID Lookup
    IF p_product_id IS NOT NULL AND p_product_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        SELECT id, name, price, COALESCE(currency, 'ETB')
        INTO v_prod_id, v_prod_name, v_prod_price, v_prod_currency
        FROM public.products
        WHERE id = p_product_id::uuid 
          AND (deleted_at IS NULL OR status = 'active');
    END IF;

    -- Step 3b: Controlled Slug Lookup (for canonical slug references)
    IF v_prod_id IS NULL AND p_product_id IS NOT NULL AND trim(p_product_id) <> '' THEN
        SELECT id, name, price, COALESCE(currency, 'ETB')
        INTO v_prod_id, v_prod_name, v_prod_price, v_prod_currency
        FROM public.products
        WHERE lower(slug) = lower(trim(p_product_id))
          AND (deleted_at IS NULL OR status = 'active');
    END IF;

    -- Step 3c: Controlled Legacy Numeric ID Mapping
    IF v_prod_id IS NULL AND p_product_id IS NOT NULL AND p_product_id ~ '^[0-9]+$' THEN
        SELECT id, name, price, COALESCE(currency, 'ETB')
        INTO v_prod_id, v_prod_name, v_prod_price, v_prod_currency
        FROM public.products
        WHERE (
            (p_product_id = '1' AND slug = 'begena') OR
            (p_product_id = '2' AND slug = 'kirar') OR
            (p_product_id = '3' AND slug = 'mesenko-wood') OR
            (p_product_id = '4' AND slug = 'electric-kirar') OR
            (p_product_id = '5' AND slug = 'kebero') OR
            (p_product_id = '6' AND slug = 'washint') OR
            (p_product_id = '7' AND slug = 'sanasel') OR
            (p_product_id = '8' AND slug = 'meleket') OR
            (p_product_id = '9' AND slug = 'awtar') OR
            (p_product_id = '10' AND slug = 'sheep-gut-strings') OR
            (p_product_id = '11' AND slug = 'conditioning-wax') OR
            (p_product_id = '12' AND slug = 'padded-case') OR
            (p_product_id = '13' AND slug = 'leather-bag') OR
            (p_product_id = '14' AND slug = 'cotton-tote') OR
            (p_product_id = '15' AND slug = 'begena-bag') OR
            (p_product_id = '16' AND slug = 'kirar-bag') OR
            (p_product_id = '17' AND slug = 'begena-book') OR
            (p_product_id = '18' AND slug = 'heritage-book') OR
            (p_product_id = '20' AND slug = 'mesenko-steel')
        )
        AND (deleted_at IS NULL OR status = 'active');
    END IF;

    -- Step 3d: Product resolution MUST succeed. Never fallback to arbitrary products or fuzzy name LIKE matching.
    IF v_prod_id IS NULL THEN
        RAISE EXCEPTION 'Selected product is unavailable or not found. Please choose an active product from the catalog.';
    END IF;

    -- 4. Affiliate Referral Attribution (Exact matching only)
    IF p_referral_code IS NOT NULL AND trim(p_referral_code) <> '' THEN
        SELECT user_id, referral_code INTO v_affiliate_id, v_resolved_ref_code
        FROM public.affiliates
        WHERE lower(referral_code) = lower(trim(p_referral_code))
        LIMIT 1;
    END IF;

    -- 5. Insert Authoritative Order
    INSERT INTO public.orders (
        customer_name,
        phone,
        customer_email,
        country,
        product_id,
        quantity,
        referral_code,
        affiliate_id,
        status,
        payment_status,
        notes,
        whatsapp_sent_at
    )
    VALUES (
        v_clean_name,
        v_clean_phone,
        v_clean_email,
        v_clean_country,
        v_prod_id,
        v_qty,
        COALESCE(v_resolved_ref_code, trim(p_referral_code)),
        v_affiliate_id,
        'pending',
        'pending_payment',
        v_clean_notes,
        now()
    )
    RETURNING * INTO v_new_order;

    -- 6. Return Order Confirmation Payload
    RETURN json_build_object(
        'success', true,
        'order_id', v_new_order.id,
        'order_number', v_new_order.order_number,
        'product_id', v_prod_id,
        'product_name', v_prod_name,
        'product_price', v_prod_price,
        'product_currency', v_prod_currency
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_guest_order TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
