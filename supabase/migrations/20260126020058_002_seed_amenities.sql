/*
  # Seed Amenities Data

  ## Overview
  This migration populates the amenities table with common hostel amenities.
  These will be available for hostel owners to assign to their listings.
*/

INSERT INTO amenities (name, icon, category) VALUES
  ('WiFi', 'wifi', 'connectivity'),
  ('Air Conditioning', 'wind', 'comfort'),
  ('Heating', 'flame', 'comfort'),
  ('Hot Water', 'droplets', 'bathroom'),
  ('Breakfast Included', 'coffee', 'meals'),
  ('Kitchen Access', 'utensils', 'meals'),
  ('Laundry', 'washer', 'services'),
  ('Gym', 'dumbbell', 'fitness'),
  ('Common Area', 'users', 'social'),
  ('TV Room', 'tv', 'entertainment'),
  ('Gaming Console', 'gamepad2', 'entertainment'),
  ('Pool', 'waves', 'recreation'),
  ('Parking', 'car', 'parking'),
  ('Bike Rental', 'bike', 'transportation'),
  ('Tours Arranged', 'map', 'services'),
  ('Security Deposit', 'lock', 'policies'),
  ('24/7 Reception', 'clock', 'services'),
  ('Wheelchair Accessible', 'accessibility', 'accessibility'),
  ('Pet Friendly', 'paw-print', 'policies'),
  ('Quiet Hours', 'volume-x', 'policies')
ON CONFLICT (name) DO NOTHING;
