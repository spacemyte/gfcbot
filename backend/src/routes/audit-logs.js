const express = require("express");
const router = express.Router();
const { supabase } = require("../supabase");

// Get audit logs for a server
router.get("/:serverId", async (req, res) => {
  try {
    const { limit = 100, offset = 0, action, startDate, endDate } = req.query;

    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .eq("server_id", req.params.serverId)
      .order("timestamp", { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (action) {
      query = query.eq("action", action);
    }

    if (startDate) {
      query = query.gte("timestamp", startDate);
    }

    if (endDate) {
      query = query.lte("timestamp", endDate);
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
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// Get available actions for filtering
router.get("/:serverId/actions", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("action")
      .eq("server_id", req.params.serverId);

    if (error) throw error;

    const actions = [...new Set(data.map((log) => log.action))];
    res.json(actions);
  } catch (error) {
    console.error("Error fetching actions:", error);
    res.status(500).json({ error: "Failed to fetch actions" });
  }
});

module.exports = router;
