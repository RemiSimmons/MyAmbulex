const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test user data with all required fields
const TEST_USER = {
  username: 'legaltest' + Math.random().toString(36).substring(7),
  email: 'legaltest' + Math.random().toString(36).substring(7) + '@test.com',
  password: 'testpass123',
  role: 'rider',
  fullName: 'Legal Test User',
  phone: '+15551234567'
};

let cookies = '';

async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { status: response.status, data: response.data, headers: response.headers };
  } catch (error) {
    return { 
      status: error.response?.status || 500, 
      data: error.response?.data || { error: error.message },
      headers: error.response?.headers || {}
    };
  }
}

async function testComprehensiveLegalSystem() {
  console.log('🏥 Testing Comprehensive Legal Agreement System\n');
  
  try {
    // Step 1: Register test user
    console.log('1. Registering test user...');
    const registerResponse = await makeRequest('POST', '/api/register', TEST_USER);
    
    if (registerResponse.status !== 201) {
      console.log('❌ Registration failed:', registerResponse.data);
      return;
    }
    
    if (registerResponse.headers['set-cookie']) {
      cookies = registerResponse.headers['set-cookie'].join('; ');
    }
    
    console.log('✅ User registered successfully');

    // Step 1.5: Login to get authenticated session
    console.log('\n1.5. Logging in to get authenticated session...');
    const loginResponse = await makeRequest('POST', '/api/login', {
      username: TEST_USER.username,
      password: TEST_USER.password
    });
    
    if (loginResponse.status !== 200) {
      console.log('❌ Login failed:', loginResponse.data);
      return;
    }
    
    if (loginResponse.headers['set-cookie']) {
      cookies = loginResponse.headers['set-cookie'].join('; ');
    }
    
    console.log('✅ Login successful, session authenticated');

    // Step 2: Check legal document downloads
    console.log('\n2. Testing legal document downloads...');
    
    const platformAgreementResponse = await makeRequest('GET', '/api/legal/download/platform-user-agreement');
    const privacyPolicyResponse = await makeRequest('GET', '/api/legal/download/privacy-policy');
    
    console.log('📋 Platform User Agreement:', platformAgreementResponse.status === 200 ? '✅ Available' : '❌ Not found');
    console.log('🔒 Privacy Policy:', privacyPolicyResponse.status === 200 ? '✅ Available' : '❌ Not found');

    // Step 3: Check required documents for user
    console.log('\n3. Checking required documents...');
    const requiredDocsResponse = await makeRequest('GET', '/api/legal-agreements/required-documents');
    
    if (requiredDocsResponse.status === 200) {
      console.log('✅ Required documents retrieved:', requiredDocsResponse.data.requiredDocuments);
    } else {
      console.log('❌ Failed to get required documents:', requiredDocsResponse.data);
    }

    // Step 4: Check completion status (should be incomplete)
    console.log('\n4. Checking initial completion status...');
    const initialStatusResponse = await makeRequest('GET', '/api/legal-agreements/completion-status');
    
    if (initialStatusResponse.status === 200) {
      console.log('📊 Initial status:', {
        isComplete: initialStatusResponse.data.isComplete,
        missingDocuments: initialStatusResponse.data.missingDocuments.length
      });
    }

    // Step 5: Try booking ride without agreements (should fail)
    console.log('\n5. Testing ride booking without legal agreements...');
    const unauthorizedRideResponse = await makeRequest('POST', '/api/rides', {
      pickup: { address: 'Test Pickup', lat: 33.7490, lng: -84.3880 },
      destination: { address: 'Test Destination', lat: 33.7590, lng: -84.3780 },
      rideType: 'one-way',
      accessibilityOptions: [],
      urgency: 'standard'
    });
    
    if (unauthorizedRideResponse.status === 403 && unauthorizedRideResponse.data.code === 'LEGAL_AGREEMENTS_REQUIRED') {
      console.log('✅ Ride booking correctly blocked - legal agreements required');
    } else {
      console.log('❌ Ride booking should have been blocked');
    }

    // Step 6: Sign Platform User Agreement
    console.log('\n6. Signing Platform User Agreement...');
    const platformSignResponse = await makeRequest('POST', '/api/legal-agreements/sign', {
      documentType: 'platform_user_agreement',
      documentVersion: '2025.1',
      isRequired: true,
      isActive: true
    });
    
    if (platformSignResponse.status === 200) {
      console.log('✅ Platform User Agreement signed successfully');
    } else {
      console.log('❌ Failed to sign Platform User Agreement:', platformSignResponse.data);
    }

    // Step 7: Sign Privacy Policy
    console.log('\n7. Signing Privacy Policy...');
    const privacySignResponse = await makeRequest('POST', '/api/legal-agreements/sign', {
      documentType: 'privacy_policy',
      documentVersion: '2025.1',
      isRequired: true,
      isActive: true
    });
    
    if (privacySignResponse.status === 200) {
      console.log('✅ Privacy Policy signed successfully');
    } else {
      console.log('❌ Failed to sign Privacy Policy:', privacySignResponse.data);
    }

    // Step 8: Check completion status after signing
    console.log('\n8. Checking completion status after signing...');
    const finalStatusResponse = await makeRequest('GET', '/api/legal-agreements/completion-status');
    
    if (finalStatusResponse.status === 200) {
      console.log('📊 Final status:', {
        isComplete: finalStatusResponse.data.isComplete,
        signedDocuments: finalStatusResponse.data.signedDocuments.length,
        missingDocuments: finalStatusResponse.data.missingDocuments.length
      });
      
      if (finalStatusResponse.data.isComplete) {
        console.log('🎉 All required legal agreements completed!');
      }
    }

    // Step 9: Try booking ride after signing agreements
    console.log('\n9. Testing ride booking after signing legal agreements...');
    const authorizedRideResponse = await makeRequest('POST', '/api/rides', {
      pickup: { address: 'Test Pickup', lat: 33.7490, lng: -84.3880 },
      destination: { address: 'Test Destination', lat: 33.7590, lng: -84.3780 },
      rideType: 'one-way',
      accessibilityOptions: [],
      urgency: 'standard'
    });
    
    if (authorizedRideResponse.status === 201) {
      console.log('✅ Ride booking successful after signing legal agreements');
      console.log('🚗 Ride ID:', authorizedRideResponse.data.id);
    } else {
      console.log('❌ Ride booking failed:', authorizedRideResponse.data);
    }

    console.log('\n🏆 Comprehensive legal agreement system test completed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testComprehensiveLegalSystem();