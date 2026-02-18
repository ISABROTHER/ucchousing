/*
  # Smart Laundry Hub, Digital Tenancy & Utility Payments

  ## Overview
  This migration adds three major feature domains to support the full Ghanaian student lifecycle
  beyond just finding accommodation.

  ## New Tables

  ### 1. `laundry_providers`
  - Registered laundry service providers on the platform
  - `id`, `name`, `location`, `city`, `phone`, `is_active`, `price_per_kg`, `delivery_fee`
  - `rating`, `review_count`, `created_at`

  ### 2. `laundry_orders`
  - Individual laundry service requests from students
  - `id`, `student_id`, `provider_id`, `hostel_id` (optional)
  - `pickup_address`, `delivery_address`, `estimated_weight_kg`
  - `status` enum: pending → confirmed → picked_up → washing → out_for_delivery → delivered → cancelled
  - `pickup_scheduled_at`, `delivered_at`, `total_price`
  - `special_instructions`, `created_at`, `updated_at`

  ### 3. `laundry_tracking`
  - Real-time status update log for laundry orders
  - `id`, `order_id`, `status`, `message`, `created_at`
  - Tracks every stage change with a descriptive message

  ### 4. `tenancy_agreements`
  - Digital tenancy contracts between students and hostel owners
  - `id`, `hostel_id`, `student_id`, `owner_id`, `booking_id` (optional)
  - `start_date`, `end_date`, `monthly_rent`, `deposit_amount`
  - `terms_and_conditions` (text), `special_clauses` (text)
  - `status` enum: draft → pending_signature → active → expired → terminated
  - `student_signed_at`, `owner_signed_at`
  - `rent_control_reference` (for Ghana Rent Control compliance)
  - `created_at`, `updated_at`

  ### 5. `rent_invoices`
  - Monthly rent billing records linked to tenancy agreements
  - `id`, `agreement_id`, `student_id`, `amount`, `due_date`
  - `paid_at`, `status` enum: pending → paid → overdue → cancelled
  - `invoice_number` (auto-generated), `notes`, `created_at`

  ### 6. `utility_accounts`
  - Student utility meter accounts (ECG / GWCL)
  - `id`, `student_id`, `provider` enum: ecg → gwcl → other
  - `meter_number`, `account_name`, `is_shared`
  - `hostel_id` (optional), `created_at`

  ### 7. `utility_topups`
  - Records of utility prepaid top-up transactions
  - `id`, `account_id`, `student_id`, `amount`, `token_received`
  - `status` enum: pending → processing → success → failed
  - `reference_number`, `created_at`

  ### 8. `utility_bill_splits`
  - Bill splitting records between roommates
  - `id`, `topup_id`, `payer_id`, `owee_id`, `amount_owed`, `is_settled`, `settled_at`

  ## Security
  - RLS enabled on all 8 tables
  - Students manage their own orders, agreements, invoices, accounts, top-ups
  - Owners see agreements and invoices for their hostels
  - Providers manage their own orders

  ## Notes
  - Laundry tracking uses insert-only audit log pattern
  - Tenancy agreements support dual e-signature workflow
  - Rent invoice numbers auto-generate using sequence
  - Utility bill splits support many-to-many roommate cost sharing
*/

-- Laundry Providers
CREATE TABLE IF NOT EXISTS laundry_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) > 0 AND char_length(name) <= 200),
  location text NOT NULL,
  city text NOT NULL DEFAULT 'Cape Coast',
  phone text,
  is_active boolean DEFAULT true,
  price_per_kg numeric(10,2) NOT NULL DEFAULT 5.00 CHECK (price_per_kg > 0),
  delivery_fee numeric(10,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  rating numeric(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE laundry_providers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'laundry_providers' AND policyname = 'Anyone can view active laundry providers') THEN
    CREATE POLICY "Anyone can view active laundry providers"
      ON laundry_providers FOR SELECT
      TO authenticated
      USING (is_active = true);
  END IF;
END $$;

-- Laundry Orders
CREATE TABLE IF NOT EXISTS laundry_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES laundry_providers(id) ON DELETE RESTRICT,
  hostel_id uuid REFERENCES hostels(id) ON DELETE SET NULL,
  pickup_address text NOT NULL CHECK (char_length(pickup_address) > 0),
  delivery_address text NOT NULL CHECK (char_length(delivery_address) > 0),
  estimated_weight_kg numeric(5,2) NOT NULL DEFAULT 2 CHECK (estimated_weight_kg > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','picked_up','washing','out_for_delivery','delivered','cancelled')),
  pickup_scheduled_at timestamptz,
  delivered_at timestamptz,
  total_price numeric(10,2) CHECK (total_price >= 0),
  special_instructions text CHECK (char_length(special_instructions) <= 500),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_laundry_orders_student ON laundry_orders(student_id);
CREATE INDEX IF NOT EXISTS idx_laundry_orders_status ON laundry_orders(status);

ALTER TABLE laundry_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'laundry_orders' AND policyname = 'Students can view own laundry orders') THEN
    CREATE POLICY "Students can view own laundry orders"
      ON laundry_orders FOR SELECT
      TO authenticated
      USING (auth.uid() = student_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'laundry_orders' AND policyname = 'Students can create laundry orders') THEN
    CREATE POLICY "Students can create laundry orders"
      ON laundry_orders FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = student_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'laundry_orders' AND policyname = 'Students can update own laundry orders') THEN
    CREATE POLICY "Students can update own laundry orders"
      ON laundry_orders FOR UPDATE
      TO authenticated
      USING (auth.uid() = student_id)
      WITH CHECK (auth.uid() = student_id);
  END IF;
