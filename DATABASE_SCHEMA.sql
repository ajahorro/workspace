-- ============================================================================
-- SpeedWay AutoxMoto Detail Studio - Complete Database Schema
-- Version: 2.0 (Refactored - No v2 suffixes)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'STAFF', 'ADMIN', 'SUPER_ADMIN')),
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- SERVICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('exterior', 'interior', 'engine', 'detailing', 'protection')),
  base_duration_hours INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Services are viewable by everyone" ON services;
CREATE POLICY "Services are viewable by everyone" ON services
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage services" ON services;
CREATE POLICY "Admins can manage services" ON services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- SERVICE PRICING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('sedan', 'suv', 'van', 'motorcycle')),
  price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_id, vehicle_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_service_pricing_service_id ON service_pricing(service_id);
CREATE INDEX IF NOT EXISTS idx_service_pricing_vehicle_type ON service_pricing(vehicle_type);

-- Enable RLS
ALTER TABLE service_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Service pricing is viewable by everyone" ON service_pricing;
CREATE POLICY "Service pricing is viewable by everyone" ON service_pricing
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage service pricing" ON service_pricing;
CREATE POLICY "Admins can manage service pricing" ON service_pricing
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- RESOURCES TABLE (Workshop Bays)
-- ============================================================================

CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Resources are viewable by authenticated users" ON resources;
CREATE POLICY "Resources are viewable by authenticated users" ON resources
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage resources" ON resources;
CREATE POLICY "Admins can manage resources" ON resources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- BOOKINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  appointment_datetime TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  assigned_staff_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_staff_id ON bookings(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_appointment_datetime ON bookings(appointment_datetime);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Customers can view their own bookings" ON bookings;
CREATE POLICY "Customers can view their own bookings" ON bookings
  FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can create bookings" ON bookings;
CREATE POLICY "Customers can create bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can update their own bookings" ON bookings;
CREATE POLICY "Customers can update their own bookings" ON bookings
  FOR UPDATE USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Staff can view assigned bookings" ON bookings;
CREATE POLICY "Staff can view assigned bookings" ON bookings
  FOR SELECT USING (
    auth.uid() = assigned_staff_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('STAFF', 'ADMIN', 'SUPER_ADMIN')
    )
  );

DROP POLICY IF EXISTS "Staff can update assigned bookings" ON bookings;
CREATE POLICY "Staff can update assigned bookings" ON bookings
  FOR UPDATE USING (
    auth.uid() = assigned_staff_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

DROP POLICY IF EXISTS "Admins can manage all bookings" ON bookings;
CREATE POLICY "Admins can manage all bookings" ON bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- BOOKING VEHICLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  vehicle_make TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_year INTEGER NOT NULL,
  license_plate TEXT NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('sedan', 'suv', 'van', 'motorcycle')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'washing', 'detailing', 'drying', 'quality_check', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_booking_vehicles_booking_id ON booking_vehicles(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_vehicles_status ON booking_vehicles(status);

-- Enable RLS
ALTER TABLE booking_vehicles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their booking vehicles" ON booking_vehicles;
CREATE POLICY "Users can view their booking vehicles" ON booking_vehicles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_vehicles.booking_id
      AND bookings.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can view assigned booking vehicles" ON booking_vehicles;
CREATE POLICY "Staff can view assigned booking vehicles" ON booking_vehicles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_vehicles.booking_id
      AND (bookings.assigned_staff_id = auth.uid() OR
           EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('STAFF', 'ADMIN', 'SUPER_ADMIN')))
    )
  );

DROP POLICY IF EXISTS "Staff can update assigned booking vehicles" ON booking_vehicles;
CREATE POLICY "Staff can update assigned booking vehicles" ON booking_vehicles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_vehicles.booking_id
      AND (bookings.assigned_staff_id = auth.uid() OR
           EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')))
    )
  );

DROP POLICY IF EXISTS "Customers can create booking vehicles" ON booking_vehicles;
CREATE POLICY "Customers can create booking vehicles" ON booking_vehicles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_vehicles.booking_id
      AND bookings.customer_id = auth.uid()
    )
  );

