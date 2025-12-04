const express = require("express");
const router = express.Router();
const { db } = require("../supabase");

// Get Instagram embed config for a server
router.get("/:serverId", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM instagram_embed_config WHERE server_id = $1",
      [req.params.serverId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Config not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching instagram embed config:", error);
    res.status(500).json({ error: "Failed to fetch config" });
  }
});

// Upsert Instagram embed config for a server
router.put("/:serverId", async (req, res) => {
  try {
    const { webhook_repost_enabled, pruning_enabled, pruning_max_days } =
      req.body;
    const existing = await db.query(
      "SELECT id FROM instagram_embed_config WHERE server_id = $1",
      [req.params.serverId]
    );
    let result;
    if (existing.rows.length > 0) {
      result = await db.query(
        `UPDATE instagram_embed_config
         SET webhook_repost_enabled = $1, pruning_enabled = $2, pruning_max_days = $3, updated_at = NOW()
         WHERE server_id = $4 RETURNING *`,
        [
          webhook_repost_enabled,
          pruning_enabled,
          pruning_max_days,
          req.params.serverId,
        ]
      );
    } else {
      result = await db.query(
        `INSERT INTO instagram_embed_config (server_id, webhook_repost_enabled, pruning_enabled, pruning_max_days)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [
          req.params.serverId,
          webhook_repost_enabled,
          pruning_enabled,
          pruning_max_days,
        ]
      );
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating instagram embed config:", error);
    res.status(500).json({ error: "Failed to update config" });
  }
});

module.exports = router;
