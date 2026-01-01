const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log("Starting migration 022...");
    console.log("Database URL:", process.env.DATABASE_URL);

    const migrationFile = "database/022_remove_restricted_warning_config.sql";
    console.log(`\nRunning migration: ${migrationFile}`);
    const sql = fs.readFileSync(path.join(__dirname, migrationFile), "utf8");

    try {
      await pool.query(sql);
      console.log(`✓ ${migrationFile} completed successfully`);
    } catch (err) {
      console.error(`✗ ${migrationFile} failed:`, err.message);
      process.exit(1);
    }

    await pool.end();
    console.log("\nMigration 022 completed!");
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

runMigration();
