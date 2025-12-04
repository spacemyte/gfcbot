# GFC Bot - Development Guide

## Local Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- Discord Bot Token
- Supabase account

### Initial Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/spacemyte/gfcbot.git
   cd gfcbot
   ```

2. **Set up environment variables**

   ```bash
   # Bot
   cp bot/.env.example bot/.env
   # Edit bot/.env with your credentials

   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your credentials
   ```

3. **Set up Supabase database**

   - Create a Supabase project
   - Run migration files in SQL Editor (database/\*.sql)
   - Get your Supabase URL and keys

4. **Install dependencies**

   ```bash
   # Bot
   cd bot
   pip install -r requirements.txt

   # Backend
   cd ../backend
   npm install

   # Web
   cd ../web
   npm install
   ```

### Running Locally

#### Option 1: Docker Compose (Recommended)

```bash
docker-compose up -d
```

Access:

- Bot: Running in background
- Backend API: http://localhost:3001
- Web Dashboard: http://localhost:3000

#### Option 2: Run Services Individually

```bash
# Terminal 1 - Bot
cd bot
python main.py

# Terminal 2 - Backend
cd backend
npm run dev

# Terminal 3 - Web
cd web
npm run dev
```

### Project Structure

```
gfcbot/
├── bot/                    # Python Discord bot
│   ├── main.py            # Bot entry point
│   ├── cogs/              # Feature modules
│   │   ├── instagram_embed.py
│   │   ├── permissions.py
│   │   └── admin.py
│   └── utils/             # Shared utilities
│       ├── database.py
│       └── feature_manager.py
├── backend/               # Node.js/Express API
│   └── src/
│       ├── index.js       # Server entry point
│       └── routes/        # API endpoints
│           ├── features.js
│           ├── embeds.js
│           ├── messages.js
│           ├── audit-logs.js
│           └── pruning.js
├── web/                   # React dashboard
│   └── src/
│       ├── App.jsx
│       ├── pages/         # Page components
│       └── components/    # Reusable components
└── database/              # Supabase migrations
    ├── 001_initial_schema.sql
    ├── 002_row_level_security.sql
    └── 003_functions_and_triggers.sql
```

### Development Workflow

1. **Create a new feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and test locally**

   - Test bot commands in Discord
   - Test API endpoints with the web dashboard
   - Check database changes in Supabase

3. **Commit and push**

   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin feature/your-feature-name
   ```

4. **Create Pull Request**
   - Open PR on GitHub
   - Request review from team members

### Adding New Features

#### 1. Add Database Tables (if needed)

Create a new migration file:

```sql
-- database/004_your_feature.sql
CREATE TABLE your_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- your columns
);
```

#### 2. Create Bot Cog

```python
# bot/cogs/your_feature.py
from discord.ext import commands

class YourFeature(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_message(self, message):
        # Your logic here
        pass

async def setup(bot):
    await bot.add_cog(YourFeature(bot))
```

Load in main.py:

```python
'cogs.your_feature',  # Add to cogs list
```

#### 3. Add Backend API Route

```javascript
// backend/src/routes/your-feature.js
const express = require("express");
const router = express.Router();
const { supabase } = require("../index");

router.get("/:serverId", async (req, res) => {
  // Your logic
});

module.exports = router;
```

Register in index.js:

```javascript
const yourFeatureRouter = require("./routes/your-feature");
app.use("/api/your-feature", isAuthenticated, yourFeatureRouter);
```

#### 4. Create Dashboard Page

```jsx
// web/src/pages/YourFeature.jsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function YourFeature() {
  const { serverId } = useParams();
  // Your component logic

  return <div>{/* Your UI */}</div>;
}
```

Add route in App.jsx.

### Testing

#### Bot Testing

```bash
# Run bot locally with development settings
cd bot
ENVIRONMENT=development ENABLE_PERMISSION_CACHE=false python main.py
```

Test commands in Discord test server.

#### API Testing

```bash
# Use curl or Postman
curl http://localhost:3001/api/features
```

#### Database Testing

- Use Supabase SQL Editor
- Check Row Level Security policies
- Verify indices are working

### Common Issues

**Bot not responding**

- Check bot token is correct
- Verify bot has correct permissions in Discord
- Check logs for errors

**Database connection errors**

- Verify Supabase URL and keys
- Check if database is accessible
- Review RLS policies

**OAuth login fails**

- Check redirect URL matches
- Verify client ID and secret
- Check CORS settings

### Code Style

- **Python**: Follow PEP 8
- **JavaScript**: Use semicolons, 2-space indentation
- **React**: Functional components with hooks

### Debugging

**Enable debug logging:**

Bot:

```python
logging.basicConfig(level=logging.DEBUG)
```

Backend:

```javascript
console.log("Debug:", variable);
```

### Contributing

1. Follow the feature branch workflow
2. Write clear commit messages
3. Test thoroughly before pushing
4. Update documentation if needed
5. Request review before merging

## Resources

- [discord.py Documentation](https://discordpy.readthedocs.io/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Supabase Docs](https://supabase.com/docs)
