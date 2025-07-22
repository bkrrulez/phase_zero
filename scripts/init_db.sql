-- TimeTool DB Initialization Script

-- Drop tables in reverse order of creation to handle dependencies
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS system_logs;
DROP TABLE IF EXISTS push_message_read_by;
DROP TABLE IF EXISTS push_message_teams;
DROP TABLE IF EXISTS push_messages;
DROP TABLE IF EXISTS notification_read_by;
DROP TABLE IF EXISTS notification_recipients;
DROP TABLE IF EXISTS app_notifications;
DROP TABLE IF EXISTS freeze_rules;
DROP TABLE IF EXISTS custom_holidays;
DROP TABLE IF EXISTS public_holidays;
DROP TABLE IF EXISTS holiday_requests;
DROP TABLE IF EXISTS time_entries;
DROP TABLE IF EXISTS contracts;
DROP TABLE IF EXISTS user_projects;
DROP TABLE IF EXISTS project_tasks;
DROP TABLE IF EXISTS team_projects;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS users;

-- Core Tables
CREATE TABLE teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    avatar TEXT,
    team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
    reports_to TEXT REFERENCES users(id) ON DELETE SET NULL,
    contract_pdf TEXT,
    -- Legacy contract fields, kept for potential data migration but should not be used for new logic.
    -- These will be populated from the contracts table for existing logic to work temporarily.
    contract_start_date DATE,
    contract_end_date DATE,
    contract_weekly_hours INTEGER
);

CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    budget NUMERIC(15, 2),
    details TEXT
);

CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    details TEXT
);

CREATE TABLE contracts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    weekly_hours INTEGER NOT NULL
);


-- Activity & Tracking Tables
CREATE TABLE time_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration NUMERIC(5, 2) NOT NULL,
    remarks TEXT
);

CREATE TABLE holiday_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL,
    action_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action_timestamp TIMESTAMPTZ
);

CREATE TABLE public_holidays (
    id TEXT PRIMARY KEY,
    country TEXT NOT NULL,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL,
    UNIQUE(name, date)
);

CREATE TABLE custom_holidays (
    id TEXT PRIMARY KEY,
    country TEXT NOT NULL,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL,
    applies_to TEXT NOT NULL -- 'all-members', 'all-teams', or a teamId
);

-- Join Tables (Many-to-Many)
CREATE TABLE user_projects (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, project_id)
);

CREATE TABLE project_tasks (
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, task_id)
);

CREATE TABLE team_projects (
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, project_id)
);


-- Access Control
CREATE TABLE freeze_rules (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    recurring_day INTEGER
);

-- Notifications & Messaging
CREATE TABLE app_notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    reference_id TEXT
);

CREATE TABLE notification_recipients (
    notification_id TEXT NOT NULL REFERENCES app_notifications(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (notification_id, user_id)
);

CREATE TABLE notification_read_by (
    notification_id TEXT NOT NULL REFERENCES app_notifications(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (notification_id, user_id)
);

CREATE TABLE push_messages (
    id TEXT PRIMARY KEY,
    context TEXT NOT NULL,
    message_body TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    receivers TEXT NOT NULL -- 'all-members', 'all-teams', 'individual-teams'
);

CREATE TABLE push_message_teams (
    push_message_id TEXT NOT NULL REFERENCES push_messages(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    PRIMARY KEY (push_message_id, team_id)
);

CREATE TABLE push_message_read_by (
    push_message_id TEXT NOT NULL REFERENCES push_messages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (push_message_id, user_id)
);


-- System Tables
CREATE TABLE system_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    message TEXT NOT NULL
);

CREATE TABLE system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Note: The logic for seeding initial data is handled by the application
-- using src/lib/mock-data.ts. This script only sets up the schema.
