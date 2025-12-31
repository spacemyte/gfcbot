const express = require("express");
const router = express.Router();
const { db } = require("../db");

// Get bot setting
router.get("/:key", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT value FROM bot_settings WHERE key = $1",
      [req.params.key]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Setting not found" });
    }
    res.json({ key: req.params.key, value: result.rows[0].value });
  } catch (error) {
    console.error("Error fetching bot setting:", error);
    res.status(500).json({ error: "Failed to fetch setting" });
  }
});

// Set bot setting
router.put("/:key", async (req, res) => {
  try {
    const { value } = req.body;
    if (!value) {
      return res.status(400).json({ error: "Value is required" });
    }

    const result = await db.query(
      `INSERT INTO bot_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
       RETURNING *`,
      [req.params.key, value]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error setting bot setting:", error);
    res.status(500).json({ error: "Failed to update setting" });
  }
});

module.exports = router;
