// Test document rejection notification system
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createTestDriver() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create test user
    const testUser = {
      username: 'testdriver123',
      email: 'testdriver123@example.com',
      password: 'hashed_password',
      fullName: 'Test Driver',
      phone: '+1234567890',
      role: 'driver',
      status: 'active'
    };
    
    const userResult = await client.query(
      'INSERT INTO users (username, email, password, full_name, phone, role, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [testUser.username, testUser.email, testUser.password, testUser.fullName, testUser.phone, testUser.role, testUser.status]
    );
    
    const userId = userResult.rows[0].id;
    console.log(`Created test user with ID: ${userId}`);
    
    // Create driver details
    const driverDetails = {
      userId: userId,
      licenseNumber: 'TEST123456',
      licensePhotoFront: 'test-license-front.jpg',
      licensePhotoBack: 'test-license-back.jpg',
      insuranceDocumentUrl: 'test-insurance.pdf',
      vehicleRegistrationUrl: 'test-vehicle-reg.pdf',
      medicalCertificationUrl: 'test-medical-cert.pdf',
      backgroundCheckDocumentUrl: 'test-background-check.pdf',
      drugTestResultsUrl: 'test-drug-test.pdf',
      mvrRecordUrl: 'test-mvr-record.pdf',
      profilePhoto: 'test-profile-photo.jpg'
    };
    
    const driverResult = await client.query(
      `INSERT INTO driver_details (
        user_id, license_number, license_photo_front, license_photo_back, 
        insurance_document_url, vehicle_registration_url, medical_certification_url,
        background_check_document_url, drug_test_results_url, mvr_record_url, profile_photo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        driverDetails.userId, driverDetails.licenseNumber, driverDetails.licensePhotoFront,
        driverDetails.licensePhotoBack, driverDetails.insuranceDocumentUrl, driverDetails.vehicleRegistrationUrl,
        driverDetails.medicalCertificationUrl, driverDetails.backgroundCheckDocumentUrl,
        driverDetails.drugTestResultsUrl, driverDetails.mvrRecordUrl, driverDetails.profilePhoto
      ]
    );
    
    await client.query('COMMIT');
    
    console.log(`✅ Test driver created successfully:`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Username: ${testUser.username}`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Driver Details ID: ${driverResult.rows[0].id}`);
    
    return { userId, driverDetailsId: driverResult.rows[0].id };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating test driver:', error);
    return null;
  } finally {
    client.release();
  }
}

async function testDocumentRejection(userId) {
  console.log('\n📧 Testing document rejection notification...');
  
  try {
    // Simulate document rejection API call
    const response = await fetch(`http://localhost:5000/api/admin/documents/${userId}/licensePhotoFront/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'myambulex.sid=test-admin-session' // Would need real admin session
      },
      body: JSON.stringify({
        verified: false,
        notes: 'License photo is blurry and difficult to read. Please upload a clearer image with all text clearly visible.'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Document rejection processed:', result);
    } else {
      console.log('❌ Document rejection failed:', response.status, response.statusText);
    }
    
  } catch (error) {
    console.error('Error testing document rejection:', error);
  }
}

async function cleanupTestDriver(userId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    await client.query('DELETE FROM driver_details WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    
    await client.query('COMMIT');
    console.log(`🧹 Cleaned up test driver with ID: ${userId}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cleaning up test driver:', error);
  } finally {
    client.release();
  }
}

// Main test execution
async function runTest() {
  console.log('🚀 Starting document rejection notification test...');
  
  const testDriver = await createTestDriver();
  if (!testDriver) {
    console.log('❌ Failed to create test driver');
    return;
  }
  
  // Test document rejection
  await testDocumentRejection(testDriver.userId);
  
  // Wait a bit for notification to be sent
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Cleanup
  await cleanupTestDriver(testDriver.userId);
  
  console.log('✅ Test completed');
}

runTest().catch(console.error);