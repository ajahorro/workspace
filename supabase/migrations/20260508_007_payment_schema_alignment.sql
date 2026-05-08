-- ==========================================
-- FIX: PAYMENT SCHEMA ALIGNMENT & RLS
-- Ensuring 'payments' table matches frontend expectations (BookAppointment.jsx)
-- ==========================================

-- 1. Align 'payments' table columns
ALTER TABLE payments ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'UNPAID';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS ocr_text TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_attempt INT DEFAULT 1;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference_number TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 2. Ensure the status column can handle the enum values
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_v2') THEN
        ALTER TABLE payments ALTER COLUMN status TYPE payment_status_v2 USING status::payment_status_v2;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not align payment status enum, keeping as TEXT';
END $$;

-- 3. Ensure method column can handle payment_method_v2
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_v2') THEN
        ALTER TABLE payments ALTER COLUMN method TYPE payment_method_v2 USING method::payment_method_v2;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not align payment method enum, keeping as TEXT';
END $$;

-- 4. RLS Policies for 'payments' (Enabling frontend inserts)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can insert their own payments" ON payments;
CREATE POLICY "Customers can insert their own payments" ON payments
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM bookings
        WHERE id = booking_id
        AND customer_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments" ON payments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM bookings
        WHERE id = booking_id
        AND (customer_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'STAFF', 'SUPER_ADMIN'))
    )
);
