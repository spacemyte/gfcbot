const express = require("express");
const router = express.Router();
const { db } = require("../db");

// Get audit logs for a server
router.get("/:serverId", async (req, res) => {
  // Disable caching for audit logs
  res.set(
    "Cache-Control",
    "no-cache, no-store, must-revalidate, private, max-age=0"
  );
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  try {
    const { limit = 100, offset = 0, action, startDate, endDate } = req.query;
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    let whereClause = "WHERE server_id = $1 AND deleted_at IS NULL";
    let params = [req.params.serverId];
    let paramCount = 2;

    if (action) {
      whereClause += ` AND action = $${paramCount}`;
      params.push(action);
      paramCount++;
    }

    if (startDate) {
      whereClause += ` AND created_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    // Get count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
      params
    );
    const count = parseInt(countResult.rows[0].total);

    // Get data with pagination
    const dataResult = await db.query(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY timestamp DESC LIMIT $${paramCount} OFFSET $${
        paramCount + 1
      }`,
      [...params, limitNum, offsetNum]
    );

    res.json({
      data: dataResult.rows,
      count,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// Get available actions for filtering
router.get("/:serverId/actions", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT action FROM audit_logs WHERE server_id = $1 AND deleted_at IS NULL ORDER BY action`,
      [req.params.serverId]
    );

    const actions = result.rows.map((row) => row.action);
    res.json(actions);
  } catch (error) {
    console.error("Error fetching actions:", error);
    res.status(500).json({ error: "Failed to fetch actions" });
  }
});

// Soft-delete a single audit log
router.delete("/:serverId/:logId", async (req, res) => {
  try {
    const { serverId, logId } = req.params;
    const result = await db.query(
      "UPDATE audit_logs SET deleted_at = NOW() WHERE id = $1 AND server_id = $2 AND deleted_at IS NULL RETURNING id",
      [logId, serverId]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Audit log not found or already deleted" });
    }

    res.json({ success: true, message: "Audit log soft-deleted" });
  } catch (error) {
    console.error("Error deleting audit log:", error);
    res.status(500).json({ error: "Failed to delete audit log" });
  }
});

// Soft-delete all audit logs for a server
router.delete("/:serverId", async (req, res) => {
  try {
    const { serverId } = req.params;
    const result = await db.query(
      "UPDATE audit_logs SET deleted_at = NOW() WHERE server_id = $1 AND deleted_at IS NULL",
      [serverId]
    );

    res.json({
      success: true,
      message: "All audit logs soft-deleted",
      deletedCount: result.rowCount,
    });
  } catch (error) {
    console.error("Error clearing audit logs:", error);
    res.status(500).json({ error: "Failed to clear audit logs" });
  }
});

module.exports = router;
