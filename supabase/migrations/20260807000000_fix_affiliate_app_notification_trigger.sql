-- ============================================================================
-- Migration: Fix affiliate application notification trigger
-- Purpose: The trigger function fn_notify_on_affiliate_app_event() referenced
--          NEW.full_name on public.affiliate_applications, but that table has
--          no full_name column. Every application INSERT therefore aborted
--          with `record "new" has no field "full_name"`, which made the
--          affiliate application page unable to submit to Supabase.
-- Fix: Look up the applicant's full name from public.profiles instead.
--      Does not touch the approval workflow, admin approval, commissions,
--      or the affiliate dashboard.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_notify_on_affiliate_app_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_applicant text;
BEGIN
    -- Event: New Application Submitted -> Notify Admin
    IF (TG_OP = 'INSERT') THEN
        SELECT full_name INTO v_applicant FROM public.profiles WHERE id = NEW.user_id;
        PERFORM public.create_system_notification(
            NULL,
            'admin',
            'affiliate_application',
            'New Affiliate Application',
            'Applicant ' || COALESCE(v_applicant, 'Partner') || ' applied to become an affiliate.',
            'application',
            NEW.user_id
        );
        RETURN NEW;
    END IF;

    -- Event: Application Approved -> Notify Affiliate
    IF (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status <> 'approved') THEN
        IF NEW.user_id IS NOT NULL THEN
            PERFORM public.create_system_notification(
                NEW.user_id,
                'affiliate',
                'affiliate_approved',
                'Application Approved',
                'Congratulations! Your Amiele affiliate partner application has been approved.',
                'application',
                NEW.user_id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
