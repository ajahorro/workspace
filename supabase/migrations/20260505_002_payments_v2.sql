-- ==========================================
-- SCALABLE PAYMENT & REFUND ARCHITECTURE
-- ==========================================

-- 1. ENUMS
DO $$ BEGIN
  CREATE TYPE payment_method_v2 AS ENUM ('GCASH', 'CASH');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_v2 AS ENUM (
    'UNPAID', 'FOR_VERIFICATION', 'PARTIALLY_PAID', 'PAID', 'REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE refund_status_v2 AS ENUM ('PENDING', 'PROCESSED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. PAYMENTS TABLE (supports partial + multi-transaction)
CREATE TABLE IF NOT EXISTS payments_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings_v2(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  method payment_method_v2 NOT NULL,
  status payment_status_v2 NOT NULL DEFAULT 'UNPAID',
  reference_number TEXT,
  receipt_url TEXT,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. REFUNDS TABLE (required FK to payment — no orphan refunds)
CREATE TABLE IF NOT EXISTS refunds_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings_v2(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments_v2(id),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  reason TEXT,
  status refund_status_v2 NOT NULL DEFAULT 'PENDING',
  created_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add payment_method to bookings_v2 (lightweight preference field)
ALTER TABLE bookings_v2
  ADD COLUMN IF NOT EXISTS payment_method payment_method_v2,
  ADD COLUMN IF NOT EXISTS staff_notes TEXT;

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_payments_v2_booking ON payments_v2(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_v2_status ON payments_v2(status);
CREATE INDEX IF NOT EXISTS idx_refunds_v2_booking ON refunds_v2(booking_id);
