-- Drop tables in reverse order of creation to avoid foreign key constraint issues.
DROP TABLE IF EXISTS notification_read_by CASCADE;
DROP TABLE IF EXISTS notification_recipients CASCADE;
DROP TABLE IF EXISTS push_message_read_by CASCADE;
DROP TABLE IF EXISTS push_message_teams CASCADE;
DROP TABLE IF EXISTS team_projects CASCADE;
DROP TABLE IF EXISTS project_tasks CASCADE;
DROP TABLE IF EXISTS user_projects CASCADE;
DROP TABLE IF EXISTS system_logs CASCADE;
DROP TABLE IF EXISTS app_notifications CASCADE;
DROP TABLE IF EXISTS push_messages CASCADE;
DROP TABLE IF EXISTS freeze_rules CASCADE;
DROP TABLE IF EXISTS custom_holidays CASCADE;
DROP TABLE IF EXISTS public_holidays CASCADE;
DROP TABLE IF EXISTS holiday_requests CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;

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
    role TEXT NOT NULL CHECK (role IN ('Employee', 'Team Lead', 'Super Admin')),
    avatar TEXT,
    team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
    reports_to TEXT REFERENCES users(id) ON DELETE SET NULL,
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

-- Activity & Tracking Tables
CREATE TABLE time_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id TEXT,
    task_id TEXT,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration NUMERIC NOT NULL,
    remarks TEXT
);

CREATE TABLE holiday_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected'))
);

-- Settings & Configuration Tables
CREATE TABLE public_holidays (
    id TEXT PRIMARY KEY,
    country TEXT NOT NULL,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Full Day', 'Half Day'))
);

CREATE TABLE custom_holidays (
    id TEXT PRIMARY KEY,
    country TEXT NOT NULL,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Full Day', 'Half Day')),
    applies_to TEXT NOT NULL
);

CREATE TABLE freeze_rules (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL
);

CREATE TABLE system_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    message TEXT NOT NULL
);

-- Messaging & Notification Tables
CREATE TABLE push_messages (
    id TEXT PRIMARY KEY,
    context TEXT NOT NULL,
    message_body TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    receivers TEXT NOT NULL -- 'all-members', 'all-teams', or a JSON array of team_ids
);

CREATE TABLE app_notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    reference_id TEXT NOT NULL
);

CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Join Tables (Many-to-Many Relationships)
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


-- SEED DATA
-- Insert Teams
INSERT INTO teams (id, name) VALUES ('team-design', 'Design');
INSERT INTO teams (id, name) VALUES ('team-eng', 'Engineering');

-- Insert Users
-- Note: 'password' is used for all users except the admin for simplicity. In a real app, use hashed passwords.
INSERT INTO users (id, name, email, password, role, avatar, reports_to, team_id, contract_start_date, contract_end_date, contract_weekly_hours) VALUES ('user-admin', 'Bikramjit Chowdhury', 'admin@example.com', 'password', 'Super Admin', 'https://placehold.co/100x100.png', NULL, NULL, '2023-01-01', NULL, 40);
INSERT INTO users (id, name, email, password, role, avatar, reports_to, team_id, contract_start_date, contract_end_date, contract_weekly_hours) VALUES ('user-lead', 'Jane Doe', 'jane.doe@example.com', 'password', 'Team Lead', 'https://placehold.co/100x100.png', 'user-admin', 'team-eng', '2023-03-15', NULL, 40);
INSERT INTO users (id, name, email, password, role, avatar, reports_to, team_id, contract_start_date, contract_end_date, contract_weekly_hours) VALUES ('user-1', 'John Smith', 'john.smith@example.com', 'password', 'Employee', 'https://placehold.co/100x100.png', 'user-lead', 'team-eng', '2023-05-20', NULL, 40);
INSERT INTO users (id, name, email, password, role, avatar, reports_to, team_id, contract_start_date, contract_end_date, contract_weekly_hours) VALUES ('user-2', 'Emily White', 'emily.white@example.com', 'password', 'Employee', 'https://placehold.co/100x100.png', 'user-lead', 'team-eng', '2023-07-01', '2024-12-31', 32);

