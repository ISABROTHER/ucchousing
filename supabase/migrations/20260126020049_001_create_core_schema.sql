/*
  # UCC Hostel Booker - Core Database Schema

  ## Overview
  This migration creates the foundation for a hostel booking platform with:
  - User profiles for students and owners
  - Hostel listings with amenities and images
  - Booking management
  - Review and rating system
  - Verified badge system

  ## New Tables
  1. **user_profiles** - Extended user information (student or owner)
  2. **hostels** - Hostel listings with details and verified badge
  3. **hostel_amenities** - Link table for flexible amenity management
  4. **amenities** - Master list of amenities
  5. **hostel_images** - Photo gallery for each hostel
  6. **bookings** - Student reservations
  7. **reviews** - Ratings and feedback from students

  ## Security
  - RLS enabled on all tables
  - Students can only view and manage their own bookings/reviews
  - Owners can only manage their own hostels
  - Public read access for hostels, images, and reviews (with some filtering)
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  user_type text NOT NULL CHECK (user_type IN ('student', 'owner')),
  bio text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create hostels table
CREATE TABLE IF NOT EXISTS hostels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  location text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  latitude numeric,
  longitude numeric,
  price_per_night numeric NOT NULL CHECK (price_per_night > 0),
  room_type text NOT NULL CHECK (room_type IN ('dorm', 'private', 'mixed')),
  beds_available integer NOT NULL CHECK (beds_available > 0),
  verified boolean DEFAULT false,
  rating numeric DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create amenities table (master list)
CREATE TABLE IF NOT EXISTS amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon text,
  category text,
  created_at timestamptz DEFAULT now()
);

-- Create hostel_amenities junction table
CREATE TABLE IF NOT EXISTS hostel_amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  amenity_id uuid NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(hostel_id, amenity_id)
);

-- Create hostel_images table
CREATE TABLE IF NOT EXISTS hostel_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order integer DEFAULT 0,
  uploaded_at timestamptz DEFAULT now()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  number_of_nights integer NOT NULL CHECK (number_of_nights > 0),
  total_price numeric NOT NULL CHECK (total_price > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled')),
  special_requests text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_verified_guest boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Public can view all user profiles"
  ON user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Hostels Policies
CREATE POLICY "Anyone can view all hostels"
  ON hostels FOR SELECT
  USING (true);

CREATE POLICY "Owners can create hostels"
  ON hostels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'owner'
    )
  );

CREATE POLICY "Owners can update their own hostels"
  ON hostels FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete their own hostels"
  ON hostels FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Amenities Policies
CREATE POLICY "Anyone can view amenities"
  ON amenities FOR SELECT
  USING (true);

-- Hostel Amenities Policies
CREATE POLICY "Anyone can view hostel amenities"
  ON hostel_amenities FOR SELECT
  USING (true);

CREATE POLICY "Owners can manage hostel amenities"
  ON hostel_amenities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hostels
      WHERE hostels.id = hostel_id
      AND hostels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete hostel amenities"
  ON hostel_amenities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hostels
      WHERE hostels.id = hostel_id
      AND hostels.owner_id = auth.uid()
    )
  );

-- Hostel Images Policies
CREATE POLICY "Anyone can view hostel images"
  ON hostel_images FOR SELECT
  USING (true);

CREATE POLICY "Owners can upload images for their hostels"
  ON hostel_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hostels
      WHERE hostels.id = hostel_id
      AND hostels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete images from their hostels"
  ON hostel_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hostels
      WHERE hostels.id = hostel_id
      AND hostels.owner_id = auth.uid()
    )
  );

-- Bookings Policies
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
      WHERE hostels.id = hostel_id
      AND hostels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Students can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'student'
    )
  );

CREATE POLICY "Students can update their own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Owners can update bookings for their hostels"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hostels
      WHERE hostels.id = hostel_id
      AND hostels.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hostels
      WHERE hostels.id = hostel_id
      AND hostels.owner_id = auth.uid()
    )
  );

-- Reviews Policies
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Students can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'student'
    )
  );

CREATE POLICY "Review authors can update their own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Review authors can delete their own reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (student_id = auth.uid());

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_hostels_city ON hostels(city);
CREATE INDEX IF NOT EXISTS idx_hostels_owner_id ON hostels(owner_id);
CREATE INDEX IF NOT EXISTS idx_hostel_amenities_hostel_id ON hostel_amenities(hostel_id);
CREATE INDEX IF NOT EXISTS idx_hostel_images_hostel_id ON hostel_images(hostel_id);
CREATE INDEX IF NOT EXISTS idx_bookings_student_id ON bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_hostel_id ON bookings(hostel_id);
CREATE INDEX IF NOT EXISTS idx_reviews_hostel_id ON reviews(hostel_id);
CREATE INDEX IF NOT EXISTS idx_reviews_student_id ON reviews(student_id);
