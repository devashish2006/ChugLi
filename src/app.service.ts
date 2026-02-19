import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class AppService {
  constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {}

  getHello(): string {
    return 'Hello World!';
  }

  async runBannedAtMigration() {
    try {
      const client = await this.pool.connect();
      try {
        // Check if column already exists
        const checkResult = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'banned_at'
        `);

        if (checkResult.rows.length > 0) {
          return {
            success: true,
            message: 'Column banned_at already exists',
            alreadyExists: true
          };
        }

        // Add the column
        await client.query('ALTER TABLE users ADD COLUMN banned_at TIMESTAMP');

        return {
          success: true,
          message: 'Successfully added banned_at column to users table'
        };
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
