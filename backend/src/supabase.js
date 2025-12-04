const { Pool } = require("pg");

// Support both Supabase (SUPABASE_URL/SUPABASE_KEY) and direct PostgreSQL (DATABASE_URL)
let db;

if (process.env.DATABASE_URL) {
  // Using direct PostgreSQL connection (Railway)
  console.log("Initializing PostgreSQL connection pool");
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Test the connection
  db.query("SELECT NOW()")
    .then(() =>
      console.log("PostgreSQL connection pool initialized successfully")
    )
    .catch((err) => {
      console.error("PostgreSQL connection error:", err);
      process.exit(1);
    });
} else if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  // Using Supabase client (legacy support)
  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );
  console.log(
    "Supabase client initialized with URL:",
    process.env.SUPABASE_URL
  );

  // Create a wrapper to make Supabase work with PostgreSQL query interface
  db = {
    query: async (text, params) => {
      // This is a simplified wrapper - routes would need updating for full compatibility
      throw new Error(
        "Supabase mode requires DATABASE_URL for query() support"
      );
    },
    supabase, // Keep for routes that still use .from() syntax
  };
} else {
  console.error(
    "ERROR: Either DATABASE_URL or both SUPABASE_URL and SUPABASE_KEY must be set!"
  );
  process.exit(1);
}

module.exports = { db };

module.exports = { db, supabase: db.supabase };
