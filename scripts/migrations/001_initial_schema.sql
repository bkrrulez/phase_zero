-- Initial Schema for Phase0 Application

-- Drop tables if they exist to ensure a clean slate
DROP TABLE IF EXISTS user_projects CASCADE;
DROP TABLE IF EXISTS team_projects CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS holiday_requests CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS push_messages CASCADE;
DROP TABLE IF EXISTS push_message_teams CASCADE;
DROP TABLE IF EXISTS push_message_read_by CASCADE;
DROP TABLE IF EXISTS app_notifications CASCADE;
DROP TABLE IF EXISTS notification_recipients CASCADE;
DROP TABLE IF EXISTS notification_read_by CASCADE;
DROP TABLE IF EXISTS system_logs CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS contract_end_notifications CASCADE;
DROP TABLE IF EXISTS sent_notifications CASCADE;
DROP TABLE IF EXISTS rule_books CASCADE;
DROP TABLE IF EXISTS rule_book_entries CASCADE;
DROP TABLE IF EXISTS reference_tables CASCADE;
DROP TABLE IF EXISTS project_analyses CASCADE;
DROP TABLE IF EXISTS rule_analysis_results CASCADE;

-- Drop sequences if they exist
DROP SEQUENCE IF EXISTS project_number_seq;

-- ========== Sequences ==========
CREATE SEQUENCE project_number_seq START 1;

-- ========== Core Tables ==========

-- Users Table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('User', 'Team Lead', 'Super Admin', 'Expert')),
    avatar TEXT,
    team_id TEXT,
    reports_to TEXT,
    contract_pdf TEXT
);

-- Teams Table
CREATE TABLE teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Projects Table
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    project_number VARCHAR(10) UNIQUE,
    project_creation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    project_manager VARCHAR(255),
    creator_id TEXT,
    address TEXT,
    project_owner VARCHAR(255),
    year_of_construction INTEGER,
    number_of_floors INTEGER,
    escape_level NUMERIC(5, 2),
    listed_building BOOLEAN,
    protection_zone BOOLEAN,
    current_use VARCHAR(255),
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Tasks Table
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    details TEXT
);

-- Contracts Table
CREATE TABLE contracts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ========== Activity & Tracking Tables ==========

-- Holiday Requests Table
CREATE TABLE holiday_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL,
    action_by_user_id TEXT,
    action_timestamp TIMESTAMPTZ,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (action_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);


-- ========== Join Tables (Many-to-Many Relationships) ==========

