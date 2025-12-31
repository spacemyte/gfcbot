# GFC Bot Database Schema

This directory contains SQL migration files for the GFC Bot database.

## Migration Files

1. **001_initial_schema.sql** - Creates core tables:

   - `features` - Bot feature definitions
   - `feature_permissions` - Role-based permissions with inheritance
   - `embed_configs` - Instagram embed prefix configurations
   - `message_data` - Tracks all URL transformations
   - `audit_logs` - System audit trail
   - `pruning_config` - Data retention settings per server

2. **002_row_level_security.sql** - Sets up RLS policies for security

3. **003_functions_and_triggers.sql** - Database functions and triggers:
   - Auto-update timestamps
   - Permission inheritance checking (delete → manage → read)

## Running Migrations

### Using psql (Railway/PostgreSQL)

```bash
psql "$DATABASE_URL" -f database/001_initial_schema.sql
psql "$DATABASE_URL" -f database/002_row_level_security.sql
psql "$DATABASE_URL" -f database/003_functions_and_triggers.sql
```

Or use your provider's SQL console to execute the files in order.

## Schema Overview

### Permission Inheritance Model

- **delete** - Full control (includes manage + read)
- **manage** - Edit/update (includes read)
- **read** - View only

### Data Retention

- Configurable per server via `pruning_config`
- Max retention: 90 days (or unlimited if disabled)
- Automatic pruning via backend cron job
