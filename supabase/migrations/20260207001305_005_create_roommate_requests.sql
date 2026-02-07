/*
  # Create Roommate Requests Table

  1. New Tables
    - `roommate_requests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `budget_min` (numeric, minimum budget in GHS)
      - `budget_max` (numeric, maximum budget in GHS)
      - `preferred_location` (text, e.g. "Amamoma", "Ayensu")
      - `lifestyle` (text, e.g. "quiet", "social", "studious")
      - `gender_preference` (text, e.g. "male", "female", "any")
      - `academic_level` (text, e.g. "100", "200", "300", "400", "graduate")
      - `description` (text, free-form description)
      - `is_active` (boolean, whether the request is still open)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - RLS enabled
    - All authenticated users can view active requests
    - Users can only create/update/delete their own requests
*/

CREATE TABLE IF NOT EXISTS roommate_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  budget_min numeric DEFAULT 0 CHECK (budget_min >= 0),
  budget_max numeric DEFAULT 0 CHECK (budget_max >= 0),
  preferred_location text DEFAULT '',
  lifestyle text DEFAULT '' CHECK (
    lifestyle = '' OR lifestyle IN ('quiet', 'social', 'studious', 'flexible')
  ),
  gender_preference text DEFAULT 'any' CHECK (
    gender_preference IN ('male', 'female', 'any')
  ),
  academic_level text DEFAULT '' CHECK (
    academic_level = '' OR academic_level IN ('100', '200', '300', '400', 'graduate')
  ),
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE roommate_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active roommate requests"
  ON roommate_requests FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can create own roommate requests"
  ON roommate_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own roommate requests"
  ON roommate_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own roommate requests"
  ON roommate_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_roommate_requests_user_id ON roommate_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_roommate_requests_active ON roommate_requests(is_active);
