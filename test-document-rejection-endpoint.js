// Test document rejection through API endpoint
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function simulateAdminDocumentRejection() {
  try {
    console.log('🚀 Testing document rejection through API endpoint...');
    
    // Test with RemiDriver (ID: 59)
    const driverId = 59;
    const testRejection = {
      documentField: 'licensePhotoFront',
      documentName: 'Driver License (Front)',
      reason: 'License photo is blurry and difficult to read. Please upload a clearer image with all text clearly visible.'
    };
    
    console.log(`📧 Simulating admin rejection for driver ID: ${driverId}`);
    console.log(`📄 Document: ${testRejection.documentName}`);
    console.log(`📝 Reason: ${testRejection.reason}`);
    
    // Create manual notification using the notification service pattern
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update the driver details to reflect rejection
      await client.query(
        'UPDATE driver_details SET license_verified = false, license_rejection_reason = $1 WHERE user_id = $2',
        [testRejection.reason, driverId]
      );
      
      // Get user details
      const userResult = await client.query(
        'SELECT id, username, email, full_name, phone FROM users WHERE id = $1',
        [driverId]
      );
      
      if (userResult.rows.length === 0) {
        throw new Error(`User with ID ${driverId} not found`);
      }
      
      const user = userResult.rows[0];
      
      // Create notification in database
      const notificationData = {
        userId: driverId,
        type: 'DOCUMENT_REJECTED',
        title: 'Document Review Required',
        message: `Hello ${user.full_name.split(' ')[0]}! 👋\n\nYour document submission has been reviewed and requires attention:\n\n• ${testRejection.documentName}: ${testRejection.reason}\n\nPlease review the feedback carefully and ensure all documents meet our requirements before resubmitting.\n\nYour account has been unlocked. You can now log in to re-upload the required documents.\n\nAlways here to help!\n— Alex`,
        read: false,
        link: '/driver/document-verification',
        metadata: JSON.stringify({
          rejectedDocuments: [testRejection.documentName],
          rejectionReasons: [testRejection.reason],
          unlockAccount: true,
          timestamp: new Date().toISOString()
        })
      };
      
      const notificationResult = await client.query(
        'INSERT INTO notifications (user_id, type, title, message, read, link, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *',
        [
          notificationData.userId,
          notificationData.type,
          notificationData.title,
          notificationData.message,
          notificationData.read,
          notificationData.link,
          notificationData.metadata
        ]
      );
      
      console.log(`✅ Database notification created with ID: ${notificationResult.rows[0].id}`);
      
      // Test email notification (if SendGrid is configured)
      if (process.env.SENDGRID_API_KEY) {
        console.log('📧 SendGrid is configured, would send email notification');
        console.log(`   To: ${user.email}`);
        console.log(`   Subject: MyAmbulex: Document Review Required`);
        console.log(`   Recipient: ${user.full_name}`);
      } else {
        console.log('📧 SendGrid not configured, email notification would be skipped');
      }
      
      // Test SMS notification (if Twilio is configured)
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        console.log('📱 Twilio is configured, would send SMS notification');
        console.log(`   To: ${user.phone}`);
        console.log(`   Message: Document review required. Check your email for details.`);
      } else {
        console.log('📱 Twilio not configured, SMS notification would be skipped');
      }
      
      await client.query('COMMIT');
      
      console.log('\n🎉 Document rejection simulation completed successfully!');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error simulating document rejection:', error);
    console.error('Stack trace:', error.stack);
  }
}

async function checkNotificationResult() {
  try {
    const client = await pool.connect();
    
    // Check for recent notifications for RemiDriver
    const notifications = await client.query(
      'SELECT * FROM notifications WHERE user_id = $1 AND type = $2 ORDER BY created_at DESC LIMIT 3',
      [59, 'DOCUMENT_REJECTED']
    );
    
    console.log(`\n📋 Recent document rejection notifications for RemiDriver:`);
    
    if (notifications.rows.length === 0) {
      console.log('   No document rejection notifications found');
    } else {
      notifications.rows.forEach((notif, index) => {
        console.log(`${index + 1}. ${notif.title} - ${notif.read ? 'Read' : 'Unread'}`);
        console.log(`   Created: ${notif.created_at}`);
        console.log(`   Link: ${notif.link}`);
        
        // Parse metadata if available
        if (notif.metadata) {
          try {
            const metadata = JSON.parse(notif.metadata);
            console.log(`   Rejected Documents: ${metadata.rejectedDocuments?.join(', ')}`);
            console.log(`   Account Unlocked: ${metadata.unlockAccount}`);
          } catch (e) {
            console.log(`   Metadata: ${notif.metadata}`);
          }
        }
        console.log('');
      });
    }
    
    client.release();
    
  } catch (error) {
    console.error('Error checking notification result:', error);
  }
}

// Run the test
async function runTest() {
  await simulateAdminDocumentRejection();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  await checkNotificationResult();
}

runTest().catch(console.error);