-- ============================================================================
-- BOOKING VEHICLE SERVICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_vehicle_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_vehicle_id UUID NOT NULL REFERENCES booking_vehicles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('sedan', 'suv', 'van', 'motorcycle')),
  price_at_booking NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_booking_vehicle_services_booking_vehicle_id ON booking_vehicle_services(booking_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_booking_vehicle_services_service_id ON booking_vehicle_services(service_id);

-- Enable RLS
ALTER TABLE booking_vehicle_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their booking services" ON booking_vehicle_services;
CREATE POLICY "Users can view their booking services" ON booking_vehicle_services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM booking_vehicles
      JOIN bookings ON bookings.id = booking_vehicles.booking_id
      WHERE booking_vehicles.id = booking_vehicle_services.booking_vehicle_id
      AND bookings.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can view assigned booking services" ON booking_vehicle_services;
CREATE POLICY "Staff can view assigned booking services" ON booking_vehicle_services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM booking_vehicles
      JOIN bookings ON bookings.id = booking_vehicles.booking_id
      WHERE booking_vehicles.id = booking_vehicle_services.booking_vehicle_id
      AND (bookings.assigned_staff_id = auth.uid() OR
           EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('STAFF', 'ADMIN', 'SUPER_ADMIN')))
    )
  );

DROP POLICY IF EXISTS "Customers can create booking services" ON booking_vehicle_services;
CREATE POLICY "Customers can create booking services" ON booking_vehicle_services
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM booking_vehicles
      JOIN bookings ON bookings.id = booking_vehicles.booking_id
      WHERE booking_vehicles.id = booking_vehicle_services.booking_vehicle_id
      AND bookings.customer_id = auth.uid()
    )
  );

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'gcash',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'for_verification', 'paid', 'refunded')),
  reference_number TEXT,
  receipt_url TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  refund_reason TEXT,
  refunded_at TIMESTAMPTZ,
  refunded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Customers can view their payments" ON payments;
CREATE POLICY "Customers can view their payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
      AND bookings.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Customers can update their payments" ON payments;
CREATE POLICY "Customers can update their payments" ON payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
      AND bookings.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage all payments" ON payments;
CREATE POLICY "Admins can manage all payments" ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- BOOKING MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_booking_messages_booking_id ON booking_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_messages_sender_id ON booking_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_booking_messages_created_at ON booking_messages(created_at);

-- Enable RLS
ALTER TABLE booking_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view messages for their bookings" ON booking_messages;
CREATE POLICY "Users can view messages for their bookings" ON booking_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_messages.booking_id
      AND (bookings.customer_id = auth.uid() OR
           bookings.assigned_staff_id = auth.uid() OR
           EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')))
    )
  );

DROP POLICY IF EXISTS "Users can send messages for their bookings" ON booking_messages;
CREATE POLICY "Users can send messages for their bookings" ON booking_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_messages.booking_id
      AND (bookings.customer_id = auth.uid() OR
           bookings.assigned_staff_id = auth.uid() OR
           EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')))
    )
  );

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

DROP POLICY IF EXISTS "System can create audit logs" ON audit_logs;
CREATE POLICY "System can create audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- BOOKING EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_booking_events_booking_id ON booking_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_events_event_type ON booking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_booking_events_created_at ON booking_events(created_at);

