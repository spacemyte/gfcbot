const express = require("express");
const router = express.Router();
const { db } = require("../supabase");

// Get pruning config for a server
router.get("/:serverId", async (req, res) => {
  try {
    console.log("Fetching pruning config for server:", req.params.serverId);
    const result = await db.query(
      "SELECT * FROM pruning_config WHERE server_id = $1",
      [req.params.serverId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pruning config not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching pruning config:", error.message);
    res.status(500).json({ error: "Failed to fetch pruning config" });
  }
});

// Update pruning config for a server
router.put("/:serverId", async (req, res) => {
  try {
    const { enabled, max_days, webhook_repost_enabled } = req.body;

    // Check if config exists
    const existing = await db.query(
      "SELECT id FROM pruning_config WHERE server_id = $1",
      [req.params.serverId]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update
      result = await db.query(
        `UPDATE pruning_config
         SET enabled = $1, max_days = $2, webhook_repost_enabled = $3, updated_at = NOW()
         WHERE server_id = $4
         RETURNING *`,
        [enabled, max_days, webhook_repost_enabled, req.params.serverId]
      );
    } else {
      // Insert
      result = await db.query(
        `INSERT INTO pruning_config (server_id, enabled, max_days, webhook_repost_enabled)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [req.params.serverId, enabled, max_days, webhook_repost_enabled]
      );
    }

    // Log audit trail
    if (req.user) {
      await db.query(
        `INSERT INTO audit_logs (server_id, user_id, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.params.serverId,
          req.user.id,
          "pruning_config_updated",
          "pruning_config",
          result.rows[0].id,
          JSON.stringify({ enabled, max_days, webhook_repost_enabled }),
        ]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating pruning config:", error);
    res.status(500).json({ error: "Failed to update pruning config" });
  }
});

module.exports = router;
