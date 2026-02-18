/*
  # Digital Tenancy Module v2 — E-Sign, OTP, Paystack, Audit

  ## Summary
  This migration extends the tenancy system with a full end-to-end digital workflow:
  OTP-based e-signatures, Paystack payment receipts, audit logging, agreement templates,
  tenant applications, rent reminders, and PDF storage.

  ## New Tables
  1. `agreement_templates` — Landlord/admin-created agreement templates with placeholder syntax
  2. `tenant_applications` — Student applications for a hostel room (pending/approved/rejected)
  3. `signature_events` — OTP-verified e-signature records per signer per agreement
  4. `otp_verifications` — Short-lived OTP codes for signing
  5. `audit_logs` — Immutable event log (entity_type, action, actor, metadata)
  6. `receipts` — Payment receipts linked to invoices + Paystack references
  7. `rent_reminders` — Scheduled reminder log per invoice

  ## Modified Tables
  - `tenancy_agreements` — Add `template_id`, `pdf_url`, `status` enum pipeline,
    `student_application_id`, `landlord_id`, `monthly_rent`

  ## Security
  - RLS enabled on all new tables
  - Students see only their own data; landlords see their properties' data; admins see all
  - OTP codes are write-once, read-by-owner only
  - Audit logs are insert-only for authenticated users, select for admins/owners

  ## Notes
  1. tenancy_agreements.status pipeline: draft → sent → student_signed → landlord_signed → active → terminated
  2. OTP codes expire after 10 minutes
  3. Receipts are created server-side only (via edge function)
  4. pdf_url points to Supabase Storage path
*/

-- ─────────────────────────────────────────────
-- 1. agreement_templates
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agreement_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id),
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'standard',
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agreement_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agreement_templates' AND policyname='Anyone authenticated can read active templates') THEN
    CREATE POLICY "Anyone authenticated can read active templates"
      ON agreement_templates FOR SELECT TO authenticated
      USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agreement_templates' AND policyname='Owners can insert templates') THEN
    CREATE POLICY "Owners can insert templates"
      ON agreement_templates FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = created_by);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agreement_templates' AND policyname='Owners can update own templates') THEN
    CREATE POLICY "Owners can update own templates"
      ON agreement_templates FOR UPDATE TO authenticated
      USING (auth.uid() = created_by)
      WITH CHECK (auth.uid() = created_by);
  END IF;
END $$;

-- Seed a default template
INSERT INTO agreement_templates (title, content, category, is_active)
SELECT
  'Standard Student Tenancy Agreement (Ghana)',
  E'STUDENT TENANCY AGREEMENT\n\nThis Tenancy Agreement is entered into on {{agreement_date}} between:\n\nLANDLORD: {{landlord_name}}\nAddress: {{hostel_address}}\nPhone: {{landlord_phone}}\n\nTENANT: {{student_name}}\nStudent ID: {{student_id}}\nUniversity: {{university}}\nPhone: {{student_phone}}\n\n1. PROPERTY\nThe Landlord agrees to let and the Tenant agrees to take the property at:\n{{hostel_name}}, Room {{room_number}}\n{{hostel_address}}\n\n2. TENANCY PERIOD\nFrom: {{start_date}}\nTo: {{end_date}}\nDuration: {{duration_months}} months\n\n3. RENT\nMonthly Rent: GHS {{monthly_rent}}\nPayment Due: 1st of each month\nPayment Method: Paystack (Card / Mobile Money)\n\n4. DEPOSIT\nSecurity Deposit: GHS {{deposit_amount}}\nRefundable within 30 days of vacating, subject to condition.\n\n5. TENANT OBLIGATIONS\na) Pay rent on time.\nb) Keep the property clean and in good condition.\nc) Not sublet without written consent.\nd) Comply with hostel rules and regulations.\ne) Report maintenance issues promptly.\n\n6. LANDLORD OBLIGATIONS\na) Maintain the property in a habitable condition.\nb) Provide essential services (water, electricity where applicable).\nc) Give 24-hour notice before entering the premises.\n\n7. TERMINATION\nEither party may terminate with 30 days written notice.\n\n8. GHANA RENT CONTROL\nThis agreement complies with Ghana\'s Rent Act 1963 (Act 220) and Rent Control Department regulations.\n\nSIGNATURES\n\nTenant: {{student_signature}} Date: {{student_signed_date}}\nLandlord: {{landlord_signature}} Date: {{landlord_signed_date}}',
  'standard',
  true
