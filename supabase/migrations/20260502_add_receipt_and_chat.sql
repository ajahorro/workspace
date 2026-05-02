-- 🧱 ADD RECEIPT URL TO PAYMENT INTENTS
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- 🧱 CREATE BOOKING MESSAGES TABLE FOR REFUND CHAT
CREATE TABLE IF NOT EXISTS booking_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🔒 RLS FOR MESSAGES
ALTER TABLE booking_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for their bookings" ON booking_messages
FOR SELECT USING (
  booking_id IN (
    SELECT id FROM bookings 
    WHERE customer_id = auth.uid() 
    OR staff_id = auth.uid() 
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
  )
);

CREATE POLICY "Users can insert messages for their bookings" ON booking_messages
FOR INSERT WITH CHECK (
  booking_id IN (
    SELECT id FROM bookings 
    WHERE customer_id = auth.uid() 
    OR staff_id = auth.uid() 
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
  )
);
-- ?? UPDATE CREATE_BOOKING RPC TO SUPPORT RECEIPT_URL
CREATE OR REPLACE FUNCTION create_booking(
  p_customer_id UUID,
  p_service_ids UUID[],
  p_scheduled_start TIMESTAMPTZ,
  p_payment_method TEXT,
  p_vehicle_type TEXT,
  p_plate_number TEXT,
  p_vehicle_brand TEXT,
  p_vehicle_model TEXT,
  p_customer_notes TEXT,
  p_receipt_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS 
DECLARE
  v_booking_id UUID;
  v_total NUMERIC(10,2) := 0;
  v_duration INT := 0;
  v_settings JSONB;
BEGIN

  -- Verify customer
  IF auth.uid() != p_customer_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get current settings snapshot
  SELECT to_jsonb(bs) INTO v_settings FROM business_settings bs WHERE id = TRUE;
  
  IF v_settings IS NULL THEN
    RAISE EXCEPTION 'Business settings not found';
  END IF;

  -- Create booking shell
  INSERT INTO bookings (
    customer_id, 
    booking_status, 
    scheduled_start, 
    settings_snapshot,
    vehicle_type,
    plate_number,
    vehicle_brand,
    vehicle_model,
    customer_notes
  )
  VALUES (
    p_customer_id, 
    'PENDING_ASSIGNMENT', 
    p_scheduled_start, 
    v_settings,
    p_vehicle_type,
    p_plate_number,
    p_vehicle_brand,
    p_vehicle_model,
    p_customer_notes
  )
  RETURNING id INTO v_booking_id;

  -- Insert services snapshot
  INSERT INTO booking_services (
    booking_id,
    service_id,
    service_name,
    service_price,
    service_duration
  )
  SELECT
    v_booking_id,
    s.id,
    s.name,
    s.price,
    s.duration_minutes
  FROM services s
  WHERE s.id = ANY(p_service_ids) AND s.is_active = TRUE;

  -- Compute total price and duration
  SELECT COALESCE(SUM(price), 0), COALESCE(SUM(duration_minutes), 0)
  INTO v_total, v_duration
  FROM services
  WHERE id = ANY(p_service_ids) AND is_active = TRUE;
  
  IF v_total = 0 THEN
    RAISE EXCEPTION 'No active services selected';
  END IF;

  -- Update expected duration and end time
  UPDATE bookings 
  SET expected_duration = v_duration,
      scheduled_end = p_scheduled_start + (v_duration || ' minutes')::interval
  WHERE id = v_booking_id;

  -- Create payment intent
  INSERT INTO payment_intents (
    booking_id,
    amount_paid,
    total_amount,
    status,
    method,
    receipt_url
  )
  VALUES (
    v_booking_id,
    0,
    v_total,
    CASE WHEN p_payment_method = 'CASH' THEN 'INITIATED'::payment_intent_status ELSE 'FOR_VERIFICATION'::payment_intent_status END,
    p_payment_method::payment_method,
    p_receipt_url
  );

  RETURN v_booking_id;
END;
;
