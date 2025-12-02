import { MailService } from '@sendgrid/mail';
import twilio from 'twilio';
import { storage } from './storage';

interface BetaInvite {
  id?: number;
  email?: string;
  phone?: string;
  fullName: string;
  inviteMethod: 'email' | 'sms' | 'both';
  inviteCode: string;
  sentAt: Date;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Date;
  role: 'rider' | 'driver';
  notes?: string;
}

interface InvitationResult {
  success: boolean;
  inviteId?: number;
  inviteCode?: string;
  emailResult?: { success: boolean; messageId?: string; error?: string };
  smsResult?: { success: boolean; sid?: string; error?: string };
  error?: string;
}

export class BetaInvitationService {
  private mailService?: MailService;
  private twilioClient?: any;

  constructor() {
    this.setupServices();
  }

  private setupServices(): void {
    // Setup SendGrid
    if (process.env.SENDGRID_API_KEY) {
      this.mailService = new MailService();
      this.mailService.setApiKey(process.env.SENDGRID_API_KEY);
    }

    // Setup Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  /**
   * Send beta invitation via email, SMS, or both
   */
  async sendBetaInvitation(invite: Omit<BetaInvite, 'id' | 'inviteCode' | 'sentAt' | 'status' | 'expiresAt'>): Promise<InvitationResult> {
    try {
      // Generate unique invite code
      const inviteCode = this.generateInviteCode();
      
      // Set expiration (14 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14);

      // Create invite record
      const betaInvite: BetaInvite = {
        ...invite,
        inviteCode,
        sentAt: new Date(),
        status: 'pending',
        expiresAt
      };

      // Store invitation in database (we'll add this to storage later)
      const inviteId = await this.storeInvitation(betaInvite);

      const result: InvitationResult = {
        success: false,
        inviteId,
        inviteCode
      };

      // Send via email if requested
      if (invite.inviteMethod === 'email' || invite.inviteMethod === 'both') {
        if (invite.email) {
          result.emailResult = await this.sendEmailInvitation(invite.email, invite.fullName, invite.role, inviteCode);
        }
      }

      // Send via SMS if requested
      if (invite.inviteMethod === 'sms' || invite.inviteMethod === 'both') {
        if (invite.phone) {
          result.smsResult = await this.sendSMSInvitation(invite.phone, invite.fullName, invite.role, inviteCode);
        }
      }

      // Determine overall success
      const emailSuccess = !result.emailResult || result.emailResult.success;
      const smsSuccess = !result.smsResult || result.smsResult.success;
      result.success = emailSuccess && smsSuccess;

      return result;

    } catch (error) {
      console.error('Error sending beta invitation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send email invitation
   */
  private async sendEmailInvitation(
    email: string, 
    fullName: string, 
    role: 'rider' | 'driver', 
    inviteCode: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.mailService) {
        return { success: false, error: 'Email service not configured' };
      }

      const subject = `You're invited to beta test MyAmbulex! 🚑`;
      const htmlContent = this.generateEmailTemplate(fullName, role, inviteCode);
      const textContent = this.generateEmailTextTemplate(fullName, role, inviteCode);

      const emailData = {
        to: email,
        from: 'admin@myambulex.com',
        subject,
        text: textContent,
        // Send plain text only to avoid any HTML tracking issues
        // html: htmlContent,
        // Disable SendGrid click tracking to prevent security domain issues
        trackingSettings: {
          clickTracking: {
            enable: false
          },
          openTracking: {
            enable: false
          }
        }
      };

      const response = await this.mailService.send(emailData);
      return { 
        success: true, 
        messageId: response[0]?.headers?.['x-message-id'] || 'sent' 
      };

    } catch (error) {
      console.error('Error sending email invitation:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Email send failed' 
      };
    }
  }

  /**
   * Send SMS invitation
   */
  private async sendSMSInvitation(
    phone: string, 
    fullName: string, 
    role: 'rider' | 'driver', 
    inviteCode: string
  ): Promise<{ success: boolean; sid?: string; error?: string }> {
    try {
      if (!this.twilioClient) {
        return { success: false, error: 'SMS service not configured' };
      }

      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
      
      // Normalize phone numbers for comparison (remove non-digits)
      const normalizedToPhone = phone.replace(/\D/g, '');
      const normalizedFromPhone = twilioPhoneNumber?.replace(/\D/g, '') || '';
      
      // Check if trying to send to the same number as the Twilio phone number
      if (normalizedToPhone === normalizedFromPhone) {
        return { 
          success: false, 
          error: `Cannot send SMS to the same number used for sending (${twilioPhoneNumber}). Please use a different phone number for testing.` 
        };
      }

      const message = this.generateSMSTemplate(fullName, role, inviteCode);

      const response = await this.twilioClient.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: phone
      });

      return { success: true, sid: response.sid };

    } catch (error) {
      console.error('Error sending SMS invitation:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'SMS send failed' 
      };
    }
  }

