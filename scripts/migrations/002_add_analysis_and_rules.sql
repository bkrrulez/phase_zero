-- Add project_analyses table to store different versions of an analysis for a project
CREATE TABLE project_analyses (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version INT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modification_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    new_use TEXT[],
    fulfillability TEXT[],
    UNIQUE(project_id, version)
);

-- Add rule_books table
CREATE TABLE rule_books (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version_name TEXT NOT NULL,
    version INT NOT NULL,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    row_count INT NOT NULL,
    UNIQUE(version_name, version)
);

-- Add rule_book_entries table to store each row of an imported rule book
CREATE TABLE rule_book_entries (
    id TEXT PRIMARY KEY,
    rule_book_id TEXT NOT NULL REFERENCES rule_books(id) ON DELETE CASCADE,
    data JSONB NOT NULL
);

-- Add reference_tables table to store data from referenced sheets in the rule book
CREATE TABLE reference_tables (
    id TEXT PRIMARY KEY,
    rule_book_id TEXT NOT NULL REFERENCES rule_books(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    data JSONB NOT NULL
);

-- Add rule_analysis_results table to store the outcome of a rule analysis
CREATE TABLE rule_analysis_results (
    id TEXT PRIMARY KEY,
    project_analysis_id TEXT NOT NULL REFERENCES project_analyses(id) ON DELETE CASCADE,
    rule_book_entry_id TEXT NOT NULL REFERENCES rule_book_entries(id) ON DELETE CASCADE,
    checklist_status TEXT,
    revised_fulfillability TEXT,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_analysis_id, rule_book_entry_id)
);
