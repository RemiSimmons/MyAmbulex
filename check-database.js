import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : undefined,
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking database for users...\n');

    // Check total users
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`📊 Total users: ${totalUsers.rows[0].count}`);

    // Check users by role
    const usersByRole = await pool.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
      ORDER BY role
    `);
    console.log('\n👥 Users by role:');
    usersByRole.rows.forEach(row => {
      console.log(`   ${row.role}: ${row.count}`);
    });

    // Get all drivers
    const drivers = await pool.query(`
      SELECT id, username, email, full_name, role, account_status, created_at
      FROM users
      WHERE role = 'driver'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`\n🚗 Drivers (showing up to 10):`);
    if (drivers.rows.length === 0) {
      console.log('   No drivers found');
    } else {
      drivers.rows.forEach((driver, index) => {
        console.log(`   ${index + 1}. ${driver.username} (${driver.email}) - Status: ${driver.account_status}`);
      });
    }

    // Get all riders
    const riders = await pool.query(`
      SELECT id, username, email, full_name, role, account_status, created_at
      FROM users
      WHERE role = 'rider'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`\n👤 Riders (showing up to 10):`);
    if (riders.rows.length === 0) {
      console.log('   No riders found');
    } else {
      riders.rows.forEach((rider, index) => {
        console.log(`   ${index + 1}. ${rider.username} (${rider.email}) - Status: ${rider.account_status}`);
      });
    }

    // Get admin users
    const admins = await pool.query(`
      SELECT id, username, email, full_name, role, account_status, created_at
      FROM users
      WHERE role = 'admin'
      ORDER BY created_at DESC
    `);
    
    console.log(`\n👑 Admins:`);
    if (admins.rows.length === 0) {
      console.log('   No admins found');
    } else {
      admins.rows.forEach((admin, index) => {
        console.log(`   ${index + 1}. ${admin.username} (${admin.email}) - Status: ${admin.account_status}`);
      });
    }

    // Check rides
    const rides = await pool.query('SELECT COUNT(*) as count FROM rides');
    console.log(`\n🚑 Total rides: ${rides.rows[0].count}`);

    // Check bids
    const bids = await pool.query('SELECT COUNT(*) as count FROM bids');
    console.log(`💰 Total bids: ${bids.rows[0].count}`);

    console.log('\n✅ Database check complete!');

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase();

