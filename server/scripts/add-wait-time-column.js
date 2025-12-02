#!/usr/bin/env node

import { pool } from '../db.js';

async function addWaitTimeColumn() {
  try {
    console.log('Adding wait_time_minutes column to rides table...');
    
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Check if column already exists
      const checkResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'rides' 
        AND column_name = 'wait_time_minutes'
      `);
      
      if (checkResult.rows.length === 0) {
        // Column doesn't exist, add it
        await client.query(`
          ALTER TABLE rides 
          ADD COLUMN wait_time_minutes INTEGER DEFAULT 0
        `);
        console.log('Successfully added wait_time_minutes column');
      } else {
        console.log('wait_time_minutes column already exists');
      }
    } finally {
      client.release();
    }
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addWaitTimeColumn();