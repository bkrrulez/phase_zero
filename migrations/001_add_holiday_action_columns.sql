-- Migration to add action tracking columns to the holiday_requests table.
-- This script is designed to be run once and is safe to run on an existing table with data.

-- Add the new columns, allowing them to be NULL since existing rows won't have this data.
ALTER TABLE holiday_requests
ADD COLUMN IF NOT EXISTS action_by_user_id TEXT,
ADD COLUMN IF NOT EXISTS action_timestamp TIMESTAMPTZ;

-- Optional but recommended: Add a foreign key constraint to ensure data integrity.
-- This links the action_by_user_id to a valid user in the users table.
-- The "IF NOT EXISTS" syntax for constraints is not standard in all PostgreSQL versions,
-- so we'll check if the constraint already exists before adding it.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conname = 'fk_holiday_requests_action_by_user'
    )
    THEN
        ALTER TABLE holiday_requests
        ADD CONSTRAINT fk_holiday_requests_action_by_user
        FOREIGN KEY (action_by_user_id)
        REFERENCES users(id);
    END IF;
END;
$$;

-- Add comments to the new columns for clarity in the database schema.
COMMENT ON COLUMN holiday_requests.action_by_user_id IS 'The user who approved/rejected the request. Can be NULL.';
COMMENT ON COLUMN holiday_requests.action_timestamp IS 'When the action was taken. Can be NULL.';

