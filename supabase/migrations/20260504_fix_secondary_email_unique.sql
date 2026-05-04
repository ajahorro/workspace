-- Remove the unique constraint on secondary_email to allow multiple staff members
-- to have a null or empty secondary email before they set it.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_secondary_email_key;
