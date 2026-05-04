-- ==========================================
-- PRODUCTION DATA: Speedway Autocare Shop Services & Pricing (FULL REFRESH)
-- ==========================================

-- 1. CLEAR OLD DATA
TRUNCATE service_pricing CASCADE;
TRUNCATE services_v2 CASCADE;

-- 2. INSERT SERVICES & PRICING
DO $$ 
DECLARE 
    v_service_id UUID;
BEGIN
    -- REGULAR WASH
    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Regular Wash', 'STANDARD', FALSE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 150), (v_service_id, 'SUV', 180), (v_service_id, 'VAN_L300', 300);

    -- SUPREME WASH
    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Supreme Wash', 'STANDARD', FALSE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 500), (v_service_id, 'SUV', 600), (v_service_id, 'VAN_L300', 800);

    -- SPOT REMOVAL
    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Spot Removal', 'STANDARD', FALSE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 1000), (v_service_id, 'SUV', 1500), (v_service_id, 'VAN_L300', 2000);

    -- ACID RAIN REMOVAL (HAND)
    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Acid Rain Removal (Hand)', 'STANDARD', FALSE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 600), (v_service_id, 'SUV', 800), (v_service_id, 'VAN_L300', 1000);

    -- ACID RAIN REMOVAL (BUFF)
    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Acid Rain Removal (Buff Machine)', 'STANDARD', FALSE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 1000), (v_service_id, 'SUV', 1500), (v_service_id, 'VAN_L300', 2000);

    -- ENGINE WASH
    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Engine Wash', 'STANDARD', FALSE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 500), (v_service_id, 'SUV', 800), (v_service_id, 'VAN_L300', 1000);

    -- BACK TO ZERO
    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Back to Zero', 'STANDARD', FALSE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 350), (v_service_id, 'SUV', 400), (v_service_id, 'VAN_L300', 600);

    -- HEADLIGHT POLISH
    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Headlight Polish', 'STANDARD', FALSE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 800), (v_service_id, 'SUV', 1000), (v_service_id, 'VAN_L300', 1300);

    -- ASPHALT REMOVAL
    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Asphalt Removal', 'STANDARD', FALSE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 700), (v_service_id, 'SUV', 900), (v_service_id, 'VAN_L300', 1200), (v_service_id, 'MOTORCYCLE', 600), (v_service_id, 'BIG_BIKE', 900);

    -- SEAT COVER IN/OUT
    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Seat Cover In/Out', 'STANDARD', FALSE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 500), (v_service_id, 'SUV', 800), (v_service_id, 'VAN_L300', 1200);

    -- CEILING CLEANING
    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Ceiling Cleaning', 'STANDARD', FALSE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 700), (v_service_id, 'SUV', 1000), (v_service_id, 'VAN_L300', 1300);

    -- BUFF WAXX (MACHINE)
    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Buff Waxx (Machine)', 'STANDARD', FALSE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 1000), (v_service_id, 'SUV', 1500), (v_service_id, 'VAN_L300', 2500);

    -- INTERIOR DETAILING
    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Interior Detailing', 'EXTENDED', FALSE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 4500), (v_service_id, 'SUV', 5500), (v_service_id, 'VAN_L300', 6500);

    -- EXTERIOR DETAILING (3 STEP)
    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Exterior Detailing (3 Step)', 'EXTENDED', FALSE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 5000), (v_service_id, 'SUV', 6000), (v_service_id, 'VAN_L300', 7000);

    -- CERAMIC COATING
    INSERT INTO services_v2 (name, booking_type, is_addon, base_duration_days, allowed_start_time, requires_vehicle_stay) 
    VALUES ('Ceramic Coating', 'MULTI_DAY', FALSE, 3, 'NIGHT', TRUE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 10000), (v_service_id, 'SUV', 13000), (v_service_id, 'VAN_L300', 16000), (v_service_id, 'MOTORCYCLE', 3500), (v_service_id, 'BIG_BIKE', 5500);

    -- MAGS DETAILING
    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Mags Detailing', 'STANDARD', FALSE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 1200), (v_service_id, 'SUV', 2000), (v_service_id, 'VAN_L300', 2800), (v_service_id, 'MOTORCYCLE', 600), (v_service_id, 'BIG_BIKE', 1000);

    -- PACKAGES
    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Package 1 (Showroom Shine)', 'EXTENDED', FALSE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 2500), (v_service_id, 'SUV', 3500);

    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Package 2 (Ultimate Protection)', 'EXTENDED', FALSE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 3500), (v_service_id, 'SUV', 4500);

    -- MOTORCYCLE SPECIFIC
    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Moto Wash', 'STANDARD', FALSE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'MOTORCYCLE', 120), (v_service_id, 'BIG_BIKE', 150);

    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Moto VIP', 'STANDARD', FALSE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'MOTORCYCLE', 250), (v_service_id, 'BIG_BIKE', 350);

    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Moto Detail', 'EXTENDED', FALSE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'MOTORCYCLE', 2500), (v_service_id, 'BIG_BIKE', 3000);

    -- ADD-ONS
    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Add-on Waxx', 'STANDARD', TRUE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 200), (v_service_id, 'SUV', 300), (v_service_id, 'VAN_L300', 400);

    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Add-on Highgloss', 'STANDARD', TRUE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 200), (v_service_id, 'SUV', 300), (v_service_id, 'VAN_L300', 400), (v_service_id, 'MOTORCYCLE', 100), (v_service_id, 'BIG_BIKE', 150);

    INSERT INTO services_v2 (name, booking_type, is_addon) VALUES ('Add-on Degreaser', 'STANDARD', TRUE) RETURNING id INTO v_service_id;
    INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES 
    (v_service_id, 'SEDAN', 200), (v_service_id, 'SUV', 300), (v_service_id, 'VAN_L300', 400), (v_service_id, 'MOTORCYCLE', 100), (v_service_id, 'BIG_BIKE', 150);

END $$;
