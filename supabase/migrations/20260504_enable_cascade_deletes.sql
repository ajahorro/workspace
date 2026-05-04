-- ==========================================
-- CASCADE DELETES: Enabling User Management
-- ==========================================

-- 1. LEGACY TABLES
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_customer_id_fkey, ADD CONSTRAINT bookings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_staff_id_fkey, ADD CONSTRAINT bookings_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE booking_events DROP CONSTRAINT IF EXISTS booking_events_actor_id_fkey, ADD CONSTRAINT booking_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 2. V2 TABLES
ALTER TABLE bookings_v2 DROP CONSTRAINT IF EXISTS bookings_v2_customer_id_fkey, ADD CONSTRAINT bookings_v2_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE booking_audit_log DROP CONSTRAINT IF EXISTS booking_audit_log_actor_id_fkey, ADD CONSTRAINT booking_audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. AUTH -> PUBLIC
-- Ensure profiles are deleted when auth.users is deleted
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey, ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
