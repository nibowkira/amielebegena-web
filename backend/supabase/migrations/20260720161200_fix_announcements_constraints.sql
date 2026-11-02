-- Migration: Fix check constraints on affiliate_announcements
-- The admin form uses type values (product, discount, campaign, update) 
-- and urgency values (normal, high) that don't match the original constraints.

ALTER TABLE public.affiliate_announcements DROP CONSTRAINT IF EXISTS check_ann_type;
ALTER TABLE public.affiliate_announcements ADD CONSTRAINT check_ann_type 
    CHECK (type IN ('general', 'policy', 'bonus', 'milestone', 'product', 'discount', 'campaign', 'update'));

ALTER TABLE public.affiliate_announcements DROP CONSTRAINT IF EXISTS check_ann_urgency;
ALTER TABLE public.affiliate_announcements ADD CONSTRAINT check_ann_urgency 
    CHECK (urgency IN ('normal', 'important', 'critical', 'high'));
