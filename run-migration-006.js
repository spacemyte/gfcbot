const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const fs = require('fs');
    const migration = fs.readFileSync('./database/006_webhook_message_tracking.sql', 'utf8');
    
    await client.query(migration);
    console.log('Migration 006 applied successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
