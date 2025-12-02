import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

// Create a pool using the DATABASE_URL environment variable
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
// Create a drizzle instance with the pool
const db = drizzle(pool, { schema });

async function runMigration() {
  console.log('Running database migrations...');
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();