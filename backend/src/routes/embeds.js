const express = require("express");
const router = express.Router();
const { supabase } = require("../index");

// Get embed configs for a server
router.get("/:serverId", async (req, res) => {
  try {
    console.log("Fetching embeds for server:", req.params.serverId);
    const { data, error } = await supabase
      .from("embed_configs")
      .select("*")
      .eq("server_id", req.params.serverId)
      .order("priority", { ascending: true });

    if (error) {
      console.error("Supabase error fetching embeds:", error);
      throw error;
    }

    console.log("Embeds fetched successfully:", data);
    res.json(data);
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
    const { prefix, active, priority, feature_id } = req.body;

    const { data, error } = await supabase
      .from("embed_configs")
      .insert({
        server_id: req.params.serverId,
        feature_id,
        prefix,
        active: active !== undefined ? active : true,
        priority: priority || 0,
      })
      .select()
      .single();

    if (error) throw error;

    // Log audit trail
    await supabase.from("audit_logs").insert({
      server_id: req.params.serverId,
      user_id: req.user.id,
      action: "embed_created",
      target_type: "embed_config",
      target_id: data.id,
      details: { prefix, active, priority },
    });

    res.json(data);
  } catch (error) {
    console.error("Error creating embed config:", error);
    res.status(500).json({ error: "Failed to create embed config" });
  }
});

// Update embed config
router.put("/:serverId/:id", async (req, res) => {
  try {
    const { prefix, active, priority } = req.body;

    const updateData = {};
    if (prefix !== undefined) updateData.prefix = prefix;
    if (active !== undefined) updateData.active = active;
    if (priority !== undefined) updateData.priority = priority;

    const { data, error } = await supabase
      .from("embed_configs")
      .update(updateData)
      .eq("id", req.params.id)
      .eq("server_id", req.params.serverId)
      .select()
      .single();

    if (error) throw error;

    // Log audit trail
    await supabase.from("audit_logs").insert({
      server_id: req.params.serverId,
      user_id: req.user.id,
      action: "embed_updated",
      target_type: "embed_config",
      target_id: req.params.id,
      details: updateData,
    });

    res.json(data);
  } catch (error) {
    console.error("Error updating embed config:", error);
    res.status(500).json({ error: "Failed to update embed config" });
  }
});

// Delete embed config
router.delete("/:serverId/:id", async (req, res) => {
  try {
    const { error } = await supabase
      .from("embed_configs")
      .delete()
      .eq("id", req.params.id)
      .eq("server_id", req.params.serverId);

    if (error) throw error;

    // Log audit trail
    await supabase.from("audit_logs").insert({
      server_id: req.params.serverId,
      user_id: req.user.id,
      action: "embed_deleted",
      target_type: "embed_config",
      target_id: req.params.id,
    });

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
      await supabase
        .from("embed_configs")
        .update({ priority: i })
        .eq("id", embedIds[i])
        .eq("server_id", req.params.serverId);
    }

    // Log audit trail
    await supabase.from("audit_logs").insert({
      server_id: req.params.serverId,
      user_id: req.user.id,
      action: "embeds_reordered",
      target_type: "embed_config",
      target_id: "bulk",
      details: { embedIds },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error reordering embeds:", error);
    res.status(500).json({ error: "Failed to reorder embeds" });
  }
});

module.exports = router;
