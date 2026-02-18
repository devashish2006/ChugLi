const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'localhost',
  port: 5433,
  user: 'chugli_user',
  password: 'chugli_pass',
  database: 'chugli_db',
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✓ Connected to database');

    const sql = fs.readFileSync(
      path.join(__dirname, 'drizzle', '0007_add_banned_at.sql'),
      'utf8'
    );

    console.log('Running migration: 0007_add_banned_at.sql');
    await client.query(sql);
    console.log('✓ Migration completed successfully');

  } catch (error) {
    console.error('✗ Migration failed:', error);
  } finally {
    await client.end();
  }
}

runMigration();
