const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Parse DATABASE_URL from environment
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('✗ DATABASE_URL environment variable is not set');
  console.error('Please set your production DATABASE_URL in .env file');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false // Required for most production databases like Heroku, Railway, etc.
  }
});

async function runMigration() {
  try {
    console.log('Connecting to production database...');
    await client.connect();
    console.log('✓ Connected to production database');

    const sql = fs.readFileSync(
      path.join(__dirname, 'drizzle', '0007_add_banned_at.sql'),
      'utf8'
    );

    console.log('Running migration: 0007_add_banned_at.sql');
    console.log('SQL:', sql.trim());
    
    await client.query(sql);
    console.log('✓ Migration completed successfully on production database');

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
