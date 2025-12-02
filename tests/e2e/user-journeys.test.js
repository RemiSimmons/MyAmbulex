/**
 * End-to-End Testing for Complete User Journeys
 * Tests full user workflows from registration to ride completion
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5000';
const TEST_TIMEOUT = 60000; // 60 seconds per test

test.describe('Complete User Journeys - End-to-End Tests', () => {
  
  test.describe('Rider Journey', () => {
    let page;

    test.beforeEach(async ({ browser }) => {
      page = await browser.newPage();
      
      // Set up test data
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
    });

    test('Complete rider registration and first ride booking', async () => {
      test.setTimeout(TEST_TIMEOUT);

      // Step 1: Registration
      await page.click('[data-testid="register-button"]');
      await page.fill('[data-testid="full-name-input"]', 'Test Rider');
      await page.fill('[data-testid="email-input"]', `test.rider.${Date.now()}@example.com`);
      await page.fill('[data-testid="phone-input"]', '+1234567890');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.selectOption('[data-testid="role-select"]', 'rider');
      
      await page.click('[data-testid="register-submit"]');
      await page.waitForURL('**/rider/dashboard');

      // Verify registration success
      await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();

      // Step 2: Complete profile
      await page.click('[data-testid="complete-profile-button"]');
      await page.fill('[data-testid="emergency-contact-name"]', 'Jane Doe');
      await page.fill('[data-testid="emergency-contact-phone"]', '+0987654321');
      await page.selectOption('[data-testid="mobility-requirements"]', 'wheelchair');
      
      await page.click('[data-testid="save-profile"]');
      await expect(page.locator('[data-testid="profile-complete-success"]')).toBeVisible();

      // Step 3: Add payment method
      await page.click('[data-testid="add-payment-method"]');
      
      // Fill in test credit card (Stripe test card)
      await page.frameLocator('iframe[name="__privateStripeFrame"]')
        .locator('[placeholder="Card number"]')
        .fill('4242424242424242');
      
      await page.frameLocator('iframe[name="__privateStripeFrame"]')
        .locator('[placeholder="MM / YY"]')
        .fill('12/25');
      
      await page.frameLocator('iframe[name="__privateStripeFrame"]')
        .locator('[placeholder="CVC"]')
        .fill('123');

      await page.click('[data-testid="save-payment-method"]');
      await expect(page.locator('[data-testid="payment-method-added"]')).toBeVisible();

      // Step 4: Book first ride
      await page.click('[data-testid="book-ride-button"]');
      
      // Set pickup location
      await page.fill('[data-testid="pickup-input"]', '123 Main St, Anytown, ST 12345');
      await page.waitForTimeout(2000); // Wait for autocomplete
      await page.click('[data-testid="pickup-suggestion-0"]');

      // Set dropoff location
      await page.fill('[data-testid="dropoff-input"]', '456 Oak Ave, Anytown, ST 12345');
      await page.waitForTimeout(2000);
      await page.click('[data-testid="dropoff-suggestion-0"]');

      // Select ride date and time
      await page.click('[data-testid="ride-date-picker"]');
      await page.click('[data-testid="tomorrow-option"]');
      await page.selectOption('[data-testid="ride-time-select"]', '10:00');

      // Add accessibility requirements
      await page.check('[data-testid="wheelchair-accessible"]');
      
      // Add special instructions
      await page.fill('[data-testid="special-instructions"]', 'Please call upon arrival');

      await page.click('[data-testid="get-fare-estimates"]');
      await page.waitForSelector('[data-testid="fare-estimates"]');

      // Verify fare estimates are displayed
      await expect(page.locator('[data-testid="estimated-fare"]')).toBeVisible();

      await page.click('[data-testid="confirm-booking"]');
      await page.waitForURL('**/rider/ride/**');

      // Verify booking success
      await expect(page.locator('[data-testid="booking-confirmed"]')).toBeVisible();
      await expect(page.locator('[data-testid="reference-number"]')).toBeVisible();

      // Step 5: Monitor ride progress
      const referenceNumber = await page.locator('[data-testid="reference-number"]').textContent();
      expect(referenceNumber).toMatch(/MA-\d{6}-\d{4}/);

      // Wait for driver bids
      await page.waitForSelector('[data-testid="driver-bids"]', { timeout: 30000 });
      await expect(page.locator('[data-testid="bid-item"]').first()).toBeVisible();

      // Select first driver bid
      await page.click('[data-testid="select-bid-button"]').first();
      await page.click('[data-testid="confirm-driver-selection"]');

      // Verify driver selection
      await expect(page.locator('[data-testid="driver-assigned"]')).toBeVisible();
      await expect(page.locator('[data-testid="driver-name"]')).toBeVisible();

      // Step 6: Payment processing
      await page.waitForSelector('[data-testid="payment-required"]');
      await page.click('[data-testid="pay-now-button"]');

      // Confirm payment with saved payment method
      await page.click('[data-testid="confirm-payment"]');
      await page.waitForSelector('[data-testid="payment-success"]');

      // Verify payment success
      await expect(page.locator('[data-testid="payment-confirmed"]')).toBeVisible();
      await expect(page.locator('[data-testid="receipt-available"]')).toBeVisible();

      // Step 7: Track ride in real-time
      await page.click('[data-testid="track-ride-button"]');
      await page.waitForSelector('[data-testid="live-map"]');

      // Verify tracking features
      await expect(page.locator('[data-testid="driver-location"]')).toBeVisible();
      await expect(page.locator('[data-testid="eta-display"]')).toBeVisible();
      await expect(page.locator('[data-testid="ride-status"]')).toBeVisible();

      // Test messaging feature
      await page.click('[data-testid="message-driver-button"]');
      await page.fill('[data-testid="message-input"]', 'Looking forward to the ride!');
      await page.click('[data-testid="send-message"]');
      
      await expect(page.locator('[data-testid="message-sent"]')).toBeVisible();
    });

    test('Recurring appointment booking', async () => {
      // Login as existing rider
      await page.goto(`${BASE_URL}/auth`);
      await page.fill('[data-testid="email-input"]', 'existing.rider@test.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await page.waitForURL('**/rider/dashboard');

      // Navigate to recurring appointments
      await page.click('[data-testid="recurring-appointments-menu"]');
      await page.click('[data-testid="new-recurring-appointment"]');

      // Set up recurring appointment
      await page.fill('[data-testid="appointment-name"]', 'Weekly Dialysis');
      await page.fill('[data-testid="pickup-location"]', 'Home Address');
      await page.fill('[data-testid="dropoff-location"]', 'City Medical Center');
      
      await page.selectOption('[data-testid="frequency"]', 'weekly');
      await page.selectOption('[data-testid="day-of-week"]', 'monday');
      await page.selectOption('[data-testid="time-slot"]', '09:00');
      
      await page.fill('[data-testid="end-date"]', '2025-12-31');
      
      await page.click('[data-testid="save-recurring-appointment"]');

      // Verify recurring appointment created
      await expect(page.locator('[data-testid="appointment-saved"]')).toBeVisible();
      await expect(page.locator('[data-testid="next-appointment-date"]')).toBeVisible();
    });
  });

  test.describe('Driver Journey', () => {
    let page;

    test.beforeEach(async ({ browser }) => {
      page = await browser.newPage();
      await page.goto(BASE_URL);
    });

    test('Complete driver registration and first ride acceptance', async () => {
      test.setTimeout(TEST_TIMEOUT);

      // Step 1: Driver registration
      await page.click('[data-testid="register-button"]');
      await page.fill('[data-testid="full-name-input"]', 'Test Driver');
      await page.fill('[data-testid="email-input"]', `test.driver.${Date.now()}@example.com`);
      await page.fill('[data-testid="phone-input"]', '+1234567891');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.selectOption('[data-testid="role-select"]', 'driver');
      
      await page.click('[data-testid="register-submit"]');
      await page.waitForURL('**/driver/onboarding');

      // Step 2: Complete driver onboarding
      // Personal information
      await page.fill('[data-testid="drivers-license"]', 'DL123456789');
      await page.fill('[data-testid="license-expiry"]', '2026-12-31');
      
      // Vehicle information
      await page.fill('[data-testid="vehicle-make"]', 'Toyota');
      await page.fill('[data-testid="vehicle-model"]', 'Sienna');
      await page.fill('[data-testid="vehicle-year"]', '2022');
      await page.fill('[data-testid="license-plate"]', 'ABC123');
      
      // Vehicle capabilities
      await page.check('[data-testid="wheelchair-accessible"]');
      await page.check('[data-testid="stretcher-capable"]');
      
      // Insurance information
      await page.fill('[data-testid="insurance-provider"]', 'State Farm');
      await page.fill('[data-testid="policy-number"]', 'SF123456789');
      await page.fill('[data-testid="insurance-expiry"]', '2025-12-31');

      // Upload documents
      await page.setInputFiles('[data-testid="drivers-license-upload"]', 'tests/fixtures/drivers-license.pdf');
      await page.setInputFiles('[data-testid="insurance-upload"]', 'tests/fixtures/insurance.pdf');
      await page.setInputFiles('[data-testid="vehicle-registration-upload"]', 'tests/fixtures/registration.pdf');

      await page.click('[data-testid="submit-onboarding"]');
      
      // Verify onboarding completion
      await expect(page.locator('[data-testid="onboarding-complete"]')).toBeVisible();
      await expect(page.locator('[data-testid="verification-pending"]')).toBeVisible();

      // Step 3: Set availability
      await page.click('[data-testid="set-availability"]');
      
      // Set weekly schedule
      await page.check('[data-testid="monday-available"]');
      await page.selectOption('[data-testid="monday-start"]', '08:00');
      await page.selectOption('[data-testid="monday-end"]', '18:00');
      
      await page.check('[data-testid="tuesday-available"]');
      await page.selectOption('[data-testid="tuesday-start"]', '08:00');
      await page.selectOption('[data-testid="tuesday-end"]', '18:00');

      await page.click('[data-testid="save-availability"]');
      await expect(page.locator('[data-testid="availability-saved"]')).toBeVisible();

      // Step 4: Configure ride filters
      await page.click('[data-testid="configure-ride-filters"]');
      
      await page.fill('[data-testid="max-distance"]', '25');
      await page.selectOption('[data-testid="min-fare"]', '15');
      await page.check('[data-testid="wheelchair-rides"]');
      await page.check('[data-testid="dialysis-rides"]');
      
      await page.click('[data-testid="save-filters"]');
      await expect(page.locator('[data-testid="filters-saved"]')).toBeVisible();

      // Step 5: Go online and accept rides
      await page.click('[data-testid="go-online-button"]');
      await expect(page.locator('[data-testid="driver-online"]')).toBeVisible();

      // Wait for ride request notification
      await page.waitForSelector('[data-testid="ride-request-notification"]', { timeout: 30000 });
      
      // View ride details
      await page.click('[data-testid="view-ride-details"]');
      await expect(page.locator('[data-testid="ride-details-modal"]')).toBeVisible();
      
      // Submit bid
      await page.fill('[data-testid="bid-amount"]', '22.50');
      await page.fill('[data-testid="bid-message"]', 'Experienced medical transport driver');
      await page.click('[data-testid="submit-bid"]');
      
      await expect(page.locator('[data-testid="bid-submitted"]')).toBeVisible();

      // Step 6: Ride acceptance and execution
      // Wait for bid acceptance
      await page.waitForSelector('[data-testid="bid-accepted"]', { timeout: 60000 });
      await expect(page.locator('[data-testid="ride-assigned"]')).toBeVisible();

      // Start journey to pickup
      await page.click('[data-testid="start-to-pickup"]');
      await expect(page.locator('[data-testid="en-route-to-pickup"]')).toBeVisible();

      // Arrive at pickup
      await page.click('[data-testid="arrived-at-pickup"]');
      await page.fill('[data-testid="arrival-notes"]', 'Parked in front of building');
      await page.click('[data-testid="confirm-arrival"]');

      // Start ride
      await page.click('[data-testid="start-ride"]');
      await expect(page.locator('[data-testid="ride-in-progress"]')).toBeVisible();

      // Complete ride
      await page.click('[data-testid="complete-ride"]');
      await page.fill('[data-testid="completion-notes"]', 'Passenger safely delivered');
      await page.selectOption('[data-testid="ride-rating"]', '5');
      await page.click('[data-testid="confirm-completion"]');

      // Verify ride completion
      await expect(page.locator('[data-testid="ride-completed"]')).toBeVisible();
      await expect(page.locator('[data-testid="earnings-updated"]')).toBeVisible();
    });
  });

  test.describe('Admin Journey', () => {
    let page;

    test.beforeEach(async ({ browser }) => {
      page = await browser.newPage();
      
      // Login as admin
      await page.goto(`${BASE_URL}/auth`);
      await page.fill('[data-testid="email-input"]', 'admin@myambulex.com');
      await page.fill('[data-testid="password-input"]', 'admin123');
      await page.click('[data-testid="login-button"]');
      
      await page.waitForURL('**/admin/dashboard');
    });

    test('Complete admin ride management workflow', async () => {
      // Step 1: Monitor active rides
      await page.click('[data-testid="active-rides-tab"]');
      await expect(page.locator('[data-testid="rides-table"]')).toBeVisible();

      // Step 2: Handle dispute resolution
      await page.click('[data-testid="disputes-tab"]');
      
      if (await page.locator('[data-testid="dispute-item"]').isVisible()) {
        await page.click('[data-testid="dispute-item"]').first();
        
        // Review dispute details
        await expect(page.locator('[data-testid="dispute-details"]')).toBeVisible();
        
        // Resolve dispute
        await page.selectOption('[data-testid="resolution-action"]', 'refund_rider');
        await page.fill('[data-testid="resolution-notes"]', 'Full refund issued due to driver no-show');
        await page.click('[data-testid="resolve-dispute"]');
        
        await expect(page.locator('[data-testid="dispute-resolved"]')).toBeVisible();
      }

      // Step 3: Driver verification management
      await page.click('[data-testid="driver-verification-tab"]');
      
      if (await page.locator('[data-testid="pending-verification"]').isVisible()) {
        await page.click('[data-testid="review-documents"]').first();
        
        // Review uploaded documents
        await expect(page.locator('[data-testid="document-viewer"]')).toBeVisible();
        
        // Approve driver
        await page.selectOption('[data-testid="verification-decision"]', 'approved');
        await page.fill('[data-testid="approval-notes"]', 'All documents verified and approved');
        await page.click('[data-testid="save-verification"]');
        
        await expect(page.locator('[data-testid="driver-approved"]')).toBeVisible();
      }

      // Step 4: System monitoring
      await page.click('[data-testid="system-monitoring-tab"]');
      
      // Check system health metrics
      await expect(page.locator('[data-testid="system-uptime"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-users"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-times"]')).toBeVisible();
      
      // Verify no critical alerts
      const criticalAlerts = await page.locator('[data-testid="critical-alert"]').count();
      expect(criticalAlerts).toBe(0);
    });
  });

  test.describe('Cross-Platform Compatibility', () => {
    
    test('Mobile responsiveness - Rider booking flow', async ({ browser }) => {
      // Test on mobile viewport
      const context = await browser.newContext({
        viewport: { width: 375, height: 667 }, // iPhone SE
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      });
      
      const page = await context.newPage();
      await page.goto(BASE_URL);

      // Test mobile navigation
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

      // Test mobile booking form
      await page.click('[data-testid="book-ride-mobile"]');
      
      // Verify touch-friendly interface
      const pickupInput = page.locator('[data-testid="pickup-input"]');
      await expect(pickupInput).toHaveCSS('min-height', '44px'); // iOS touch target size

      // Test mobile payment flow
      await page.fill('[data-testid="pickup-input"]', '123 Test St');
      await page.fill('[data-testid="dropoff-input"]', '456 Test Ave');
      await page.click('[data-testid="get-estimates-mobile"]');

      await expect(page.locator('[data-testid="mobile-fare-display"]')).toBeVisible();
    });

    test('Tablet interface - Driver dashboard', async ({ browser }) => {
      // Test on tablet viewport
      const context = await browser.newContext({
        viewport: { width: 768, height: 1024 }, // iPad
      });
      
      const page = await context.newPage();
      
      // Login as driver
      await page.goto(`${BASE_URL}/auth`);
      await page.fill('[data-testid="email-input"]', 'driver@test.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await page.waitForURL('**/driver/dashboard');

      // Test tablet layout
      await expect(page.locator('[data-testid="tablet-sidebar"]')).toBeVisible();
      await expect(page.locator('[data-testid="main-content"]')).toHaveCSS('margin-left', '250px');

      // Test split-screen ride management
      await page.click('[data-testid="available-rides"]');
      await expect(page.locator('[data-testid="rides-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="ride-map"]')).toBeVisible();
    });
  });

  test.describe('Performance Validation', () => {
    
    test('Page load performance', async ({ page }) => {
      // Measure homepage load time
      const startTime = Date.now();
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(3000); // 3 second maximum

      // Check Core Web Vitals
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitals = {};
            
            entries.forEach((entry) => {
              if (entry.name === 'largest-contentful-paint') {
                vitals.lcp = entry.startTime;
              }
              if (entry.name === 'first-input-delay') {
                vitals.fid = entry.processingStart - entry.startTime;
              }
              if (entry.name === 'cumulative-layout-shift') {
                vitals.cls = entry.value;
              }
            });
            
            resolve(vitals);
          }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
        });
      });

      // Verify Core Web Vitals thresholds
      if (metrics.lcp) expect(metrics.lcp).toBeLessThan(2500); // LCP < 2.5s
      if (metrics.fid) expect(metrics.fid).toBeLessThan(100);   // FID < 100ms
      if (metrics.cls) expect(metrics.cls).toBeLessThan(0.1);   // CLS < 0.1
    });

    test('API response times', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Monitor API calls
      const apiCalls = [];
      
      page.on('response', response => {
        if (response.url().includes('/api/')) {
          apiCalls.push({
            url: response.url(),
            status: response.status(),
            timing: response.timing()
          });
        }
      });

      // Trigger API calls by navigating and interacting
      await page.click('[data-testid="book-ride-button"]');
      await page.fill('[data-testid="pickup-input"]', '123 Test Street');
      
      // Wait for API calls to complete
      await page.waitForTimeout(2000);

      // Verify API response times
      apiCalls.forEach(call => {
        expect(call.status).toBeLessThan(400); // No client/server errors
        expect(call.timing.responseEnd - call.timing.requestStart).toBeLessThan(2000); // < 2s response time
      });
    });
  });
});

module.exports = {
  use: {
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  timeout: 60000,
  retries: 2,
  workers: 2
};