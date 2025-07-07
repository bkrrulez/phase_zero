-- PostgreSQL schema and data for TimeTool
-- This script creates the database schema and populates it with mock data.

-- Drop tables if they exist to start fresh
DROP TABLE IF EXISTS notification_read_by CASCADE;
DROP TABLE IF EXISTS notification_recipients CASCADE;
DROP TABLE IF EXISTS push_message_read_by CASCADE;
DROP TABLE IF EXISTS push_message_teams CASCADE;
DROP TABLE IF EXISTS team_projects CASCADE;
DROP TABLE IF EXISTS project_tasks CASCADE;
DROP TABLE IF EXISTS user_projects CASCADE;
DROP TABLE IF EXISTS app_notifications CASCADE;
DROP TABLE IF EXISTS push_messages CASCADE;
DROP TABLE IF EXISTS system_logs CASCADE;
DROP TABLE IF EXISTS freeze_rules CASCADE;
DROP TABLE IF EXISTS custom_holidays CASCADE;
DROP TABLE IF EXISTS public_holidays CASCADE;
DROP TABLE IF EXISTS holiday_requests CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS teams CASCADE;


-- =============================================
-- Core Tables
-- =============================================

CREATE TABLE teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    avatar TEXT,
    team_id TEXT REFERENCES teams(id),
    reports_to TEXT REFERENCES users(id),
    contract_start_date DATE NOT NULL,
    contract_end_date DATE,
    contract_weekly_hours INTEGER NOT NULL
);

CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    budget NUMERIC,
    details TEXT
);

CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    details TEXT
);


-- =============================================
-- Activity & Tracking Tables
-- =============================================

CREATE TABLE time_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    project_id TEXT NOT NULL REFERENCES projects(id),
    task_id TEXT NOT NULL REFERENCES tasks(id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration NUMERIC NOT NULL,
    remarks TEXT
);

CREATE TABLE holiday_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL
);


-- =============================================
-- Settings & Configuration Tables
-- =============================================

CREATE TABLE public_holidays (
    id TEXT PRIMARY KEY,
    country TEXT NOT NULL,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL
);

CREATE TABLE custom_holidays (
    id TEXT PRIMARY KEY,
    country TEXT NOT NULL,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL,
    applies_to TEXT NOT NULL -- 'all-members', 'all-teams', or a team.id
);

CREATE TABLE freeze_rules (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL, -- 'all-teams' or a specific team id
    start_date DATE NOT NULL,
    end_date DATE NOT NULL
);

CREATE TABLE system_logs (
    id TEXT PRIMARY KEY,
    "timestamp" TIMESTAMPTZ NOT NULL,
    message TEXT NOT NULL
);


-- =============================================
-- Messaging & Notification Tables
-- =============================================

CREATE TABLE push_messages (
    id TEXT PRIMARY KEY,
    context TEXT NOT NULL,
    message_body TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    receivers TEXT NOT NULL -- 'all-members', 'all-teams', or 'individual-teams'
);

CREATE TABLE app_notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    reference_id TEXT NOT NULL
);


-- =============================================
-- Join Tables (Many-to-Many Relationships)
-- =============================================

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


-- =============================================
-- MOCK DATA INSERTION
-- NOTE: Using a fixed year (2025) for consistency as mock data is dynamic.
-- =============================================

-- Teams
INSERT INTO teams (id, name) VALUES
('team-1', 'Alpha Team'),
('team-2', 'Bravo Team'),
('team-3', 'Client Services');

-- Users
INSERT INTO users (id, name, email, role, avatar, reports_to, team_id, contract_start_date, contract_end_date, contract_weekly_hours) VALUES
('admin-1', 'Admin One', 'admin1@example.com', 'Super Admin', 'https://placehold.co/100x100.png', NULL, NULL, '2021-01-01', '2025-08-31', 40);

INSERT INTO users (id, name, email, role, avatar, reports_to, team_id, contract_start_date, contract_end_date, contract_weekly_hours) VALUES
('user-1', 'Alex Smith', 'alex.smith@example.com', 'Team Lead', 'https://placehold.co/100x100.png', 'admin-1', 'team-1', '2023-01-01', NULL, 40),
('user-2', 'Jane Doe', 'jane.doe@example.com', 'Employee', 'https://placehold.co/100x100.png', 'user-1', 'team-1', '2023-03-15', NULL, 40),
('user-3', 'Peter Jones', 'peter.jones@example.com', 'Employee', 'https://placehold.co/100x100.png', 'user-1', 'team-1', '2024-08-01', '2025-01-31', 20),
('user-4', 'Susan Miller', 'susan.miller@example.com', 'Employee', 'https://placehold.co/100x100.png', 'user-1', 'team-1', '2022-11-20', NULL, 40);

-- Projects
INSERT INTO projects (id, name, budget, details) VALUES
('proj-1', 'Project A', 50000, 'Development of the new company website.'),
('proj-2', 'Project B', 75000, 'Migration of legacy systems to the cloud.'),
('proj-3', 'Internal', 10000, 'Internal tools and process improvements.'),
('proj-4', 'Client X', 120000, 'Marketing campaign for Client X.');

-- Tasks
INSERT INTO tasks (id, name, details) VALUES
('task-1', 'Feature Development', 'Developing new features for projects.'),
('task-2', 'Bug Fixing', 'Resolving bugs and issues reported.'),
('task-3', 'UI/UX Design', 'Designing user interfaces and experiences.'),
('task-4', 'Code Review', 'Reviewing pull requests and code quality.'),
('task-5', 'Documentation', 'Writing and updating project documentation.'),
('task-6', 'Team Meeting', 'Attending and participating in team meetings.'),
('task-7', 'Client Communication', 'Communicating with clients and stakeholders.'),
('task-8', 'Admin - System Check', 'Performing routine system checks.'),
('task-9', 'Admin - Payroll', 'Processing payroll for team members.'),
('task-10', 'Admin - User Management', 'Managing user accounts and permissions.'),
('task-11', 'Customer Support', 'Providing support to customers.'),
('task-12', 'Internal - HR Training', 'Participating in HR training sessions.');

