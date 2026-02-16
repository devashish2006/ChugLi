import { config } from "dotenv";
config(); // Load environment variables before anything else

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Use DATABASE_URL if provided, otherwise fall back to local config
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('azure') || process.env.DATABASE_URL.includes('sslmode=require')
          ? { rejectUnauthorized: false }
          : false,
        connectionTimeoutMillis: 10000, // 10 second timeout
        idleTimeoutMillis: 30000, // 30 seconds
        max: 10, // maximum pool size
      }
    : {
        host: "127.0.0.1",
        port: 5433,
        user: "chugli_user",
        password: "chugli_pass",
        database: "chugli_db",
        ssl: false,
      }
);

export const db = drizzle(pool, { schema });
