import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

if (connectionString && connectionString.trim().length > 0) {
  try {
    const client = postgres(connectionString, {
      prepare: false,
      ssl: connectionString.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
    });
    dbInstance = drizzle(client, { schema });
    console.log("✅ Drizzle ORM connected to PostgreSQL database.");
  } catch (error) {
    console.warn("⚠️ Failed to initialize direct PostgreSQL Drizzle connection:", error);
  }
} else {
  console.log("ℹ️ DATABASE_URL is not set. Express will use Supabase client adapter for database queries.");
}

export const db = dbInstance;
export { schema };
