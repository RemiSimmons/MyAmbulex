/**
 * Load Testing for Concurrent Users
 * Tests system performance under realistic load conditions
 */

const axios = require('axios');
const WebSocket = require('ws');

const BASE_URL = process.env.LOAD_TEST_URL || 'http://localhost:5000';
const CONCURRENT_USERS = 50;
const TEST_DURATION = 300000; // 5 minutes
const RAMP_UP_TIME = 60000; // 1 minute

describe('Load Testing - Concurrent Users', () => {
  let testUsers = [];
  let activeConnections = [];
  let testResults = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: Infinity,
    responseTimes: [],
    errors: []
  };

  beforeAll(async () => {
    console.log(`Starting load test with ${CONCURRENT_USERS} concurrent users`);
    console.log(`Test duration: ${TEST_DURATION / 1000} seconds`);
    console.log(`Ramp-up time: ${RAMP_UP_TIME / 1000} seconds`);
  });

  afterAll(async () => {
    // Clean up active connections
    activeConnections.forEach(conn => {
      if (conn.readyState === WebSocket.OPEN) {
        conn.close();
      }
    });

    // Generate load test report
    generateLoadTestReport();
  });

  test('Concurrent user registration and authentication', async () => {
    const registrationPromises = [];
    const userDelay = RAMP_UP_TIME / CONCURRENT_USERS;

    for (let i = 0; i < CONCURRENT_USERS; i++) {
      const promise = new Promise((resolve) => {
        setTimeout(async () => {
          const userData = {
            fullName: `Load Test User ${i}`,
            email: `loadtest.user.${i}.${Date.now()}@test.com`,
            phone: `+123456${String(i).padStart(4, '0')}`,
            password: 'LoadTest123!',
            role: i % 2 === 0 ? 'rider' : 'driver'
          };

          try {
            const startTime = Date.now();
            const response = await axios.post(`${BASE_URL}/api/auth/register`, userData);
            const endTime = Date.now();
            
            recordResponse(endTime - startTime, response.status === 201);
            
            if (response.status === 201) {
              testUsers.push({
                id: i,
                ...userData,
                sessionCookie: response.headers['set-cookie']
              });
            }
            
            resolve(response);
          } catch (error) {
            recordResponse(0, false, error.message);
            resolve({ error: error.message });
          }
        }, i * userDelay);
      });

      registrationPromises.push(promise);
    }

    const results = await Promise.all(registrationPromises);
    
    // Verify registration success rate
    const successfulRegistrations = results.filter(r => !r.error).length;
    const successRate = (successfulRegistrations / CONCURRENT_USERS) * 100;
    
    expect(successRate).toBeGreaterThan(95); // 95% success rate minimum
    console.log(`Registration success rate: ${successRate.toFixed(2)}%`);
  });

  test('Concurrent ride booking under load', async () => {
    const riderUsers = testUsers.filter(user => user.role === 'rider');
    const bookingPromises = [];

    for (let i = 0; i < Math.min(riderUsers.length, 25); i++) {
      const promise = simulateRideBooking(riderUsers[i], i);
      bookingPromises.push(promise);
    }

    const bookingResults = await Promise.all(bookingPromises);
    
    const successfulBookings = bookingResults.filter(r => r.success).length;
    const bookingSuccessRate = (successfulBookings / bookingPromises.length) * 100;
    
    expect(bookingSuccessRate).toBeGreaterThan(90); // 90% booking success rate
    console.log(`Booking success rate: ${bookingSuccessRate.toFixed(2)}%`);
  });

  test('WebSocket connections under load', async () => {
    const wsConnections = [];

    for (let i = 0; i < Math.min(CONCURRENT_USERS, 30); i++) {
      const wsPromise = new Promise((resolve) => {
        const ws = new WebSocket(`ws://localhost:5000/ws`);
        
        ws.on('open', () => {
          activeConnections.push(ws);
          
          // Send periodic heartbeat
          const heartbeat = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping', userId: i }));
            } else {
              clearInterval(heartbeat);
            }
          }, 30000);

          resolve({ success: true, userId: i });
        });

        ws.on('error', (error) => {
          resolve({ success: false, error: error.message });
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            // Handle incoming messages
          } catch (error) {
            console.error('WebSocket message parse error:', error);
          }
        });
      });

      wsConnections.push(wsPromise);
    }

    const wsResults = await Promise.all(wsConnections);
    const successfulConnections = wsResults.filter(r => r.success).length;
    const wsSuccessRate = (successfulConnections / wsConnections.length) * 100;

    expect(wsSuccessRate).toBeGreaterThan(95); // 95% WebSocket connection success
    console.log(`WebSocket connection success rate: ${wsSuccessRate.toFixed(2)}%`);
  });

  test('Database performance under concurrent load', async () => {
    const dbQueries = [];
    const queryTypes = [
      'GET /api/rides',
      'GET /api/user',
      'GET /api/notifications',
      'POST /api/rides/search',
      'GET /api/driver/availability'
    ];

    for (let i = 0; i < 100; i++) {
      const queryType = queryTypes[i % queryTypes.length];
      const promise = performDatabaseQuery(queryType, i);
      dbQueries.push(promise);
    }

    const queryResults = await Promise.all(dbQueries);
    
    const successfulQueries = queryResults.filter(r => r.success).length;
    const avgQueryTime = queryResults.reduce((sum, r) => sum + r.responseTime, 0) / queryResults.length;
    
    expect(successfulQueries / queryResults.length).toBeGreaterThan(0.98); // 98% query success
    expect(avgQueryTime).toBeLessThan(500); // Average query time < 500ms
    
    console.log(`Database query success rate: ${(successfulQueries / queryResults.length * 100).toFixed(2)}%`);
    console.log(`Average query time: ${avgQueryTime.toFixed(2)}ms`);
  });

  test('Payment processing under load', async () => {
    const paymentPromises = [];
    
    // Test concurrent payment intent creation
    for (let i = 0; i < 20; i++) {
      const promise = createPaymentIntent(1000 + i); // $10+ per payment
      paymentPromises.push(promise);
    }

    const paymentResults = await Promise.all(paymentPromises);
    
    const successfulPayments = paymentResults.filter(r => r.success).length;
    const paymentSuccessRate = (successfulPayments / paymentPromises.length) * 100;
    
    expect(paymentSuccessRate).toBeGreaterThan(95); // 95% payment success rate
    console.log(`Payment processing success rate: ${paymentSuccessRate.toFixed(2)}%`);
  });

  test('System stability during sustained load', async () => {
    const startTime = Date.now();
    const sustainedLoadPromises = [];

    while (Date.now() - startTime < 120000) { // 2 minutes of sustained load
      // Random API calls
      const apiCall = generateRandomApiCall();
      sustainedLoadPromises.push(apiCall);
      
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms interval
    }

    const sustainedResults = await Promise.all(sustainedLoadPromises);
    
    const successRate = sustainedResults.filter(r => r.success).length / sustainedResults.length * 100;
    const avgResponseTime = sustainedResults.reduce((sum, r) => sum + r.responseTime, 0) / sustainedResults.length;
    
    expect(successRate).toBeGreaterThan(95); // Maintain 95% success under sustained load
    expect(avgResponseTime).toBeLessThan(2000); // Average response time < 2s
    
    console.log(`Sustained load success rate: ${successRate.toFixed(2)}%`);
    console.log(`Sustained load avg response time: ${avgResponseTime.toFixed(2)}ms`);
  });

  // Helper functions
  async function simulateRideBooking(user, index) {
    try {
      const rideData = {
        pickupLocation: {
          address: `${100 + index} Test Street, Test City, TC 12345`,
          latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
          longitude: -74.0060 + (Math.random() - 0.5) * 0.1
        },
        dropoffLocation: {
          address: `${200 + index} Destination Ave, Test City, TC 12345`,
          latitude: 40.7580 + (Math.random() - 0.5) * 0.1,
          longitude: -73.9855 + (Math.random() - 0.5) * 0.1
        },
        scheduledFor: new Date(Date.now() + 3600000).toISOString(),
        wheelchairAccessible: index % 3 === 0,
        specialInstructions: `Load test booking ${index}`
      };

      const startTime = Date.now();
      const response = await axios.post(`${BASE_URL}/api/rides`, rideData, {
        headers: {
          'Cookie': user.sessionCookie
        }
      });
      const endTime = Date.now();

      recordResponse(endTime - startTime, response.status === 201);
      
      return {
        success: response.status === 201,
        responseTime: endTime - startTime,
        rideId: response.data?.id
      };
    } catch (error) {
      recordResponse(0, false, error.message);
      return { success: false, error: error.message };
    }
  }

  async function performDatabaseQuery(queryType, index) {
    try {
      const startTime = Date.now();
      
      let response;
      switch (queryType) {
        case 'GET /api/rides':
          response = await axios.get(`${BASE_URL}/api/rides?limit=10&offset=${index * 10}`);
          break;
        case 'GET /api/user':
          response = await axios.get(`${BASE_URL}/api/user`);
          break;
        case 'GET /api/notifications':
          response = await axios.get(`${BASE_URL}/api/notifications`);
          break;
        case 'POST /api/rides/search':
          response = await axios.post(`${BASE_URL}/api/rides/search`, {
            location: { latitude: 40.7128, longitude: -74.0060 },
            radius: 10
          });
          break;
        case 'GET /api/driver/availability':
          response = await axios.get(`${BASE_URL}/api/driver/availability`);
          break;
      }
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        success: response.status < 400,
        responseTime,
        queryType
      };
    } catch (error) {
      return {
        success: false,
        responseTime: 0,
        error: error.message,
        queryType
      };
    }
  }

  async function createPaymentIntent(amount) {
    try {
      const startTime = Date.now();
      const response = await axios.post(`${BASE_URL}/api/stripe/payment-intent`, {
        amount,
        currency: 'usd'
      });
      const endTime = Date.now();

      return {
        success: response.status === 200,
        responseTime: endTime - startTime,
        paymentIntentId: response.data?.paymentIntentId
      };
    } catch (error) {
      return {
        success: false,
        responseTime: 0,
        error: error.message
      };
    }
  }

  async function generateRandomApiCall() {
    const endpoints = [
      'GET /api/rides',
      'GET /api/notifications',
      'GET /api/user',
      'GET /api/testing/health'
    ];
    
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const [method, path] = endpoint.split(' ');
    
    try {
      const startTime = Date.now();
      const response = await axios[method.toLowerCase()](`${BASE_URL}${path}`);
      const endTime = Date.now();
      
      return {
        success: response.status < 400,
        responseTime: endTime - startTime,
        endpoint
      };
    } catch (error) {
      return {
        success: false,
        responseTime: 0,
        error: error.message,
        endpoint
      };
    }
  }

  function recordResponse(responseTime, success, error = null) {
    testResults.totalRequests++;
    
    if (success) {
      testResults.successfulRequests++;
      testResults.responseTimes.push(responseTime);
      testResults.maxResponseTime = Math.max(testResults.maxResponseTime, responseTime);
      testResults.minResponseTime = Math.min(testResults.minResponseTime, responseTime);
    } else {
      testResults.failedRequests++;
      if (error) {
        testResults.errors.push(error);
      }
    }
    
    testResults.averageResponseTime = 
      testResults.responseTimes.reduce((sum, time) => sum + time, 0) / testResults.responseTimes.length;
  }

  function generateLoadTestReport() {
    const successRate = (testResults.successfulRequests / testResults.totalRequests) * 100;
    
    const report = {
      summary: {
        totalRequests: testResults.totalRequests,
        successfulRequests: testResults.successfulRequests,
        failedRequests: testResults.failedRequests,
        successRate: `${successRate.toFixed(2)}%`,
        averageResponseTime: `${testResults.averageResponseTime.toFixed(2)}ms`,
        maxResponseTime: `${testResults.maxResponseTime}ms`,
        minResponseTime: `${testResults.minResponseTime}ms`
      },
      performance: {
        requestsPerSecond: testResults.totalRequests / (TEST_DURATION / 1000),
        p95ResponseTime: calculatePercentile(testResults.responseTimes, 95),
        p99ResponseTime: calculatePercentile(testResults.responseTimes, 99)
      },
      errors: testResults.errors.slice(0, 10) // First 10 errors
    };

    console.log('\n=== LOAD TEST REPORT ===');
    console.log(JSON.stringify(report, null, 2));
    
    // Save report to file
    require('fs').writeFileSync(
      `load-test-report-${Date.now()}.json`,
      JSON.stringify(report, null, 2)
    );
  }

  function calculatePercentile(values, percentile) {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }
});

module.exports = {
  testTimeout: TEST_DURATION + 60000, // Test duration + 1 minute buffer
  maxWorkers: 1, // Single worker to control load generation
  setupFilesAfterEnv: ['<rootDir>/tests/load/setup.js']
};