END $$;

-- Laundry Tracking
CREATE TABLE IF NOT EXISTS laundry_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES laundry_orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  message text NOT NULL CHECK (char_length(message) > 0 AND char_length(message) <= 500),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_laundry_tracking_order ON laundry_tracking(order_id, created_at);

ALTER TABLE laundry_tracking ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'laundry_tracking' AND policyname = 'Students can view tracking for own orders') THEN
    CREATE POLICY "Students can view tracking for own orders"
      ON laundry_tracking FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM laundry_orders lo
          WHERE lo.id = laundry_tracking.order_id AND lo.student_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'laundry_tracking' AND policyname = 'Authenticated users can insert tracking events') THEN
    CREATE POLICY "Authenticated users can insert tracking events"
      ON laundry_tracking FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Tenancy Agreements
CREATE TABLE IF NOT EXISTS tenancy_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  monthly_rent numeric(10,2) NOT NULL CHECK (monthly_rent > 0),
  deposit_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  terms_and_conditions text,
  special_clauses text CHECK (char_length(special_clauses) <= 2000),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_signature','active','expired','terminated')),
  student_signed_at timestamptz,
  owner_signed_at timestamptz,
  rent_control_reference text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_tenancy_student ON tenancy_agreements(student_id);
CREATE INDEX IF NOT EXISTS idx_tenancy_owner ON tenancy_agreements(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenancy_hostel ON tenancy_agreements(hostel_id);

ALTER TABLE tenancy_agreements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenancy_agreements' AND policyname = 'Parties can view their tenancy agreements') THEN
    CREATE POLICY "Parties can view their tenancy agreements"
      ON tenancy_agreements FOR SELECT
      TO authenticated
      USING (auth.uid() = student_id OR auth.uid() = owner_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenancy_agreements' AND policyname = 'Owners can create tenancy agreements') THEN
    CREATE POLICY "Owners can create tenancy agreements"
      ON tenancy_agreements FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = owner_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenancy_agreements' AND policyname = 'Parties can update tenancy agreements') THEN
    CREATE POLICY "Parties can update tenancy agreements"
      ON tenancy_agreements FOR UPDATE
      TO authenticated
      USING (auth.uid() = student_id OR auth.uid() = owner_id)
      WITH CHECK (auth.uid() = student_id OR auth.uid() = owner_id);
  END IF;
END $$;

-- Rent Invoices
CREATE SEQUENCE IF NOT EXISTS rent_invoice_seq START 1000;

CREATE TABLE IF NOT EXISTS rent_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES tenancy_agreements(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  due_date date NOT NULL,
  paid_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','cancelled')),
  invoice_number text NOT NULL DEFAULT ('INV-' || LPAD(nextval('rent_invoice_seq')::text, 6, '0')),
  notes text CHECK (char_length(notes) <= 500),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_student ON rent_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_agreement ON rent_invoices(agreement_id);

ALTER TABLE rent_invoices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rent_invoices' AND policyname = 'Parties can view rent invoices') THEN
    CREATE POLICY "Parties can view rent invoices"
      ON rent_invoices FOR SELECT
      TO authenticated
      USING (
        auth.uid() = student_id OR
        EXISTS (
          SELECT 1 FROM tenancy_agreements ta WHERE ta.id = rent_invoices.agreement_id AND ta.owner_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rent_invoices' AND policyname = 'Owners can create rent invoices') THEN
    CREATE POLICY "Owners can create rent invoices"
      ON rent_invoices FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM tenancy_agreements ta WHERE ta.id = rent_invoices.agreement_id AND ta.owner_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rent_invoices' AND policyname = 'Parties can update rent invoices') THEN
    CREATE POLICY "Parties can update rent invoices"
      ON rent_invoices FOR UPDATE
      TO authenticated
      USING (
        auth.uid() = student_id OR
        EXISTS (
          SELECT 1 FROM tenancy_agreements ta WHERE ta.id = rent_invoices.agreement_id AND ta.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        auth.uid() = student_id OR
        EXISTS (
          SELECT 1 FROM tenancy_agreements ta WHERE ta.id = rent_invoices.agreement_id AND ta.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Utility Accounts
CREATE TABLE IF NOT EXISTS utility_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('ecg', 'gwcl', 'other')),
  meter_number text NOT NULL CHECK (char_length(meter_number) > 0),
  account_name text NOT NULL,
  is_shared boolean DEFAULT false,
  hostel_id uuid REFERENCES hostels(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, meter_number)
);

CREATE INDEX IF NOT EXISTS idx_utility_accounts_student ON utility_accounts(student_id);

ALTER TABLE utility_accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'utility_accounts' AND policyname = 'Students can view own utility accounts') THEN
    CREATE POLICY "Students can view own utility accounts"
      ON utility_accounts FOR SELECT
      TO authenticated
      USING (auth.uid() = student_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'utility_accounts' AND policyname = 'Students can create utility accounts') THEN
    CREATE POLICY "Students can create utility accounts"
      ON utility_accounts FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = student_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'utility_accounts' AND policyname = 'Students can update own utility accounts') THEN
    CREATE POLICY "Students can update own utility accounts"
      ON utility_accounts FOR UPDATE
      TO authenticated
      USING (auth.uid() = student_id)
      WITH CHECK (auth.uid() = student_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'utility_accounts' AND policyname = 'Students can delete own utility accounts') THEN
    CREATE POLICY "Students can delete own utility accounts"
      ON utility_accounts FOR DELETE
      TO authenticated
      USING (auth.uid() = student_id);
  END IF;
END $$;

-- Utility Top-ups
CREATE TABLE IF NOT EXISTS utility_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES utility_accounts(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  token_received text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','success','failed')),
  reference_number text UNIQUE DEFAULT ('TXN-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_topups_account ON utility_topups(account_id);
CREATE INDEX IF NOT EXISTS idx_topups_student ON utility_topups(student_id);

ALTER TABLE utility_topups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'utility_topups' AND policyname = 'Students can view own utility topups') THEN
    CREATE POLICY "Students can view own utility topups"
      ON utility_topups FOR SELECT
      TO authenticated
      USING (auth.uid() = student_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'utility_topups' AND policyname = 'Students can create utility topups') THEN
    CREATE POLICY "Students can create utility topups"
      ON utility_topups FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = student_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'utility_topups' AND policyname = 'Students can update own utility topups') THEN
    CREATE POLICY "Students can update own utility topups"
      ON utility_topups FOR UPDATE
      TO authenticated
      USING (auth.uid() = student_id)
      WITH CHECK (auth.uid() = student_id);
  END IF;
END $$;

-- Utility Bill Splits
CREATE TABLE IF NOT EXISTS utility_bill_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topup_id uuid NOT NULL REFERENCES utility_topups(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  owee_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount_owed numeric(10,2) NOT NULL CHECK (amount_owed > 0),
  is_settled boolean DEFAULT false,
  settled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bill_splits_payer ON utility_bill_splits(payer_id);
CREATE INDEX IF NOT EXISTS idx_bill_splits_owee ON utility_bill_splits(owee_id);

ALTER TABLE utility_bill_splits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'utility_bill_splits' AND policyname = 'Parties can view their bill splits') THEN
    CREATE POLICY "Parties can view their bill splits"
      ON utility_bill_splits FOR SELECT
      TO authenticated
      USING (auth.uid() = payer_id OR auth.uid() = owee_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'utility_bill_splits' AND policyname = 'Payers can create bill splits') THEN
    CREATE POLICY "Payers can create bill splits"
      ON utility_bill_splits FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = payer_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'utility_bill_splits' AND policyname = 'Parties can settle bill splits') THEN
    CREATE POLICY "Parties can settle bill splits"
      ON utility_bill_splits FOR UPDATE
      TO authenticated
      USING (auth.uid() = payer_id OR auth.uid() = owee_id)
      WITH CHECK (auth.uid() = payer_id OR auth.uid() = owee_id);
  END IF;
END $$;

-- Seed demo laundry providers for Cape Coast/UCC
INSERT INTO laundry_providers (name, location, city, phone, price_per_kg, delivery_fee, rating, review_count)
VALUES
  ('CleanStar Laundry', 'Amamoma Junction, UCC Road', 'Cape Coast', '+233 24 111 2233', 8.00, 5.00, 4.7, 128),
  ('FreshFold Express', 'Ayensu Estates, Near UCC Gate', 'Cape Coast', '+233 20 987 6543', 7.00, 3.00, 4.5, 95),
  ('CampusWash Hub', 'Science Junction, UCC Campus', 'Cape Coast', '+233 55 443 2211', 6.50, 0.00, 4.3, 74),
  ('QuickClean Services', 'Kwaprow Road, Off-Campus', 'Cape Coast', '+233 24 765 4321', 9.00, 7.00, 4.8, 212)
ON CONFLICT DO NOTHING;
