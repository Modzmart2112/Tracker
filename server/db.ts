import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./storage.drizzle";

const { Pool } = pg;

let db: ReturnType<typeof drizzle> | null = null;
let pool: Pool | null = null;

export function getDb() {
  if (!db && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    db = drizzle(pool, { schema });
  }
  
  if (!db) {
    throw new Error("Database connection not initialized. Check DATABASE_URL environment variable.");
  }
  
  return db;
}

// Export the db instance for direct use
export { db };

export function closeDb() {
  if (pool) {
    pool.end();
    pool = null;
    db = null;
  }
}