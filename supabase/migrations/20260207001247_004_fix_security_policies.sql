/*
  # Fix Security Policies

  1. Fixes
    - Fix bookings owner SELECT policy: was using `hostels.id = hostels.id` (self-referencing, always true)
      Now correctly uses `hostels.id = bookings.hostel_id`
    - Allow authenticated users to read other user profiles (needed for reviews and booking details)
      Changed from own-profile-only to all-authenticated-can-read
    - Add `housing_type` column to hostels for campus categorization

  2. Security
    - Bookings owner policy now correctly scoped to only their hostel bookings
    - User profiles readable by all authenticated users (names needed in reviews/bookings)
    - Users can still only UPDATE their own profile

  3. Schema Changes
    - Added `housing_type` column to hostels table (nullable, for categorization)
*/

-- Fix the bookings owner SELECT policy
DROP POLICY IF EXISTS "Owners can view bookings for their hostels" ON bookings;

CREATE POLICY "Owners can view bookings for their hostels"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hostels
      WHERE hostels.id = bookings.hostel_id
      AND hostels.owner_id = auth.uid()
    )
  );

-- Fix user_profiles SELECT policy: allow all authenticated users to read profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Add housing_type column to hostels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hostels' AND column_name = 'housing_type'
  ) THEN
    ALTER TABLE hostels ADD COLUMN housing_type text CHECK (
      housing_type IS NULL OR housing_type IN ('new_site', 'old_site', 'outside_campus', 'traditional_halls')
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hostels_housing_type ON hostels(housing_type);
