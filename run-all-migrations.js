const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runAllMigrations() {
  try {
    console.log("🚀 Starting all database migrations...");
    console.log(
      "Database URL:",
      process.env.DATABASE_URL ? "✓ Set" : "✗ Not set"
    );

    if (!process.env.DATABASE_URL) {
      console.error("ERROR: DATABASE_URL environment variable is not set");
      process.exit(1);
    }

    // Read all migration files in order
    const migrations = fs
      .readdirSync(path.join(__dirname, "database"))
      .filter((file) => file.match(/^\d+_.*\.sql$/))
      .sort();

    console.log(`\nFound ${migrations.length} migrations to run:\n`);

    let successCount = 0;
    let failureCount = 0;

    for (const migrationFile of migrations) {
      const migrationPath = path.join(__dirname, "database", migrationFile);
      const sql = fs.readFileSync(migrationPath, "utf8");

      try {
        console.log(`Running: ${migrationFile}...`);
        await pool.query(sql);
        console.log(`✓ ${migrationFile} completed successfully\n`);
        successCount++;
      } catch (err) {
        // Check if it's an "already exists" error which is acceptable
        if (
          err.message.includes("already exists") ||
          err.message.includes("duplicate key") ||
          (err.message.includes("SQLSTATE") && err.code === "42P07")
        ) {
          // "relation already exists"
          console.log(`⚠ ${migrationFile} skipped (already exists)\n`);
          successCount++;
        } else {
          console.error(`✗ Error in ${migrationFile}:`, err.message);
          console.error(
            `  Details: ${err.detail || "No additional details"}\n`
          );
          failureCount++;
        }
      }
    }

    // Verify tables were created
    console.log("📋 Verifying database tables...");
    const result = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    );

    console.log(`\nDatabase contains ${result.rows.length} tables:\n`);
    result.rows.forEach((row) => {
      console.log(`  ✓ ${row.tablename}`);
    });

    // Verify key tables have expected columns
    console.log("\n🔍 Verifying instagram_embed_config columns...");
    const igResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'instagram_embed_config' 
      ORDER BY ordinal_position
    `);

    if (igResult.rows.length === 0) {
      console.log("⚠ instagram_embed_config table not found!");
    } else {
      console.log("instagram_embed_config columns:");
      igResult.rows.forEach((row) => {
        console.log(`  - ${row.column_name} (${row.data_type})`);
      });
    }

    console.log("\n🔍 Verifying twitter_embed_config columns...");
    const twResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'twitter_embed_config' 
      ORDER BY ordinal_position
    `);

    if (twResult.rows.length === 0) {
      console.log("⚠ twitter_embed_config table not found!");
    } else {
      console.log("twitter_embed_config columns:");
      twResult.rows.forEach((row) => {
        console.log(`  - ${row.column_name} (${row.data_type})`);
      });
    }

    console.log(`\n✅ Migrations Summary:`);
    console.log(`  Successful: ${successCount}/${migrations.length}`);
    console.log(`  Failed: ${failureCount}/${migrations.length}`);

    if (failureCount === 0) {
      console.log("\n🎉 All migrations completed successfully!");
      process.exit(0);
    } else {
      console.log(
        "\n⚠ Some migrations failed. Please review the errors above."
      );
      process.exit(1);
    }
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runAllMigrations();
