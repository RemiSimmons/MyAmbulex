import { Storage } from './server/storage.js';

async function testDriverDetails() {
  console.log('Testing getDriverDetailsByUserId...');
  
  const storage = new Storage();
  
  try {
    // Test the method with user ID 59
    const driverDetails = await storage.getDriverDetailsByUserId(59);
    console.log(`Result: ${!!driverDetails}`);
    
    if (driverDetails) {
      console.log('Driver details found:');
      console.log(`- ID: ${driverDetails.id}`);
      console.log(`- User ID: ${driverDetails.userId}`);
      console.log(`- License Front: ${driverDetails.licensePhotoFront}`);
      console.log(`- License Back: ${driverDetails.licensePhotoBack}`);
      console.log(`- Insurance: ${driverDetails.insuranceDocumentUrl}`);
      console.log(`- Profile: ${driverDetails.profilePhoto}`);
    } else {
      console.log('No driver details found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testDriverDetails();