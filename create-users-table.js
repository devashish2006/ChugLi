const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5433,
  user: 'chugli_user',
  password: 'chugli_pass',
  database: 'chugli_db',
});

async function createUsersTable() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        oauth_provider varchar(50) NOT NULL,
        oauth_id varchar(255) NOT NULL,
        email varchar(255) NOT NULL,
        name varchar(255),
        avatar_url text,
        created_at timestamp DEFAULT now() NOT NULL,
        last_login timestamp DEFAULT now() NOT NULL,
        banned boolean DEFAULT false NOT NULL,
        ban_reason text,
        CONSTRAINT users_oauth_provider_oauth_id_unique UNIQUE(oauth_provider, oauth_id)
      );
    `);
    console.log('✓ Users table created');

    // Add user_id column to messages table
    await client.query(`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id uuid;
    `);
    console.log('✓ user_id column added to messages table');

    // Add foreign key constraint
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'messages_user_id_fkey'
        ) THEN
          ALTER TABLE messages ADD CONSTRAINT messages_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    console.log('✓ Foreign key constraint added');

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS users_oauth_provider_oauth_id_idx 
      ON users (oauth_provider, oauth_id);
    `);
    console.log('✓ Index on users created');

    await client.query(`
      CREATE INDEX IF NOT EXISTS messages_user_id_idx 
      ON messages (user_id);
    `);
    console.log('✓ Index on messages created');

    console.log('\n✅ All tables and indexes created successfully!');
  } catch (error) {
    console.error('Error creating users table:', error);
  } finally {
    await client.end();
  }
}

createUsersTable();
