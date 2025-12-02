import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { MailService } from '@sendgrid/mail';

const router = Router();

// Initialize SendGrid (owned by Twilio)
if (!process.env.SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY not found. Email functionality will be disabled.');
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY || '');

// Beta signup schema
const betaSignupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  type: z.enum(['driver', 'rider', 'general']).optional(),
  userType: z.enum(['driver', 'rider']).optional(),
  name: z.string().optional(),
  phone: z.string().optional()
});

// Helper function to send beta signup email
async function sendBetaSignupEmail(email: string, type: string) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured - skipping email');
    return;
  }

  const emailSubject = type === 'driver' 
    ? '🎉 MyAmbulex Beta Access Approved - Start Earning in 7 Days!' 
    : type === 'rider'
    ? '🚀 MyAmbulex Beta Access Ready - Book Your First Ride Now!'
    : '✨ MyAmbulex Beta - Your Interest is Confirmed';

  const emailContent = type === 'driver'
    ? `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2563eb; text-align: center;">🎉 Welcome to the MyAmbulex Beta Program!</h2>
        <p>Thank you for applying to be a founding driver on our platform.</p>
        <p>We're revolutionizing medical transportation in Atlanta by connecting drivers directly with riders - no more brokers!</p>
        
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin-top: 0;">🚀 Get Started Now - Beta Access Approved!</h3>
          <p style="margin-bottom: 15px;">Congratulations! You have immediate access to our beta platform:</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="https://${process.env.REPLIT_DOMAINS}/register" 
               style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              🎯 Start Your Driver Application
            </a>
          </div>
          <p style="font-size: 14px; color: #666;">Click the button above to create your driver account and begin your 7-day approval process.</p>
        </div>
        
        <h3>📋 What's Next:</h3>
        <ul>
          <li>✅ Complete your driver profile and documentation</li>
          <li>📋 Background check and vehicle verification (2-3 days)</li>
          <li>🎓 Quick onboarding training module (30 minutes)</li>
          <li>💰 Start earning with priority access to rides!</li>
        </ul>
        
        <h3>🏆 Your Founding Member Benefits:</h3>
        <ul>
          <li>🔒 Lock in low commission rates forever (2.5% vs future 5%)</li>
          <li>⭐ Priority ride selection before regular drivers</li>
          <li>💬 Direct input into platform features and updates</li>
          <li>🚀 Early access to premium tools and features</li>
          <li>🎖️ Founding Member badge and exclusive status</li>
        </ul>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0;"><strong>⏰ Limited Time:</strong> Only 100 founding driver spots available. Secure your lifetime benefits by completing registration within 48 hours.</p>
        </div>
        
        <p style="margin-top: 20px;">Questions? Reply to this email or contact our team at support@myambulex.com</p>
        <p>Best regards,<br><strong>The MyAmbulex Team</strong></p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          MyAmbulex - Revolutionizing Medical Transportation in Atlanta<br>
          Direct connections. No brokers. Fair rates.
        </p>
      </div>
    `
    : type === 'rider'
    ? `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2563eb; text-align: center;">🎉 MyAmbulex Early Access - Welcome!</h2>
        <p>Thank you for requesting early access to MyAmbulex!</p>
        <p>You're joining Atlanta's medical transport revolution - direct connections with qualified drivers, no brokers.</p>
        
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin-top: 0;">🚀 Your Beta Access is Ready!</h3>
          <p style="margin-bottom: 15px;">Great news! You have immediate access to book rides on our beta platform:</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="https://${process.env.REPLIT_DOMAINS}/register" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              🎯 Create Your Rider Account
            </a>
          </div>
          <p style="font-size: 14px; color: #666;">Click the button above to register and start booking reliable medical transportation.</p>
        </div>
        
        <h3>✨ What You'll Experience:</h3>
        <ul>
          <li>📱 Quick and easy booking process (under 2 minutes)</li>
          <li>💰 Transparent, competitive pricing - no hidden fees</li>
          <li>🛡️ All drivers are licensed, insured, and HIPAA-aware</li>
          <li>📍 Real-time tracking and notifications</li>
          <li>⭐ Rate and review system for quality assurance</li>
        </ul>
        
        <h3>🏆 Early Access Benefits:</h3>
        <ul>
          <li>🎯 Priority booking during high-demand periods</li>
          <li>💬 Direct feedback line to help shape our platform</li>
          <li>🎁 Special rates and promotions exclusive to beta users</li>
          <li>🚀 First access to new features and services</li>
        </ul>
        
        <div style="background: #dcfce7; padding: 15px; border-radius: 8px; border-left: 4px solid #16a34a;">
          <p style="margin: 0;"><strong>💡 Pro Tip:</strong> Complete your profile after registering to enable quick bookings and get priority access to our best drivers.</p>
        </div>
        
        <p style="margin-top: 20px;">Questions about booking or need help? Reply to this email or contact us at support@myambulex.com</p>
        <p>Welcome aboard!<br><strong>The MyAmbulex Team</strong></p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          MyAmbulex - Your Reliable Medical Transportation Partner<br>
          Licensed drivers. Real-time tracking. Transparent pricing.
        </p>
      </div>
    `
    : `
      <h2>Thank You for Your Interest in MyAmbulex</h2>
      <p>We're building Atlanta's most reliable medical transportation platform.</p>
      <p>We'll keep you updated on our launch progress and let you know when we're ready for you to join.</p>
      <p>Best regards,<br>The MyAmbulex Team</p>
    `;

  try {
    console.log(`📧 Attempting to send email to ${email} from support@myambulex.com`);
    const emailData = {
      to: email,
      from: 'support@myambulex.com', // Verified sender address
      subject: emailSubject,
      html: emailContent,
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
    };
    
    const result = await mailService.send(emailData);
    console.log(`✅ Beta signup email sent successfully to ${email} (type: ${type})`, result[0]?.statusCode);
  } catch (error: any) {
    console.error('❌ SENDGRID EMAIL ERROR:', {
      error: error?.message || 'Unknown error',
      code: error?.code || 'No code',
      response: error?.response?.body || 'No response body',
      email: email,
      type: type
    });
    // Don't throw error - continue with API response even if email fails
    console.error('Email failed but continuing with API response');
  }
}

// Store beta signups
router.post('/beta-signup', async (req, res) => {
  try {
    const validatedData = betaSignupSchema.parse(req.body);
    const signupType = validatedData.type || validatedData.userType || 'general';
    
    console.log('Beta signup received:', { ...validatedData, type: signupType });
    
    // Send confirmation email
    await sendBetaSignupEmail(validatedData.email, signupType);
    
    // You could add storage logic here:
    // await storage.createBetaSignup({ ...validatedData, type: signupType });
    
    const responseMessage = signupType === 'driver'
      ? 'Thank you for applying! We\'ll review your driver application and respond within 48 hours.'
      : signupType === 'rider'
      ? 'Thank you for requesting early access! We\'ll notify you when it\'s available.'
      : 'Thank you for your interest! We\'ll be in touch soon.';
    
    res.json({ 
      success: true, 
      message: responseMessage
    });
  } catch (error) {
    console.error('Beta signup error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data provided',
        errors: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
});

export default router;