-- User Projects (Join Table)
INSERT INTO user_projects (user_id, project_id) VALUES
('admin-1', 'proj-1'), ('admin-1', 'proj-2'), ('admin-1', 'proj-3'), ('admin-1', 'proj-4'),
('user-1', 'proj-1'), ('user-1', 'proj-2'), ('user-1', 'proj-3'),
('user-2', 'proj-1'), ('user-2', 'proj-4'),
('user-3', 'proj-2'),
('user-4', 'proj-1'), ('user-4', 'proj-2'), ('user-4', 'proj-3');

-- Project Tasks (Join Table)
INSERT INTO project_tasks (project_id, task_id) VALUES
('proj-1', 'task-1'), ('proj-1', 'task-2'), ('proj-1', 'task-4'),
('proj-2', 'task-2'), ('proj-2', 'task-3'),
('proj-3', 'task-5'), ('proj-3', 'task-6'), ('proj-3', 'task-12'),
('proj-4', 'task-7');

-- Team Projects (Join Table)
INSERT INTO team_projects (team_id, project_id) VALUES
('team-1', 'proj-1'), ('team-1', 'proj-2'), ('team-1', 'proj-3'),
('team-2', 'proj-4');

-- Time Entries (Parsed from mock data)
INSERT INTO time_entries (id, user_id, date, start_time, end_time, project_id, task_id, duration, remarks) VALUES
('t-1', 'user-1', '2025-07-01', '09:00', '17:00', 'proj-1', 'task-1', 8, 'Completed the main logic for the new feature.'),
('t-2', 'user-1', '2025-07-02', '09:00', '17:30', 'proj-2', 'task-2', 8.5, NULL),
('t-3', 'user-1', '2025-07-03', '10:00', '18:00', 'proj-3', 'task-6', 8, 'Weekly sync with the team.'),
('t-4', 'user-1', '2025-07-04', '09:00', '17:00', 'proj-1', 'task-4', 8, NULL),
('t-5', 'user-2', '2025-07-01', '09:00', '18:00', 'proj-3', 'task-5', 9, 'Updated the API documentation.'),
('t-6', 'user-2', '2025-07-02', '09:00', '18:30', 'proj-1', 'task-3', 9.5, NULL),
('t-8', 'user-2', '2025-07-03', '09:00', '17:00', 'proj-1', 'task-3', 8, 'Finalized the mockups.'),
('t-7', 'user-3', '2025-07-01', '13:00', '16:00', 'proj-3', 'task-11', 3, NULL),
('t-9', 'user-3', '2025-07-02', '13:00', '17:00', 'proj-3', 'task-11', 4, NULL),
('t-10', 'user-3', '2025-07-03', '13:00', '15:00', 'proj-3', 'task-11', 2, 'Handled a few support tickets.'),
('t-11', 'user-4', '2025-07-01', '09:00', '16:00', 'proj-3', 'task-12', 7, NULL),
('t-12', 'user-4', '2025-07-02', '10:00', '17:00', 'proj-4', 'task-7', 7, NULL),
('t-13', 'user-4', '2025-07-03', '09:00', '17:00', 'proj-4', 'task-7', 8, NULL),
('t-14', 'admin-1', '2025-07-01', '09:00', '17:00', 'proj-3', 'task-8', 8, 'All systems operational.'),
('t-15', 'admin-1', '2025-07-02', '09:00', '17:00', 'proj-3', 'task-9', 8, NULL),
('t-16', 'admin-1', '2025-07-03', '09:00', '17:00', 'proj-3', 'task-10', 8, NULL);

-- Holiday Requests
INSERT INTO holiday_requests (id, user_id, start_date, end_date, status) VALUES
('h-1', 'user-1', '2025-07-15', '2025-07-15', 'Approved'),
('h-2', 'user-2', '2025-08-12', '2025-08-16', 'Pending'),
('h-3', 'user-4', '2025-06-10', '2025-06-10', 'Rejected');

-- Public Holidays
INSERT INTO public_holidays (id, country, name, date, type) VALUES
('ph-1', 'USA', 'New Year''s Day', '2025-01-01', 'Full Day'),
('ph-2', 'USA', 'Martin Luther King, Jr. Day', '2025-01-20', 'Full Day'),
('ph-3', 'USA', 'Independence Day', '2025-07-04', 'Full Day'),
('ph-4', 'USA', 'Labor Day', '2025-09-01', 'Full Day'),
('ph-5', 'USA', 'Thanksgiving Day', '2025-11-27', 'Full Day'),
('ph-6', 'USA', 'Christmas Day', '2025-12-25', 'Full Day'),
('ph-7', 'UK', 'Good Friday', '2025-04-18', 'Full Day'),
('ph-8', 'UK', 'Boxing Day', '2025-12-26', 'Full Day');

-- Custom Holidays
INSERT INTO custom_holidays (id, country, name, date, type, applies_to) VALUES
('ch-1', 'Global', 'Company Anniversary', '2025-09-15', 'Full Day', 'all-members'),
('ch-2', 'USA', 'Alpha Team Offsite', '2025-06-20', 'Full Day', 'team-1');

-- System Logs
INSERT INTO system_logs (id, "timestamp", message) VALUES
('log-0', NOW(), 'System initialized.');
