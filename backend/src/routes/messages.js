const express = require("express");
const router = express.Router();
const { db } = require("../supabase");

// Get message data for a server with filters
router.get("/:serverId", async (req, res) => {
  try {
    const { status, startDate, endDate, limit = 100, offset = 0 } = req.query;
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    let whereClause = "WHERE server_id = $1";
    let params = [req.params.serverId];
    let paramCount = 2;

    if (status) {
      whereClause += ` AND validation_status = $${paramCount}`;
      params.push(status);
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
      `SELECT COUNT(*) as total FROM message_data ${whereClause}`,
      params
    );
    const count = parseInt(countResult.rows[0].total);

    // Get data with pagination
    const dataResult = await db.query(
      `SELECT * FROM message_data ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${
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
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Get message statistics for a server
router.get("/:serverId/stats", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN validation_status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN validation_status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM message_data 
       WHERE server_id = $1`,
      [req.params.serverId]
    );

    const stats = result.rows[0];
    res.json({
      total: parseInt(stats.total) || 0,
      success: parseInt(stats.success) || 0,
      failed: parseInt(stats.failed) || 0,
    });
  } catch (error) {
    console.error("Error fetching message stats:", error);
    res.status(500).json({ error: "Failed to fetch message stats" });
  }
});

module.exports = router;
