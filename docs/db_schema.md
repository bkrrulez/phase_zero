# Database Schema for TimeTool

This document outlines the database schema based on the application's data models. The schema is designed for a relational database like PostgreSQL or MySQL.

## Primary Keys and Foreign Keys

-   **Primary Key (PK)**: A unique identifier for a record in a table. Conventionally `id`.
-   **Foreign Key (FK)**: A key used to link two tables together. It refers to the primary key of another table.

---

## Core Tables

### `users`

Stores information about individual users.

-   `id` (PK, TEXT): Unique identifier for the user (e.g., 'user-1').
-   `name` (TEXT, NOT NULL): Full name of the user.
-   `email` (TEXT, NOT NULL, UNIQUE): Email address, used for login.
-   `role` (TEXT, NOT NULL): User's role ('Employee', 'Team Lead', 'Super Admin').
-   `avatar` (TEXT): URL to the user's avatar image.
-   `team_id` (FK -> `teams.id`, TEXT): The team the user belongs to. Can be NULL.
-   `reports_to` (FK -> `users.id`, TEXT): The ID of the user's manager. Can be NULL.
-   `contract_start_date` (DATE, NOT NULL): Start date of the employment contract.
-   `contract_end_date` (DATE): End date of the employment contract. NULL if ongoing.
-   `contract_weekly_hours` (INTEGER, NOT NULL): Contracted weekly work hours.

### `teams`

Stores information about teams.

-   `id` (PK, TEXT): Unique identifier for the team (e.g., 'team-1').
-   `name` (TEXT, NOT NULL, UNIQUE): The name of the team.

### `projects`

Stores project information.

-   `id` (PK, TEXT): Unique identifier for the project (e.g., 'proj-1').
-   `name` (TEXT, NOT NULL): The name of the project.
-   `budget` (NUMERIC): The budget for the project.
-   `details` (TEXT): A short description of the project.

### `tasks`

Stores task definitions that can be associated with projects.

-   `id` (PK, TEXT): Unique identifier for the task (e.g., 'task-1').
-   `name` (TEXT, NOT NULL): The name of the task.
-   `details` (TEXT): A short description of the task.

---

## Activity & Tracking Tables

### `time_entries`

Logs work time for users.

-   `id` (PK, TEXT): Unique identifier for the time entry.
-   `user_id` (FK -> `users.id`, TEXT, NOT NULL): The user who logged the time.
-   `project_id` (FK -> `projects.id`, TEXT, NOT NULL): The project the time was logged for.
-   `task_id` (FK -> `tasks.id`, TEXT, NOT NULL): The task performed.
-   `date` (DATE, NOT NULL): The date the work was performed.
-   `start_time` (TIME, NOT NULL): The start time of the work.
-   `end_time` (TIME, NOT NULL): The end time of the work.
-   `duration` (NUMERIC, NOT NULL): The duration of the work in hours.
-   `remarks` (TEXT): Optional notes about the time entry.

*Note: The mock data combines project and task into a single string. In a relational schema, it's better to separate them with foreign keys.*

### `holiday_requests`

Stores user requests for holidays.

-   `id` (PK, TEXT): Unique identifier for the request.
-   `user_id` (FK -> `users.id`, TEXT, NOT NULL): The user making the request.
-   `start_date` (DATE, NOT NULL): The start date of the holiday.
-   `end_date` (DATE, NOT NULL): The end date of the holiday.
-   `status` (TEXT, NOT NULL): Status of the request ('Pending', 'Approved', 'Rejected').

---

## Settings & Configuration Tables

### `public_holidays`

Stores official public holidays.

-   `id` (PK, TEXT): Unique identifier for the holiday.
-   `country` (TEXT, NOT NULL): The country the holiday applies to.
-   `name` (TEXT, NOT NULL): The name of the holiday.
-   `date` (DATE, NOT NULL): The date of the holiday.
-   `type` (TEXT, NOT NULL): Type of holiday ('Full Day', 'Half Day').

### `custom_holidays`

Stores company-specific holidays or events.

