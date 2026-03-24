-- Migration: 003_custom_notification_days
-- Replaces fixed boolean notification columns with a flexible integer array.
-- notification_days = [30, 7, 1, 0] means: notify 30, 7, 1 days before and on expiry day.

BEGIN;

-- Drop old boolean columns
ALTER TABLE warranties DROP COLUMN IF EXISTS notify_30_days;
ALTER TABLE warranties DROP COLUMN IF EXISTS notify_7_days;
ALTER TABLE warranties DROP COLUMN IF EXISTS notify_1_day;
ALTER TABLE warranties DROP COLUMN IF EXISTS notify_expired;

-- Add notification_days array (INTEGER[] = array of days before expiry to notify on)
-- 30 = 30 days before, 7 = 7 days before, 1 = 1 day before, 0 = expiry day
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS notification_days INTEGER[] DEFAULT ARRAY[30, 7, 1, 0]::INTEGER[];

COMMIT;
