-- Migration: Fix affiliate orders RLS policy
-- Purpose: Allow affiliates to SELECT orders attributed to them via affiliate_id.
-- Without this, the affiliate dashboard queries return empty results because
-- the existing policy only permits customer_id or admin reads.

-- Drop the old restrictive SELECT policy
DROP POLICY IF EXISTS "Allow customers to view their own orders" ON public.orders;

-- Create a unified SELECT policy that covers customers, affiliates, and admins
CREATE POLICY "Allow customers and affiliates to view relevant orders" ON public.orders
    FOR SELECT USING (
        auth.uid() = customer_id
        OR auth.uid() = affiliate_id
        OR public.get_user_role() = 'admin'
    );