-   `id` (PK, TEXT): Unique identifier for the holiday.
-   `country` (TEXT, NOT NULL): A label for the holiday's scope (e.g., 'Global', 'USA').
-   `name` (TEXT, NOT NULL): The name of the custom holiday.
-   `date` (DATE, NOT NULL): The date of the holiday.
-   `type` (TEXT, NOT NULL): Type of holiday ('Full Day', 'Half Day').
-   `applies_to` (TEXT, NOT NULL): Defines scope ('all-members', 'all-teams', or a `team.id`).

### `freeze_rules`

Stores rules for freezing time entry calendars.

-   `id` (PK, TEXT): Unique identifier for the rule.
-   `team_id` (TEXT, NOT NULL): The scope of the rule ('all-teams' or a `team.id`).
-   `start_date` (DATE, NOT NULL): The start date of the freeze period.
-   `end_date` (DATE, NOT NULL): The end date of the freeze period.

### `system_logs`

Stores a read-only ledger of system activities.

-   `id` (PK, TEXT): Unique identifier for the log entry.
-   `timestamp` (TIMESTAMP WITH TIME ZONE, NOT NULL): The exact time of the event.
-   `message` (TEXT, NOT NULL): The log message.

---

## Messaging & Notification Tables

### `push_messages`

Stores broadcast messages for users.

-   `id` (PK, TEXT): Unique identifier for the message.
-   `context` (TEXT, NOT NULL): A short title for the message.
-   `message_body` (TEXT, NOT NULL): The content of the message.
-   `start_date` (TIMESTAMP WITH TIME ZONE, NOT NULL): When the message becomes active.
-   `end_date` (TIMESTAMP WITH TIME ZONE, NOT NULL): When the message expires.
-   `receivers` (TEXT, NOT NULL): Defines scope ('all-members', 'all-teams', or 'individual-teams').

### `app_notifications`

Stores specific notifications for users (e.g., holiday approvals).

-   `id` (PK, TEXT): Unique identifier for the notification.
-   `type` (TEXT, NOT NULL): The type of notification (e.g., 'holidayRequest').
-   `timestamp` (TIMESTAMP WITH TIME ZONE, NOT NULL): When the notification was created.
-   `title` (TEXT, NOT NULL): The title of the notification.
-   `body` (TEXT, NOT NULL): The content of the notification.
-   `reference_id` (TEXT, NOT NULL): An ID pointing to the related entity (e.g., a `holiday_requests.id`).

---

## Join Tables (Many-to-Many Relationships)

### `user_projects`

Links users to the projects they are associated with.

-   `user_id` (PK, FK -> `users.id`, TEXT, NOT NULL)
-   `project_id` (PK, FK -> `projects.id`, TEXT, NOT NULL)

### `project_tasks`

Links projects to their associated tasks.

-   `project_id` (PK, FK -> `projects.id`, TEXT, NOT NULL)
-   `task_id` (PK, FK -> `tasks.id`, TEXT, NOT NULL)

### `team_projects`

Links teams to the projects they work on.

-   `team_id` (PK, FK -> `teams.id`, TEXT, NOT NULL)
-   `project_id` (PK, FK -> `projects.id`, TEXT, NOT NULL)

### `push_message_teams`

Links a push message to specific teams when `receivers` is 'individual-teams'.

-   `push_message_id` (PK, FK -> `push_messages.id`, TEXT, NOT NULL)
-   `team_id` (PK, FK -> `teams.id`, TEXT, NOT NULL)

### `push_message_read_by`

Tracks which users have read/dismissed which push messages.

-   `push_message_id` (PK, FK -> `push_messages.id`, TEXT, NOT NULL)
-   `user_id` (PK, FK -> `users.id`, TEXT, NOT NULL)

### `notification_recipients`

Links a notification to its intended recipients.

-   `notification_id` (PK, FK -> `app_notifications.id`, TEXT, NOT NULL)
-   `user_id` (PK, FK -> `users.id`, TEXT, NOT NULL)

### `notification_read_by`

Tracks which users have read a specific notification.

-   `notification_id` (PK, FK -> `app_notifications.id`, TEXT, NOT NULL)
-   `user_id` (PK, FK -> `users.id`, TEXT, NOT NULL)
