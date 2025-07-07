--
-- PostgreSQL database schema for TimeTool
--

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS "notification_read_by" CASCADE;
DROP TABLE IF EXISTS "notification_recipients" CASCADE;
DROP TABLE IF EXISTS "push_message_read_by" CASCADE;
DROP TABLE IF EXISTS "push_message_teams" CASCADE;
DROP TABLE IF EXISTS "team_projects" CASCADE;
DROP TABLE IF EXISTS "project_tasks" CASCADE;
DROP TABLE IF EXISTS "user_projects" CASCADE;
DROP TABLE IF EXISTS "system_logs" CASCADE;
DROP TABLE IF EXISTS "freeze_rules" CASCADE;
DROP TABLE IF EXISTS "custom_holidays" CASCADE;
DROP TABLE IF EXISTS "public_holidays" CASCADE;
DROP TABLE IF EXISTS "holiday_requests" CASCADE;
DROP TABLE IF EXISTS "time_entries" CASCADE;
DROP TABLE IF EXISTS "tasks" CASCADE;
DROP TABLE IF EXISTS "projects" CASCADE;
DROP TABLE IF EXISTS "teams" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "app_notifications" CASCADE;
DROP TABLE IF EXISTS "push_messages" CASCADE;


-- Core Tables
CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "avatar" TEXT,
  "team_id" TEXT,
  "reports_to" TEXT,
  "contract_start_date" DATE NOT NULL,
  "contract_end_date" DATE,
  "contract_weekly_hours" INTEGER NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "teams" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL UNIQUE,
  PRIMARY KEY ("id")
);

CREATE TABLE "projects" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "budget" NUMERIC,
  "details" TEXT,
  PRIMARY KEY ("id")
);

CREATE TABLE "tasks" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "details" TEXT,
  PRIMARY KEY ("id")
);


-- Activity & Tracking Tables
CREATE TABLE "time_entries" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "task_id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "start_time" TIME NOT NULL,
  "end_time" TIME NOT NULL,
  "duration" NUMERIC NOT NULL,
  "remarks" TEXT,
  PRIMARY KEY ("id")
);

CREATE TABLE "holiday_requests" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "status" TEXT NOT NULL,
  PRIMARY KEY ("id")
);


