-- Migration: Repair Missing Commissions for Paid Affiliate Orders
-- Idempotent script: Safe to run multiple times in Supabase SQL Editor.

DO $$
DECLARE
    order_rec RECORD;
    prod_price numeric;
    exchange_rate numeric := 120.0;
    calculated_amount numeric;
    missing_count integer := 0;
    created_count integer := 0;
BEGIN
    -- Loop through all paid orders with an attributed affiliate
    FOR order_rec IN 
        SELECT o.id, o.affiliate_id, o.quantity, o.product_id, o.created_at
        FROM public.orders o
        WHERE o.payment_status = 'paid'
          AND o.affiliate_id IS NOT NULL
    LOOP
        -- Check if a commission record already exists for this order
        IF NOT EXISTS (
            SELECT 1 FROM public.commissions c WHERE c.order_id = order_rec.id
        ) THEN
            missing_count := missing_count + 1;

            -- Get product price (default to $100 if product price is NULL or missing)
            SELECT COALESCE(price, 100.0) INTO prod_price
            FROM public.products
            WHERE id = order_rec.product_id;

            IF prod_price IS NULL THEN
                prod_price := 100.0;
            END IF;

            -- Calculate 10% commission in ETB, minimum 1,200 ETB
            calculated_amount := GREATEST(1200.0, ROUND((prod_price * COALESCE(order_rec.quantity, 1) * exchange_rate) * 0.10));

            -- Insert missing commission record with all required fields
            INSERT INTO public.commissions (
                affiliate_id,
                order_id,
                amount,
                rate,
                status,
                created_at,
                updated_at
            ) VALUES (
                order_rec.affiliate_id,
                order_rec.id,
                calculated_amount,
                10.0,
                'approved',
                COALESCE(order_rec.created_at, NOW()),
                NOW()
            );

            created_count := created_count + 1;
            RAISE NOTICE 'Created missing commission of ETB % for Order %', calculated_amount, order_rec.id;
        END IF;
    END LOOP;

    RAISE NOTICE 'Commission Repair Complete: % missing commissions identified, % created.', missing_count, created_count;
END $$;

-- Verification Queries:
-- 1. Total paid affiliate orders vs. approved commission records count
SELECT 
    (SELECT COUNT(*) FROM public.orders WHERE payment_status = 'paid' AND affiliate_id IS NOT NULL) AS paid_affiliate_orders_count,
    (SELECT COUNT(*) FROM public.commissions WHERE status = 'approved') AS total_approved_commissions_count;

-- 2. Total earnings breakdown per affiliate
SELECT 
    c.affiliate_id,
    a.referral_code,
    COUNT(c.id) AS total_commission_records,
    SUM(c.amount) AS total_earnings_etb
FROM public.commissions c
LEFT JOIN public.affiliates a ON c.affiliate_id = a.user_id
GROUP BY c.affiliate_id, a.referral_code;
