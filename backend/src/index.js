require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const cron = require("node-cron");
const { supabase } = require("./supabase");

const app = express();
const PORT = process.env.PORT || 3001;

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
app.get("/auth/discord", passport.authenticate("discord"));

app.get(
  "/auth/discord/callback",
  passport.authenticate("discord", {
    failureRedirect: process.env.FRONTEND_URL,
  }),
  (req, res) => {
    // Session should be established here
    console.log("Discord auth successful, user:", req.user?.username);
    console.log("Session ID:", req.sessionID);
    res.redirect(process.env.FRONTEND_URL + "/dashboard");
  }
);

app.get("/auth/logout", (req, res) => {
  req.logout(() => {
    res.redirect(process.env.FRONTEND_URL);
  });
});

app.get("/auth/user", isAuthenticated, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    discriminator: req.user.discriminator,
    avatar: req.user.avatar,
    guilds: req.user.guilds,
  });
});

// API routes
const featuresRouter = require("./routes/features");
const embedsRouter = require("./routes/embeds");
const messagesRouter = require("./routes/messages");
const auditLogsRouter = require("./routes/audit-logs");
const pruningRouter = require("./routes/pruning");

app.use("/api/features", isAuthenticated, featuresRouter);
app.use("/api/embeds", isAuthenticated, embedsRouter);
app.use("/api/messages", isAuthenticated, messagesRouter);
app.use("/api/audit-logs", isAuthenticated, auditLogsRouter);
app.use("/api/pruning", isAuthenticated, pruningRouter);

// Pruning cron job - runs daily at 2 AM
cron.schedule("0 2 * * *", async () => {
  console.log("Running scheduled pruning job...");

  try {
    // Get all pruning configs
    const { data: configs, error } = await supabase
      .from("pruning_config")
      .select("server_id, enabled, max_days")
      .eq("enabled", true);

    if (error) throw error;

    for (const config of configs) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - config.max_days);

      // Delete old message data
      const { error: deleteError } = await supabase
        .from("message_data")
        .delete()
        .eq("server_id", config.server_id)
        .lt("created_at", cutoffDate.toISOString());

      if (deleteError) {
        console.error(
          `Error pruning data for server ${config.server_id}:`,
          deleteError
        );
      } else {
        console.log(
          `Pruned data for server ${config.server_id} (older than ${config.max_days} days)`
        );
      }

      // Delete old audit logs
      const { error: auditError } = await supabase
        .from("audit_logs")
        .delete()
        .eq("server_id", config.server_id)
        .lt("timestamp", cutoffDate.toISOString());

      if (auditError) {
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
module.exports = { app, supabase };
