import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { db } from './db';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async runBannedAtMigration() {
    try {
      // Check if column already exists
      const checkResult = await db.execute(sql`
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
      await db.execute(sql`ALTER TABLE users ADD COLUMN banned_at TIMESTAMP`);

      return {
        success: true,
        message: 'Successfully added banned_at column to users table'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
