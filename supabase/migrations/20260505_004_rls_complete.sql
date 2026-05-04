-- ==========================================
-- COMPLETE RLS: All v2 Tables
-- Uses get_my_role() for safe, non-recursive lookups
-- No direct customer UPDATE (all via RPC)
-- Scoped staff profile access
-- ==========================================

-- ========== BOOKINGS_V2 ==========
ALTER TABLE bookings_v2 ENABLE ROW LEVEL SECURITY;

-- DROP existing policies to avoid conflicts
DROP POLICY IF EXISTS "Customers read own bookings" ON bookings_v2;
DROP POLICY IF EXISTS "Staff read assigned bookings" ON bookings_v2;
DROP POLICY IF EXISTS "Admin read all bookings" ON bookings_v2;
DROP POLICY IF EXISTS "Customers create bookings" ON bookings_v2;
DROP POLICY IF EXISTS "Staff update assigned bookings" ON bookings_v2;
DROP POLICY IF EXISTS "Admin update all bookings" ON bookings_v2;
DROP POLICY IF EXISTS "Admin delete bookings" ON bookings_v2;

-- SELECT: role-based
CREATE POLICY "Customers read own bookings" ON bookings_v2
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Staff read assigned bookings" ON bookings_v2
  FOR SELECT USING (auth.uid() = staff_id);

CREATE POLICY "Admin read all bookings" ON bookings_v2
  FOR SELECT USING (get_my_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- INSERT: customers only for own bookings
CREATE POLICY "Customers create bookings" ON bookings_v2
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- UPDATE: NO direct customer UPDATE (privilege escalation prevention)
-- Staff update assigned bookings (service_status, staff_notes — enforced in app)
CREATE POLICY "Staff update assigned bookings" ON bookings_v2
  FOR UPDATE USING (auth.uid() = staff_id);

-- Admin full update
CREATE POLICY "Admin update all bookings" ON bookings_v2
  FOR UPDATE USING (get_my_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- DELETE: admin only
CREATE POLICY "Admin delete bookings" ON bookings_v2
  FOR DELETE USING (get_my_role() IN ('ADMIN', 'SUPER_ADMIN'));


-- ========== BOOKING_SERVICES_V2 ==========
ALTER TABLE booking_services_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see their booking services" ON booking_services_v2;
DROP POLICY IF EXISTS "Customers insert own booking services" ON booking_services_v2;
DROP POLICY IF EXISTS "System insert booking services" ON booking_services_v2;

-- SELECT: only see services for your bookings
CREATE POLICY "Users see their booking services" ON booking_services_v2
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings_v2 b
      WHERE b.id = booking_services_v2.booking_id
      AND (
        b.customer_id = auth.uid()
        OR b.staff_id = auth.uid()
        OR get_my_role() IN ('ADMIN', 'SUPER_ADMIN')
      )
    )
  );

-- INSERT: only for own bookings (prevents data corruption)
CREATE POLICY "Customers insert own booking services" ON booking_services_v2
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings_v2 b
      WHERE b.id = booking_id
      AND b.customer_id = auth.uid()
    )
  );


-- ========== PAYMENTS_V2 ==========
ALTER TABLE payments_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customer see own payments" ON payments_v2;
DROP POLICY IF EXISTS "Admin full access payments" ON payments_v2;

CREATE POLICY "Customer see own payments" ON payments_v2
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings_v2 b
      WHERE b.id = payments_v2.booking_id
      AND b.customer_id = auth.uid()
    )
  );

CREATE POLICY "Admin full access payments" ON payments_v2
  FOR ALL USING (get_my_role() IN ('ADMIN', 'SUPER_ADMIN'))
  WITH CHECK (get_my_role() IN ('ADMIN', 'SUPER_ADMIN'));


-- ========== REFUNDS_V2 ==========
ALTER TABLE refunds_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customer see own refunds" ON refunds_v2;
DROP POLICY IF EXISTS "Admin full access refunds" ON refunds_v2;

CREATE POLICY "Customer see own refunds" ON refunds_v2
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings_v2 b
      WHERE b.id = refunds_v2.booking_id
      AND b.customer_id = auth.uid()
    )
  );

CREATE POLICY "Admin full access refunds" ON refunds_v2
  FOR ALL USING (get_my_role() IN ('ADMIN', 'SUPER_ADMIN'))
  WITH CHECK (get_my_role() IN ('ADMIN', 'SUPER_ADMIN'));


-- ========== RESOURCE_TIME_SLOTS ==========
ALTER TABLE resource_time_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read slots" ON resource_time_slots;
DROP POLICY IF EXISTS "Admin manage slots" ON resource_time_slots;

CREATE POLICY "Public read slots" ON resource_time_slots
  FOR SELECT USING (true);

CREATE POLICY "Admin manage slots" ON resource_time_slots
  FOR ALL USING (get_my_role() IN ('ADMIN', 'SUPER_ADMIN'))
  WITH CHECK (get_my_role() IN ('ADMIN', 'SUPER_ADMIN'));


-- ========== BOOKING_EVENTS ==========
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own booking events" ON booking_events;
DROP POLICY IF EXISTS "System insert events" ON booking_events;

CREATE POLICY "Users see own booking events" ON booking_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings_v2 b
      WHERE b.id = booking_events.booking_id
      AND (
        b.customer_id = auth.uid()
        OR b.staff_id = auth.uid()
        OR get_my_role() IN ('ADMIN', 'SUPER_ADMIN')
      )
    )
  );

-- Insert via RPC/triggers — auth handled there
CREATE POLICY "System insert events" ON booking_events
  FOR INSERT WITH CHECK (true);


-- ========== PROFILES: Scoped Access ==========
-- Admin reads all profiles (required for joins)
DROP POLICY IF EXISTS "Admin read all profiles" ON profiles;
CREATE POLICY "Admin read all profiles" ON profiles
  FOR SELECT USING (get_my_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- Staff only reads profiles related to their assigned bookings
DROP POLICY IF EXISTS "Staff read relevant profiles" ON profiles;
DROP POLICY IF EXISTS "Staff read assigned customer profiles" ON profiles;
CREATE POLICY "Staff read assigned customer profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings_v2 b
      WHERE (b.customer_id = profiles.id OR b.staff_id = profiles.id)
      AND b.staff_id = auth.uid()
    )
  );
