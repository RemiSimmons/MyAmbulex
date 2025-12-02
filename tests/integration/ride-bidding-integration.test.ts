/**
 * Integration Tests for Ride Booking and Bidding System
 * Tests actual HTTP endpoints using supertest
 * Each test block is independent with its own setup
 */

import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createTestApp } from '../helpers/test-app';
import { storage } from '../../server/storage';

describe('Ride and Bidding Integration Tests', () => {
  let app: any;

  beforeAll(async () => {
    app = createTestApp();
  });

  describe('POST /api/rides', () => {
    let riderAgent: any;

    beforeEach(async () => {
      // Create and login as rider for each test
      const riderData = {
        username: `test_rider_${Date.now()}_${Math.random()}`,
        email: `rider_${Date.now()}_${Math.random()}@example.com`,
        fullName: 'Test Rider',
        phone: `+1${Math.floor(Math.random() * 1000000000)}`,
        password: 'TestRider123!',
        role: 'rider'
      };

      const riderResponse = await request(app)
        .post('/api/register')
        .send(riderData);

      // Complete onboarding for rider
      await storage.updateUserProfile(riderResponse.body.user.id, { isOnboarded: true });

      riderAgent = request.agent(app);
      await riderAgent
        .post('/api/auth/login')
        .send({
          username: riderData.username,
          password: riderData.password
        });
    });

    test('should create a ride request successfully', async () => {
      const rideData = {
        pickupLocation: '123 Main St, Test City, TC 12345',
        pickupLatitude: 40.7128,
        pickupLongitude: -74.0060,
        dropoffLocation: '456 Oak Ave, Test City, TC 12345',
        dropoffLatitude: 40.7580,
        dropoffLongitude: -73.9855,
        scheduledTime: new Date(Date.now() + 86400000).toISOString(),
        estimatedDistance: 5.2,
        estimatedDuration: 15,
        passengerCount: 1,
        notes: 'Test ride request'
      };

      const response = await riderAgent
        .post('/api/rides')
        .send(rideData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.pickupLocation).toBe(rideData.pickupLocation);
      expect(response.body.status).toBe('requested');
      expect(response.body).toHaveProperty('referenceNumber');
    });

    test('should reject ride creation without authentication', async () => {
      const rideData = {
        pickupLocation: '123 Test St',
        dropoffLocation: '456 Test Ave',
        scheduledTime: new Date(Date.now() + 86400000).toISOString()
      };

      await request(app)
        .post('/api/rides')
        .send(rideData)
        .expect(401);
    });
  });

  describe('POST /api/bids', () => {
    let riderAgent: any;
    let driverAgent: any;
    let testRideId: number;

    beforeEach(async () => {
      // Create and login as rider
      const riderData = {
        username: `bid_rider_${Date.now()}_${Math.random()}`,
        email: `bid_rider_${Date.now()}_${Math.random()}@example.com`,
        fullName: 'Bid Test Rider',
        phone: `+1${Math.floor(Math.random() * 1000000000)}`,
        password: 'TestRider123!',
        role: 'rider'
      };

      const riderResponse = await request(app)
        .post('/api/register')
        .send(riderData);

      await storage.updateUserProfile(riderResponse.body.user.id, { isOnboarded: true });

      riderAgent = request.agent(app);
      await riderAgent
        .post('/api/auth/login')
        .send({
          username: riderData.username,
          password: riderData.password
        });

      // Create a ride
      const rideData = {
        pickupLocation: '123 Bid Test St',
        pickupLatitude: 40.7128,
        pickupLongitude: -74.0060,
        dropoffLocation: '456 Bid Test Ave',
        dropoffLatitude: 40.7580,
        dropoffLongitude: -73.9855,
        scheduledTime: new Date(Date.now() + 86400000).toISOString(),
        estimatedDistance: 5.0,
        estimatedDuration: 15,
        passengerCount: 1
      };

      const rideResponse = await riderAgent
        .post('/api/rides')
        .send(rideData);

      testRideId = rideResponse.body.id;

      // Create and login as driver
      const driverData = {
        username: `bid_driver_${Date.now()}_${Math.random()}`,
        email: `bid_driver_${Date.now()}_${Math.random()}@example.com`,
        fullName: 'Bid Test Driver',
        phone: `+1${Math.floor(Math.random() * 1000000000)}`,
        password: 'TestDriver123!',
        role: 'driver'
      };

      const driverResponse = await request(app)
        .post('/api/register')
        .send(driverData);

      // Create driver details and approve
      await storage.createDriverDetails({
        userId: driverResponse.body.user.id,
        licenseNumber: `TEST${Date.now()}`,
        vehicleType: 'sedan',
        vehicleMake: 'Toyota',
        vehicleModel: 'Camry',
        vehicleYear: 2020,
        vehiclePlate: `ABC${Date.now()}`,
        verified: true,
        accountStatus: 'active'
      });

      await storage.updateUserProfile(driverResponse.body.user.id, { isOnboarded: true });

      driverAgent = request.agent(app);
      await driverAgent
        .post('/api/auth/login')
        .send({
          username: driverData.username,
          password: driverData.password
        });
    });

    test('should allow driver to place a bid', async () => {
      const bidData = {
        rideId: testRideId,
        amount: 45.00,
        message: 'I can take this ride',
        estimatedDuration: 15
      };

      const response = await driverAgent
        .post('/api/bids')
        .send(bidData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.rideId).toBe(testRideId);
      expect(response.body.amount).toBe(bidData.amount);
      expect(response.body.status).toBe('pending');
    });

    test('should reject bid from unauthenticated user', async () => {
      const bidData = {
        rideId: testRideId,
        amount: 45.00
      };

      await request(app)
        .post('/api/bids')
        .send(bidData)
        .expect(401);
    });

    test('should reject bid from non-driver role', async () => {
      const bidData = {
        rideId: testRideId,
        amount: 45.00
      };

      // Rider should not be able to place bids
      await riderAgent
        .post('/api/bids')
        .send(bidData)
        .expect(403);
    });

    test('should reject bid without required fields', async () => {
      const bidData = {
        rideId: testRideId
        // Missing amount
      };

      await driverAgent
        .post('/api/bids')
        .send(bidData)
        .expect(400);
    });

    test('should reject duplicate bid from same driver', async () => {
      const bidData = {
        rideId: testRideId,
        amount: 45.00
      };

      // First bid should succeed
      await driverAgent
        .post('/api/bids')
        .send(bidData)
        .expect(201);

      // Second bid should fail
      const response = await driverAgent
        .post('/api/bids')
        .send(bidData)
        .expect(400);

      expect(response.body.error).toContain('already bid');
    });
  });

  describe('GET /api/rides', () => {
    let riderAgent: any;
    let driverAgent: any;

    beforeEach(async () => {
      // Create and login as rider
      const riderData = {
        username: `get_rider_${Date.now()}_${Math.random()}`,
        email: `get_rider_${Date.now()}_${Math.random()}@example.com`,
        fullName: 'Get Test Rider',
        phone: `+1${Math.floor(Math.random() * 1000000000)}`,
        password: 'TestRider123!',
        role: 'rider'
      };

      const riderResponse = await request(app)
        .post('/api/register')
        .send(riderData);

      await storage.updateUserProfile(riderResponse.body.user.id, { isOnboarded: true });

      riderAgent = request.agent(app);
      await riderAgent
        .post('/api/auth/login')
        .send({
          username: riderData.username,
          password: riderData.password
        });

      // Create and login as driver
      const driverData = {
        username: `get_driver_${Date.now()}_${Math.random()}`,
        email: `get_driver_${Date.now()}_${Math.random()}@example.com`,
        fullName: 'Get Test Driver',
        phone: `+1${Math.floor(Math.random() * 1000000000)}`,
        password: 'TestDriver123!',
        role: 'driver'
      };

      const driverResponse = await request(app)
        .post('/api/register')
        .send(driverData);

      await storage.createDriverDetails({
        userId: driverResponse.body.user.id,
        licenseNumber: `TEST${Date.now()}`,
        vehicleType: 'sedan',
        vehicleMake: 'Toyota',
        vehicleModel: 'Camry',
        vehicleYear: 2020,
        vehiclePlate: `ABC${Date.now()}`,
        verified: true,
        accountStatus: 'active'
      });

      await storage.updateUserProfile(driverResponse.body.user.id, { isOnboarded: true });

      driverAgent = request.agent(app);
      await driverAgent
        .post('/api/auth/login')
        .send({
          username: driverData.username,
          password: driverData.password
        });
    });

    test('should return rides for authenticated rider', async () => {
      const response = await riderAgent
        .get('/api/rides?role=rider')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should reject unauthenticated access', async () => {
      await request(app)
        .get('/api/rides?role=rider')
        .expect(401);
    });

    test('should return available rides for authenticated driver', async () => {
      const response = await driverAgent
        .get('/api/rides?role=driver')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should reject non-driver access to driver routes', async () => {
      await riderAgent
        .get('/api/rides?role=driver')
        .expect(403);
    });
  });

  describe('Complete Ride-Bidding Workflow', () => {
    test('rider creates ride, driver bids, rider can view bids', async () => {
      // Setup: Create rider
      const riderData = {
        username: `workflow_rider_${Date.now()}_${Math.random()}`,
        email: `workflow_rider_${Date.now()}_${Math.random()}@example.com`,
        fullName: 'Workflow Rider',
        phone: `+1${Math.floor(Math.random() * 1000000000)}`,
        password: 'TestRider123!',
        role: 'rider'
      };

      const riderResponse = await request(app)
        .post('/api/register')
        .send(riderData);

      const riderId = riderResponse.body.user.id;
      await storage.updateUserProfile(riderId, { isOnboarded: true });

      const riderAgent = request.agent(app);
      await riderAgent
        .post('/api/auth/login')
        .send({
          username: riderData.username,
          password: riderData.password
        });

      // Setup: Create driver
      const driverData = {
        username: `workflow_driver_${Date.now()}_${Math.random()}`,
        email: `workflow_driver_${Date.now()}_${Math.random()}@example.com`,
        fullName: 'Workflow Driver',
        phone: `+1${Math.floor(Math.random() * 1000000000)}`,
        password: 'TestDriver123!',
        role: 'driver'
      };

      const driverResponse = await request(app)
        .post('/api/register')
        .send(driverData);

      const driverId = driverResponse.body.user.id;

      await storage.createDriverDetails({
        userId: driverId,
        licenseNumber: `WORKFLOW${Date.now()}`,
        vehicleType: 'sedan',
        vehicleMake: 'Toyota',
        vehicleModel: 'Camry',
        vehicleYear: 2020,
        vehiclePlate: `WF${Date.now()}`,
        verified: true,
        accountStatus: 'active'
      });

      await storage.updateUserProfile(driverId, { isOnboarded: true });

      const driverAgent = request.agent(app);
      await driverAgent
        .post('/api/auth/login')
        .send({
          username: driverData.username,
          password: driverData.password
        });

      // Step 1: Rider creates a ride
      const rideData = {
        pickupLocation: 'Workflow Test Pickup',
        pickupLatitude: 40.7128,
        pickupLongitude: -74.0060,
        dropoffLocation: 'Workflow Test Dropoff',
        dropoffLatitude: 40.7580,
        dropoffLongitude: -73.9855,
        scheduledTime: new Date(Date.now() + 86400000).toISOString(),
        estimatedDistance: 5.0,
        estimatedDuration: 15,
        passengerCount: 1
      };

      const rideResponse = await riderAgent
        .post('/api/rides')
        .send(rideData)
        .expect(201);

      const rideId = rideResponse.body.id;
      expect(rideResponse.body.status).toBe('requested');

      // Step 2: Driver places a bid
      const bidData = {
        rideId: rideId,
        amount: 50.00,
        message: 'I can help with this ride'
      };

      const bidResponse = await driverAgent
        .post('/api/bids')
        .send(bidData)
        .expect(201);

      expect(bidResponse.body.rideId).toBe(rideId);
      expect(bidResponse.body.status).toBe('pending');

      // Step 3: Rider views bids for their ride
      const bidsResponse = await riderAgent
        .get(`/api/rides/${rideId}/bids`)
        .expect(200);

      expect(Array.isArray(bidsResponse.body)).toBe(true);
      expect(bidsResponse.body.length).toBeGreaterThan(0);
      
      const driverBid = bidsResponse.body.find((bid: any) => bid.driverId === driverId);
      expect(driverBid).toBeDefined();
      expect(driverBid.amount).toBe(bidData.amount);
    });
  });
});
