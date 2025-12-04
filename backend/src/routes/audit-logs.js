const express = require("express");
const router = express.Router();
const { db } = require("../supabase");

// Get audit logs for a server
router.get("/:serverId", async (req, res) => {
  try {
    const { limit = 100, offset = 0, action, startDate, endDate } = req.query;
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    let whereClause = "WHERE server_id = $1";
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
      `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${
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
      `SELECT DISTINCT action FROM audit_logs WHERE server_id = $1 ORDER BY action`,
      [req.params.serverId]
    );

    const actions = result.rows.map((row) => row.action);
    res.json(actions);
  } catch (error) {
    console.error("Error fetching actions:", error);
    res.status(500).json({ error: "Failed to fetch actions" });
  }
});

module.exports = router;
