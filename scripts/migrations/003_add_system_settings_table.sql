
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sent_notifications (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL,
    threshold_day INTEGER NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(contract_id, threshold_day)
);

-- Note: The primary functionality for the 'isHolidaysNavVisible' setting is being moved
-- from its own table to this generic system_settings table.
-- The following command attempts to migrate the old value if it exists.
-- It's safe to run even if the old table doesn't exist.

DO $$
DECLARE
    visibility_value BOOLEAN;
BEGIN
    -- Check if the old table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'global_settings') THEN
        -- Check if the specific setting exists in the old table
        SELECT value INTO visibility_value FROM global_settings WHERE key = 'isHolidaysNavVisible' LIMIT 1;

        -- If a value was found, insert it into the new table
        IF FOUND THEN
            INSERT INTO system_settings (key, value)
            VALUES ('isHolidaysNavVisible', visibility_value::TEXT)
            ON CONFLICT (key) DO NOTHING;
        END IF;
    END IF;
END $$;

    