import { User } from '@shared/schema';
import { notificationService, NotificationType, FriendlyCharacter } from './notifications';

/**
 * Service for handling onboarding notifications and welcome sequences
 */
export class OnboardingNotificationService {
  private baseUrl: string;
  private supportEmail: string;
  private supportPhone: string;
  private logoUrl: string;

  constructor() {
    // Configure service URLs and contact info
    this.baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
      : 'https://myambulex.com';
    this.supportEmail = 'support@myambulex.com';
    this.supportPhone = '1-800-555-7890';
    this.logoUrl = `${this.baseUrl}/logo.png`;
  }

  /**
   * Send welcome email and SMS to a new user based on their role
   */
  async sendWelcomeNotifications(user: User): Promise<void> {
    try {
      if (!user) {
        console.error('Cannot send welcome notifications to undefined user');
        return;
      }

      // Prepare personalized message based on user role
      let emailSubject: string;
      let emailBody: string;
      let smsBody: string;
      let character = FriendlyCharacter.ASSISTANT;
      
      if (user.role === 'rider') {
        emailSubject = 'Welcome to MyAmbulex - Your Medical Transportation Partner';
        emailBody = `
          <h2>Hello ${user.fullName || user.username},</h2>
          <p>Welcome to MyAmbulex! We're thrilled to have you join our platform for reliable medical transportation.</p>
          <h3>Getting Started:</h3>
          <ol>
            <li>Complete your profile with medical information and emergency contacts</li>
            <li>Add your frequently visited locations</li>
            <li>Set up your payment methods</li>
            <li>Book your first ride</li>
          </ol>
          <p>Our bidding system allows you to receive competitive offers from qualified drivers.</p>
          <p><a href="${this.baseUrl}/onboarding">Click here</a> to start your onboarding process.</p>
          <p>Need assistance? Contact our support team at ${this.supportEmail} or ${this.supportPhone}.</p>
        `;
        
        smsBody = `Welcome to MyAmbulex, ${user.fullName || user.username}! Your account is ready. Complete your profile and book your first medical transportation ride at ${this.baseUrl}/onboarding`;
      } else if (user.role === 'driver') {
        character = FriendlyCharacter.DRIVER;
        emailSubject = 'Welcome to MyAmbulex - Your Driver Onboarding Guide';
        emailBody = `
          <h2>Hello ${user.fullName || user.username},</h2>
          <p>Welcome to the MyAmbulex driver team! We're excited to have you join our network of professional medical transportation providers.</p>
          <h3>Getting Started:</h3>
          <ol>
            <li>Complete your driver profile</li>
            <li>Upload your vehicle information and required documents</li>
            <li>Complete the background check process</li>
            <li>Set your availability and service area</li>
            <li>Start accepting ride requests</li>
          </ol>
          <p>Our platform connects you with patients who need reliable medical transportation, while our bidding system allows you to set competitive rates.</p>
          <p><a href="${this.baseUrl}/driver/onboarding">Click here</a> to begin your driver onboarding.</p>
          <p>Questions? Contact our driver support team at ${this.supportEmail} or ${this.supportPhone}.</p>
        `;
        
        smsBody = `Welcome to the MyAmbulex driver team, ${user.fullName || user.username}! Begin your onboarding process to start accepting ride requests: ${this.baseUrl}/driver/onboarding`;
      } else {
        // Default for admin or other roles
        emailSubject = 'Welcome to MyAmbulex';
        emailBody = `
          <h2>Hello ${user.fullName || user.username},</h2>
          <p>Welcome to MyAmbulex! Your account has been created successfully.</p>
          <p>You can access the platform at ${this.baseUrl}</p>
          <p>If you have any questions, please contact us at ${this.supportEmail}.</p>
        `;
        
        smsBody = `Welcome to MyAmbulex, ${user.fullName || user.username}! Your account is ready at ${this.baseUrl}`;
      }

      // Send app notification
      await notificationService.createAndSendNotification({
        userId: user.id,
        type: NotificationType.ADMIN_ANNOUNCEMENT,
        title: 'Welcome to MyAmbulex',
        message: 'Your account has been created successfully. Complete your onboarding to get started.',
        link: `${this.baseUrl}/onboarding`,
        metadata: {
          character: character
        }
      });
      
      // Send email - using standard notification with metadata
      await notificationService.createAndSendNotification({
        userId: user.id,
        type: NotificationType.ADMIN_ANNOUNCEMENT,
        title: emailSubject,
        message: emailBody.replace(/<[^>]*>/g, ''),
        metadata: {
          emailTo: user.email,
          emailSubject,
          emailBody,
          sendEmail: true
        }
      });

      // Send SMS if phone is provided - using standard notification with metadata
      if (user.phone) {
        await notificationService.createAndSendNotification({
          userId: user.id,
          type: NotificationType.ADMIN_ANNOUNCEMENT,
          title: 'Welcome SMS',
          message: smsBody,
          metadata: {
            smsTo: user.phone,
            smsMessage: smsBody,
            sendSMS: true
          }
        });
      }
    } catch (error) {
      console.error('Error sending welcome notifications:', error);
    }
  }

