const express = require("express");
const router = express.Router();
const { db } = require("../db");

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Get Twitter embed config for a server
router.get("/:serverId", async (req, res) => {
  try {
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
        webhook_reply_notifications: true,
        suppress_original_embed: true,
        reaction_enabled: true,
        reaction_emoji: "🙏",
        silence_restricted_warning: false,
        restricted_warning_message:
          "Cannot embed restricted content, please login to the original URL to view",
      });
    }
    const row = result.rows[0];
    // Apply fallbacks for nullable fields
    row.reaction_enabled = row.reaction_enabled ?? true;
    row.reaction_emoji = row.reaction_emoji ?? "🙏";
    res.json(row);
  } catch (error) {
    console.error("Error fetching twitter embed config:", error);
    res.status(500).json({ error: "Failed to fetch config" });
  }
});

// Upsert Twitter embed config for a server
router.put("/:serverId", isAuthenticated, async (req, res) => {
  try {
    console.log(
      "Updating Twitter embed config for server:",
      req.params.serverId
    );
    console.log("Request body:", req.body);

    const {
      webhook_repost_enabled,
      pruning_enabled,
      pruning_max_days,
      webhook_reply_notifications,
      suppress_original_embed,
      reaction_enabled = true,
      reaction_emoji,
      silence_restricted_warning = false,
      restricted_warning_message = "Cannot embed restricted content, please login to the original URL to view",
    } = req.body;
    const existing = await db.query(
      "SELECT id FROM twitter_embed_config WHERE server_id = $1",
      [req.params.serverId]
    );
    let result;
    if (existing.rows.length > 0) {
      result = await db.query(
        `UPDATE twitter_embed_config
         SET webhook_repost_enabled = $1, pruning_enabled = $2, pruning_max_days = $3, webhook_reply_notifications = $4, suppress_original_embed = $5, reaction_enabled = $6, reaction_emoji = $7, silence_restricted_warning = $8, restricted_warning_message = $9, updated_at = NOW()
         WHERE server_id = $10 RETURNING *`,
        [
          webhook_repost_enabled,
          pruning_enabled,
          pruning_max_days,
          webhook_reply_notifications,
          suppress_original_embed,
          reaction_enabled,
          reaction_emoji || "🙏",
          silence_restricted_warning,
          restricted_warning_message ||
            "Cannot embed restricted content, please login to the original URL to view",
          req.params.serverId,
        ]
      );
    } else {
      result = await db.query(
        `INSERT INTO twitter_embed_config (server_id, webhook_repost_enabled, pruning_enabled, pruning_max_days, webhook_reply_notifications, suppress_original_embed, reaction_enabled, reaction_emoji, silence_restricted_warning, restricted_warning_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          req.params.serverId,
          webhook_repost_enabled,
          pruning_enabled,
          pruning_max_days,
          webhook_reply_notifications,
          suppress_original_embed,
          reaction_enabled,
          reaction_emoji || "🙏",
          silence_restricted_warning,
          restricted_warning_message ||
            "Cannot embed restricted content, please login to the original URL to view",
        ]
      );
    }

    // Log audit trail
    try {
      await db.query(
        `INSERT INTO audit_logs (server_id, user_id, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.params.serverId,
          req.user.id,
          "config_updated",
          "twitter_embed_config",
          result.rows[0].id,
          JSON.stringify({
            webhook_repost_enabled,
            pruning_enabled,
            pruning_max_days,
            webhook_reply_notifications,
            suppress_original_embed,
            reaction_enabled,
            reaction_emoji,
          }),
        ]
      );
    } catch (auditErr) {
      console.error("Failed to log twitter config update audit:", auditErr);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating twitter embed config:", error);
    res.status(500).json({ error: "Failed to update config" });
  }
});

module.exports = router;
