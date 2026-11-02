-- Migration: Add phone column to orders table and ensure admin read permissions
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS phone text;

-- Add index on created_at for fast admin queries
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Ensure RLS select policy allows admins to view all orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' AND policyname = 'Admins can view all orders'
    ) THEN
        CREATE POLICY "Admins can view all orders" 
            ON public.orders
            FOR SELECT USING (public.get_user_role() = 'admin');
    END IF;
END
$$;
