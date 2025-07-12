-- Create the system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Insert the default value for isHolidaysNavVisible, avoiding duplicates
INSERT INTO system_settings (key, value)
VALUES ('isHolidaysNavVisible', 'true')
ON CONFLICT (key) DO NOTHING;
