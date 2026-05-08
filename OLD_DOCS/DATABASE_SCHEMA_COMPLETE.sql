-- ============================================================================
-- SPEEDWAY AUTOXMOTO DETAIL STUDIO - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- Generated based on full UI requirements
-- Date: 2026-05-08
-- Description: Production-ready schema with all tables, relationships,
--              RLS policies, triggers, and functions
-- ============================================================================

-- ============================================================================
-- 1. ENABLE EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. CREATE CUSTOM TYPES (ENUMS)
-- ============================================================================

-- User roles
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('CUSTOMER', 'STAFF', 'ADMIN', 'SUPER_ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Booking status
DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment status
DO $$ BEGIN
    CREATE TYPE booking_payment_status AS ENUM ('unpaid', 'pending', 'partially_paid', 'paid', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Vehicle types
DO $$ BEGIN
    CREATE TYPE vehicle_type AS ENUM ('sedan', 'suv', 'van', 'motorcycle', 'big_bike');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Vehicle progress status
DO $$ BEGIN
    CREATE TYPE vehicle_progress_status AS ENUM ('queued', 'in_progress', 'completed', 'paused');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment method
DO $$ BEGIN
    CREATE TYPE payment_method_type AS ENUM ('CASH', 'GCASH', 'BANK_TRANSFER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment status
DO $$ BEGIN
    CREATE TYPE payment_status_type AS ENUM ('UNPAID', 'PENDING', 'FOR_VERIFICATION', 'PAID', 'REFUNDED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Notification types
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 3. CREATE TABLES
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 PROFILES TABLE (User accounts)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT GENERATED ALWAYS AS (
        CASE
            WHEN first_name IS NOT NULL AND last_name IS NOT NULL
            THEN first_name || ' ' || last_name
            ELSE COALESCE(first_name, last_name, email)
        END
    ) STORED,
    phone_number TEXT,
    role user_role DEFAULT 'CUSTOMER',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- -----------------------------------------------------------------------------
-- 3.2 SERVICES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    base_duration_hours INT DEFAULT 0,
    base_duration_days INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services_v2(is_active);
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services_v2(category);

-- -----------------------------------------------------------------------------
-- 3.3 SERVICE PRICING TABLE (Price per vehicle type)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.services_v2(id) ON DELETE CASCADE,
    vehicle_type vehicle_type NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    duration_override_hours INT,
    duration_override_days INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(service_id, vehicle_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_pricing_service ON public.service_pricing(service_id);
CREATE INDEX IF NOT EXISTS idx_service_pricing_vehicle_type ON public.service_pricing(vehicle_type);

-- -----------------------------------------------------------------------------
-- 3.4 RESOURCES TABLE (Workshop bays/slots)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    capacity INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3.5 BOOKINGS TABLE (Parent booking)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id),
    staff_id UUID REFERENCES public.profiles(id),
    resource_id UUID REFERENCES public.resources(id),

    -- Scheduling
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,

    -- Status
    status booking_status DEFAULT 'scheduled',
    payment_status booking_payment_status DEFAULT 'unpaid',
    payment_method payment_method_type DEFAULT 'GCASH',

    -- Financial
    total_amount NUMERIC(10, 2) DEFAULT 0,
    estimated_duration_total INT DEFAULT 0, -- in minutes

    -- Customer info
    customer_phone TEXT,
    customer_notes TEXT,

    -- Legacy fields (for backward compatibility)
    vehicle_type vehicle_type,

    -- Cancellation
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings_v2(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_staff ON public.bookings_v2(staff_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings_v2(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings_v2(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_start_datetime ON public.bookings_v2(start_datetime);

-- -----------------------------------------------------------------------------
-- 3.6 BOOKING_VEHICLES TABLE (Child: individual vehicles in a booking)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_vehicles_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings_v2(id) ON DELETE CASCADE,

    -- Vehicle info
    vehicle_type vehicle_type NOT NULL,
    make TEXT,
    model TEXT,
    plate_number TEXT,

    -- Status
    status vehicle_progress_status DEFAULT 'queued',

    -- Financial
    subtotal NUMERIC(10, 2) DEFAULT 0,

    -- Flags
    is_cancelled BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booking_vehicles_booking ON public.booking_vehicles_v2(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_vehicles_status ON public.booking_vehicles_v2(status);

-- -----------------------------------------------------------------------------
-- 3.7 BOOKING_VEHICLE_SERVICES TABLE (Grandchild: services per vehicle)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_vehicle_services_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.booking_vehicles_v2(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services_v2(id),

    -- Snapshot data (for historical accuracy)
    service_name_snapshot TEXT NOT NULL,
    price_snapshot NUMERIC(10, 2) NOT NULL,
    duration_snapshot INT NOT NULL, -- in minutes

    -- Order
    step_order INT DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booking_vehicle_services_vehicle ON public.booking_vehicle_services_v2(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_booking_vehicle_services_service ON public.booking_vehicle_services_v2(service_id);

-- -----------------------------------------------------------------------------
-- 3.8 PAYMENTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings_v2(id) ON DELETE CASCADE,

    -- Payment info
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    method payment_method_type DEFAULT 'GCASH',
    status payment_status_type DEFAULT 'UNPAID',

    -- Receipt tracking
    receipt_url TEXT,
    receipt_attempt INT DEFAULT 1,
    ocr_text TEXT,
    reference_number TEXT,

    -- Refund tracking
    refund_reason TEXT,
    refunded_at TIMESTAMPTZ,
    refunded_by UUID REFERENCES public.profiles(id),

    -- Verification
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments_v2(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments_v2(status);

-- -----------------------------------------------------------------------------
-- 3.9 NOTIFICATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type notification_type DEFAULT 'info',
    action_url TEXT,

    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- -----------------------------------------------------------------------------
-- 3.10 AUDIT_LOGS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings_v2(id) ON DELETE CASCADE,

    action_type TEXT NOT NULL,
    details TEXT NOT NULL,

    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,

    metadata JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_booking ON public.audit_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);

-- -----------------------------------------------------------------------------
-- 3.11 BOOKING_MESSAGES TABLE (Chat)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings_v2(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id),

    message TEXT,

    -- Media support
    media_url TEXT,
    media_type TEXT, -- 'image', 'video', 'file'

    -- System messages
    is_system BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booking_messages_booking ON public.booking_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_messages_created ON public.booking_messages(created_at);

-- -----------------------------------------------------------------------------
-- 3.12 BOOKING_EVENTS TABLE (Alternative to audit_logs for more structured data)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings_v2(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id),

    event_type TEXT NOT NULL,
    metadata JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booking_events_booking ON public.booking_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_events_created ON public.booking_events(created_at DESC);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_vehicles_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_vehicle_services_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 4.1 PROFILES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
);

-- -----------------------------------------------------------------------------
-- 4.2 SERVICES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Anyone can view active services" ON public.services_v2 FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage services" ON public.services_v2 FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
);

-- -----------------------------------------------------------------------------
-- 4.3 SERVICE PRICING POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Anyone can view service pricing" ON public.service_pricing FOR SELECT USING (true);
CREATE POLICY "Admins can manage pricing" ON public.service_pricing FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
);

-- -----------------------------------------------------------------------------
-- 4.4 BOOKINGS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Customers can view own bookings" ON public.bookings_v2 FOR SELECT USING (
    customer_id = auth.uid()
);

CREATE POLICY "Staff can view assigned bookings" ON public.bookings_v2 FOR SELECT USING (
    staff_id = auth.uid()
);

CREATE POLICY "Admins can view all bookings" ON public.bookings_v2 FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
);

CREATE POLICY "Customers can create bookings" ON public.bookings_v2 FOR INSERT WITH CHECK (
    customer_id = auth.uid()
);

CREATE POLICY "Admins and staff can update bookings" ON public.bookings_v2 FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN', 'STAFF')
    )
);

-- -----------------------------------------------------------------------------
-- 4.5 BOOKING VEHICLES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "View vehicles if can view booking" ON public.booking_vehicles_v2 FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.bookings_v2 b
        WHERE b.id = booking_id
        AND (
            b.customer_id = auth.uid()
            OR b.staff_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role IN ('ADMIN', 'SUPER_ADMIN')
            )
        )
    )
);

CREATE POLICY "Admins and staff can update vehicles" ON public.booking_vehicles_v2 FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN', 'STAFF')
    )
);

