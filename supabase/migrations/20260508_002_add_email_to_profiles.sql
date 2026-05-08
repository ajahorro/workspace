-- ==========================================
-- FIX: MISSING EMAIL COLUMN IN PROFILES
-- Adding email column to profiles table as required by the schema and app logic
-- ==========================================

ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update existing profiles from auth.users if possible
DO $$ 
BEGIN
  UPDATE profiles p
  SET email = u.email
  FROM auth.users u
  WHERE p.id = u.id AND p.email IS NULL;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if auth.users is not accessible in this context
END $$;
