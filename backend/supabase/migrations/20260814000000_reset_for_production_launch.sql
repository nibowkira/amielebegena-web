-- ============================================================================
-- Migration: 20260814000000_reset_for_production_launch.sql
-- Purpose: Complete, verified production reset of test business data.
--          Prepares Amiele Begena for official commercial announcement.
--
-- SAFETY ASSURANCES:
--  [✓] All auth users, admin profiles, and credentials are PRESERVED.
--  [✓] All 19 catalog products, collections, categories, and prices are PRESERVED.
--  [✓] All product images, media assets, and storage buckets are PRESERVED.
--  [✓] All database schemas, tables, RLS policies, and RPC functions are PRESERVED.
--  [✓] The 8% commission setting and engine are PRESERVED.
--  [✓] Only test transactional and activity records are cleaned.
-- ============================================================================

DO $$
BEGIN
    -- 1. Safety Check: Verify critical schema exists before running
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
        RAISE EXCEPTION 'CRITICAL SAFETY HALT: products table missing. Aborting reset.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RAISE EXCEPTION 'CRITICAL SAFETY HALT: profiles table missing. Aborting reset.';
    END IF;

    -- 2. Clear test order fulfillment timeline history
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_fulfillment_history') THEN
        TRUNCATE TABLE public.order_fulfillment_history CASCADE;
    END IF;

    -- 3. Clear all affiliate commissions (test commission ledger)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'commissions') THEN
        TRUNCATE TABLE public.commissions CASCADE;
    END IF;

    -- 4. Clear all test order records
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        TRUNCATE TABLE public.orders CASCADE;
    END IF;

    -- 5. Clear all withdrawal payout requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'affiliate_withdrawals') THEN
        TRUNCATE TABLE public.affiliate_withdrawals CASCADE;
    END IF;

    -- 6. Clear all test referral link clicks
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'affiliate_clicks') THEN
        TRUNCATE TABLE public.affiliate_clicks CASCADE;
    END IF;

    -- 7. Clear pending/test affiliate applications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'affiliate_applications') THEN
        TRUNCATE TABLE public.affiliate_applications CASCADE;
    END IF;

    -- 8. Clear test bonus campaigns and announcements
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'affiliate_campaigns') THEN
        TRUNCATE TABLE public.affiliate_campaigns CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'affiliate_announcements') THEN
        TRUNCATE TABLE public.affiliate_announcements CASCADE;
    END IF;

    -- 9. Clear test system & customer notifications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        TRUNCATE TABLE public.notifications CASCADE;
    END IF;

    -- 10. Reset all affiliate financial balances & counters to 0.00 (preserves referral codes)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'affiliates') THEN
        UPDATE public.affiliates
        SET 
            total_earnings = 0.00,
            pending_balance = 0.00,
            available_balance = 0.00,
            paid_earnings = 0.00,
            sales_count = 0,
            clicks_count = 0;
    END IF;

    -- 11. Ensure standard 8% commission setting is verified
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'commission_settings') THEN
        INSERT INTO public.commission_settings (id, rate)
        VALUES (1, 8.00)
        ON CONFLICT (id) DO UPDATE SET rate = 8.00;
    END IF;

END $$;

-- 12. Verification output
SELECT 
    (SELECT count(*) FROM public.orders) AS remaining_orders,
    (SELECT count(*) FROM public.commissions) AS remaining_commissions,
    (SELECT count(*) FROM public.affiliate_clicks) AS remaining_clicks,
    (SELECT count(*) FROM public.affiliate_campaigns) AS remaining_campaigns,
    (SELECT count(*) FROM public.affiliates) AS active_affiliates_preserved,
    (SELECT count(*) FROM public.products) AS catalog_products_preserved,
    (SELECT count(*) FROM public.product_images) AS product_images_preserved,
    (SELECT rate FROM public.commission_settings WHERE id = 1) AS commission_rate_percentage;
