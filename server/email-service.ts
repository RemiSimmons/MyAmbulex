import { MailService } from '@sendgrid/mail';

// SendGrid is optional - email functionality will be skipped if not configured
const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY not set. Email service will be disabled.');
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  trackingSettings?: any;
  mailSettings?: any;
  categories?: string[];
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  // Check if SendGrid API key is configured
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY not set. Email sending skipped:', {
      to: params.to,
      subject: params.subject
    });
    return false;
  }

  try {
    const emailData = {
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
      // Anti-spam configuration
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false },
        subscriptionTracking: { enable: false },
        ganalytics: { enable: false }
      },
      mailSettings: {
        sandboxMode: { enable: false },
        bypassListManagement: { enable: false }
      },
      // Add message categories for better deliverability
      categories: ['password-reset', 'security', 'authentication']
    };

    console.log('Sending email with anti-spam settings:', {
      to: params.to,
      from: params.from,
      subject: params.subject
    });

    await mailService.send(emailData);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}