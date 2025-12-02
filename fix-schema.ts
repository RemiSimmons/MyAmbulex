// Script to fix the isRoundTrip column issue
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from './shared/schema';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';

// Configure Neon for serverless environment without WebSocket
neonConfig.fetchConnectionCache = true;

async function fixSchema() {
  try {
    // Connect to the database
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    
    console.log('Connected to database, checking schema...');
    
    // First, let's check if the column already exists in the database
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rides' 
      AND column_name = 'isroundtrip'
    `);
    
    // Check and add all required round trip columns
    const missingColumns = [];
    
    // Check for isRoundTrip column
    if (result.rows.length === 0) {
      missingColumns.push('"isRoundTrip" BOOLEAN DEFAULT false');
    }
    
    // Check for other round trip related columns
    const checkReturnTimeResult = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'rides' AND column_name = 'return_time'
    `);
    if (checkReturnTimeResult.rows.length === 0) {
      missingColumns.push('"return_time" TIMESTAMP');
    }
    
    const checkReturnPickupLocationResult = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'rides' AND column_name = 'return_pickup_location'
    `);
    if (checkReturnPickupLocationResult.rows.length === 0) {
      missingColumns.push('"return_pickup_location" TEXT');
    }
    
    const checkReturnDropoffLocationResult = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'rides' AND column_name = 'return_dropoff_location'
    `);
    if (checkReturnDropoffLocationResult.rows.length === 0) {
      missingColumns.push('"return_dropoff_location" TEXT');
    }
    
    const checkReturnPickupLatResult = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'rides' AND column_name = 'return_pickup_location_lat'
    `);
    if (checkReturnPickupLatResult.rows.length === 0) {
      missingColumns.push('"return_pickup_location_lat" DOUBLE PRECISION');
    }
    
    const checkReturnPickupLngResult = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'rides' AND column_name = 'return_pickup_location_lng'
    `);
    if (checkReturnPickupLngResult.rows.length === 0) {
      missingColumns.push('"return_pickup_location_lng" DOUBLE PRECISION');
    }
    
    const checkReturnDropoffLatResult = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'rides' AND column_name = 'return_dropoff_location_lat'
    `);
    if (checkReturnDropoffLatResult.rows.length === 0) {
      missingColumns.push('"return_dropoff_location_lat" DOUBLE PRECISION');
    }
    
    const checkReturnDropoffLngResult = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'rides' AND column_name = 'return_dropoff_location_lng'
    `);
    if (checkReturnDropoffLngResult.rows.length === 0) {
      missingColumns.push('"return_dropoff_location_lng" DOUBLE PRECISION');
    }
    
    const checkReturnEstDistanceResult = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'rides' AND column_name = 'return_estimated_distance'
    `);
    if (checkReturnEstDistanceResult.rows.length === 0) {
      missingColumns.push('"return_estimated_distance" DOUBLE PRECISION');
    }
    
    // Add all missing columns
    if (missingColumns.length > 0) {
      console.log(`Adding ${missingColumns.length} missing columns to rides table...`);
      
      for (const columnDef of missingColumns) {
        try {
          await pool.query(`ALTER TABLE rides ADD COLUMN ${columnDef}`);
          console.log(`Added column: ${columnDef}`);
        } catch (error) {
          if (error.code === '42701') { // Duplicate column
            console.log(`Column already exists: ${columnDef}`);
          } else {
            console.error(`Error adding column ${columnDef}:`, error);
          }
        }
      }
      
      console.log('Finished adding columns to the rides table!');
    } else {
      console.log('All required round trip columns already exist in the database.');
    }
    
    // Print out the current schema
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'rides'
      ORDER BY ordinal_position
    `);
    
    console.log('\nCurrent rides table schema:');
    columnsResult.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });
    
    await pool.end();
    console.log('Schema update completed.');
    
  } catch (error) {
    console.error('Error fixing schema:', error);
  }
}

fixSchema();