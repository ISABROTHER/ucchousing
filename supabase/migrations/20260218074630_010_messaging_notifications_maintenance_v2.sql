/*
  # Messaging, Notifications, Maintenance Requests, and QR Check-in (v2)

  ## Overview
  This migration adds comprehensive communication and operational features to the platform.
  Uses DROP IF EXISTS before CREATE to handle re-runs safely.

  ## New Tables
  - conversations: message threads between student and hostel owner
  - messages: individual messages within conversations
  - notifications: in-app notification system
  - maintenance_requests: tenant-submitted maintenance requests
  - qr_checkins: QR code tokens for digital check-in/check-out
*/

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(hostel_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_student ON conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_conversations_owner ON conversations(owner_id);
CREATE INDEX IF NOT EXISTS idx_conversations_hostel ON conversations(hostel_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Students can view own conversations') THEN
    CREATE POLICY "Students can view own conversations"
      ON conversations FOR SELECT
      TO authenticated
      USING (auth.uid() = student_id OR auth.uid() = owner_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Students can create conversations') THEN
    CREATE POLICY "Students can create conversations"
      ON conversations FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = student_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Participants can update last_message_at') THEN
    CREATE POLICY "Participants can update last_message_at"
      ON conversations FOR UPDATE
      TO authenticated
      USING (auth.uid() = student_id OR auth.uid() = owner_id)
      WITH CHECK (auth.uid() = student_id OR auth.uid() = owner_id);
  END IF;
END $$;


CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Conversation participants can view messages') THEN
    CREATE POLICY "Conversation participants can view messages"
      ON messages FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM conversations c
          WHERE c.id = messages.conversation_id
          AND (c.student_id = auth.uid() OR c.owner_id = auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Conversation participants can send messages') THEN
    CREATE POLICY "Conversation participants can send messages"
      ON messages FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
          SELECT 1 FROM conversations c
          WHERE c.id = messages.conversation_id
          AND (c.student_id = auth.uid() OR c.owner_id = auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Recipients can mark messages as read') THEN
    CREATE POLICY "Recipients can mark messages as read"
      ON messages FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM conversations c
          WHERE c.id = messages.conversation_id
          AND (c.student_id = auth.uid() OR c.owner_id = auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM conversations c
          WHERE c.id = messages.conversation_id
          AND (c.student_id = auth.uid() OR c.owner_id = auth.uid())
        )
      );
  END IF;
END $$;


CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('booking_confirmed', 'booking_cancelled', 'new_message', 'maintenance_update', 'check_in_reminder', 'check_out_reminder', 'review_request', 'payment_received', 'new_booking')),
  title text NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 200),
  body text NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 500),
  data jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view own notifications') THEN
    CREATE POLICY "Users can view own notifications"
      ON notifications FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can mark own notifications as read') THEN
    CREATE POLICY "Users can mark own notifications as read"
      ON notifications FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'System can insert notifications') THEN
    CREATE POLICY "System can insert notifications"
      ON notifications FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;


CREATE TABLE IF NOT EXISTS maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 200),
  description text NOT NULL CHECK (char_length(description) > 0 AND char_length(description) <= 2000),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  owner_notes text CHECK (char_length(owner_notes) <= 1000),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_hostel ON maintenance_requests(hostel_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_student ON maintenance_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_requests(status);

ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'maintenance_requests' AND policyname = 'Students can view own maintenance requests') THEN
    CREATE POLICY "Students can view own maintenance requests"
      ON maintenance_requests FOR SELECT
      TO authenticated
      USING (auth.uid() = student_id OR EXISTS (
        SELECT 1 FROM hostels h WHERE h.id = maintenance_requests.hostel_id AND h.owner_id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'maintenance_requests' AND policyname = 'Students can create maintenance requests') THEN
    CREATE POLICY "Students can create maintenance requests"
      ON maintenance_requests FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = student_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'maintenance_requests' AND policyname = 'Owners can update maintenance requests') THEN
    CREATE POLICY "Owners can update maintenance requests"
      ON maintenance_requests FOR UPDATE
      TO authenticated
      USING (
        auth.uid() = student_id OR
        EXISTS (SELECT 1 FROM hostels h WHERE h.id = maintenance_requests.hostel_id AND h.owner_id = auth.uid())
      )
      WITH CHECK (
        auth.uid() = student_id OR
        EXISTS (SELECT 1 FROM hostels h WHERE h.id = maintenance_requests.hostel_id AND h.owner_id = auth.uid())
      );
  END IF;
END $$;


CREATE TABLE IF NOT EXISTS qr_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('checkin', 'checkout')),
  used_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_booking ON qr_checkins(booking_id);
CREATE INDEX IF NOT EXISTS idx_qr_token ON qr_checkins(token);

ALTER TABLE qr_checkins ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'qr_checkins' AND policyname = 'Students can view own QR codes') THEN
    CREATE POLICY "Students can view own QR codes"
      ON qr_checkins FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.id = qr_checkins.booking_id
          AND (b.student_id = auth.uid() OR EXISTS (
            SELECT 1 FROM hostels h WHERE h.id = b.hostel_id AND h.owner_id = auth.uid()
          ))
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'qr_checkins' AND policyname = 'Students can create QR codes for own bookings') THEN
    CREATE POLICY "Students can create QR codes for own bookings"
      ON qr_checkins FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.id = qr_checkins.booking_id AND b.student_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'qr_checkins' AND policyname = 'Owners can use QR codes') THEN
    CREATE POLICY "Owners can use QR codes"
      ON qr_checkins FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM bookings b
          JOIN hostels h ON h.id = b.hostel_id
          WHERE b.id = qr_checkins.booking_id AND h.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM bookings b
          JOIN hostels h ON h.id = b.hostel_id
          WHERE b.id = qr_checkins.booking_id AND h.owner_id = auth.uid()
        )
      );
  END IF;
END $$;
