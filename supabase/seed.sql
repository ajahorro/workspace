-- Seed Business Settings
INSERT INTO business_settings (
  id,
  opening_hour,
  closing_hour,
  slot_duration_minutes,
  max_bookings_per_slot,
  downpayment_threshold,
  downpayment_percentage,
  cancellation_window_hours,
  travel_buffer_minutes,
  gcash_number,
  gcash_name
) VALUES (
  TRUE,
  '09:00',
  '18:00',
  60,
  3,
  5000,
  50,
  24,
  30,
  '09171234567',
  'Admin Account'
) ON CONFLICT (id) DO NOTHING;

-- Seed Services Catalog
-- Exterior
INSERT INTO services (name, category, description, price, duration_minutes) VALUES
('Exterior Wash', 'Exterior', 'Complete exterior hand wash removing dirt, road grime, and contaminants while restoring shine.', 500, 45),
('Wax Protection', 'Exterior', 'Protective wax coating applied to enhance gloss and shield paint from UV rays and contaminants.', 700, 30),
('Tire and Rim Cleaning', 'Exterior', 'Deep cleaning of tires and rims removing brake dust, grease, and accumulated road debris.', 300, 20);

-- Interior
INSERT INTO services (name, category, description, price, duration_minutes) VALUES
('Interior Vacuum', 'Interior', 'Full interior vacuum cleaning including carpets, seats, floor mats, and trunk area.', 400, 30),
('Dashboard Cleaning', 'Interior', 'Cleaning and conditioning of dashboard and interior panels to remove dust and restore finish.', 300, 20),
('Seat Shampoo', 'Interior', 'Deep cleaning treatment removing stains, odors, and dirt from fabric or leather seats.', 800, 45);

-- Specialized
INSERT INTO services (name, category, description, price, duration_minutes) VALUES
('Engine Bay Cleaning', 'Specialized', 'Safe degreasing and detailing of the engine bay to remove oil residue and dirt buildup.', 900, 40),
('Headlight Restoration', 'Specialized', 'Removes oxidation and yellowing from headlights restoring clarity and brightness.', 600, 30),
('Full Detailing Package', 'Specialized', 'Complete interior and exterior detailing service restoring your vehicle inside and out.', 2000, 120);
