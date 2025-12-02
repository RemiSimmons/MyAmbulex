/**
 * Unit Tests for Payment Processing
 * Tests Stripe and PayPal integration, error handling, and edge cases
 */

const { describe, test, expect, beforeEach, afterEach, jest } = require('@jest/globals');

// Mock Stripe and PayPal SDKs
jest.mock('stripe');
jest.mock('@paypal/paypal-server-sdk');

const Stripe = require('stripe');
const { createPaypalOrder, capturePaypalOrder } = require('../../server/paypal');

describe('Payment Processing Unit Tests', () => {
  let mockStripe;
  let mockRequest;
  let mockResponse;

  beforeEach(() => {
    // Reset mocks
    mockStripe = {
      paymentIntents: {
        create: jest.fn(),
        retrieve: jest.fn(),
        confirm: jest.fn(),
        cancel: jest.fn()
      },
      customers: {
        create: jest.fn(),
        retrieve: jest.fn(),
        update: jest.fn()
      },
      subscriptions: {
        create: jest.fn(),
        retrieve: jest.fn(),
        update: jest.fn(),
        cancel: jest.fn()
      }
    };

    Stripe.mockImplementation(() => mockStripe);

    mockRequest = {
      body: {},
      user: { id: 1, email: 'test@example.com' },
      isAuthenticated: () => true
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      sendStatus: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Stripe Payment Intent Creation', () => {
    test('should create payment intent with valid amount', async () => {
      const amount = 2500; // $25.00
      mockRequest.body = { amount };

      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret_test',
        amount: 2500,
        currency: 'usd',
        status: 'requires_payment_method'
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // Import the route handler
      const { createPaymentIntent } = require('../../server/stripe-service');
      await createPaymentIntent(mockRequest, mockResponse);

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 2500,
        currency: 'usd',
        metadata: expect.any(Object)
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        clientSecret: 'pi_test123_secret_test',
        paymentIntentId: 'pi_test123'
      });
    });

    test('should reject invalid amount', async () => {
      mockRequest.body = { amount: -100 };

      const { createPaymentIntent } = require('../../server/stripe-service');
      await createPaymentIntent(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid amount. Amount must be a positive number.'
      });
    });

    test('should handle Stripe API errors', async () => {
      mockRequest.body = { amount: 2500 };
      
      const stripeError = new Error('Your card was declined.');
      stripeError.type = 'StripeCardError';
      stripeError.code = 'card_declined';
      
      mockStripe.paymentIntents.create.mockRejectedValue(stripeError);

      const { createPaymentIntent } = require('../../server/stripe-service');
      await createPaymentIntent(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: expect.stringContaining('card was declined')
      });
    });
  });

  describe('Stripe Customer Management', () => {
    test('should create customer with valid data', async () => {
      const customerData = {
        email: 'test@example.com',
        name: 'John Doe',
        phone: '+1234567890'
      };

      const mockCustomer = {
        id: 'cus_test123',
        email: 'test@example.com',
        name: 'John Doe'
      };

      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      const { createCustomer } = require('../../server/stripe-service');
      const result = await createCustomer(customerData);

      expect(mockStripe.customers.create).toHaveBeenCalledWith(customerData);
      expect(result.id).toBe('cus_test123');
    });

    test('should handle duplicate customer email', async () => {
      const customerData = { email: 'duplicate@example.com' };
      
      const stripeError = new Error('Customer already exists');
      stripeError.type = 'StripeInvalidRequestError';
      
      mockStripe.customers.create.mockRejectedValue(stripeError);

      const { createCustomer } = require('../../server/stripe-service');
      
      await expect(createCustomer(customerData)).rejects.toThrow('Customer already exists');
    });
  });

  describe('PayPal Integration', () => {
    test('should create PayPal order with valid data', async () => {
      mockRequest.body = {
        amount: '25.00',
        currency: 'USD',
        intent: 'CAPTURE'
      };

      // Mock PayPal response
      const mockOrderResponse = {
        body: JSON.stringify({
          id: 'PAYPAL_ORDER_123',
          status: 'CREATED',
          links: [
            { rel: 'approve', href: 'https://paypal.com/approve' }
          ]
        }),
        statusCode: 201
      };

      // Mock the PayPal SDK
      jest.doMock('@paypal/paypal-server-sdk', () => ({
        OrdersController: jest.fn().mockImplementation(() => ({
          createOrder: jest.fn().mockResolvedValue(mockOrderResponse)
        }))
      }));

      await createPaypalOrder(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'PAYPAL_ORDER_123',
          status: 'CREATED'
        })
      );
    });

    test('should validate PayPal order amount', async () => {
      mockRequest.body = {
        amount: 'invalid',
        currency: 'USD',
        intent: 'CAPTURE'
      };

      await createPaypalOrder(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid amount. Amount must be a positive number.'
      });
    });

    test('should capture PayPal order', async () => {
      mockRequest.params = { orderID: 'PAYPAL_ORDER_123' };

      const mockCaptureResponse = {
        body: JSON.stringify({
          id: 'PAYPAL_ORDER_123',
          status: 'COMPLETED',
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id: 'CAPTURE_123',
                    status: 'COMPLETED',
                    amount: { value: '25.00', currency_code: 'USD' }
                  }
                ]
              }
            }
          ]
        }),
        statusCode: 200
      };

      // Mock the capture function
      jest.doMock('@paypal/paypal-server-sdk', () => ({
        OrdersController: jest.fn().mockImplementation(() => ({
          captureOrder: jest.fn().mockResolvedValue(mockCaptureResponse)
        }))
      }));

      await capturePaypalOrder(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'PAYPAL_ORDER_123',
          status: 'COMPLETED'
        })
      );
    });
  });

  describe('Payment Validation', () => {
    test('should validate minimum payment amount', () => {
      const { validatePaymentAmount } = require('../../server/payment-service');
      
      expect(validatePaymentAmount(100)).toBe(true);   // $1.00 minimum
      expect(validatePaymentAmount(50)).toBe(false);   // Below minimum
      expect(validatePaymentAmount(-100)).toBe(false); // Negative
      expect(validatePaymentAmount(0)).toBe(false);    // Zero
    });

    test('should validate maximum payment amount', () => {
      const { validatePaymentAmount } = require('../../server/payment-service');
      
      expect(validatePaymentAmount(500000)).toBe(true);  // $5000 maximum
      expect(validatePaymentAmount(600000)).toBe(false); // Above maximum
    });

    test('should validate currency codes', () => {
      const { validateCurrency } = require('../../server/payment-service');
      
      expect(validateCurrency('USD')).toBe(true);
      expect(validateCurrency('CAD')).toBe(true);
      expect(validateCurrency('EUR')).toBe(true);
      expect(validateCurrency('XXX')).toBe(false); // Invalid currency
    });
  });

  describe('Error Handling', () => {
    test('should handle network timeouts', async () => {
      mockRequest.body = { amount: 2500 };
      
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ETIMEDOUT';
      
      mockStripe.paymentIntents.create.mockRejectedValue(timeoutError);

      const { createPaymentIntent } = require('../../server/stripe-service');
      await createPaymentIntent(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Service temporarily unavailable. Please try again.'
      });
    });

    test('should handle insufficient funds', async () => {
      mockRequest.body = { amount: 2500 };
      
      const insufficientFundsError = new Error('Insufficient funds');
      insufficientFundsError.code = 'insufficient_funds';
      
      mockStripe.paymentIntents.create.mockRejectedValue(insufficientFundsError);

      const { createPaymentIntent } = require('../../server/stripe-service');
      await createPaymentIntent(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient funds. Please check your payment method.'
      });
    });
  });

  describe('Security Tests', () => {
    test('should require authentication for payment creation', async () => {
      mockRequest.isAuthenticated = () => false;
      mockRequest.body = { amount: 2500 };

      const { createPaymentIntent } = require('../../server/stripe-service');
      await createPaymentIntent(mockRequest, mockResponse);

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(401);
    });

    test('should sanitize payment metadata', async () => {
      mockRequest.body = {
        amount: 2500,
        metadata: {
          rideId: '123',
          userId: '456',
          maliciousScript: '<script>alert("xss")</script>'
        }
      };

      const { sanitizePaymentMetadata } = require('../../server/payment-service');
      const sanitized = sanitizePaymentMetadata(mockRequest.body.metadata);

      expect(sanitized.maliciousScript).not.toContain('<script>');
      expect(sanitized.rideId).toBe('123');
      expect(sanitized.userId).toBe('456');
    });
  });

  describe('Performance Tests', () => {
    test('should complete payment intent creation within 2 seconds', async () => {
      mockRequest.body = { amount: 2500 };
      
      const startTime = Date.now();
      
      mockStripe.paymentIntents.create.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            id: 'pi_test123',
            client_secret: 'pi_test123_secret'
          }), 100)
        )
      );

      const { createPaymentIntent } = require('../../server/stripe-service');
      await createPaymentIntent(mockRequest, mockResponse);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // 2 second maximum
    });

    test('should handle concurrent payment requests', async () => {
      const requests = Array(10).fill().map((_, i) => ({
        body: { amount: 2500 + i },
        user: { id: i + 1 },
        isAuthenticated: () => true
      }));

      const responses = requests.map(() => ({
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      }));

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_test123',
        client_secret: 'pi_test123_secret'
      });

      const { createPaymentIntent } = require('../../server/stripe-service');
      
      const promises = requests.map((req, i) => 
        createPaymentIntent(req, responses[i])
      );

      await Promise.all(promises);

      // All requests should complete successfully
      responses.forEach(res => {
        expect(res.json).toHaveBeenCalled();
      });
    });
  });
});

module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/index.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};