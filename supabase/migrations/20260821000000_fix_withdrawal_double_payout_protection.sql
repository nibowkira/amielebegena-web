-- ============================================================================
-- Migration: Fix Withdrawal / Payout Double-Processing & Concurrency Protection
-- Purpose:
--   1. Ensures audit_logs table exists with RLS for financial tracking.
--   2. Authoritative server-side atomic withdrawal status management & payout RPC.
--   3. Prevents double payouts, duplicate deductions, and race conditions.
--   4. Guarantees in-flight withdrawal reservation (pending requests reserve balance).
--   5. Prevents an affiliate from creating multiple requests exceeding balance.
--   6. Unique database constraint/index on audit/payout ledger to enforce 1 payout per withdrawal.
--   7. Trigger-level integrity enforcement to prevent direct over-payouts or altering paid records.
--   8. Full idempotency on "Mark Paid" operations.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENSURE AUDIT_LOGS TABLE & UNIQUE INDEX FOR WITHDRAWAL PAYOUT IDEMPOTENCY
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action text NOT NULL,
    details jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'audit_logs' AND policyname = 'Admins can view audit logs'
    ) THEN
        CREATE POLICY "Admins can view audit logs" 
            ON public.audit_logs FOR SELECT 
            USING (public.get_user_role() = 'admin');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'audit_logs' AND policyname = 'Admins can insert audit logs'
    ) THEN
        CREATE POLICY "Admins can insert audit logs" 
            ON public.audit_logs FOR INSERT 
            WITH CHECK (public.get_user_role() = 'admin');
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_logs_unique_withdrawal_paid 
ON public.audit_logs ((details->>'withdrawal_id')) 
WHERE (action = 'Withdrawal Paid');

-- ---------------------------------------------------------------------------
-- 2. SECURE RPC TO REQUEST WITHDRAWAL (WITH IN-FLIGHT BALANCE RESERVATION)
-- ---------------------------------------------------------------------------
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

    -- Verify email confirmation
    IF NOT public.is_email_confirmed() THEN
        RAISE EXCEPTION 'Email verification required before requesting a withdrawal. Please verify your email first. / ገንዘብ ለመውሰድ ኢሜልዎን ማረጋገጥ ያስፈልጋል።';
    END IF;

    -- Validate amount
    IF p_amount IS NULL OR p_amount < 500 THEN
        RAISE EXCEPTION 'Minimum withdrawal amount is ETB 500.00.';
    END IF;

    IF p_method IS NULL OR length(trim(p_method)) < 2 THEN
        RAISE EXCEPTION 'Invalid payment method provided.';
    END IF;

    IF p_phone IS NULL OR length(trim(p_phone)) < 5 THEN
        RAISE EXCEPTION 'Invalid phone / account number provided.';
    END IF;

    -- Lock the affiliate record to serialize concurrent withdrawal requests
    SELECT * INTO v_aff 
    FROM public.affiliates 
    WHERE user_id = v_user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Affiliate account record not found.';
    END IF;

    -- 1. Total approved commission earnings
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_earnings
    FROM public.commissions
    WHERE affiliate_id = v_user_id AND status = 'approved';

    -- 2. Total active / in-flight reservations (pending + approved + paid)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_in_flight_committed
    FROM public.affiliate_withdrawals
    WHERE affiliate_id = v_user_id 
      AND status IN ('pending', 'approved', 'paid');

    v_available_balance := GREATEST(0, v_total_earnings - v_in_flight_committed);

    -- Reject if requested amount exceeds remaining unreserved balance
    IF v_available_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient available balance. Available: ETB %, Requested: ETB % (including pending requests).',
            trim(to_char(v_available_balance, 'FM999,999,990.00')),
            trim(to_char(p_amount, 'FM999,999,990.00'));
    END IF;

    -- Insert withdrawal
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

