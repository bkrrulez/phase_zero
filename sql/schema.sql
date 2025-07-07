-- This schema is designed for PostgreSQL.

-- Custom ENUM types for roles and statuses to ensure data integrity.
CREATE TYPE user_role AS ENUM ('Employee', 'Team Lead', 'Super Admin');
CREATE TYPE holiday_status AS ENUM ('Pending', 'Approved', 'Rejected');

-- Stores user information and their contract details.
-- Note: In a real application, you would not store passwords in plain text.
-- This schema includes a 'password_hash' column for storing hashed passwords.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    avatar TEXT, -- URL to the avatar image
    reports_to UUID, -- Foreign key to another user (manager)
    start_date DATE NOT NULL,
    end_date DATE,
    weekly_hours INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- A user's manager must be another user in the table.
    FOREIGN KEY (reports_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Stores project information.
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stores task types that can be logged against projects.
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for the many-to-many relationship between users and projects.
-- This determines which projects a user can log time against.
CREATE TABLE user_projects (
    user_id UUID NOT NULL,
    project_id UUID NOT NULL,

    PRIMARY KEY (user_id, project_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Stores individual time log entries for users.
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    project_id UUID NOT NULL,
    task_id UUID NOT NULL,
    entry_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_hours NUMERIC(4, 2) NOT NULL, -- e.g., 8.50 for 8 hours and 30 minutes
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CHECK (end_time > start_time)
);

-- Stores holiday requests from users.
CREATE TABLE holiday_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status holiday_status NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (end_date >= start_date)
);

-- Add indexes for frequently queried columns to improve performance.
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_time_entries_user_date ON time_entries(user_id, entry_date);
CREATE INDEX idx_holiday_requests_user_status ON holiday_requests(user_id, status);
