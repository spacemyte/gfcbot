const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log("Starting migration 016_add_reaction_emoji.sql...");
    console.log("Database URL:", process.env.DATABASE_URL ? "Set" : "Not set");

    const migrationFile = "database/016_add_reaction_emoji.sql";
    const sql = fs.readFileSync(path.join(__dirname, migrationFile), "utf8");

    console.log(`\nRunning migration: ${migrationFile}`);
    await pool.query(sql);
    console.log(`✓ ${migrationFile} completed successfully`);

    // Verify columns were added
    console.log("\nVerifying instagram_embed_config columns...");
    const igResult = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'instagram_embed_config' 
      ORDER BY ordinal_position
    `);
    console.log("Instagram embed config columns:");
    igResult.rows.forEach((row) => {
      console.log(
        `  - ${row.column_name} (${row.data_type}) default: ${row.column_default}`
      );
    });

    console.log("\nVerifying twitter_embed_config columns...");
    const twResult = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'twitter_embed_config' 
      ORDER BY ordinal_position
    `);
    console.log("Twitter embed config columns:");
    twResult.rows.forEach((row) => {
      console.log(
        `  - ${row.column_name} (${row.data_type}) default: ${row.column_default}`
      );
    });

    console.log("\n✓ Migration completed successfully!");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
