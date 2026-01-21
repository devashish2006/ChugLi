require('dotenv').config();
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');

async function addViolationColumn() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  const db = drizzle(pool);
  
  try {
    console.log('Adding violation_count column to users table...');
    
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS violation_count integer DEFAULT 0 NOT NULL
    `);
    
    console.log('✓ Successfully added violation_count column');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

addViolationColumn();
