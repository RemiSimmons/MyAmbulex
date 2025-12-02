// Script to fix the isRoundTrip column issue
import { Pool } from '@neondatabase/serverless';

async function fixSchema() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // First check if the column exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rides' 
      AND column_name = 'isroundtrip'
    `);
    
    if (checkResult.rows.length === 0) {
      // Column doesn't exist, add it
      console.log('Adding isRoundTrip column to rides table...');
      await pool.query(`
        ALTER TABLE rides 
        ADD COLUMN "isRoundTrip" BOOLEAN DEFAULT false
      `);
      console.log('Column added successfully!');
    } else {
      console.log('The isRoundTrip column already exists.');
    }

    // Display the current schema for verification
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
    
  } catch (error) {
    console.error('Error fixing schema:', error);
  } finally {
    await pool.end();
  }
}

fixSchema();