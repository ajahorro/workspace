-- ==========================================
-- REAL-TIME SLOT ENGINE: Precomputed Availability
-- ==========================================

-- 1. TABLE: resource_time_slots
CREATE TABLE IF NOT EXISTS resource_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  booking_id UUID NULL REFERENCES bookings_v2(id) ON DELETE SET NULL,
  UNIQUE(resource_id, slot_start)
);

-- 2. FUNCTION: refresh_resource_slots
-- This function pre-populates slots for the next 30 days
CREATE OR REPLACE FUNCTION refresh_resource_slots()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_res_id UUID;
  v_date DATE;
  v_start TIMESTAMPTZ;
  v_slot_hours INT[] := ARRAY[9, 11, 13, 15, 17]; -- Standard slots
BEGIN
  FOR v_res_id IN SELECT id FROM resources LOOP
    FOR i IN 0..30 LOOP
      v_date := CURRENT_DATE + i;
      FOR j IN 1..array_length(v_slot_hours, 1) LOOP
        v_start := (v_date + (v_slot_hours[j] || ' hours')::interval)::timestamptz;
        
        INSERT INTO resource_time_slots (resource_id, slot_start, slot_end)
        VALUES (v_res_id, v_start, v_start + INTERVAL '2 hours')
        ON CONFLICT (resource_id, slot_start) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;

-- 3. TRIGGER: sync_slots_on_booking
-- Automatically marks slots as unavailable when a booking is created
CREATE OR REPLACE FUNCTION sync_slots_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'scheduled' AND OLD.status != 'scheduled')) THEN
    UPDATE resource_time_slots
    SET is_available = FALSE, booking_id = NEW.id
    WHERE resource_id = NEW.resource_id
    AND tstzrange(slot_start, slot_end) && tstzrange(NEW.start_datetime, NEW.end_datetime);
  ELSIF (TG_OP = 'UPDATE' AND NEW.status IN ('cancelled', 'completed')) THEN
    UPDATE resource_time_slots
    SET is_available = TRUE, booking_id = NULL
    WHERE booking_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_slots
AFTER INSERT OR UPDATE ON bookings_v2
FOR EACH ROW EXECUTE FUNCTION sync_slots_on_booking();

-- Run initial refresh
SELECT refresh_resource_slots();
