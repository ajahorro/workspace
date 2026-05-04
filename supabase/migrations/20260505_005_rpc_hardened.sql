-- ==========================================
-- HARDENED RPC + AUDIT TRIGGERS + ANALYTICS
-- ==========================================

-- 1. HARDENED create_booking_v2
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
  p_customer_notes TEXT DEFAULT NULL
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
  v_total_price NUMERIC(10,2);
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

  IF v_is_multi_day AND p_start_datetime::time != TIME '18:00' THEN
    RAISE EXCEPTION 'Multi-day services must start at 18:00';
  END IF;

  -- 5. Calculate end time (+ 30m buffer)
  v_end_datetime := p_start_datetime + (v_total_duration_mins || ' minutes')::interval + INTERVAL '30 minutes';

  -- 6. Race-safe resource allocation (FOR UPDATE SKIP LOCKED)
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
    RAISE EXCEPTION 'No bays available for the selected time slot. Please choose another time.';
  END IF;

  -- 7. Lock overlapping slots as unavailable
  UPDATE resource_time_slots
  SET is_available = FALSE
  WHERE resource_id = v_resource_id
  AND is_available = TRUE
  AND tstzrange(slot_start, slot_end) && tstzrange(p_start_datetime, v_end_datetime);

  -- 8. Insert booking (DB exclusion constraint is final safety net)
  INSERT INTO bookings_v2 (
    customer_id, vehicle_type, resource_id, package_id,
    start_datetime, end_datetime, status, payment_method,
    plate_number, vehicle_brand, vehicle_model, customer_notes
  ) VALUES (
    p_customer_id, p_vehicle_type, v_resource_id, p_package_id,
    p_start_datetime, v_end_datetime, 'scheduled', v_payment_method,
    p_plate_number, p_vehicle_brand, p_vehicle_model, p_customer_notes
  ) RETURNING id INTO v_booking_id;

  -- 9. Insert services (financial snapshot)
  INSERT INTO booking_services_v2 (booking_id, service_id, price_at_booking, step_order)
  SELECT
    v_booking_id, s.id, sp.price,
    row_number() OVER (ORDER BY s.booking_type DESC, s.name ASC)
  FROM services_v2 s
  JOIN service_pricing sp ON sp.service_id = s.id
  WHERE s.id = ANY(v_actual_service_ids)
  AND sp.vehicle_type = p_vehicle_type;

  -- 10. Create initial payment record
  INSERT INTO payments_v2 (booking_id, amount, method, status)
  VALUES (v_booking_id, 0, v_payment_method, 'UNPAID');

  -- 11. Audit log
  INSERT INTO booking_audit_log (booking_id, action, new_state, actor_id)
  VALUES (v_booking_id, 'BOOKING_CREATED',
    jsonb_build_object('vehicle_type', p_vehicle_type::text, 'payment_method', p_payment_method),
    auth.uid());

  RETURN v_booking_id;

-- Implicit PL/pgSQL transaction: if ANY step fails, ALL roll back
EXCEPTION WHEN OTHERS THEN
  INSERT INTO booking_failures (booking_id, failed_step, error_message)
  VALUES (v_booking_id, 'CREATE_BOOKING_V2', SQLERRM);
  RAISE;
END;
$$;


-- 2. RECORD PAYMENT RPC (with overpayment prevention)
CREATE OR REPLACE FUNCTION record_payment_v2(
  p_booking_id UUID,
  p_amount NUMERIC,
  p_method TEXT DEFAULT 'CASH',
  p_reference TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_price NUMERIC;
  v_total_paid NUMERIC;
  v_payment_id UUID;
  v_method payment_method_v2;
BEGIN
  -- Validate method
  BEGIN
    v_method := p_method::payment_method_v2;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid payment method: %', p_method;
  END;

  -- Lock booking row and get total
  SELECT total_price INTO v_total_price
  FROM bookings_v2 WHERE id = p_booking_id FOR UPDATE;

  IF v_total_price IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Get current total paid
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments_v2
  WHERE booking_id = p_booking_id AND status = 'PAID';

  -- Overpayment check
  IF (v_total_paid + p_amount) > v_total_price THEN
    RAISE EXCEPTION 'Overpayment: already paid ₱% + ₱% exceeds total ₱%',
      v_total_paid, p_amount, v_total_price;
  END IF;

  -- Insert payment
  INSERT INTO payments_v2 (booking_id, amount, method, status, reference_number)
  VALUES (p_booking_id, p_amount, v_method, 'PAID', p_reference)
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;


-- 3. PAYMENT / REFUND AUDIT TRIGGERS

CREATE OR REPLACE FUNCTION audit_payment_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO booking_audit_log (booking_id, action, old_state, new_state, actor_id)
  VALUES (
    NEW.booking_id,
    CASE TG_OP WHEN 'INSERT' THEN 'PAYMENT_CREATED' ELSE 'PAYMENT_UPDATED' END,
    CASE TG_OP WHEN 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_audit_payment ON payments_v2;
CREATE TRIGGER trg_audit_payment
  AFTER INSERT OR UPDATE ON payments_v2
  FOR EACH ROW EXECUTE FUNCTION audit_payment_change();


CREATE OR REPLACE FUNCTION audit_refund_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO booking_audit_log (booking_id, action, old_state, new_state, actor_id)
  VALUES (
    NEW.booking_id,
    CASE TG_OP WHEN 'INSERT' THEN 'REFUND_CREATED' ELSE 'REFUND_UPDATED' END,
    CASE TG_OP WHEN 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_audit_refund ON refunds_v2;
CREATE TRIGGER trg_audit_refund
  AFTER INSERT OR UPDATE ON refunds_v2
  FOR EACH ROW EXECUTE FUNCTION audit_refund_change();


-- 4. ANALYTICS MATERIALIZED VIEW (pre-aggregated for speed)

DROP MATERIALIZED VIEW IF EXISTS revenue_daily;
CREATE MATERIALIZED VIEW revenue_daily AS
SELECT
  date_trunc('day', p.created_at) AS day,
  COUNT(*) AS transaction_count,
  SUM(p.amount) AS revenue,
  p.method
FROM payments_v2 p
WHERE p.status = 'PAID' AND p.amount > 0
GROUP BY 1, p.method;

CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_daily ON revenue_daily(day, method);