-- Enable RLS
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view events for their bookings" ON booking_events;
CREATE POLICY "Users can view events for their bookings" ON booking_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_events.booking_id
      AND (bookings.customer_id = auth.uid() OR
           bookings.assigned_staff_id = auth.uid() OR
           EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')))
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, is_active, created_at, updated_at)
  VALUES (NEW.id, NEW.email, 'CUSTOMER', true, NOW(), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_pricing_updated_at ON service_pricing;
CREATE TRIGGER update_service_pricing_updated_at
  BEFORE UPDATE ON service_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_booking_vehicles_updated_at ON booking_vehicles;
CREATE TRIGGER update_booking_vehicles_updated_at
  BEFORE UPDATE ON booking_vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: SUPER ADMIN
-- ============================================================================

-- Create a superadmin user
-- NOTE: You need to create the auth user first via Supabase Dashboard or Auth API
-- Then run this to upgrade them to SUPER_ADMIN

-- Example: After you register via the app with email 'admin@speedway.com',
-- run this to promote yourself:
-- UPDATE profiles SET role = 'SUPER_ADMIN', first_name = 'Super', last_name = 'Admin'
-- WHERE email = 'admin@speedway.com';

-- Or if you want to create a default admin account programmatically,
-- you'll need to use Supabase Auth API or Dashboard first, then update the profile.

-- ============================================================================
-- SAMPLE SERVICES DATA (Optional)
-- ============================================================================

-- Insert sample services
INSERT INTO services (name, description, category, base_duration_hours, is_active) VALUES
('Wash & Wax', 'Complete exterior wash with premium wax coating for long-lasting shine', 'exterior', 2, true),
('Interior Deep Clean', 'Vacuum, shampoo seats, clean dashboard and detail all interior surfaces', 'interior', 3, true),
('Paint Correction', 'Remove swirls, scratches and imperfections from paint surface', 'detailing', 8, true),
('Ceramic Coating', 'Professional-grade ceramic coating for ultimate paint protection', 'protection', 16, true),
('Engine Bay Detailing', 'Clean and protect engine components and bay area', 'engine', 2, true),
('Headlight Restoration', 'Restore clarity to cloudy or yellowed headlights', 'exterior', 1, true),
('Undercarriage Wash', 'Thorough cleaning of vehicle undercarriage', 'exterior', 1, true),
('Clay Bar Treatment', 'Remove embedded contaminants from paint surface', 'detailing', 2, true)
ON CONFLICT DO NOTHING;

-- Insert pricing for services
INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES
-- Wash & Wax
((SELECT id FROM services WHERE name = 'Wash & Wax'), 'sedan', 800.00),
((SELECT id FROM services WHERE name = 'Wash & Wax'), 'suv', 1200.00),
((SELECT id FROM services WHERE name = 'Wash & Wax'), 'van', 1500.00),
((SELECT id FROM services WHERE name = 'Wash & Wax'), 'motorcycle', 400.00),

-- Interior Deep Clean
((SELECT id FROM services WHERE name = 'Interior Deep Clean'), 'sedan', 1500.00),
((SELECT id FROM services WHERE name = 'Interior Deep Clean'), 'suv', 2000.00),
((SELECT id FROM services WHERE name = 'Interior Deep Clean'), 'van', 2500.00),
((SELECT id FROM services WHERE name = 'Interior Deep Clean'), 'motorcycle', 500.00),

-- Paint Correction
((SELECT id FROM services WHERE name = 'Paint Correction'), 'sedan', 5000.00),
((SELECT id FROM services WHERE name = 'Paint Correction'), 'suv', 7000.00),
((SELECT id FROM services WHERE name = 'Paint Correction'), 'van', 9000.00),
((SELECT id FROM services WHERE name = 'Paint Correction'), 'motorcycle', 3000.00),

-- Ceramic Coating
((SELECT id FROM services WHERE name = 'Ceramic Coating'), 'sedan', 12000.00),
((SELECT id FROM services WHERE name = 'Ceramic Coating'), 'suv', 15000.00),
((SELECT id FROM services WHERE name = 'Ceramic Coating'), 'van', 18000.00),
((SELECT id FROM services WHERE name = 'Ceramic Coating'), 'motorcycle', 6000.00),

-- Engine Bay Detailing
((SELECT id FROM services WHERE name = 'Engine Bay Detailing'), 'sedan', 1000.00),
((SELECT id FROM services WHERE name = 'Engine Bay Detailing'), 'suv', 1200.00),
((SELECT id FROM services WHERE name = 'Engine Bay Detailing'), 'van', 1500.00),
((SELECT id FROM services WHERE name = 'Engine Bay Detailing'), 'motorcycle', 500.00)
ON CONFLICT DO NOTHING;

-- Insert sample resources (workshop bays)
INSERT INTO resources (name, description, capacity, is_active) VALUES
('Bay 1', 'Main detailing bay with full equipment', 1, true),
('Bay 2', 'Quick service bay for wash and wax', 1, true),
('Bay 3', 'Premium service bay for paint correction and ceramic coating', 1, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database schema created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '1. Create storage buckets: receipts, chat_media (both public)';
  RAISE NOTICE '2. Enable realtime for tables: bookings, booking_vehicles, payments, notifications, booking_messages';
  RAISE NOTICE '3. Register a user via the app';
  RAISE NOTICE '4. Run this to make them SUPER_ADMIN:';
  RAISE NOTICE '   UPDATE profiles SET role = ''SUPER_ADMIN'', first_name = ''Super'', last_name = ''Admin'' WHERE email = ''your-email@example.com'';';
  RAISE NOTICE '';
  RAISE NOTICE '✨ Sample services and pricing have been added!';
END $$;