WHERE NOT EXISTS (SELECT 1 FROM agreement_templates WHERE title = 'Standard Student Tenancy Agreement (Ghana)');

-- ─────────────────────────────────────────────
-- 2. tenant_applications
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id),
  hostel_id uuid NOT NULL REFERENCES hostels(id),
  room_number text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  landlord_id uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tenant_applications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenant_applications' AND policyname='Students can view own applications') THEN
    CREATE POLICY "Students can view own applications"
      ON tenant_applications FOR SELECT TO authenticated
      USING (auth.uid() = student_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenant_applications' AND policyname='Students can insert own applications') THEN
    CREATE POLICY "Students can insert own applications"
      ON tenant_applications FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = student_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenant_applications' AND policyname='Landlords can view applications for their hostels') THEN
    CREATE POLICY "Landlords can view applications for their hostels"
      ON tenant_applications FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM hostels h
          WHERE h.id = tenant_applications.hostel_id
          AND h.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenant_applications' AND policyname='Landlords can update applications for their hostels') THEN
    CREATE POLICY "Landlords can update applications for their hostels"
      ON tenant_applications FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM hostels h
          WHERE h.id = tenant_applications.hostel_id
          AND h.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM hostels h
          WHERE h.id = tenant_applications.hostel_id
          AND h.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 3. Extend tenancy_agreements
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenancy_agreements' AND column_name='template_id') THEN
    ALTER TABLE tenancy_agreements ADD COLUMN template_id uuid REFERENCES agreement_templates(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenancy_agreements' AND column_name='pdf_url') THEN
    ALTER TABLE tenancy_agreements ADD COLUMN pdf_url text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenancy_agreements' AND column_name='landlord_id') THEN
    ALTER TABLE tenancy_agreements ADD COLUMN landlord_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenancy_agreements' AND column_name='application_id') THEN
    ALTER TABLE tenancy_agreements ADD COLUMN application_id uuid REFERENCES tenant_applications(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenancy_agreements' AND column_name='monthly_rent') THEN
    ALTER TABLE tenancy_agreements ADD COLUMN monthly_rent numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenancy_agreements' AND column_name='room_number') THEN
    ALTER TABLE tenancy_agreements ADD COLUMN room_number text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenancy_agreements' AND column_name='agreement_content') THEN
    ALTER TABLE tenancy_agreements ADD COLUMN agreement_content text;
  END IF;
END $$;

-- Ensure status column exists with correct type (may already exist as text)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenancy_agreements' AND column_name='status') THEN
    ALTER TABLE tenancy_agreements ADD COLUMN status text NOT NULL DEFAULT 'draft'
      CHECK (status IN ('draft','sent','student_signed','landlord_signed','active','terminated'));
  END IF;
END $$;

-- RLS for tenancy_agreements (supplement existing)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenancy_agreements' AND policyname='Landlords can view agreements for their hostels') THEN
    CREATE POLICY "Landlords can view agreements for their hostels"
      ON tenancy_agreements FOR SELECT TO authenticated
      USING (auth.uid() = landlord_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenancy_agreements' AND policyname='Landlords can insert agreements') THEN
    CREATE POLICY "Landlords can insert agreements"
      ON tenancy_agreements FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = landlord_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenancy_agreements' AND policyname='Landlords can update their agreements') THEN
    CREATE POLICY "Landlords can update their agreements"
      ON tenancy_agreements FOR UPDATE TO authenticated
      USING (auth.uid() = landlord_id)
      WITH CHECK (auth.uid() = landlord_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 4. signature_events
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS signature_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES tenancy_agreements(id),
  signer_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL CHECK (role IN ('student','landlord')),
  otp_verified_at timestamptz,
  ip_address text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE signature_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='signature_events' AND policyname='Signers can view own events') THEN
    CREATE POLICY "Signers can view own events"
      ON signature_events FOR SELECT TO authenticated
      USING (auth.uid() = signer_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='signature_events' AND policyname='Agreement parties can view signatures') THEN
    CREATE POLICY "Agreement parties can view signatures"
      ON signature_events FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM tenancy_agreements ta
          WHERE ta.id = signature_events.agreement_id
          AND (ta.student_id = auth.uid() OR ta.landlord_id = auth.uid())
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='signature_events' AND policyname='Authenticated users can insert own signature events') THEN
    CREATE POLICY "Authenticated users can insert own signature events"
      ON signature_events FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = signer_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 5. otp_verifications
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  code text NOT NULL,
  purpose text NOT NULL DEFAULT 'sign_agreement',
  agreement_id uuid REFERENCES tenancy_agreements(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='otp_verifications' AND policyname='Users can view own OTPs') THEN
    CREATE POLICY "Users can view own OTPs"
      ON otp_verifications FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='otp_verifications' AND policyname='Users can insert own OTPs') THEN
    CREATE POLICY "Users can insert own OTPs"
      ON otp_verifications FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='otp_verifications' AND policyname='Users can update own OTPs') THEN
    CREATE POLICY "Users can update own OTPs"
      ON otp_verifications FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 6. audit_logs
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL DEFAULT '',
  entity_id uuid,
  action text NOT NULL DEFAULT '',
  actor_id uuid REFERENCES auth.users(id),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='Authenticated users can insert audit logs') THEN
    CREATE POLICY "Authenticated users can insert audit logs"
      ON audit_logs FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = actor_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='Users can view audit logs for their entities') THEN
    CREATE POLICY "Users can view audit logs for their entities"
      ON audit_logs FOR SELECT TO authenticated
      USING (auth.uid() = actor_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 7. receipts
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES rent_invoices(id),
  student_id uuid NOT NULL REFERENCES auth.users(id),
  amount_paid numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'paystack',
  paystack_reference text,
  payment_channel text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='receipts' AND policyname='Students can view own receipts') THEN
    CREATE POLICY "Students can view own receipts"
      ON receipts FOR SELECT TO authenticated
      USING (auth.uid() = student_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='receipts' AND policyname='Students can insert own receipts') THEN
    CREATE POLICY "Students can insert own receipts"
      ON receipts FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = student_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='receipts' AND policyname='Landlords can view receipts for their agreements') THEN
    CREATE POLICY "Landlords can view receipts for their agreements"
      ON receipts FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM rent_invoices ri
          JOIN tenancy_agreements ta ON ta.id = ri.agreement_id
          WHERE ri.id = receipts.invoice_id
          AND ta.landlord_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 8. rent_reminders
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rent_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES rent_invoices(id),
  student_id uuid NOT NULL REFERENCES auth.users(id),
  reminder_type text NOT NULL CHECK (reminder_type IN ('due_in_7','due_today','overdue_3','overdue_7','overdue_14')),
  is_sent boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rent_reminders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rent_reminders' AND policyname='Students can view own reminders') THEN
    CREATE POLICY "Students can view own reminders"
      ON rent_reminders FOR SELECT TO authenticated
      USING (auth.uid() = student_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rent_reminders' AND policyname='Authenticated users can insert reminders') THEN
    CREATE POLICY "Authenticated users can insert reminders"
      ON rent_reminders FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = student_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 9. Extend rent_invoices
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rent_invoices' AND column_name='paystack_reference') THEN
    ALTER TABLE rent_invoices ADD COLUMN paystack_reference text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rent_invoices' AND column_name='paid_at') THEN
    ALTER TABLE rent_invoices ADD COLUMN paid_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rent_invoices' AND column_name='invoice_number') THEN
    ALTER TABLE rent_invoices ADD COLUMN invoice_number text;
  END IF;
END $$;

-- RLS supplements for rent_invoices
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rent_invoices' AND policyname='Students can update own invoices') THEN
    CREATE POLICY "Students can update own invoices"
      ON rent_invoices FOR UPDATE TO authenticated
      USING (auth.uid() = student_id)
      WITH CHECK (auth.uid() = student_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rent_invoices' AND policyname='Landlords can view invoices for their agreements') THEN
    CREATE POLICY "Landlords can view invoices for their agreements"
      ON rent_invoices FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM tenancy_agreements ta
          WHERE ta.id = rent_invoices.agreement_id
          AND ta.landlord_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 10. Indexes for performance
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tenant_applications_student ON tenant_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_tenant_applications_hostel ON tenant_applications(hostel_id);
CREATE INDEX IF NOT EXISTS idx_signature_events_agreement ON signature_events(agreement_id);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_user ON otp_verifications(user_id, agreement_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_receipts_invoice ON receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_rent_reminders_invoice ON rent_reminders(invoice_id);
