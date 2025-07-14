-- Add the contract_pdf column to the users table to store contract documents.
ALTER TABLE users ADD COLUMN contract_pdf TEXT;
