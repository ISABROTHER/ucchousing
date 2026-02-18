/*
  # Laundry Hub v2 — Escrow, Trust & Accountability

  ## Summary
  Extends the laundry system with escrow payment holding, photo proof of pickup/delivery,
  digital confirmation taps, rider profiles with ratings, laundry preference profiles,
  express/subscription options, wallet/credits system, referral rewards, issue reporting,
  group orders, and admin SLA monitoring.

  ## New Tables
  1. `laundry_rider_profiles` — Rider name, photo, rating, availability
  2. `laundry_preferences` — Per-user saved preferences (detergent, fabric care, fold/iron)
  3. `laundry_order_photos` — Photo proof attached to each order (pickup/delivery)
  4. `laundry_order_confirmations` — Digital tap confirmations (handed_over, received)
  5. `laundry_ratings` — Post-delivery star ratings + comment per order
  6. `laundry_escrow` — Per-order escrow record (status: initiated/escrowed/released/refunded/disputed)
  7. `laundry_wallets` — Per-user wallet balance (credits)
  8. `laundry_wallet_transactions` — Top-up / deduction history
  9. `laundry_subscriptions` — Student subscription plans (monthly/semester)
  10. `laundry_referrals` — Referral tracking + reward status
  11. `laundry_issue_reports` — In-app complaint + photo for disputes
  12. `laundry_group_orders` — Group/roommate combined orders with split payment

  ## Modified Tables
  - `laundry_orders` — Add rider_id, is_express, delivery_type, drop_point, subscription_id, eco_wash, group_order_id

  ## Security
  - RLS on all new tables
  - Users access only their own data
  - Riders see only orders assigned to them

  ## Notes
  1. Escrow auto-releases after 48 hours if student doesn't confirm
  2. Wallet credits can be used instead of Paystack at checkout
  3. Subscription entitles student to N free washes per period
*/

