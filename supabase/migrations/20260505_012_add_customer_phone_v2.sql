-- Add customer_phone column to bookings_v2
ALTER TABLE IF EXISTS bookings_v2 ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Update the RPC to handle the new field
CREATE OR REPLACE FUNCTION create_booking_v2(
  p_customer_id UUID,
  p_vehicle_type vehicle_type,
  p_service_ids UUID[],
  p_payment_method TEXT DEFAULT 'GCASH',
  p_package_id UUID DEFAULT NULL,
  p_start_datetime TIMESTAMPTZ DEFAULT NULL,
  p_plate_number TEXT DEFAULT NULL,
  p_vehicle_brand TEXT DEFAULT NULL,
  p_vehicle_model TEXT DEFAULT NULL,
  p_customer_notes TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL -- NEW PARAMETER
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id UUID;
  v_resource_id UUID;
  v_total_duration_mins INT := 0;
  v_end_datetime TIMESTAMPTZ;
  v_is_multi_day BOOLEAN := FALSE;
  v_actual_service_ids UUID[] := p_service_ids;
  v_payment_method payment_method_v2;
BEGIN
  -- 1. Authorization
  IF auth.uid() != p_customer_id AND
     (SELECT role FROM profiles WHERE id = auth.uid()) NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Validate payment method
  BEGIN
    v_payment_method := p_payment_method::payment_method_v2;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid payment method: %. Must be GCASH or CASH', p_payment_method;
  END;

  -- 3. Package expansion
  IF p_package_id IS NOT NULL THEN
    SELECT array_agg(DISTINCT s_id)
    FROM (
      SELECT unnest(v_actual_service_ids) as s_id
      UNION
      SELECT service_id FROM package_services_v2 WHERE package_id = p_package_id
    ) t
    INTO v_actual_service_ids;
  END IF;

  -- 4. Duration & multi-day check
  SELECT
    COALESCE(SUM(base_duration_hours * 60 + base_duration_days * 1440), 0),
    EXISTS (SELECT 1 FROM services_v2 WHERE id = ANY(v_actual_service_ids) AND booking_type = 'MULTI_DAY')
  INTO v_total_duration_mins, v_is_multi_day
  FROM services_v2 WHERE id = ANY(v_actual_service_ids);

  IF v_total_duration_mins = 0 THEN
    RAISE EXCEPTION 'No valid services selected';
  END IF;

  -- 5. Calculate end time (+ 30m buffer)
  v_end_datetime := p_start_datetime + (v_total_duration_mins || ' minutes')::interval + INTERVAL '30 minutes';

  -- 6. Race-safe resource allocation
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

  -- 7. Lock slots
  UPDATE resource_time_slots
  SET is_available = FALSE
  WHERE resource_id = v_resource_id
  AND is_available = TRUE
  AND tstzrange(slot_start, slot_end) && tstzrange(p_start_datetime, v_end_datetime);

  -- 8. Insert booking with customer_phone
  INSERT INTO bookings_v2 (
    customer_id, vehicle_type, resource_id, package_id,
    start_datetime, end_datetime, status, payment_method,
    plate_number, vehicle_brand, vehicle_model, customer_notes,
    customer_phone -- NEW FIELD
  ) VALUES (
    p_customer_id, p_vehicle_type, v_resource_id, p_package_id,
    p_start_datetime, v_end_datetime, 'scheduled', v_payment_method,
    p_plate_number, p_vehicle_brand, p_vehicle_model, p_customer_notes,
    p_customer_phone -- NEW FIELD
  ) RETURNING id INTO v_booking_id;

  -- 9. Services
  INSERT INTO booking_services_v2 (booking_id, service_id, price_at_booking, step_order)
  SELECT v_booking_id, s.id, sp.price, row_number() OVER (ORDER BY s.booking_type DESC)
  FROM services_v2 s JOIN service_pricing sp ON sp.service_id = s.id
  WHERE s.id = ANY(v_actual_service_ids) AND sp.vehicle_type = p_vehicle_type;

  -- 10. Initial Payment
  INSERT INTO payments_v2 (booking_id, amount, method, status)
  VALUES (v_booking_id, 0, v_payment_method, 'UNPAID');

  -- 11. Audit
  INSERT INTO booking_events (booking_id, actor_id, event_type, metadata)
  VALUES (v_booking_id, auth.uid(), 'BOOKING_CREATED', jsonb_build_object('source', 'RPC'));

  RETURN v_booking_id;
END;
$$;