  /**
   * Send reminder notification for incomplete profile
   */
  async sendProfileCompletionReminder(user: User, completionPercentage: number): Promise<void> {
    try {
      if (!user) {
        console.error('Cannot send profile completion reminder to undefined user');
        return;
      }

      // Prepare message based on completion percentage
      let emailSubject: string;
      let emailBody: string;
      let smsBody: string;
      let title: string;
      let message: string;
      let character = FriendlyCharacter.ASSISTANT;
      
      if (completionPercentage < 25) {
        title = 'Get Started with Your Profile';
        message = 'Your profile is just getting started. Complete it to get the full MyAmbulex experience.';
        emailSubject = 'Start Your MyAmbulex Profile';
        smsBody = `${user.fullName || user.username}, your MyAmbulex profile is ${completionPercentage}% complete. Take a few minutes to finish setting it up: ${this.baseUrl}/profile`;
      } else if (completionPercentage < 50) {
        title = 'You\'re Making Progress!';
        message = `Your profile is ${completionPercentage}% complete. Keep going to unlock more features.`;
        emailSubject = 'Continue Your MyAmbulex Profile Setup';
        smsBody = `${user.fullName || user.username}, you've made great progress! Your MyAmbulex profile is ${completionPercentage}% complete. Continue setting it up: ${this.baseUrl}/profile`;
      } else if (completionPercentage < 75) {
        title = 'Your Profile is Halfway There';
        message = `You're already ${completionPercentage}% through setting up your profile. Complete it to improve your experience.`;
        emailSubject = 'You\'re Halfway There - Complete Your Profile';
        smsBody = `${user.fullName || user.username}, you're ${completionPercentage}% through your MyAmbulex profile setup. Just a few more steps: ${this.baseUrl}/profile`;
      } else {
        title = 'Almost Done!';
        message = `Your profile is ${completionPercentage}% complete. Finish the final steps to get the most out of MyAmbulex.`;
        emailSubject = 'Final Steps to Complete Your Profile';
        smsBody = `${user.fullName || user.username}, your MyAmbulex profile is ${completionPercentage}% complete. Just a few final details needed: ${this.baseUrl}/profile`;
        character = FriendlyCharacter.COMPANION;
      }
      
      emailBody = `
        <h2>Hello ${user.fullName || user.username},</h2>
        <p>${message}</p>
        <div style="text-align: center; padding: 20px; background-color: #f5f5f5; border-radius: 10px; margin: 20px 0;">
          <div style="font-size: 36px; font-weight: bold; color: #00B2E3;">${completionPercentage}%</div>
          <div style="margin-top: 10px; background-color: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden;">
            <div style="width: ${completionPercentage}%; background-color: #00B2E3; height: 100%;"></div>
          </div>
          <p style="margin-top: 10px; font-size: 14px;">Profile Completion</p>
        </div>
        <p>A complete profile helps us provide better service and match you with the right transportation options.</p>
        <p><a href="${this.baseUrl}/profile" style="display: inline-block; background-color: #00B2E3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Complete Your Profile</a></p>
        <p>Need help? Contact our support team at ${this.supportEmail}.</p>
      `;

      // Send app notification
      await notificationService.createAndSendNotification({
        userId: user.id,
        type: NotificationType.ADMIN_ANNOUNCEMENT,
        title,
        message,
        link: `${this.baseUrl}/profile`,
        metadata: {
          character: character,
          completionPercentage
        }
      });
      
      // Send email - using standard notification with metadata
      await notificationService.createAndSendNotification({
        userId: user.id,
        type: NotificationType.ADMIN_ANNOUNCEMENT,
        title: emailSubject,
        message: emailBody.replace(/<[^>]*>/g, ''),
        metadata: {
          emailTo: user.email,
          emailSubject,
          emailBody,
          sendEmail: true
        }
      });

      // Send SMS if phone is provided - using standard notification with metadata
      if (user.phone) {
        await notificationService.createAndSendNotification({
          userId: user.id,
          type: NotificationType.ADMIN_ANNOUNCEMENT,
          title: 'Profile Completion',
          message: smsBody,
          metadata: {
            smsTo: user.phone,
            smsMessage: smsBody,
            sendSMS: true
          }
        });
      }
    } catch (error) {
      console.error('Error sending profile completion reminder:', error);
    }
  }

