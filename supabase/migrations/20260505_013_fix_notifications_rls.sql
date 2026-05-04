-- Add INSERT policy for notifications to allow system and admin to create them
DROP POLICY IF EXISTS "Anyone can insert notifications" ON notifications;
CREATE POLICY "Anyone can insert notifications" ON notifications
FOR INSERT WITH CHECK (true);

-- Ensure Admin can see all notifications (useful for debugging)
DROP POLICY IF EXISTS "Admin view all notifications" ON notifications;
CREATE POLICY "Admin view all notifications" ON notifications
FOR SELECT USING (
  auth.uid() = user_id OR 
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
);
