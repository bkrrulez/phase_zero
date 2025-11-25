-- This script creates the rule_analysis_results table and enhances it to store a full snapshot of the parameter context.

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS rule_analysis_results (
    id TEXT PRIMARY KEY,
    project_analysis_id TEXT NOT NULL,
    rule_book_id TEXT NOT NULL,
    rule_book_entry_id TEXT NOT NULL,
    
    -- Snapshot fields for full context
    rule_book_name TEXT,
    section_key TEXT,
    topic TEXT,
    structure TEXT,
    text TEXT,
    
    -- User input fields
    checklist_status TEXT,
    revised_fulfillability TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (project_analysis_id) REFERENCES project_analyses(id) ON DELETE CASCADE,
    FOREIGN KEY (rule_book_entry_id) REFERENCES rule_book_entries(id) ON DELETE CASCADE,
    UNIQUE (project_analysis_id, rule_book_entry_id)
);

-- Add new columns if they don't exist, for backward compatibility
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rule_analysis_results' AND column_name='rule_book_id') THEN
        ALTER TABLE rule_analysis_results ADD COLUMN rule_book_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rule_analysis_results' AND column_name='rule_book_name') THEN
        ALTER TABLE rule_analysis_results ADD COLUMN rule_book_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rule_analysis_results' AND column_name='section_key') THEN
        ALTER TABLE rule_analysis_results ADD COLUMN section_key TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rule_analysis_results' AND column_name='topic') THEN
        ALTER TABLE rule_analysis_results ADD COLUMN topic TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rule_analysis_results' AND column_name='structure') THEN
        ALTER TABLE rule_analysis_results ADD COLUMN structure TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rule_analysis_results' AND column_name='text') THEN
        ALTER TABLE rule_analysis_results ADD COLUMN text TEXT;
    END IF;
END;
$$;


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
COMMENT ON TABLE rule_analysis_results IS 'Stores the results of a parameter analysis for a specific project analysis, including a snapshot of the parameter context.';
COMMENT ON COLUMN rule_analysis_results.project_analysis_id IS 'Foreign key to the project_analyses table.';
COMMENT ON COLUMN rule_analysis_results.rule_book_entry_id IS 'Foreign key to the rule_book_entries table.';
COMMENT ON COLUMN rule_analysis_results.rule_book_name IS 'Snapshot of the rule book version name at time of analysis.';
COMMENT ON COLUMN rule_analysis_results.section_key IS 'Snapshot of the parent section key (e.g., "3", "111") for the parameter.';
COMMENT ON COLUMN rule_analysis_results.topic IS 'Snapshot of the parent section topic/text for the parameter.';
COMMENT ON COLUMN rule_analysis_results.structure IS 'Snapshot of the "Gliederung" value for the parameter itself.';
COMMENT ON COLUMN rule_analysis_results.text IS 'Snapshot of the "Text" value for the parameter itself.';
COMMENT ON COLUMN rule_analysis_results.checklist_status IS 'The status selected by the user from the checklist (e.g., "Fulfilled", "Not Fulfilled").';
COMMENT ON COLUMN rule_analysis_results.revised_fulfillability IS 'The project-specific fulfillability chosen by the user if the status requires it.';
