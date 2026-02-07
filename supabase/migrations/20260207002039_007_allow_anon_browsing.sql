/*
  # Allow Anonymous Browsing

  1. Changes
    - Allow unauthenticated users to browse hostels, images, and amenities
    - This is needed so visitors can search and view hostel listings before signing up
    - Reviews remain visible to authenticated users only

  2. Security
    - Only SELECT policies are added for anon users
    - No write access is granted to unauthenticated users
*/

-- Allow anyone to view hostels (needed for browsing)
DROP POLICY IF EXISTS "Authenticated users can view all hostels" ON hostels;
CREATE POLICY "Anyone can view hostels"
  ON hostels FOR SELECT
  USING (true);

-- Allow anyone to view hostel images
DROP POLICY IF EXISTS "Authenticated users can view hostel images" ON hostel_images;
CREATE POLICY "Anyone can view hostel images"
  ON hostel_images FOR SELECT
  USING (true);

-- Allow anyone to view amenities
DROP POLICY IF EXISTS "Authenticated users can view amenities" ON amenities;
CREATE POLICY "Anyone can view amenities"
  ON amenities FOR SELECT
  USING (true);

-- Allow anyone to view hostel amenities
DROP POLICY IF EXISTS "Authenticated users can view hostel amenities" ON hostel_amenities;
CREATE POLICY "Anyone can view hostel amenities"
  ON hostel_amenities FOR SELECT
  USING (true);
