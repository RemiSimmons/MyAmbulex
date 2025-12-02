import { MailService } from '@sendgrid/mail';
import { storage } from './storage';
import { sseManager } from './sse-manager';

// SendGrid is optional - email notifications will be skipped if not configured
const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY not set. Email notifications will be disabled.');
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlTemplate: string;
  textTemplate: string;
  category: 'driver_verification' | 'booking_confirmation' | 'ride_updates' | 'administrative';
  variables: string[];
}

interface EmailNotification {
  id: string;
  userId: number;
  email: string;
  templateId: string;
  variables: { [key: string]: any };
  status: 'pending' | 'sent' | 'failed' | 'delivered' | 'opened';
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  failureReason?: string;
  retryCount: number;
  scheduledFor?: Date;
  createdAt: Date;
}

export class EmailNotificationService {
  private fromEmail = 'noreply@myambulex.com';
  private fromName = 'MyAmbulex';
  private templates: Map<string, EmailTemplate> = new Map();
  private notifications: EmailNotification[] = [];
  private retryQueue: EmailNotification[] = [];

  constructor() {
    this.initializeTemplates();
    this.startRetryProcessor();
  }

  /**
   * Send driver verification email
   */
  async sendDriverVerificationEmail(
    userId: number, 
    email: string, 
    fullName: string,
    verificationToken: string
  ): Promise<boolean> {
    const verificationUrl = `${this.getBaseUrl()}/verify-email?token=${verificationToken}`;
    
    return this.sendEmail('driver_verification', userId, email, {
      fullName,
      verificationUrl,
      supportEmail: 'support@myambulex.com'
    });
  }

  /**
   * Send driver application approved email
   */
  async sendDriverApplicationApproved(
    userId: number,
    email: string,
    fullName: string
  ): Promise<boolean> {
    return this.sendEmail('driver_approved', userId, email, {
      fullName,
      dashboardUrl: `${this.getBaseUrl()}/driver/dashboard`,
      supportEmail: 'support@myambulex.com'
    });
  }

  /**
   * Send driver application rejected email
   */
  async sendDriverApplicationRejected(
    userId: number,
    email: string,
    fullName: string,
    rejectionReason: string
  ): Promise<boolean> {
    return this.sendEmail('driver_rejected', userId, email, {
      fullName,
      rejectionReason,
      supportEmail: 'support@myambulex.com'
    });
  }

  /**
   * Send document verification required email
   */
  async sendDocumentVerificationRequired(
    userId: number,
    email: string,
    fullName: string,
    requiredDocuments: string[]
  ): Promise<boolean> {
    return this.sendEmail('documents_required', userId, email, {
      fullName,
      requiredDocuments: requiredDocuments.join(', '),
      uploadUrl: `${this.getBaseUrl()}/driver/documents`,
      supportEmail: 'support@myambulex.com'
    });
  }

  /**
   * Send document expiry warning email
   */
  async sendDocumentExpiryWarning(
    userId: number,
    email: string,
    fullName: string,
    expiringDocuments: Array<{ name: string; expiryDate: string }>
  ): Promise<boolean> {
    const documentsList = expiringDocuments
      .map(doc => `${doc.name} (expires ${new Date(doc.expiryDate).toLocaleDateString()})`)
      .join(', ');

    return this.sendEmail('document_expiry_warning', userId, email, {
      fullName,
      expiringDocuments: documentsList,
      updateUrl: `${this.getBaseUrl()}/driver/documents`,
      supportEmail: 'support@myambulex.com'
    });
  }

