-- Migration script to introduce multiple contracts per user.

-- Step 1: Create the new 'contracts' table to store multiple contracts for each user.
CREATE TABLE contracts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    weekly_hours INTEGER NOT NULL
);

-- Step 2: Remove the old single-contract columns from the 'users' table.
-- WARNING: This will remove data from these columns. Ensure you have migrated
-- any existing contract data to the new 'contracts' table before running this.
ALTER TABLE users DROP COLUMN contract_start_date;
ALTER TABLE users DROP COLUMN contract_end_date;
ALTER TABLE users DROP COLUMN contract_weekly_hours;

-- Optional: Add an index on user_id for faster lookups in the contracts table.
CREATE INDEX idx_contracts_user_id ON contracts(user_id);

-- End of migration.
