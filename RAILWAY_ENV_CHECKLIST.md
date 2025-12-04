# Railway Backend Environment Variables Checklist

Make sure these are set in your Railway backend service:

```bash
# Server Config
PORT=3001
NODE_ENV=production

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_CALLBACK_URL=https://your-backend-service.up.railway.app/auth/discord/callback

# Supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your_supabase_service_role_key

# Session & CORS
SESSION_SECRET=your_32_char_random_string
FRONTEND_URL=https://your-vercel-app.vercel.app
```

## Important Notes:

1. **NODE_ENV must be `production`** - Currently showing `development` in logs
2. **DISCORD_CALLBACK_URL** - Must be your Railway backend URL + `/auth/discord/callback`
3. **FRONTEND_URL** - Must match your Vercel domain exactly (no trailing slash)
4. **SESSION_SECRET** - Use `openssl rand -base64 32` to generate
5. **Do NOT set COOKIE_DOMAIN** - Removed because Railway and Vercel are different domains

## Vercel Environment Variables:

```bash
VITE_API_URL=https://your-backend-service.up.railway.app
```

## After Setting Environment Variables:

1. Redeploy Railway backend service
2. Redeploy Vercel frontend (or wait for auto-deploy)
3. Clear browser cookies for both domains
4. Try logging in again
