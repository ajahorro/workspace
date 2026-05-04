-- Migration: Add was_staff flag to distinguish deactivated staff from regular customers
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS was_staff BOOLEAN DEFAULT FALSE;

-- Update existing staff to have was_staff = true
UPDATE profiles SET was_staff = true WHERE role = 'STAFF';
