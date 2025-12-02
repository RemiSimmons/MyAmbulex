import { User, Ride, Bid, RideEdit, InsertNotification, Notification, ChatMessage } from "@shared/schema";
import { storage } from "./storage";
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import { db } from "./db";
import { notifications } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Different types of notifications that can be sent
 */
export enum NotificationType {
  RIDE_CANCELLED = "RIDE_CANCELLED",
  RIDE_CONFIRMED = "RIDE_CONFIRMED",
  NEW_BID = "NEW_BID",
  BID_ACCEPTED = "BID_ACCEPTED",
  DRIVER_ARRIVED = "DRIVER_ARRIVED",
  RIDE_STARTED = "RIDE_STARTED",
  RIDE_COMPLETED = "RIDE_COMPLETED",
  COUNTER_OFFER_RECEIVED = "COUNTER_OFFER_RECEIVED",
  PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  RIDE_EDIT_REQUESTED = "RIDE_EDIT_REQUESTED",
  RIDE_EDIT_ACCEPTED = "RIDE_EDIT_ACCEPTED",
  RIDE_EDIT_REJECTED = "RIDE_EDIT_REJECTED",
  
  // Multiple bids related notifications
  MULTIPLE_BIDS_RECEIVED = "MULTIPLE_BIDS_RECEIVED",
  BID_SELECTED = "BID_SELECTED",
  BID_REJECTED = "BID_REJECTED",
  
  // Driver ETA notifications
  DRIVER_ETA_UPDATE = "DRIVER_ETA_UPDATE",
  
  // Chat related notifications
  NEW_CHAT_MESSAGE = "NEW_CHAT_MESSAGE",
  CHAT_TYPING = "CHAT_TYPING",
  CHAT_READ_RECEIPT = "CHAT_READ_RECEIPT",
  
  // Admin notifications
  DOCUMENT_APPROVED = "DOCUMENT_APPROVED",
  DOCUMENT_REJECTED = "DOCUMENT_REJECTED",
  ACCOUNT_STATUS_CHANGE = "ACCOUNT_STATUS_CHANGE",
  ADMIN_ANNOUNCEMENT = "ADMIN_ANNOUNCEMENT",
  PRICING_UPDATED = "PRICING_UPDATED",
  
  // Urgent ride notifications
  URGENT_RIDE_POSTED = "URGENT_RIDE_POSTED",
  URGENT_RIDE_EXPIRING = "URGENT_RIDE_EXPIRING"
}

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Initialize Twilio client if credentials are available and valid
let twilioClient: twilio.Twilio | null = null;
const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();

if (accountSid && authToken && 
    accountSid !== '' && authToken !== '' &&
    !accountSid.includes('your_') && !authToken.includes('your_') &&
    accountSid.startsWith('AC')) {
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('✅ Twilio SMS service initialized');
  } catch (error) {
    console.warn('⚠️  Failed to initialize Twilio:', error);
    console.warn('⚠️  SMS notifications will be disabled.');
  }
} else if (accountSid || authToken) {
  console.log('ℹ️  Twilio credentials not properly configured. SMS notifications will be disabled.');
}

/**
 * Interface for notification preferences
 */
interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
}

/**
 * Structure for a notification when it's in memory
 */
export interface InMemoryNotification {
  id: string;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  imageUrl?: string;
  link?: string;
  read: boolean;
  createdAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Friendly character options for personalized messages
 */
export enum FriendlyCharacter {
  ASSISTANT = "ASSISTANT",
  DRIVER = "DRIVER",
  DOCTOR = "DOCTOR",
  COMPANION = "COMPANION"
}

type CharacterPersonality = {
  name: string;
  emoji: string;
  greeting: string;
  signOff: string;
  imageUrl?: string;
  tone: "professional" | "friendly" | "cheerful" | "caring";
};

/**
 * Service for handling notifications with personalized, friendly messages
 */
export class NotificationService {
  // Legacy in-memory notifications storage (used as backup if db fails)
  private memoryNotifications: InMemoryNotification[] = [];
  
  // Character personalities for personalized messages
  private characterPersonalities: Record<FriendlyCharacter, CharacterPersonality> = {
    [FriendlyCharacter.ASSISTANT]: {
      name: "Alex",
      emoji: "👋",
      greeting: "Hello there!",
      signOff: "Always here to help!",
      imageUrl: "/assets/assistant-avatar.png",
      tone: "professional"
    },
    [FriendlyCharacter.DRIVER]: {
      name: "Dina",
      emoji: "🚗",
      greeting: "Hey there!",
      signOff: "Drive safe!",
      imageUrl: "/assets/driver-avatar.png",
      tone: "friendly"
    },
    [FriendlyCharacter.DOCTOR]: {
      name: "Dr. Morgan",
      emoji: "👨‍⚕️",
      greeting: "Greetings,",
      signOff: "Wishing you wellness,",
      imageUrl: "/assets/doctor-avatar.png",
      tone: "caring"
    },
    [FriendlyCharacter.COMPANION]: {
      name: "Charlie",
      emoji: "😊",
      greeting: "Hi friend!",
      signOff: "Catch you later!",
      imageUrl: "/assets/companion-avatar.png",
      tone: "cheerful"
    }
  };
  
  /**
   * Generate personalized message with character personality
   */
  private personalizeMessage(
    message: string, 
    character: FriendlyCharacter = FriendlyCharacter.ASSISTANT,
    userName: string
  ): string {
    const personality = this.characterPersonalities[character];
    return `${personality.greeting} ${userName}! ${personality.emoji}\n\n${message}\n\n${personality.signOff}\n— ${personality.name}`;
  }
  
