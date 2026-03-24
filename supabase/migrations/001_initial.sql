-- SnapCover MVP — Initial Migration
-- Run this in Supabase SQL Editor or via: supabase db push

-- ─── Warranties ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warranties (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_name        TEXT NOT NULL,
  store_name       TEXT NOT NULL,
  purchase_date    DATE NOT NULL,
  warranty_months  INTEGER NOT NULL CHECK (warranty_months BETWEEN 1 AND 120),
  expiry_date      DATE GENERATED ALWAYS AS (
    make_date(
      EXTRACT(YEAR  FROM purchase_date)::INT,
      EXTRACT(MONTH FROM purchase_date)::INT + warranty_months,
      EXTRACT(DAY   FROM purchase_date)::INT
    )
  ) STORED,
  notes            TEXT,
  receipt_url      TEXT,
  status           TEXT DEFAULT 'active' CHECK (status IN ('active', 'expiring', 'expired', 'archived')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Notifications Log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  warranty_id UUID REFERENCES warranties(id) ON DELETE CASCADE NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('expiry_30', 'expiry_7', 'expiry_1', 'expired')),
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  channel     TEXT DEFAULT 'push' CHECK (channel IN ('push', 'email')),
  read_at     TIMESTAMPTZ
);

-- ─── Push Subscriptions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint   TEXT NOT NULL,
  keys       JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- ─── RLS Policies ────────────────────────────────────────────────────────────
ALTER TABLE warranties          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions  ENABLE ROW LEVEL SECURITY;

-- Warranties: user sees only their own
CREATE POLICY "warranties_select_own" ON warranties
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "warranties_insert_own" ON warranties
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "warranties_update_own" ON warranties
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "warranties_delete_own" ON warranties
  FOR DELETE USING (auth.uid() = user_id);

-- Notifications: user sees only their own
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_own" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Push subscriptions: user manages only their own
CREATE POLICY "push_subscriptions_all_own" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- ─── Storage Bucket ─────────────────────────────────────────────────────────
-- Run in Supabase Dashboard → Storage → Create bucket "receipts" (public: false)
-- Or via SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('receipts', 'receipts', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users access only their own receipts
CREATE POLICY "receipts_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "receipts_read_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "receipts_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'receipts'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_warranties_user_id      ON warranties(user_id);
CREATE INDEX IF NOT EXISTS idx_warranties_expiry_date  ON warranties(expiry_date) WHERE status != 'archived';
CREATE INDEX IF NOT EXISTS idx_notifications_user_id   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
