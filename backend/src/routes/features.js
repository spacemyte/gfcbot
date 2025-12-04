const express = require("express");
const router = express.Router();
const { supabase } = require("../index");

// Get all features
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("features")
      .select("*")
      .order("name");

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error fetching features:", error);
    res.status(500).json({ error: "Failed to fetch features" });
  }
});

// Get feature by ID
router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("features")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error fetching feature:", error);
    res.status(500).json({ error: "Failed to fetch feature" });
  }
});

// Get permissions for a feature in a server
router.get("/:id/permissions/:serverId", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("feature_permissions")
      .select("*")
      .eq("feature_id", req.params.id)
      .eq("server_id", req.params.serverId);

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
});

module.exports = router;