  /**
   * Create an email template with friendly character
   */
  private createEmailTemplate(
    message: string,
    userName: string,
    character: FriendlyCharacter = FriendlyCharacter.ASSISTANT
  ): string {
    const personality = this.characterPersonalities[character];
    
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #f8f9fa;">
      <div style="display: flex; align-items: center; margin-bottom: 15px;">
        <div style="width: 50px; height: 50px; border-radius: 25px; background-color: #3a64d8; color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-right: 15px;">
          ${personality.emoji}
        </div>
        <h2 style="color: #3a64d8; margin: 0;">MyAmbulex</h2>
      </div>
      
      <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
        <p style="font-size: 16px; color: #333; margin-top: 0;"><strong>${personality.greeting} ${userName}!</strong></p>
        
        <p style="font-size: 16px; color: #333; line-height: 1.5;">${message}</p>
        
        <p style="font-size: 16px; color: #333; margin-bottom: 5px;">${personality.signOff}</p>
        <p style="font-size: 16px; color: #3a64d8; font-weight: 600; margin-top: 0;">— ${personality.name}</p>
      </div>
      
      <p style="margin-top: 20px; font-size: 14px; color: #666; text-align: center;">
        Need help? Contact our support team anytime!
      </p>
      
      <div style="text-align: center; margin-top: 15px;">
        <a href="https://myambulex.com" style="text-decoration: none; color: #3a64d8; font-size: 14px;">www.myambulex.com</a>
      </div>
    </div>
    `;
  }

  /**
   * Store notification in database
   */
  private async storeNotification(notification: Omit<InsertNotification, 'id' | 'createdAt'>): Promise<Notification> {
    try {
      // Convert metadata to a string if present
      const dbNotification = {
        ...notification,
        metadata: notification.metadata ? JSON.stringify(notification.metadata) : null,
        link: notification.link || null,
        imageUrl: notification.imageUrl || null
      };
      
      // Insert into database
      const [newNotification] = await db.insert(notifications)
        .values(dbNotification)
        .returning();
      
      // Also store in memory as backup
      const memoryNotification: InMemoryNotification = {
        ...notification,
        id: newNotification.id.toString(),
        createdAt: newNotification.createdAt,
        // Keep metadata as object in memory for easy access
        metadata: notification.metadata
      };
      
      this.memoryNotifications.push(memoryNotification);
      
      return newNotification;
    } catch (error) {
      console.error("Error storing notification in database:", error);
      
      // Fallback to memory-only storage
      const fallbackNotification: InMemoryNotification = {
        ...notification,
        id: Date.now().toString(),
        createdAt: new Date(),
      };
      
      this.memoryNotifications.push(fallbackNotification);
      
      // Return a compatible object for the rest of the code
      return {
        ...fallbackNotification,
        id: parseInt(fallbackNotification.id),
        metadata: fallbackNotification.metadata ? JSON.stringify(fallbackNotification.metadata) : null,
        link: fallbackNotification.link || null,
        imageUrl: fallbackNotification.imageUrl || null
      } as Notification;
    }
  }
  
  /**
   * Get notifications for a user
   */
  async getNotificationsForUser(userId: number): Promise<Notification[]> {
    try {
      // Get from database
      const dbNotifications = await db.select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(notifications.createdAt);
      
      // Parse metadata back to objects
      return dbNotifications.map(notification => {
        try {
          // Only parse if metadata is a string, otherwise keep it as is
          let parsedMetadata = notification.metadata;
          if (typeof notification.metadata === 'string') {
            parsedMetadata = JSON.parse(notification.metadata);
          }
          
          return {
            ...notification,
            metadata: parsedMetadata
          };
        } catch (e) {
          console.warn("Error parsing notification metadata:", e);
          return {
            ...notification,
            metadata: null // Return null if parsing fails
          };
        }
      });
    } catch (error) {
      console.error("Error getting notifications from database:", error);
      
      // Fallback to memory
      return this.memoryNotifications
        .filter(notification => notification.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map(notification => ({
          ...notification,
          id: parseInt(notification.id),
          metadata: notification.metadata ? JSON.stringify(notification.metadata) : null,
          link: notification.link || null,
          imageUrl: notification.imageUrl || null
        })) as Notification[];
    }
  }
  
  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number): Promise<boolean> {
    try {
      // Update in database
      const [updatedNotification] = await db.update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, notificationId))
        .returning();
      
      if (updatedNotification) {
        // Also update in memory
        const memoryNotification = this.memoryNotifications.find(n => parseInt(n.id) === notificationId);
        if (memoryNotification) {
          memoryNotification.read = true;
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error marking notification as read in database:", error);
      
      // Fallback to memory
      const memoryNotification = this.memoryNotifications.find(n => parseInt(n.id) === notificationId);
      if (memoryNotification) {
        memoryNotification.read = true;
        return true;
      }
      return false;
    }
  }
  
  /**
   * Send a notification about a canceled ride
   */
  async sendRideCancellationNotification(
    ride: Ride,
    cancelledBy: User,
    reason?: string
  ): Promise<boolean> {
    try {
      // Determine who needs to be notified
      const notifyUserId = cancelledBy.role === "rider" 
        ? ride.driverId 
        : ride.riderId;
      
      if (!notifyUserId) {
        console.log("No user to notify about cancellation");
        return false;
      }
      
      // Get the user to notify
      const userToNotify = await storage.getUser(notifyUserId);
      if (!userToNotify) {
        console.log(`User with ID ${notifyUserId} not found for notification`);
        return false;
      }
      
      // Get ride details for the notification
      const rideDate = new Date(ride.scheduledTime).toLocaleDateString();
      const rideTime = new Date(ride.scheduledTime).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      // Choose character based on the scenario
      const character = cancelledBy.role === "driver" 
        ? FriendlyCharacter.DRIVER 
        : FriendlyCharacter.ASSISTANT;
      
      // Create personalized message
      const baseMessage = `Your scheduled ride on ${rideDate} at ${rideTime} has been cancelled by the ${cancelledBy.role}.`;
      const detailMessage = reason ? `\n\nThe reason provided was: "${reason}".` : '';
      const actionMessage = `\n\nDon't worry, you can easily find another ride by checking available options on your dashboard.`;
      
      const message = baseMessage + detailMessage + actionMessage;
      
      // Personalize message with character
      const personalizedMessage = this.personalizeMessage(
        message,
        character,
        userToNotify.fullName.split(' ')[0] // Use first name for personalization
      );
      
      // Get the user's notification preferences
      const preferences = userToNotify.notificationPreferences as NotificationPreferences || 
        { email: true, sms: true, push: true };
      
      // Store notification
      await this.storeNotification({
        userId: userToNotify.id,
        type: NotificationType.RIDE_CANCELLED,
        title: `Ride Cancelled for ${rideDate}`,
        message: personalizedMessage,
        read: false,
        link: null,  // No specific link to go to
        imageUrl: null, // No image for this notification
        metadata: {
          rideId: ride.id,
          scheduledTime: ride.scheduledTime,
          character
        }
      });
      
      // Log notification for debugging
      console.log(`NOTIFICATION to ${userToNotify.username} (${userToNotify.role}): ${personalizedMessage}`);
      
      // Send email notification if preferred
      if (preferences.email) {
        await this.sendEmailNotification(
          userToNotify.email,
          `MyAmbulex: Your ride on ${rideDate} has been cancelled`,
          message,
          userToNotify.fullName.split(' ')[0],
          character
        );
      }
      
      // Send SMS notification if preferred
      if (preferences.sms) {
        await this.sendSMSNotification(
          userToNotify.phone,
          this.personalizeMessage(
            baseMessage + detailMessage, // Shorter message for SMS
            character,
            userToNotify.fullName.split(' ')[0]
          )
        );
      }
      
      return true;
    } catch (error) {
      console.error("Error sending ride cancellation notification:", error);
      return false;
    }
  }
  
