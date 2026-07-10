-- Migration 009: Triggers and Functions Setup
-- Purpose: Enforces system automation, session tracking, and privilege escalation guards at the database level.

-- 1. Automate updated_at column updates
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at before update on public.profiles for each row execute procedure public.update_updated_at_column();
create trigger set_products_updated_at before update on public.products for each row execute procedure public.update_updated_at_column();
create trigger set_orders_updated_at before update on public.orders for each row execute procedure public.update_updated_at_column();
create trigger set_affiliates_updated_at before update on public.affiliates for each row execute procedure public.update_updated_at_column();


-- 2. Synchronize new user profile creation from auth signup
create or replace function public.handle_new_user()
returns trigger security definer set search_path = public as $$
begin
    insert into public.profiles (id, full_name, email, role, is_active)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New User'),
        new.email,
        'user',
        true
    );
    return new;
end;
$$ language plpgsql;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();


-- 3. Update profiles last login tracking on authentication
create or replace function public.handle_user_login()
returns trigger security definer set search_path = public as $$
begin
    update public.profiles
    set last_login_at = now()
    where id = new.id;
    return new;
end;
$$ language plpgsql;

create trigger on_auth_user_login
    after update of last_sign_in_at on auth.users
    for each row execute procedure public.handle_user_login();


-- 4. Role & Status Privilege Escalation Protection
create or replace function public.protect_profile_roles()
returns trigger security definer set search_path = public as $$
begin
    -- Allow administrators full update rights
    if public.get_user_role() = 'admin' then
        return new;
    end if;

    -- For non-admins, raise an exception if role or is_active changes
    if new.role <> old.role then
        raise exception 'Access Denied: Non-administrators cannot modify roles.';
    end if;

    if new.is_active <> old.is_active then
        raise exception 'Access Denied: Non-administrators cannot modify account active state.';
    end if;

    return new;
end;
$$ language plpgsql;

create trigger enforce_profile_security
    before update on public.profiles
    for each row execute procedure public.protect_profile_roles();


-- 5. Transactional Affiliate Approval Automation Handler
create or replace function public.handle_affiliate_approval()
returns trigger security definer set search_path = public as $$
declare
    base_code text;
    ref_code text;
    attempts integer := 0;
begin
    -- Only execute when status transitions from 'pending' to 'approved'
    if new.status = 'approved' and old.status = 'pending' then
        
        -- 1. Generate clean, alphanumeric base code from applicant name
        base_code := lower(regexp_replace(new.name, '[^a-zA-Z0-9]', '', 'g'));
        if length(base_code) < 3 then
            base_code := 'aff';
        end if;
        base_code := substring(base_code from 1 for 10);

        -- 2. Find a unique referral code suffix
        loop
            attempts := attempts + 1;
            if attempts > 100 then
                raise exception 'Transaction Failed: Could not generate a unique referral code after 100 attempts.';
            end if;
            
            ref_code := base_code || '-' || floor(random() * 9000 + 1000)::text;
            
            if not exists (select 1 from public.affiliates where referral_code = ref_code) then
                exit;
            end if;
        end loop;

        -- 3. Create the affiliate record
        insert into public.affiliates (user_id, referral_code, sales_count)
        values (new.user_id, ref_code, 0);

        -- 4. Update the user role to 'affiliate'
        update public.profiles
        set role = 'affiliate'
        where id = new.user_id;

        -- Record audit details
        new.reviewed_at := now();
        new.reviewed_by := auth.uid();
        
    end if;
    
    return new;
end;
$$ language plpgsql;

create trigger on_affiliate_approved
    before update on public.affiliate_applications
    for each row execute procedure public.handle_affiliate_approval();
