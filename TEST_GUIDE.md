# MyAmbulex Testing Guide
**Last Updated:** November 14, 2025

## Overview
This document provides comprehensive guidance for running tests, understanding test coverage, and maintaining test quality for the MyAmbulex platform. Tests use **integration testing** with supertest to test actual HTTP endpoints.

## Test Infrastructure

### Testing Frameworks
- **Jest** - Test runner and assertion library
- **Supertest** - HTTP integration testing for Express routes
- **ts-jest** - TypeScript transformation for Jest
- **Playwright** - End-to-end browser testing

### Test Environment Setup
- Node.js test environment
- PostgreSQL test database  
- Supertest for HTTP endpoint testing
- Automated test utilities in `tests/setup.js`

## Running Tests

### Quick Start
```bash
# Run all tests
npx jest

# Run specific test file
npx jest tests/integration/auth-integration.test.ts

# Run tests with coverage
npx jest --coverage

# Run tests in watch mode (for development)
npx jest --watch

# Run only unit tests
npx jest tests/unit

# Run only integration tests  
npx jest tests/integration

# Run e2e tests with Playwright
npx playwright test
```

### Test Environment Variables
The test environment is automatically configured in `tests/setup.js`:
```javascript
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/myambulex_test';
process.env.STRIPE_SECRET_KEY = 'sk_test_test_key';
process.env.SENDGRID_API_KEY = 'SG.test_key';
```

## Test Structure

### Test Directory Organization
```
tests/
├── setup.js                           # Global test configuration
├── helpers/
│   └── test-app.ts                    # Express app setup for testing ✅ NEW
├── integration/                        # HTTP endpoint tests ✅ NEW
│   ├── auth-integration.test.ts       # Authentication endpoints
│   └── ride-bidding-integration.test.ts # Ride & bidding endpoints
├── unit/                               # Unit tests
│   ├── payment.test.js                # Payment processing (existing)
│   └── coordinate-validation.test.ts  # Location validation (existing)
├── e2e/                                # End-to-end browser tests
│   └── user-journeys.test.js          # Complete user workflows
├── load/                               # Performance tests
│   └── concurrent-users.test.js
└── mobile/                             # Mobile-specific tests
    └── device-testing.test.js
```

## Testing Approach

### Integration Testing with Supertest

**Why Integration Tests?**
MyAmbulex uses Express routers with middleware (authentication, authorization, validation). Integration tests verify the entire request/response flow, including:
- Route handlers
- Middleware execution
- Database interactions
- Authentication/authorization
- Input validation
- Error handling

**Test Helper Setup (`tests/helpers/test-app.ts`):**
```typescript
import { createTestApp } from '../helpers/test-app';
import request from 'supertest';

// Create test app instance
const app = createTestApp();

// Test an endpoint
const response = await request(app)
  .post('/api/register')
  .send(userData)
  .expect(201);
```

**Authenticated Requests:**
```typescript
import request from 'supertest';

// Create agent for session persistence
const agent = request.agent(app);

// Login
await agent
  .post('/api/auth/login')
  .send({ username: 'test', password: 'Test123!' });

// Make authenticated requests
const response = await agent
  .get('/api/user')
  .expect(200);
```

## Test Categories

### 1. Integration Tests (`tests/integration/`)

#### Authentication Tests (`auth-integration.test.ts`)
**Coverage:** 15+ test scenarios
- User registration (riders and drivers)
- Login with username or email
- Session management (creation, persistence, destruction)
- Role-based access control (RBAC)
- Password security (hashing, no leakage)
- Error handling and validation

**Example Test:**
```typescript
test('should register a new rider successfully', async () => {
  const response = await request(app)
    .post('/api/register')
    .send({
      username: 'test_rider',
      email: 'test@example.com',
      fullName: 'Test User',
      phone: '+1234567890',
      password: 'Test123!',
      role: 'rider'
    })
    .expect(201);

  expect(response.body).toHaveProperty('user');
  expect(response.body.user.role).toBe('rider');
});
```

#### Ride & Bidding Tests (`ride-bidding-integration.test.ts`)
**Coverage:** 15+ test scenarios
- Ride creation and validation
- Driver bidding workflow
- Authentication and authorization
- Duplicate bid prevention
- Complete ride-bidding workflow
- Role-based access to endpoints

