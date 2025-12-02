import { MailService } from '@sendgrid/mail';
import twilio from 'twilio';
import { storage } from './storage';
import { sseManager } from './sse-manager';

interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  emailTemplate: string;
  smsTemplate: string;
  pushTemplate: string;
  category: 'ride_update' | 'payment' | 'alert' | 'system';
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

interface NotificationPreferences {
  userId: number;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  rideUpdates: boolean;
  paymentAlerts: boolean;
  systemAlerts: boolean;
  marketingEmails: boolean;
  emergencyOnly: boolean;
}

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export class AdvancedNotificationService {
  private mailService: MailService;
  private twilioClient: any;
  private templates: Map<string, NotificationTemplate> = new Map();
  private pushSubscriptions: Map<number, any[]> = new Map();

  constructor() {
    this.setupEmailService();
    this.setupSMSService();
    this.initializeTemplates();
  }

  private setupEmailService(): void {
    const apiKey = process.env.SENDGRID_API_KEY?.trim();
    if (apiKey && apiKey !== '' && !apiKey.includes('your_')) {
      try {
        this.mailService = new MailService();
        this.mailService.setApiKey(apiKey);
        console.log('✅ SendGrid email service initialized');
      } catch (error) {
        console.warn('⚠️  Failed to initialize SendGrid:', error);
      }
    } else {
      console.log('ℹ️  SendGrid API key not configured. Email notifications will be disabled.');
    }
  }

  private setupSMSService(): void {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    
    if (accountSid && authToken && 
        accountSid !== '' && authToken !== '' &&
        !accountSid.includes('your_') && !authToken.includes('your_')) {
      
      // Validate Twilio Account SID format (must start with "AC")
      if (accountSid.startsWith('AC')) {
        try {
          this.twilioClient = twilio(accountSid, authToken);
          console.log('✅ Twilio SMS service initialized');
        } catch (error) {
          console.warn('⚠️  Failed to initialize Twilio:', error);
          console.warn('⚠️  SMS notifications will be disabled.');
        }
      } else {
        console.warn('⚠️  Invalid Twilio Account SID format. Account SID must start with "AC".');
        console.warn('⚠️  SMS notifications will be disabled.');
      }
    } else {
      console.log('ℹ️  Twilio credentials not configured. SMS notifications will be disabled.');
    }
  }

  /**
   * Send comprehensive notification through all enabled channels
   */
  async sendNotification(
    userId: number,
    templateId: string,
    data: any,
    options?: {
      forceEmail?: boolean;
      forceSMS?: boolean;
      forcePush?: boolean;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    }
  ): Promise<{
    success: boolean;
    results: {
      email?: { success: boolean; messageId?: string; error?: string };
      sms?: { success: boolean; sid?: string; error?: string };
      push?: { success: boolean; sent: number; error?: string };
      realtime?: { success: boolean; error?: string };
    };
  }> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      const preferences = await this.getUserNotificationPreferences(userId);
      const results: any = {};

      // Determine if notification should be sent based on preferences and priority
      const shouldSend = this.shouldSendNotification(template, preferences, options);

      // Send email notification
      if ((shouldSend.email || options?.forceEmail) && user.email) {
        results.email = await this.sendEmailNotification(user.email, template, data);
      }

      // Send SMS notification
      if ((shouldSend.sms || options?.forceSMS) && user.phone) {
        results.sms = await this.sendSMSNotification(user.phone, template, data);
      }

      // Send push notification
      if (shouldSend.push || options?.forcePush) {
        results.push = await this.sendPushNotification(userId, template, data);
      }

      // Send real-time notification via SSE
      results.realtime = await this.sendRealtimeNotification(userId, template, data);

      // Log notification
      await this.logNotification(userId, templateId, data, results);

      return {
        success: true,
        results
      };
    } catch (error) {
      console.error('Error sending notification:', error);
      return {
        success: false,
        results: {
          email: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
      };
    }
  }

  /**
   * Send ride tracking notification with location updates
   */
  async sendRideTrackingNotification(
    userId: number,
    rideId: number,
    event: 'started' | 'stopped' | 'pickup' | 'dropoff' | 'location_update',
    message: string,
    location?: any
  ): Promise<boolean> {
    try {
      const data = {
        rideId,
        event,
        message,
        location,
        timestamp: new Date().toISOString()
      };

      // Send real-time update via SSE
      const realtimeSuccess = sseManager.sendToUser(userId, {
        event: 'ride_tracking',
        data,
        id: `tracking_${rideId}_${Date.now()}`
      });

      // For critical events, also send SMS
      if (event === 'started' || event === 'pickup' || event === 'dropoff') {
        const templateId = `ride_${event}`;
        await this.sendNotification(userId, templateId, data, {
          priority: 'high'
        });
      }

      return realtimeSuccess;
    } catch (error) {
      console.error('Error sending ride tracking notification:', error);
      return false;
    }
  }

  /**
   * Send ride alert notification
   */
  async sendRideAlertNotification(
    userId: number,
    rideId: number,
    alertType: string,
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<boolean> {
    try {
      const data = {
        rideId,
        alertType,
        message,
        severity,
        timestamp: new Date().toISOString()
      };

      // Send via SSE immediately
      sseManager.sendAlert(userId, data);

      // For high/critical alerts, send SMS immediately
      if (severity === 'high' || severity === 'critical') {
        await this.sendNotification(userId, 'ride_alert', data, {
          forceSMS: true,
          priority: 'urgent'
        });
      }

      return true;
    } catch (error) {
      console.error('Error sending ride alert notification:', error);
      return false;
    }
  }

  /**
   * Send SMS alert for urgent situations
   */
  async sendSMSAlert(phone: string, message: string): Promise<boolean> {
    if (!this.twilioClient) {
      console.warn('Twilio not configured, skipping SMS alert');
      return false;
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        to: phone,
        from: process.env.TWILIO_PHONE_NUMBER
      });

      console.log(`SMS alert sent: ${result.sid}`);
      return true;
    } catch (error) {
      console.error('Error sending SMS alert:', error);
      return false;
    }
  }

  /**
   * Register push notification subscription
   */
  async registerPushSubscription(userId: number, subscription: any): Promise<boolean> {
    try {
      if (!this.pushSubscriptions.has(userId)) {
        this.pushSubscriptions.set(userId, []);
      }

      const userSubscriptions = this.pushSubscriptions.get(userId)!;
      
      // Check if subscription already exists
      const exists = userSubscriptions.some(sub => 
        sub.endpoint === subscription.endpoint
      );

      if (!exists) {
        userSubscriptions.push({
          ...subscription,
          registeredAt: new Date()
        });
      }

      console.log(`Push subscription registered for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error registering push subscription:', error);
      return false;
    }
  }

  /**
   * Send real-time location updates
   */
  async sendLocationUpdate(rideId: number, location: any): Promise<boolean> {
    try {
      // Get ride participants
      const ride = await storage.getRide(rideId);
      if (!ride) return false;

      // Send to both rider and driver via SSE
      const participants = [ride.riderId];
      if (ride.driverId) {
        participants.push(ride.driverId);
      }

      let successCount = 0;
      for (const userId of participants) {
        if (sseManager.sendLocationUpdate(rideId, location)) {
          successCount++;
        }
      }

      return successCount > 0;
    } catch (error) {
      console.error('Error sending location update:', error);
      return false;
    }
  }

  /**
   * Get user notification preferences
   */
  private async getUserNotificationPreferences(userId: number): Promise<NotificationPreferences> {
    // This would typically come from a database table
    // For now, return default preferences
    return {
      userId,
      emailEnabled: true,
      smsEnabled: true,
      pushEnabled: true,
      rideUpdates: true,
      paymentAlerts: true,
      systemAlerts: true,
      marketingEmails: false,
      emergencyOnly: false
    };
  }

  /**
   * Determine if notification should be sent based on preferences
   */
  private shouldSendNotification(
    template: NotificationTemplate,
    preferences: NotificationPreferences,
    options?: any
  ): { email: boolean; sms: boolean; push: boolean } {
    // Emergency notifications always go through
    if (template.priority === 'urgent' || preferences.emergencyOnly) {
      return {
        email: preferences.emailEnabled,
        sms: preferences.smsEnabled,
        push: preferences.pushEnabled
      };
    }

    // Check category preferences
    let categoryEnabled = true;
    switch (template.category) {
      case 'ride_update':
        categoryEnabled = preferences.rideUpdates;
        break;
      case 'payment':
        categoryEnabled = preferences.paymentAlerts;
        break;
      case 'system':
        categoryEnabled = preferences.systemAlerts;
        break;
    }

    return {
      email: preferences.emailEnabled && categoryEnabled,
      sms: preferences.smsEnabled && categoryEnabled && template.priority !== 'low',
      push: preferences.pushEnabled && categoryEnabled
    };
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    email: string,
    template: NotificationTemplate,
    data: any
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.mailService) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const compiledSubject = this.compileTemplate(template.subject, data);
      const compiledBody = this.compileTemplate(template.emailTemplate, data);

      const result = await this.mailService.send({
        to: email,
        from: 'noreply@myambulex.com',
        subject: compiledSubject,
        html: compiledBody
      });

      return { success: true, messageId: result[0].headers['x-message-id'] };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    phone: string,
    template: NotificationTemplate,
    data: any
  ): Promise<{ success: boolean; sid?: string; error?: string }> {
    if (!this.twilioClient) {
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      const compiledMessage = this.compileTemplate(template.smsTemplate, data);

      const result = await this.twilioClient.messages.create({
        body: compiledMessage,
        to: phone,
        from: process.env.TWILIO_PHONE_NUMBER
      });

      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('SMS send error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    userId: number,
    template: NotificationTemplate,
    data: any
  ): Promise<{ success: boolean; sent: number; error?: string }> {
    try {
      const userSubscriptions = this.pushSubscriptions.get(userId) || [];
      if (userSubscriptions.length === 0) {
        return { success: false, sent: 0, error: 'No push subscriptions found' };
      }

      const payload: PushNotificationPayload = {
        title: template.name,
        body: this.compileTemplate(template.pushTemplate, data),
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: template.id,
        data: { templateId: template.id, ...data }
      };

      // This would integrate with Web Push API
      // For now, we'll just log the attempt
      console.log('Would send push notification:', payload);

      return { success: true, sent: userSubscriptions.length };
    } catch (error) {
      console.error('Push notification error:', error);
      return { success: false, sent: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send real-time notification via SSE
   */
  private async sendRealtimeNotification(
    userId: number,
    template: NotificationTemplate,
    data: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const success = sseManager.sendNotification(userId, {
        id: template.id,
        type: template.category,
        title: template.name,
        message: this.compileTemplate(template.pushTemplate, data),
        priority: template.priority,
        data,
        timestamp: new Date().toISOString()
      });

      return { success };
    } catch (error) {
      console.error('Real-time notification error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Compile template with data
   */
  private compileTemplate(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  /**
   * Log notification for audit trail
   */
  private async logNotification(
    userId: number,
    templateId: string,
    data: any,
    results: any
  ): Promise<void> {
    try {
      // This would typically go to a notifications log table
      console.log('Notification sent:', {
        userId,
        templateId,
        timestamp: new Date(),
        results: Object.keys(results).map(channel => ({
          channel,
          success: results[channel]?.success || false
        }))
      });
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }

  /**
   * Initialize notification templates
   */
  private initializeTemplates(): void {
    const templates: NotificationTemplate[] = [
      {
        id: 'ride_started',
        name: 'Ride Started',
        subject: 'Your MyAmbulex ride has started',
        emailTemplate: '<p>Your ride {{rideId}} has started. Track your driver in real-time.</p>',
        smsTemplate: 'Your MyAmbulex ride has started. Track at: {{trackingUrl}}',
        pushTemplate: 'Your ride has started',
        category: 'ride_update',
        priority: 'high'
      },
      {
        id: 'ride_pickup',
        name: 'Driver Arrived',
        subject: 'Your driver has arrived',
        emailTemplate: '<p>Your driver has arrived at the pickup location for ride {{rideId}}.</p>',
        smsTemplate: 'Your MyAmbulex driver has arrived at {{pickupAddress}}',
        pushTemplate: 'Your driver has arrived',
        category: 'ride_update',
        priority: 'high'
      },
      {
        id: 'ride_alert',
        name: 'Ride Alert',
        subject: 'Important alert for your ride',
        emailTemplate: '<p>Alert: {{message}} for ride {{rideId}}</p>',
        smsTemplate: 'MyAmbulex Alert: {{message}}',
        pushTemplate: '{{message}}',
        category: 'alert',
        priority: 'urgent'
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }
}

export const advancedNotificationService = new AdvancedNotificationService();