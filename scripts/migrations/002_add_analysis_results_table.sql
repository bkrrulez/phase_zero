-- This script creates the rule_analysis_results table to store user selections
-- during a project analysis.

CREATE TABLE IF NOT EXISTS rule_analysis_results (
    id TEXT PRIMARY KEY,
    project_analysis_id TEXT NOT NULL,
    rule_book_entry_id TEXT NOT NULL,
    checklist_status TEXT NOT NULL,
    revised_fulfillability TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (project_analysis_id) REFERENCES project_analyses(id) ON DELETE CASCADE,
    FOREIGN KEY (rule_book_entry_id) REFERENCES rule_book_entries(id) ON DELETE CASCADE,
    UNIQUE (project_analysis_id, rule_book_entry_id)
);

-- Creates a trigger to automatically update the last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.last_updated = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_rule_analysis_results_last_updated ON rule_analysis_results;

CREATE TRIGGER update_rule_analysis_results_last_updated
BEFORE UPDATE ON rule_analysis_results
FOR EACH ROW
EXECUTE FUNCTION update_last_updated_column();

-- Optional: Add comments to the table and columns for clarity
COMMENT ON TABLE rule_analysis_results IS 'Stores the results of a parameter analysis for a specific project analysis.';
COMMENT ON COLUMN rule_analysis_results.project_analysis_id IS 'Foreign key to the project_analyses table.';
COMMENT ON COLUMN rule_analysis_results.rule_book_entry_id IS 'Foreign key to the rule_book_entries table.';
COMMENT ON COLUMN rule_analysis_results.checklist_status IS 'The status selected by the user from the checklist (e.g., "Fulfilled", "Not Fulfilled").';
COMMENT ON COLUMN rule_analysis_results.revised_fulfillability IS 'The project-specific fulfillability chosen by the user if the status requires it.';
