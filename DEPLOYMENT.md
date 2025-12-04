# GFC Bot Deployment Guide

This guide covers deploying GFC Bot to Railway with Supabase database.

## Prerequisites

- GitHub account with the gfcbot repository
- Railway account (https://railway.app)
- Supabase account (https://supabase.com)
- Discord Bot Token and OAuth credentials

## Step 1: Set Up Supabase Database

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor in your Supabase dashboard
3. Run the migration files in order:
   - `database/001_initial_schema.sql`
   - `database/002_row_level_security.sql`
   - `database/003_functions_and_triggers.sql`
4. Get your connection details:
   - Project URL: `https://your-project-ref.supabase.co`
   - Anon/Public Key: Found in Settings → API
   - Service Role Key: Found in Settings → API (keep this secret!)

## Step 2: Create Discord Application

1. Go to https://discord.com/developers/applications
2. Create a new application
3. Go to "Bot" section:
   - Create a bot
   - Copy the bot token
   - Enable "Message Content Intent"
   - Enable "Server Members Intent"
4. Go to "OAuth2" section:
   - Copy Client ID and Client Secret
   - Add redirect URL: `https://your-backend-url.up.railway.app/auth/discord/callback`

## Step 3: Deploy to Railway

### Deploy Bot Service

1. Go to https://railway.app and create a new project
2. Click "New" → "GitHub Repo" and select your gfcbot repository
3. Click "Add Service" → select the bot directory
4. Configure environment variables:
   ```
   DISCORD_TOKEN=your_bot_token
   DISCORD_CLIENT_ID=your_client_id
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_KEY=your_supabase_service_role_key
   ENVIRONMENT=production
   ENABLE_PERMISSION_CACHE=true
   COMMAND_PREFIX=!
   ```
5. Set the start command: `python main.py`
6. Set working directory: `bot`

### Deploy Backend Service

1. In the same Railway project, click "Add Service"
2. Select the same GitHub repo
3. Configure environment variables:
   ```
   PORT=3001
   NODE_ENV=production
   DISCORD_CLIENT_ID=your_client_id
   DISCORD_CLIENT_SECRET=your_client_secret
   DISCORD_CALLBACK_URL=https://your-backend-url.up.railway.app/auth/discord/callback
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_KEY=your_supabase_service_role_key
   SESSION_SECRET=generate_a_random_string_here
   FRONTEND_URL=https://your-frontend-url.vercel.app
   ```
4. Set the start command: `npm start`
5. Set working directory: `backend`
6. Enable public networking and copy the URL

### Deploy Web Dashboard (Vercel Alternative)

The web dashboard can be deployed to Vercel for better React app hosting:

1. Go to https://vercel.com
2. Import your gfcbot repository
3. Configure:
   - Framework Preset: Vite
   - Root Directory: `web`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variable:
   ```
   VITE_API_URL=https://your-backend-url.up.railway.app
   ```
5. Deploy

## Step 4: Update Discord OAuth Redirect

1. Go back to Discord Developer Portal
2. Update OAuth2 redirect URL to your actual backend URL
3. Save changes

## Step 5: Invite Bot to Server

1. Go to Discord Developer Portal → OAuth2 → URL Generator
2. Select scopes:
   - `bot`
   - `applications.commands`
3. Select bot permissions:
   - Read Messages/View Channels
   - Send Messages
   - Manage Messages
   - Read Message History
   - Add Reactions
4. Copy the generated URL and open it in your browser
5. Select your server and authorize

## Step 6: Initial Configuration

1. Log in to the web dashboard with Discord
2. Select your server
3. Add your first embed prefix (e.g., "kk")
4. Configure pruning settings if desired

## GitHub Actions Auto-Deploy (Optional)

The `.github/workflows/deploy.yml` file is already configured. To enable:

1. Go to your Railway project settings
2. Generate a Railway API token
3. Add it to GitHub Secrets as `RAILWAY_TOKEN`
4. Push to main branch to trigger automatic deployment

## Monitoring

- Railway Dashboard: Monitor service health, logs, and metrics
- Supabase Dashboard: View database queries and performance
- Discord: Bot should show as online in your server

## Troubleshooting

### Bot won't start

- Check Railway logs for errors
- Verify all environment variables are set correctly
- Ensure Supabase is accessible

### OAuth login fails

- Verify Discord OAuth redirect URL matches backend URL
- Check FRONTEND_URL in backend environment variables
- Ensure SESSION_SECRET is set

### Embeds not working

- Verify bot has "Manage Messages" permission in Discord
- Check that embed prefixes are configured in the dashboard
- Review message_data table for validation errors

## Cost Estimate

- Railway: ~$5/month (after free trial)
- Supabase: Free tier (sufficient for small servers)
- Vercel: Free tier (sufficient for dashboard)
- **Total: ~$5/month**

## Support

For issues, check:

- Railway logs: Railway Dashboard → Service → Logs
- Supabase logs: Supabase Dashboard → Logs
- GitHub Issues: https://github.com/spacemyte/gfcbot/issues