-- Insert Tasks
INSERT INTO tasks (id, name, details) VALUES ('task-1', 'UI Design', 'Designing user interfaces for new features.');
INSERT INTO tasks (id, name, details) VALUES ('task-2', 'UX Research', 'Conducting user research and creating wireframes.');
INSERT INTO tasks (id, name, details) VALUES ('task-3', 'Frontend Development', 'Building the user interface with React.');
INSERT INTO tasks (id, name, details) VALUES ('task-4', 'Backend Development', 'Developing APIs and database logic.');
INSERT INTO tasks (id, name, details) VALUES ('task-5', 'Project Management', 'Planning and overseeing project progress.');

-- Insert Projects
INSERT INTO projects (id, name, budget, details) VALUES ('proj-1', 'Website Redesign', 50000, 'Complete overhaul of the company website.');
INSERT INTO projects (id, name, budget, details) VALUES ('proj-2', 'Mobile App', 75000, 'New mobile application for iOS and Android.');
INSERT INTO projects (id, name, budget, details) VALUES ('proj-3', 'Internal CRM', 30000, 'Customer relationship management tool for the sales team.');

-- Insert Project-Task Associations
INSERT INTO project_tasks (project_id, task_id) VALUES ('proj-1', 'task-1'), ('proj-1', 'task-2'), ('proj-1', 'task-3'), ('proj-1', 'task-5');
INSERT INTO project_tasks (project_id, task_id) VALUES ('proj-2', 'task-1'), ('proj-2', 'task-3'), ('proj-2', 'task-4'), ('proj-2', 'task-5');
INSERT INTO project_tasks (project_id, task_id) VALUES ('proj-3', 'task-3'), ('proj-3', 'task-4');

-- Insert User-Project Associations
INSERT INTO user_projects (user_id, project_id) VALUES ('user-admin', 'proj-1'), ('user-admin', 'proj-2'), ('user-admin', 'proj-3');
INSERT INTO user_projects (user_id, project_id) VALUES ('user-lead', 'proj-2'), ('user-lead', 'proj-3');
INSERT INTO user_projects (user_id, project_id) VALUES ('user-1', 'proj-2');
INSERT INTO user_projects (user_id, project_id) VALUES ('user-2', 'proj-1');

-- Insert Time Entries (Example, converted task string to project/task ids)
INSERT INTO time_entries (id, user_id, date, start_time, end_time, project_id, task_id, duration, remarks) VALUES ('te-1', 'user-1', '2024-07-01', '09:00', '12:00', 'proj-2', 'task-4', 3, 'Worked on user auth API.');
INSERT INTO time_entries (id, user_id, date, start_time, end_time, project_id, task_id, duration, remarks) VALUES ('te-2', 'user-1', '2024-07-01', '13:00', '17:00', 'proj-2', 'task-4', 4, 'Database schema design.');
INSERT INTO time_entries (id, user_id, date, start_time, end_time, project_id, task_id, duration, remarks) VALUES ('te-3', 'user-2', '2024-07-02', '10:00', '16:00', 'proj-1', 'task-1', 5.5, 'Created new landing page mockups.');

-- Insert Holiday Requests
INSERT INTO holiday_requests (id, user_id, start_date, end_date, status) VALUES ('hr-1', 'user-1', '2024-08-05', '2024-08-09', 'Approved');
INSERT INTO holiday_requests (id, user_id, start_date, end_date, status) VALUES ('hr-2', 'user-2', '2024-09-02', '2024-09-02', 'Pending');

-- Insert Public Holidays
INSERT INTO public_holidays (id, country, name, date, type) VALUES ('ph-1', 'USA', 'Independence Day', '2024-07-04', 'Full Day');
INSERT INTO public_holidays (id, country, name, date, type) VALUES ('ph-2', 'USA', 'Labor Day', '2024-09-02', 'Full Day');

-- Insert Custom Holidays
INSERT INTO custom_holidays (id, country, name, date, type, applies_to) VALUES ('ch-1', 'Global', 'Company Anniversary', '2024-10-10', 'Full Day', 'all-members');

-- Insert System Logs
INSERT INTO system_logs (id, timestamp, message) VALUES ('log-1', NOW(), 'System initialized from SQL script.');

-- Insert Push Messages
INSERT INTO push_messages (id, context, message_body, start_date, end_date, receivers) VALUES ('msg-1', 'Welcome!', 'Welcome to the new TimeTool platform!', NOW() - interval '7 days', NOW() + interval '7 days', 'all-members');

-- Insert App Settings
INSERT INTO app_settings (key, value) VALUES ('annualLeaveAllowance', '25');

    