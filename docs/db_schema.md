
# Database Schema for TimeTool

This document outlines the database schema for the TimeTool application.

---

## Core Tables

### `users`

Stores information about individual users.

-   `id` (PK, TEXT): Unique identifier for the user (e.g., 'user-1').
-   `name` (TEXT, NOT NULL): Full name of the user.
-   `email` (TEXT, NOT NULL, UNIQUE): Email address, used for login.
-   `password` (TEXT, NOT NULL): User's password (for a real app, this should be a hash).
-   `role` (TEXT, NOT NULL): User's role ('Employee', 'Team Lead', 'Super Admin').
-   `avatar` (TEXT): URL to the user's avatar image.
-   `team_id` (FK -> `teams.id`, TEXT): The team the user belongs to. Can be NULL.
-   `reports_to` (FK -> `users.id`, TEXT): The ID of the user's manager. Can be NULL.
-   `contract_pdf` (TEXT): Base64 encoded data URI of the contract PDF. Can be NULL.

### `contracts`

Stores employment contracts for users. A user can have multiple contracts.

-   `id` (PK, TEXT): Unique identifier for the contract.
-   `user_id` (FK -> `users.id`, TEXT, NOT NULL): The user this contract belongs to.
-   `start_date` (DATE, NOT NULL): Start date of the employment contract.
-   `end_date` (DATE): End date of the employment contract. NULL if ongoing.
-   `weekly_hours` (INTEGER, NOT NULL): Contracted weekly work hours for this contract.

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

### `holiday_requests`

Stores user requests for holidays.

-   `id` (PK, TEXT): Unique identifier for the request.
-   `user_id` (FK -> `users.id`, TEXT, NOT NULL): The user making the request.
-   `start_date` (DATE, NOT NULL): The start date of the holiday.
-   `end_date` (DATE, NOT NULL): The end date of the holiday.
-   `status` (TEXT, NOT NULL): Status of the request ('Pending', 'Approved', 'Rejected').
-   `action_by_user_id` (FK -> `users.id`, TEXT): The user who approved/rejected the request. Can be NULL.
-   `action_timestamp` (TIMESTAMP WITH TIME ZONE): When the action was taken. Can be NULL.

---

## Join Tables (Many-to-Many Relationships)

### `user_projects`

Links users to the projects they are associated with.

-   `user_id` (PK, FK -> `users.id`, TEXT, NOT NULL)
-   `project_id` (PK, FK -> `projects.id`, TEXT, NOT NULL)
