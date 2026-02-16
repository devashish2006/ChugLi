require('dotenv').config();
const { Client } = require('pg');

async function createTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Create rooms table
    console.log('Creating rooms table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "rooms" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" text NOT NULL,
        "location" geography(Point, 4326) NOT NULL,
        "expires_at" timestamp NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "is_system_room" boolean DEFAULT false NOT NULL,
        "room_type" text,
        "city_name" text,
        "active_hour_start" integer,
        "active_hour_end" integer,
        "prompt" text,
        "is_user_room" boolean DEFAULT false NOT NULL,
        "created_by" text
      );
    `);
    console.log('✓ Rooms table created');
    
    // Create users table
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "oauth_provider" varchar(50) NOT NULL,
        "oauth_id" varchar(255) NOT NULL,
        "email" varchar(255) NOT NULL,
        "name" varchar(255),
        "avatar_url" text,
        "anonymous_name" varchar(100),
        "created_at" timestamp DEFAULT now() NOT NULL,
        "last_login" timestamp DEFAULT now() NOT NULL,
        "banned" boolean DEFAULT false NOT NULL,
        "ban_reason" text,
        "violation_count" integer DEFAULT 0 NOT NULL
      );
    `);
    console.log('✓ Users table created');
    
    // Add foreign key constraints to messages table
    console.log('Adding foreign key constraints...');
    try {
      await client.query(`
        ALTER TABLE "messages" 
        DROP CONSTRAINT IF EXISTS "messages_room_id_rooms_id_fk";
      `);
      await client.query(`
        ALTER TABLE "messages" 
        ADD CONSTRAINT "messages_room_id_rooms_id_fk" 
        FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") 
        ON DELETE cascade ON UPDATE no action;
      `);
      console.log('✓ Room foreign key added');
    } catch (e) {
      console.log('  Note:', e.message);
    }
    
    try {
      await client.query(`
        ALTER TABLE "messages" 
        DROP CONSTRAINT IF EXISTS "messages_user_id_users_id_fk";
      `);
      await client.query(`
        ALTER TABLE "messages" 
        ADD CONSTRAINT "messages_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") 
        ON DELETE set null ON UPDATE no action;
      `);
      console.log('✓ User foreign key added');
    } catch (e) {
      console.log('  Note:', e.message);
    }
    
    console.log('\n✓ All tables created successfully!');
    console.log('\nYour database is ready. You can now:');
    console.log('1. Test Google OAuth login');
    console.log('2. Add redirect URI to Google Console: http://localhost:3000/api/auth/callback/google');
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

createTables();
