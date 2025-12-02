// Complete user deletion script
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Database connection
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function deleteUserCompletely(userId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`Starting complete deletion of user ID: ${userId}`);
    
    // Get user info first
    const userResult = await client.query('SELECT username, full_name, email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      console.log(`User with ID ${userId} not found`);
      return false;
    }
    
    const user = userResult.rows[0];
    console.log(`Deleting user: ${user.username} (${user.full_name}, ${user.email})`);
    
    // Delete from all related tables in correct order
    const deletionOrder = [
      'driver_registration_progress',
      'driver_payouts',
      'ride_edits',
      'bids',
      'notifications',
      'chat_messages',
      'driver_details',
      'vehicles',
      'saved_locations',
      'rides',
      'admin_audit_log',
      'driver_permissions',
      'admin_overrides',
      'promo_code_usage',
      'users'
    ];
    
    let deletedRecords = 0;
    
    for (const table of deletionOrder) {
      try {
        let result;
        
        // Handle different user ID field names
        if (table === 'rides') {
          result = await client.query(`DELETE FROM ${table} WHERE rider_id = $1 OR driver_id = $1`, [userId]);
        } else if (table === 'bids') {
          result = await client.query(`DELETE FROM ${table} WHERE driver_id = $1 OR rider_id = $1`, [userId]);
        } else if (table === 'chat_messages') {
          result = await client.query(`DELETE FROM ${table} WHERE sender_id = $1 OR receiver_id = $1`, [userId]);
        } else if (table === 'driver_details') {
          result = await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
        } else if (table === 'vehicles') {
          result = await client.query(`DELETE FROM ${table} WHERE driver_id = $1`, [userId]);
        } else if (table === 'saved_locations') {
          result = await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
        } else if (table === 'admin_audit_log') {
          result = await client.query(`DELETE FROM ${table} WHERE admin_id = $1 OR target_id = $1`, [userId]);
        } else if (table === 'driver_permissions') {
          result = await client.query(`DELETE FROM ${table} WHERE driver_id = $1`, [userId]);
        } else if (table === 'admin_overrides') {
          result = await client.query(`DELETE FROM ${table} WHERE admin_id = $1 OR target_id = $1`, [userId]);
        } else if (table === 'promo_code_usage') {
          result = await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
        } else if (table === 'driver_registration_progress') {
          result = await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
        } else if (table === 'driver_payouts') {
          result = await client.query(`DELETE FROM ${table} WHERE driver_id = $1`, [userId]);
        } else if (table === 'ride_edits') {
          result = await client.query(`DELETE FROM ${table} WHERE rider_id = $1 OR driver_id = $1`, [userId]);
        } else {
          // Default to user_id field
          result = await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
        }
        
        if (result.rowCount > 0) {
          console.log(`Deleted ${result.rowCount} records from ${table}`);
          deletedRecords += result.rowCount;
        }
      } catch (error) {
        console.log(`Note: Table ${table} might not exist or have no records for user ${userId}`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`✅ User ${user.username} completely deleted from database`);
    console.log(`Total records deleted: ${deletedRecords}`);
    console.log(`Email ${user.email} is now available for reuse`);
    
    return true;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during user deletion:', error);
    return false;
  } finally {
    client.release();
  }
}

// Execute the deletion
const userId = 60; // Steve Campbell (check212@gmail.com)
deleteUserCompletely(userId).then(success => {
  if (success) {
    console.log('User deletion completed successfully');
  } else {
    console.log('User deletion failed');
  }
  process.exit(0);
});