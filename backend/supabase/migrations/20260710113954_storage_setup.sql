-- Migration 008: Configure storage buckets and granular object security
-- Purpose: Prepares media storage configurations and secure access pathways.

-- 1. Create Storage Buckets
insert into storage.buckets (id, name, public) 
values 
    ('product-images', 'product-images', true),    -- Public catalog images
    ('user-avatars', 'user-avatars', false),        -- Private avatars (requires tokens)
    ('workshop-media', 'workshop-media', true)      -- Public informational media
on conflict (id) do nothing;

-- 2. PRODUCT IMAGES BUCKET POLICIES (Public read, admin write)
create policy "Allow public read of product-images" on storage.objects
    for select using (bucket_id = 'product-images');

create policy "Allow admin insert of product-images" on storage.objects
    for insert with check (bucket_id = 'product-images' and public.get_user_role() = 'admin');

create policy "Allow admin update of product-images" on storage.objects
    for update using (bucket_id = 'product-images' and public.get_user_role() = 'admin');

create policy "Allow admin delete of product-images" on storage.objects
    for delete using (bucket_id = 'product-images' and public.get_user_role() = 'admin');


-- 3. WORKSHOP MEDIA BUCKET POLICIES (Public read, admin write)
create policy "Allow public read of workshop-media" on storage.objects
    for select using (bucket_id = 'workshop-media');

create policy "Allow admin insert of workshop-media" on storage.objects
    for insert with check (bucket_id = 'workshop-media' and public.get_user_role() = 'admin');

create policy "Allow admin update of workshop-media" on storage.objects
    for update using (bucket_id = 'workshop-media' and public.get_user_role() = 'admin');

create policy "Allow admin delete of workshop-media" on storage.objects
    for delete using (bucket_id = 'workshop-media' and public.get_user_role() = 'admin');


-- 4. USER AVATARS BUCKET POLICIES (Private, owner read/write, admin manage)
-- Folders inside user-avatars are named after user UUIDs (e.g. user-avatars/{uuid}/avatar.png).
create policy "Allow users to select own avatar" on storage.objects
    for select using (
        bucket_id = 'user-avatars'
        and (
            (storage.foldername(name))[1] = auth.uid()::text
            or public.get_user_role() = 'admin'
        )
    );

create policy "Allow users to insert own avatar" on storage.objects
    for insert with check (
        bucket_id = 'user-avatars'
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "Allow users to update own avatar" on storage.objects
    for update using (
        bucket_id = 'user-avatars'
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "Allow users to delete own avatar" on storage.objects
    for delete using (
        bucket_id = 'user-avatars'
        and (
            (storage.foldername(name))[1] = auth.uid()::text
            or public.get_user_role() = 'admin'
        )
    );
