// Test admin document rejection with notification system
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testAdminDocumentRejection() {
  try {
    console.log('🚀 Testing admin document rejection notification system...');
    
    // Test with RemiDriver (ID: 59)
    const driverId = 59;
    const testDocuments = [
      { field: 'licensePhotoFront', name: 'Driver License (Front)', reason: 'License photo is blurry and difficult to read. Please upload a clearer image with all text clearly visible.' },
      { field: 'insuranceDocumentUrl', name: 'Insurance Document', reason: 'Insurance document is expired. Please upload a current insurance certificate.' },
      { field: 'medicalCertificationUrl', name: 'Medical Certification', reason: 'Medical certification has expired. Please upload a current medical certificate from a certified provider.' }
    ];
    
    console.log(`📧 Testing document rejection for driver ID: ${driverId}`);
    
    // Simulate admin document rejection by directly updating the database
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Test rejecting license document
      const licenseUpdate = await client.query(
        'UPDATE driver_details SET license_verified = false, license_rejection_reason = $1 WHERE user_id = $2 RETURNING *',
        [testDocuments[0].reason, driverId]
      );
      
      console.log(`✅ License document rejected for driver ${driverId}`);
      
      // Test rejecting insurance document
      const insuranceUpdate = await client.query(
        'UPDATE driver_details SET insurance_verified = false, insurance_rejection_reason = $1 WHERE user_id = $2 RETURNING *',
        [testDocuments[1].reason, driverId]
      );
      
      console.log(`✅ Insurance document rejected for driver ${driverId}`);
      
      // Test rejecting medical certification
      const medicalUpdate = await client.query(
        'UPDATE driver_details SET medical_certification_verified = false, medical_certification_rejection_reason = $1 WHERE user_id = $2 RETURNING *',
        [testDocuments[2].reason, driverId]
      );
      
      console.log(`✅ Medical certification rejected for driver ${driverId}`);
      
      // Get user details to verify
      const userResult = await client.query(
        'SELECT id, username, email, full_name, phone FROM users WHERE id = $1',
        [driverId]
      );
      
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        console.log(`📧 User details for notification:`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Full Name: ${user.full_name}`);
        console.log(`   Phone: ${user.phone}`);
      }
      
      await client.query('COMMIT');
      
      console.log('\n🎉 Document rejection database updates completed successfully!');
      console.log('📧 Email notifications should be sent automatically by the system');
      console.log('📱 SMS notifications should be sent automatically by the system');
      console.log('🔔 Platform notifications should be created in the database');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error testing admin document rejection:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Check notifications in database
async function checkNotifications() {
  try {
    const client = await pool.connect();
    
    // Check for recent notifications for RemiDriver
    const notifications = await client.query(
      'SELECT * FROM notifications WHERE user_id = $1 AND type = $2 ORDER BY created_at DESC LIMIT 5',
      [59, 'DOCUMENT_REJECTED']
    );
    
    console.log(`\n📋 Recent document rejection notifications for driver 59:`);
    notifications.rows.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.title} - ${notif.read ? 'Read' : 'Unread'}`);
      console.log(`   Message: ${notif.message.substring(0, 100)}...`);
      console.log(`   Created: ${notif.created_at}`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('Error checking notifications:', error);
  }
}

// Run the test
async function runTest() {
  await testAdminDocumentRejection();
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
  await checkNotifications();
}

runTest().catch(console.error);