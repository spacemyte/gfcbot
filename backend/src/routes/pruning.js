const express = require("express");
const router = express.Router();
const { supabase } = require("../index");

// Get pruning config for a server
router.get("/:serverId", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("pruning_config")
      .select("*")
      .eq("server_id", req.params.serverId)
      .single();

    if (error) {
      // If not found, return default config
      if (error.code === "PGRST116") {
        return res.json({
          server_id: req.params.serverId,
          enabled: true,
          max_days: 90,
        });
      }
      throw error;
    }

    res.json(data);
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

    const updateData = {};
    if (enabled !== undefined) updateData.enabled = enabled;
    if (max_days !== undefined) updateData.max_days = max_days;

    const { data, error } = await supabase
      .from("pruning_config")
      .upsert({
        server_id: req.params.serverId,
        ...updateData,
      })
      .select()
      .single();

    if (error) throw error;

    // Log audit trail
    await supabase.from("audit_logs").insert({
      server_id: req.params.serverId,
      user_id: req.user.id,
      action: "pruning_config_updated",
      target_type: "pruning_config",
      target_id: req.params.serverId,
      details: updateData,
    });

    res.json(data);
  } catch (error) {
    console.error("Error updating pruning config:", error);
    res.status(500).json({ error: "Failed to update pruning config" });
  }
});

module.exports = router;