**Example Test:**
```typescript
test('should allow driver to place a bid', async () => {
  const bidData = {
    rideId: testRideId,
    amount: 45.00,
    message: 'I can take this ride'
  };

  const response = await driverAgent
    .post('/api/bids')
    .send(bidData)
    .expect(201);

  expect(response.body.status).toBe('pending');
});
```

### 2. Unit Tests (`tests/unit/`)

#### Payment Tests (`payment.test.js`)
**Existing comprehensive test suite:**
- Stripe payment intent creation
- PayPal order processing
- Payment validation
- Error handling
- Security checks
- Performance testing

#### Coordinate Validation Tests (`coordinate-validation.test.ts`)
**Existing comprehensive test suite:**
- US territory validation
- Distance calculations
- Fare estimation
- Error handling

### 3. End-to-End Tests (`tests/e2e/`)

**Complete User Journeys** using Playwright:
- Rider: registration → profile → payment → booking → bid selection
- Driver: registration → approval → bidding → ride completion
- Admin: user management → driver verification

## Test Utilities

### Global Test Helpers (`tests/setup.js`)

```javascript
// Generate test user
const testUser = global.testUtils.generateTestUser('rider');
// Returns:
// {
//   fullName: "Test rider",
//   email: "test.rider.1699999999@example.com",
//   phone: "+1234567890",
//   password: "TestPassword123!",
//   role: "rider"
// }

// Generate test ride
const testRide = global.testUtils.generateTestRide();
// Returns ride data with pickup/dropoff locations

// Delay utility
await global.testUtils.delay(1000);
```

### Creating Test App Instance

```typescript
import { createTestApp } from '../helpers/test-app';

const app = createTestApp();
```

This creates an Express app with:
- JSON body parsing
- Session management
- Passport authentication
- All application routes

## Coverage Reports

### Current Coverage Thresholds
```javascript
{
  global: {
    branches: 75%,
    functions: 75%,
    lines: 75%,
    statements: 75%
  }
}
```

### Viewing Coverage Reports
```bash
npx jest --coverage
```

Coverage reports are generated in:
- `coverage/` - HTML reports (open `coverage/lcov-report/index.html`)
- Console output - Summary table

## Writing New Tests

### Integration Test Template

```typescript
import { describe, test, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { createTestApp } from '../helpers/test-app';

describe('[Feature Name] Integration Tests', () => {
  let app: any;

  beforeAll(() => {
    app = createTestApp();
  });

  test('should [expected behavior]', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .send({ data: 'test' })
      .expect(200);

    expect(response.body).toMatchObject({
      expectedProperty: 'expectedValue'
    });
  });
});
```

### Testing Authenticated Endpoints

```typescript
import request from 'supertest';

test('should access protected route when authenticated', async () => {
  const agent = request.agent(app);

  // Login first
  await agent
    .post('/api/auth/login')
    .send({ username: 'user', password: 'pass' })
    .expect(200);

  // Access protected route
  const response = await agent
    .get('/api/protected')
    .expect(200);

  expect(response.body).toBeDefined();
});
```

## Best Practices

### DO:
- ✅ Test actual HTTP endpoints with supertest
- ✅ Use descriptive test names explaining expected behavior
- ✅ Test both success and error scenarios
- ✅ Clean up test data after tests
- ✅ Use `beforeEach` for test setup, `afterEach` for cleanup
- ✅ Test authentication and authorization
- ✅ Verify response status codes and body structure

