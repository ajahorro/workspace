-- Fix missing columns in services_v2 expected by the frontend
ALTER TABLE services_v2 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'EXTERIOR',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0; -- Keep legacy price for landing page compatibility
-- Sync data from legacy services if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'services') THEN
    UPDATE services_v2 s2
    SET 
      description = s.description,
      category = s.category,
      is_active = s.is_active,
      price = s.price
    FROM services s
    WHERE s2.name = s.name;
  END IF;
END $$;