  /**
   * Send booking confirmation email to rider
   */
  async sendBookingConfirmation(
    userId: number,
    email: string,
    fullName: string,
    rideDetails: {
      rideId: number;
      referenceNumber: string;
      pickupAddress: string;
      dropoffAddress: string;
      scheduledTime: string;
      estimatedFare: number;
      driverName?: string;
      vehicleInfo?: string;
    }
  ): Promise<boolean> {
    return this.sendEmail('booking_confirmation', userId, email, {
      fullName,
      rideId: rideDetails.rideId,
      referenceNumber: rideDetails.referenceNumber,
      pickupAddress: rideDetails.pickupAddress,
      dropoffAddress: rideDetails.dropoffAddress,
      scheduledTime: new Date(rideDetails.scheduledTime).toLocaleString(),
      estimatedFare: rideDetails.estimatedFare.toFixed(2),
      driverName: rideDetails.driverName || 'Assigned driver',
      vehicleInfo: rideDetails.vehicleInfo || 'Vehicle details will be provided',
      trackingUrl: `${this.getBaseUrl()}/ride/track/${rideDetails.rideId}`,
      supportEmail: 'support@myambulex.com'
    });
  }

  /**
   * Send ride driver assigned email
   */
  async sendRideDriverAssigned(
    userId: number,
    email: string,
    fullName: string,
    rideDetails: {
      rideId: number;
      referenceNumber: string;
      pickupAddress: string;
      dropoffAddress: string;
      scheduledTime: string;
      driverName: string;
      driverPhone: string;
      vehicleInfo: string;
    }
  ): Promise<boolean> {
    return this.sendEmail('driver_assigned', userId, email, {
      fullName,
      rideId: rideDetails.rideId,
      referenceNumber: rideDetails.referenceNumber,
      pickupAddress: rideDetails.pickupAddress,
      dropoffAddress: rideDetails.dropoffAddress,
      scheduledTime: new Date(rideDetails.scheduledTime).toLocaleString(),
      driverName: rideDetails.driverName,
      driverPhone: rideDetails.driverPhone,
      vehicleInfo: rideDetails.vehicleInfo,
      trackingUrl: `${this.getBaseUrl()}/ride/track/${rideDetails.rideId}`,
      supportEmail: 'support@myambulex.com'
    });
  }

  /**
   * Send ride status update email
   */
  async sendRideStatusUpdate(
    userId: number,
    email: string,
    fullName: string,
    rideDetails: {
      rideId: number;
      referenceNumber: string;
      status: string;
      statusMessage: string;
      estimatedArrival?: string;
    }
  ): Promise<boolean> {
    return this.sendEmail('ride_status_update', userId, email, {
      fullName,
      rideId: rideDetails.rideId,
      referenceNumber: rideDetails.referenceNumber,
      status: rideDetails.status,
      statusMessage: rideDetails.statusMessage,
      estimatedArrival: rideDetails.estimatedArrival || 'N/A',
      trackingUrl: `${this.getBaseUrl()}/ride/track/${rideDetails.rideId}`,
      supportEmail: 'support@myambulex.com'
    });
  }

  /**
   * Send ride completed email with receipt
   */
  async sendRideCompleted(
    userId: number,
    email: string,
    fullName: string,
    rideDetails: {
      rideId: number;
      referenceNumber: string;
      pickupAddress: string;
      dropoffAddress: string;
      completedAt: string;
      finalFare: number;
      paymentMethod: string;
      driverName: string;
    }
  ): Promise<boolean> {
    return this.sendEmail('ride_completed', userId, email, {
      fullName,
      rideId: rideDetails.rideId,
      referenceNumber: rideDetails.referenceNumber,
      pickupAddress: rideDetails.pickupAddress,
      dropoffAddress: rideDetails.dropoffAddress,
      completedAt: new Date(rideDetails.completedAt).toLocaleString(),
      finalFare: rideDetails.finalFare.toFixed(2),
      paymentMethod: rideDetails.paymentMethod,
      driverName: rideDetails.driverName,
      receiptUrl: `${this.getBaseUrl()}/ride/receipt/${rideDetails.rideId}`,
      ratingUrl: `${this.getBaseUrl()}/ride/rate/${rideDetails.rideId}`,
      supportEmail: 'support@myambulex.com'
    });
  }

