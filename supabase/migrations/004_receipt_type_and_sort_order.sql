-- ─── Phase 1: Relax constraints for receipts ────────────────────────────────

-- Allow warranty_months = 0 for receipts (existing constraint is >= 1)
ALTER TABLE warranties DROP CONSTRAINT IF EXISTS warranties_warranty_months_check;
ALTER TABLE warranties ADD CONSTRAINT warranties_warranty_months_check
  CHECK (warranty_months >= 0 AND warranty_months <= 120);

-- Make expiry_date nullable for receipts
ALTER TABLE warranties ALTER COLUMN expiry_date DROP NOT NULL;

-- ─── Phase 2: Add new columns ───────────────────────────────────────────────

-- Type: 'warranty' or 'receipt'
ALTER TABLE warranties ADD COLUMN type TEXT NOT NULL DEFAULT 'warranty';

-- Sort order for user-defined ordering (future use)
ALTER TABLE warranties ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE warranties ADD COLUMN sort_by TEXT NOT NULL DEFAULT 'expiry_date';

-- ─── Phase 3: Backfill ──────────────────────────────────────────────────────

-- All existing rows are warranties
UPDATE warranties SET type = 'warranty' WHERE type IS NULL;

-- ─── Phase 4: Index ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_warranties_user_sort ON warranties(user_id, sort_order);
