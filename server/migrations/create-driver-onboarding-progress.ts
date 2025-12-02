
import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function createDriverOnboardingProgressTable() {
  try {
    // Check if the table already exists
    const checkTableQuery = sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'driver_onboarding_progress';
    `;
    
    const tables = await db.execute(checkTableQuery);
    
    // If table doesn't exist, create it
    if (!tables.rows.length) {
      console.log('Creating driver_onboarding_progress table...');
      
      const createTableQuery = sql`
        CREATE TABLE "driver_onboarding_progress" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL UNIQUE REFERENCES "users"("id"),
          "current_step" TEXT NOT NULL DEFAULT 'welcome',
          "completed_steps" JSONB DEFAULT '[]',
          "has_completed_tour" BOOLEAN DEFAULT false,
          "has_completed_first_ride" BOOLEAN DEFAULT false,
          "has_completed_profile" BOOLEAN DEFAULT false,
          "has_skipped_onboarding" BOOLEAN DEFAULT false,
          "has_disabled_onboarding" BOOLEAN DEFAULT false,
          "seen_features" JSONB DEFAULT '[]',
          "dismissed_tooltips" JSONB DEFAULT '[]',
          "saved_notification_preferences" JSONB DEFAULT '{}',
          "last_active_at" TIMESTAMP DEFAULT now() NOT NULL
        );
      `;
      
      await db.execute(createTableQuery);
      console.log('Successfully created driver_onboarding_progress table');
    } else {
      console.log('driver_onboarding_progress table already exists');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to create driver_onboarding_progress table:', error);
    throw error;
  }
}
