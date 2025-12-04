const { Pool } = require("pg");

// Support both Supabase (SUPABASE_URL/SUPABASE_KEY) and direct PostgreSQL (DATABASE_URL)
let db;

console.log("Supabase initialization - checking environment variables...");
console.log("DATABASE_URL set:", !!process.env.DATABASE_URL);
console.log("SUPABASE_URL set:", !!process.env.SUPABASE_URL);
console.log("SUPABASE_KEY set:", !!process.env.SUPABASE_KEY);

if (process.env.DATABASE_URL) {
  // Using direct PostgreSQL connection (Railway)
  console.log("✓ Using Railway PostgreSQL connection pool");

  // Extract and log connection details (without password)
  const urlObj = new URL(process.env.DATABASE_URL);
  console.log(
    `✓ Connecting to: ${urlObj.hostname}:${urlObj.port} database: ${urlObj.pathname}`
  );

  db = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Test the connection
  db.query("SELECT NOW()")
    .then(() =>
      console.log("✓ PostgreSQL connection pool initialized successfully")
    )
    .catch((err) => {
      console.error("✗ PostgreSQL connection error:", err);
      process.exit(1);
    });
} else if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  // Using Supabase client (legacy support)
  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );
  console.log("✓ Using Supabase client with URL:", process.env.SUPABASE_URL);

  // Create a wrapper to make Supabase work with PostgreSQL query interface
  db = {
    query: async (text, params) => {
      // This is a simplified wrapper - routes would need updating for full compatibility
      throw new Error(
        "ERROR: Supabase mode detected but routes use db.query() which requires DATABASE_URL. Add DATABASE_URL to environment variables."
      );
    },
    supabase, // Keep for routes that still use .from() syntax
  };
} else {
  console.error(
    "✗ ERROR: Either DATABASE_URL or both SUPABASE_URL and SUPABASE_KEY must be set!"
  );
  process.exit(1);
}

module.exports = { db };
