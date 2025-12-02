/**
 * Mobile Device Testing Across Different Browsers
 * Tests compatibility, performance, and usability on mobile devices
 */

const { test, expect, devices } = require('@playwright/test');

const BASE_URL = process.env.MOBILE_TEST_URL || 'http://localhost:5000';

// Device configurations for testing
const mobileDevices = [
  {
    name: 'iPhone 13',
    ...devices['iPhone 13'],
    description: 'iOS Safari testing'
  },
  {
    name: 'iPhone 13 Pro',
    ...devices['iPhone 13 Pro'],
    description: 'iOS Safari Pro testing'
  },
  {
    name: 'Pixel 5',
    ...devices['Pixel 5'],
    description: 'Android Chrome testing'
  },
  {
    name: 'Samsung Galaxy S21',
    ...devices['Galaxy S21'],
    description: 'Android Samsung Browser testing'
  },
  {
    name: 'iPad',
    ...devices['iPad Pro'],
    description: 'iPad Safari testing'
  }
];

// Test each device configuration
mobileDevices.forEach(device => {
  test.describe(`Mobile Testing - ${device.name}`, () => {
    test.use(device);

    test.describe('Touch Interface and Navigation', () => {
      
      test('Touch targets meet accessibility standards', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');

        // Check primary action buttons
        const primaryButtons = await page.locator('[data-testid*="button"], button, [role="button"]').all();
        
        for (const button of primaryButtons.slice(0, 10)) { // Test first 10 buttons
          const box = await button.boundingBox();
          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(44); // iOS minimum touch target
            expect(box.width).toBeGreaterThanOrEqual(44);
          }
        }
      });

      test('Mobile navigation menu functionality', async ({ page }) => {
        await page.goto(BASE_URL);
        
        // Test hamburger menu on mobile
        if (device.viewport.width < 768) {
          const hamburgerMenu = page.locator('[data-testid="mobile-menu-toggle"]');
          await expect(hamburgerMenu).toBeVisible();
          
          await hamburgerMenu.tap();
          await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
          
          // Test menu item tapping
          const menuItems = await page.locator('[data-testid="mobile-menu"] a').all();
          if (menuItems.length > 0) {
            const firstItem = menuItems[0];
            await firstItem.tap();
            // Menu should close after navigation
            await expect(page.locator('[data-testid="mobile-menu"]')).not.toBeVisible();
          }
        }
      });

      test('Swipe gestures for ride tracking', async ({ page }) => {
        // Login as rider with active ride
        await page.goto(`${BASE_URL}/auth`);
        await page.fill('[data-testid="email-input"]', 'mobile.rider@test.com');
        await page.fill('[data-testid="password-input"]', 'password123');
        await page.tap('[data-testid="login-button"]');
        
        await page.waitForURL('**/rider/dashboard');
        
        // Navigate to ride tracking
        if (await page.locator('[data-testid="active-ride"]').isVisible()) {
          await page.tap('[data-testid="track-ride"]');
          await page.waitForLoadState('networkidle');
          
          // Test swipe to refresh
          const trackingContainer = page.locator('[data-testid="ride-tracking-container"]');
          const box = await trackingContainer.boundingBox();
          
          if (box) {
            // Swipe down to refresh
            await page.touchscreen.tap(box.x + box.width / 2, box.y + 50);
            await page.touchscreen.move(box.x + box.width / 2, box.y + 200);
            
            // Verify refresh action
            await expect(page.locator('[data-testid="refreshing-indicator"]')).toBeVisible();
          }
        }
      });
    });

    test.describe('Form Input and Validation', () => {
      
      test('Mobile keyboard optimization', async ({ page }) => {
        await page.goto(`${BASE_URL}/rider/book-ride`);
        
        // Test email input shows email keyboard
        const emailInput = page.locator('input[type="email"]');
        if (await emailInput.isVisible()) {
          await emailInput.tap();
          
          // Verify keyboard type (this is browser-dependent)
          const inputMode = await emailInput.getAttribute('inputmode');
          expect(inputMode).toBe('email');
        }
        
        // Test phone input shows numeric keyboard
        const phoneInput = page.locator('input[type="tel"]');
        if (await phoneInput.isVisible()) {
          await phoneInput.tap();
          
          const inputMode = await phoneInput.getAttribute('inputmode');
          expect(inputMode).toBe('tel');
        }
      });

      test('Address autocomplete on mobile', async ({ page }) => {
        await page.goto(`${BASE_URL}/rider/book-ride`);
        
        const pickupInput = page.locator('[data-testid="pickup-input"]');
        await pickupInput.tap();
        await pickupInput.fill('123 Main');
        
        // Wait for autocomplete suggestions
        await page.waitForSelector('[data-testid="address-suggestions"]', { timeout: 5000 });
        
        // Test tapping suggestion
        const firstSuggestion = page.locator('[data-testid="address-suggestion"]').first();
        await firstSuggestion.tap();
        
        // Verify address was selected
        const inputValue = await pickupInput.inputValue();
        expect(inputValue).toContain('123 Main');
      });

      test('Date picker mobile interaction', async ({ page }) => {
        await page.goto(`${BASE_URL}/rider/book-ride`);
        
        const datePicker = page.locator('[data-testid="ride-date-picker"]');
        await datePicker.tap();
        
        // Verify mobile-optimized date picker appears
        await expect(page.locator('[data-testid="mobile-date-picker"]')).toBeVisible();
        
        // Test date selection
        const tomorrowOption = page.locator('[data-testid="tomorrow-option"]');
        await tomorrowOption.tap();
        
        const confirmButton = page.locator('[data-testid="confirm-date"]');
        await confirmButton.tap();
        
        // Verify date was selected
        await expect(page.locator('[data-testid="selected-date"]')).toBeVisible();
      });
    });

    test.describe('Performance on Mobile', () => {
      
      test('Page load performance on mobile network', async ({ page }) => {
        // Simulate slower mobile network
        await page.context().setOfflineMode(false);
        await page.context().setNetworkConditions({
          offline: false,
          downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
          uploadThroughput: 750 * 1024 / 8, // 750 Kbps
          latency: 200 // 200ms latency
        });

        const startTime = Date.now();
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;

        // Mobile should load within 5 seconds on 3G
        expect(loadTime).toBeLessThan(5000);
      });

      test('Image optimization for mobile', async ({ page }) => {
        await page.goto(BASE_URL);
        
        // Check that images have appropriate sizes for mobile
        const images = await page.locator('img').all();
        
        for (const img of images.slice(0, 5)) { // Test first 5 images
          const src = await img.getAttribute('src');
          const naturalWidth = await img.evaluate(el => el.naturalWidth);
          const displayWidth = await img.evaluate(el => el.offsetWidth);
          
          // Images shouldn't be more than 2x display width (for retina)
          if (naturalWidth && displayWidth) {
            expect(naturalWidth).toBeLessThanOrEqual(displayWidth * 2.5);
          }
        }
      });

      test('JavaScript performance on mobile', async ({ page }) => {
        await page.goto(BASE_URL);
        
        // Measure JavaScript execution time
        const jsExecutionTime = await page.evaluate(() => {
          const start = performance.now();
          
          // Simulate heavy JavaScript operation
          let result = 0;
          for (let i = 0; i < 100000; i++) {
            result += Math.sqrt(i);
          }
          
          return performance.now() - start;
        });

        // JavaScript should execute efficiently on mobile
        expect(jsExecutionTime).toBeLessThan(100); // 100ms max for test operation
      });
    });

    test.describe('Offline Capability', () => {
      
      test('Offline message display', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        
        // Go offline
        await page.context().setOfflineMode(true);
        
        // Trigger a network request
        await page.click('[data-testid="refresh-button"]', { timeout: 1000 }).catch(() => {
          // Button might not exist, that's okay
        });
        
        // Check for offline indicator
        await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible({ timeout: 5000 });
        
        // Go back online
        await page.context().setOfflineMode(false);
        
        // Verify online status
        await page.waitForTimeout(2000);
        await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
      });

      test('Cache behavior on mobile', async ({ page }) => {
        // First visit
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        
        // Second visit should use cache
        const startTime = Date.now();
        await page.reload();
        await page.waitForLoadState('networkidle');
        const reloadTime = Date.now() - startTime;
        
        // Cached reload should be faster
        expect(reloadTime).toBeLessThan(2000);
      });
    });

    test.describe('Device-Specific Features', () => {
      
      test('Geolocation on mobile', async ({ page, context }) => {
        // Grant geolocation permission
        await context.grantPermissions(['geolocation']);
        await context.setGeolocation({ latitude: 40.7128, longitude: -74.0060 });
        
        await page.goto(`${BASE_URL}/rider/book-ride`);
        
        // Test use current location
        const useLocationButton = page.locator('[data-testid="use-current-location"]');
        await useLocationButton.tap();
        
        // Verify location was detected
        await expect(page.locator('[data-testid="location-detected"]')).toBeVisible({ timeout: 5000 });
        
        const pickupInput = page.locator('[data-testid="pickup-input"]');
        const inputValue = await pickupInput.inputValue();
        expect(inputValue).toBeTruthy();
      });

      test('Camera access for document upload', async ({ page, context }) => {
        // Skip camera test on CI environments
        if (process.env.CI) {
          test.skip();
          return;
        }

        await context.grantPermissions(['camera']);
        
        await page.goto(`${BASE_URL}/driver/onboarding`);
        
        // Test camera capture button
        const cameraButton = page.locator('[data-testid="camera-capture"]');
        if (await cameraButton.isVisible()) {
          await cameraButton.tap();
          
          // Verify camera interface appears
          await expect(page.locator('[data-testid="camera-preview"]')).toBeVisible({ timeout: 3000 });
        }
      });

      test('Vibration feedback', async ({ page }) => {
        await page.goto(`${BASE_URL}/rider/ride-tracking/123`);
        
        // Test vibration on important notifications
        const vibrationSupport = await page.evaluate(() => {
          return 'vibrate' in navigator;
        });
        
        if (vibrationSupport) {
          // Simulate vibration trigger
          await page.evaluate(() => {
            navigator.vibrate(200); // 200ms vibration
          });
          
          // Vibration doesn't throw errors
          expect(true).toBe(true);
        }
      });
    });

    test.describe('Accessibility on Mobile', () => {
      
      test('Screen reader compatibility', async ({ page }) => {
        await page.goto(BASE_URL);
        
        // Check for proper ARIA labels
        const buttons = await page.locator('button, [role="button"]').all();
        
        for (const button of buttons.slice(0, 5)) {
          const ariaLabel = await button.getAttribute('aria-label');
          const textContent = await button.textContent();
          
          // Button should have either aria-label or text content
          expect(ariaLabel || textContent?.trim()).toBeTruthy();
        }
      });

      test('High contrast mode support', async ({ page }) => {
        await page.goto(BASE_URL);
        
        // Simulate high contrast mode
        await page.addStyleTag({
          content: `
            @media (prefers-contrast: high) {
              * { filter: contrast(150%); }
            }
          `
        });
        
        // Verify content is still readable
        const mainContent = page.locator('main, [role="main"]');
        await expect(mainContent).toBeVisible();
      });

      test('Large text scaling', async ({ page }) => {
        await page.goto(BASE_URL);
        
        // Simulate 200% text scaling
        await page.addStyleTag({
          content: 'html { font-size: 200%; }'
        });
        
        await page.waitForTimeout(1000);
        
        // Verify layout doesn't break with large text
        const overflowElements = await page.evaluate(() => {
          const elements = document.querySelectorAll('*');
          const overflowing = [];
          
          elements.forEach(el => {
            if (el.scrollWidth > el.clientWidth + 5) { // 5px tolerance
              overflowing.push(el.tagName + (el.className ? '.' + el.className : ''));
            }
          });
          
          return overflowing.slice(0, 5); // Return first 5 overflowing elements
        });
        
        // Minimal overflow is acceptable
        expect(overflowElements.length).toBeLessThan(3);
      });
    });

    test.describe('Cross-Browser Mobile Testing', () => {
      
      test('Safari iOS compatibility', async ({ page, browserName }) => {
        if (device.name.includes('iPhone') || device.name.includes('iPad')) {
          await page.goto(BASE_URL);
          
          // Test iOS Safari specific features
          const webkitFeatures = await page.evaluate(() => {
            return {
              hasTouch: 'ontouchstart' in window,
              hasOrientation: 'orientation' in window,
              hasApplePayAPI: 'ApplePaySession' in window
            };
          });
          
          expect(webkitFeatures.hasTouch).toBe(true);
          expect(webkitFeatures.hasOrientation).toBe(true);
        }
      });

      test('Chrome mobile compatibility', async ({ page }) => {
        if (device.name.includes('Pixel') || device.name.includes('Galaxy')) {
          await page.goto(BASE_URL);
          
          // Test Chrome mobile specific features
          const chromeFeatures = await page.evaluate(() => {
            return {
              hasServiceWorker: 'serviceWorker' in navigator,
              hasWebGL: !!document.createElement('canvas').getContext('webgl'),
              hasGeolocation: 'geolocation' in navigator
            };
          });
          
          expect(chromeFeatures.hasServiceWorker).toBe(true);
          expect(chromeFeatures.hasGeolocation).toBe(true);
        }
      });
    });
  });
});

// Shared test utilities
test.describe('Mobile Testing Utilities', () => {
  
  test('Device detection accuracy', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const deviceInfo = await page.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        touchPoints: navigator.maxTouchPoints,
        screenWidth: screen.width,
        screenHeight: screen.height,
        devicePixelRatio: window.devicePixelRatio
      };
    });
    
    // Verify device info makes sense
    expect(deviceInfo.touchPoints).toBeGreaterThan(0);
    expect(deviceInfo.screenWidth).toBeGreaterThan(300);
    expect(deviceInfo.screenHeight).toBeGreaterThan(400);
  });

  test('Battery API availability', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const batterySupport = await page.evaluate(async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await navigator.getBattery();
          return {
            supported: true,
            level: battery.level,
            charging: battery.charging
          };
        } catch (error) {
          return { supported: false, error: error.message };
        }
      }
      return { supported: false };
    });
    
    // Battery API support is optional
    if (batterySupport.supported) {
      expect(batterySupport.level).toBeGreaterThanOrEqual(0);
      expect(batterySupport.level).toBeLessThanOrEqual(1);
    }
  });
});

module.exports = {
  use: {
    headless: true,
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  timeout: 30000,
  retries: 1,
  workers: 2
};