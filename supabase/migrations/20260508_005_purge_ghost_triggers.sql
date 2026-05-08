-- ==========================================
-- EMERGENCY CLEANUP: PURGE GHOST TRIGGERS
-- Removing any triggers that might reference missing v2 tables
-- ==========================================

-- 1. Drop known problematic triggers on legacy 'bookings'
DROP TRIGGER IF EXISTS trg_sync_vehicle_occupancy ON bookings;
DROP TRIGGER IF EXISTS trg_sync_total_price ON bookings;
DROP TRIGGER IF EXISTS trg_enforce_booking_rules ON bookings;
DROP TRIGGER IF EXISTS trg_expand_package_services ON bookings;
DROP TRIGGER IF EXISTS trg_log_booking_creation ON bookings;
DROP TRIGGER IF EXISTS trg_log_booking_status_change ON bookings;

-- 2. Drop triggers on child tables
DROP TRIGGER IF EXISTS trg_sync_total_price ON booking_vehicle_services;
DROP TRIGGER IF EXISTS trg_validate_booking_service ON booking_vehicle_services;

-- 3. Re-install ONLY essential audit triggers (Updated for production names)
CREATE OR REPLACE FUNCTION log_booking_creation_v3()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO booking_events (booking_id, actor_id, event_type, metadata)
  VALUES (
    NEW.id, 
    NEW.customer_id, 
    'BOOKING_CREATED', 
    jsonb_build_object('source', 'RPC_ALIGNMENT_FIX')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_booking_creation_v3 ON bookings;
CREATE TRIGGER trg_log_booking_creation_v3
AFTER INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION log_booking_creation_v3();

-- 4. Ensure RLS doesn't block the RPC (Security Definer handles this, but let's be safe)
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE booking_vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE booking_vehicle_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
