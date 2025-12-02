// Test document rejection notification system
import { createRequire } from 'module';
import { notificationService } from './server/notifications.js';

const require = createRequire(import.meta.url);

async function testDocumentRejectionNotification() {
  try {
    console.log('🚀 Testing document rejection notification system...');
    
    // Test with RemiDriver (ID: 59)
    const driverId = 59;
    const rejectedDocuments = ['Driver License (Front)', 'Insurance Document'];
    const rejectionReasons = [
      'License photo is blurry and difficult to read. Please upload a clearer image with all text clearly visible.',
      'Insurance document is expired. Please upload a current insurance certificate.'
    ];
    
    console.log(`📧 Sending document rejection notification to driver ID: ${driverId}`);
    console.log(`📄 Rejected documents: ${rejectedDocuments.join(', ')}`);
    console.log(`📝 Rejection reasons: ${rejectionReasons.join(' | ')}`);
    
    // Send the notification
    const result = await notificationService.sendDocumentRejectionNotification(
      driverId,
      rejectedDocuments,
      rejectionReasons,
      true // unlock account
    );
    
    if (result) {
      console.log('✅ Document rejection notification sent successfully!');
      console.log('📧 Email notification sent to driver');
      console.log('📱 SMS notification sent to driver');
      console.log('🔔 Platform notification created in database');
    } else {
      console.log('❌ Failed to send document rejection notification');
    }
    
    // Test with a different document type
    console.log('\n🚀 Testing single document rejection...');
    
    const singleRejectionResult = await notificationService.sendDocumentRejectionNotification(
      driverId,
      ['Medical Certification'],
      ['Medical certification has expired. Please upload a current medical certificate from a certified provider.'],
      true
    );
    
    if (singleRejectionResult) {
      console.log('✅ Single document rejection notification sent successfully!');
    } else {
      console.log('❌ Failed to send single document rejection notification');
    }
    
    console.log('\n🎉 Document rejection notification test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing document rejection notification:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testDocumentRejectionNotification();