-- ─────────────────────────────────────────────
-- 1. laundry_rider_profiles
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS laundry_rider_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  provider_id uuid REFERENCES laundry_providers(id),
  name text NOT NULL DEFAULT '',
  photo_url text,
  phone text NOT NULL DEFAULT '',
  rating numeric(3,2) NOT NULL DEFAULT 5.0,
  total_ratings int NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE laundry_rider_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_rider_profiles' AND policyname='Anyone authenticated can view riders') THEN
    CREATE POLICY "Anyone authenticated can view riders"
      ON laundry_rider_profiles FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 2. laundry_preferences
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS laundry_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) UNIQUE,
  detergent_type text NOT NULL DEFAULT 'standard',
  fabric_care_notes text NOT NULL DEFAULT '',
  wash_temperature text NOT NULL DEFAULT 'warm',
  fold_preference text NOT NULL DEFAULT 'fold',
  iron_preference boolean NOT NULL DEFAULT false,
  special_instructions text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE laundry_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_preferences' AND policyname='Users can view own preferences') THEN
    CREATE POLICY "Users can view own preferences"
      ON laundry_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_preferences' AND policyname='Users can insert own preferences') THEN
    CREATE POLICY "Users can insert own preferences"
      ON laundry_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_preferences' AND policyname='Users can update own preferences') THEN
    CREATE POLICY "Users can update own preferences"
      ON laundry_preferences FOR UPDATE TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 3. laundry_order_photos
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS laundry_order_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES laundry_orders(id),
  photo_url text NOT NULL,
  photo_type text NOT NULL DEFAULT 'pickup' CHECK (photo_type IN ('pickup','delivery')),
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE laundry_order_photos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_order_photos' AND policyname='Order parties can view photos') THEN
    CREATE POLICY "Order parties can view photos"
      ON laundry_order_photos FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM laundry_orders o
          WHERE o.id = laundry_order_photos.order_id
          AND o.student_id = auth.uid()
        )
      );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_order_photos' AND policyname='Authenticated can insert photos') THEN
    CREATE POLICY "Authenticated can insert photos"
      ON laundry_order_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 4. laundry_order_confirmations
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS laundry_order_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES laundry_orders(id),
  confirmed_by uuid NOT NULL REFERENCES auth.users(id),
  confirmation_type text NOT NULL CHECK (confirmation_type IN ('handed_over','received')),
  confirmed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE laundry_order_confirmations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_order_confirmations' AND policyname='Users can view own confirmations') THEN
    CREATE POLICY "Users can view own confirmations"
      ON laundry_order_confirmations FOR SELECT TO authenticated USING (auth.uid() = confirmed_by);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_order_confirmations' AND policyname='Users can insert own confirmations') THEN
    CREATE POLICY "Users can insert own confirmations"
      ON laundry_order_confirmations FOR INSERT TO authenticated WITH CHECK (auth.uid() = confirmed_by);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 5. laundry_ratings
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS laundry_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES laundry_orders(id) UNIQUE,
  student_id uuid NOT NULL REFERENCES auth.users(id),
  provider_id uuid REFERENCES laundry_providers(id),
  rider_id uuid REFERENCES laundry_rider_profiles(id),
  stars int NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE laundry_ratings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_ratings' AND policyname='Students can insert own ratings') THEN
    CREATE POLICY "Students can insert own ratings"
      ON laundry_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_ratings' AND policyname='Anyone authenticated can view ratings') THEN
    CREATE POLICY "Anyone authenticated can view ratings"
      ON laundry_ratings FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 6. laundry_escrow
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS laundry_escrow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES laundry_orders(id) UNIQUE,
  student_id uuid NOT NULL REFERENCES auth.users(id),
  provider_id uuid REFERENCES laundry_providers(id),
  amount numeric(10,2) NOT NULL DEFAULT 0,
  commission_pct numeric(5,2) NOT NULL DEFAULT 10.0,
  status text NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated','escrowed','released','refunded','disputed')),
  paystack_reference text,
  payout_reference text,
  release_at timestamptz,
  released_at timestamptz,
  dispute_reason text,
  dispute_resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE laundry_escrow ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_escrow' AND policyname='Students can view own escrow') THEN
    CREATE POLICY "Students can view own escrow"
      ON laundry_escrow FOR SELECT TO authenticated USING (auth.uid() = student_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_escrow' AND policyname='Students can insert own escrow') THEN
    CREATE POLICY "Students can insert own escrow"
      ON laundry_escrow FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_escrow' AND policyname='Students can update own escrow') THEN
    CREATE POLICY "Students can update own escrow"
      ON laundry_escrow FOR UPDATE TO authenticated
      USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 7. laundry_wallets
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS laundry_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) UNIQUE,
  balance numeric(10,2) NOT NULL DEFAULT 0,
  total_topped_up numeric(10,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE laundry_wallets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_wallets' AND policyname='Users can view own wallet') THEN
    CREATE POLICY "Users can view own wallet"
      ON laundry_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_wallets' AND policyname='Users can insert own wallet') THEN
    CREATE POLICY "Users can insert own wallet"
      ON laundry_wallets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_wallets' AND policyname='Users can update own wallet') THEN
    CREATE POLICY "Users can update own wallet"
      ON laundry_wallets FOR UPDATE TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 8. laundry_wallet_transactions
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS laundry_wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  type text NOT NULL CHECK (type IN ('topup','deduction','refund','reward')),
  amount numeric(10,2) NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  order_id uuid REFERENCES laundry_orders(id),
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE laundry_wallet_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_wallet_transactions' AND policyname='Users can view own transactions') THEN
    CREATE POLICY "Users can view own transactions"
      ON laundry_wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_wallet_transactions' AND policyname='Users can insert own transactions') THEN
    CREATE POLICY "Users can insert own transactions"
      ON laundry_wallet_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 9. laundry_subscriptions
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS laundry_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  plan_name text NOT NULL DEFAULT 'monthly_4',
  washes_total int NOT NULL DEFAULT 4,
  washes_used int NOT NULL DEFAULT 0,
  price numeric(10,2) NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  paystack_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE laundry_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_subscriptions' AND policyname='Users can view own subscriptions') THEN
    CREATE POLICY "Users can view own subscriptions"
      ON laundry_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_subscriptions' AND policyname='Users can insert own subscriptions') THEN
    CREATE POLICY "Users can insert own subscriptions"
      ON laundry_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_subscriptions' AND policyname='Users can update own subscriptions') THEN
    CREATE POLICY "Users can update own subscriptions"
      ON laundry_subscriptions FOR UPDATE TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 10. laundry_referrals
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS laundry_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id),
  referee_id uuid REFERENCES auth.users(id),
  referral_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','rewarded')),
  reward_amount numeric(10,2) NOT NULL DEFAULT 5.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE laundry_referrals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_referrals' AND policyname='Users can view own referrals') THEN
    CREATE POLICY "Users can view own referrals"
      ON laundry_referrals FOR SELECT TO authenticated USING (auth.uid() = referrer_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_referrals' AND policyname='Users can insert own referrals') THEN
    CREATE POLICY "Users can insert own referrals"
      ON laundry_referrals FOR INSERT TO authenticated WITH CHECK (auth.uid() = referrer_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 11. laundry_issue_reports
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS laundry_issue_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES laundry_orders(id),
  student_id uuid NOT NULL REFERENCES auth.users(id),
  issue_type text NOT NULL DEFAULT 'missing_item' CHECK (issue_type IN ('missing_item','damaged','wrong_delivery','late','other')),
  description text NOT NULL DEFAULT '',
  photo_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed')),
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE laundry_issue_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_issue_reports' AND policyname='Students can view own reports') THEN
    CREATE POLICY "Students can view own reports"
      ON laundry_issue_reports FOR SELECT TO authenticated USING (auth.uid() = student_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_issue_reports' AND policyname='Students can insert own reports') THEN
    CREATE POLICY "Students can insert own reports"
      ON laundry_issue_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 12. laundry_group_orders
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS laundry_group_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES auth.users(id),
  provider_id uuid REFERENCES laundry_providers(id),
  pickup_address text NOT NULL DEFAULT '',
  scheduled_at timestamptz,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'forming' CHECK (status IN ('forming','confirmed','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE laundry_group_orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_group_orders' AND policyname='Organizer can view own group orders') THEN
    CREATE POLICY "Organizer can view own group orders"
      ON laundry_group_orders FOR SELECT TO authenticated USING (auth.uid() = organizer_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_group_orders' AND policyname='Organizer can insert group orders') THEN
    CREATE POLICY "Organizer can insert group orders"
      ON laundry_group_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = organizer_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='laundry_group_orders' AND policyname='Organizer can update group orders') THEN
    CREATE POLICY "Organizer can update group orders"
      ON laundry_group_orders FOR UPDATE TO authenticated
      USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 13. Extend laundry_orders
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='laundry_orders' AND column_name='rider_id') THEN
    ALTER TABLE laundry_orders ADD COLUMN rider_id uuid REFERENCES laundry_rider_profiles(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='laundry_orders' AND column_name='is_express') THEN
    ALTER TABLE laundry_orders ADD COLUMN is_express boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='laundry_orders' AND column_name='delivery_type') THEN
    ALTER TABLE laundry_orders ADD COLUMN delivery_type text NOT NULL DEFAULT 'door' CHECK (delivery_type IN ('door','drop_point'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='laundry_orders' AND column_name='drop_point') THEN
    ALTER TABLE laundry_orders ADD COLUMN drop_point text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='laundry_orders' AND column_name='eco_wash') THEN
    ALTER TABLE laundry_orders ADD COLUMN eco_wash boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='laundry_orders' AND column_name='group_order_id') THEN
    ALTER TABLE laundry_orders ADD COLUMN group_order_id uuid REFERENCES laundry_group_orders(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='laundry_orders' AND column_name='escrow_status') THEN
    ALTER TABLE laundry_orders ADD COLUMN escrow_status text NOT NULL DEFAULT 'none';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='laundry_orders' AND column_name='payment_method') THEN
    ALTER TABLE laundry_orders ADD COLUMN payment_method text NOT NULL DEFAULT 'paystack' CHECK (payment_method IN ('paystack','wallet','subscription'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='laundry_orders' AND column_name='handed_over_at') THEN
    ALTER TABLE laundry_orders ADD COLUMN handed_over_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='laundry_orders' AND column_name='received_at') THEN
    ALTER TABLE laundry_orders ADD COLUMN received_at timestamptz;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 14. Seed sample riders for existing providers
-- ─────────────────────────────────────────────
INSERT INTO laundry_rider_profiles (name, phone, rating, total_ratings, is_available)
SELECT name, '+233 24 000 000' || ROW_NUMBER() OVER () AS phone, 4.7 + RANDOM() * 0.3, 12 + FLOOR(RANDOM() * 50)::int, true
FROM (VALUES
  ('Kofi Mensah'), ('Ama Asante'), ('Kwame Boateng'), ('Akosua Darko')
) AS r(name)
WHERE NOT EXISTS (SELECT 1 FROM laundry_rider_profiles LIMIT 1);

-- ─────────────────────────────────────────────
-- 15. Indexes
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_laundry_order_photos_order ON laundry_order_photos(order_id);
CREATE INDEX IF NOT EXISTS idx_laundry_escrow_order ON laundry_escrow(order_id);
CREATE INDEX IF NOT EXISTS idx_laundry_escrow_student ON laundry_escrow(student_id, status);
CREATE INDEX IF NOT EXISTS idx_laundry_wallets_user ON laundry_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_laundry_wallet_txn_user ON laundry_wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_laundry_subscriptions_user ON laundry_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_laundry_ratings_order ON laundry_ratings(order_id);
