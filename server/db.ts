// Load environment variables
import 'dotenv/config';

import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Support both Neon and Supabase/standard PostgreSQL
// Auto-detect based on connection string or use USE_NEON env var
const isNeon = process.env.DATABASE_URL.includes('neon.tech') || 
               process.env.USE_NEON === 'true';

// Initialize database connection based on provider
let db: any;
let sql: any;

if (isNeon) {
  // Use Neon-specific connection (for Neon or Replit databases)
  const { neon } = await import('@neondatabase/serverless');
  const { drizzle } = await import('drizzle-orm/neon-http');
  sql = neon(process.env.DATABASE_URL);
  db = drizzle(sql, { schema });
} else {
  // Use standard PostgreSQL connection (for Supabase or other PostgreSQL)
  const { Pool } = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  });
  db = drizzle(pool, { schema });
  sql = pool; // For compatibility
}

export { db, sql };