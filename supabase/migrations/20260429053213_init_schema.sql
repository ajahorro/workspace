-- 🧱 1. CORE ENUMS
CREATE TYPE booking_status AS ENUM (
  'DRAFT',
  'PENDING_ASSIGNMENT',
  'CONFIRMED',
  'COMPLETED',
  'CLOSED',
  'CANCELLED',
  'NO_SHOW',
  'FOR_REVIEW'
);

CREATE TYPE service_status AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'FINISHED'
);

CREATE TYPE payment_intent_status AS ENUM (
  'INITIATED',
  'FOR_VERIFICATION',
  'VERIFIED',
  'PARTIALLY_PAID',
  'PAID',
  'REFUNDED',
  'FAILED',
  'ORPHANED'
);

CREATE TYPE cancellation_status AS ENUM (
  'NONE',
  'REQUESTED',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE refund_status AS ENUM (
  'PENDING',
  'PROCESSED',
  'REJECTED'
);

CREATE TYPE user_role AS ENUM (
  'CUSTOMER',
  'STAFF',
  'ADMIN',
  'SUPER_ADMIN'
);

CREATE TYPE payment_method AS ENUM (
  'CASH',
  'GCASH'
);

-- 🧱 2. USERS TABLE
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  role user_role NOT NULL DEFAULT 'CUSTOMER',
  full_name TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🧱 3. BUSINESS SETTINGS (Singleton)
CREATE TABLE business_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  opening_hour TIME DEFAULT '09:00',
  closing_hour TIME DEFAULT '18:00',
  slot_duration_minutes INT DEFAULT 60,
  max_bookings_per_slot INT DEFAULT 3,
  downpayment_threshold NUMERIC DEFAULT 5000,
  downpayment_percentage INT DEFAULT 50,
  cancellation_window_hours INT DEFAULT 24,
  travel_buffer_minutes INT DEFAULT 30,
  gcash_number TEXT,
  gcash_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🧱 3.5. SERVICES CATALOG
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 🧱 4. BOOKINGS TABLE
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id),
  staff_id UUID REFERENCES profiles(id),

  booking_status booking_status NOT NULL,
  service_status service_status DEFAULT 'NOT_STARTED',

  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,

  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,

  start_deviation_minutes INT,
  started_early BOOLEAN,
  started_late BOOLEAN,

  expected_duration INT,
  settings_snapshot JSONB NOT NULL,

  cancellation_status cancellation_status DEFAULT 'NONE',
  refund_status refund_status,
  penalty_amount NUMERIC DEFAULT 0,
  
  -- Vehicle Data
  vehicle_type TEXT,
  plate_number TEXT,
  vehicle_brand TEXT,
  vehicle_model TEXT,
  customer_notes TEXT,

  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (penalty_amount >= 0)
);

-- 🧱 4.5 BOOKING SERVICES (Immutable Snapshot Ledger)
CREATE TABLE booking_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id),

  -- SNAPSHOT FIELDS
  service_name TEXT NOT NULL,
  service_price NUMERIC(10,2) NOT NULL,
  service_duration INT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- 🧱 5. PAYMENT INTENTS
CREATE TABLE payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),

  status payment_intent_status NOT NULL,

  total_amount NUMERIC(10,2) NOT NULL,
  amount_paid NUMERIC(10,2) DEFAULT 0,

  method payment_method NOT NULL,
  reference_number TEXT,
  idempotency_key TEXT UNIQUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (amount_paid >= 0),
  CHECK (amount_paid <= total_amount)
);

-- 🧱 6. PAYMENTS
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id UUID REFERENCES payment_intents(id),
  amount NUMERIC NOT NULL,
  method payment_method NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🧱 7. BOOKING EVENTS (MANDATORY AUDIT)
CREATE TABLE booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  actor_id UUID REFERENCES profiles(id),
  role user_role,
  event_type TEXT,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🧱 8. OCR RESULTS
