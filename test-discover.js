// Test script to trigger room discovery and check if rooms are created
const axios = require('axios');

async function testRoomDiscovery() {
  try {
    console.log('🔍 Testing room discovery endpoint...\n');
    
    // Test coordinates (example location)
    const lat = 28.6139;
    const lng = 77.2090;
    const city = 'Delhi';
    
    const response = await axios.get(`http://localhost:4000/rooms/discover`, {
      params: { lat, lng, city }
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('\n📊 Rooms discovered:', response.data.length);
    console.log('='.repeat(80));
    
    if (response.data.length === 0) {
      console.log('⚠️  No rooms returned from API!');
    } else {
      response.data.forEach((room, index) => {
        console.log(`\n${index + 1}. ${room.name}`);
        console.log(`   Type: ${room.roomType}`);
        console.log(`   Active: ${room.isActive}`);
        console.log(`   Distance: ${room.distance_in_meters}m`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testRoomDiscovery();
