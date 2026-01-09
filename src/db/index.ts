import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!db) {
    const isProd = process.env.NODE_ENV === "production";

    const pool = new Pool(
      isProd
        ? {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
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

    db = drizzle(pool);
  }

  return db;
}
