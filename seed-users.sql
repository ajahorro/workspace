-- Ensure pgcrypto is enabled for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    uid_staff1 UUID := gen_random_uuid();
    uid_staff2 UUID := gen_random_uuid();
    uid_cust1  UUID := gen_random_uuid();
    uid_cust2  UUID := gen_random_uuid();
    uid_admin  UUID := gen_random_uuid();
BEGIN
    -- 1. Insert into Supabase Auth (auth.users)
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES 
    ('00000000-0000-0000-0000-000000000000', uid_staff1, 'authenticated', 'authenticated', 'staff1@renew.com', crypt('staff123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', uid_staff2, 'authenticated', 'authenticated', 'staff2@renew.com', crypt('staff123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', uid_cust1, 'authenticated', 'authenticated', 'customer1@renew.com', crypt('customer123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', uid_cust2, 'authenticated', 'authenticated', 'customer2@renew.com', crypt('customer123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', uid_admin, 'authenticated', 'authenticated', 'admin@renew.com', crypt('admin123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

    -- 2. Insert into Public Profiles (public.profiles) with explicit roles
    INSERT INTO public.profiles (id, full_name, email, role, created_at) VALUES 
    (uid_staff1, 'Staff One', 'staff1@renew.com', 'STAFF', now()),
    (uid_staff2, 'Staff Two', 'staff2@renew.com', 'STAFF', now()),
    (uid_cust1, 'Customer One', 'customer1@renew.com', 'CUSTOMER', now()),
    (uid_cust2, 'Customer Two', 'customer2@renew.com', 'CUSTOMER', now()),
    (uid_admin, 'Super Admin', 'admin@renew.com', 'ADMIN', now());
END $$;
