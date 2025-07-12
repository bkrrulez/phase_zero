-- Adds the recurring_day column to the freeze_rules table for recurring freezes.
-- The IF NOT EXISTS clause prevents errors if the column has already been added.
ALTER TABLE freeze_rules ADD COLUMN IF NOT EXISTS recurring_day INTEGER;
