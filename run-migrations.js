const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  try {
    console.log("Starting migrations...");
    console.log("Database URL:", process.env.DATABASE_URL);

    // Read migration files
    const migrations = [
      "database/001_initial_schema.sql",
      "database/002_row_level_security.sql",
      "database/003_functions_and_triggers.sql",
    ];

    for (const migrationFile of migrations) {
      console.log(`\nRunning migration: ${migrationFile}`);
      const sql = fs.readFileSync(path.join(__dirname, migrationFile), "utf8");

      try {
        await pool.query(sql);
        console.log(`✓ ${migrationFile} completed successfully`);
      } catch (err) {
        console.error(`✗ Error in ${migrationFile}:`, err.message);
        // Continue to next migration even if this one has errors
      }
    }

    // Verify tables were created
    console.log("\nVerifying tables...");
    const result = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    );

    console.log("Tables in database:");
    result.rows.forEach((row) => {
      console.log(`  - ${row.tablename}`);
    });

    console.log("\n✓ Migrations completed!");
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
