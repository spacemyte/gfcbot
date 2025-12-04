const express = require("express");
const router = express.Router();
const { db } = require("../supabase");

// Get pruning config for a server
router.get("/:serverId", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM pruning_config WHERE server_id = $1",
      [req.params.serverId]
    );

    if (result.rows.length === 0) {
      // If not found, return default config
      return res.json({
        server_id: req.params.serverId,
        enabled: true,
        max_days: 90,
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching pruning config:", error);
    res.status(500).json({ error: "Failed to fetch pruning config" });
  }
});

// Update pruning config
router.put("/:serverId", async (req, res) => {
  try {
    const { enabled, max_days } = req.body;

    // Validate max_days
    if (max_days !== undefined && (max_days < 1 || max_days > 90)) {
      return res
        .status(400)
        .json({ error: "max_days must be between 1 and 90" });
    }

    // Check if config exists
    const existResult = await db.query(
      "SELECT id FROM pruning_config WHERE server_id = $1",
      [req.params.serverId]
    );

    let result;
    if (existResult.rows.length === 0) {
      // Insert new config
      result = await db.query(
        `INSERT INTO pruning_config (server_id, enabled, max_days)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [
          req.params.serverId,
          enabled !== undefined ? enabled : true,
          max_days || 90,
        ]
      );
    } else {
      // Update existing config
      const updates = [];
      const values = [req.params.serverId];
      let paramCount = 2;

      if (enabled !== undefined) {
        updates.push(`enabled = $${paramCount++}`);
        values.push(enabled);
      }
      if (max_days !== undefined) {
        updates.push(`max_days = $${paramCount++}`);
        values.push(max_days);
      }

      updates.push(`updated_at = NOW()`);

      result = await db.query(
        `UPDATE pruning_config 
         SET ${updates.join(", ")}
         WHERE server_id = $1
         RETURNING *`,
        values
      );
    }

    const data = result.rows[0];

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
          req.params.serverId,
          JSON.stringify({ enabled, max_days }),
        ]
      );
    }

    res.json(data);
  } catch (error) {
    console.error("Error updating pruning config:", error);
    res.status(500).json({ error: "Failed to update pruning config" });
  }
});

module.exports = router;
