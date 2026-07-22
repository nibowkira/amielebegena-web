-- store_settings table
CREATE TABLE IF NOT EXISTS store_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL
);

INSERT INTO store_settings (key, value)
VALUES ('exchange_rate', '{"usd_to_etb": 120}')
ON CONFLICT (key) DO NOTHING;

-- affiliate_clicks table
CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    affiliate_code text NOT NULL,
    session_id text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(affiliate_code, session_id)
);

-- RLS policies
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read store_settings" ON store_settings FOR SELECT USING (true);

ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
-- We'll allow inserts from public but hide selects
CREATE POLICY "Public can insert clicks" ON affiliate_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can view clicks" ON affiliate_clicks FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- RPC for logging a click
CREATE OR REPLACE FUNCTION log_affiliate_click(code_val text, session_val text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO affiliate_clicks (affiliate_code, session_id)
    VALUES (code_val, session_val)
    ON CONFLICT (affiliate_code, session_id) DO NOTHING;
END;
$$;

-- RPC for getting exchange rate
CREATE OR REPLACE FUNCTION get_exchange_rate()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rate numeric;
BEGIN
    SELECT (value->>'usd_to_etb')::numeric INTO rate FROM store_settings WHERE key = 'exchange_rate';
    RETURN COALESCE(rate, 120);
END;
$$;

-- RPC for getting affiliate stats
CREATE OR REPLACE FUNCTION get_affiliate_stats(user_id_val uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    sales_count int;
    total_clicks int;
    aff_code text;
    calculated_tier text;
    comm_rate numeric;
BEGIN
    -- Get affiliate code
    SELECT referral_code INTO aff_code FROM affiliates WHERE user_id = user_id_val;

    -- Get sales count
    SELECT COUNT(*) INTO sales_count
    FROM orders
    WHERE affiliate_id = user_id_val 
      AND status != 'cancelled' 
      AND payment_status = 'paid';

    -- Determine tier and commission rate
    IF sales_count >= 30 THEN
        calculated_tier := 'gold';
        comm_rate := 0.15;
    ELSIF sales_count >= 10 THEN
        calculated_tier := 'silver';
        comm_rate := 0.12;
    ELSE
        calculated_tier := 'bronze';
        comm_rate := 0.10;
    END IF;

    -- Get clicks
    SELECT COUNT(*) INTO total_clicks FROM affiliate_clicks WHERE affiliate_code = aff_code;

    RETURN json_build_object(
        'sales', COALESCE(sales_count, 0),
        'tier', calculated_tier,
        'commission_rate', comm_rate,
        'clicks', COALESCE(total_clicks, 0)
    );
END;
$$;
