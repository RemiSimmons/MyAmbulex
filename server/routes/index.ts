import type { Express } from 'express';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Core routes
import healthRoutes from './core/health';
import userRoutes from './core/user';
import supportRoutes from './core/support';

// Document routes
import documentUploadRoutes from './documents/upload';
import documentDownloadRoutes from './documents/download';
import documentPreviewRoutes from './documents/preview';
import documentRequirementsRoutes from './documents/requirements';

// Maps routes
import mapsRoutes from './maps/places';

// Legal routes
import legalRoutes from './legal/documents';
import legalAgreementsRoutes from './legal-agreements';

// Notification routes
import notificationRoutes from './notifications/api';
import { registerPWANotificationRoutes } from './notifications';

// Chat routes
import chatRoutes from './chat/conversations';

// Payment routes
import paypalRoutes from './payments/paypal';
import { setupStripeSetupRoutes } from './stripe-setup';
import { setupStripeWebhookRoutes } from './stripe-webhook';

// Ride routes
import rideMainRoutes from './rides/main';
import ridePaymentRoutes from './rides/payment';

// Bid routes
import bidRoutes from './bids/counter';
import bidMainRoutes from './bids/main';

// Existing specialized routers
import userProfileRouter from './user-profile';
import userProfileApiRouter from './user-profile-api';
import authDiagnosticRouter from './auth-diagnostic';
import savedAddressesRouter from './saved-addresses';
import adminRouter from './admin';
import adminManagementRouter from './admin-management';
import adminDocumentsRouter from './admin-documents';
import testingRouter from './testing';
import betaManagementRouter from './beta-management';
import betaInvitationsRouter from './beta-invitations';
import driverRouter from './driver';
import driverOnboardingRouter from './driver-onboarding';
import driverOnboardingProgressRouter from './driver-onboarding-progress';
import driverDocumentsRouter from './driver-documents';
import riderRouter from './rider';
import riderOnboardingRouter from './rider-onboarding';
import paymentRouter from './payment';
import userSettingsRouter from './user-settings';
import recurringAppointmentsRouter from './recurring-appointments';
import driverAvailabilityRouter from './driver-availability';
import driverRideFiltersRouter from './driver-ride-filters';
import analyticsRouter from './analytics';
import chatRouter from './chat';
import promoCodesRouter from './promo-codes';
import onboardingNotificationsRoutes from './onboarding-notifications';
import driverDashboardRoutes from './driver-dashboard';
import emailNotificationsRoutes from './email-notifications';
import rideRemindersRoutes from './ride-reminders';
import betaSignupRoutes from './beta-signup';
import authRoutes from './auth';

// Configure uploads middleware
const configureUploadsMiddleware = (app: Express) => {
  app.use("/uploads", (req, res, next) => {
    // Only allow authenticated users to access uploads
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  }, express.static(path.join(__dirname, '../../uploads')));
};

// Register all routes
const registerRoutes = (app: Express) => {
  // Core routes
  app.use(healthRoutes);
  app.use(userRoutes);
  app.use(supportRoutes);

  // Document routes
  app.use(documentUploadRoutes);
  app.use('/api/documents', documentDownloadRoutes);
  app.use('/api/documents', documentPreviewRoutes);
  app.use('/api/documents', documentRequirementsRoutes);

  // Maps routes
  app.use(mapsRoutes);

  // Legal routes
  app.use(legalRoutes);
  app.use('/api/legal-agreements', legalAgreementsRoutes);

  // Notification routes
  app.use('/api', notificationRoutes);
  
  // Register PWA notification routes
  registerPWANotificationRoutes(app);

  // Chat routes
  app.use(chatRoutes);

  // Payment routes
  app.use(paypalRoutes);
  setupStripeSetupRoutes(app);
  
  // Note: Stripe webhooks are registered in server/index.ts before express.json()

  // Ride routes
  app.use('/api', rideMainRoutes);
  app.use('/api', ridePaymentRoutes);

  // Bid routes
  app.use(bidRoutes);
  app.use('/', bidMainRoutes);

  // Authentication routes
  app.use(authRoutes);

  // Specialized routes (existing)
  app.use('/api/driver', driverRouter);
  app.use('/api/driver', driverOnboardingRouter);
  app.use('/api/driver/onboarding', driverOnboardingProgressRouter);
  app.use('/api', driverOnboardingRouter);
  app.use('/api/driver/documents', driverDocumentsRouter);
  app.use('/api/rider', riderRouter);
  app.use('/api/rider/onboarding', riderOnboardingRouter);
  app.use(userProfileRouter);
  app.use(userProfileApiRouter);
  app.use('/api/auth/diagnostic', authDiagnosticRouter);
  app.use('/api/saved-addresses', savedAddressesRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/admin', adminManagementRouter);
  app.use('/api/admin', adminDocumentsRouter);
  app.use('/api/testing', testingRouter);
  app.use('/api/beta-management', betaManagementRouter);
  app.use('/api/beta-invitations', betaInvitationsRouter);
  app.use('/api/payment', paymentRouter);
  app.use(userSettingsRouter);
  app.use('/api/recurring-appointments', recurringAppointmentsRouter);
  app.use('/api/driver', driverAvailabilityRouter);
  app.use('/api/driver/ride-filters', driverRideFiltersRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/promo-codes', promoCodesRouter);
  app.use('/api/onboarding-notifications', onboardingNotificationsRoutes);
  app.use('/api/driver/dashboard', driverDashboardRoutes);
  app.use('/api/email-notifications', emailNotificationsRoutes);
  app.use('/api/ride-reminders', rideRemindersRoutes);
  app.use('/api', betaSignupRoutes);

  // Direct promo code validation endpoint (for backward compatibility)
  app.post('/api/validate-promo-code', async (req, res) => {
    try {
      const { code, rideAmount } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!code || !rideAmount) {
        return res.status(400).json({ message: "Code and ride amount are required" });
      }

      // Import promo code service
      const { promoCodeService } = await import('../promo-code-service');
      
      const validationResult = await promoCodeService.validatePromoCode(
        code, 
        userId, 
        parseFloat(rideAmount),
        req.user?.role || 'rider'
      );

      if (!validationResult.success) {
        return res.status(400).json({ 
          valid: false, 
          error: validationResult.description 
        });
      }

      // Calculate discounted price
      const priceCalculation = promoCodeService.calculateDiscountedPrice(
        parseFloat(rideAmount), 
        validationResult.promoCode!
      );

      res.json({
        valid: true,
        promoCode: validationResult.promoCode,
        calculation: priceCalculation
      });

    } catch (error) {
      console.error("Error validating promo code:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get pricing settings
  app.get('/api/drivers/pricing-settings', async (req, res) => {
    try {
      const settings = {
        baseFare: 45,
        distanceRate: 2.50,
        platformFee: 5
      };
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch pricing settings' });
    }
  });
};

export { configureUploadsMiddleware, registerRoutes };

// Also export as default for compatibility
export default { configureUploadsMiddleware, registerRoutes };