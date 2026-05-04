-- Ensure bookings_v2 has staff_id column
ALTER TABLE bookings_v2 ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES profiles(id);

-- Update RLS policies just in case they were stuck
DROP POLICY IF EXISTS "Staff read assigned bookings" ON bookings_v2;
CREATE POLICY "Staff read assigned bookings" ON bookings_v2
  FOR SELECT USING (auth.uid() = staff_id);

DROP POLICY IF EXISTS "Staff update assigned bookings" ON bookings_v2;
CREATE POLICY "Staff update assigned bookings" ON bookings_v2
  FOR UPDATE USING (auth.uid() = staff_id);
