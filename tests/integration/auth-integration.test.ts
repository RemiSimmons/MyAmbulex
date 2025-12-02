/**
 * Integration Tests for Authentication System
 * Tests actual HTTP endpoints using supertest
 * Each test block is independent with its own setup
 */

import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createTestApp } from '../helpers/test-app';
import { storage } from '../../server/storage';

describe('Authentication Integration Tests', () => {
  let app: any;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('POST /api/register', () => {
    test('should register a new rider successfully', async () => {
      const testUserData = {
        username: `test_user_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        fullName: 'Test User',
        phone: '+1234567890',
        password: 'TestPassword123!',
        role: 'rider'
      };

      const response = await request(app)
        .post('/api/register')
        .send(testUserData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        username: testUserData.username,
        email: testUserData.email,
        fullName: testUserData.fullName,
        role: 'rider'
      });
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should register a driver with pending status', async () => {
      const driverData = {
        username: `test_driver_${Date.now()}`,
        email: `driver_${Date.now()}@example.com`,
        fullName: 'Test Driver',
        phone: '+1234567891',
        password: 'TestPassword123!',
        role: 'driver'
      };

      const response = await request(app)
        .post('/api/register')
        .send(driverData)
        .expect(201);

      expect(response.body.user.role).toBe('driver');
      expect(response.body.user.accountStatus).toBe('pending');
    });

    test('should reject registration with missing required fields', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'incomplete',
          password: 'test'
          // Missing other required fields
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('required');
    });

    test('should reject registration with duplicate email', async () => {
      const userData = {
        username: `user_${Date.now()}`,
        email: `duplicate_${Date.now()}@example.com`,
        fullName: 'Test',
        phone: '+1234567892',
        password: 'Test123!',
        role: 'rider'
      };

      // First registration should succeed
      await request(app)
        .post('/api/register')
        .send(userData)
        .expect(201);

      // Second registration with same email should fail
      const duplicateUser = {
        ...userData,
        username: `different_${Date.now()}`
      };

      const response = await request(app)
        .post('/api/register')
        .send(duplicateUser)
        .expect(400);

      expect(response.body.message).toContain('email');
    });

    test('should reject invalid role', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          username: `invalid_role_${Date.now()}`,
          email: `invalid_${Date.now()}@example.com`,
          fullName: 'Test',
          phone: '+1234567893',
          password: 'Test123!',
          role: 'invalid_role'
        })
        .expect(400);

      expect(response.body.message).toContain('role');
    });
  });

  describe('POST /api/auth/login', () => {
    let registeredUser: any;

    // Create a fresh user for each test in this block
    beforeEach(async () => {
      const userData = {
        username: `login_test_${Date.now()}_${Math.random()}`,
        email: `login_${Date.now()}_${Math.random()}@example.com`,
        fullName: 'Login Test',
        phone: `+1${Math.floor(Math.random() * 1000000000)}`,
        password: 'LoginTest123!',
        role: 'rider'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData);

      registeredUser = {
        ...userData,
        id: response.body.user.id
      };
    });

    test('should login with valid credentials using username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: registeredUser.username,
          password: registeredUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe(registeredUser.username);
    });

    test('should login with valid credentials using email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: registeredUser.email, // Can use email as username
          password: registeredUser.password
        })
        .expect(200);

      expect(response.body.user.email).toBe(registeredUser.email);
    });

    test('should reject login with invalid password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          username: registeredUser.username,
          password: 'WrongPassword123!'
        })
        .expect(401);
    });

    test('should reject login with non-existent user', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent_user',
          password: 'SomePassword123!'
        })
        .expect(401);
    });

    test('should create session on successful login', async () => {
      const agent = request.agent(app);

      await agent
        .post('/api/auth/login')
        .send({
          username: registeredUser.username,
          password: registeredUser.password
        })
        .expect(200);

      // Verify session by accessing authenticated endpoint
      const response = await agent
        .get('/api/user')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toBe(registeredUser.username);
    });
  });

  describe('Session Management', () => {
    let testUser: any;
    let agent: any;

    beforeEach(async () => {
      // Create a fresh user and agent for each test
      const userData = {
        username: `session_test_${Date.now()}_${Math.random()}`,
        email: `session_${Date.now()}_${Math.random()}@example.com`,
        fullName: 'Session Test',
        phone: `+1${Math.floor(Math.random() * 1000000000)}`,
        password: 'SessionTest123!',
        role: 'rider'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData);

      testUser = {
        ...userData,
        id: response.body.user.id
      };

      agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        });
    });

    test('should logout successfully and destroy session', async () => {
      // Logout
      await agent
        .post('/api/auth/logout')
        .expect(200);

      // Verify session is destroyed by trying to access authenticated endpoint
      await agent
        .get('/api/user')
        .expect(401);
    });

    test('should return current user when authenticated', async () => {
      const response = await agent
        .get('/api/user')
        .expect(200);

      expect(response.body).toMatchObject({
        username: testUser.username,
        email: testUser.email,
        role: 'rider'
      });
      expect(response.body).not.toHaveProperty('password');
    });

    test('should return 401 when not authenticated', async () => {
      await request(app)
        .get('/api/user')
        .expect(401);
    });
  });

  describe('Role-Based Access Control', () => {
    let riderAgent: any;
    let driverAgent: any;

    beforeEach(async () => {
      // Create and login as rider
      const riderData = {
        username: `rbac_rider_${Date.now()}_${Math.random()}`,
        email: `rbac_rider_${Date.now()}_${Math.random()}@example.com`,
        fullName: 'RBAC Rider',
        phone: `+1${Math.floor(Math.random() * 1000000000)}`,
        password: 'RBACTest123!',
        role: 'rider'
      };

      await request(app)
        .post('/api/register')
        .send(riderData);

      riderAgent = request.agent(app);
      await riderAgent
        .post('/api/auth/login')
        .send({
          username: riderData.username,
          password: riderData.password
        });

      // Create and login as driver
      const driverData = {
        username: `rbac_driver_${Date.now()}_${Math.random()}`,
        email: `rbac_driver_${Date.now()}_${Math.random()}@example.com`,
        fullName: 'RBAC Driver',
        phone: `+1${Math.floor(Math.random() * 1000000000)}`,
        password: 'RBACTest123!',
        role: 'driver'
      };

      const driverRegResponse = await request(app)
        .post('/api/register')
        .send(driverData);

      // Approve the driver
      await storage.updateDriverDetails(driverRegResponse.body.user.id, { 
        accountStatus: 'active',
        verified: true
      });

      driverAgent = request.agent(app);
      await driverAgent
        .post('/api/auth/login')
        .send({
          username: driverData.username,
          password: driverData.password
        });
    });

    test('rider should access rider routes', async () => {
      // Riders can access rider-specific endpoints
      await riderAgent
        .get('/api/rides?role=rider')
        .expect(200);
    });

    test('rider should not access driver-only routes', async () => {
      // Riders cannot access driver-only endpoints
      await riderAgent
        .get('/api/rides?role=driver')
        .expect(403);
    });

    test('driver should access driver routes', async () => {
      // Drivers can access driver-specific endpoints
      await driverAgent
        .get('/api/rides?role=driver')
        .expect(200);
    });
  });

  describe('Password Security', () => {
    test('should not return password in response', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          username: `security_test_${Date.now()}`,
          email: `security_${Date.now()}@example.com`,
          fullName: 'Security Test',
          phone: `+1${Math.floor(Math.random() * 1000000000)}`,
          password: 'SecurityTest123!',
          role: 'rider'
        })
        .expect(201);

      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should store password as hash in database', async () => {
      const userData = {
        username: `hash_test_${Date.now()}`,
        email: `hash_${Date.now()}@example.com`,
        fullName: 'Hash Test',
        phone: `+1${Math.floor(Math.random() * 1000000000)}`,
        password: 'HashTest123!',
        role: 'rider'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData);

      // Fetch user from storage directly
      const user = await storage.getUser(response.body.user.id);
      
      // Password should be hashed (not plain text)
      expect(user?.password).not.toBe(userData.password);
      expect(user?.password).toBeTruthy();
      expect(user?.password?.length).toBeGreaterThan(50); // Hashed passwords are long
    });
  });
});
