-- Database Schema Updates for Multi-Vehicle
-- Save this file as supabase/migrations/20260507_003_multi_vehicle_schema.sql

-- 1. Create Enums for new statuses
DO $$ BEGIN
    CREATE TYPE vehicle_progress_status AS ENUM ('queued', 'in_progress', 'completed', 'paused');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_payment_status AS ENUM ('unpaid', 'pending', 'partially_paid', 'paid', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Alter bookings_v2 to support multi-vehicle logic
ALTER TABLE bookings_v2 ALTER COLUMN vehicle_type DROP NOT NULL;

ALTER TABLE bookings_v2 
ADD COLUMN IF NOT EXISTS payment_status booking_payment_status DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS estimated_duration_total INT DEFAULT 0;

-- 3. Create Child Table: booking_vehicles_v2
CREATE TABLE IF NOT EXISTS booking_vehicles_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings_v2(id) ON DELETE CASCADE,
  vehicle_type vehicle_type NOT NULL,
  make TEXT,
  model TEXT,
  plate_number TEXT,
  status vehicle_progress_status DEFAULT 'queued',
  subtotal NUMERIC(10,2) DEFAULT 0,
  is_cancelled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Grandchild Table: booking_vehicle_services_v2
CREATE TABLE IF NOT EXISTS booking_vehicle_services_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES booking_vehicles_v2(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services_v2(id),
  service_name_snapshot TEXT NOT NULL,
  price_snapshot NUMERIC(10,2) NOT NULL,
  duration_snapshot INT NOT NULL,
  step_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Atomic RPC: create_booking_v3
CREATE OR REPLACE FUNCTION create_booking_v3(
  p_customer_id UUID,
  p_start_datetime TIMESTAMPTZ,
  p_vehicles JSONB, -- Array of { type, make, model, plate, services: [service_id1, service_id2] }
  p_customer_phone TEXT DEFAULT NULL,
  p_customer_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
  v_vehicle JSONB;
  v_vehicle_id UUID;
  v_service_id UUID;
  v_service_rec RECORD;
  v_concurrent_vehicles INT;
  v_new_vehicles_count INT;
  v_total_duration_mins INT := 0;
  v_end_datetime TIMESTAMPTZ;
  v_resource_id UUID;
  v_max_vehicle_duration INT;
  v_vehicle_duration INT;
BEGIN
  v_new_vehicles_count := jsonb_array_length(p_vehicles);
  
  IF v_new_vehicles_count = 0 THEN
    RAISE EXCEPTION 'Booking must contain at least one vehicle.';
  END IF;

  -- 1. Calculate the max duration among all vehicles to find the booking end time
  v_max_vehicle_duration := 0;
  FOR v_vehicle IN SELECT * FROM jsonb_array_elements(p_vehicles)
  LOOP
    v_vehicle_duration := 0;
    FOR v_service_id IN SELECT value::text::uuid FROM jsonb_array_elements(v_vehicle->'services')
    LOOP
      SELECT COALESCE(sp.duration_override_hours * 60, s.base_duration_hours * 60) + 
             COALESCE(sp.duration_override_days * 1440, s.base_duration_days * 1440) as duration_mins
      INTO v_service_rec
      FROM services_v2 s
      JOIN service_pricing sp ON sp.service_id = s.id AND sp.vehicle_type = (v_vehicle->>'type')::vehicle_type
      WHERE s.id = v_service_id;

      IF FOUND THEN
        v_vehicle_duration := v_vehicle_duration + v_service_rec.duration_mins;
      END IF;
    END LOOP;
    
    IF v_vehicle_duration > v_max_vehicle_duration THEN
      v_max_vehicle_duration := v_vehicle_duration;
    END IF;
  END LOOP;
  
  IF v_max_vehicle_duration = 0 THEN
    RAISE EXCEPTION 'No valid services selected across all vehicles.';
  END IF;

  v_end_datetime := p_start_datetime + (v_max_vehicle_duration || ' minutes')::interval + INTERVAL '30 minutes';

  -- 2. Precise Slot Protection (Max 7 Vehicles)
  SELECT COUNT(bv.id) INTO v_concurrent_vehicles
  FROM bookings_v2 b
  JOIN booking_vehicles_v2 bv ON bv.booking_id = b.id
  WHERE b.status = 'scheduled'
    AND bv.is_cancelled = false
    AND (b.start_datetime, b.end_datetime) OVERLAPS (p_start_datetime, v_end_datetime);
    
  IF v_concurrent_vehicles + v_new_vehicles_count > 7 THEN
    RAISE EXCEPTION 'Branch capacity exceeded. Only % slots available.', 7 - COALESCE(v_concurrent_vehicles, 0);
  END IF;

  -- 3. Race-safe resource allocation (Find a bay)
  SELECT id INTO v_resource_id
  FROM resources r
  WHERE NOT EXISTS (
    SELECT 1 FROM bookings_v2 b
    WHERE b.resource_id = r.id
    AND b.status = 'scheduled'
    AND tstzrange(b.start_datetime, b.end_datetime) && tstzrange(p_start_datetime, v_end_datetime)
  )
  ORDER BY id
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_resource_id IS NULL THEN
    RAISE EXCEPTION 'No bays available for the selected time slot.';
  END IF;

  -- Lock slots in resource_time_slots if used
  UPDATE resource_time_slots
  SET is_available = FALSE
  WHERE resource_id = v_resource_id
  AND is_available = TRUE
  AND tstzrange(slot_start, slot_end) && tstzrange(p_start_datetime, v_end_datetime);

  -- 4. Parent Booking
  INSERT INTO bookings_v2 (
    customer_id, resource_id, start_datetime, end_datetime, status, payment_status,
    customer_phone, customer_notes, payment_method
  ) VALUES (
    p_customer_id, v_resource_id, p_start_datetime, v_end_datetime, 'scheduled', 'unpaid',
    p_customer_phone, p_customer_notes, 'GCASH'
  ) RETURNING id INTO v_booking_id;

  -- 5. Iterate through vehicles
  FOR v_vehicle IN SELECT * FROM jsonb_array_elements(p_vehicles)
  LOOP
    -- Insert Child Vehicle
    INSERT INTO booking_vehicles_v2 (
      booking_id, vehicle_type, make, model, plate_number, status
    ) VALUES (
      v_booking_id, 
      (v_vehicle->>'type')::vehicle_type, 
      v_vehicle->>'make', 
      v_vehicle->>'model', 
      v_vehicle->>'plate',
      'queued'
    ) RETURNING id INTO v_vehicle_id;

    -- Iterate through services for this vehicle
    FOR v_service_id IN SELECT value::text::uuid FROM jsonb_array_elements(v_vehicle->'services')
    LOOP
      SELECT s.name, sp.price, 
             COALESCE(sp.duration_override_hours * 60, s.base_duration_hours * 60) + 
             COALESCE(sp.duration_override_days * 1440, s.base_duration_days * 1440) as duration_mins
      INTO v_service_rec
      FROM services_v2 s
      JOIN service_pricing sp ON sp.service_id = s.id AND sp.vehicle_type = (v_vehicle->>'type')::vehicle_type
      WHERE s.id = v_service_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Service % not found or not priced for vehicle type %', v_service_id, (v_vehicle->>'type');
      END IF;

      -- Insert Grandchild Service
      INSERT INTO booking_vehicle_services_v2 (
        vehicle_id, service_id, service_name_snapshot, price_snapshot, duration_snapshot
      ) VALUES (
        v_vehicle_id, v_service_id, v_service_rec.name, v_service_rec.price, v_service_rec.duration_mins
      );
    END LOOP;
  END LOOP;
  
  -- 6. Initial Payment
  INSERT INTO payments_v2 (booking_id, amount, method, status)
  VALUES (v_booking_id, 0, 'GCASH', 'UNPAID');

  -- 7. Audit
  INSERT INTO booking_events (booking_id, actor_id, event_type, metadata)
  VALUES (v_booking_id, auth.uid(), 'BOOKING_CREATED', jsonb_build_object('source', 'RPC_V3_MULTI_VEHICLE'));

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