-- Settings & Configuration Tables
CREATE TABLE "public_holidays" (
  "id" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "type" TEXT NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "custom_holidays" (
  "id" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "type" TEXT NOT NULL,
  "applies_to" TEXT NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "freeze_rules" (
  "id" TEXT NOT NULL,
  "team_id" TEXT NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "system_logs" (
  "id" TEXT NOT NULL,
  "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
  "message" TEXT NOT NULL,
  PRIMARY KEY ("id")
);


-- Messaging & Notification Tables
CREATE TABLE "push_messages" (
  "id" TEXT NOT NULL,
  "context" TEXT NOT NULL,
  "message_body" TEXT NOT NULL,
  "start_date" TIMESTAMP WITH TIME ZONE NOT NULL,
  "end_date" TIMESTAMP WITH TIME ZONE NOT NULL,
  "receivers" TEXT NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "app_notifications" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "reference_id" TEXT NOT NULL,
  PRIMARY KEY ("id")
);


-- Join Tables (Many-to-Many Relationships)
CREATE TABLE "user_projects" (
  "user_id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  PRIMARY KEY ("user_id", "project_id")
);

CREATE TABLE "project_tasks" (
  "project_id" TEXT NOT NULL,
  "task_id" TEXT NOT NULL,
  PRIMARY KEY ("project_id", "task_id")
);

CREATE TABLE "team_projects" (
  "team_id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  PRIMARY KEY ("team_id", "project_id")
);

CREATE TABLE "push_message_teams" (
  "push_message_id" TEXT NOT NULL,
  "team_id" TEXT NOT NULL,
  PRIMARY KEY ("push_message_id", "team_id")
);

CREATE TABLE "push_message_read_by" (
  "push_message_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  PRIMARY KEY ("push_message_id", "user_id")
);

CREATE TABLE "notification_recipients" (
  "notification_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  PRIMARY KEY ("notification_id", "user_id")
);

CREATE TABLE "notification_read_by" (
  "notification_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  PRIMARY KEY ("notification_id", "user_id")
);

-- Foreign Key Constraints
ALTER TABLE "users" ADD FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON DELETE SET NULL;
ALTER TABLE "users" ADD FOREIGN KEY ("reports_to") REFERENCES "users" ("id") ON DELETE SET NULL;
ALTER TABLE "time_entries" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "time_entries" ADD FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE;
ALTER TABLE "time_entries" ADD FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE CASCADE;
ALTER TABLE "holiday_requests" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "user_projects" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "user_projects" ADD FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE;
ALTER TABLE "project_tasks" ADD FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE;
ALTER TABLE "project_tasks" ADD FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE CASCADE;
ALTER TABLE "team_projects" ADD FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON DELETE CASCADE;
ALTER TABLE "team_projects" ADD FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE;
ALTER TABLE "push_message_teams" ADD FOREIGN KEY ("push_message_id") REFERENCES "push_messages" ("id") ON DELETE CASCADE;
ALTER TABLE "push_message_teams" ADD FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON DELETE CASCADE;
ALTER TABLE "push_message_read_by" ADD FOREIGN KEY ("push_message_id") REFERENCES "push_messages" ("id") ON DELETE CASCADE;
ALTER TABLE "push_message_read_by" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "notification_recipients" ADD FOREIGN KEY ("notification_id") REFERENCES "app_notifications" ("id") ON DELETE CASCADE;
ALTER TABLE "notification_recipients" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "notification_read_by" ADD FOREIGN KEY ("notification_id") REFERENCES "app_notifications" ("id") ON DELETE CASCADE;
ALTER TABLE "notification_read_by" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

-- Insert Mock Data
INSERT INTO "teams" ("id", "name") VALUES
('team-1', 'Alpha Team'),
('team-2', 'Bravo Team'),
('team-3', 'Client Services');

INSERT INTO "users" ("id", "name", "email", "password", "role", "avatar", "reports_to", "team_id", "contract_start_date", "contract_end_date", "contract_weekly_hours") VALUES
('admin-1', 'Admin One', 'admin@example.com', 'password', 'Super Admin', 'https://placehold.co/100x100.png', NULL, NULL, '2020-01-01', NULL, 40),
('user-1', 'Alex Smith', 'alex.smith@example.com', 'password', 'Team Lead', 'https://placehold.co/100x100.png', 'admin-1', 'team-1', '2022-01-01', NULL, 40),
('user-2', 'Jane Doe', 'jane.doe@example.com', 'password', 'Employee', 'https://placehold.co/100x100.png', 'user-1', 'team-1', '2022-03-15', NULL, 40),
('user-3', 'Peter Jones', 'peter.jones@example.com', 'password', 'Employee', 'https://placehold.co/100x100.png', 'user-1', 'team-1', '2023-08-01', '2025-01-31', 20),
('user-4', 'Susan Miller', 'susan.miller@example.com', 'password', 'Employee', 'https://placehold.co/100x100.png', 'user-1', 'team-1', '2021-11-20', NULL, 40);

INSERT INTO "projects" ("id", "name", "budget", "details") VALUES
('proj-1', 'Project A', 50000, 'Development of the new company website.'),
('proj-2', 'Project B', 75000, 'Migration of legacy systems to the cloud.'),
('proj-3', 'Internal', 10000, 'Internal tools and process improvements.'),
('proj-4', 'Client X', 120000, 'Marketing campaign for Client X.');

INSERT INTO "tasks" ("id", "name", "details") VALUES
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

-- Associate users with projects
INSERT INTO "user_projects" ("user_id", "project_id") VALUES
('admin-1', 'proj-1'), ('admin-1', 'proj-2'), ('admin-1', 'proj-3'), ('admin-1', 'proj-4'),
('user-1', 'proj-1'), ('user-1', 'proj-2'), ('user-1', 'proj-3'),
('user-2', 'proj-1'), ('user-2', 'proj-4'),
('user-3', 'proj-2'),
('user-4', 'proj-1'), ('user-4', 'proj-2'), ('user-4', 'proj-3');

-- Associate teams with projects
INSERT INTO "team_projects" ("team_id", "project_id") VALUES
('team-1', 'proj-1'),
('team-1', 'proj-2'),
('team-1', 'proj-3'),
('team-2', 'proj-4');

-- Associate projects with tasks
INSERT INTO "project_tasks" ("project_id", "task_id") VALUES
('proj-1', 'task-1'), ('proj-1', 'task-2'), ('proj-1', 'task-4'),
('proj-2', 'task-2'), ('proj-2', 'task-3'),
('proj-3', 'task-5'), ('proj-3', 'task-6'), ('proj-3', 'task-12'),
('proj-4', 'task-7');


-- Insert a few time entries for the current month
INSERT INTO "time_entries" ("id", "user_id", "project_id", "task_id", "date", "start_time", "end_time", "duration", "remarks") VALUES
('t-1', 'user-1', 'proj-1', 'task-1', CURRENT_DATE - INTERVAL '3 days', '09:00', '17:00', 8, 'Completed the main logic for the new feature.'),
('t-2', 'user-1', 'proj-2', 'task-2', CURRENT_DATE - INTERVAL '2 days', '09:00', '17:30', 8.5, NULL),
('t-3', 'user-1', 'proj-3', 'task-6', CURRENT_DATE - INTERVAL '1 day', '10:00', '18:00', 8, 'Weekly sync with the team.'),
('t-5', 'user-2', 'proj-3', 'task-5', CURRENT_DATE - INTERVAL '3 days', '09:00', '18:00', 9, 'Updated the API documentation.'),
('t-6', 'user-2', 'proj-1', 'task-3', CURRENT_DATE - INTERVAL '2 days', '09:00', '18:30', 9.5, NULL),
('t-7', 'user-3', 'proj-4', 'task-11', CURRENT_DATE - INTERVAL '3 days', '13:00', '16:00', 3, NULL);

-- Insert sample holiday requests
INSERT INTO "holiday_requests" ("id", "user_id", "start_date", "end_date", "status") VALUES
('h-1', 'user-1', CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '12 days', 'Approved'),
('h-2', 'user-2', CURRENT_DATE + INTERVAL '20 days', CURRENT_DATE + INTERVAL '25 days', 'Pending'),
('h-3', 'user-4', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '4 days', 'Rejected');

-- Insert public holidays for the current year
INSERT INTO "public_holidays" ("id", "country", "name", "date", "type") VALUES
('ph-1', 'USA', 'New Year''s Day', MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, 1, 1), 'Full Day'),
('ph-2', 'USA', 'Independence Day', MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, 7, 4), 'Full Day'),
('ph-3', 'USA', 'Christmas Day', MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, 12, 25), 'Full Day');

-- Insert initial system log
INSERT INTO "system_logs" ("id", "timestamp", "message") VALUES
('log-0', NOW(), 'System initialized and database created.');
