-- ==========================================
-- RLS FIX: Ensure Public Read for Services & Pricing
-- ==========================================

-- 1. Services V2
ALTER TABLE services_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read services_v2" ON services_v2;
CREATE POLICY "Public read services_v2" ON services_v2
FOR SELECT USING (true);

-- 2. Service Pricing
ALTER TABLE service_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read service_pricing" ON service_pricing;
CREATE POLICY "Public read service_pricing" ON service_pricing
FOR SELECT USING (true);

-- 3. Verification Query
-- Run this to see if data exists and is accessible
SELECT s.name, p.vehicle_type, p.price 
FROM services_v2 s 
JOIN service_pricing p ON s.id = p.service_id;
