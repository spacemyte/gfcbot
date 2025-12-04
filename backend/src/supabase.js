const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error("ERROR: SUPABASE_URL or SUPABASE_KEY not set!");
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

console.log("Supabase client initialized with URL:", process.env.SUPABASE_URL);

module.exports = { supabase };
