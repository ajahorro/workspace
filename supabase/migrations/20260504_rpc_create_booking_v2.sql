-- ==========================================
-- RPC: create_booking_v2
-- Master Transaction for the Production Booking Engine
-- ==========================================

CREATE OR REPLACE FUNCTION create_booking_v2(
  p_customer_id UUID,
  p_vehicle_type vehicle_type,
  p_service_ids UUID[],
  p_package_id UUID DEFAULT NULL,
  p_start_datetime TIMESTAMPTZ DEFAULT NULL,
  p_plate_number TEXT DEFAULT NULL,
  p_vehicle_brand TEXT DEFAULT NULL,
  p_vehicle_model TEXT DEFAULT NULL,
  p_customer_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_booking_id UUID;
  v_resource_id UUID;
  v_total_duration_mins INT := 0;
  v_end_datetime TIMESTAMPTZ;
  v_is_multi_day BOOLEAN := FALSE;
  v_actual_service_ids UUID[] := p_service_ids;
BEGIN
  -- 1. Authorization Check
  IF auth.uid() != p_customer_id AND (SELECT role FROM profiles WHERE id = auth.uid()) NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. If package is provided, expand service IDs
  IF p_package_id IS NOT NULL THEN
    SELECT array_agg(DISTINCT s_id)
    FROM (
      SELECT unnest(v_actual_service_ids) as s_id
      UNION
      SELECT service_id FROM package_services_v2 WHERE package_id = p_package_id
    ) t
    INTO v_actual_service_ids;
  END IF;

  -- 3. Calculate Duration & Check Type
  SELECT 
    COALESCE(SUM(base_duration_hours * 60 + base_duration_days * 1440), 0),
    EXISTS (SELECT 1 FROM services_v2 WHERE id = ANY(v_actual_service_ids) AND booking_type = 'MULTI_DAY')
  INTO v_total_duration_mins, v_is_multi_day
  FROM services_v2
  WHERE id = ANY(v_actual_service_ids);

  IF v_total_duration_mins = 0 THEN
    RAISE EXCEPTION 'No valid services selected';
  END IF;

  -- 4. Multi-day Start Time Enforcement (6:00 PM)
  IF v_is_multi_day AND p_start_datetime::time != TIME '18:00' THEN
    RAISE EXCEPTION 'Multi-day services (like Ceramic Coating) must start at 18:00';
  END IF;

  -- 5. Calculate End Time (+ 30m buffer)
  v_end_datetime := p_start_datetime + (v_total_duration_mins || ' minutes')::interval + INTERVAL '30 minutes';

  -- 6. Automated Resource Allocation (Find available Bay)
  SELECT id INTO v_resource_id
  FROM resources r
  WHERE NOT EXISTS (
    SELECT 1 FROM bookings_v2 b
    WHERE b.resource_id = r.id
    AND b.status = 'scheduled'
    AND tstzrange(b.start_datetime, b.end_datetime) && tstzrange(p_start_datetime, v_end_datetime)
  )
  LIMIT 1;

  IF v_resource_id IS NULL THEN
    RAISE EXCEPTION 'Selected time slot is full. Please choose another time.';
  END IF;

  -- 7. Insert Booking Shell
  INSERT INTO bookings_v2 (
    customer_id, 
    vehicle_type, 
    resource_id, 
    package_id, 
    start_datetime, 
    end_datetime, 
    status
  )
  VALUES (
    p_customer_id, 
    p_vehicle_type, 
    v_resource_id, 
    p_package_id,
    p_start_datetime, 
    v_end_datetime, 
    'scheduled'
  )
  RETURNING id INTO v_booking_id;

  -- 8. Insert Services (with locked pricing for the vehicle type)
  INSERT INTO booking_services_v2 (booking_id, service_id, price_at_booking, step_order)
  SELECT 
    v_booking_id, 
    s.id, 
    sp.price,
    row_number() OVER (ORDER BY s.booking_type DESC, s.name ASC)
  FROM services_v2 s
  JOIN service_pricing sp ON sp.service_id = s.id
  WHERE s.id = ANY(v_actual_service_ids)
  AND sp.vehicle_type = p_vehicle_type;

  -- Triggers trg_sync_total_price and trg_sync_vehicle_occupancy will handle the rest.
  
  RETURN v_booking_id;
END;
$$;
