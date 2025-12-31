const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL must be set for database access.");
  process.exit(1);
}

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test the connection on startup
(async () => {
  try {
    await db.query("SELECT 1");
    console.log("✓ PostgreSQL connection pool initialized");
  } catch (err) {
    console.error("✗ PostgreSQL connection error:", err);
    process.exit(1);
  }
})();

module.exports = { db };