-- -----------------------------------------------------------------------------
-- 4.6 PAYMENTS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "View payments if can view booking" ON public.payments_v2 FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.bookings_v2 b
        WHERE b.id = booking_id
        AND (
            b.customer_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role IN ('ADMIN', 'SUPER_ADMIN', 'STAFF')
            )
        )
    )
);

CREATE POLICY "Customers can insert payments" ON public.payments_v2 FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.bookings_v2 b
        WHERE b.id = booking_id AND b.customer_id = auth.uid()
    )
);

CREATE POLICY "Admins can update payments" ON public.payments_v2 FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
);

-- -----------------------------------------------------------------------------
-- 4.7 NOTIFICATIONS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 4.8 AUDIT LOGS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "View audit logs if can view booking" ON public.audit_logs FOR SELECT USING (
    booking_id IS NULL OR EXISTS (
        SELECT 1 FROM public.bookings_v2 b
        WHERE b.id = booking_id
        AND (
            b.customer_id = auth.uid()
            OR b.staff_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role IN ('ADMIN', 'SUPER_ADMIN')
            )
        )
    )
);

CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 4.9 BOOKING MESSAGES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "View messages if can view booking" ON public.booking_messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.bookings_v2 b
        WHERE b.id = booking_id
        AND (
            b.customer_id = auth.uid()
            OR b.staff_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role IN ('ADMIN', 'SUPER_ADMIN')
            )
        )
    )
);

CREATE POLICY "Users can send messages to their bookings" ON public.booking_messages FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.bookings_v2 b
        WHERE b.id = booking_id
        AND (
            b.customer_id = auth.uid()
            OR b.staff_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role IN ('ADMIN', 'SUPER_ADMIN')
            )
        )
    )
);

-- ============================================================================
-- 5. STORAGE BUCKETS
-- ============================================================================

-- Create storage buckets (run this via Supabase Dashboard or CLI)
-- Receipts bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Chat media bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_media', 'chat_media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for receipts
CREATE POLICY "Authenticated users can upload receipts" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view receipts" ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

-- Storage policies for chat_media
CREATE POLICY "Authenticated users can upload chat media" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat_media' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view chat media" ON storage.objects FOR SELECT
USING (bucket_id = 'chat_media');

-- ============================================================================
-- 6. FUNCTIONS
-- ============================================================================

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings_v2;
CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON public.bookings_v2
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_booking_vehicles_updated_at ON public.booking_vehicles_v2;
CREATE TRIGGER update_booking_vehicles_updated_at
BEFORE UPDATE ON public.booking_vehicles_v2
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments_v2;
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments_v2
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
