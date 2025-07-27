#!/bin/bash

# Load environment variables from .env.local
set -o allexport
source .env.local
set +o allexport

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL is not set in your .env.local file."
  exit 1
fi

# ==============================================================================
# IMPORTANT: Manually set the migration file you want to run here.
# ==============================================================================
MIGRATION_FILE="scripts/migrations/002_add_sent_notifications_table.sql"
# ==============================================================================


# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Error: Migration file not found at $MIGRATION_FILE"
  exit 1
fi

echo "🚀 Applying migration: $MIGRATION_FILE..."

# Execute the SQL script
psql "$DATABASE_URL" -f "$MIGRATION_FILE"

# Check the exit code of psql
if [ $? -eq 0 ]; then
  echo "✅ Migration applied successfully!"
else
  echo "❌ Error applying migration. Please check the output above for details."
fi