  /**
   * Send notification about a new counter-offer
   */
  async sendCounterOfferNotification(
    bid: Bid,
    fromUser: User,
    toUser: User,
    ride: Ride
  ): Promise<boolean> {
    try {
      // Choose a character - Driver character for driver offers, Assistant for rider offers
      const character = fromUser.role === "driver" 
        ? FriendlyCharacter.DRIVER 
        : FriendlyCharacter.ASSISTANT;
      
      // Get ride details
      const rideDate = new Date(ride.scheduledTime).toLocaleDateString();
      const rideTime = new Date(ride.scheduledTime).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      // Create message
      const baseMessage = `You've received a new counter-offer of $${bid.amount.toFixed(2)} for your ride on ${rideDate} at ${rideTime}.`;
      const actionMessage = `\n\nYou can review and respond to this offer on your dashboard. Remember, good negotiation leads to fair prices for everyone!`;
      const notesMessage = bid.notes ? `\n\nNote from ${fromUser.fullName}: "${bid.notes}"` : '';
      
      const message = baseMessage + notesMessage + actionMessage;
      
      // Personalize message
      const personalizedMessage = this.personalizeMessage(
        message,
        character,
        toUser.fullName.split(' ')[0] 
      );
      
      // Get preferences
      const preferences = toUser.notificationPreferences as NotificationPreferences || 
        { email: true, sms: true, push: true };
      
      // Store notification
      await this.storeNotification({
        userId: toUser.id,
        type: NotificationType.COUNTER_OFFER_RECEIVED,
        title: `New Counter-Offer: $${bid.amount.toFixed(2)}`,
        message: personalizedMessage,
        read: false,
        link: null,
        imageUrl: null,
        metadata: {
          bidId: bid.id,
          rideId: ride.id,
          amount: bid.amount,
          character
        }
      });
      
      // Log notification
      console.log(`NOTIFICATION to ${toUser.username} (${toUser.role}): New counter-offer notification sent`);
      
      // Send email if preferred
      if (preferences.email) {
        await this.sendEmailNotification(
          toUser.email,
          `MyAmbulex: New counter-offer for your ride`,
          message,
          toUser.fullName.split(' ')[0],
          character
        );
      }
      
      // Send SMS if preferred
      if (preferences.sms) {
        await this.sendSMSNotification(
          toUser.phone,
          this.personalizeMessage(
            baseMessage, // Shorter message for SMS
            character,
            toUser.fullName.split(' ')[0]
          )
        );
      }
      
      return true;
    } catch (error) {
      console.error("Error sending counter-offer notification:", error);
      return false;
    }
  }
  
  /**
   * Send notification about bid acceptance
   */
  async sendBidAcceptedNotification(
    bid: Bid,
    ride: Ride
  ): Promise<boolean> {
    try {
      // Get the driver to notify
      const driver = await storage.getUser(bid.driverId);
      if (!driver) {
        console.log(`Driver with ID ${bid.driverId} not found for notification`);
        return false;
      }
      
      // Use the driver character
      const character = FriendlyCharacter.DRIVER;
      
      // Get ride details
      const rideDate = new Date(ride.scheduledTime).toLocaleDateString();
      const rideTime = new Date(ride.scheduledTime).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      // Create message
      const message = `Great news! Your bid of $${bid.amount.toFixed(2)} for the ride on ${rideDate} at ${rideTime} has been accepted. 
      
The ride is now scheduled and added to your upcoming rides. Please make sure to arrive on time and provide excellent service to your passenger.

Pickup: ${ride.pickupLocation}
Dropoff: ${ride.dropoffLocation}`;
      
      // Personalize message
      const personalizedMessage = this.personalizeMessage(
        message,
        character,
        driver.fullName.split(' ')[0] 
      );
      
      // Get preferences
      const preferences = driver.notificationPreferences as NotificationPreferences || 
        { email: true, sms: true, push: true };
      
      // Store notification
      await this.storeNotification({
        userId: driver.id,
        type: NotificationType.BID_ACCEPTED,
        title: `Bid Accepted for $${bid.amount.toFixed(2)}`,
        message: personalizedMessage,
        read: false,
        link: null,
        imageUrl: null,
        metadata: {
          bidId: bid.id,
          rideId: ride.id,
          character
        }
      });
      
      // Log notification
      console.log(`NOTIFICATION to ${driver.username} (${driver.role}): Bid accepted notification sent`);
      
      // Send email if preferred
      if (preferences.email) {
        await this.sendEmailNotification(
          driver.email,
          `MyAmbulex: Your bid has been accepted!`,
          message,
          driver.fullName.split(' ')[0],
          character
        );
      }
      
      // Send SMS if preferred
      if (preferences.sms) {
        await this.sendSMSNotification(
          driver.phone,
          this.personalizeMessage(
            `Great news! Your bid of $${bid.amount.toFixed(2)} has been accepted for ${rideDate} at ${rideTime}.`, // Shorter message for SMS
            character,
            driver.fullName.split(' ')[0]
          )
        );
      }
      
      return true;
    } catch (error) {
      console.error("Error sending bid accepted notification:", error);
      return false;
    }
  }
  
