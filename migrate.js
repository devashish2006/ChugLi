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
      path.join(__dirname, 'drizzle', '0006_add_anonymous_name.sql'),
      'utf8'
    );

    console.log('Running migration...');
    await client.query(sql);
    
    console.log('✓ Migration completed successfully!');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
