const express = require("express");
const router = express.Router();
const { db } = require("../db");

// Get all features
router.get("/", async (req, res) => {
  try {
    console.log("Fetching features...");
    const result = await db.query("SELECT * FROM features ORDER BY name ASC");

    console.log("Features fetched successfully:", result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching features:", error.message);
    res
      .status(500)
      .json({ error: "Failed to fetch features", details: error.message });
  }
});

// Get feature by ID
router.get("/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM features WHERE id = $1", [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Feature not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching feature:", error);
    res.status(500).json({ error: "Failed to fetch feature" });
  }
});

// Get permissions for a feature in a server
router.get("/:id/permissions/:serverId", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM feature_permissions WHERE feature_id = $1 AND server_id = $2",
      [req.params.id, req.params.serverId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
});

module.exports = router;
