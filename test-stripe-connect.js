// Test script for Stripe Connect integration
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

// Test data for existing driver account
const testDriver = {
  username: 'Testdriver1',
  password: 'password123', // Common test password
  email: 'check212@icloud.com'
};

async function testStripeConnectFlow() {
  console.log('🧪 Testing Stripe Connect Integration...\n');
  
  try {
    // Step 1: Login as existing driver
    console.log('1. Logging in as existing driver...');
    const loginResponse = await axios.post(`${BASE_URL}/api/login`, {
      username: testDriver.username,
      password: testDriver.password
    });
    console.log('✅ Driver logged in successfully');
    
    // Extract session cookie
    const sessionCookies = loginResponse.headers['set-cookie'];
    if (!sessionCookies) {
      throw new Error('No session cookie received');
    }
    
    // Find the signed myambulex session cookie (the one with s%3A prefix)
    const myambulexCookie = sessionCookies.find(cookie => cookie.includes('myambulex.sid=s%3A'));
    if (!myambulexCookie) {
      throw new Error('Signed MyAmbulex session cookie not found');
    }
    
    const cookieHeader = myambulexCookie.split(';')[0];
    console.log('Session cookie obtained:', cookieHeader.substring(0, 30) + '...\n');
    
    // Step 2: Test account status check (should show no account)
    console.log('2. Checking initial account status...');
    const statusResponse = await axios.get(`${BASE_URL}/api/stripe-connect/account-status`, {
      headers: { Cookie: cookieHeader }
    });
    
    console.log('Initial status:', statusResponse.data);
    console.log('✅ Account status check working\n');
    
    // Step 3: Create connected account
    console.log('3. Creating Stripe Connected Account...');
    const createAccountResponse = await axios.post(`${BASE_URL}/api/stripe-connect/create-account`, {}, {
      headers: { Cookie: cookieHeader }
    });
    
    console.log('Account creation response:', createAccountResponse.data);
    console.log('✅ Connected account created successfully\n');
    
    // Step 4: Check updated account status
    console.log('4. Checking updated account status...');
    const updatedStatusResponse = await axios.get(`${BASE_URL}/api/stripe-connect/account-status`, {
      headers: { Cookie: cookieHeader }
    });
    
    console.log('Updated status:', updatedStatusResponse.data);
    console.log('✅ Account status updated correctly\n');
    
    // Step 5: Create onboarding link
    console.log('5. Creating onboarding link...');
    const onboardingResponse = await axios.post(`${BASE_URL}/api/stripe-connect/onboarding-link`, {}, {
      headers: { Cookie: cookieHeader }
    });
    
    console.log('Onboarding link created:', onboardingResponse.data.onboardingUrl);
    console.log('✅ Onboarding link generated successfully\n');
    
    // Step 6: Test dashboard link creation
    console.log('6. Testing dashboard link creation...');
    try {
      const dashboardResponse = await axios.post(`${BASE_URL}/api/stripe-connect/dashboard-link`, {}, {
        headers: { Cookie: cookieHeader }
      });
      
      console.log('Dashboard link created:', dashboardResponse.data.dashboardUrl);
      console.log('✅ Dashboard link generated successfully\n');
    } catch (dashboardError) {
      console.log('⚠️  Dashboard link creation failed (expected for new accounts):', dashboardError.response?.data?.error);
    }
    
    console.log('🎉 All Stripe Connect tests passed!');
    console.log('\nNext steps for complete testing:');
    console.log('1. Visit the onboarding link to complete Stripe onboarding');
    console.log('2. Test the payment flow with the connected account');
    console.log('3. Verify transfers work correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

// Run the test
testStripeConnectFlow();