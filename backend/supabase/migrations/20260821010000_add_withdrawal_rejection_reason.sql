-- ============================================================================
-- Migration: Add Withdrawal Rejection Reason & Affiliate Notifications
-- Purpose:
--   1. Adds rejection_reason column to public.affiliate_withdrawals.
--   2. Updates public.admin_update_withdrawal_status to accept p_rejection_reason.
--   3. Automatically sends notification to affiliate when rejected or paid.
--   4. Preserves balance restoration and full atomic safety.
-- ============================================================================

-- 1. Add rejection_reason column to affiliate_withdrawals if missing
ALTER TABLE public.affiliate_withdrawals 
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 2. Update admin_update_withdrawal_status RPC
CREATE OR REPLACE FUNCTION public.admin_update_withdrawal_status(
    p_withdrawal_id uuid,
    p_new_status text,
    p_admin_id uuid DEFAULT auth.uid(),
    p_rejection_reason text DEFAULT NULL
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
    v_reason_text text;
BEGIN
    -- 1. Authorization: Only administrators can update withdrawal status
    IF auth.uid() IS NOT NULL THEN
        IF public.get_user_role() <> 'admin' THEN
            RAISE EXCEPTION 'Access Denied: Only administrators can update withdrawal requests.';
        END IF;
    ELSE
        IF p_admin_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'admin') THEN
            RAISE EXCEPTION 'Access Denied: Only administrators can update withdrawal requests.';
        END IF;
    END IF;

    v_target_status := lower(trim(p_new_status));
    IF v_target_status NOT IN ('approved', 'rejected', 'paid') THEN
        RAISE EXCEPTION 'Invalid withdrawal status: "%". Allowed statuses are approved, rejected, or paid.', p_new_status;
    END IF;

    v_effective_admin_id := COALESCE(p_admin_id, auth.uid());
    v_reason_text := NULLIF(trim(p_rejection_reason), '');

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

    -- 4. Handling Rejections: Updates status, sets rejection_reason, logs audit & sends notification
    IF v_target_status = 'rejected' THEN
        UPDATE public.affiliate_withdrawals
        SET status = 'rejected',
            rejection_reason = v_reason_text,
            processed_by = v_effective_admin_id,
            processed_at = now(),
            updated_at = now()
        WHERE id = p_withdrawal_id;

        -- Audit log
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
            INSERT INTO public.audit_logs (user_id, action, details)
            VALUES (
                v_effective_admin_id,
                'Withdrawal Rejected',
                json_build_object(
                    'withdrawal_id', p_withdrawal_id,
                    'affiliate_id', v_wth.affiliate_id,
                    'amount', v_wth.amount,
                    'status', 'rejected',
                    'rejection_reason', v_reason_text
                )
            );
        END IF;

        -- In-app notification to affiliate
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
            INSERT INTO public.notifications (
                user_id,
                user_role,
                type,
                title,
                message,
                reference_type,
                reference_id,
                is_read,
                created_at
            ) VALUES (
                v_wth.affiliate_id,
                'affiliate',
                'withdrawal_rejected',
                'Withdrawal Request Rejected',
                CASE 
                    WHEN v_reason_text IS NOT NULL THEN 'Your withdrawal request of ETB ' || trim(to_char(v_wth.amount, 'FM999,999,990.00')) || ' was rejected: "' || v_reason_text || '". Funds have been restored to your available balance.'
                    ELSE 'Your withdrawal request of ETB ' || trim(to_char(v_wth.amount, 'FM999,999,990.00')) || ' was declined. Funds have been restored to your available balance.'
                END,
                'withdrawal',
                p_withdrawal_id,
                false,
                now()
            );
        END IF;

        RETURN json_build_object(
            'success', true,
            'already_paid', false,
            'withdrawal_id', p_withdrawal_id,
            'status', 'rejected',
            'amount', v_wth.amount,
            'rejection_reason', v_reason_text,
            'message', 'Withdrawal request rejected. Funds restored to affiliate balance.'
        );
    END IF;

    -- 5. Handling 'approved' or 'paid'
    IF v_wth.status = 'rejected' THEN
        RAISE EXCEPTION 'Cannot approve or pay a rejected withdrawal request.';
    END IF;

    -- Lock the affiliate record to serialize all concurrent operations
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
        RAISE EXCEPTION 'Insufficient balance. Available: ETB %, Requested: ETB %',
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

    -- Log financial audit entry & notifications
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

            -- In-app notification for paid status
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
                INSERT INTO public.notifications (
                    user_id,
                    user_role,
                    type,
                    title,
                    message,
                    reference_type,
                    reference_id,
                    is_read,
                    created_at
                ) VALUES (
                    v_wth.affiliate_id,
                    'affiliate',
                    'withdrawal_paid',
                    'Withdrawal Paid Successfully',
                    'Your withdrawal of ETB ' || trim(to_char(v_wth.amount, 'FM999,999,990.00')) || ' has been processed and paid out.',
                    'withdrawal',
                    p_withdrawal_id,
                    false,
                    now()
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

GRANT EXECUTE ON FUNCTION public.admin_update_withdrawal_status(uuid, text, uuid, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
