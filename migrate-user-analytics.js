const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateUserAnalytics() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting user analytics migration...');
    
    // Add new columns to users table
    const migrations = [
      {
        name: 'login_count',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 1 NOT NULL;`
      },
      {
        name: 'total_sessions',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 1 NOT NULL;`
      },
      {
        name: 'average_session_duration',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS average_session_duration INTEGER DEFAULT 0;`
      },
      {
        name: 'first_login_date',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS first_login_date TIMESTAMP DEFAULT NOW() NOT NULL;`
      },
      {
        name: 'last_activity_at',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT NOW() NOT NULL;`
      },
      {
        name: 'preferred_room_types',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_room_types TEXT;`
      },
      {
        name: 'total_rooms_created',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS total_rooms_created INTEGER DEFAULT 0 NOT NULL;`
      },
      {
        name: 'total_rooms_joined',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS total_rooms_joined INTEGER DEFAULT 0 NOT NULL;`
      },
      {
        name: 'is_online',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE NOT NULL;`
      },
      {
        name: 'last_seen_at',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP DEFAULT NOW() NOT NULL;`
      }
    ];

    for (const migration of migrations) {
      console.log(`  ➜ Adding column: ${migration.name}`);
      await client.query(migration.sql);
    }

    // Initialize first_login_date with created_at for existing users
    console.log('  ➜ Initializing first_login_date for existing users...');
    await client.query(`
      UPDATE users 
      SET first_login_date = created_at 
      WHERE first_login_date IS NULL OR first_login_date > created_at;
    `);

    // Initialize last_activity_at with last_login for existing users
    console.log('  ➜ Initializing last_activity_at for existing users...');
    await client.query(`
      UPDATE users 
      SET last_activity_at = last_login 
      WHERE last_activity_at < last_login;
    `);

    // Initialize last_seen_at with last_login for existing users
    console.log('  ➜ Initializing last_seen_at for existing users...');
    await client.query(`
      UPDATE users 
      SET last_seen_at = last_login 
      WHERE last_seen_at < last_login;
    `);

    // Calculate and update total_rooms_created for existing users
    console.log('  ➜ Calculating total_rooms_created for existing users...');
    await client.query(`
      UPDATE users u
      SET total_rooms_created = (
        SELECT COUNT(*) 
        FROM rooms r 
        WHERE r.created_by = u.name OR r.created_by = u.email
      )
      WHERE total_rooms_created = 0;
    `);

    console.log('✅ User analytics migration completed successfully!');
    console.log('');
    console.log('New fields added:');
    console.log('  - login_count: Track total login attempts');
    console.log('  - total_sessions: Track total sessions');
    console.log('  - average_session_duration: Average time spent (minutes)');
    console.log('  - first_login_date: First time user logged in');
    console.log('  - last_activity_at: Last activity timestamp');
    console.log('  - preferred_room_types: User\'s favorite room types (JSON)');
    console.log('  - total_rooms_created: Number of rooms created by user');
    console.log('  - total_rooms_joined: Number of rooms joined by user');
    console.log('  - is_online: Current online status');
    console.log('  - last_seen_at: Last time user was seen');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateUserAnalytics().catch(console.error);
