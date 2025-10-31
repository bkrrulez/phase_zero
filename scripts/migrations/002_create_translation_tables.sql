-- Create the table for storing translations of rule book entries.
CREATE TABLE IF NOT EXISTS rule_book_entry_translations (
    id TEXT PRIMARY KEY,
    rule_book_entry_id TEXT NOT NULL,
    language VARCHAR(5) NOT NULL,
    translated_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (rule_book_entry_id) REFERENCES rule_book_entries(id) ON DELETE CASCADE,
    UNIQUE (rule_book_entry_id, language)
);

-- Add an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_translations_entry_id_lang ON rule_book_entry_translations (rule_book_entry_id, language);

-- Add a comment to the table for clarity
COMMENT ON TABLE rule_book_entry_translations IS 'Stores translations for entries in the rule_book_entries table.';
