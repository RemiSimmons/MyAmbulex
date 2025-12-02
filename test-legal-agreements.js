// Test legal agreement enforcement system
import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';

// Test user credentials
const TEST_USER = {
  username: 'testuser',
  password: 'testpass123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  phoneNumber: '1234567890',
  role: 'rider'
};

// Test ride data
const TEST_RIDE = {
  pickupLocation: {
    address: '123 Test Street, Atlanta, GA',
    coordinates: { lat: 33.7490, lng: -84.3880 }
  },
  dropoffLocation: {
    address: '456 Test Avenue, Atlanta, GA',
    coordinates: { lat: 33.7590, lng: -84.3780 }
  },
  scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  needsRamp: false,
  needsCompanion: false,
  waitTime: 0,
  isRecurring: false,
  notes: 'Test ride for legal agreement enforcement'
};

let cookies = '';

async function makeRequest(method, url, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response;
  } catch (error) {
    return error.response || error;
  }
}

async function testLegalAgreementEnforcement() {
  console.log('🧪 Testing Legal Agreement Enforcement System\n');
  
  try {
    // Step 1: Register a test user
    console.log('1. Registering test user...');
    const registerResponse = await makeRequest('POST', '/api/register', TEST_USER);
    
    if (registerResponse.status !== 201) {
      console.log('❌ Registration failed:', registerResponse.data);
      return;
    }
    
    // Extract cookies from registration
    if (registerResponse.headers['set-cookie']) {
      cookies = registerResponse.headers['set-cookie'].join('; ');
    }
    
    console.log('✅ User registered successfully');
    
    // Step 2: Try to book a ride WITHOUT signing legal agreements
    console.log('\n2. Attempting to book ride without legal agreements...');
    const rideWithoutAgreements = await makeRequest('POST', '/api/rides', TEST_RIDE);
    
    if (rideWithoutAgreements.status === 403 && rideWithoutAgreements.data.code === 'LEGAL_AGREEMENTS_REQUIRED') {
      console.log('✅ Ride booking blocked correctly - legal agreements required');
      console.log('📝 Error message:', rideWithoutAgreements.data.message);
    } else {
      console.log('❌ Ride booking should have been blocked but wasn\'t');
      console.log('Response:', rideWithoutAgreements.data);
    }
    
    // Step 3: Sign legal agreements
    console.log('\n3. Signing legal agreements...');
    const agreementData = {
      documentType: 'terms_of_service',
      agreed: true,
      userRole: 'rider'
    };
    
    const signResponse = await makeRequest('POST', '/api/legal-agreements/sign', agreementData);
    
    if (signResponse.status === 201) {
      console.log('✅ Legal agreement signed successfully');
    } else {
      console.log('❌ Failed to sign legal agreement:', signResponse.data);
      return;
    }
    
    // Step 4: Try to book ride AFTER signing legal agreements
    console.log('\n4. Attempting to book ride after signing legal agreements...');
    const rideWithAgreements = await makeRequest('POST', '/api/rides', TEST_RIDE);
    
    if (rideWithAgreements.status === 201) {
      console.log('✅ Ride booking successful after signing legal agreements');
      console.log('📋 Ride ID:', rideWithAgreements.data.id);
    } else {
      console.log('❌ Ride booking failed even after signing agreements');
      console.log('Response:', rideWithAgreements.data);
    }
    
    // Step 5: Check legal agreement status
    console.log('\n5. Checking legal agreement status...');
    const statusResponse = await makeRequest('GET', '/api/legal-agreements/status');
    
    if (statusResponse.status === 200) {
      console.log('✅ Legal agreement status retrieved');
      console.log('📊 Status:', statusResponse.data);
    } else {
      console.log('❌ Failed to get legal agreement status:', statusResponse.data);
    }
    
    console.log('\n🎉 Legal agreement enforcement test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testLegalAgreementEnforcement().catch(console.error);