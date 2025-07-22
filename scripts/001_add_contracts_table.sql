-- Step 1: Create the new contracts table
CREATE TABLE contracts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    weekly_hours INTEGER NOT NULL
);

-- Step 2: Migrate existing contract data from the users table to the new contracts table.
-- This query assumes that each user has at most one existing contract to migrate.
-- It generates a unique ID for the new contract record.
INSERT INTO contracts (id, user_id, start_date, end_date, weekly_hours)
SELECT 
    'contract-' || id AS id,
    id AS user_id,
    contract_start_date,
    contract_end_date,
    contract_weekly_hours
FROM 
    users
WHERE 
    contract_start_date IS NOT NULL;

-- Step 3: Remove the old, redundant columns from the users table after data migration.
ALTER TABLE users DROP COLUMN contract_start_date;
ALTER TABLE users DROP COLUMN contract_end_date;
ALTER TABLE users DROP COLUMN contract_weekly_hours;

-- Optional: You can add an index for faster lookups on user_id in the contracts table
CREATE INDEX idx_contracts_user_id ON contracts(user_id);
