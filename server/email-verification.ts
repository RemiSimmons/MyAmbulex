import { MailService } from '@sendgrid/mail';
import crypto from 'crypto';
import { db } from './db';
import { driverDetails, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable not set. Email verification will not work.");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

export class EmailVerificationService {
  private fromEmail = 'noreply@myambulex.com';
  private appName = 'MyAmbulex';
  private baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://myambulex.com' 
    : process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS}` 
      : 'http://localhost:5000';

  /**
   * Generate a secure verification token
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Send email verification to new driver
   */
  async sendDriverVerificationEmail(userId: number, email: string, fullName: string): Promise<boolean> {
    if (!process.env.SENDGRID_API_KEY) {
      console.error('SendGrid API key not configured');
      return false;
    }

    try {
      // Generate verification token
      const token = this.generateVerificationToken();
      const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      // Store token in database
      await db
        .update(driverDetails)
        .set({
          emailVerificationToken: token,
          emailVerificationSentAt: new Date(),
          emailVerificationExpiry: expiryTime,
        })
        .where(eq(driverDetails.userId, userId));

      // Create verification URL
      const verificationUrl = `${this.baseUrl}/verify-email?token=${token}&type=driver`;

      // Send email
      const emailContent = this.createVerificationEmailTemplate(fullName, verificationUrl);
      
      await mailService.send({
        to: email,
        from: this.fromEmail,
        subject: `Welcome to ${this.appName} - Please Verify Your Email`,
        html: emailContent,
        text: `Welcome to ${this.appName}! Please verify your email by visiting: ${verificationUrl}`,
        // Disable link tracking to prevent redirects through tracking domains
        trackingSettings: {
          clickTracking: { enable: false },
          openTracking: { enable: false },
          subscriptionTracking: { enable: false },
          ganalytics: { enable: false }
        },
        mailSettings: {
          sandboxMode: { enable: false },
          bypassListManagement: { enable: false }
        }
      });

      console.log(`Verification email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Error sending verification email:', error);
      return false;
    }
  }

  /**
   * Verify email using token
   */
  async verifyDriverEmail(token: string): Promise<{ success: boolean; message: string; userId?: number }> {
    try {
      // Find driver with this token
      const [driverRecord] = await db
        .select({
          userId: driverDetails.userId,
          emailVerificationExpiry: driverDetails.emailVerificationExpiry,
        })
        .from(driverDetails)
        .where(eq(driverDetails.emailVerificationToken, token));

      if (!driverRecord) {
        return { success: false, message: 'Invalid verification token' };
      }

      // Check if token is expired
      if (driverRecord.emailVerificationExpiry && driverRecord.emailVerificationExpiry < new Date()) {
        return { success: false, message: 'Verification token has expired' };
      }

      // Update user and driver records
      await db.transaction(async (tx) => {
        // Mark email as verified in users table
        await tx
          .update(users)
          .set({ emailVerified: true })
          .where(eq(users.id, driverRecord.userId));

        // Clear verification token and enable basic permissions
        await tx
          .update(driverDetails)
          .set({
            emailVerificationToken: null,
            emailVerificationSentAt: null,
            emailVerificationExpiry: null,
            canViewRideRequests: true, // Allow viewing ride requests after email verification
          })
          .where(eq(driverDetails.userId, driverRecord.userId));
      });

      return { 
        success: true, 
        message: 'Email verified successfully! You can now view ride requests.',
        userId: driverRecord.userId 
      };
    } catch (error) {
      console.error('Error verifying email:', error);
      return { success: false, message: 'Error verifying email' };
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(userId: number): Promise<boolean> {
    try {
      // Get user details
      const [userRecord] = await db
        .select({
          email: users.email,
          fullName: users.fullName,
          emailVerified: users.emailVerified,
        })
        .from(users)
        .where(eq(users.id, userId));

      if (!userRecord) {
        return false;
      }

      if (userRecord.emailVerified) {
        return false; // Already verified
      }

      return await this.sendDriverVerificationEmail(userId, userRecord.email, userRecord.fullName);
    } catch (error) {
      console.error('Error resending verification email:', error);
      return false;
    }
  }

  /**
   * Create HTML email template for verification
   */
  private createVerificationEmailTemplate(fullName: string, verificationUrl: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - ${this.appName}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4f46e5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { 
                display: inline-block; 
                background: #4f46e5; 
                color: white; 
                padding: 12px 30px; 
                text-decoration: none; 
                border-radius: 6px; 
                margin: 20px 0; 
                font-weight: bold;
            }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${this.appName}</h1>
                <p>Welcome to Professional Medical Transportation</p>
            </div>
            <div class="content">
                <h2>Hello ${fullName},</h2>
                <p>Welcome to ${this.appName}! We're excited to have you join our network of professional medical transportation drivers.</p>
                
                <p>To complete your registration and start viewing ride requests, please verify your email address by clicking the button below:</p>
                
                <div style="text-align: center;">
                    <a href="${verificationUrl}" class="button">Verify My Email</a>
                </div>
                
                <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
                
                <p><strong>Next Steps After Verification:</strong></p>
                <ul>
                    <li>Complete your driver profile</li>
                    <li>Upload required documents</li>
                    <li>Wait for background check approval</li>
                    <li>Start accepting rides!</li>
                </ul>
                
                <p>This verification link will expire in 24 hours for security reasons.</p>
                
                <p>If you didn't create this account, please ignore this email.</p>
                
                <p>Best regards,<br>The ${this.appName} Team</p>
            </div>
            <div class="footer">
                <p>© 2025 ${this.appName}. All rights reserved.</p>
                <p>Professional Medical Transportation Services</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

export const emailVerificationService = new EmailVerificationService();