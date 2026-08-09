-- Migration: 20260809010000_fix_guest_order_product_resolution.sql
-- Description: Fix guest order product resolution logic to eliminate arbitrary LIMIT 1 product substitution.

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
    v_prod_id uuid;
    v_prod_name text;
    v_prod_price numeric;
    v_prod_currency text;
    v_new_order record;
BEGIN
    -- 1. UUID lookup: If p_product_id is a valid UUID, resolve products.id = p_product_id::uuid
    IF p_product_id IS NOT NULL AND p_product_id ~* '^[0-9a-f-]{36}$' THEN
        SELECT id, name, price, COALESCE(currency, 'ETB')
        INTO v_prod_id, v_prod_name, v_prod_price, v_prod_currency
        FROM public.products
        WHERE id = p_product_id::uuid AND (deleted_at IS NULL OR status = 'active');
    END IF;

    -- 2. Slug lookup: If unresolved, try products.slug = lower(trim(p_product_id))
    IF v_prod_id IS NULL AND p_product_id IS NOT NULL AND trim(p_product_id) <> '' THEN
        SELECT id, name, price, COALESCE(currency, 'ETB')
        INTO v_prod_id, v_prod_name, v_prod_price, v_prod_currency
        FROM public.products
        WHERE lower(slug) = lower(trim(p_product_id)) AND (deleted_at IS NULL OR status = 'active');
    END IF;

    -- 3. Legacy numeric mapping: Support mappings resolved by slug ('1' -> begena, '2' -> kirar, '3' -> mesenko-wood, '9' -> awtar, '20' -> mesenko-steel)
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

    -- 4. Product-name lookup: Safely match supplied product name against products.name
    IF v_prod_id IS NULL AND p_product_name IS NOT NULL AND trim(p_product_name) <> '' THEN
        SELECT id, name, price, COALESCE(currency, 'ETB')
        INTO v_prod_id, v_prod_name, v_prod_price, v_prod_currency
        FROM public.products
        WHERE (
            lower(name) = lower(trim(p_product_name))
            OR lower(trim(p_product_name)) LIKE '%' || lower(slug) || '%'
            OR lower(trim(p_product_name)) LIKE '%' || lower(name) || '%'
            OR lower(name) LIKE '%' || lower(trim(p_product_name)) || '%'
        )
        AND (deleted_at IS NULL OR status = 'active')
        ORDER BY sort_order ASC, created_at ASC
        LIMIT 1;
    END IF;

    -- 5 & 6. NEVER use LIMIT 1 fallback. If product still cannot be resolved, RAISE EXCEPTION!
    IF v_prod_id IS NULL THEN
        RAISE EXCEPTION 'Unable to resolve selected product: %', COALESCE(p_product_id, p_product_name, 'Unknown');
    END IF;

    -- Insert order using resolved authoritative product ID
    INSERT INTO public.orders (
        customer_name,
        phone,
        customer_email,
        country,
        product_id,
        quantity,
        referral_code,
        status,
        payment_status,
        notes
    )
    VALUES (
        p_customer_name,
        p_phone,
        COALESCE(p_customer_email, 'N/A'),
        COALESCE(p_country, 'N/A'),
        v_prod_id,
        COALESCE(p_quantity, 1),
        p_referral_code,
        'pending',
        'pending_payment',
        COALESCE(p_notes, 'Guest WhatsApp Checkout')
    )
    RETURNING * INTO v_new_order;

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
