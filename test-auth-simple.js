// Simple test to verify session authentication
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

// Test login and immediate API call
async function testAuthentication() {
  console.log('🧪 Testing Session Authentication...\n');
  
  try {
    // Step 1: Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/login`, {
      username: 'Testdriver1',
      password: 'password123'
    });
    
    console.log('✅ Login successful');
    console.log('User data:', loginResponse.data);
    
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
    console.log('Session cookie:', cookieHeader.substring(0, 30) + '...');
    console.log('Full cookie:', myambulexCookie);
    
    // Decode the cookie value for inspection
    const cookieValue = cookieHeader.split('=')[1];
    const decodedValue = decodeURIComponent(cookieValue);
    console.log('Decoded cookie value:', decodedValue);
    
    // Step 2: Test API call with session cookie
    console.log('\n2. Testing authenticated API call...');
    const userResponse = await axios.get(`${BASE_URL}/api/user`, {
      headers: { Cookie: cookieHeader }
    });
    
    console.log('✅ User endpoint response:', userResponse.data);
    
    // Step 3: Test Stripe Connect endpoint
    console.log('\n3. Testing Stripe Connect endpoint...');
    const stripeResponse = await axios.get(`${BASE_URL}/api/stripe-connect/account-status`, {
      headers: { Cookie: cookieHeader }
    });
    
    console.log('✅ Stripe Connect response:', stripeResponse.data);
    
    console.log('\n🎉 All authentication tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

// Run the test
testAuthentication();