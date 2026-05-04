-- ==========================================
-- SEED DATA: Speedway Autocare Shop Services & Pricing
-- ==========================================

-- 1. RESOURCES
INSERT INTO resources (name) VALUES 
('Bay 1'), 
('Bay 2'), 
('Detailing Area 1'), 
('Detailing Area 2')
ON CONFLICT (name) DO NOTHING;

-- 2. SERVICES & PRICING
DO $$ 
DECLARE
    v_service_id UUID;
BEGIN
    -- Regular Wash
    INSERT INTO services_v2 (name, booking_type, base_duration_hours) 
    VALUES ('Regular Wash', 'STANDARD', 0.5) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES
    (v_service_id, 'SEDAN', 150),
    (v_service_id, 'SUV', 180),
    (v_service_id, 'VAN_L300', 300);

    -- Supreme Wash
    INSERT INTO services_v2 (name, booking_type, base_duration_hours) 
    VALUES ('Supreme Wash', 'STANDARD', 1.5) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES
    (v_service_id, 'SEDAN', 500),
    (v_service_id, 'SUV', 600),
    (v_service_id, 'VAN_L300', 800);

    -- Interior Detailing
    INSERT INTO services_v2 (name, booking_type, base_duration_hours) 
    VALUES ('Interior Detailing', 'EXTENDED', 4.0) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES
    (v_service_id, 'SEDAN', 4500),
    (v_service_id, 'SUV', 5500),
    (v_service_id, 'VAN_L300', 6500);

    -- Exterior Detailing (3 step)
    INSERT INTO services_v2 (name, booking_type, base_duration_hours) 
    VALUES ('Exterior Detailing (3 step)', 'EXTENDED', 5.0) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES
    (v_service_id, 'SEDAN', 5000),
    (v_service_id, 'SUV', 6000),
    (v_service_id, 'VAN_L300', 7000);

    -- Ceramic Coating (Car)
    INSERT INTO services_v2 (name, booking_type, requires_vehicle_stay, allowed_start_time, base_duration_days) 
    VALUES ('Ceramic Coating', 'MULTI_DAY', TRUE, 'NIGHT', 3) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES
    (v_service_id, 'SEDAN', 10000),
    (v_service_id, 'SUV', 13000),
    (v_service_id, 'VAN_L300', 16000);

    -- Motorcycle Services
    INSERT INTO services_v2 (name, booking_type, base_duration_hours) 
    VALUES ('Moto Wash', 'STANDARD', 0.5) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES
    (v_service_id, 'MOTORCYCLE', 120),
    (v_service_id, 'BIG_BIKE', 150);

    INSERT INTO services_v2 (name, booking_type, base_duration_hours) 
    VALUES ('Moto VIP', 'STANDARD', 1.0) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES
    (v_service_id, 'MOTORCYCLE', 250),
    (v_service_id, 'BIG_BIKE', 350);

    -- Add-ons
    INSERT INTO services_v2 (name, booking_type, is_addon, base_duration_hours) 
    VALUES ('Hand Wax', 'STANDARD', TRUE, 0.5) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES
    (v_service_id, 'SEDAN', 200),
    (v_service_id, 'SUV', 300),
    (v_service_id, 'VAN_L300', 400),
    (v_service_id, 'MOTORCYCLE', 150),
    (v_service_id, 'BIG_BIKE', 200);

    -- Engine Wash
    INSERT INTO services_v2 (name, booking_type, base_duration_hours) 
    VALUES ('Engine Wash', 'STANDARD', 1.0) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES
    (v_service_id, 'SEDAN', 500),
    (v_service_id, 'SUV', 800),
    (v_service_id, 'VAN_L300', 1000);

    -- Mags Detailing
    INSERT INTO services_v2 (name, booking_type, base_duration_hours) 
    VALUES ('Mags Detailing', 'STANDARD', 1.5) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES
    (v_service_id, 'SEDAN', 1200),
    (v_service_id, 'SUV', 2000),
    (v_service_id, 'VAN_L300', 2800),
    (v_service_id, 'MOTORCYCLE', 600),
    (v_service_id, 'BIG_BIKE', 1000);

END $$;

-- 3. PACKAGES
DO $$ 
DECLARE
    v_pkg1_id UUID;
    v_pkg2_id UUID;
BEGIN
    INSERT INTO packages_v2 (name) VALUES ('Package 1 (Showroom Shine)') RETURNING id INTO v_pkg1_id;
    INSERT INTO packages_v2 (name) VALUES ('Package 2 (Ultimate Protection)') RETURNING id INTO v_pkg2_id;

    -- Package 1 Services
    INSERT INTO package_services_v2 (package_id, service_id)
    SELECT v_pkg1_id, id FROM services_v2 WHERE name IN ('Supreme Wash', 'Engine Wash', 'Mags Detailing');

    -- Package 2 Services
    INSERT INTO package_services_v2 (package_id, service_id)
    SELECT v_pkg2_id, id FROM services_v2 WHERE name IN ('Supreme Wash', 'Exterior Detailing (3 step)', 'Hand Wax');
END $$;