CREATE TABLE ocr_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id UUID REFERENCES payment_intents(id),
  extracted_amount NUMERIC,
  reference_number TEXT,
  extracted_date TIMESTAMPTZ,
  match_score NUMERIC,
  status TEXT,
  verified_by_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🔒 9. GLOBAL GUARDS

-- Booking Transition Enforcement
CREATE OR REPLACE FUNCTION validate_booking_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.booking_status = 'PENDING_ASSIGNMENT' AND NEW.booking_status = 'CONFIRMED' THEN RETURN NEW;
  ELSIF OLD.booking_status = 'CONFIRMED' AND NEW.booking_status = 'COMPLETED' THEN RETURN NEW;
  ELSIF OLD.booking_status = 'COMPLETED' AND NEW.booking_status = 'CLOSED' THEN RETURN NEW;
  ELSIF NEW.booking_status IN ('CANCELLED','NO_SHOW','FOR_REVIEW') THEN RETURN NEW;
  ELSIF OLD.booking_status = NEW.booking_status THEN RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid booking transition from % to %', OLD.booking_status, NEW.booking_status;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_booking_transition
BEFORE UPDATE ON bookings
FOR EACH ROW
WHEN (OLD.booking_status IS DISTINCT FROM NEW.booking_status)
EXECUTE FUNCTION validate_booking_transition();

-- Prevent Updates After CLOSED
CREATE OR REPLACE FUNCTION prevent_closed_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.booking_status = 'CLOSED' THEN
    RAISE EXCEPTION 'Booking is final and cannot be modified';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_closed
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION prevent_closed_updates();

-- Enforce Cancellation -> Refund Link
CREATE OR REPLACE FUNCTION enforce_refund_rule()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cancellation_status = 'APPROVED' AND NEW.refund_status IS NULL THEN
    RAISE EXCEPTION 'Refund required when cancellation approved';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refund_rule
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION enforce_refund_rule();

-- ⚙️ 10. RPC FUNCTIONS (MASTER TRANSACTIONS)

-- CREATE BOOKING RPC (Master Transaction)
CREATE OR REPLACE FUNCTION create_booking(
  p_customer_id UUID,
  p_service_ids UUID[],
  p_scheduled_start TIMESTAMPTZ,
  p_payment_method TEXT,
  p_vehicle_type TEXT,
  p_plate_number TEXT,
  p_vehicle_brand TEXT,
  p_vehicle_model TEXT,
  p_customer_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
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
    method
  )
  VALUES (
    v_booking_id,
    0,
    v_total,
    CASE WHEN p_payment_method = 'CASH' THEN 'INITIATED'::payment_intent_status ELSE 'FOR_VERIFICATION'::payment_intent_status END,
    p_payment_method::payment_method
  );

  RETURN v_booking_id;
END;
$$;

-- ASSIGN STAFF
CREATE OR REPLACE FUNCTION assign_staff(p_booking_id UUID, p_staff_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  old_state JSONB;
BEGIN
  SELECT to_jsonb(b) INTO old_state FROM bookings b WHERE id = p_booking_id;

  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE staff_id = p_staff_id
    AND booking_status = 'CONFIRMED'
  ) THEN
    RAISE EXCEPTION 'Staff conflict';
  END IF;

  UPDATE bookings
  SET staff_id = p_staff_id,
      booking_status = 'CONFIRMED',
      updated_at = NOW()
  WHERE id = p_booking_id;

  INSERT INTO booking_events (booking_id, actor_id, event_type, before_state, after_state)
  VALUES (p_booking_id, auth.uid(), 'ASSIGN_STAFF', old_state, to_jsonb((SELECT b FROM bookings b WHERE id = p_booking_id)));
END;
$$;