  /**
   * Send administrative communication
   */
  async sendAdministrativeEmail(
    userId: number,
    email: string,
    fullName: string,
    subject: string,
    message: string,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<boolean> {
    return this.sendEmail('administrative', userId, email, {
      fullName,
      subject,
      message,
      priority,
      supportEmail: 'support@myambulex.com',
      dashboardUrl: `${this.getBaseUrl()}/dashboard`
    });
  }

  /**
   * Send payment receipt email
   */
  async sendPaymentReceipt(
    userId: number,
    email: string,
    fullName: string,
    paymentDetails: {
      rideId: number;
      amount: number;
      paymentMethod: string;
      transactionId: string;
      paymentDate: string;
    }
  ): Promise<boolean> {
    return this.sendEmail('payment_receipt', userId, email, {
      fullName,
      rideId: paymentDetails.rideId,
      amount: paymentDetails.amount.toFixed(2),
      paymentMethod: paymentDetails.paymentMethod,
      transactionId: paymentDetails.transactionId,
      paymentDate: new Date(paymentDetails.paymentDate).toLocaleString(),
      supportEmail: 'support@myambulex.com'
    });
  }

  /**
   * Core email sending method
   */
  private async sendEmail(
    templateId: string,
    userId: number,
    email: string,
    variables: { [key: string]: any },
    scheduledFor?: Date
  ): Promise<boolean> {
    const template = this.templates.get(templateId);
    if (!template) {
      console.error(`Email template not found: ${templateId}`);
      return false;
    }

    const notification: EmailNotification = {
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      email,
      templateId,
      variables,
      status: 'pending',
      retryCount: 0,
      scheduledFor,
      createdAt: new Date()
    };

    this.notifications.push(notification);

    // If scheduled for future, don't send immediately
    if (scheduledFor && scheduledFor > new Date()) {
      console.log(`Email scheduled for ${scheduledFor} for user ${userId}`);
      return true;
    }

    return this.processEmailNotification(notification);
  }

  /**
   * Process individual email notification
   */
  private async processEmailNotification(notification: EmailNotification): Promise<boolean> {
    // Check if SendGrid API key is configured
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SENDGRID_API_KEY not set. Email notification skipped:', {
        notificationId: notification.id,
        templateId: notification.templateId,
        email: notification.email
      });
      notification.status = 'failed';
      notification.failureReason = 'SendGrid API key not configured';
      return false;
    }

    try {
      const template = this.templates.get(notification.templateId);
      if (!template) {
        throw new Error(`Template not found: ${notification.templateId}`);
      }

      // Compile templates with variables
      const subject = this.compileTemplate(template.subject, notification.variables);
      const htmlContent = this.compileTemplate(template.htmlTemplate, notification.variables);
      const textContent = this.compileTemplate(template.textTemplate, notification.variables);

      const msg = {
        to: notification.email,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject,
        text: textContent,
        html: htmlContent,
        categories: [template.category],
        customArgs: {
          notification_id: notification.id,
          user_id: notification.userId.toString(),
          template_id: notification.templateId
        }
      };

      await mailService.send(msg);

      // Update notification status
      notification.status = 'sent';
      notification.sentAt = new Date();

      // Send real-time update to user
      sseManager.sendToUser(notification.userId, {
        event: 'email_sent',
        data: {
          notificationId: notification.id,
          templateId: notification.templateId,
          status: 'sent',
          timestamp: new Date().toISOString()
        }
      });

      console.log(`Email sent successfully: ${notification.id} to ${notification.email}`);
      return true;

    } catch (error) {
      console.error(`Failed to send email ${notification.id}:`, error);
      
      notification.status = 'failed';
      notification.failureReason = error instanceof Error ? error.message : 'Unknown error';
      notification.retryCount++;

      // Add to retry queue if not exceeded max retries
      if (notification.retryCount < 3) {
        this.retryQueue.push(notification);
      }

      return false;
    }
  }

  /**
   * Compile template with variables
   */
  private compileTemplate(template: string, variables: { [key: string]: any }): string {
    let compiled = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      compiled = compiled.replace(regex, String(value || ''));
    }
    
    return compiled;
  }

  /**
   * Start retry processor for failed emails
   */
  private startRetryProcessor(): void {
    setInterval(() => {
      if (this.retryQueue.length > 0) {
        console.log(`Processing ${this.retryQueue.length} email retries`);
        
        const toRetry = this.retryQueue.splice(0, 5); // Process 5 at a time
        
        toRetry.forEach(notification => {
          // Wait longer between retries
          const delay = notification.retryCount * 60000; // 1min, 2min, 3min delays
          
          setTimeout(() => {
            this.processEmailNotification(notification);
          }, delay);
        });
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Process scheduled emails
   */
  async processScheduledEmails(): Promise<void> {
    const now = new Date();
    const scheduledEmails = this.notifications.filter(
      n => n.status === 'pending' && n.scheduledFor && n.scheduledFor <= now
    );

    for (const notification of scheduledEmails) {
      await this.processEmailNotification(notification);
    }
  }

  /**
   * Get notification history for user
   */
  getNotificationHistory(userId: number): EmailNotification[] {
    return this.notifications.filter(n => n.userId === userId);
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(): {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    deliveryRate: number;
  } {
    const total = this.notifications.length;
    const sent = this.notifications.filter(n => n.status === 'sent').length;
    const failed = this.notifications.filter(n => n.status === 'failed').length;
    const pending = this.notifications.filter(n => n.status === 'pending').length;
    const deliveryRate = total > 0 ? (sent / total) * 100 : 0;

    return { total, sent, failed, pending, deliveryRate };
  }

  /**
   * Get base URL for links
   */
  private getBaseUrl(): string {
    // Use REPLIT_DOMAINS environment variable if available
    if (process.env.REPLIT_DOMAINS) {
      const domains = process.env.REPLIT_DOMAINS.split(',');
      return `https://${domains[0]}`;
    }
    
    // Fallback to localhost for development
    return process.env.NODE_ENV === 'production' 
      ? 'https://myambulex.replit.app'
      : 'http://localhost:5000';
  }

  /**
   * Initialize email templates
   */
  private initializeTemplates(): void {
    // Driver Verification Template
    this.templates.set('driver_verification', {
      id: 'driver_verification',
      name: 'Driver Email Verification',
      subject: 'Verify Your Email - MyAmbulex Driver Account',
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">MyAmbulex</h1>
            <h2 style="color: #374151; margin-top: 0;">Email Verification Required</h2>
          </div>
          
          <p>Hello {{fullName}},</p>
          
          <p>Welcome to MyAmbulex! To complete your driver registration and start earning, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{verificationUrl}}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email Address</a>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6b7280;">{{verificationUrl}}</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            <p>If you didn't create this account, please ignore this email.</p>
            <p>Need help? Contact us at {{supportEmail}}</p>
          </div>
        </div>
      `,
      textTemplate: `
        MyAmbulex - Email Verification Required
        
        Hello {{fullName}},
        
        Welcome to MyAmbulex! To complete your driver registration and start earning, please verify your email address by visiting this link:
        
        {{verificationUrl}}
        
        If you didn't create this account, please ignore this email.
        
        Need help? Contact us at {{supportEmail}}
      `,
      category: 'driver_verification',
      variables: ['fullName', 'verificationUrl', 'supportEmail']
    });

    // Driver Application Approved
    this.templates.set('driver_approved', {
      id: 'driver_approved',
      name: 'Driver Application Approved',
      subject: 'Congratulations! Your Driver Application is Approved',
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">MyAmbulex</h1>
            <h2 style="color: #059669; margin-top: 0;">Application Approved! 🎉</h2>
          </div>
          
          <p>Hello {{fullName}},</p>
          
          <p>Great news! Your MyAmbulex driver application has been approved. You can now start accepting ride requests and earning money.</p>
          
          <div style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #059669; margin-top: 0;">What's Next?</h3>
            <ul style="color: #374151;">
              <li>Access your driver dashboard</li>
              <li>Set your availability schedule</li>
              <li>Start receiving ride requests</li>
              <li>Begin earning immediately</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboardUrl}}" style="background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Dashboard</a>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            <p>Welcome to the MyAmbulex driver family!</p>
            <p>Need help? Contact us at {{supportEmail}}</p>
          </div>
        </div>
      `,
      textTemplate: `
        MyAmbulex - Application Approved!
        
        Hello {{fullName}},
        
        Great news! Your MyAmbulex driver application has been approved. You can now start accepting ride requests and earning money.
        
        What's Next?
        - Access your driver dashboard
        - Set your availability schedule
        - Start receiving ride requests
        - Begin earning immediately
        
        Go to your dashboard: {{dashboardUrl}}
        
        Welcome to the MyAmbulex driver family!
        Need help? Contact us at {{supportEmail}}
      `,
      category: 'driver_verification',
      variables: ['fullName', 'dashboardUrl', 'supportEmail']
    });

    // Booking Confirmation Template
    this.templates.set('booking_confirmation', {
      id: 'booking_confirmation',
      name: 'Booking Confirmation',
      subject: 'Booking Confirmed - Ride #{{referenceNumber}}',
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">MyAmbulex</h1>
            <h2 style="color: #374151; margin-top: 0;">Booking Confirmed</h2>
          </div>
          
          <div style="background-color: #eff6ff; border: 1px solid #2563eb; border-radius: 5px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #2563eb; margin-top: 0;">Ride Details</h3>
            <table style="width: 100%; color: #374151;">
              <tr><td><strong>Reference Number:</strong></td><td>{{referenceNumber}}</td></tr>
              <tr><td><strong>Pickup Location:</strong></td><td>{{pickupAddress}}</td></tr>
              <tr><td><strong>Drop-off Location:</strong></td><td>{{dropoffAddress}}</td></tr>
              <tr><td><strong>Scheduled Time:</strong></td><td>{{scheduledTime}}</td></tr>
              <tr><td><strong>Estimated Fare:</strong></td><td>$\{estimatedFare}</td></tr>
              <tr><td><strong>Driver:</strong></td><td>{{driverName}}</td></tr>
              <tr><td><strong>Vehicle:</strong></td><td>{{vehicleInfo}}</td></tr>
            </table>
          </div>
          
          <p>Hello {{fullName}},</p>
          
          <p>Your ride has been successfully booked! We'll notify you when your driver is on their way.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{trackingUrl}}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Track Your Ride</a>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            <p>Questions about your ride? Contact us at {{supportEmail}}</p>
          </div>
        </div>
      `,
      textTemplate: `
        MyAmbulex - Booking Confirmed
        
        Ride Details:
        Reference Number: {{referenceNumber}}
        Pickup: {{pickupAddress}}
        Drop-off: {{dropoffAddress}}
        Scheduled: {{scheduledTime}}
        Estimated Fare: $\{estimatedFare}
        Driver: {{driverName}}
        Vehicle: {{vehicleInfo}}
        
        Hello {{fullName}},
        
        Your ride has been successfully booked! We'll notify you when your driver is on their way.
        
        Track your ride: {{trackingUrl}}
        
        Questions? Contact us at {{supportEmail}}
      `,
      category: 'booking_confirmation',
      variables: ['fullName', 'referenceNumber', 'pickupAddress', 'dropoffAddress', 'scheduledTime', 'estimatedFare', 'driverName', 'vehicleInfo', 'trackingUrl', 'supportEmail']
    });

    // Ride Status Update Template
    this.templates.set('ride_status_update', {
      id: 'ride_status_update',
      name: 'Ride Status Update',
      subject: 'Ride Update - {{status}} - #{{referenceNumber}}',
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">MyAmbulex</h1>
            <h2 style="color: #374151; margin-top: 0;">Ride Status Update</h2>
          </div>
          
          <p>Hello {{fullName}},</p>
          
          <div style="background-color: #fefce8; border: 1px solid #eab308; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #a16207; margin-top: 0;">Ride #{{referenceNumber}} - {{status}}</h3>
            <p style="color: #374151; margin-bottom: 0;">{{statusMessage}}</p>
            {{#if estimatedArrival}}
            <p style="color: #374151; margin-bottom: 0;"><strong>Estimated Arrival:</strong> {{estimatedArrival}}</p>
            {{/if}}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{trackingUrl}}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Track Your Ride</a>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            <p>Questions about your ride? Contact us at {{supportEmail}}</p>
          </div>
        </div>
      `,
      textTemplate: `
        MyAmbulex - Ride Status Update
        
        Hello {{fullName}},
        
        Ride #{{referenceNumber}} - {{status}}
        {{statusMessage}}
        
        Estimated Arrival: {{estimatedArrival}}
        
        Track your ride: {{trackingUrl}}
        
        Questions? Contact us at {{supportEmail}}
      `,
      category: 'ride_updates',
      variables: ['fullName', 'referenceNumber', 'status', 'statusMessage', 'estimatedArrival', 'trackingUrl', 'supportEmail']
    });

    // Administrative Template
    this.templates.set('administrative', {
      id: 'administrative',
      name: 'Administrative Communication',
      subject: '{{subject}} - MyAmbulex',
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">MyAmbulex</h1>
            <h2 style="color: #374151; margin-top: 0;">{{subject}}</h2>
          </div>
          
          <p>Hello {{fullName}},</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 5px; padding: 20px; margin: 20px 0;">
            {{message}}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboardUrl}}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Dashboard</a>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            <p>This is an {{priority}} priority message from MyAmbulex administration.</p>
            <p>Questions? Contact us at {{supportEmail}}</p>
          </div>
        </div>
      `,
      textTemplate: `
        MyAmbulex - {{subject}}
        
        Hello {{fullName}},
        
        {{message}}
        
        Dashboard: {{dashboardUrl}}
        
        This is an {{priority}} priority message from MyAmbulex administration.
        Questions? Contact us at {{supportEmail}}
      `,
      category: 'administrative',
      variables: ['fullName', 'subject', 'message', 'priority', 'dashboardUrl', 'supportEmail']
    });

    // Add more templates for other scenarios...
    this.initializeAdditionalTemplates();
  }

  /**
   * Initialize additional email templates
   */
  private initializeAdditionalTemplates(): void {
    // Document Expiry Warning
    this.templates.set('document_expiry_warning', {
      id: 'document_expiry_warning',
      name: 'Document Expiry Warning',
      subject: 'Action Required: Documents Expiring Soon',
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">MyAmbulex</h1>
            <h2 style="color: #dc2626; margin-top: 0;">Documents Expiring Soon</h2>
          </div>
          
          <p>Hello {{fullName}},</p>
          
          <div style="background-color: #fef2f2; border: 1px solid #dc2626; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">Action Required</h3>
            <p style="color: #374151;">The following documents are expiring soon:</p>
            <p style="color: #374151;"><strong>{{expiringDocuments}}</strong></p>
            <p style="color: #374151;">Please update these documents to avoid service interruption.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{updateUrl}}" style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Update Documents</a>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            <p>Need help? Contact us at {{supportEmail}}</p>
          </div>
        </div>
      `,
      textTemplate: `
        MyAmbulex - Documents Expiring Soon
        
        Hello {{fullName}},
        
        The following documents are expiring soon:
        {{expiringDocuments}}
        
        Please update these documents to avoid service interruption.
        
        Update documents: {{updateUrl}}
        
        Need help? Contact us at {{supportEmail}}
      `,
      category: 'driver_verification',
      variables: ['fullName', 'expiringDocuments', 'updateUrl', 'supportEmail']
    });

    // Continue with more templates...
  }
}

export const emailNotificationService = new EmailNotificationService();

// Start processing scheduled emails every minute
setInterval(() => {
  emailNotificationService.processScheduledEmails();
}, 60000);