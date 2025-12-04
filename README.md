# GFC Bot

A general purpose Discord bot for the GFC private community with web-based management dashboard.

## Features

- **Instagram URL Embedding**: Automatically converts Instagram URLs with configurable embed prefixes (e.g., 'kk', 'dd', 'vv')
- **Priority-based Fallback**: Tries multiple embed services in order until one works
- **URL Validation**: Verifies embedded URLs are active before modifying user messages
- **Feature-based Permissions**: Granular role management with inherited permissions (read, manage, delete)
- **Web Dashboard**: Manage bot features, embed prefixes, view URL history, and audit logs
- **Discord OAuth**: Secure login with server role-based access control

## Project Structure

```
gfcbot/
├── bot/                 # Python Discord bot (discord.py)
├── backend/             # Node.js/Express API server
├── web/                 # React web dashboard
├── database/            # Supabase migration files
└── docker-compose.yml   # Local development setup
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (for local development)
- Discord Bot Token
- Supabase account

### Local Development

1. Clone the repository:

```bash
git clone https://github.com/spacemyte/gfcbot.git
cd gfcbot
```

2. Set up environment variables:

```bash
# Bot
cp bot/.env.example bot/.env
# Edit bot/.env with your Discord token and Supabase credentials

# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your Discord OAuth and Supabase credentials
```

3. Run with Docker Compose:

```bash
docker-compose up -d
```

4. Access the dashboard at `http://localhost:3000`

## Deployment

### Railway

1. Create a new Railway project
2. Connect your GitHub repository
3. Add services for `bot` and `backend`
4. Configure environment variables in Railway dashboard
5. Push to `main` branch to trigger automatic deployment

### Environment Variables

See `.env.example` files in each directory for required configuration.

## Contributing

This is a private bot for the GFC community. Feature requests and contributions are welcome from community members.

## License

See [LICENSE](LICENSE) file for details.
