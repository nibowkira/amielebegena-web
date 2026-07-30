-- ============================================================================
-- Migration: Create track_guest_order RPC function
-- Idempotent: safe to run multiple times
-- Purpose: Allow unauthenticated (anon) guests to look up their order status
--          by providing BOTH order_number AND (phone OR email).
-- ============================================================================

-- Drop existing function if it exists (idempotent)
DROP FUNCTION IF EXISTS public.track_guest_order(text, text);

-- Create the SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.track_guest_order(
    p_order_number text,
    p_contact_info text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_number text;
    v_contact      text;
    v_order        record;
    v_result       jsonb;
    v_history      jsonb;
BEGIN
    -- ── Input validation ──────────────────────────────────────────────────
    IF p_order_number IS NULL OR trim(p_order_number) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error',   'Order number is required.'
        );
    END IF;

    IF p_contact_info IS NULL OR trim(p_contact_info) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error',   'Phone number or email is required for verification.'
        );
    END IF;

    -- ── Normalize order number (strip leading # and whitespace, uppercase) ─
    v_order_number := upper(trim(leading '#' FROM trim(p_order_number)));

    -- ── Normalize contact info ────────────────────────────────────────────
    v_contact := lower(trim(p_contact_info));

    -- ── Look up order with dual verification ──────────────────────────────
    SELECT
        o.id,
        o.order_number,
        o.customer_name,
        o.phone,
        o.customer_email,
        COALESCE(p.name, 'Ethiopian Instrument') AS product_name,
        o.quantity,
        o.country,
        o.payment_status,
        o.fulfillment_status,
        o.tracking_number,
        o.shipping_company,
        o.shipping_notes,
        o.estimated_delivery,
        o.packed_at,
        o.shipped_at,
        o.delivered_at,
        o.last_status_update,
        o.created_at,
        o.notes
    INTO v_order
    FROM public.orders o
    LEFT JOIN public.products p ON p.id = o.product_id
    WHERE upper(o.order_number) = v_order_number
      AND (
          -- Match by phone: strip all non-digits and compare last 9 digits
          regexp_replace(o.phone, '[^0-9]', '', 'g') LIKE '%' || right(regexp_replace(v_contact, '[^0-9]', '', 'g'), 9)
          OR
          -- Match by email (case-insensitive)
          lower(o.customer_email) = v_contact
      )
    LIMIT 1;

    -- ── No match found ────────────────────────────────────────────────────
    IF v_order IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error',   'No matching order found. Please check your order number and contact information.'
        );
    END IF;

    -- ── Fetch fulfillment history timeline ────────────────────────────────
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'status',     h.new_status,
            'changed_at', h.changed_at,
            'notes',      h.notes
        ) ORDER BY h.changed_at ASC
    ), '[]'::jsonb)
    INTO v_history
    FROM public.order_fulfillment_history h
    WHERE h.order_id = v_order.id;

    -- ── Build result object ───────────────────────────────────────────────
    v_result := jsonb_build_object(
        'success',            true,
        'order_number',       v_order.order_number,
        'customer_name',      v_order.customer_name,
        'product_name',       v_order.product_name,
        'quantity',           v_order.quantity,
        'country',            v_order.country,
        'payment_status',     v_order.payment_status,
        'fulfillment_status', COALESCE(v_order.fulfillment_status, 'Pending'),
        'tracking_number',    v_order.tracking_number,
        'shipping_company',   v_order.shipping_company,
        'shipping_notes',     v_order.shipping_notes,
        'estimated_delivery', v_order.estimated_delivery,
        'packed_at',          v_order.packed_at,
        'shipped_at',         v_order.shipped_at,
        'delivered_at',       v_order.delivered_at,
        'last_status_update', v_order.last_status_update,
        'order_date',         v_order.created_at,
        'timeline',           v_history
    );

    RETURN v_result;
END;
$$;

-- ── Grant execute to anon and authenticated roles ─────────────────────────
GRANT EXECUTE ON FUNCTION public.track_guest_order(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.track_guest_order(text, text) TO authenticated;

-- ── Add comment for documentation ────────────────────────────────────────
COMMENT ON FUNCTION public.track_guest_order(text, text)
IS 'Public order tracking RPC. Requires order_number + phone/email for privacy verification. Returns order details and fulfillment timeline. SECURITY DEFINER bypasses RLS.';
