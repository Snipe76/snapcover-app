-- Add type field to distinguish warranties from receipts
ALTER TABLE warranties ADD COLUMN type TEXT NOT NULL DEFAULT 'warranty';
ALTER TABLE warranties ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE warranties ADD COLUMN sort_by TEXT NOT NULL DEFAULT 'expiry_date';

-- Create index for faster sorting
CREATE INDEX IF NOT EXISTS idx_warranties_user_sort ON warranties(user_id, sort_order);

-- Backfill type = 'warranty' for existing rows (they're all warranties)
UPDATE warranties SET type = 'warranty' WHERE type IS NULL;

-- Add receipt_url column if not exists (for receipts that may not have expiry)
-- Already has receipt_url from previous migrations
