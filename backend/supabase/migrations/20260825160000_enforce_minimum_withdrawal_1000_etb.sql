-- ===========================================================================
-- AMIELE BEGENA — ENFORCE MINIMUM WITHDRAWAL 1,000 ETB
-- Migration: 20260825160000_enforce_minimum_withdrawal_1000_etb.sql
-- 
-- Description:
-- Authoritatively enforces a minimum affiliate withdrawal amount of 1,000 ETB
-- in the server-side PostgreSQL RPC `public.request_affiliate_withdrawal`.
-- Rejects amounts below 1,000 ETB with a clear bilingual error message.
-- Preserves all existing security: email verification gate, atomic FOR UPDATE 
-- row locking, in-flight fund reservation, RLS policies, and payout ledgers.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.request_affiliate_withdrawal(
    p_amount numeric,
    p_method text,
    p_phone text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_aff record;
    v_total_earnings numeric;
    v_in_flight_committed numeric;
    v_available_balance numeric;
    v_new_wth record;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to request a withdrawal.';
    END IF;

    -- 1. Authoritative Email Verification Gate
    IF NOT public.is_email_confirmed() THEN
        RAISE EXCEPTION 'Email verification required before requesting a withdrawal. Please verify your email first. / ገንዘብ ለመውሰድ ኢሜልዎን ማረጋገጥ ያስፈልጋል።';
    END IF;

    -- 2. Authoritative Minimum Withdrawal Rule (1,000 ETB)
    IF p_amount IS NULL OR p_amount < 1000 THEN
        RAISE EXCEPTION 'Minimum withdrawal amount is 1,000 ETB. / ዝቅተኛው የማውጣት መጠን 1,000 ብር ነው።';
    END IF;

    IF p_method IS NULL OR length(trim(p_method)) < 2 THEN
        RAISE EXCEPTION 'Invalid payment method provided.';
    END IF;

    IF p_phone IS NULL OR length(trim(p_phone)) < 5 THEN
        RAISE EXCEPTION 'Invalid phone / account number provided.';
    END IF;

    -- 3. Atomic Row-Level Lock on Affiliate Record (Prevents concurrent race conditions)
    SELECT * INTO v_aff 
    FROM public.affiliates 
    WHERE user_id = v_user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Affiliate account record not found.';
    END IF;

    -- 4. Calculate Total Approved Commission Earnings
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_earnings
    FROM public.commissions
    WHERE affiliate_id = v_user_id AND status = 'approved';

    -- 5. Calculate Active / In-Flight Reserved Amounts (Pending + Approved + Paid)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_in_flight_committed
    FROM public.affiliate_withdrawals
    WHERE affiliate_id = v_user_id 
      AND status IN ('pending', 'approved', 'paid');

    v_available_balance := GREATEST(0, v_total_earnings - v_in_flight_committed);

    -- 6. Reject if Requested Amount Exceeds Unreserved Available Balance
    IF v_available_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Your available balance is ETB %. / በቂ ሂሳብ የሎትም። ያለዎት balance ETB % ነው።',
            trim(to_char(v_available_balance, 'FM999,999,990.00')),
            trim(to_char(v_available_balance, 'FM999,999,990.00'));
    END IF;

    -- 7. Atomically Insert In-Flight Pending Withdrawal
    INSERT INTO public.affiliate_withdrawals (
        affiliate_id,
        amount,
        method,
        phone,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        p_amount,
        p_method,
        p_phone,
        'pending',
        now(),
        now()
    )
    RETURNING * INTO v_new_wth;

    RETURN json_build_object(
        'success', true,
        'id', v_new_wth.id,
        'amount', v_new_wth.amount,
        'method', v_new_wth.method,
        'phone', v_new_wth.phone,
        'status', v_new_wth.status,
        'created_at', v_new_wth.created_at,
        'remaining_available_balance', (v_available_balance - p_amount)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_affiliate_withdrawal(numeric, text, text) TO authenticated, service_role;
