-- Trigger to log booking creation
CREATE OR REPLACE FUNCTION log_booking_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO booking_events (booking_id, actor_id, role, event_type, after_state, metadata)
  VALUES (
    NEW.id, 
    NEW.customer_id, 
    'CUSTOMER', 
    'CREATE_BOOKING', 
    to_jsonb(NEW), 
    jsonb_build_object('description', 'New booking created by customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_booking_creation ON bookings;
CREATE TRIGGER trg_log_booking_creation
AFTER INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION log_booking_creation();

-- Trigger to log booking status changes
CREATE OR REPLACE FUNCTION log_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO booking_events (booking_id, actor_id, role, event_type, before_state, after_state, metadata)
  VALUES (
    NEW.id, 
    auth.uid(), 
    (SELECT role FROM profiles WHERE id = auth.uid()), 
    'STATUS_CHANGE_' || NEW.booking_status, 
    to_jsonb(OLD), 
    to_jsonb(NEW), 
    jsonb_build_object(
      'description', 
      'Booking status updated from ' || OLD.booking_status || ' to ' || NEW.booking_status
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_booking_status_change ON bookings;
CREATE TRIGGER trg_log_booking_status_change
AFTER UPDATE ON bookings
FOR EACH ROW
WHEN (OLD.booking_status IS DISTINCT FROM NEW.booking_status)
EXECUTE FUNCTION log_booking_status_change();
