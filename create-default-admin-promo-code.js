// Script to create default admin promo code for testing
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

// Admin login credentials
const adminCredentials = {
  username: 'admin',
  password: 'admin123'
};

async function createDefaultAdminPromoCode() {
  console.log('🔑 Creating default admin promo code...\n');
  
  try {
    // Step 1: Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/login`, adminCredentials);
    console.log('✅ Admin logged in successfully');
    
    // Extract session cookie
    const sessionCookies = loginResponse.headers['set-cookie'];
    if (!sessionCookies) {
      throw new Error('No session cookie received');
    }
    
    const signedCookie = sessionCookies.find(cookie => cookie.includes('myambulex.sid=s%3A'));
    if (!signedCookie) {
      throw new Error('Signed session cookie not found');
    }
    
    const cookieHeader = signedCookie.split(';')[0];
    console.log('Session cookie obtained\n');
    
    // Step 2: Create default admin promo code
    console.log('2. Creating default admin promo code...');
    const promoCodeData = {
      code: 'ADMIN1',
      description: 'Admin testing promo code - Sets ride price to $1.00 for testing purposes',
      discountType: 'set_price',
      discountValue: 1.00,
      maxUses: null, // Unlimited uses
      expiresAt: null, // No expiration
      isActive: true,
      applicableRoles: ['rider', 'driver', 'admin'],
      minimumAmount: 0 // No minimum
    };
    
    const createResponse = await axios.post(`${BASE_URL}/api/admin/promo-codes`, promoCodeData, {
      headers: { Cookie: cookieHeader }
    });
    
    console.log('✅ Default admin promo code created successfully!');
    console.log('📋 Promo Code Details:');
    console.log(`   Code: ${promoCodeData.code}`);
    console.log(`   Description: ${promoCodeData.description}`);
    console.log(`   Type: ${promoCodeData.discountType}`);
    console.log(`   Value: $${promoCodeData.discountValue}`);
    console.log(`   Max Uses: ${promoCodeData.maxUses || 'Unlimited'}`);
    console.log(`   Expires: ${promoCodeData.expiresAt || 'Never'}`);
    console.log(`   Active: ${promoCodeData.isActive ? 'Yes' : 'No'}`);
    console.log(`   Applicable Roles: ${promoCodeData.applicableRoles.join(', ')}`);
    
    console.log('\n🎯 Usage Instructions:');
    console.log('- Use promo code "ADMIN1" during payment');
    console.log('- Will set any ride price to exactly $1.00');
    console.log('- Can be used by any user role');
    console.log('- No usage limits or expiration');
    console.log('- Perfect for testing payment flows');
    
  } catch (error) {
    console.error('❌ Failed to create default admin promo code:', error.response?.data || error.message);
    
    if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
      console.log('\n💡 Default admin promo code "ADMIN1" already exists!');
      console.log('You can use it for testing or create a new one through the admin panel.');
    }
  }
}

// Run the script
createDefaultAdminPromoCode();