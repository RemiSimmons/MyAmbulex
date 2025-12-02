import { storage } from './storage';
import { notificationService } from './notifications';
import { NotificationType, FriendlyCharacter } from './notifications';
import { type Ride } from '@shared/schema';

interface RideReminder {
  rideId: number;
  userId: number;
  userRole: 'rider' | 'driver';
  scheduledTime: Date;
  reminderType: '24h' | '3h';
  reminderTime: Date;
  sent: boolean;
}

/**
 * Service for managing automated ride reminders
 * Sends 24-hour and 3-hour notifications to both riders and drivers
 */
export class RideReminderService {
  private reminderInterval: NodeJS.Timeout | null = null;
  private reminders: Map<string, RideReminder> = new Map();

  constructor() {
    this.startReminderService();
  }

  /**
   * Start the reminder service - checks every 10 minutes for reminders to send
   */
  private startReminderService(): void {
    console.log('🔔 Starting ride reminder service...');
    
    // Check for reminders every 10 minutes
    this.reminderInterval = setInterval(() => {
      this.processRideReminders();
    }, 10 * 60 * 1000); // 10 minutes

    // Also run immediately on startup
    this.processRideReminders();
  }

  /**
   * Stop the reminder service
   */
  stop(): void {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
      console.log('🔔 Ride reminder service stopped');
    }
  }

  /**
   * Main processing function - finds upcoming rides and schedules/sends reminders
   */
  private async processRideReminders(): Promise<void> {
    try {
      console.log('🔔 Processing ride reminders...');
      
      // Get all accepted rides scheduled for the next 25 hours
      const upcomingRides = await this.getUpcomingRides();
      
      for (const ride of upcomingRides) {
        await this.scheduleRideReminders(ride);
      }
      
      // Send any reminders that are due
      await this.sendDueReminders();
      
    } catch (error) {
      console.error('Error processing ride reminders:', error);
    }
  }

  /**
   * Get rides that are accepted by drivers and scheduled within the next 25 hours
   */
  private async getUpcomingRides(): Promise<any[]> {
    try {
      const now = new Date();
      const twentyFiveHoursFromNow = new Date(now.getTime() + (25 * 60 * 60 * 1000));
      
      // Get rides with assigned drivers in the next 25 hours
      const rides = await storage.getRidesByDateRange(now, twentyFiveHoursFromNow);
      
      // Only send reminders for rides that have been accepted by drivers
      const acceptedRides = rides.filter(ride => 
        ride.status === 'accepted' && 
        ride.driverId && 
        ride.scheduledTime
      );
      
      console.log(`🔔 Found ${acceptedRides.length} accepted rides with assigned drivers in next 25 hours`);
      return acceptedRides;
    } catch (error) {
      console.error('Error getting upcoming rides:', error);
      return [];
    }
  }

  /**
   * Schedule reminders for a specific ride (both 24h and 3h for rider and driver)
   */
  private async scheduleRideReminders(ride: Ride): Promise<void> {
    const scheduledTime = new Date(ride.scheduledTime);
    const now = new Date();
    
    // Calculate reminder times
    const twentyFourHoursBefore = new Date(scheduledTime.getTime() - (24 * 60 * 60 * 1000));
    const threeHoursBefore = new Date(scheduledTime.getTime() - (3 * 60 * 60 * 1000));
    
    // Schedule reminders for rider
    if (ride.riderId) {
      await this.scheduleReminder(ride, ride.riderId, 'rider', '24h', twentyFourHoursBefore);
      await this.scheduleReminder(ride, ride.riderId, 'rider', '3h', threeHoursBefore);
    }
    
    // Schedule reminders for driver
    if (ride.driverId) {
      await this.scheduleReminder(ride, ride.driverId, 'driver', '24h', twentyFourHoursBefore);
      await this.scheduleReminder(ride, ride.driverId, 'driver', '3h', threeHoursBefore);
    }
  }

  /**
   * Schedule a specific reminder
   */
  private async scheduleReminder(
    ride: any, 
    userId: number, 
    userRole: 'rider' | 'driver', 
    reminderType: '24h' | '3h',
    reminderTime: Date
  ): Promise<void> {
    const reminderId = `${ride.id}_${userId}_${reminderType}`;
    
    // Skip if reminder already exists
    if (this.reminders.has(reminderId)) {
      return;
    }
    
    const reminder: RideReminder = {
      rideId: ride.id,
      userId,
      userRole,
      scheduledTime: new Date(ride.scheduledTime),
      reminderType,
      reminderTime,
      sent: false
    };
    
    this.reminders.set(reminderId, reminder);
    console.log(`🔔 Scheduled ${reminderType} reminder for ${userRole} ${userId} - ride ${ride.id}`);
  }

  /**
   * Send reminders that are due
   */
  private async sendDueReminders(): Promise<void> {
    const now = new Date();
    
    const reminderEntries = Array.from(this.reminders.entries());
    for (const [reminderId, reminder] of reminderEntries) {
      if (!reminder.sent && reminder.reminderTime <= now) {
        try {
          await this.sendRideReminder(reminder);
          reminder.sent = true;
          console.log(`🔔 Sent ${reminder.reminderType} reminder for ${reminder.userRole} ${reminder.userId}`);
        } catch (error) {
          console.error(`Error sending reminder ${reminderId}:`, error);
        }
      }
    }
    
    // Clean up sent reminders older than 48 hours
    this.cleanupOldReminders();
  }

  /**
   * Send a specific ride reminder notification
   */
  private async sendRideReminder(reminder: RideReminder): Promise<void> {
    try {
      // Get ride details
      const ride = await storage.getRide(reminder.rideId);
      if (!ride) {
        console.log(`Ride ${reminder.rideId} not found for reminder`);
        return;
      }
      
      // Get user details
      const user = await storage.getUser(reminder.userId);
      if (!user) {
        console.log(`User ${reminder.userId} not found for reminder`);
        return;
      }
      
      // Format ride date/time
      const rideDateTime = new Date(reminder.scheduledTime).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      });
      
      // Create reminder message based on role and timing
      const { title, message } = this.createReminderMessage(
        reminder.userRole,
        reminder.reminderType,
        rideDateTime,
        ride,
        user.fullName.split(' ')[0] // First name
      );
      
      // Send notification
      await notificationService.createAndSendNotification({
        userId: reminder.userId,
        type: NotificationType.RIDE_CONFIRMED,
        title,
        message,
        link: reminder.userRole === 'rider' ? '/rider/rides' : '/driver/dashboard',
        metadata: {
          rideId: ride.id,
          reminderType: reminder.reminderType,
          scheduledTime: reminder.scheduledTime,
          character: reminder.userRole === 'rider' ? FriendlyCharacter.ASSISTANT : FriendlyCharacter.DRIVER
        }
      });
      
    } catch (error) {
      console.error('Error sending ride reminder:', error);
      throw error;
    }
  }

  /**
   * Create personalized reminder messages
   */
  private createReminderMessage(
    userRole: 'rider' | 'driver',
    reminderType: '24h' | '3h',
    rideDateTime: string,
    ride: any,
    firstName: string
  ): { title: string; message: string } {
    const timeFrame = reminderType === '24h' ? '24 hours' : '3 hours';
    const isRider = userRole === 'rider';
    
    let title: string;
    let message: string;
    
    if (reminderType === '24h') {
      title = isRider ? 'Ride Tomorrow' : 'Upcoming Ride Assignment';
      
      if (isRider) {
        message = `Hi ${firstName}! Just a friendly reminder that you have a medical transportation ride scheduled for tomorrow at ${rideDateTime}.\n\n` +
                 `Pickup: ${ride.pickupLocation}\n` +
                 `Destination: ${ride.dropoffLocation}\n\n` +
                 `Your driver will contact you closer to the pickup time. Please ensure you're ready 10 minutes before your scheduled pickup time.`;
      } else {
        message = `Hi ${firstName}! You have a ride assignment tomorrow at ${rideDateTime}.\n\n` +
                 `Pickup: ${ride.pickupLocation}\n` +
                 `Destination: ${ride.dropoffLocation}\n\n` +
                 `Please review the ride details and prepare your vehicle. Remember to arrive 5-10 minutes early at the pickup location.`;
      }
    } else {
      title = isRider ? 'Ride in 3 Hours' : 'Ride Starting Soon';
      
      if (isRider) {
        message = `Hi ${firstName}! Your medical transportation ride is starting in 3 hours at ${rideDateTime}.\n\n` +
                 `Pickup: ${ride.pickupLocation}\n\n` +
                 `Please be ready and waiting at your pickup location. Your driver will arrive shortly before the scheduled time.`;
      } else {
        message = `Hi ${firstName}! Your assigned ride is starting in 3 hours at ${rideDateTime}.\n\n` +
                 `Pickup: ${ride.pickupLocation}\n` +
                 `Destination: ${ride.dropoffLocation}\n\n` +
                 `Time to prepare for departure. Please ensure your vehicle is ready and plan your route.`;
      }
    }
    
    return { title, message };
  }

  /**
   * Clean up old reminders to prevent memory leaks
   */
  private cleanupOldReminders(): void {
    const fortyEightHoursAgo = new Date(Date.now() - (48 * 60 * 60 * 1000));
    
    const reminderEntries = Array.from(this.reminders.entries());
    for (const [reminderId, reminder] of reminderEntries) {
      if (reminder.sent && reminder.reminderTime < fortyEightHoursAgo) {
        this.reminders.delete(reminderId);
      }
    }
  }

  /**
   * Manually trigger reminders for testing
   */
  async triggerTestReminders(): Promise<void> {
    console.log('🔔 Triggering test reminder processing...');
    await this.processRideReminders();
  }

  /**
   * Get reminder statistics
   */
  getReminderStats(): { total: number; scheduled: number; sent: number } {
    let scheduled = 0;
    let sent = 0;
    
    const reminderValues = Array.from(this.reminders.values());
    for (const reminder of reminderValues) {
      if (reminder.sent) {
        sent++;
      } else {
        scheduled++;
      }
    }
    
    return {
      total: this.reminders.size,
      scheduled,
      sent
    };
  }
}

// Create and export singleton instance
export const rideReminderService = new RideReminderService();