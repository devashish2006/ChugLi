require('dotenv').config();
const { Client } = require('pg');

async function verifyPostGIS() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Check if PostGIS extension exists
    const extResult = await client.query(
      "SELECT * FROM pg_extension WHERE extname = 'postgis';"
    );
    
    if (extResult.rows.length > 0) {
      console.log('✓ PostGIS extension is installed');
      console.log('  Version:', extResult.rows[0].extversion || 'unknown');
    } else {
      console.log('✗ PostGIS extension NOT found');
      return;
    }
    
    // Try to create a test geography type
    console.log('\nTesting geography type...');
    await client.query('DROP TABLE IF EXISTS _test_geography;');
    await client.query(`
      CREATE TABLE _test_geography (
        id serial PRIMARY KEY,
        location geography(Point, 4326)
      );
    `);
    console.log('✓ Geography type works!');
    
    // Clean up
    await client.query('DROP TABLE _test_geography;');
    console.log('✓ Test table cleaned up');
    
    console.log('\n✓ PostGIS is fully functional');
    console.log('\nYou can now run: npm run db:push');
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error('\nDetails:', error);
  } finally {
    await client.end();
  }
}

verifyPostGIS();
