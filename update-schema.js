import { Pool } from '@neondatabase/serverless';

// Create a database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('Applying schema changes to database...');
  try {
    // Add the new columns to user_profiles table
    await pool.query(`
      ALTER TABLE user_profiles 
      ADD COLUMN IF NOT EXISTS account_holder_name TEXT,
      ADD COLUMN IF NOT EXISTS account_type TEXT,
      ADD COLUMN IF NOT EXISTS bank_name TEXT,
      ADD COLUMN IF NOT EXISTS routing_number TEXT,
      ADD COLUMN IF NOT EXISTS account_number TEXT,
      ADD COLUMN IF NOT EXISTS billing_address TEXT,
      ADD COLUMN IF NOT EXISTS billing_city TEXT,
      ADD COLUMN IF NOT EXISTS billing_state TEXT,
      ADD COLUMN IF NOT EXISTS billing_zip_code TEXT,
      ADD COLUMN IF NOT EXISTS payment_preference TEXT
    `);
    
    console.log('Schema changes applied successfully!');
  } catch (error) {
    console.error('Error applying schema changes:', error);
  } finally {
    await pool.end();
  }
}

main();