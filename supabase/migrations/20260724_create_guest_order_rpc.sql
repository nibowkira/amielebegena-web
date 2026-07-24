-- Migration: Create SECURITY DEFINER RPC function for guest orders
-- Purpose: Execute secure server-side validation, affiliate attribution, and insertion bypassing client RLS.

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1001;

CREATE OR REPLACE FUNCTION public.create_guest_order(
    p_customer_name text,
    p_phone text,
    p_customer_email text DEFAULT NULL,
    p_country text DEFAULT NULL,
    p_product_id text DEFAULT NULL,
    p_product_name text DEFAULT NULL,
    p_quantity integer DEFAULT 1,
    p_referral_code text DEFAULT NULL,
    p_session_id text DEFAULT NULL,
    p_notes text DEFAULT NULL
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
    v_clean_ref text;
    v_resolved_product_id uuid;
    v_resolved_product_name text;
    v_resolved_affiliate_id uuid;
    v_resolved_affiliate_code text;
    v_order_number text;
    v_new_order record;
    v_whatsapp_msg text;
    v_year text;
    v_seq_val bigint;
BEGIN
    -- 1. Input Validation
    v_clean_name := trim(p_customer_name);
    IF v_clean_name IS NULL OR length(v_clean_name) < 2 THEN
        RETURN json_build_object('success', false, 'error', 'Valid customer full name is required.');
    END IF;

    v_clean_phone := trim(p_phone);
    IF v_clean_phone IS NULL OR length(v_clean_phone) < 5 THEN
        RETURN json_build_object('success', false, 'error', 'Valid phone number is required.');
    END IF;

    v_clean_country := trim(p_country);
    IF v_clean_country IS NULL OR length(v_clean_country) < 2 THEN
        RETURN json_build_object('success', false, 'error', 'Delivery country is required.');
    END IF;

    IF p_quantity IS NULL OR p_quantity < 1 THEN
        RETURN json_build_object('success', false, 'error', 'Quantity must be at least 1.');
    END IF;

    v_clean_email := CASE WHEN p_customer_email IS NOT NULL THEN trim(p_customer_email) ELSE 'N/A' END;
    v_clean_ref := CASE WHEN p_referral_code IS NOT NULL THEN trim(p_referral_code) ELSE NULL END;
    v_resolved_product_name := COALESCE(p_product_name, 'Ethiopian Instrument');

    -- 2. Resolve Product UUID
    IF p_product_id IS NOT NULL AND p_product_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        SELECT id, name INTO v_resolved_product_id, v_resolved_product_name
        FROM public.products
        WHERE id = p_product_id::uuid;
    END IF;

    IF v_resolved_product_id IS NULL AND v_resolved_product_name IS NOT NULL THEN
        SELECT id, name INTO v_resolved_product_id, v_resolved_product_name
        FROM public.products
        WHERE name ILIKE '%' || split_part(v_resolved_product_name, ' ', 1) || '%'
        LIMIT 1;
    END IF;

    IF v_resolved_product_id IS NULL THEN
        SELECT id INTO v_resolved_product_id FROM public.products LIMIT 1;
    END IF;

    -- 3. Resolve Affiliate Attribution
    IF v_clean_ref IS NOT NULL THEN
        SELECT user_id, referral_code INTO v_resolved_affiliate_id, v_resolved_affiliate_code
        FROM public.affiliates
        WHERE referral_code ILIKE v_clean_ref
        LIMIT 1;
    END IF;

    -- 4. Generate Official Order Number (AM-YYYY-XXXXXX)
    v_year := to_char(now(), 'YYYY');
    BEGIN
        v_seq_val := nextval('public.order_number_seq');
    EXCEPTION WHEN OTHERS THEN
        v_seq_val := floor(random() * 899999 + 100000)::bigint;
    END;
    v_order_number := 'AM-' || v_year || '-' || lpad(v_seq_val::text, 6, '0');

    -- 5. Insert Record into orders table
    INSERT INTO public.orders (
        order_number,
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
    ) VALUES (
        v_order_number,
        v_clean_name,
        v_clean_phone,
        v_clean_email,
        v_clean_country,
        v_resolved_product_id,
        p_quantity,
        v_resolved_affiliate_code,
        v_resolved_affiliate_id,
        'pending',
        'pending_payment',
        COALESCE(p_notes, 'Guest WhatsApp Checkout'),
        now()
    )
    RETURNING * INTO v_new_order;

    -- 6. Construct WhatsApp Message
    v_whatsapp_msg := 'Hello Amiele Begena,' || E'\n\n' ||
                      'I would like to confirm my order:' || E'\n\n' ||
                      '📦 Product:' || E'\n' || p_quantity || 'x ' || v_resolved_product_name || E'\n\n' ||
                      '🆔 Order Number:' || E'\n' || v_new_order.order_number || E'\n\n' ||
                      '👤 Customer Name:' || E'\n' || v_clean_name || E'\n\n' ||
                      '📞 Phone Number:' || E'\n' || v_clean_phone || E'\n\n' ||
                      '🌍 Delivery Country:' || E'\n' || v_clean_country ||
                      CASE WHEN v_resolved_affiliate_code IS NOT NULL THEN E'\n\n' || '🔗 Referral Code:' || E'\n' || v_resolved_affiliate_code ELSE '' END || E'\n\n' ||
                      'Thank you!';

    -- 7. Return JSON Structure
    RETURN json_build_object(
        'success', true,
        'order_id', v_new_order.id,
        'order_number', v_new_order.order_number,
        'status', v_new_order.status,
        'whatsapp_message', v_whatsapp_msg,
        'affiliate', CASE WHEN v_resolved_affiliate_code IS NOT NULL THEN json_build_object('code', v_resolved_affiliate_code, 'id', v_resolved_affiliate_id) ELSE NULL END
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Grant EXECUTE permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.create_guest_order TO anon, authenticated;
