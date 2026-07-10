-- Migration 007: Row Level Security (RLS) Policies
-- Purpose: Secures all tables by default, restricting access based on user session roles.

-- 1. Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.affiliate_applications enable row level security;
alter table public.affiliates enable row level security;

-- 2. Define Stable Role-Checking Helper
-- Using a SECURITY DEFINER function with a search_path bypasses RLS rules,
-- preventing infinite recursion loops when querying role tables.
create or replace function public.get_user_role()
returns text security definer set search_path = public stable as $$
begin
    return (select role::text from public.profiles where id = auth.uid());
end;
$$ language plpgsql;

-- 3. Profiles Policies
create policy "Allow users to read their own profile" on public.profiles 
    for select using (auth.uid() = id or public.get_user_role() = 'admin');

-- Non-admins can update their details, column edits (role/is_active) will be protected by database trigger.
create policy "Allow users to edit their own profile details" on public.profiles 
    for update using (auth.uid() = id or public.get_user_role() = 'admin');

create policy "Allow admins full control on profiles" on public.profiles 
    for all using (public.get_user_role() = 'admin');


-- 4. Products Policies
create policy "Allow anyone to browse products" on public.products 
    for select using (true);

create policy "Allow admins full control on products" on public.products 
    for all using (public.get_user_role() = 'admin');


-- 5. Product Images Policies
create policy "Allow anyone to view product images" on public.product_images 
    for select using (true);

create policy "Allow admins full control on product images" on public.product_images 
    for all using (public.get_user_role() = 'admin');


-- 6. Orders Policies
create policy "Allow authenticated users to create orders" on public.orders 
    for insert with check (auth.role() = 'authenticated');

create policy "Allow customers to view their own orders" on public.orders 
    for select using (auth.uid() = customer_id or public.get_user_role() = 'admin');

create policy "Allow admins full control on orders" on public.orders 
    for all using (public.get_user_role() = 'admin');


-- 7. Affiliate Applications Policies
create policy "Allow users to submit and view their own application" on public.affiliate_applications 
    for all using (auth.uid() = user_id or public.get_user_role() = 'admin');


-- 8. Affiliates Policies
-- SELECT must be open so checkout attributes can check and verify active referral codes.
create policy "Allow select check for active referral codes" on public.affiliates 
    for select using (true);

create policy "Allow admins full control on affiliates" on public.affiliates 
    for all using (public.get_user_role() = 'admin');
