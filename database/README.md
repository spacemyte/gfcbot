# GFC Bot Database Schema

This directory contains Supabase migration files for the GFC Bot database.

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

### Using Supabase Dashboard

1. Go to your Supabase project
2. Navigate to SQL Editor
3. Run each migration file in order (001, 002, 003)

### Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## Schema Overview

### Permission Inheritance Model

- **delete** - Full control (includes manage + read)
- **manage** - Edit/update (includes read)
- **read** - View only

### Data Retention

- Configurable per server via `pruning_config`
- Max retention: 90 days (or unlimited if disabled)
- Automatic pruning via backend cron job
