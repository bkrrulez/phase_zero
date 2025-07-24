
-- This table stores the rules for sending contract end notifications.
CREATE TABLE IF NOT EXISTS contract_end_notifications (
    id TEXT PRIMARY KEY,
    team_ids TEXT[] NOT NULL,
    recipient_user_ids TEXT[],
    recipient_emails TEXT[],
    threshold_days INTEGER[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- This table logs which notifications have already been sent to avoid duplicates.
-- For a given contract, a notification for a specific threshold day (e.g., the 15-day warning)
-- should only be sent once.
CREATE TABLE IF NOT EXISTS sent_notifications (
    id SERIAL PRIMARY KEY,
    contract_id TEXT NOT NULL,
    threshold_day INTEGER NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contract_id, threshold_day)
);

-- Optional: Add an index for faster lookups.
CREATE INDEX IF NOT EXISTS idx_sent_notifications_contract_id ON sent_notifications(contract_id);
