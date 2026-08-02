ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS phone text;

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
    v_prod_id uuid;
    v_new_order record;
BEGIN
    IF p_product_id IS NOT NULL AND p_product_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        SELECT id INTO v_prod_id FROM public.products WHERE id = p_product_id::uuid;
    END IF;

    IF v_prod_id IS NULL THEN
        SELECT id INTO v_prod_id FROM public.products LIMIT 1;
    END IF;

    IF v_prod_id IS NULL THEN
        INSERT INTO public.products (name, slug, category, price)
        VALUES ('Ethiopian Instrument', 'ethiopian-instrument-default', 'begenna', 100.00)
        RETURNING id INTO v_prod_id;
    END IF;

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
    ) VALUES (
        p_customer_name,
        p_phone,
        COALESCE(p_customer_email, 'N/A'),
        COALESCE(p_country, 'N/A'),
        v_prod_id,
        COALESCE(p_quantity, 1),
        p_referral_code,
        'pending',
        'pending_payment',
        p_notes
    )
    RETURNING * INTO v_new_order;

    RETURN json_build_object(
        'success', true,
        'order_id', v_new_order.id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_guest_order TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
