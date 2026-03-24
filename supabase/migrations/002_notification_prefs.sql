-- Migration: 002_notification_prefs
-- Adds per-warranty notification preference columns

ALTER TABLE warranties
  ADD COLUMN IF NOT EXISTS notify_30_days BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_7_days  BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_1_day   BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_expired BOOLEAN DEFAULT true;

-- Also enable RLS (was enabled in 001, but ensure it)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
