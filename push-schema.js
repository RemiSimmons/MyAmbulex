import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './shared/schema.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  try {
    console.log('Creating notifications table...');
    
    // Execute raw SQL to create the notifications table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        image_url TEXT,
        link TEXT,
        read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        metadata JSONB
      )
    `);
    
    console.log('Notifications table created successfully');
    
    // Add a test notification
    await db.execute(`
      INSERT INTO notifications (user_id, type, title, message, read, metadata)
      VALUES (3, 'RIDE_EDIT_REJECTED', 'Test: Ride Edit Rejected', 'This is a test notification for ride edit rejection.', false, '{"testField": "test value"}')
    `);
    
    console.log('Test notification inserted successfully');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await pool.end();
  }
}

main();
