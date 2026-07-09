-- ============================================================
-- Amiele Begena — Supabase PostgreSQL Schema Definition
-- ============================================================
-- Run this script inside the Supabase SQL Editor to initialize
-- your database tables, triggers, and Row Level Security.
-- ============================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE PROFILES TABLE (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'affiliate', 'admin')) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    bio TEXT,
    phone TEXT,
    country TEXT,
    photo_url TEXT,
    notif_preferences JSONB DEFAULT '{"email": true, "push": false}'::JSONB NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. CREATE AFFILIATE APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    country TEXT NOT NULL,
    socials JSONB DEFAULT '{}'::JSONB NOT NULL,
    why_apply TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on applications
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- 4. CREATE AFFILIATES METADATA TABLE
CREATE TABLE IF NOT EXISTS public.affiliates (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    coupon_code TEXT UNIQUE NOT NULL,
    balance NUMERIC DEFAULT 0 NOT NULL,
    total_earnings NUMERIC DEFAULT 0 NOT NULL,
    pending_commission NUMERIC DEFAULT 0 NOT NULL,
    total_paid NUMERIC DEFAULT 0 NOT NULL,
    clicks INT DEFAULT 0 NOT NULL,
    sales INT DEFAULT 0 NOT NULL,
    tier TEXT DEFAULT 'standard' CHECK (tier IN ('standard', 'silver', 'gold')) NOT NULL
);

-- Enable RLS on affiliates
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- 5. CREATE CLICK LOGS TABLE
CREATE TABLE IF NOT EXISTS public.clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    ip TEXT
);

-- Enable RLS on clicks
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;

-- 6. CREATE COMMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    order_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    order_amount NUMERIC NOT NULL,
    commission_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    approved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on commissions
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- 7. CREATE WITHDRAWALS TABLE
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC NOT NULL,
    method TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on withdrawals
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- 8. CREATE CAMPAIGNS TABLE (challenges)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target_sales INT NOT NULL,
    current_sales INT DEFAULT 0 NOT NULL,
    reward NUMERIC NOT NULL,
    days_remaining INT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- 9. CREATE ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT CHECK (type IN ('product', 'discount', 'campaign', 'update')) NOT NULL,
    urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('normal', 'high')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 10. CREATE NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    type TEXT NOT NULL,
    unread BOOLEAN DEFAULT TRUE NOT NULL,
    time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 11. AUTOMATIC PROFILE CREATION TRIGGER
-- ============================================================
-- When a user registers through Supabase Auth, they are automatically
-- provisioned a row in the public.profiles table.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, role, joined_at)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.email,
        'user',
        COALESCE(new.created_at, NOW())
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Profiles policies
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Applications policies
CREATE POLICY "Users can submit own application" ON public.applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own application" ON public.applications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all applications" ON public.applications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Affiliates policies
CREATE POLICY "Affiliates can view own record" ON public.affiliates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Guests and system can lookup codes" ON public.affiliates
    FOR SELECT USING (true); -- Read-only access for referrals clicks/sales tracking

CREATE POLICY "Admins can manage all affiliates" ON public.affiliates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Clicks policies
CREATE POLICY "Guests can insert click logs" ON public.clicks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Affiliates can view own click logs" ON public.clicks
    FOR SELECT USING (auth.uid() = affiliate_id);

CREATE POLICY "Admins can view all clicks" ON public.clicks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Commissions policies
CREATE POLICY "Affiliates can view own commissions" ON public.commissions
    FOR SELECT USING (auth.uid() = affiliate_id);

CREATE POLICY "Admins can manage all commissions" ON public.commissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Withdrawals policies
CREATE POLICY "Affiliates can view own withdrawals" ON public.withdrawals
    FOR SELECT USING (auth.uid() = affiliate_id);

CREATE POLICY "Affiliates can request withdrawal" ON public.withdrawals
    FOR INSERT WITH CHECK (auth.uid() = affiliate_id);

CREATE POLICY "Admins can manage all withdrawals" ON public.withdrawals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Campaigns policies
CREATE POLICY "Anyone authenticated can view campaigns" ON public.campaigns
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage campaigns" ON public.campaigns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Announcements policies
CREATE POLICY "Anyone authenticated can view announcements" ON public.announcements
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage announcements" ON public.announcements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Notifications policies
CREATE POLICY "Users can manage own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================
-- 13. SEED INITIAL STATIC DATA
-- ============================================================
-- The campaigns and announcements seeded by default.

INSERT INTO public.campaigns (title, description, target_sales, current_sales, reward, days_remaining, status)
VALUES 
('Heritage Campaign: Sell 5 Kirars', 'Promote our authentic horse-hair Kirars. Refer 5 sales to earn an additional bonus.', 5, 3, 1500, 12, 'active'),
('Begena Mastery Challenge', 'Sell 3 Master Begena Harps of David in a single month.', 3, 1, 3000, 22, 'active')
ON CONFLICT DO NOTHING;

INSERT INTO public.announcements (title, content, type, urgency)
VALUES 
('New Product Drop: Traditional Kebero Drums', 'We have added authentic Ceremonial Kebero drums to our online registry. Direct your audience to the percussion tab! High demand expected.', 'product', 'normal'),
('+1500 ETB Bonus Campaign Launched!', 'Refer 5 Kirar sales by July 20th and receive a flat bonus reward of 1,500 ETB directly into your balance.', 'campaign', 'high'),
('Shipping Network Extended Globally', 'Good news for international buyers: our shipping network now fully supports transit to Europe and North America with complete customs handling.', 'update', 'normal')
ON CONFLICT DO NOTHING;
