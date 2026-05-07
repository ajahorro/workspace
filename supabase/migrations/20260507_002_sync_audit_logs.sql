-- 1. Tighten Audit Logs RLS (Security)
-- Customers should only see audit logs for their own bookings.
-- Admins/Staff can see all or relevant logs.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can see relevant audit logs" ON public.audit_logs;

CREATE POLICY "Users can see relevant audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings_v2 b
      WHERE b.id = audit_logs.booking_id
      AND (
        b.customer_id = auth.uid() 
        OR b.staff_id = auth.uid()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
      )
    )
  );

-- 2. Trigger to automatically populate audit_logs from booking_events
-- This ensures that any action logged in booking_events (via existing triggers)
-- automatically appears in the system-wide Audit Logs / System Activity panels.

CREATE OR REPLACE FUNCTION sync_booking_event_to_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_name TEXT;
    v_actor_role TEXT;
    v_details TEXT;
BEGIN
    -- Get actor details from profiles
    SELECT full_name, role INTO v_actor_name, v_actor_role 
    FROM profiles WHERE id = NEW.actor_id;
    
    -- Fallback for system actions
    IF v_actor_name IS NULL THEN
        v_actor_name := 'System';
        v_actor_role := 'SYSTEM';
    END IF;

    -- Extract details from metadata
    v_details := NEW.metadata->>'details';
    IF v_details IS NULL THEN
        v_details := NEW.event_type || ' action performed';
    END IF;

    -- Insert into audit_logs
    INSERT INTO public.audit_logs (booking_id, action_type, details, actor_name, actor_role, created_at)
    VALUES (NEW.booking_id, NEW.event_type, v_details, v_actor_name, v_actor_role, NEW.created_at);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_booking_event_to_audit_log ON booking_events;
CREATE TRIGGER trg_sync_booking_event_to_audit_log
AFTER INSERT ON booking_events
FOR EACH ROW
EXECUTE FUNCTION sync_booking_event_to_audit_log();

-- 3. Backfill any missing audit_logs from booking_events
INSERT INTO public.audit_logs (booking_id, action_type, details, actor_name, actor_role, created_at)
SELECT 
    e.booking_id, 
    e.event_type, 
    COALESCE(e.metadata->>'details', e.event_type || ' action performed'),
    COALESCE(p.full_name, 'System'),
    COALESCE(p.role::text, 'SYSTEM'),
    e.created_at
FROM booking_events e
LEFT JOIN profiles p ON e.actor_id = p.id
WHERE NOT EXISTS (
    SELECT 1 FROM audit_logs al 
    WHERE al.booking_id = e.booking_id 
    AND al.created_at = e.created_at
);