  /**
   * Send notification about ride status updates
   */
  async sendRideStatusUpdateNotification(
    ride: Ride,
    previousStatus: string,
    newStatus: string,
    updatedBy: User
  ): Promise<boolean> {
    try {
      // Determine who to notify based on who updated the status
      let recipientId: number | null = null;
      
      // Special handling for en_route status if updated by driver
      if (newStatus === "en_route" && updatedBy.role === 'driver' && ride.riderId) {
        // Send both the standard notification and the ETA notification
        await this._sendStatusUpdateToUser(ride.riderId, ride, previousStatus, newStatus);
        
        // Send ETA notification with estimated arrival time
        await this.sendDriverETANotification(ride, updatedBy);
        
        // Notification already sent, no need to continue
        return true;
      }
      
      // Standard notification flow
      if (updatedBy.role === 'driver') {
        // Driver updated the status, notify the rider
        recipientId = ride.riderId;
      } else if (updatedBy.role === 'rider') {
        // Rider updated the status, notify the driver (if assigned)
        recipientId = ride.driverId;
      } else {
        // Admin updated the status, notify both parties
        if (ride.driverId) {
          await this._sendStatusUpdateToUser(ride.driverId, ride, previousStatus, newStatus);
        }
        recipientId = ride.riderId;
      }
      
      if (recipientId) {
        return await this._sendStatusUpdateToUser(recipientId, ride, previousStatus, newStatus);
      }
      
      return false;
    } catch (error) {
      console.error("Error sending status update notification:", error);
      return false;
    }
  }
  
