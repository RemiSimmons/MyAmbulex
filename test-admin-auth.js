import { storage } from './server/storage.js';

async function testAdminDocuments() {
    console.log('=== TESTING ADMIN DOCUMENTS API FLOW ===');
    
    // Using the exported storage instance
    
    try {
        // Test the exact same method call as the admin documents route
        console.log('1. Testing getDriverDetailsByUserId(59)...');
        const driverDetails = await storage.getDriverDetailsByUserId(59);
        
        console.log('Result:', !!driverDetails);
        
        if (driverDetails) {
            console.log('✅ Driver details found successfully!');
            console.log('Driver ID:', driverDetails.id);
            console.log('User ID:', driverDetails.userId);
            console.log('License Front:', driverDetails.licensePhotoFront);
            console.log('License Back:', driverDetails.licensePhotoBack);
            console.log('Insurance:', driverDetails.insuranceDocumentUrl);
            console.log('Profile:', driverDetails.profilePhoto);
            console.log('Vehicle Registration:', driverDetails.vehicleRegistrationUrl);
            console.log('Medical Certification:', driverDetails.medicalCertificationUrl);
            console.log('Background Check:', driverDetails.backgroundCheckDocumentUrl);
            console.log('Drug Test:', driverDetails.drugTestResultsUrl);
            console.log('MVR Record:', driverDetails.mvrRecordUrl);
        } else {
            console.log('❌ No driver details found');
        }
        
        console.log('\n2. Testing user lookup...');
        const user = await storage.getUser('59');
        console.log('User found:', !!user);
        if (user) {
            console.log('User role:', user.role);
            console.log('User name:', user.fullName);
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

testAdminDocuments().catch(console.error);