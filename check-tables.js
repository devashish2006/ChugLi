require('dotenv').config();
const { Client } = require('pg');

async function checkTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Check existing tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    if (result.rows.length === 0) {
      console.log('No tables found in the database');
    } else {
      console.log('Existing tables:');
      result.rows.forEach(row => {
        console.log('  -', row.table_name);
      });
    }
    
    // Check messages table specifically
    const messagesCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'messages' 
      ORDER BY ordinal_position;
    `);
    
    if (messagesCheck.rows.length > 0) {
      console.log('\nMessages table columns:');
      messagesCheck.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTables();
