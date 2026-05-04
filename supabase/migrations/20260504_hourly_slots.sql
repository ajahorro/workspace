-- ==========================================
-- UPDATE: High-Density Hourly Slots
-- ==========================================

-- 1. Redefine refresh_resource_slots to use hourly intervals
CREATE OR REPLACE FUNCTION refresh_resource_slots() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE 
    v_res_id UUID; 
    v_date DATE; 
    v_start TIMESTAMPTZ; 
    -- Hourly slots from 8:00 AM to 6:00 PM
    v_slot_hours INT[] := ARRAY[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
BEGIN
    FOR v_res_id IN SELECT id FROM resources LOOP
        FOR i IN 0..30 LOOP
            v_date := CURRENT_DATE + i;
            FOR j IN 1..array_length(v_slot_hours, 1) LOOP
                v_start := (v_date + (v_slot_hours[j] || ' hours')::interval)::timestamptz;
                
                -- Check if slot exists first to avoid bloat
                INSERT INTO resource_time_slots (resource_id, slot_start, slot_end)
                VALUES (v_res_id, v_start, v_start + INTERVAL '1 hour')
                ON CONFLICT (resource_id, slot_start) DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;
END;
$$;

-- 2. Run it immediately to populate
SELECT refresh_resource_slots();
