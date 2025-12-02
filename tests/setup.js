/**
 * Test Setup and Global Configuration
 */

// Global test timeout
jest.setTimeout(30000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/myambulex_test';
process.env.STRIPE_SECRET_KEY = 'sk_test_test_key';
process.env.SENDGRID_API_KEY = 'SG.test_key';
process.env.FRONTEND_URL = 'http://localhost:5000';

// Global test utilities
global.testUtils = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  generateTestUser: (role = 'rider') => ({
    fullName: `Test ${role}`,
    email: `test.${role}.${Date.now()}@example.com`,
    phone: '+1234567890',
    password: 'TestPassword123!',
    role
  }),
  
  generateTestRide: () => ({
    pickupLocation: {
      address: '123 Test Street, Test City, TC 12345',
      latitude: 40.7128,
      longitude: -74.0060
    },
    dropoffLocation: {
      address: '456 Test Avenue, Test City, TC 12345',
      latitude: 40.7580,
      longitude: -73.9855
    },
    scheduledFor: new Date(Date.now() + 3600000).toISOString(),
    wheelchairAccessible: false,
    specialInstructions: 'Test ride'
  })
};

// Suppress console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes && (
    args[0].includes('Warning: ReactDOM.render') ||
    args[0].includes('Warning: React.createFactory')
  )) {
    return;
  }
  originalWarn.apply(console, args);
};

// Setup test database cleanup
afterEach(() => {
  // Reset any global state
  jest.clearAllMocks();
});

afterAll(() => {
  // Cleanup resources
  console.warn = originalWarn;
});

module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverageFrom: [
    'server/**/*.js',
    'server/**/*.ts',
    '!server/index.ts',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1'
  }
};