const { Client } = require('pg');

async function testRoomCreation() {
  const client = new Client({
    connectionString: 'postgresql://chugli_user:chugli_pass@localhost:5433/chugli_db'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check existing rooms
    const result = await client.query(`
      SELECT 
        id, 
        name, 
        room_type, 
        expires_at,
        is_system_room,
        EXTRACT(EPOCH FROM (expires_at - NOW())) / 3600 as hours_remaining
      FROM rooms 
      WHERE expires_at > NOW()
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    console.log(`\n📊 Active Rooms: ${result.rows.length}`);
    console.log('='.repeat(80));
    
    if (result.rows.length === 0) {
      console.log('⚠️  No active rooms found!');
      
      // Check for expired rooms
      const expiredResult = await client.query(`
        SELECT COUNT(*) as count, MAX(expires_at) as last_expired
        FROM rooms
      `);
      
      console.log(`\n📋 Total rooms in DB: ${expiredResult.rows[0].count}`);
      console.log(`🕐 Last room expired at: ${expiredResult.rows[0].last_expired}`);
    } else {
      result.rows.forEach(room => {
        console.log(`\n🏠 ${room.name}`);
        console.log(`   Type: ${room.room_type || 'user'}`);
        console.log(`   System Room: ${room.is_system_room}`);
        console.log(`   Expires: ${room.expires_at}`);
        console.log(`   Hours Remaining: ${parseFloat(room.hours_remaining).toFixed(2)}h`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

testRoomCreation();
