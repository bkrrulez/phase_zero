-- scripts/migrations/002_add_analysis_results_table.sql

-- This table stores the results of a rule analysis for a specific project analysis.
-- Each row represents the user's input for a single parameter from a rule book.

CREATE TABLE IF NOT EXISTS rule_analysis_results (
    id TEXT PRIMARY KEY,
    project_analysis_id TEXT NOT NULL REFERENCES project_analyses(id) ON DELETE CASCADE,
    rule_book_entry_id TEXT NOT NULL REFERENCES rule_book_entries(id) ON DELETE CASCADE,
    checklist_status TEXT NOT NULL,
    revised_fulfillability TEXT,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Ensures that there is only one result per entry per analysis
    UNIQUE(project_analysis_id, rule_book_entry_id)
);

-- Index for faster querying of results for a given project analysis
CREATE INDEX IF NOT EXISTS idx_rule_analysis_results_project_analysis_id ON rule_analysis_results(project_analysis_id);
