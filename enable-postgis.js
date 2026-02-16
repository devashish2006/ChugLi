require('dotenv').config();
const { Client } = require('pg');

async function enablePostGIS() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // In Azure PostgreSQL Flexible Server, first grant the azure_pg_admin role permission
    // Then create the extension
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS postgis CASCADE;');
      console.log('✓ PostGIS extension enabled successfully');
    } catch (extError) {
      if (extError.message.includes('not allow-listed')) {
        console.log('\n⚠️  PostGIS is not enabled for this Azure PostgreSQL server.');
        console.log('\nTo enable PostGIS on Azure PostgreSQL Flexible Server:');
        console.log('1. Go to Azure Portal → radis-db-server');
        console.log('2. Under Settings → Server parameters');
        console.log('3. Search for "azure.extensions"');
        console.log('4. Add "POSTGIS" to the allowed list');
        console.log('5. Click Save and wait for server to restart');
        console.log('\nAlternatively, run this Azure CLI command:');
        console.log('az postgres flexible-server parameter set \\');
        console.log('  --resource-group <your-resource-group> \\');
        console.log('  --server-name radis-db-server \\');
        console.log('  --name azure.extensions \\');
        console.log('  --value POSTGIS');
        process.exit(1);
      }
      throw extError;
    }
    
    // Verify it's enabled
    const result = await client.query(
      "SELECT * FROM pg_extension WHERE extname = 'postgis';"
    );
    
    if (result.rows.length > 0) {
      console.log('✓ PostGIS extension verified and ready');
      console.log('\nNow you can run: npm run db:push');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

enablePostGIS();
