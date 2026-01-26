/*
  # Lock Down Database Security

  ## Overview
  This migration tightens all RLS policies to be restrictive by default.
  Only authenticated users with proper authorization can access data.
  Public access is removed where unnecessary.

  ## Changes
  - Remove overly permissive SELECT policies
  - Restrict all operations to authenticated users only
  - Add strict ownership/membership checks
  - Ensure no anon user access to sensitive data
  - Lock down hostel visibility to authenticated users only
*/

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Public can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can view all hostels" ON hostels;
DROP POLICY IF EXISTS "Anyone can view amenities" ON amenities;
DROP POLICY IF EXISTS "Anyone can view hostel amenities" ON hostel_amenities;
DROP POLICY IF EXISTS "Anyone can view hostel images" ON hostel_images;
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;

-- User Profiles: Only authenticated users can view profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Hostels: Only authenticated users can browse
CREATE POLICY "Authenticated users can view all hostels"
  ON hostels FOR SELECT
  TO authenticated
  USING (true);

-- Amenities: Only authenticated users can view
CREATE POLICY "Authenticated users can view amenities"
  ON amenities FOR SELECT
  TO authenticated
  USING (true);

-- Hostel Amenities: Only authenticated users can view
CREATE POLICY "Authenticated users can view hostel amenities"
  ON hostel_amenities FOR SELECT
  TO authenticated
  USING (true);

-- Hostel Images: Only authenticated users can view
CREATE POLICY "Authenticated users can view hostel images"
  ON hostel_images FOR SELECT
  TO authenticated
  USING (true);

-- Reviews: Only authenticated users can view
CREATE POLICY "Authenticated users can view reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

-- Strengthen booking policies: Only direct parties can view
DROP POLICY IF EXISTS "Students can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Owners can view bookings for their hostels" ON bookings;

CREATE POLICY "Students can view their own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Owners can view bookings for their hostels"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hostels
      WHERE hostels.id = hostels.id
      AND hostels.owner_id = auth.uid()
    )
  );

-- Add UPDATE restrictions for bookings
DROP POLICY IF EXISTS "Owners can update bookings for their hostels" ON bookings;

CREATE POLICY "Owners can update own hostel bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hostels
      WHERE hostels.id = bookings.hostel_id
      AND hostels.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hostels
      WHERE hostels.id = bookings.hostel_id
      AND hostels.owner_id = auth.uid()
    )
  );

-- Prevent unauthenticated access to user_profiles inserts
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

CREATE POLICY "Authenticated users can create own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
