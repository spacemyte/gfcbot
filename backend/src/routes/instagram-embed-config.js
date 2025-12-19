const express = require("express");
const router = express.Router();
const { db } = require("../supabase");

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Get Instagram embed config for a server
router.get("/:serverId", async (req, res) => {
  try {
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
        webhook_reply_notifications: true,
        notify_self_replies: false,
        suppress_original_embed: true,
      });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching instagram embed config:", error);
    res.status(500).json({ error: "Failed to fetch config" });
  }
});

// Upsert Instagram embed config for a server
router.put("/:serverId", isAuthenticated, async (req, res) => {
  try {
    console.log(
      "Updating Instagram embed config for server:",
      req.params.serverId
    );
    console.log("Request body:", req.body);

    const {
      webhook_repost_enabled,
      pruning_enabled,
      pruning_max_days,
      webhook_reply_notifications,
      notify_self_replies,
      suppress_original_embed,
    } = req.body;
    const existing = await db.query(
      "SELECT id FROM instagram_embed_config WHERE server_id = $1",
      [req.params.serverId]
    );
    let result;
    if (existing.rows.length > 0) {
      result = await db.query(
        `UPDATE instagram_embed_config
         SET webhook_repost_enabled = $1, pruning_enabled = $2, pruning_max_days = $3, webhook_reply_notifications = $4, notify_self_replies = $5, suppress_original_embed = $6, updated_at = NOW()
         WHERE server_id = $7 RETURNING *`,
        [
          webhook_repost_enabled,
          pruning_enabled,
          pruning_max_days,
          webhook_reply_notifications,
          notify_self_replies,
          suppress_original_embed,
          req.params.serverId,
        ]
      );
    } else {
      result = await db.query(
        `INSERT INTO instagram_embed_config (server_id, webhook_repost_enabled, pruning_enabled, pruning_max_days, webhook_reply_notifications, notify_self_replies, suppress_original_embed)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          req.params.serverId,
          webhook_repost_enabled,
          pruning_enabled,
          pruning_max_days,
          webhook_reply_notifications,
          notify_self_replies,
          suppress_original_embed,
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
          "instagram_embed_config",
          result.rows[0].id,
          JSON.stringify({
            webhook_repost_enabled,
            pruning_enabled,
            pruning_max_days,
            webhook_reply_notifications,
            notify_self_replies,
            suppress_original_embed,
          }),
        ]
      );
    } catch (auditErr) {
      console.error("Failed to log instagram config update audit:", auditErr);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating instagram embed config:", error);
    res.status(500).json({ error: "Failed to update config" });
  }
});

module.exports = router;
