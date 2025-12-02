
import { Pool } from '@neondatabase/serverless';

async function clearBetaData() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Starting beta data cleanup...');

    // Start transaction
    await pool.query('BEGIN');

    // Get count of data before deletion
    const userCountResult = await pool.query(`
      SELECT 
        COUNT(CASE WHEN role = 'rider' THEN 1 END) as rider_count,
        COUNT(CASE WHEN role = 'driver' THEN 1 END) as driver_count,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count
      FROM users
    `);
    
    const rideCountResult = await pool.query('SELECT COUNT(*) as ride_count FROM rides');
    const bidCountResult = await pool.query('SELECT COUNT(*) as bid_count FROM bids');

    console.log('Current data counts:');
    console.log(`- Riders: ${userCountResult.rows[0].rider_count}`);
    console.log(`- Drivers: ${userCountResult.rows[0].driver_count}`);
    console.log(`- Admins: ${userCountResult.rows[0].admin_count} (will be preserved)`);
    console.log(`- Rides: ${rideCountResult.rows[0].ride_count}`);
    console.log(`- Bids: ${bidCountResult.rows[0].bid_count}`);

    // Delete in correct order to respect foreign key constraints
    console.log('\nDeleting data...');

    // 1. Delete bids first (references rides and users)
    const deletedBids = await pool.query('DELETE FROM bids RETURNING id');
    console.log(`Deleted ${deletedBids.rowCount} bids`);

    // 2. Delete rides (references users)
    const deletedRides = await pool.query('DELETE FROM rides RETURNING id');
    console.log(`Deleted ${deletedRides.rowCount} rides`);

    // 3. Delete chat messages (references users)
    const deletedMessages = await pool.query('DELETE FROM chat_messages RETURNING id');
    console.log(`Deleted ${deletedMessages.rowCount} chat messages`);

    // 4. Delete notifications for riders and drivers
    const deletedNotifications = await pool.query(`
      DELETE FROM notifications 
      WHERE user_id IN (
        SELECT id FROM users WHERE role IN ('rider', 'driver')
      ) 
      RETURNING id
    `);
    console.log(`Deleted ${deletedNotifications.rowCount} notifications`);

    // 5. Delete driver-related data
    const deletedDriverDetails = await pool.query(`
      DELETE FROM driver_details 
      WHERE user_id IN (
        SELECT id FROM users WHERE role = 'driver'
      ) 
      RETURNING id
    `);
    console.log(`Deleted ${deletedDriverDetails.rowCount} driver details`);

    const deletedVehicles = await pool.query(`
      DELETE FROM vehicles 
      WHERE driver_id IN (
        SELECT id FROM users WHERE role = 'driver'
      ) 
      RETURNING id
    `);
    console.log(`Deleted ${deletedVehicles.rowCount} vehicles`);

    const deletedAvailability = await pool.query(`
      DELETE FROM driver_availability 
      WHERE driver_id IN (
        SELECT id FROM users WHERE role = 'driver'
      ) 
      RETURNING id
    `);
    console.log(`Deleted ${deletedAvailability.rowCount} availability records`);

    // 6. Delete rider-related data
    const deletedAddresses = await pool.query(`
      DELETE FROM saved_addresses 
      WHERE user_id IN (
        SELECT id FROM users WHERE role = 'rider'
      ) 
      RETURNING id
    `);
    console.log(`Deleted ${deletedAddresses.rowCount} saved addresses`);

    const deletedRecurring = await pool.query(`
      DELETE FROM recurring_appointments 
      WHERE rider_id IN (
        SELECT id FROM users WHERE role = 'rider'
      ) 
      RETURNING id
    `);
    console.log(`Deleted ${deletedRecurring.rowCount} recurring appointments`);

    // 7. Finally delete riders and drivers (preserve admins)
    const deletedUsers = await pool.query(`
      DELETE FROM users 
      WHERE role IN ('rider', 'driver') 
      RETURNING id, role, username
    `);
    console.log(`Deleted ${deletedUsers.rowCount} users (riders and drivers)`);

    // Commit transaction
    await pool.query('COMMIT');

    console.log('\n✅ Beta data cleanup completed successfully!');
    console.log('Admin accounts have been preserved.');
    console.log('Database is now ready for fresh beta testing.');

    // Show final counts
    const finalCountResult = await pool.query(`
      SELECT 
        COUNT(CASE WHEN role = 'rider' THEN 1 END) as rider_count,
        COUNT(CASE WHEN role = 'driver' THEN 1 END) as driver_count,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count
      FROM users
    `);
    
    console.log('\nFinal data counts:');
    console.log(`- Riders: ${finalCountResult.rows[0].rider_count}`);
    console.log(`- Drivers: ${finalCountResult.rows[0].driver_count}`);
    console.log(`- Admins: ${finalCountResult.rows[0].admin_count}`);

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error during beta data cleanup:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the cleanup
clearBetaData()
  .then(() => {
    console.log('\n🎉 Ready to start beta testing!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Beta cleanup failed:', error);
    process.exit(1);
  });