-- User-Projects Join Table
CREATE TABLE user_projects (
    user_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    PRIMARY KEY (user_id, project_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Team-Projects Join Table
CREATE TABLE team_projects (
    team_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    PRIMARY KEY (team_id, project_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ========== Notification and Messaging System ==========

-- Push Messages Table
CREATE TABLE push_messages (
    id TEXT PRIMARY KEY,
    context TEXT,
    message_body TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    receivers TEXT NOT NULL -- 'all-members', 'all-teams', 'individual-teams'
);

-- Push Message Teams Join Table
CREATE TABLE push_message_teams (
    push_message_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    PRIMARY KEY (push_message_id, team_id),
    FOREIGN KEY (push_message_id) REFERENCES push_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Push Message Read Status Table
CREATE TABLE push_message_read_by (
    push_message_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (push_message_id, user_id),
    FOREIGN KEY (push_message_id) REFERENCES push_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Application Notifications Table
CREATE TABLE app_notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    title TEXT,
    body TEXT,
    reference_id TEXT
);

-- Notification Recipients Join Table
CREATE TABLE notification_recipients (
    notification_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (notification_id, user_id),
    FOREIGN KEY (notification_id) REFERENCES app_notifications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notification Read Status Table
CREATE TABLE notification_read_by (
    notification_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (notification_id, user_id),
    FOREIGN KEY (notification_id) REFERENCES app_notifications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ========== System Tables ==========

-- System Logs Table
CREATE TABLE system_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    message TEXT NOT NULL
);

-- System Settings Table
CREATE TABLE system_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- ========== Contract Notification Tables ==========

CREATE TABLE contract_end_notifications (
    id TEXT PRIMARY KEY,
    team_ids TEXT[],
    recipient_user_ids TEXT[],
    recipient_emails TEXT[],
    threshold_days INTEGER[]
);

-- To track which notifications have been sent for which contract/threshold
CREATE TABLE sent_notifications (
    id SERIAL PRIMARY KEY,
    contract_id TEXT NOT NULL,
    threshold_day INTEGER NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(contract_id, threshold_day),
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);

-- ========== Rule Book and Analysis Tables ==========

CREATE TABLE rule_books (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version_name TEXT NOT NULL,
    version INTEGER NOT NULL,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    row_count INTEGER NOT NULL,
    UNIQUE(version_name, version)
);

CREATE TABLE rule_book_entries (
    id TEXT PRIMARY KEY,
    rule_book_id TEXT NOT NULL,
    data JSONB,
    FOREIGN KEY (rule_book_id) REFERENCES rule_books(id) ON DELETE CASCADE
);

CREATE TABLE reference_tables (
    id TEXT PRIMARY KEY,
    rule_book_id TEXT NOT NULL,
    name TEXT NOT NULL,
    data JSONB,
    FOREIGN KEY (rule_book_id) REFERENCES rule_books(id) ON DELETE CASCADE
);

CREATE TABLE project_analyses (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_modification_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    new_use TEXT[],
    fulfillability TEXT[],
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE (project_id, version)
);

CREATE TABLE rule_analysis_results (
    id TEXT PRIMARY KEY,
    project_analysis_id TEXT NOT NULL,
    rule_book_entry_id TEXT NOT NULL,
    checklist_status TEXT,
    revised_fulfillability TEXT,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (project_analysis_id) REFERENCES project_analyses(id) ON DELETE CASCADE,
    FOREIGN KEY (rule_book_entry_id) REFERENCES rule_book_entries(id) ON DELETE CASCADE,
    UNIQUE(project_analysis_id, rule_book_entry_id)
);

-- ========== Foreign Key Constraints that depend on other tables ==========

-- Add foreign key constraints after all tables are created
ALTER TABLE users ADD CONSTRAINT fk_reports_to FOREIGN KEY (reports_to) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_team_id FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- Create an index for faster lookups on reports_to
CREATE INDEX idx_users_reports_to ON users(reports_to);
CREATE INDEX idx_users_team_id ON users(team_id);
CREATE INDEX idx_contracts_user_id ON contracts(user_id);
CREATE INDEX idx_user_projects_project_id ON user_projects(project_id);


-- ========== Initial Data Inserts ==========

-- Insert Teams
INSERT INTO teams (id, name) VALUES ('team-design', 'Design'), ('team-eng', 'Engineering');

-- Insert Tasks
INSERT INTO tasks (id, name, details) VALUES
('task-1', 'UI Design', 'Designing user interfaces for new features.'),
('task-2', 'UX Research', 'Conducting user research and creating wireframes.'),
('task-3', 'Frontend Development', 'Building the user interface with React.'),
('task-4', 'Backend Development', 'Developing APIs and database logic.'),
('task-5', 'Project Management', 'Planning and overseeing project progress.');

-- Insert Projects (with auto-generated project_number)
-- We need a small function to insert projects with a sequence
DO $$
DECLARE
    proj_1_num TEXT;
    proj_2_num TEXT;
    proj_3_num TEXT;
BEGIN
    SELECT lpad(nextval('project_number_seq')::text, 5, '0') INTO proj_1_num;
    INSERT INTO projects (id, name, project_number, project_manager, creator_id, address, project_owner, current_use) VALUES 
    ('proj-1', 'Website Redesign', proj_1_num, 'Jane Doe', 'user-admin', '123 Main St, Anytown', 'Client A', 'General');
    
    SELECT lpad(nextval('project_number_seq')::text, 5, '0') INTO proj_2_num;
    INSERT INTO projects (id, name, project_number, project_manager, creator_id, address, project_owner, current_use) VALUES 
    ('proj-2', 'Mobile App', proj_2_num, 'Jane Doe', 'user-lead', '456 Oak Ave, Sometown', 'Client B', 'Office');

    SELECT lpad(nextval('project_number_seq')::text, 5, '0') INTO proj_3_num;
    INSERT INTO projects (id, name, project_number, project_manager, creator_id, address, project_owner, current_use) VALUES 
    ('proj-3', 'Internal CRM', proj_3_num, 'John Smith', 'user-lead', '789 Pine Ln, Yourtown', 'Internal', 'Office');
END $$;


-- Insert Users
INSERT INTO users (id, name, email, password, role, avatar, reports_to, team_id) VALUES
('user-admin', 'Admin Account', 'admin@example.com', 'password', 'Super Admin', 'https://placehold.co/100x100/A1A1AA/4A4A4A.png?text=A', NULL, NULL),
('user-lead', 'Jane Doe', 'jane.doe@example.com', 'password', 'Team Lead', 'https://placehold.co/100x100/8B5CF6/FFFFFF.png?text=J', 'user-admin', 'team-eng'),
('user-1', 'John Smith', 'john.smith@example.com', 'password', 'User', 'https://placehold.co/100x100/34D399/FFFFFF.png?text=J', 'user-lead', 'team-eng'),
('user-2', 'Emily White', 'emily.white@example.com', 'password', 'User', 'https://placehold.co/100x100/FBBF24/FFFFFF.png?text=E', 'user-lead', 'team-design');

-- Insert Contracts
INSERT INTO contracts (id, user_id, start_date, end_date) VALUES
('contract-admin-1', 'user-admin', '2023-01-01', NULL),
('contract-lead-1', 'user-lead', '2023-03-15', NULL),
('contract-user1-1', 'user-1', '2023-05-20', NULL),
('contract-user2-1', 'user-2', '2023-07-01', '2025-12-31');

-- Insert User-Project Associations
INSERT INTO user_projects (user_id, project_id) VALUES
('user-admin', 'proj-1'), ('user-admin', 'proj-2'), ('user-admin', 'proj-3'),
('user-lead', 'proj-2'), ('user-lead', 'proj-3'),
('user-1', 'proj-2'),
('user-2', 'proj-1');

-- Insert Holiday Requests
INSERT INTO holiday_requests (id, user_id, start_date, end_date, status) VALUES
('hr-1', 'user-1', '2024-08-05', '2024-08-09', 'Approved'),
('hr-2', 'user-2', '2024-09-02', '2024-09-02', 'Pending');

-- Insert Push Messages
INSERT INTO push_messages (id, context, message_body, start_date, end_date, receivers) VALUES
('msg-1', 'Welcome!', 'Welcome to the new Phase0 platform!', NOW() - interval '7 days', NOW() + interval '7 days', 'all-members');

-- Insert System Logs
INSERT INTO system_logs (id, timestamp, message) VALUES
('log-1', NOW(), 'System initialized with mock data.');

-- Insert default setting
INSERT INTO system_settings (key, value) VALUES ('isHolidaysNavVisible', 'true');
INSERT INTO system_settings (key, value) VALUES ('lastContractNotificationCheckTime', '1970-01-01T00:00:00.000Z');
INSERT INTO system_settings (key, value) VALUES ('lastSystemLogPurgeTime', '1970-01-01T00:00:00.000Z');
