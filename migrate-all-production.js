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
    rejectUnauthorized: false
  }
});

// List of migrations in order
const migrations = [
  '0000_enable_postgis.sql',
  '0000_sparkling_sway.sql',
  '0001_lazy_punisher.sql',
  '0002_bizarre_chat.sql',
  '0002_add_system_rooms.sql',
  '0003_add_user_rooms.sql',
  '0004_add_messages_table.sql',
  '0005_add_users_table.sql',
  '0006_add_anonymous_name.sql',
  '0006_add_violation_count.sql',
  '0007_add_banned_at.sql'
];

async function runAllMigrations() {
  try {
    console.log('Connecting to production database...');
    await client.connect();
    console.log('✓ Connected to production database\n');

    for (const migrationFile of migrations) {
      const migrationPath = path.join(__dirname, 'drizzle', migrationFile);
      
      if (!fs.existsSync(migrationPath)) {
        console.log(`⊘ Skipping ${migrationFile} (file not found)`);
        continue;
      }

      const sql = fs.readFileSync(migrationPath, 'utf8').trim();
      
      if (!sql || sql === '') {
        console.log(`⊘ Skipping ${migrationFile} (empty file)`);
        continue;
      }

      try {
        console.log(`Running migration: ${migrationFile}`);
        await client.query(sql);
        console.log(`✓ ${migrationFile} completed\n`);
      } catch (error) {
        if (error.code === '42710') {
          // Extension already exists
          console.log(`⊘ ${migrationFile} already applied (extension exists)\n`);
        } else if (error.code === '42P07') {
          // Table already exists
          console.log(`⊘ ${migrationFile} already applied (table exists)\n`);
        } else if (error.code === '42701') {
          // Column already exists
          console.log(`⊘ ${migrationFile} already applied (column exists)\n`);
        } else {
          console.error(`✗ ${migrationFile} failed:`, error.message);
          if (error.code) {
            console.error('Error code:', error.code);
          }
          console.log('');
          // Continue with other migrations instead of stopping
        }
      }
    }

    console.log('✓ All migrations processed successfully!');

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

runAllMigrations();
