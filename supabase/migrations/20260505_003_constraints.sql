-- ==========================================
-- DATA INTEGRITY CONSTRAINTS
-- ==========================================

-- 1. Price must be non-negative
ALTER TABLE bookings_v2
  DROP CONSTRAINT IF EXISTS positive_price;
ALTER TABLE bookings_v2
  ADD CONSTRAINT positive_price CHECK (total_price >= 0);

-- 2. End must be after start
ALTER TABLE bookings_v2
  DROP CONSTRAINT IF EXISTS valid_time_range;
ALTER TABLE bookings_v2
  ADD CONSTRAINT valid_time_range CHECK (end_datetime > start_datetime);

-- 3. DB-level exclusion constraint (makes race conditions impossible)
-- btree_gist already enabled from redesign migration
-- Only add if the existing 'no_overlap' constraint doesn't cover it
DO $$
BEGIN
  -- Check if we already have the constraint from the redesign migration
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'no_overlap' 
    AND conrelid = 'bookings_v2'::regclass
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'no_overlapping_bookings' 
    AND conrelid = 'bookings_v2'::regclass
  ) THEN
    ALTER TABLE bookings_v2
    ADD CONSTRAINT no_overlapping_bookings
    EXCLUDE USING gist (
      resource_id WITH =,
      tstzrange(start_datetime, end_datetime) WITH &&
    ) WHERE (status = 'scheduled');
  END IF;
END $$;
