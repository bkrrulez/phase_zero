
-- Migration to add the contract_end_notifications table

CREATE TABLE IF NOT EXISTS contract_end_notifications (
    id TEXT PRIMARY KEY,
    team_ids TEXT[] NOT NULL,
    recipient_user_ids TEXT[] NOT NULL,
    recipient_emails TEXT[] NOT NULL,
    threshold_days INTEGER[] NOT NULL
);

-- Add some default constraints or indexes if needed
-- For example, ensuring arrays are not empty could be a good check, but we handle this in the app logic.

COMMENT ON TABLE contract_end_notifications IS 'Stores rules for sending notifications about expiring contracts.';
COMMENT ON COLUMN contract_end_notifications.id IS 'Unique identifier for the notification rule (e.g., cen-1672531200000).';
COMMENT ON COLUMN contract_end_notifications.team_ids IS 'Array of team IDs to monitor. Can include ''all-teams''.';
COMMENT ON COLUMN contract_end_notifications.recipient_user_ids IS 'Array of user IDs who should receive the notification.';
COMMENT ON COLUMN contract_end_notifications.recipient_emails IS 'Array of external email addresses to notify.';
COMMENT ON COLUMN contract_end_notifications.threshold_days IS 'Array of integers representing the number of days before expiry to trigger a notification (e.g., {7, 14, 30}).';

