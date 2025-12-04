const express = require("express");
const router = express.Router();
const { supabase } = require("../supabase");

// Get message data for a server with filters
router.get("/:serverId", async (req, res) => {
  try {
    const { status, startDate, endDate, limit = 100, offset = 0 } = req.query;

    let query = supabase
      .from("message_data")
      .select("*", { count: "exact" })
      .eq("server_id", req.params.serverId)
      .order("created_at", { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (status) {
      query = query.eq("validation_status", status);
    }

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      data,
      count,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Get message statistics for a server
router.get("/:serverId/stats", async (req, res) => {
  try {
    // Get total count
    const { count: totalCount, error: totalError } = await supabase
      .from("message_data")
      .select("*", { count: "exact", head: true })
      .eq("server_id", req.params.serverId);

    if (totalError) throw totalError;

    // Get success count
    const { count: successCount, error: successError } = await supabase
      .from("message_data")
      .select("*", { count: "exact", head: true })
      .eq("server_id", req.params.serverId)
      .eq("validation_status", "success");

    if (successError) throw successError;

    // Get failed count
    const { count: failedCount, error: failedError } = await supabase
      .from("message_data")
      .select("*", { count: "exact", head: true })
      .eq("server_id", req.params.serverId)
      .eq("validation_status", "failed");

    if (failedError) throw failedError;

    res.json({
      total: totalCount || 0,
      success: successCount || 0,
      failed: failedCount || 0,
    });
  } catch (error) {
    console.error("Error fetching message stats:", error);
    res.status(500).json({ error: "Failed to fetch message stats" });
  }
});

module.exports = router;
