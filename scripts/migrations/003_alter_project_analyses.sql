-- This migration alters the 'new_use' column in the 'project_analyses' table.
-- The column type is changed from character varying(255) to a text array (TEXT[])
-- to support storing multiple 'New Use' selections from the application UI.
-- The USING clause ensures that any existing single-string data is safely
-- converted into a single-element array, preserving data during the migration.

ALTER TABLE project_analyses
ALTER COLUMN new_use TYPE TEXT[]
USING ARRAY[new_use];
