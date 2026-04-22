
# Database Schema for PhaseZero

This document outlines the database schema for the PhaseZero application.

---

## Core Tables

### `users`
Stores information about individual users.
- `id` (PK, TEXT): Unique identifier.
- `name` (TEXT, NOT NULL): Full name.
- `email` (TEXT, NOT NULL, UNIQUE): Login email.
- `password` (TEXT, NOT NULL): User password.
- `role` (TEXT): 'User', 'Team Lead', 'Super Admin', 'Expert'.
- `avatar` (TEXT): URL to avatar image.
- `team_id` (FK -> `teams.id`): Associated team.
- `reports_to` (FK -> `users.id`): Manager ID.
- `contract_pdf` (TEXT): Base64 encoded PDF.

### `projects`
Stores building and project metadata used for filtering rules.
- `id` (PK, TEXT): Unique identifier.
- `name` (TEXT, NOT NULL): Project name.
- `project_number` (VARCHAR(10), UNIQUE): 5-digit number.
- `address` (TEXT): Building location.
- `escape_level` (NUMERIC(5, 2)): Float value for Fluchtniveau logic.
- `current_use` (VARCHAR(255)): Current building usage.
- `listed_building` (BOOLEAN): Denkmalschutz status.

---

## Rule Book Tables

### `rule_books`
Metadata for imported regulation sets.
- `id` (PK, TEXT): Unique identifier.
- `version_name` (TEXT): e.g., "OIB-RL 2".
- `version` (INTEGER): Version increment.

### `rule_book_entries`
Individual rows/requirements within a rule book.
- `id` (PK, TEXT): Unique identifier.
- `rule_book_id` (FK -> `rule_books.id`): Associated rule book.
- `data` (JSONB): Stores all dynamic columns (Nutzung, Fluchtniveau, etc.).
- `row_index` (INTEGER): The original sequential order from the source file.

### `reference_tables`
Supplementary data sheets linked to rule books.
- `id` (PK, TEXT): Unique identifier.
- `rule_book_id` (FK -> `rule_books.id`): Associated rule book.
- `name` (TEXT): Sheet name.
- `data` (JSONB): Tabular data.

---

## Analysis Tables

### `project_analyses`
Captures the criteria for a specific analysis run.
- `id` (PK, TEXT): Unique identifier.
- `project_id` (FK): Target project.
- `new_use` (TEXT[]): Array of selected usage types.
- `fulfillability` (TEXT[]): Array of selected levels (Light, Medium, Heavy).

### `rule_analysis_results`
Stores the engineer's evaluation of each rule parameter.
- `id` (PK, TEXT): Unique identifier.
- `project_analysis_id` (FK): Link to the analysis run.
- `checklist_status` (TEXT): 'Fulfilled', 'Not Fulfilled', etc.
- `revised_fulfillability` (TEXT): Engineer's secondary assessment.

---

## System Tables

### `system_settings`
Persists global application configurations.
- `key` (TEXT, PK): Setting name (e.g., 'import_rule_book_settings').
- `value` (TEXT): JSON configuration string.

### `system_logs`
Audit trail of admin actions.
- `id` (PK, TEXT): Unique identifier.
- `timestamp` (TIMESTAMPTZ): Entry time.
- `message` (TEXT): Activity description.
