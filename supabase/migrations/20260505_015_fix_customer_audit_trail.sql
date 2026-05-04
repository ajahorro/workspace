-- 1. Fix Profiles RLS: Allow users to see names/roles of people involved in their bookings
-- This is essential for the Activity Trail to show WHO did WHAT.
DROP POLICY IF EXISTS "Users can view relevant profiles" ON profiles;
CREATE POLICY "Users can view relevant profiles" ON profiles
  FOR SELECT USING (
    id = auth.uid() -- Can always see own profile
    OR EXISTS (
      SELECT 1 FROM bookings_v2 b
      WHERE (b.customer_id = auth.uid() AND (b.staff_id = profiles.id OR profiles.role IN ('ADMIN', 'SUPER_ADMIN')))
      OR (b.staff_id = auth.uid() AND (b.customer_id = profiles.id OR profiles.role IN ('ADMIN', 'SUPER_ADMIN')))
    )
    OR get_my_role() IN ('ADMIN', 'SUPER_ADMIN') -- Admins see all
  );

-- 2. Audit Triggers for bookings_v2
-- We need to replace the old triggers that were targeting the 'bookings' table.

-- Function to log creation
CREATE OR REPLACE FUNCTION log_booking_creation_v2()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO booking_events (booking_id, actor_id, event_type, metadata)
  VALUES (
    NEW.id, 
    NEW.customer_id, 
    'CREATE', 
    jsonb_build_object('details', 'Booking created by customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_booking_creation_v2 ON bookings_v2;
CREATE TRIGGER trg_log_booking_creation_v2
AFTER INSERT ON bookings_v2
FOR EACH ROW
EXECUTE FUNCTION log_booking_creation_v2();

-- Function to log status changes
CREATE OR REPLACE FUNCTION log_booking_status_change_v2()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO booking_events (booking_id, actor_id, event_type, metadata)
  VALUES (
    NEW.id, 
    auth.uid(), 
    'STATUS_CHANGED', 
    jsonb_build_object(
      'details', 'Status updated from ' || OLD.status || ' to ' || NEW.status,
      'old_status', OLD.status,
      'new_status', NEW.status
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_booking_status_change_v2 ON bookings_v2;
CREATE TRIGGER trg_log_booking_status_change_v2
AFTER UPDATE ON bookings_v2
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION log_booking_status_change_v2();

-- 3. Backfill: If there are existing bookings without a 'CREATE' event, add one.
INSERT INTO booking_events (booking_id, actor_id, event_type, metadata, created_at)
SELECT id, customer_id, 'CREATE', jsonb_build_object('details', 'Initial booking record'), created_at
FROM bookings_v2 b
WHERE NOT EXISTS (
  SELECT 1 FROM booking_events e 
  WHERE e.booking_id = b.id AND e.event_type = 'CREATE'
);

NOTIFY pgrst, 'reload schema';
