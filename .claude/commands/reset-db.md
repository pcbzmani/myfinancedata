# Reset Database

Wipe all data and recreate a fresh SQLite database for the Personal Finance App.

## Steps

1. Warn: This will delete ALL data (transactions, investments, insurance, settings). Confirm with user before proceeding.

2. Delete the database file:
   - Path: `e:/Projects_AI/claude_learning/personal-finance-app/backend/prisma/finance.db`

3. Re-run migrations to recreate the schema:
   ```
   cd e:/Projects_AI/claude_learning/personal-finance-app/backend
   npx prisma migrate dev --name init
   ```

4. Confirm success and tell user the database is fresh.