  /**
   * Generate HTML email template
   */
  private generateEmailTemplate(fullName: string, role: 'rider' | 'driver', inviteCode: string): string {
    const roleTitle = role === 'rider' ? 'Rider' : 'Driver';
    const roleDescription = role === 'rider' 
      ? 'book medical transportation rides' 
      : 'provide medical transportation services and earn money';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MyAmbulex Beta Invitation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #00A8E8; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .invite-code { background: #f8f9fa; border: 2px solid #00A8E8; padding: 15px; text-align: center; margin: 20px 0; border-radius: 5px; }
        .code { font-size: 24px; font-weight: bold; color: #00A8E8; letter-spacing: 3px; }
        .cta { background: #00A8E8; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚑 MyAmbulex Beta Testing</h1>
            <p>You're invited to test the future of medical transportation!</p>
        </div>
        
        <div class="content">
            <h2>Hi ${fullName}!</h2>
            
            <p>We're excited to invite you to beta test <strong>MyAmbulex</strong> - the revolutionary medical transportation platform that connects patients with qualified drivers through a smart bidding system.</p>
            
            <p>As a <strong>${roleTitle} Beta Tester</strong>, you'll help us perfect the platform and get early access to ${roleDescription}.</p>
            
            <div class="invite-code">
                <p><strong>Your Beta Invite Code:</strong></p>
                <div class="code">${inviteCode}</div>
            </div>
            
            <p><strong>What's included in beta testing:</strong></p>
            <ul>
                <li>✅ Full access to all platform features</li>
                <li>✅ Real Stripe payment processing (small test amounts)</li>
                <li>✅ Direct feedback channel to development team</li>
                <li>✅ Priority support and issue resolution</li>
                <li>✅ Exclusive access to new features before public launch</li>
            </ul>
            
            <a href="https://myambulex.com/auth?beta=${inviteCode}&tab=register" class="cta">Join Beta Testing Now</a>
            
            <p><strong>Getting Started:</strong></p>
            <ol>
                <li>Click the link above or visit myambulex.com</li>
                <li>Sign up using your beta invite code: <strong>${inviteCode}</strong></li>
                <li>Complete the ${role} onboarding process</li>
                <li>Start testing and provide feedback!</li>
            </ol>
            
            <p><strong>Beta Testing Period:</strong> This invitation expires in 14 days, so don't wait too long!</p>
            
            <p>We're looking forward to your feedback and helping us build the best medical transportation platform possible.</p>
            
            <p>Welcome to the MyAmbulex family!</p>
            
            <p><strong>The MyAmbulex Team</strong><br>
            Email: admin@myambulex.com<br>
            Support: Available through the beta platform</p>
        </div>
        
        <div class="footer">
            <p>This is a beta testing invitation for MyAmbulex. Your participation helps improve our platform.</p>
            <p>Questions? Reply to this email or contact us through the platform.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text email template
   */
  private generateEmailTextTemplate(fullName: string, role: 'rider' | 'driver', inviteCode: string): string {
    const roleTitle = role === 'rider' ? 'Rider' : 'Driver';
    const roleDescription = role === 'rider' 
      ? 'book medical transportation rides' 
      : 'provide medical transportation services and earn money';

    return `
MyAmbulex Beta Testing Invitation

Hi ${fullName}!

You're invited to beta test MyAmbulex - the revolutionary medical transportation platform that connects patients with qualified drivers through a smart bidding system.

As a ${roleTitle} Beta Tester, you'll help us perfect the platform and get early access to ${roleDescription}.

Your Beta Invite Code: ${inviteCode}

What's included in beta testing:
- Full access to all platform features
- Real Stripe payment processing (small test amounts)
- Direct feedback channel to development team
- Priority support and issue resolution
- Exclusive access to new features before public launch

Getting Started:
1. Visit https://myambulex.com/auth?beta=${inviteCode}&tab=register
2. Sign up using your beta invite code: ${inviteCode}
3. Complete the ${role} onboarding process
4. Start testing and provide feedback!

Beta Testing Period: This invitation expires in 14 days, so don't wait too long!

We're looking forward to your feedback and helping us build the best medical transportation platform possible.

Welcome to the MyAmbulex family!

The MyAmbulex Team
Email: admin@myambulex.com
Support: Available through the beta platform

This is a beta testing invitation for MyAmbulex. Your participation helps improve our platform.
Questions? Reply to this email or contact us through the platform.
    `;
  }

  /**
   * Generate SMS template
   */
  private generateSMSTemplate(fullName: string, role: 'rider' | 'driver', inviteCode: string): string {
    const roleAction = role === 'rider' ? 'book rides' : 'drive & earn';
    
    return `Hi ${fullName}! You're invited to beta test MyAmbulex medical transport platform. As a ${role}, you'll ${roleAction} with real payments & direct dev support. Your code: ${inviteCode}. Join: https://myambulex.com/auth?beta=${inviteCode}&tab=register (Expires in 14 days)`;
  }

  /**
   * Generate unique invite code
   */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Store invitation in database (placeholder - will implement with storage)
   */
  private async storeInvitation(invite: BetaInvite): Promise<number> {
    // For now, return a mock ID
    // TODO: Implement actual database storage
    return Math.floor(Math.random() * 10000) + 1000;
  }

  /**
   * Validate and accept beta invitation
   */
  async acceptInvitation(inviteCode: string): Promise<{ success: boolean; invite?: BetaInvite; error?: string }> {
    try {
      // TODO: Implement database lookup
      // For now, accept any 8-character code
      if (inviteCode && inviteCode.length === 8) {
        return {
          success: true,
          invite: {
            inviteCode,
            status: 'accepted',
            role: 'rider', // Default for now
            fullName: 'Beta Tester',
            inviteMethod: 'email',
            sentAt: new Date(),
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          }
        };
      }

      return { success: false, error: 'Invalid invitation code' };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Validation failed' 
      };
    }
  }

  /**
   * Send batch invitations
   */
  async sendBatchInvitations(invites: Array<Omit<BetaInvite, 'id' | 'inviteCode' | 'sentAt' | 'status' | 'expiresAt'>>): Promise<{
    success: boolean;
    totalSent: number;
    results: InvitationResult[];
    errors: string[];
  }> {
    const results: InvitationResult[] = [];
    const errors: string[] = [];
    let successCount = 0;

    for (const invite of invites) {
      try {
        const result = await this.sendBetaInvitation(invite);
        results.push(result);
        
        if (result.success) {
          successCount++;
        } else {
          errors.push(`Failed to invite ${invite.fullName}: ${result.error}`);
        }
        
        // Small delay between sends to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        const errorMsg = `Error inviting ${invite.fullName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        results.push({ success: false, error: errorMsg });
      }
    }

    return {
      success: successCount > 0,
      totalSent: successCount,
      results,
      errors
    };
  }
}

export const betaInvitationService = new BetaInvitationService();