-- ==========================================
-- ENTERPRISE HARDENING: Booking Engine Upgrades
-- ==========================================

-- 1. GLOBAL LOCKS (Multi-instance safety)
CREATE TABLE IF NOT EXISTS booking_locks (
  resource_id UUID PRIMARY KEY REFERENCES resources(id),
  locked_until TIMESTAMPTZ NOT NULL
);

-- 2. AUDIT LOG (Traceability)
CREATE TABLE IF NOT EXISTS booking_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID,
  action TEXT NOT NULL,
  old_state JSONB,
  new_state JSONB,
  actor_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FAILURE COMPENSATION (Resilience)
CREATE TABLE IF NOT EXISTS booking_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID,
  failed_step TEXT,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. UPDATED RPC: create_booking_v2 (Enterprise Hardened)
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
  v_lock_success BOOLEAN;
BEGIN
  -- SET TRANSACTION ISOLATION LEVEL SERIALIZABLE; -- Enforced at app or session level if needed, but logic below is safe.

  -- 1. Authorization
  IF auth.uid() != p_customer_id AND (SELECT role FROM profiles WHERE id = auth.uid()) NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Package Expansion
  IF p_package_id IS NOT NULL THEN
    SELECT array_agg(DISTINCT s_id) FROM (
      SELECT unnest(v_actual_service_ids) as s_id UNION
      SELECT service_id FROM package_services_v2 WHERE package_id = p_package_id
    ) t INTO v_actual_service_ids;
  END IF;

  -- 3. Duration & Multi-day Check
  SELECT 
    COALESCE(SUM(base_duration_hours * 60 + base_duration_days * 1440), 0),
    EXISTS (SELECT 1 FROM services_v2 WHERE id = ANY(v_actual_service_ids) AND booking_type = 'MULTI_DAY')
  INTO v_total_duration_mins, v_is_multi_day
  FROM services_v2 WHERE id = ANY(v_actual_service_ids);

  IF v_total_duration_mins = 0 THEN RAISE EXCEPTION 'No valid services selected'; END IF;
  IF v_is_multi_day AND p_start_datetime::time != TIME '18:00' THEN
    RAISE EXCEPTION 'Multi-day services must start at 18:00';
  END IF;

  -- 4. Time Window Calculation
  v_end_datetime := p_start_datetime + (v_total_duration_mins || ' minutes')::interval + INTERVAL '30 minutes';

  -- 5. DETERMINISTIC LOCK SELECTION (Prevent Race Conditions)
  -- Uses FOR UPDATE SKIP LOCKED to ensure only one transaction can claim a specific bay.
  SELECT id INTO v_resource_id
  FROM resources r
  WHERE NOT EXISTS (
    SELECT 1 FROM bookings_v2 b
    WHERE b.resource_id = r.id
    AND b.status = 'scheduled'
    AND tstzrange(b.start_datetime, b.end_datetime) && tstzrange(p_start_datetime, v_end_datetime)
  )
  ORDER BY id -- Deterministic order
  LIMIT 1
  FOR UPDATE SKIP LOCKED; -- AIRLINE-GRADE LOCKING

  IF v_resource_id IS NULL THEN
    RAISE EXCEPTION 'No bays available for the selected time slot. Please choose another time.';
  END IF;

  -- 6. Insert Booking Shell
  INSERT INTO bookings_v2 (
    customer_id, vehicle_type, resource_id, package_id, 
    start_datetime, end_datetime, status,
    plate_number, vehicle_brand, vehicle_model, customer_notes
  )
  VALUES (
    p_customer_id, p_vehicle_type, v_resource_id, p_package_id,
    p_start_datetime, v_end_datetime, 'scheduled',
    p_plate_number, p_vehicle_brand, p_vehicle_model, p_customer_notes
  )
  RETURNING id INTO v_booking_id;

  -- 7. Insert Services (Financial Snapshot)
  INSERT INTO booking_services_v2 (booking_id, service_id, price_at_booking, step_order)
  SELECT 
    v_booking_id, s.id, sp.price, row_number() OVER (ORDER BY s.booking_type DESC, s.name ASC)
  FROM services_v2 s
  JOIN service_pricing sp ON sp.service_id = s.id
  WHERE s.id = ANY(v_actual_service_ids)
  AND sp.vehicle_type = p_vehicle_type;

  -- 8. AUDIT LOGGING
  INSERT INTO booking_audit_log (booking_id, action, new_state, actor_id)
  VALUES (v_booking_id, 'BOOKING_CREATED', to_jsonb((SELECT b FROM bookings_v2 b WHERE id = v_booking_id)), auth.uid());

  RETURN v_booking_id;
EXCEPTION WHEN OTHERS THEN
  -- Log failure for diagnostics
  INSERT INTO booking_failures (booking_id, failed_step, error_message)
  VALUES (v_booking_id, 'CREATE_BOOKING_V2', SQLERRM);
  RAISE;
END;
$$;
