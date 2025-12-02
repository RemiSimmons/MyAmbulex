import { emailNotificationService } from './email-notification-service';
import { storage } from './storage';
import { sseManager } from './sse-manager';

/**
 * Email automation service that handles automatic email triggers
 * based on application events and schedule
 */
export class EmailAutomationService {
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startAutomationChecks();
  }

  /**
   * Start automated email checks
   */
  private startAutomationChecks(): void {
    // Check for automated emails every 5 minutes
    this.checkInterval = setInterval(() => {
      this.processAutomatedEmails();
    }, 5 * 60 * 1000);

    console.log('Email automation service started');
  }

  /**
   * Stop automation checks
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Process all automated email checks
   */
  private async processAutomatedEmails(): Promise<void> {
    try {
      console.log('Running automated email checks...');
      
      await Promise.all([
        this.checkDocumentExpiry(),
        this.checkUnverifiedDrivers(),
        this.checkPendingRideNotifications(),
        this.sendDailyDriverSummaries(),
        this.checkInactiveUsers()
      ]);
      
    } catch (error) {
      console.error('Error in automated email processing:', error);
    }
  }

  /**
   * Check for drivers with expiring documents
   */
  private async checkDocumentExpiry(): Promise<void> {
    try {
      // Get all drivers
      const drivers = await storage.getUsersByRole('driver');
      
      for (const driver of drivers) {
        const driverDetails = await storage.getDriverDetails(driver.id);
        if (!driverDetails) continue;

        const expiringDocuments = [];
        const now = new Date();
        const warningDays = 30; // Warn 30 days before expiry

        // Check license expiry
        if (driverDetails.licenseExpiry) {
          const expiryDate = new Date(driverDetails.licenseExpiry);
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiry <= warningDays && daysUntilExpiry > 0) {
            expiringDocuments.push({
              name: "Driver's License",
              expiryDate: driverDetails.licenseExpiry
            });
          }
        }

        // Check insurance expiry
        if (driverDetails.insuranceExpiry) {
          const expiryDate = new Date(driverDetails.insuranceExpiry);
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiry <= warningDays && daysUntilExpiry > 0) {
            expiringDocuments.push({
              name: "Insurance Policy",
              expiryDate: driverDetails.insuranceExpiry
            });
          }
        }

        // Send expiry warning if documents are expiring
        if (expiringDocuments.length > 0) {
          await emailNotificationService.sendDocumentExpiryWarning(
            driver.id,
            driver.email,
            driver.fullName || driver.username,
            expiringDocuments
          );

          console.log(`Document expiry warning sent to driver ${driver.id}`);
        }
      }
    } catch (error) {
      console.error('Error checking document expiry:', error);
    }
  }

  /**
   * Check for unverified drivers and send reminder emails
   */
  private async checkUnverifiedDrivers(): Promise<void> {
    try {
      const drivers = await storage.getUsersByRole('driver');
      
      for (const driver of drivers) {
        // Skip if email already verified
        if (driver.emailVerified) continue;

        const driverDetails = await storage.getDriverDetails(driver.id);
        if (!driverDetails) continue;

        // Check if driver registered more than 24 hours ago but hasn't verified email
        const registrationDate = new Date(driver.createdAt);
        const now = new Date();
        const hoursSinceRegistration = (now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60);

        // Send reminder after 24 hours, then every 72 hours
        if (hoursSinceRegistration >= 24 && (hoursSinceRegistration % 72) < 5) {
          // Generate new verification token
          const verificationToken = this.generateVerificationToken();
          
          // Store token in database (would need to add this field)
          // await storage.updateDriverVerificationToken(driver.id, verificationToken);

          await emailNotificationService.sendDriverVerificationEmail(
            driver.id,
            driver.email,
            driver.fullName || driver.username,
            verificationToken
          );

          console.log(`Verification reminder sent to driver ${driver.id}`);
        }
      }
    } catch (error) {
      console.error('Error checking unverified drivers:', error);
    }
  }

  /**
   * Check for pending ride notifications
   */
  private async checkPendingRideNotifications(): Promise<void> {
    try {
      // Get all pending rides
      const rides = await storage.getAllRides();
      const pendingRides = rides.filter(ride => ride.status === 'pending');

      for (const ride of pendingRides) {
        const rider = await storage.getUser(ride.riderId);
        if (!rider) continue;

        // Check if ride was created more than 1 hour ago without driver assignment
        const createdDate = new Date(ride.createdAt);
        const now = new Date();
        const hoursOld = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);

        if (hoursOld >= 1 && !ride.driverId) {
          // Send notification about ride still pending
          await emailNotificationService.sendRideStatusUpdate(
            rider.id,
            rider.email,
            rider.fullName || rider.username,
            {
              rideId: ride.id,
              referenceNumber: ride.referenceNumber,
              status: 'Searching for Driver',
              statusMessage: 'We are still looking for an available driver for your ride. We will notify you as soon as one is found.'
            }
          );

          console.log(`Pending ride notification sent for ride ${ride.id}`);
        }
      }
    } catch (error) {
      console.error('Error checking pending ride notifications:', error);
    }
  }

  /**
   * Send daily driver summary emails
   */
  private async sendDailyDriverSummaries(): Promise<void> {
    try {
      const now = new Date();
      const isTimeTosend = now.getHours() === 18 && now.getMinutes() < 5; // 6 PM daily

      if (!isTimeTosend) return;

      const drivers = await storage.getUsersByRole('driver');
      
      for (const driver of drivers) {
        const driverDetails = await storage.getDriverDetails(driver.id);
        if (!driverDetails?.verified) continue; // Only send to verified drivers

        // Get today's rides
        const rides = await storage.getRidesByDriver(driver.id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayRides = rides.filter(ride => {
          const rideDate = new Date(ride.createdAt);
          rideDate.setHours(0, 0, 0, 0);
          return rideDate.getTime() === today.getTime();
        });

        const completedRides = todayRides.filter(ride => ride.status === 'completed');
        const totalEarnings = completedRides.reduce((sum, ride) => sum + (ride.finalPrice || 0), 0);

        // Only send if driver had activity today or has upcoming rides
        if (todayRides.length > 0 || totalEarnings > 0) {
          await emailNotificationService.sendAdministrativeEmail(
            driver.id,
            driver.email,
            driver.fullName || driver.username,
            'Daily Summary - Your MyAmbulex Activity',
            `
              Hello ${driver.fullName || driver.username},

              Here's your daily activity summary:

              Today's Stats:
              - Completed rides: ${completedRides.length}
              - Total earnings: $${totalEarnings.toFixed(2)}
              - Ride acceptance rate: ${todayRides.length > 0 ? Math.round((completedRides.length / todayRides.length) * 100) : 0}%

              ${totalEarnings === 0 ? 'Remember to go online to start receiving ride requests and earning money!' : 'Great work today!'}

              Access your dashboard to view detailed statistics and set your availability for tomorrow.
            `,
            'normal'
          );

          console.log(`Daily summary sent to driver ${driver.id}`);
        }
      }
    } catch (error) {
      console.error('Error sending daily driver summaries:', error);
    }
  }

  /**
   * Check for inactive users and send re-engagement emails
   */
  private async checkInactiveUsers(): Promise<void> {
    try {
      const allUsers = await storage.getAllUsers();
      const now = new Date();
      const inactivityThresholdDays = 7; // Consider inactive after 7 days

      for (const user of allUsers) {
        // Skip admin users
        if (user.role === 'admin') continue;

        // Calculate days since last activity (using createdAt as proxy for last activity)
        const lastActivity = new Date(user.createdAt);
        const daysSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceActivity >= inactivityThresholdDays) {
          const subject = user.role === 'driver' 
            ? 'We Miss You! Start Earning Again with MyAmbulex'
            : 'Come Back! Book Your Next Ride with MyAmbulex';

          const message = user.role === 'driver'
            ? `Hi ${user.fullName || user.username}, we noticed you haven't been active lately. There are ride requests waiting for drivers like you. Log in to your dashboard and start earning today!`
            : `Hi ${user.fullName || user.username}, it's been a while since your last ride with MyAmbulex. Book your next medical transport with ease and reliability.`;

          await emailNotificationService.sendAdministrativeEmail(
            user.id,
            user.email,
            user.fullName || user.username,
            subject,
            message,
            'low'
          );

          console.log(`Re-engagement email sent to ${user.role} ${user.id}`);
        }
      }
    } catch (error) {
      console.error('Error checking inactive users:', error);
    }
  }

  /**
   * Trigger email when driver application is approved
   */
  async onDriverApplicationApproved(driverId: number): Promise<void> {
    try {
      const driver = await storage.getUser(driverId);
      if (!driver) return;

      await emailNotificationService.sendDriverApplicationApproved(
        driver.id,
        driver.email,
        driver.fullName || driver.username
      );

      console.log(`Driver application approved email sent to ${driverId}`);
    } catch (error) {
      console.error('Error sending driver approval email:', error);
    }
  }

  /**
   * Trigger email when driver application is rejected
   */
  async onDriverApplicationRejected(driverId: number, reason: string): Promise<void> {
    try {
      const driver = await storage.getUser(driverId);
      if (!driver) return;

      await emailNotificationService.sendDriverApplicationRejected(
        driver.id,
        driver.email,
        driver.fullName || driver.username,
        reason
      );

      console.log(`Driver application rejected email sent to ${driverId}`);
    } catch (error) {
      console.error('Error sending driver rejection email:', error);
    }
  }

  /**
   * Trigger booking confirmation when ride is created
   */
  async onRideBooked(rideId: number): Promise<void> {
    try {
      const ride = await storage.getRide(rideId);
      if (!ride) return;

      const rider = await storage.getUser(ride.riderId);
      if (!rider) return;

      await emailNotificationService.sendBookingConfirmation(
        rider.id,
        rider.email,
        rider.fullName || rider.username,
        {
          rideId: ride.id,
          referenceNumber: ride.referenceNumber,
          pickupAddress: ride.pickupAddress,
          dropoffAddress: ride.dropoffAddress,
          scheduledTime: ride.scheduledTime,
          estimatedFare: ride.estimatedPrice || 0
        }
      );

      console.log(`Booking confirmation sent for ride ${rideId}`);
    } catch (error) {
      console.error('Error sending booking confirmation:', error);
    }
  }

  /**
   * Trigger email when driver is assigned to ride
   */
  async onDriverAssigned(rideId: number): Promise<void> {
    try {
      const ride = await storage.getRide(rideId);
      if (!ride || !ride.driverId) return;

      const rider = await storage.getUser(ride.riderId);
      const driver = await storage.getUser(ride.driverId);
      const vehicles = await storage.getVehiclesByDriver(ride.driverId);
      
      if (!rider || !driver) return;

      const vehicleInfo = vehicles && vehicles.length > 0 
        ? `${vehicles[0].year} ${vehicles[0].make} ${vehicles[0].model} (${vehicles[0].color})`
        : 'Vehicle details will be provided';

      await emailNotificationService.sendRideDriverAssigned(
        rider.id,
        rider.email,
        rider.fullName || rider.username,
        {
          rideId: ride.id,
          referenceNumber: ride.referenceNumber,
          pickupAddress: ride.pickupAddress,
          dropoffAddress: ride.dropoffAddress,
          scheduledTime: ride.scheduledTime,
          driverName: driver.fullName || driver.username,
          driverPhone: driver.phone || 'Will be provided',
          vehicleInfo
        }
      );

      console.log(`Driver assigned email sent for ride ${rideId}`);
    } catch (error) {
      console.error('Error sending driver assigned email:', error);
    }
  }

  /**
   * Trigger email when ride is completed
   */
  async onRideCompleted(rideId: number): Promise<void> {
    try {
      const ride = await storage.getRide(rideId);
      if (!ride || !ride.driverId) return;

      const rider = await storage.getUser(ride.riderId);
      const driver = await storage.getUser(ride.driverId);
      
      if (!rider || !driver) return;

      await emailNotificationService.sendRideCompleted(
        rider.id,
        rider.email,
        rider.fullName || rider.username,
        {
          rideId: ride.id,
          referenceNumber: ride.referenceNumber,
          pickupAddress: ride.pickupAddress,
          dropoffAddress: ride.dropoffAddress,
          completedAt: ride.completedAt || new Date().toISOString(),
          finalFare: ride.finalPrice || ride.estimatedPrice || 0,
          paymentMethod: 'Credit Card', // This would come from payment data
          driverName: driver.fullName || driver.username
        }
      );

      console.log(`Ride completed email sent for ride ${rideId}`);
    } catch (error) {
      console.error('Error sending ride completed email:', error);
    }
  }

  /**
   * Generate verification token
   */
  private generateVerificationToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

export const emailAutomationService = new EmailAutomationService();