### DON'T:
- ❌ Import and call route handlers directly (they're not exported)
- ❌ Test implementation details (test behavior via HTTP)
- ❌ Make tests dependent on execution order
- ❌ Use real API keys or credentials
- ❌ Skip authentication/authorization tests
- ❌ Forget to clear mocks and test data

## Debugging Tests

### Running Single Test File
```bash
npx jest tests/integration/auth-integration.test.ts
```

### Running Specific Test
```bash
npx jest -t "should register a new rider"
```

### Verbose Output
```bash
npx jest --verbose
```

### Debugging with Node Inspector
```bash
node --inspect-brk node_modules/.bin/jest tests/integration/auth-integration.test.ts
```

### Common Issues

**Issue: Tests timing out**
```typescript
// Increase timeout in jest.config.js or specific test
test('slow operation', async () => {
  // Test code
}, 60000); // 60 second timeout
```

**Issue: Database connection errors**
- Check `DATABASE_URL` in `tests/setup.js`
- Ensure PostgreSQL is running
- Verify test database exists

**Issue: Authentication failures**
- Ensure user is created before login
- Use `request.agent()` for session persistence
- Check that onboarding is complete for restricted endpoints

## Integration Test Patterns

### Pattern 1: Simple Endpoint Test
```typescript
test('should get user profile', async () => {
  const response = await authenticatedAgent
    .get('/api/user')
    .expect(200);

  expect(response.body).toHaveProperty('id');
});
```

### Pattern 2: CRUD Workflow
```typescript
test('complete CRUD workflow', async () => {
  // Create
  const createResponse = await agent
    .post('/api/resource')
    .send(data)
    .expect(201);
  
  const id = createResponse.body.id;

  // Read
  const getResponse = await agent
    .get(`/api/resource/${id}`)
    .expect(200);

  // Update
  await agent
    .patch(`/api/resource/${id}`)
    .send(updateData)
    .expect(200);

  // Delete
  await agent
    .delete(`/api/resource/${id}`)
    .expect(200);
});
```

### Pattern 3: Multi-User Interaction
```typescript
test('rider creates ride, driver bids', async () => {
  // Rider creates ride
  const rideResponse = await riderAgent
    .post('/api/rides')
    .send(rideData)
    .expect(201);

  // Driver places bid
  const bidResponse = await driverAgent
    .post('/api/bids')
    .send({ rideId: rideResponse.body.id, amount: 50 })
    .expect(201);

  // Verify bid appears in rider's view
  const bidsResponse = await riderAgent
    .get(`/api/rides/${rideResponse.body.id}/bids`)
    .expect(200);

  expect(bidsResponse.body).toContainEqual(
    expect.objectContaining({ id: bidResponse.body.id })
  );
});
```

## Performance Testing

### Load Tests
```javascript
test('should handle concurrent requests', async () => {
  const requests = Array(10).fill().map(() => 
    request(app).get('/api/endpoint')
  );

  const responses = await Promise.all(requests);
  
  responses.forEach(response => {
    expect(response.status).toBe(200);
  });
});
```

## Test Maintenance

### When to Update Tests
- ✏️ When adding new features
- ✏️ When fixing bugs (add regression tests)
- ✏️ When refactoring code
- ✏️ When API contracts change
- ✏️ When security vulnerabilities are discovered

### Regular Maintenance Tasks
1. **Weekly:** Review test coverage reports
2. **Monthly:** Update test dependencies
3. **Quarterly:** Review and remove obsolete tests
4. **As needed:** Add tests for critical bug fixes

## Next Steps

### Recommended Testing Improvements
1. ✅ **Completed:** Authentication integration tests
2. ✅ **Completed:** Ride and bidding integration tests
3. 📋 **Planned:** Bid acceptance and payment flow tests
4. 📋 **Planned:** Admin operations tests
5. 📋 **Planned:** Notification system tests
6. 📋 **Planned:** Document upload/verification tests
7. 📋 **Planned:** Recurring appointment tests

### Coverage Goals
- Current Target: 75% coverage
- Stretch Goal: 85% coverage for critical paths
- 100% coverage for: Authentication, Payment Processing, Ride Workflows

## Resources

### Documentation
- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Playwright Documentation](https://playwright.dev/)

### Internal Documentation
- `GAP_ANALYSIS.md` - Identified testing gaps
- `IMPLEMENTATION_SUMMARY.md` - Recent infrastructure fixes
- `SECURITY_NOTES.md` - Security testing requirements

## Quick Reference

### Common Test Commands
```bash
# Run all tests
npx jest

# Run specific test file
npx jest tests/integration/auth-integration.test.ts

# Run tests matching pattern
npx jest --testNamePattern="should register"

# Run with verbose output
npx jest --verbose

# Generate coverage
npx jest --coverage

# Watch mode (re-run on changes)
npx jest --watch

# Run e2e tests
npx playwright test
```

### Test File Naming
- Integration tests: `*-integration.test.ts`
- Unit tests: `*.test.js` or `*.test.ts`
- E2E tests: `*.test.js` (Playwright)

---

**For Questions or Issues:** Review this guide or check existing test files for patterns and examples.
