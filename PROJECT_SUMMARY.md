# GFC Bot - Project Summary

## Overview

GFC Bot is a modular Discord bot with web-based management dashboard designed for the GFC private community. The bot features Instagram URL embedding with configurable prefixes, priority-based fallback, URL validation, comprehensive audit logging, and role-based permission management.

## Tech Stack

### Bot (Python)

- **discord.py** - Discord API library
- **aiohttp** - Async HTTP client for URL validation
- **asyncpg** - PostgreSQL database driver
- **python-dotenv** - Environment configuration

### Backend (Node.js)

- **Express** - Web server framework
- **Passport Discord** - OAuth authentication
- **pg** - PostgreSQL client
- **node-cron** - Scheduled task management

### Frontend (React)

- **React 18** - UI framework
- **React Router** - Navigation
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **react-beautiful-dnd** - Drag-and-drop functionality

### Database

- **PostgreSQL** - Data storage

### Deployment

- **Railway** - Bot + Backend hosting (~$5/month)
- **Vercel** - Frontend hosting (free)
- **GitHub Actions** - CI/CD automation

## Features Implemented

### 1. Instagram URL Embedding ✅

- Automatic detection of Instagram URLs in messages
- Configurable embed prefixes (e.g., 'kk', 'dd', 'vv')
- Priority-based fallback system
- URL validation before message modification
- Original URL preserved on all failures
- Async validation queue with rate limiting

### 2. Feature-Based Permission System ✅

- Role-based access control per feature
- Permission inheritance (delete → manage → read)
- Environment-based caching (dev/prod)
- Bot slash commands for permission management

### 3. Web Dashboard ✅

- Discord OAuth login
- Server selection interface
- Drag-and-drop embed priority management
- URL history viewer with filtering
- Audit log viewer with pagination
- Configurable data retention settings

### 4. Database Schema ✅

- `features` - Bot feature definitions
- `feature_permissions` - Role permissions with inheritance
- `embed_configs` - Embed prefix configurations
- `message_data` - URL transformation tracking
- `audit_logs` - System audit trail
- `pruning_config` - Data retention per server

### 5. Deployment & DevOps ✅

- Docker Compose for local development
- Railway deployment configuration
- GitHub Actions CI/CD workflow
- Comprehensive documentation

## Project Structure

```
gfcbot/
├── bot/                           # Python Discord bot
│   ├── main.py                   # Bot entry point
│   ├── cogs/                     # Feature modules
│   │   ├── instagram_embed.py   # URL embedding logic
│   │   ├── permissions.py       # Permission commands
│   │   └── admin.py             # Admin commands
│   ├── utils/                    # Utilities
│   │   ├── database.py          # Database interface
│   │   └── feature_manager.py  # Permission management
│   ├── requirements.txt         # Python dependencies
│   ├── Dockerfile               # Container config
│   └── .env.example             # Environment template
│
├── backend/                      # Node.js API server
│   └── src/
│       ├── index.js             # Server entry point
│       └── routes/              # API endpoints
│           ├── features.js      # Feature management
│           ├── embeds.js        # Embed CRUD + reorder
│           ├── messages.js      # URL history
│           ├── audit-logs.js    # Audit trail
│           └── pruning.js       # Data retention
│
├── web/                          # React dashboard
│   └── src/
│       ├── App.jsx              # Main app component
│       ├── components/          # Reusable components
│       │   └── Layout.jsx       # Page layout
│       └── pages/               # Page components
│           ├── Login.jsx        # OAuth login
│           ├── Dashboard.jsx    # Server selection
│           ├── EmbedManager.jsx # Prefix management
│           ├── URLHistory.jsx   # Message tracking
│           ├── AuditLogs.jsx    # Audit viewer
│           └── Settings.jsx     # Server settings
│
├── database/                     # Database migrations
│   ├── 001_initial_schema.sql   # Core tables
│   ├── 002_row_level_security.sql # RLS policies
│   ├── 003_functions_and_triggers.sql # DB functions
│   └── README.md                # Migration guide
│
├── .github/
│   └── workflows/
│       └── deploy.yml           # CI/CD pipeline
│
├── docker-compose.yml           # Local dev setup
├── README.md                    # Project overview
├── DEPLOYMENT.md                # Deployment guide
├── DEVELOPMENT.md               # Developer guide
└── LICENSE                      # License file
```

## Key Design Decisions

### 1. Modular Architecture

- Bot uses cogs for feature separation
- Backend uses Express routers for API organization
- Frontend uses component-based architecture
- Easy to add new features without affecting existing code

### 2. Permission Inheritance

- Delete permission grants manage + read
- Manage permission grants read
- Simplifies administration
- Implemented at database level for consistency

### 3. Environment-Based Caching

- Cache disabled in development for testing
- Cache enabled in production for performance
- 15-minute TTL with immediate invalidation on changes

### 4. Priority-Based Fallback

- User-configurable order via drag-and-drop
- Bot tries each prefix until one succeeds
- All failures logged for debugging

### 5. URL Validation Strategy

- HEAD requests first (faster)
- GET fallback if HEAD fails
- 3-5 second timeout
- 1-2 second delays between checks
- Original URL preserved on all failures

## Next Steps

### Phase 2 Features (Future)

1. **Additional Features**

   - Custom commands system
   - Reaction roles
   - Auto-moderation
   - Welcome messages

2. **Enhanced Analytics**

   - Success rate charts
   - Usage statistics
   - Performance metrics

3. **Advanced Permissions**

   - Sub-feature permissions
   - Time-based access
   - Custom role hierarchies

4. **Notifications**
   - Discord notifications for changes
   - Email alerts for admins
   - Webhook integrations

## Quick Start

1. **Clone repository**
2. **Set up PostgreSQL** (run migrations)
3. **Configure environment variables**
4. **Deploy to Railway**
5. **Invite bot to Discord**
6. **Configure via dashboard**

See `DEPLOYMENT.md` for detailed instructions.

## Maintenance

- Database pruning runs daily at 2:00 AM
- Logs available in Railway dashboard
- Audit trail tracks all changes
- Configurable data retention (1-90 days or unlimited)

## Cost Breakdown

- Railway: ~$5/month (bot + backend)
- Vercel: Free tier (frontend)
- **Total: ~$5/month**

## Support

- GitHub Issues: Bug reports and feature requests
- Documentation: README, DEPLOYMENT, DEVELOPMENT guides
- Discord: GFC community support

## License

See LICENSE file for details.

---

**Built with ❤️ for the GFC community**
