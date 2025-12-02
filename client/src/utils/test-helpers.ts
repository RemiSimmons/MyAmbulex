// Test utilities for Phase 1 beta testing

export const TEST_USERS = {
  riders: [
    {
      email: 'test.rider1@myambulex.com',
      password: 'TestRider123!',
      fullName: 'John Smith',
      phone: '555-0101',
      needs: 'Standard transport'
    },
    {
      email: 'test.rider2@myambulex.com', 
      password: 'TestRider123!',
      fullName: 'Mary Johnson',
      phone: '555-0102',
      needs: 'Wheelchair accessible'
    },
    {
      email: 'test.rider3@myambulex.com',
      password: 'TestRider123!', 
      fullName: 'Robert Davis',
      phone: '555-0103',
      needs: 'Stretcher transport'
    }
  ],
  drivers: [
    {
      email: 'test.driver1@myambulex.com',
      password: 'TestDriver123!',
      fullName: 'Mike Wilson',
      phone: '555-0201',
      vehicle: 'Standard sedan'
    },
    {
      email: 'test.driver2@myambulex.com',
      password: 'TestDriver123!',
      fullName: 'Sarah Brown',
      phone: '555-0202', 
      vehicle: 'Wheelchair accessible van'
    },
    {
      email: 'test.driver3@myambulex.com',
      password: 'TestDriver123!',
      fullName: 'David Lee',
      phone: '555-0203',
      vehicle: 'Medical transport vehicle'
    }
  ],
  admins: [
    {
      email: 'test.admin@myambulex.com',
      password: 'TestAdmin123!',
      fullName: 'Admin User',
      phone: '555-0301'
    }
  ]
};

export const TEST_ADDRESSES = {
  pickups: [
    '123 Main St, Anytown, ST 12345',
    '456 Oak Ave, Somewhere, ST 12346', 
    '789 Pine Rd, Elsewhere, ST 12347'
  ],
  dropoffs: [
    'General Hospital, 321 Medical Dr, Anytown, ST 12345',
    'Dialysis Center, 654 Health Way, Somewhere, ST 12346',
    'Rehabilitation Clinic, 987 Therapy Ln, Elsewhere, ST 12347'
  ]
};

export const STRIPE_TEST_CARDS = {
  success: '4242424242424242',
  decline: '4000000000000002', 
  insufficientFunds: '4000000000009995',
  processingError: '4000000000000119',
  requiresAuth: '4000002760003184'
};

export const TEST_SCENARIOS = {
  immediateRide: {
    pickup: TEST_ADDRESSES.pickups[0],
    dropoff: TEST_ADDRESSES.dropoffs[0],
    scheduledTime: 'now',
    passengers: 1,
    wheelchairAccessible: false,
    specialInstructions: 'Patient has mobility issues'
  },
  wheelchairRide: {
    pickup: TEST_ADDRESSES.pickups[1], 
    dropoff: TEST_ADDRESSES.dropoffs[1],
    scheduledTime: 'now',
    passengers: 1,
    wheelchairAccessible: true,
    specialInstructions: 'Electric wheelchair'
  },
  scheduledRide: {
    pickup: TEST_ADDRESSES.pickups[2],
    dropoff: TEST_ADDRESSES.dropoffs[2], 
    scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    passengers: 1,
    wheelchairAccessible: false,
    specialInstructions: 'Recurring dialysis appointment'
  }
};

// Test utility functions
export const createTestRide = async (scenario: keyof typeof TEST_SCENARIOS) => {
  const rideData = TEST_SCENARIOS[scenario];
  
  const response = await fetch('/api/rides', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(rideData)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create test ride: ${response.statusText}`);
  }
  
  return response.json();
};

export const submitTestBid = async (rideId: number, amount: number, estimatedDuration: number) => {
  const response = await fetch(`/api/rides/${rideId}/bids`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      estimatedDuration,
      message: 'Test bid from automated testing'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to submit test bid: ${response.statusText}`);
  }
  
  return response.json();
};

export const processTestPayment = async (rideId: number, paymentMethod: 'stripe' | 'paypal') => {
  const response = await fetch(`/api/rides/${rideId}/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentMethod,
      paymentToken: paymentMethod === 'stripe' ? STRIPE_TEST_CARDS.success : 'test-paypal-token'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to process test payment: ${response.statusText}`);
  }
  
  return response.json();
};

// Performance testing utilities
export const measureApiResponse = async (endpoint: string, method: string = 'GET', data?: any) => {
  const startTime = performance.now();
  
  const response = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined
  });
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  return {
    endpoint,
    method,
    status: response.status,
    duration: Math.round(duration),
    ok: response.ok
  };
};

export const runPerformanceTest = async () => {
  const endpoints = [
    '/api/user',
    '/api/rides', 
    '/api/notifications',
    '/api/driver/status'
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const result = await measureApiResponse(endpoint);
      results.push(result);
      console.log(`${endpoint}: ${result.duration}ms`);
    } catch (error) {
      console.error(`Error testing ${endpoint}:`, error);
    }
  }
  
  return results;
};

// Security testing utilities
export const testRateLimiting = async (endpoint: string, maxRequests: number = 10) => {
  const promises = Array.from({ length: maxRequests + 5 }, () => 
    fetch(endpoint).then(res => res.status)
  );
  
  const results = await Promise.all(promises);
  const rateLimited = results.filter(status => status === 429).length;
  
  console.log(`Rate limiting test - ${rateLimited} requests blocked out of ${results.length}`);
  return { rateLimited, total: results.length };
};

export const testXSSProtection = async (endpoint: string) => {
  const xssPayloads = [
    '<script>alert("xss")</script>',
    '"><script>alert("xss")</script>',
    "javascript:alert('xss')",
    '<img src=x onerror=alert("xss")>'
  ];
  
  const results = [];
  
  for (const payload of xssPayloads) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: payload })
      });
      
      const text = await response.text();
      const sanitized = !text.includes('<script>') && !text.includes('javascript:');
      
      results.push({ payload, sanitized, status: response.status });
    } catch (error) {
      results.push({ payload, error: error.message });
    }
  }
  
  return results;
};

// Export test runner for Phase 1
export const runPhase1Tests = async () => {
  console.log('🧪 Starting Phase 1 Beta Testing Suite');
  
  try {
    console.log('📊 Running performance tests...');
    const perfResults = await runPerformanceTest();
    
    console.log('🔒 Testing rate limiting...');
    const rateLimitResults = await testRateLimiting('/api/user');
    
    console.log('🛡️ Testing XSS protection...');
    const xssResults = await testXSSProtection('/api/test');
    
    const report = {
      timestamp: new Date().toISOString(),
      performance: perfResults,
      rateLimiting: rateLimitResults,
      xssProtection: xssResults
    };
    
    console.log('✅ Phase 1 testing complete:', report);
    return report;
    
  } catch (error) {
    console.error('❌ Phase 1 testing failed:', error);
    throw error;
  }
};

export default {
  TEST_USERS,
  TEST_ADDRESSES, 
  STRIPE_TEST_CARDS,
  TEST_SCENARIOS,
  createTestRide,
  submitTestBid,
  processTestPayment,
  measureApiResponse,
  runPerformanceTest,
  testRateLimiting,
  testXSSProtection,
  runPhase1Tests
};