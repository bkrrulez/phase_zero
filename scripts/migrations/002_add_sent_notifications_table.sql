-- This table prevents duplicate notifications from being sent for the same contract on the same threshold day.
-- For example, if a notification is sent for a contract expiring in 30 days, this table ensures it isn't sent again
-- the next day if the trigger is run manually.

CREATE TABLE IF NOT EXISTS sent_notifications (
    id SERIAL PRIMARY KEY,
    contract_id TEXT NOT NULL,
    threshold_day INTEGER NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(contract_id, threshold_day)
);
