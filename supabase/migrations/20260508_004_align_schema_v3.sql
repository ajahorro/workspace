-- ==========================================
-- FIX: SCHEMA ALIGNMENT FOR RPC
-- Aligning create_booking_v3 with production table names (no _v2 suffixes)
-- ==========================================

-- Ensure tables from ERD exist (Safety fallback)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_status TEXT DEFAULT 'NOT_STARTED';

CREATE TABLE IF NOT EXISTS booking_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  make TEXT,
  model TEXT,
  plate_number TEXT,
  status TEXT DEFAULT 'queued',
  subtotal NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_vehicle_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES booking_vehicles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  service_name_snapshot TEXT NOT NULL,
  price_snapshot NUMERIC(10,2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update RPC to use production names
DROP FUNCTION IF EXISTS create_booking_v3(UUID, TIMESTAMPTZ, JSONB, TEXT, TEXT) CASCADE;
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
  v_max_vehicle_duration INT;
  v_vehicle_duration INT;
  v_end_datetime TIMESTAMPTZ;
  v_resource_id UUID;
BEGIN
  -- 1. Calculate max duration
  v_max_vehicle_duration := 0;
  FOR v_vehicle IN SELECT * FROM jsonb_array_elements(p_vehicles)
  LOOP
    v_vehicle_duration := 0;
    -- Sanitize and loop services
    FOR v_service_id IN SELECT regexp_replace(value::text, '[^a-f0-9-]', '', 'g')::uuid FROM jsonb_array_elements(v_vehicle->'services')
    LOOP
      SELECT 
        COALESCE(
          (to_jsonb(s)->>'duration_minutes')::int,
          (to_jsonb(s)->>'base_duration_hours')::numeric * 60,
          60
        ) as duration_mins
      INTO v_service_rec
      FROM services s
      WHERE s.id = v_service_id;

      IF FOUND THEN
        v_vehicle_duration := v_vehicle_duration + v_service_rec.duration_mins;
      END IF;
    END LOOP;
    
    IF v_vehicle_duration > v_max_vehicle_duration THEN
      v_max_vehicle_duration := v_vehicle_duration;
    END IF;
  END LOOP;
  
  -- Default duration if none found
  IF v_max_vehicle_duration = 0 THEN v_max_vehicle_duration := 60; END IF;

  v_end_datetime := p_start_datetime + (v_max_vehicle_duration || ' minutes')::interval + INTERVAL '30 minutes';

  -- 2. Resource Allocation (Find an available bay)
  SELECT id INTO v_resource_id
  FROM resources r
  WHERE NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.resource_id = r.id
    AND b.status = 'scheduled'
    AND tstzrange(b.start_datetime, b.start_datetime + INTERVAL '2 hours') && tstzrange(p_start_datetime, v_end_datetime)
  )
  ORDER BY id
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- Fallback to first resource if none found (or create one)
  IF v_resource_id IS NULL THEN
    SELECT id INTO v_resource_id FROM resources LIMIT 1;
  END IF;
  
  -- If still null, we need a resource
  IF v_resource_id IS NULL THEN
    INSERT INTO resources (name) VALUES ('Bay 1') RETURNING id INTO v_resource_id;
  END IF;

  -- 3. Parent Booking (Using 'bookings' table from ERD)
  INSERT INTO bookings (
    customer_id, start_datetime, end_datetime, status, total_amount, 
    payment_status, service_status, resource_id
  ) VALUES (
    p_customer_id, p_start_datetime, v_end_datetime, 
    'scheduled'::booking_status_v2, 0, 
    'unpaid'::booking_payment_status, 'queued'::service_status_enum, 
    v_resource_id
  ) RETURNING id INTO v_booking_id;

  -- 3. Iterate through vehicles
  FOR v_vehicle IN SELECT * FROM jsonb_array_elements(p_vehicles)
  LOOP
    INSERT INTO booking_vehicles (
      booking_id, vehicle_type, make, model, plate_number, status
    ) VALUES (
      v_booking_id, 
      (v_vehicle->>'type')::vehicle_type, 
      v_vehicle->>'make', 
      v_vehicle->>'model', 
      v_vehicle->>'plate',
      'queued'
    ) RETURNING id INTO v_vehicle_id;

    -- Iterate through services
    FOR v_service_id IN SELECT regexp_replace(value::text, '[^a-f0-9-]', '', 'g')::uuid FROM jsonb_array_elements(v_vehicle->'services')
    LOOP
      SELECT name, price 
      INTO v_service_rec
      FROM services
      WHERE id = v_service_id;

      IF FOUND THEN
        INSERT INTO booking_vehicle_services (
          vehicle_id, service_id, service_name_snapshot, price_snapshot
        ) VALUES (
          v_vehicle_id, v_service_id, v_service_rec.name, v_service_rec.price
        );
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
