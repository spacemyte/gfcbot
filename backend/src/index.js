require("dotenv").config();

// Check required environment variables
if (
  !process.env.DATABASE_URL &&
  (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY)
) {
  console.error(
    "ERROR: DATABASE_URL or (SUPABASE_URL + SUPABASE_KEY) must be set!"
  );
  process.exit(1);
}

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const cron = require("node-cron");
const { db } = require("./supabase");
const PostgresSessionStore = require("./postgres-session-store");

const app = express();
const PORT = process.env.PORT || 3001;

let botGuildCache = { ids: [], fetchedAt: 0 };
const BOT_GUILD_CACHE_TTL_MS = 5 * 60 * 1000;

// Log database configuration
if (process.env.DATABASE_URL) {
  console.log("✓ Using Railway PostgreSQL (DATABASE_URL)");
} else {
  console.log("✓ Using Supabase (SUPABASE_URL + SUPABASE_KEY)");
}

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    store: new PostgresSessionStore(),
    secret: process.env.SESSION_SECRET || "gfcbot-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    proxy: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Passport Discord Strategy
passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: process.env.DISCORD_CALLBACK_URL,
      scope: ["identify", "guilds"],
    },
    (accessToken, refreshToken, profile, done) => {
      profile.accessToken = accessToken;
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};

// Routes
app.get("/", (req, res) => {
  res.json({ message: "GFC Bot API Server", version: "1.0.0" });
});

// Auth routes
app.get("/auth/discord", (req, res, next) => {
  // Store rememberMe preference in session
  if (req.query.rememberMe === "true") {
    req.session.rememberMe = true;
  }
  passport.authenticate("discord")(req, res, next);
});

app.get(
  "/auth/discord/callback",
  passport.authenticate("discord", {
    failureRedirect: process.env.FRONTEND_URL,
  }),
  (req, res) => {
    // If user selected "Remember me", extend session to 30 days
    if (req.session.rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      delete req.session.rememberMe; // Clean up the temp flag
    }
    // Session should be established here
    console.log("Discord auth successful, user:", req.user?.username);
    console.log("Session ID:", req.sessionID);
    res.redirect(process.env.FRONTEND_URL + "/dashboard");
  }
);

async function fetchBotGuildIds() {
  if (!process.env.DISCORD_BOT_TOKEN) {
    console.warn(
      "DISCORD_BOT_TOKEN not set - cannot filter guilds by bot presence"
    );
    return null;
  }
  const now = Date.now();
  if (
    now - botGuildCache.fetchedAt < BOT_GUILD_CACHE_TTL_MS &&
    botGuildCache.ids.length
  ) {
    console.log(`Using cached bot guilds: ${botGuildCache.ids.length} guilds`);
    return botGuildCache.ids;
  }
  try {
    console.log("Fetching bot guilds from Discord API...");
    const resp = await axios.get(
      "https://discord.com/api/v10/users/@me/guilds",
      {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      }
    );
    const ids = resp.data.map((g) => g.id);
    botGuildCache = { ids, fetchedAt: now };
    console.log(`Fetched ${ids.length} bot guilds from Discord API`);
    return ids;
  } catch (err) {
    console.error(
      "Failed to fetch bot guilds:",
      err.response?.status || err.message,
      err.response?.data
    );
    return null;
  }
}

app.get("/auth/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr);
      res.clearCookie("connect.sid", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      });
      res.json({ success: true });
    });
  });
});

app.get("/auth/user", isAuthenticated, async (req, res) => {
  let guilds = req.user.guilds || [];
  const originalGuildCount = guilds.length;

  // Filter to guilds where the bot is present, if we can fetch them
  const botGuildIds = await fetchBotGuildIds();
  if (botGuildIds && botGuildIds.length) {
    guilds = guilds.filter((g) => botGuildIds.includes(g.id));
    console.log(
      `Filtered guilds for user ${req.user.username}: ${originalGuildCount} -> ${guilds.length} (bot present in ${botGuildIds.length} guilds)`
    );
  } else {
    console.log(
      `No bot guild filtering applied for user ${req.user.username} (showing all ${originalGuildCount} guilds)`
    );
  }

  res.json({
    id: req.user.id,
    username: req.user.username,
    discriminator: req.user.discriminator,
    avatar: req.user.avatar,
    guilds,
  });
});