-- ---------------------------------------------------------------------------
-- 3. AUTHORITATIVE ADMIN WITHDRAWAL STATUS RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_withdrawal_status(
    p_withdrawal_id uuid,
    p_new_status text,
    p_admin_id uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_status text;
    v_wth record;
    v_aff record;
    v_total_earnings numeric;
    v_total_committed numeric;
    v_available_balance numeric;
    v_effective_admin_id uuid;
BEGIN
    -- 1. Authorization: Only administrators can update withdrawal status
    IF auth.uid() IS NOT NULL THEN
        IF public.get_user_role() <> 'admin' THEN
            RAISE EXCEPTION 'Access Denied: Only administrators can update withdrawal requests.';
        END IF;
    ELSE
        -- Fallback for direct database/service-role calls
        IF p_admin_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'admin') THEN
            RAISE EXCEPTION 'Access Denied: Only administrators can update withdrawal requests.';
        END IF;
    END IF;

    v_target_status := lower(trim(p_new_status));
    IF v_target_status NOT IN ('approved', 'rejected', 'paid') THEN
        RAISE EXCEPTION 'Invalid withdrawal status: "%". Allowed statuses are approved, rejected, or paid.', p_new_status;
    END IF;

    v_effective_admin_id := COALESCE(p_admin_id, auth.uid());

    -- 2. Lock withdrawal record FOR UPDATE to prevent race conditions
    SELECT * INTO v_wth 
    FROM public.affiliate_withdrawals 
    WHERE id = p_withdrawal_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Withdrawal request not found.';
    END IF;

    -- 3. Idempotency Check: If already marked as 'paid'
    IF v_wth.status = 'paid' THEN
        IF v_target_status = 'paid' THEN
            RETURN json_build_object(
                'success', true,
                'already_paid', true,
                'withdrawal_id', p_withdrawal_id,
                'status', 'paid',
                'amount', v_wth.amount,
                'message', 'Withdrawal already processed and marked as paid.'
            );
        ELSE
            RAISE EXCEPTION 'Cannot modify a withdrawal that has already been paid.';
        END IF;
    END IF;

    -- 4. Handling Rejections
    IF v_target_status = 'rejected' THEN
        UPDATE public.affiliate_withdrawals
        SET status = 'rejected',
            processed_by = v_effective_admin_id,
            processed_at = now(),
            updated_at = now()
        WHERE id = p_withdrawal_id;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
            INSERT INTO public.audit_logs (user_id, action, details)
            VALUES (
                v_effective_admin_id,
                'Withdrawal Rejected',
                json_build_object(
                    'withdrawal_id', p_withdrawal_id,
                    'affiliate_id', v_wth.affiliate_id,
                    'amount', v_wth.amount,
                    'status', 'rejected'
                )
            );
        END IF;

        RETURN json_build_object(
            'success', true,
            'already_paid', false,
            'withdrawal_id', p_withdrawal_id,
            'status', 'rejected',
            'amount', v_wth.amount,
            'message', 'Withdrawal request rejected.'
        );
    END IF;

    -- 5. Handling 'approved' or 'paid'
    IF v_wth.status = 'rejected' THEN
        RAISE EXCEPTION 'Cannot approve or pay a rejected withdrawal request.';
    END IF;

    -- Lock the affiliate's profile record to serialize all concurrent payouts for this affiliate
    SELECT * INTO v_aff 
    FROM public.affiliates 
    WHERE user_id = v_wth.affiliate_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Affiliate record not found.';
    END IF;

    -- Calculate total approved commissions earned by the affiliate
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_earnings
    FROM public.commissions
    WHERE affiliate_id = v_wth.affiliate_id AND status = 'approved';

    -- Calculate total already committed withdrawals (approved or paid, excluding current row)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_committed
    FROM public.affiliate_withdrawals
    WHERE affiliate_id = v_wth.affiliate_id 
      AND status IN ('approved', 'paid')
      AND id <> p_withdrawal_id;

    v_available_balance := GREATEST(0, v_total_earnings - v_total_committed);

    -- Strict balance verification: available balance MUST be >= withdrawal amount
    IF v_available_balance < v_wth.amount THEN
        RAISE EXCEPTION 'Insufficient affiliate balance. Available: ETB %, Requested: ETB %',
            trim(to_char(v_available_balance, 'FM999,999,990.00')),
            trim(to_char(v_wth.amount, 'FM999,999,990.00'));
    END IF;

    -- Perform atomic status transition
    UPDATE public.affiliate_withdrawals
    SET status = v_target_status,
        processed_by = v_effective_admin_id,
        processed_at = now(),
        updated_at = now()
    WHERE id = p_withdrawal_id;

    -- Log financial audit entry with idempotency check
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        IF v_target_status = 'paid' THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.audit_logs 
                WHERE action = 'Withdrawal Paid' 
                  AND (details->>'withdrawal_id') = p_withdrawal_id::text
            ) THEN
                INSERT INTO public.audit_logs (user_id, action, details)
                VALUES (
                    v_effective_admin_id,
                    'Withdrawal Paid',
                    json_build_object(
                        'withdrawal_id', p_withdrawal_id,
                        'affiliate_id', v_wth.affiliate_id,
                        'amount', v_wth.amount,
                        'status', 'paid',
                        'available_balance_before', v_available_balance,
                        'remaining_balance', (v_available_balance - v_wth.amount)
                    )
                );
            END IF;
        ELSE
            INSERT INTO public.audit_logs (user_id, action, details)
            VALUES (
                v_effective_admin_id,
                'Withdrawal Approved',
                json_build_object(
                    'withdrawal_id', p_withdrawal_id,
                    'affiliate_id', v_wth.affiliate_id,
                    'amount', v_wth.amount,
                    'status', 'approved',
                    'available_balance_before', v_available_balance,
                    'remaining_balance', (v_available_balance - v_wth.amount)
                )
            );
        END IF;
    END IF;

    RETURN json_build_object(
        'success', true,
        'already_paid', false,
        'withdrawal_id', p_withdrawal_id,
        'status', v_target_status,
        'amount', v_wth.amount,
        'remaining_balance', (v_available_balance - v_wth.amount),
        'message', CASE WHEN v_target_status = 'paid' THEN 'Withdrawal marked as paid successfully.' ELSE 'Withdrawal request approved.' END
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. DEDICATED PAYOUT RPC ALIAS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_withdrawal_payout(
    p_withdrawal_id uuid,
    p_admin_id uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.admin_update_withdrawal_status(p_withdrawal_id, 'paid', p_admin_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_affiliate_withdrawal(numeric, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_withdrawal_status(uuid, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_withdrawal_payout(uuid, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. TRIGGER-LEVEL INTEGRITY GUARD ON AFFILIATE_WITHDRAWALS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_enforce_withdrawal_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_earnings numeric;
    v_total_committed numeric;
    v_available_balance numeric;
BEGIN
    -- 1. Prevent altering or reverting a paid withdrawal
    IF TG_OP = 'UPDATE' AND OLD.status = 'paid' AND NEW.status <> 'paid' THEN
        RAISE EXCEPTION 'Illegal operation: Paid withdrawals cannot be altered or reverted.';
    END IF;

    -- 2. On INSERT (any status, including pending reservation): verify unreserved available balance
    IF TG_OP = 'INSERT' THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_total_earnings
        FROM public.commissions
        WHERE affiliate_id = NEW.affiliate_id AND status = 'approved';

        SELECT COALESCE(SUM(amount), 0) INTO v_total_committed
        FROM public.affiliate_withdrawals
        WHERE affiliate_id = NEW.affiliate_id 
          AND status IN ('pending', 'approved', 'paid')
          AND id <> NEW.id;

        v_available_balance := GREATEST(0, v_total_earnings - v_total_committed);

        IF v_available_balance < NEW.amount THEN
            RAISE EXCEPTION 'Insufficient available balance: Affiliate only has ETB % available (including in-flight reservations), but requested ETB %.',
                trim(to_char(v_available_balance, 'FM999,999,990.00')),
                trim(to_char(NEW.amount, 'FM999,999,990.00'));
        END IF;
    END IF;

    -- 3. On UPDATE to approved or paid: verify available balance
    IF TG_OP = 'UPDATE' AND NEW.status IN ('approved', 'paid') AND OLD.status NOT IN ('approved', 'paid') THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_total_earnings
        FROM public.commissions
        WHERE affiliate_id = NEW.affiliate_id AND status = 'approved';

        SELECT COALESCE(SUM(amount), 0) INTO v_total_committed
        FROM public.affiliate_withdrawals
        WHERE affiliate_id = NEW.affiliate_id 
          AND status IN ('approved', 'paid')
          AND id <> NEW.id;

        v_available_balance := GREATEST(0, v_total_earnings - v_total_committed);

        IF v_available_balance < NEW.amount THEN
            RAISE EXCEPTION 'Insufficient balance: Affiliate only has ETB % available, but withdrawal is ETB %.',
                trim(to_char(v_available_balance, 'FM999,999,990.00')),
                trim(to_char(NEW.amount, 'FM999,999,990.00'));
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'affiliate_withdrawals') THEN
        DROP TRIGGER IF EXISTS trg_enforce_withdrawal_integrity ON public.affiliate_withdrawals;
        CREATE TRIGGER trg_enforce_withdrawal_integrity
        BEFORE INSERT OR UPDATE ON public.affiliate_withdrawals
        FOR EACH ROW EXECUTE PROCEDURE public.fn_enforce_withdrawal_integrity();
    END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
