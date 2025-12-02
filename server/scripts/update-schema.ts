import { db } from "../db";
import { sql } from "drizzle-orm";

async function updateSchema() {
  try {
    console.log("Starting schema update...");
    
    // Check if the table already exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'rider_onboarding_progress'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log("Creating rider_onboarding_progress table...");
      
      // Create the rider_onboarding_progress table
      await db.execute(sql`
        CREATE TABLE "rider_onboarding_progress" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL UNIQUE REFERENCES "users"("id"),
          "current_step" TEXT NOT NULL DEFAULT 'welcome',
          "onboarding_completed" BOOLEAN DEFAULT false,
          "profile_completion_percentage" INTEGER DEFAULT 0,
          "is_first_ride" BOOLEAN DEFAULT true,
          "completed_tours" JSONB DEFAULT '[]',
          "saved_profile_data" JSONB DEFAULT '{}',
          "saved_accessibility_data" JSONB DEFAULT '{}',
          "saved_locations_data" JSONB DEFAULT '[]',
          "saved_payment_data" JSONB DEFAULT '{}',
          "saved_notification_preferences" JSONB DEFAULT '{}',
          "last_updated" TIMESTAMP DEFAULT now() NOT NULL
        );
      `);
      
      console.log("rider_onboarding_progress table created successfully!");
    } else {
      console.log("rider_onboarding_progress table already exists, skipping creation.");
    }
    
    console.log("Schema update completed successfully!");
  } catch (error) {
    console.error("Error updating schema:", error);
  } finally {
    process.exit(0);
  }
}

updateSchema();