// Diagnostic endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database_url_set: !!process.env.DATABASE_URL,
    supabase_url_set: !!process.env.SUPABASE_URL,
    supabase_key_set: !!process.env.SUPABASE_KEY,
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// API routes
const featuresRouter = require("./routes/features");
const instagramEmbedConfigRouter = require("./routes/instagram-embed-config");
const twitterEmbedConfigRouter = require("./routes/twitter-embed-config");
const embedsRouter = require("./routes/embeds");
const messagesRouter = require("./routes/messages");
const auditLogsRouter = require("./routes/audit-logs");
const pruningRouter = require("./routes/pruning");
const botSettingsRouter = require("./routes/bot-settings");

app.use("/api/features", isAuthenticated, featuresRouter);
app.use(
  "/api/instagram-embed-config",
  isAuthenticated,
  instagramEmbedConfigRouter
);
app.use("/api/twitter-embed-config", isAuthenticated, twitterEmbedConfigRouter);
app.use("/api/bot-settings", isAuthenticated, botSettingsRouter);
// Bot-accessible read-only endpoint for Instagram embed config (no auth required)
app.get("/api/bot/instagram-embed-config/:serverId", async (req, res) => {
  try {
    const { db } = require("./supabase");
    const result = await db.query(
      "SELECT * FROM instagram_embed_config WHERE server_id = $1",
      [req.params.serverId]
    );
    if (result.rows.length === 0) {
      // Return defaults if no config exists yet
      return res.json({
        server_id: req.params.serverId,
        webhook_repost_enabled: false,
        pruning_enabled: true,
        pruning_max_days: 90,
      });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching instagram embed config:", error);
    res.status(500).json({ error: "Failed to fetch config" });
  }
});
// Bot-accessible read-only endpoint for Twitter embed config (no auth required)
app.get("/api/bot/twitter-embed-config/:serverId", async (req, res) => {
  try {
    const { db } = require("./supabase");
    const result = await db.query(
      "SELECT * FROM twitter_embed_config WHERE server_id = $1",
      [req.params.serverId]
    );
    if (result.rows.length === 0) {
      // Return defaults if no config exists yet
      return res.json({
        server_id: req.params.serverId,
        webhook_repost_enabled: false,
        pruning_enabled: true,
        pruning_max_days: 90,
      });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching twitter embed config:", error);
    res.status(500).json({ error: "Failed to fetch config" });
  }
});
app.use("/api/embeds", isAuthenticated, embedsRouter);
app.use("/api/messages", isAuthenticated, messagesRouter);
app.use("/api/audit-logs", isAuthenticated, auditLogsRouter);
app.use("/api/pruning", isAuthenticated, pruningRouter);

// Pruning cron job - runs daily at 2 AM
cron.schedule("0 2 * * *", async () => {
  console.log("Running scheduled pruning job...");

  try {
    // Get all pruning configs
    const result = await db.query(
      "SELECT server_id, max_days FROM pruning_config WHERE enabled = true"
    );
    const configs = result.rows;

    for (const config of configs) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - config.max_days);

      // Delete old message data
      try {
        await db.query(
          "DELETE FROM message_data WHERE server_id = $1 AND created_at < $2",
          [config.server_id, cutoffDate.toISOString()]
        );
        console.log(
          `Pruned data for server ${config.server_id} (older than ${config.max_days} days)`
        );
      } catch (deleteError) {
        console.error(
          `Error pruning data for server ${config.server_id}:`,
          deleteError
        );
      }

      // Delete old audit logs
      try {
        await db.query(
          "DELETE FROM audit_logs WHERE server_id = $1 AND created_at < $2",
          [config.server_id, cutoffDate.toISOString()]
        );
      } catch (auditError) {
        console.error(
          `Error pruning audit logs for server ${config.server_id}:`,
          auditError
        );
      }
    }

    console.log("Pruning job completed successfully");
  } catch (error) {
    console.error("Error in pruning job:", error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`GFC Bot API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

// Export for testing
module.exports = { app, db };
