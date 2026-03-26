import dotenv from "dotenv";
dotenv.config();
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@/db/schema";

const databaseUrl = process.env.DATABASE_URL;

type Db = ReturnType<typeof drizzle>;

let dbInstance: Db | null = null;

if (databaseUrl) {
  // Drizzle's Neon adapter expects a Neon "client" (Pool/Client/PoolClient).
  const pool = new Pool({ connectionString: databaseUrl });
  dbInstance = drizzle(pool, { schema });
}

export const db = dbInstance;

export function requireDb() {
  if (!dbInstance) {
    throw new Error("Missing DATABASE_URL. Set it in .env.");
  }
  return dbInstance;
}