  /**
   * Send first ride assistance notification to rider
   */
  async sendFirstRideAssistance(user: User): Promise<void> {
    try {
      if (!user || user.role !== 'rider') {
        console.error('Cannot send first ride assistance to non-rider user');
        return;
      }

      const emailSubject = 'Your Guide to Booking Your First Medical Transportation';
      const emailBody = `
        <h2>Hello ${user.fullName || user.username},</h2>
        <p>We're here to help you book your first medical transportation ride with MyAmbulex.</p>
        <h3>Here's a simple step-by-step guide:</h3>
        <ol>
          <li><strong>From your dashboard</strong>, click on "Request Ride"</li>
          <li><strong>Enter your pickup address</strong> (home or current location)</li>
          <li><strong>Enter your destination</strong> (hospital, clinic, etc.)</li>
          <li><strong>Select your appointment date and time</strong></li>
          <li><strong>Select your special requirements</strong> (wheelchair, stretcher, oxygen, etc.)</li>
          <li><strong>Add additional instructions</strong> for the driver if needed</li>
          <li><strong>Review the details</strong> and submit your request</li>
          <li><strong>Wait for driver bids</strong> to come in (usually within minutes)</li>
          <li><strong>Select the best driver</strong> for your needs and budget</li>
        </ol>
        <p><a href="${this.baseUrl}/request-ride" style="display: inline-block; background-color: #00B2E3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Book Your First Ride</a></p>
        <p>If you need assistance at any point, our support team is available 24/7:</p>
        <ul>
          <li>Phone: ${this.supportPhone}</li>
          <li>Email: ${this.supportEmail}</li>
          <li>Live Chat: Available in the app</li>
        </ul>
        <p>We've also assigned a dedicated customer success manager to help with your first booking. Don't hesitate to reach out!</p>
      `;
      
      const smsBody = `Ready for your first MyAmbulex ride? Here's your guide: 1) Click 'Request Ride' 2) Enter pickup & destination 3) Set date/time 4) Add requirements 5) Submit 6) Select driver. Need help? Call ${this.supportPhone}`;

      // Send app notification
      await notificationService.createAndSendNotification({
        userId: user.id,
        type: NotificationType.ADMIN_ANNOUNCEMENT,
        title: 'Your First Ride Guide',
        message: 'We\'ve put together a simple guide to help you book your first medical transportation ride.',
        link: `${this.baseUrl}/request-ride`,
        metadata: {
          character: FriendlyCharacter.DRIVER,
          resourceType: 'guide'
        }
      });
      
      // Send email - using standard notification with metadata
      await notificationService.createAndSendNotification({
        userId: user.id,
        type: NotificationType.ADMIN_ANNOUNCEMENT,
        title: emailSubject,
        message: emailBody.replace(/<[^>]*>/g, ''),
        metadata: {
          emailTo: user.email,
          emailSubject,
          emailBody,
          sendEmail: true
        }
      });

      // Send SMS if phone is provided - using standard notification with metadata
      if (user.phone) {
        await notificationService.createAndSendNotification({
          userId: user.id,
          type: NotificationType.ADMIN_ANNOUNCEMENT,
          title: 'First Ride Guide',
          message: smsBody,
          metadata: {
            smsTo: user.phone,
            smsMessage: smsBody,
            sendSMS: true
          }
        });
      }
    } catch (error) {
      console.error('Error sending first ride assistance:', error);
    }
  }
}

export const onboardingNotificationService = new OnboardingNotificationService();