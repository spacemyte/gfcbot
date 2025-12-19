const express = require("express");
const router = express.Router();
const { db } = require("../supabase");

// Get embed configs for a server
router.get("/:serverId", async (req, res) => {
  try {
    console.log("Fetching embeds for server:", req.params.serverId);
    const result = await db.query(
      "SELECT * FROM embed_configs WHERE server_id = $1 ORDER BY priority ASC",
      [req.params.serverId]
    );

    console.log("Embeds fetched successfully:", result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching embed configs:", error.message);
    res
      .status(500)
      .json({ error: "Failed to fetch embed configs", details: error.message });
  }
});

// Create new embed config
router.post("/:serverId", async (req, res) => {
  try {
    const { prefix, active, priority, feature_id, embed_type } = req.body;

    console.log("Creating embed config:", {
      serverId: req.params.serverId,
      prefix,
      active,
      priority,
      feature_id,
      embed_type,
    });

    if (!db.query) {
      console.error(
        "ERROR: db.query is not a function. db object:",
        Object.keys(db)
      );
      return res.status(500).json({
        error: "Failed to create embed config",
        details:
          "Database not properly initialized - db.query is not available",
      });
    }

    const result = await db.query(
      `INSERT INTO embed_configs (server_id, feature_id, prefix, active, priority, embed_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.params.serverId,
        feature_id,
        prefix,
        active !== undefined ? active : true,
        priority || 0,
        embed_type || "prefix",
      ]
    );

    const data = result.rows[0];

    // Log audit trail
    if (req.user) {
      await db.query(
        `INSERT INTO audit_logs (server_id, user_id, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.params.serverId,
          req.user.id,
          "embed_created",
          "embed_config",
          data.id,
          JSON.stringify({ prefix, active, priority, embed_type }),
        ]
      );
    }

    res.json(data);
  } catch (error) {
    console.error("Error creating embed config:", error);
    res
      .status(500)
      .json({ error: "Failed to create embed config", details: error.message });
  }
});

// Update embed config
router.put("/:serverId/:id", async (req, res) => {
  try {
    const { prefix, active, priority, embed_type } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (prefix !== undefined) {
      updates.push(`prefix = $${paramCount++}`);
      values.push(prefix);
    }
    if (active !== undefined) {
      updates.push(`active = $${paramCount++}`);
      values.push(active);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(priority);
    }
    if (embed_type !== undefined) {
      updates.push(`embed_type = $${paramCount++}`);
      values.push(embed_type);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(req.params.id, req.params.serverId);

    const result = await db.query(
      `UPDATE embed_configs 
       SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = $${paramCount++} AND server_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Embed config not found" });
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
          "embed_updated",
          "embed_config",
          req.params.id,
          JSON.stringify({ prefix, active, priority, embed_type }),
        ]
      );
    }

    res.json(data);
  } catch (error) {
    console.error("Error updating embed config:", error);
    res.status(500).json({ error: "Failed to update embed config" });
  }
});

// Delete embed config
router.delete("/:serverId/:id", async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM embed_configs WHERE id = $1 AND server_id = $2 RETURNING *",
      [req.params.id, req.params.serverId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Embed config not found" });
    }

    // Log audit trail
    if (req.user) {
      await db.query(
        `INSERT INTO audit_logs (server_id, user_id, action, target_type, target_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.params.serverId,
          req.user.id,
          "embed_deleted",
          "embed_config",
          req.params.id,
        ]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting embed config:", error);
    res.status(500).json({ error: "Failed to delete embed config" });
  }
});

// Update priority order (bulk update)
router.post("/:serverId/reorder", async (req, res) => {
  try {
    const { embedIds } = req.body; // Array of IDs in desired order

    // Update priority for each embed
    for (let i = 0; i < embedIds.length; i++) {
      await db.query(
        "UPDATE embed_configs SET priority = $1, updated_at = NOW() WHERE id = $2 AND server_id = $3",
        [i, embedIds[i], req.params.serverId]
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
          "embeds_reordered",
          "embed_config",
          "bulk",
          JSON.stringify({ embedIds }),
        ]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error reordering embeds:", error);
    res.status(500).json({ error: "Failed to reorder embeds" });
  }
});

module.exports = router;