  /**
   * Send notification to driver about ride edit request
   */
  async sendRideEditRequestNotification(
    originalRide: Ride,
    rideEdit: RideEdit,
    requestedBy: User
  ): Promise<boolean> {
    try {
      // Ensure there's a driver assigned to the ride
      if (!originalRide.driverId) {
        console.log("No driver assigned to this ride for edit notification");
        return false;
      }
      
      // Get the driver
      const driver = await storage.getUser(originalRide.driverId);
      if (!driver) {
        console.log(`Driver with ID ${originalRide.driverId} not found for notification`);
        return false;
      }
      
      // Format dates
      const rideDate = new Date(originalRide.scheduledTime).toLocaleDateString();
      const rideTime = new Date(originalRide.scheduledTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Get data for comparison from ride edit object
      const original = rideEdit.originalData as Ride;
      const proposed = rideEdit.proposedData as Ride;
      
      // Build message with the changes
      const changes: string[] = [];
      
      // Compare scheduledTime
      if (new Date(proposed.scheduledTime).getTime() !== new Date(original.scheduledTime).getTime()) {
        const newDate = new Date(proposed.scheduledTime).toLocaleDateString();
        const newTime = new Date(proposed.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        changes.push(`Scheduled time changed from "${rideDate} at ${rideTime}" to "${newDate} at ${newTime}"`);
      }
      
      // Compare pickup location
      if (proposed.pickupLocation !== original.pickupLocation) {
        changes.push(`Pickup location changed from "${original.pickupLocation}" to "${proposed.pickupLocation}"`);
      }
      
      // Compare dropoff location
      if (proposed.dropoffLocation !== original.dropoffLocation) {
        changes.push(`Dropoff location changed from "${original.dropoffLocation}" to "${proposed.dropoffLocation}"`);
      }
      
      // Compare vehicle type
      if (proposed.vehicleType !== original.vehicleType) {
        changes.push(`Vehicle type changed from "${original.vehicleType}" to "${proposed.vehicleType}"`);
      }
      
      // Add accessibility changes if any
      if (proposed.needsRamp !== original.needsRamp) {
        changes.push(`Needs ramp: ${original.needsRamp ? 'Yes' : 'No'} → ${proposed.needsRamp ? 'Yes' : 'No'}`);
      }
      
      if (proposed.needsCompanion !== original.needsCompanion) {
        changes.push(`Needs companion: ${original.needsCompanion ? 'Yes' : 'No'} → ${proposed.needsCompanion ? 'Yes' : 'No'}`);
      }
      
      if (proposed.needsStairChair !== original.needsStairChair) {
        changes.push(`Needs stair chair: ${original.needsStairChair ? 'Yes' : 'No'} → ${proposed.needsStairChair ? 'Yes' : 'No'}`);
      }
      
      if (proposed.needsWaitTime !== original.needsWaitTime) {
        changes.push(`Needs wait time: ${original.needsWaitTime ? 'Yes' : 'No'} → ${proposed.needsWaitTime ? 'Yes' : 'No'}`);
      }
      
      if (proposed.specialInstructions !== original.specialInstructions) {
        changes.push(`Special instructions were updated`);
      }
      
      // Add the request notes if available
      if ((rideEdit as any).requestNotes) {
        changes.push(`Rider provided the following reason: "${(rideEdit as any).requestNotes}"`);
      }
      
      // Create message
      const baseMessage = `The rider has requested changes to their scheduled ride on ${rideDate} at ${rideTime}.`;
      const changesMessage = changes.length > 0 
        ? `\n\nRequested changes:\n• ${changes.join('\n• ')}` 
        : '\n\nThe rider has updated their ride details.';
      const actionMessage = `\n\nPlease review these changes and either accept or reject them through your driver dashboard. If you reject the changes, the ride will be cancelled.`;
      
      const message = baseMessage + changesMessage + actionMessage;
      
      // Choose character (Assistant for official notifications)
      const character = FriendlyCharacter.ASSISTANT;
      
      // Get preferences
      const preferences = driver.notificationPreferences as NotificationPreferences || 
        { email: true, sms: true, push: true };
      
      // Store notification
      await this.storeNotification({
        userId: driver.id,
        type: NotificationType.RIDE_EDIT_REQUESTED,
        title: `Ride Edit Request for ${rideDate}`,
        message: this.personalizeMessage(message, character, driver.fullName.split(' ')[0]),
        read: false,
        link: null,
        imageUrl: null,
        metadata: {
          rideId: originalRide.id,
          rideEditId: rideEdit.id,
          changes,
          character
        }
      });
      
      // Send email notification if preferred
      if (preferences.email) {
        await this.sendEmailNotification(
          driver.email,
          `MyAmbulex: Ride Edit Request for ${rideDate}`,
          message,
          driver.fullName.split(' ')[0],
          character
        );
      }
      
      // Send SMS notification if preferred
      if (preferences.sms) {
        await this.sendSMSNotification(
          driver.phone,
          this.personalizeMessage(
            `${baseMessage} Please check the app to review the requested changes.`,
            character,
            driver.fullName.split(' ')[0]
          )
        );
      }
      
      console.log(`NOTIFICATION to ${driver.username} (driver): Ride edit request notification sent`);
      return true;
    } catch (error) {
      console.error("Error sending ride edit request notification:", error);
      return false;
    }
  }
  
  /**
   * Send notification to rider about driver's response to edit request
   */
  async sendRideEditResponseNotification(
    ride: Ride,
    rideEdit: RideEdit,
    respondedBy: User,
    isAccepted: boolean
  ): Promise<boolean> {
    try {
      // Get the rider
      const rider = await storage.getUser(ride.riderId);
      if (!rider) {
        console.log(`Rider with ID ${ride.riderId} not found for notification`);
        return false;
      }
      
      // Format date
      const rideDate = new Date(ride.scheduledTime).toLocaleDateString();
      const rideTime = new Date(ride.scheduledTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Create message based on accept/reject
      let message: string;
      let title: string;
      const notificationType = isAccepted 
        ? NotificationType.RIDE_EDIT_ACCEPTED 
        : NotificationType.RIDE_EDIT_REJECTED;
      
      if (isAccepted) {
        title = `Ride Edit Request Accepted`;
        message = `Great news! Your driver has accepted the changes to your ride scheduled for ${rideDate} at ${rideTime}.` +
          `\n\nYour updated ride details have been saved, and your driver will arrive as scheduled.`;
      } else {
        title = `Ride Edit Request Rejected`;
        message = `Your driver could not accommodate the changes to your ride scheduled for ${rideDate} at ${rideTime}, ` +
          `and the ride has been cancelled.`;
      }

      // Add notes from driver if provided
      if (rideEdit.responseNotes) {
        message += `\n\nDriver's note: "${rideEdit.responseNotes}"`;
      }
      
      if (!isAccepted) {
        message += `\n\nYou can schedule a new ride with your updated requirements through the app.`;
      }
      
      // Choose character (Driver for personalization)
      const character = FriendlyCharacter.DRIVER;
      
      // Get preferences
      const preferences = rider.notificationPreferences as NotificationPreferences || 
        { email: true, sms: true, push: true };
      
      // Store notification
      await this.storeNotification({
        userId: rider.id,
        type: notificationType,
        title: title,
        message: this.personalizeMessage(message, character, rider.fullName.split(' ')[0]),
        read: false,
        link: null,
        imageUrl: null,
        metadata: {
          rideId: ride.id,
          rideEditId: rideEdit.id,
          isAccepted,
          responseNotes: rideEdit.responseNotes || null,
          character
        }
      });
      
      // Send email notification if preferred
      if (preferences.email) {
        await this.sendEmailNotification(
          rider.email,
          `MyAmbulex: ${title} for ${rideDate}`,
          message,
          rider.fullName.split(' ')[0],
          character
        );
      }
      
      // Send SMS notification if preferred
      if (preferences.sms) {
        await this.sendSMSNotification(
          rider.phone,
          this.personalizeMessage(
            isAccepted 
              ? `Your ride changes for ${rideDate} have been accepted by your driver.` 
              : `Your ride changes for ${rideDate} were not accepted and the ride has been cancelled.`,
            character,
            rider.fullName.split(' ')[0]
          )
        );
      }
      
      console.log(`NOTIFICATION to ${rider.username} (rider): Ride edit ${isAccepted ? 'acceptance' : 'rejection'} notification sent`);
      return true;
    } catch (error) {
      console.error("Error sending ride edit response notification:", error);
      return false;
    }
  }
  
  /**
   * Helper method to send a status update notification to a specific user
   */
  /**
   * Send driver ETA notification to rider
   * This is triggered when a driver updates status to en_route
   */
  async sendDriverETANotification(
    ride: Ride,
    driver: User,
    etaMinutes?: number
  ): Promise<boolean> {
    try {
      if (!ride.riderId) {
        console.log("No rider to notify about ETA");
        return false;
      }
      
      // Get rider to notify
      const rider = await storage.getUser(ride.riderId);
      if (!rider) {
        console.log(`Rider with ID ${ride.riderId} not found for ETA notification`);
        return false;
      }
      
      // If etaMinutes isn't provided, calculate a reasonable estimate based on distance
      // This is a simplified estimation. In a production environment, you would use actual
      // navigation data from Google Maps Distance Matrix API or similar service
      const estimatedMinutes = etaMinutes || this.calculateETAFromDistance(ride.estimatedDistance);
      
      // Create a personalized ETA message
      const title = "Driver ETA Update";
      const message = `Your driver is en route to pick you up at ${ride.pickupLocation}. ` +
        `Estimated arrival time: ${estimatedMinutes} minutes. ` +
        `You'll receive updates as your driver gets closer.`;
      
      // Store metadata for the notification
      const metadata = {
        rideId: ride.id,
        driverId: driver.id,
        estimatedMinutes: estimatedMinutes,
        timestamp: new Date().toISOString()
      };
      
      // Create and send the notification
      await this.storeNotification({
        userId: rider.id,
        type: NotificationType.DRIVER_ETA_UPDATE,
        title,
        message: this.personalizeMessage(message, FriendlyCharacter.DRIVER, rider.fullName.split(' ')[0]),
        read: false,
        link: `/rider/rides/${ride.id}`,
        imageUrl: null,
        metadata
      });
      
      // Send email if applicable
      if (rider.email) {
        await this.sendEmailNotification(
          rider.email,
          title,
          message,
          rider.fullName.split(' ')[0],
          FriendlyCharacter.DRIVER
        );
      }
      
      return true;
    } catch (error) {
      console.error("Error sending driver ETA notification:", error);
      return false;
    }
  }
  
  /**
   * Send notification to rider when a new bid is received
   */
  async sendNewBidNotification(
    bid: Bid,
    ride: Ride
  ): Promise<boolean> {
    try {
      if (!ride.riderId) {
        console.log("No rider to notify about new bid");
        return false;
      }
      
      // Get rider to notify
      const rider = await storage.getUser(ride.riderId);
      if (!rider) {
        console.log(`Rider with ID ${ride.riderId} not found for new bid notification`);
        return false;
      }
      
      // Get driver info for the notification
      const driver = await storage.getUser(bid.driverId);
      if (!driver) {
        console.log(`Driver with ID ${bid.driverId} not found for new bid notification`);
        return false;
      }
      
      const title = "New Bid Received";
      const message = `${driver.fullName} has submitted a bid of $${bid.amount.toFixed(2)} for your ride from ${ride.pickupLocation} to ${ride.dropoffLocation}. ` +
        `Review the bid details and accept if it meets your needs.`;
      
      // Create and send the notification
      await this.storeNotification({
        userId: rider.id,
        type: NotificationType.NEW_BID,
        title,
        message: this.personalizeMessage(message, FriendlyCharacter.ASSISTANT, rider.fullName.split(' ')[0]),
        read: false,
        link: `/rider/rides/${ride.id}/bids`,
        imageUrl: null,
        metadata: {
          rideId: ride.id,
          bidId: bid.id,
          driverId: bid.driverId,
          amount: bid.amount,
          timestamp: new Date().toISOString()
        }
      });
      
      // Send email if applicable
      if (rider.email) {
        await this.sendEmailNotification(
          rider.email,
          title,
          message,
          rider.fullName.split(' ')[0]
        );
      }
      
      return true;
    } catch (error) {
      console.error("Error sending new bid notification:", error);
      return false;
    }
  }
  
  /**
   * Send notification for multiple bids received
   */
  async sendMultipleBidsNotification(
    ride: Ride,
    bidCount: number
  ): Promise<boolean> {
    try {
      if (!ride.riderId) {
        console.log("No rider to notify about multiple bids");
        return false;
      }
      
      // Get rider to notify
      const rider = await storage.getUser(ride.riderId);
      if (!rider) {
        console.log(`Rider with ID ${ride.riderId} not found for multiple bids notification`);
        return false;
      }
      
      const title = "Multiple Ride Bids Received";
      const message = `You've received ${bidCount} bids for your ride from ${ride.pickupLocation}. ` +
        `Review offers and select the driver that best fits your needs.`;
      
      // Create and send the notification
      await this.storeNotification({
        userId: rider.id,
        type: NotificationType.MULTIPLE_BIDS_RECEIVED,
        title,
        message: this.personalizeMessage(message, FriendlyCharacter.ASSISTANT, rider.fullName.split(' ')[0]),
        read: false,
        link: `/rider/rides/${ride.id}/bids`,
        imageUrl: null,
        metadata: {
          rideId: ride.id,
          bidCount: bidCount,
          timestamp: new Date().toISOString()
        }
      });
      
      // Send email if applicable
      if (rider.email) {
        await this.sendEmailNotification(
          rider.email,
          title,
          message,
          rider.fullName.split(' ')[0]
        );
      }
      
      return true;
    } catch (error) {
      console.error("Error sending multiple bids notification:", error);
      return false;
    }
  }
  
  /**
   * Send notification to driver when their bid is selected
   */
  async sendBidSelectedNotification(
    bid: Bid,
    ride: Ride
  ): Promise<boolean> {
    try {
      // Get the driver to notify
      const driver = await storage.getUser(bid.driverId);
      if (!driver) {
        console.log(`Driver with ID ${bid.driverId} not found for bid selection notification`);
        return false;
      }
      
      // Get rider info for the notification
      const rider = await storage.getUser(ride.riderId);
      if (!rider) {
        console.log(`Rider with ID ${ride.riderId} not found for bid selection context`);
        return false;
      }
      
      const title = "Your Bid Was Selected";
      const message = `Congratulations! ${rider.username} has selected your bid for the ride from ${ride.pickupLocation} to ${ride.dropoffLocation}. ` +
        `Please confirm the ride details and be ready for pickup at the scheduled time.`;
      
      // Create and send the notification
      await this.storeNotification({
        userId: driver.id,
        type: NotificationType.BID_SELECTED,
        title,
        message: this.personalizeMessage(message, FriendlyCharacter.ASSISTANT, driver.fullName.split(' ')[0]),
        read: false,
        link: `/driver/rides/${ride.id}`,
        imageUrl: null,
        metadata: {
          rideId: ride.id,
          bidId: bid.id,
          amount: bid.amount,
          timestamp: new Date().toISOString()
        }
      });
      
      // Send email if applicable
      if (driver.email) {
        await this.sendEmailNotification(
          driver.email,
          title,
          message,
          driver.fullName.split(' ')[0]
        );
      }
      
      return true;
    } catch (error) {
      console.error("Error sending bid selected notification:", error);
      return false;
    }
  }
  
  /**
   * Send notification to driver when their bid is rejected
   */
  async sendBidRejectedNotification(
    bid: Bid,
    ride: Ride
  ): Promise<boolean> {
    try {
      // Get the driver to notify
      const driver = await storage.getUser(bid.driverId);
      if (!driver) {
        console.log(`Driver with ID ${bid.driverId} not found for bid rejection notification`);
        return false;
      }
      
      const title = "Bid Not Selected";
      const message = `Your bid for the ride from ${ride.pickupLocation} to ${ride.dropoffLocation} was not selected. ` +
        `Don't worry - there are plenty of other rides available in your area.`;
      
      // Create and send the notification
      await this.storeNotification({
        userId: driver.id,
        type: NotificationType.BID_REJECTED,
        title,
        message: this.personalizeMessage(message, FriendlyCharacter.ASSISTANT, driver.fullName.split(' ')[0]),
        read: false,
        link: `/driver/available-rides`,
        imageUrl: null,
        metadata: {
          rideId: ride.id,
          bidId: bid.id,
          amount: bid.amount,
          timestamp: new Date().toISOString()
        }
      });
      
      // Send email if applicable
      if (driver.email) {
        await this.sendEmailNotification(
          driver.email,
          title,
          message,
          driver.fullName.split(' ')[0]
        );
      }
      
      return true;
    } catch (error) {
      console.error("Error sending bid rejected notification:", error);
      return false;
    }
  }
  
  /**
   * Send document rejection notification to driver
   */
  async sendDocumentRejectionNotification(
    driverId: number,
    rejectedDocuments: string[],
    rejectionReasons: string[],
    unlockAccount: boolean = true
  ): Promise<boolean> {
    try {
      // Get the driver to notify
      const driver = await storage.getUser(driverId);
      if (!driver) {
        console.log(`Driver with ID ${driverId} not found for document rejection notification`);
        return false;
      }
      
      const title = "Document Review Required";
      const rejectionSummary = rejectedDocuments.map((doc, index) => 
        `• ${doc}: ${rejectionReasons[index] || 'Please resubmit'}`
      ).join('\n');
      
      const message = `Your document submission has been reviewed and requires attention:\n\n${rejectionSummary}\n\n` +
        `Please review the feedback carefully and ensure all documents meet our requirements before resubmitting.\n\n` +
        `${unlockAccount ? 'Your account has been unlocked. You can now log in to re-upload the required documents.' : 'Please contact support for assistance.'}`;
      
      // Get preferences
      const preferences = driver.notificationPreferences as NotificationPreferences || 
        { email: true, sms: true, push: true };
      
      // Store notification
      await this.storeNotification({
        userId: driver.id,
        type: NotificationType.DOCUMENT_REJECTED,
        title,
        message: this.personalizeMessage(message, FriendlyCharacter.ASSISTANT, driver.fullName.split(' ')[0]),
        read: false,
        link: `/driver/document-verification`,
        imageUrl: null,
        metadata: {
          rejectedDocuments,
          rejectionReasons,
          unlockAccount,
          timestamp: new Date().toISOString()
        }
      });
      
      // Send email notification if preferred
      if (preferences.email) {
        await this.sendEmailNotification(
          driver.email,
          `MyAmbulex: ${title}`,
          message,
          driver.fullName.split(' ')[0],
          FriendlyCharacter.ASSISTANT
        );
      }
      
      // Send SMS notification if preferred
      if (preferences.sms) {
        await this.sendSMSNotification(
          driver.phone,
          this.personalizeMessage(
            `Document review required. ${rejectedDocuments.length} document${rejectedDocuments.length > 1 ? 's' : ''} need${rejectedDocuments.length > 1 ? '' : 's'} resubmission. Check your email for details.`,
            FriendlyCharacter.ASSISTANT,
            driver.fullName.split(' ')[0]
          )
        );
      }
      
      console.log(`DOCUMENT REJECTION NOTIFICATION sent to ${driver.username} (driver): ${rejectedDocuments.join(', ')} rejected`);
      return true;
    } catch (error) {
      console.error("Error sending document rejection notification:", error);
      return false;
    }
  }

  /**
   * Helper method to calculate ETA based on distance
   * This is a simplified estimation for demo purposes
   * In production, use actual navigation API data
   */
  private calculateETAFromDistance(distanceMiles?: number): number {
    // Default to 15 minutes if no distance provided
    if (!distanceMiles) return 15;
    
    // Simple calculation: assume average speed of 30 mph in urban areas
    const estimatedMinutes = Math.round((distanceMiles / 30) * 60);
    
    // Ensure a minimum of 5 minutes and maximum of 60 minutes
    return Math.min(Math.max(estimatedMinutes, 5), 60);
  }

  private async _sendStatusUpdateToUser(
    userId: number,
    ride: Ride,
    previousStatus: string,
    newStatus: string
  ): Promise<boolean> {
    try {
      // Get the user to notify
      const user = await storage.getUser(userId);
      if (!user) {
        console.log(`User with ID ${userId} not found for status update notification`);
        return false;
      }
      
      // Choose appropriate character and messaging based on the status update
      let character = FriendlyCharacter.ASSISTANT;
      let title = "";
      let message = "";
      
      switch (newStatus) {
        case "en_route":
          character = FriendlyCharacter.DRIVER;
          title = "Driver En Route";
          message = `Your driver is now on the way to pick you up at ${ride.pickupLocation}. The driver will be arriving shortly.`;
          break;
        
        case "arrived":
          character = FriendlyCharacter.DRIVER;
          title = "Driver Has Arrived";
          message = `Your driver has arrived at the pickup location (${ride.pickupLocation}) and is waiting for you.`;
          break;
          
        case "in_progress":
          character = FriendlyCharacter.DRIVER;
          title = "Ride In Progress";
          message = `Your ride is now in progress. The driver is taking you to ${ride.dropoffLocation}. Enjoy your journey!`;
          break;
          
        case "completed":
          character = FriendlyCharacter.ASSISTANT;
          title = "Ride Completed";
          message = `Your ride has been completed successfully! Thank you for choosing MyAmbulex for your transportation needs.`;
          break;
          
        case "cancelled":
          character = FriendlyCharacter.ASSISTANT;
          title = "Ride Cancelled";
          message = `Your ride scheduled for ${new Date(ride.scheduledTime).toLocaleString()} has been cancelled.`;
          break;
          
        default:
          title = `Ride Status Update`;
          message = `Your ride status has been updated from ${previousStatus} to ${newStatus}.`;
      }
      
      // Personalize the message
      const personalizedMessage = this.personalizeMessage(
        message,
        character,
        user.fullName.split(' ')[0]
      );
      
      // Get preferences
      const preferences = user.notificationPreferences as NotificationPreferences || 
        { email: true, sms: true, push: true };
      
      // Store notification
      await this.storeNotification({
        userId: user.id,
        type: NotificationType.RIDE_CONFIRMED, // Using an existing type
        title: title,
        message: personalizedMessage,
        read: false,
        link: null,
        imageUrl: null,
        metadata: {
          rideId: ride.id,
          previousStatus,
          newStatus,
          character
        }
      });
      
      // Send email if preferred
      if (preferences.email && user.email) {
        await this.sendEmailNotification(
          user.email,
          `MyAmbulex: ${title}`,
          message,
          user.fullName.split(' ')[0],
          character
        );
      }
      
      // Send SMS if preferred
      if (preferences.sms && user.phone) {
        await this.sendSMSNotification(
          user.phone,
          this.personalizeMessage(
            message.split('\n')[0], // First line only for SMS
            character,
            user.fullName.split(' ')[0]
          )
        );
      }
      
      console.log(`Status update notification sent to ${user.username} (${user.role}): ${title}`);
      return true;
    } catch (error) {
      console.error("Error sending status update notification to user:", error);
      return false;
    }
  }
  
  /**
   * Send an email notification with personalized character
   */
  private async sendEmailNotification(
    toEmail: string,
    subject: string,
    message: string,
    userName: string = "there",
    character: FriendlyCharacter = FriendlyCharacter.ASSISTANT
  ): Promise<boolean> {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.log("Email notification skipped: SendGrid API key not configured");
        return false;
      }
      
      const msg = {
        to: toEmail,
        from: 'notifications@myambulex.com', // Replace with your verified sender
        subject: subject,
        text: this.personalizeMessage(message, character, userName),
        html: this.createEmailTemplate(message, userName, character),
      };
      
      await sgMail.send(msg);
      console.log(`Email notification sent to ${toEmail}`);
      return true;
    } catch (error) {
      console.error("Error sending email notification:", error);
      return false;
    }
  }
  
  /**
   * Send an SMS notification with personalized content
   * Note: This is a placeholder for actual SMS implementation
   * In a production app, you would integrate with Twilio, AWS SNS, or similar
   */
  private async sendSMSNotification(
    phoneNumber: string,
    message: string
  ): Promise<boolean> {
    try {
      if (!twilioClient || !process.env.TWILIO_PHONE_NUMBER) {
        console.warn("Twilio client or phone number not configured. Falling back to logging SMS instead of sending it.");
        console.log(`Would send SMS to ${phoneNumber}: ${message}`);
        return true;
      }
      
      // Format the phone number if it doesn't have country code
      const formattedPhoneNumber = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+1${phoneNumber.replace(/\D/g, '')}`; // Default to US (+1)
      
      // Send SMS via Twilio
      const result = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhoneNumber
      });
      
      console.log(`SMS sent successfully via Twilio. SID: ${result.sid}`);
      return true;
    } catch (error) {
      console.error("Error sending SMS notification:", error);
      // Fall back to logging if there's an error with Twilio
      console.log(`Fallback - Would send SMS to ${phoneNumber}: ${message}`);
      return false;
    }
  }
  
  /**
   * Send a notification for a new chat message
   */
  async sendChatMessageNotification(
    message: ChatMessage,
    senderUser: User,
    recipientId: number
  ): Promise<Notification | null> {
    try {
      // Get recipient user
      const recipient = await storage.getUser(recipientId);
      if (!recipient) {
        console.log(`Recipient with ID ${recipientId} not found for chat notification`);
        return null;
      }
      
      // Create a preview of the message (truncate if too long)
      const messagePreview = message.content.length > 50 
        ? `${message.content.substring(0, 50)}...` 
        : message.content;
      
      // Create notification
      const notification = await this.storeNotification({
        userId: recipientId,
        type: NotificationType.NEW_CHAT_MESSAGE,
        title: `New message from ${senderUser.fullName}`,
        message: messagePreview,
        read: false,
        metadata: {
          messageId: message.id,
          conversationId: message.conversationId,
          senderId: senderUser.id,
          timestamp: message.createdAt
        }
      });
      
      // No need to send email for chat messages
      // Real-time notification will be handled by WebSocket
      
      return notification;
    } catch (error) {
      console.error("Error sending chat message notification:", error);
      return null;
    }
  }
  
  /**
   * Send a typing indicator notification via WebSocket
   * (This doesn't create a persistent notification, just a real-time signal)
   */
  prepareTypingNotification(
    conversationId: number,
    userId: number,
    isTyping: boolean
  ): any {
    return {
      type: NotificationType.CHAT_TYPING,
      conversationId,
      userId,
      isTyping,
      timestamp: new Date()
    };
  }
  
  /**
   * Prepare a read receipt notification via WebSocket
   * (This doesn't create a persistent notification, just a real-time signal)
   */
  prepareReadReceiptNotification(
    conversationId: number,
    userId: number,
    lastReadMessageId: number
  ): any {
    return {
      type: NotificationType.CHAT_READ_RECEIPT,
      conversationId,
      userId,
      lastReadMessageId,
      timestamp: new Date()
    };
  }

  /**
   * Create and send a notification to a specific user
   */
  async createAndSendNotification(notificationData: {
    userId: number;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    imageUrl?: string;
    metadata?: Record<string, any>;
  }): Promise<Notification | null> {
    try {
      // Get the user to notify
      const user = await storage.getUser(notificationData.userId);
      if (!user) {
        console.log(`User with ID ${notificationData.userId} not found for notification`);
        return null;
      }
      
      // Store notification
      const notification = await this.storeNotification({
        userId: notificationData.userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        read: false,
        link: notificationData.link,
        imageUrl: notificationData.imageUrl,
        metadata: notificationData.metadata
      });
      
      // Send email if user has email notifications enabled
      if (user.notificationPreferences?.email && user.email) {
        await this.sendEmailNotification(
          user.email,
          notificationData.title,
          notificationData.message,
          user.fullName || user.username,
          FriendlyCharacter.ASSISTANT
        );
      }
      
      // Send SMS if enabled
      if (user.notificationPreferences?.sms && user.phone) {
        // Format the SMS message with a personalized greeting
        const personalizedMessage = this.personalizeMessage(
          `${notificationData.title}: ${notificationData.message}`,
          FriendlyCharacter.ASSISTANT,
          user.fullName || user.username
        );
        
        await this.sendSMSNotification(
          user.phone,
          personalizedMessage
        );
      }
      
      return notification;
    } catch (error) {
      console.error("Error creating and sending notification:", error);
      return null;
    }
  }
  
  /**
   * Send a system-wide notification to all users or users with specific roles
   */
  async createAndSendSystemWideNotification(data: {
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    imageUrl?: string;
    metadata?: Record<string, any>;
    onlyRoles?: string[];
    excludeRoles?: string[];
  }): Promise<number> {
    try {
      // Get all users
      const allUsers = await storage.getAllUsers();
      if (!allUsers || allUsers.length === 0) {
        console.log('No users found for system-wide notification');
        return 0;
      }
      
      // Filter users by role if specified
      let targetUsers = [...allUsers];
      
      if (data.onlyRoles && data.onlyRoles.length > 0) {
        targetUsers = targetUsers.filter(user => 
          data.onlyRoles!.includes(user.role)
        );
      }
      
      if (data.excludeRoles && data.excludeRoles.length > 0) {
        targetUsers = targetUsers.filter(user => 
          !data.excludeRoles!.includes(user.role)
        );
      }
      
      // Send notification to each user
      const promises = targetUsers.map(user => 
        this.createAndSendNotification({
          userId: user.id,
          type: data.type,
          title: data.title,
          message: data.message,
          link: data.link,
          imageUrl: data.imageUrl,
          metadata: data.metadata
        })
      );
      
      const results = await Promise.all(promises);
      const successCount = results.filter(Boolean).length;
      
      console.log(`Successfully sent system-wide notification to ${successCount} of ${targetUsers.length} users`);
      return successCount;
    } catch (error) {
      console.error("Error sending system-wide notification:", error);
      return 0;
    }
  }
}

// Export a singleton instance
export const notificationService = new NotificationService();