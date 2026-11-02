-- Migration: Widen orders insert policy to allow guest checkout submission and affiliate attribution
DROP POLICY IF EXISTS "Allow authenticated users to create orders" ON public.orders;

CREATE POLICY "Allow anyone to create orders" ON public.orders
    FOR INSERT WITH CHECK (true);