-- START SERVICE
CREATE OR REPLACE FUNCTION start_service(p_booking_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  sched TIMESTAMPTZ;
BEGIN
  IF (SELECT service_status FROM bookings WHERE id = p_booking_id) != 'NOT_STARTED' THEN
    RAISE EXCEPTION 'Already started';
  END IF;

  IF (SELECT staff_id FROM bookings WHERE id = p_booking_id) IS NULL THEN
    RAISE EXCEPTION 'No staff assigned';
  END IF;

  SELECT scheduled_start INTO sched FROM bookings WHERE id = p_booking_id;

  UPDATE bookings
  SET service_status = 'IN_PROGRESS',
      started_at = NOW(),
      start_deviation_minutes = EXTRACT(EPOCH FROM (NOW() - sched))/60,
      updated_at = NOW()
  WHERE id = p_booking_id;
END;
$$;

-- FINISH SERVICE
CREATE OR REPLACE FUNCTION finish_service(p_booking_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (SELECT service_status FROM bookings WHERE id = p_booking_id) != 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'Service not in progress';
  END IF;

  UPDATE bookings
  SET service_status = 'FINISHED',
      booking_status = 'COMPLETED',
      finished_at = NOW(),
      updated_at = NOW()
  WHERE id = p_booking_id;
END;
$$;

-- RECORD CASH PAYMENT
CREATE OR REPLACE FUNCTION record_cash_payment(p_booking_id UUID, p_amount NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  intent_id UUID;
  total NUMERIC;
BEGIN
  SELECT total_amount INTO total FROM payment_intents WHERE booking_id = p_booking_id LIMIT 1;

  IF total IS NULL THEN
    total := p_amount;
  END IF;

  IF p_amount > total THEN
    RAISE EXCEPTION 'Overpayment';
  END IF;

  UPDATE payment_intents 
  SET status = 'PAID', amount_paid = p_amount, method = 'CASH'
  WHERE booking_id = p_booking_id
  RETURNING id INTO intent_id;
  
  IF intent_id IS NULL THEN
     RAISE EXCEPTION 'Payment intent not found for booking';
  END IF;

  INSERT INTO payments (payment_intent_id, amount, method)
  VALUES (intent_id, p_amount, 'CASH');

  UPDATE bookings
  SET booking_status = 'CLOSED',
      updated_at = NOW()
  WHERE id = p_booking_id;
END;
$$;

-- 🔐 11. RLS (RPC-ONLY WRITES)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Deny all INSERT/UPDATE/DELETE from frontend (except via RPC which bypasses RLS if created with SECURITY DEFINER, or runs as the user but we want strict policies). 
-- Wait, RPCs run under the invoker's context unless marked SECURITY DEFINER. Let's make them SECURITY DEFINER so they can bypass the insert restrictions, because RLS will block the INSERT if we don't allow it. 
-- For now, we allow SELECT.

CREATE POLICY "Customers can view their bookings" ON bookings
FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Staff can view assigned bookings" ON bookings
FOR SELECT USING (auth.uid() = staff_id);

CREATE POLICY "Anyone can view active services" ON services
FOR SELECT USING (is_active = true);

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Payment intents
CREATE POLICY "Customers can view their payment intents" ON payment_intents
FOR SELECT USING (
  booking_id IN (SELECT id FROM bookings WHERE customer_id = auth.uid())
);

-- Booking services
CREATE POLICY "Customers can view their booked services" ON booking_services
FOR SELECT USING (
  booking_id IN (SELECT id FROM bookings WHERE customer_id = auth.uid())
);
-- 🧱 12. NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🔒 RLS for Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON notifications
FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications
FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON notifications
FOR DELETE USING (auth.uid() = user_id);

-- 🧱 13. SEED DEFAULT DATA
INSERT INTO business_settings (id, opening_hour, closing_hour, slot_duration_minutes, max_bookings_per_slot)
VALUES (TRUE, '09:00', '18:00', 60, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO services (name, category, description, price, duration_minutes) VALUES
('Premium Wash', 'Exterior', 'Detailed hand wash with wax', 500.00, 45),
('Full Interior', 'Interior', 'Deep cleaning of seats and carpets', 1200.00, 90),
('Engine Detail', 'Maintenance', 'Degreasing and shine for engine bay', 800.00, 60),
('Ceramic Coating', 'Protection', 'Nano-ceramic paint protection', 5000.00, 240)
ON CONFLICT DO NOTHING;
