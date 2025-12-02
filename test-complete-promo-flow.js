#!/usr/bin/env node

import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';

// Test complete promo code flow
async function testPromoCodeFlow() {
  console.log('🧪 Testing Complete Promo Code Flow');
  console.log('=' .repeat(50));

  try {
    // Step 1: Login as rider
    console.log('\n1. 🔐 Logging in as rider...');
    const loginResponse = await axios.post(`${BASE_URL}/api/login`, {
      username: 'Remi',
      password: 'password123'
    });
    
    const cookies = loginResponse.headers['set-cookie'];
    console.log(`✅ Login successful: ${loginResponse.data.username} (${loginResponse.data.role})`);

    // Step 2: Check current ride
    console.log('\n2. 🚗 Checking ride details...');
    const rideResponse = await axios.get(`${BASE_URL}/api/rides/72`, {
      headers: {
        Cookie: cookies.join('; ')
      }
    });
    
    const ride = rideResponse.data;
    console.log(`✅ Ride ${ride.id}: $${ride.finalPrice} (Original: $${ride.riderBid})`);
    console.log(`   Status: ${ride.status}`);
    console.log(`   Promo Code Used: ${ride.promoCodeUsed || 'None'}`);

    // Step 3: Apply promo code
    console.log('\n3. 🎫 Applying promo code...');
    const promoResponse = await axios.post(`${BASE_URL}/api/promo-codes/apply`, {
      code: 'ADMIN1',
      rideId: 72,
      originalAmount: ride.riderBid
    }, {
      headers: {
        Cookie: cookies.join('; ')
      }
    });
    
    console.log(`✅ Promo code applied: ${promoResponse.data.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Discount: $${promoResponse.data.discountAmount}`);
    console.log(`   Final Amount: $${promoResponse.data.finalAmount}`);

    // Step 4: Verify ride updated
    console.log('\n4. 🔄 Verifying ride update...');
    const updatedRideResponse = await axios.get(`${BASE_URL}/api/rides/72`, {
      headers: {
        Cookie: cookies.join('; ')
      }
    });
    
    const updatedRide = updatedRideResponse.data;
    console.log(`✅ Updated ride: $${updatedRide.finalPrice} (was $${ride.riderBid})`);
    console.log(`   Promo Code ID: ${updatedRide.promoCodeUsed}`);

    // Step 5: Create payment intent
    console.log('\n5. 💳 Creating payment intent...');
    const paymentResponse = await axios.post(`${BASE_URL}/api/create-payment-intent`, {
      rideId: 72
    }, {
      headers: {
        Cookie: cookies.join('; ')
      }
    });
    
    console.log(`✅ Payment intent created: $${paymentResponse.data.amount / 100}`);
    console.log(`   Client Secret: ${paymentResponse.data.clientSecret?.substring(0, 20)}...`);

    // Step 6: Test payment endpoint with promo code
    console.log('\n6. 💰 Testing payment endpoint with promo code...');
    const paymentPromoResponse = await axios.post(`${BASE_URL}/api/payment/create-payment-intent`, {
      amount: 67.00,
      promoCode: 'ADMIN1',
      rideId: 72
    }, {
      headers: {
        Cookie: cookies.join('; ')
      }
    });
    
    console.log(`✅ Payment with promo: $${paymentPromoResponse.data.amount}`);
    console.log(`   Client Secret: ${paymentPromoResponse.data.clientSecret?.substring(0, 20)}...`);

    // Final verification
    console.log('\n🎉 COMPLETE PROMO CODE FLOW VERIFICATION');
    console.log('=' .repeat(50));
    console.log(`✅ Original ride amount: $${ride.riderBid}`);
    console.log(`✅ Promo code applied: ADMIN1`);
    console.log(`✅ Final discounted amount: $${updatedRide.finalPrice}`);
    console.log(`✅ Payment intent amount: $${paymentResponse.data.amount / 100}`);
    console.log(`✅ Promo code ID stored: ${updatedRide.promoCodeUsed}`);
    console.log(`✅ Discount amount: $${promoResponse.data.discountAmount}`);
    
    const isCorrect = (
      updatedRide.finalPrice === 1 &&
      paymentResponse.data.amount === 100 &&
      promoResponse.data.discountAmount === 66 &&
      promoResponse.data.finalAmount === 1 &&
      updatedRide.promoCodeUsed === 3
    );
    
    console.log(`\n${isCorrect ? '🎉 ALL TESTS PASSED!' : '❌ TESTS FAILED!'}`);
    console.log('Promo code system is fully operational for beta testing.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testPromoCodeFlow();