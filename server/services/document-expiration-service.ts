import { sendEmail } from './email-service';
import { sendSMS } from './sms-service';

interface ExpirationConfig {
  warningDays: number[];
  graceDays: number;
}

const DOCUMENT_EXPIRATION_CONFIG: Record<string, ExpirationConfig> = {
  drivers_license: { warningDays: [30, 14, 7, 1], graceDays: 30 },
  vehicle_registration: { warningDays: [30, 14, 7, 1], graceDays: 15 },
  insurance_card: { warningDays: [30, 14, 7, 1], graceDays: 7 },
  background_check: { warningDays: [90, 30, 14], graceDays: 0 },
  drug_test: { warningDays: [90, 30, 14], graceDays: 0 },
  mvr_record: { warningDays: [90, 30, 14], graceDays: 0 },
  first_aid_certification: { warningDays: [60, 30, 14, 7], graceDays: 30 },
  cpr_certification: { warningDays: [60, 30, 14, 7], graceDays: 30 }
};

interface ExpiringDocument {
  userId: number;
  documentType: string;
  expirationDate: Date;
  daysUntilExpiration: number;
  userEmail: string;
  userPhone: string;
  userName: string;
  documentTitle: string;
}

export class DocumentExpirationService {
  private static instance: DocumentExpirationService;

  public static getInstance(): DocumentExpirationService {
    if (!DocumentExpirationService.instance) {
      DocumentExpirationService.instance = new DocumentExpirationService();
    }
    return DocumentExpirationService.instance;
  }

  /**
   * Check for expiring documents and send notifications
   */
  async checkExpiringDocuments(): Promise<void> {
    try {
      console.log('🕒 Checking for expiring documents...');
      
      const now = new Date();
      const expiringDocs = await this.getExpiringDocuments();
      
      if (expiringDocs.length === 0) {
        console.log('🕒 No expiring documents found');
        return;
      }

      console.log(`🕒 Found ${expiringDocs.length} expiring documents`);

      for (const doc of expiringDocs) {
        await this.sendExpirationNotification(doc);
      }

      // Mark expired documents
      await this.markExpiredDocuments();

    } catch (error) {
      console.error('Error checking expiring documents:', error);
    }
  }

  /**
   * Get documents that are expiring within warning periods
   */
  private async getExpiringDocuments(): Promise<ExpiringDocument[]> {
    const query = `
      SELECT 
        u.id as user_id,
        u.email as user_email,
        u.phone as user_phone,
        u.first_name || ' ' || u.last_name as user_name,
        'drivers_license' as document_type,
        u.drivers_license_expiration as expiration_date,
        'Driver''s License' as document_title
      FROM users u
      WHERE u.role = 'driver' 
        AND u.drivers_license_expiration IS NOT NULL
        AND u.drivers_license_verified = true
        AND u.drivers_license_expiration > CURRENT_DATE
        AND u.drivers_license_expiration <= CURRENT_DATE + INTERVAL '90 days'
      
      UNION ALL
      
      SELECT 
        u.id as user_id,
        u.email as user_email,
        u.phone as user_phone,
        u.first_name || ' ' || u.last_name as user_name,
        'vehicle_registration' as document_type,
        u.vehicle_registration_expiration as expiration_date,
        'Vehicle Registration' as document_title
      FROM users u
      WHERE u.role = 'driver' 
        AND u.vehicle_registration_expiration IS NOT NULL
        AND u.vehicle_registration_verified = true
        AND u.vehicle_registration_expiration > CURRENT_DATE
        AND u.vehicle_registration_expiration <= CURRENT_DATE + INTERVAL '90 days'
      
      UNION ALL
      
      SELECT 
        u.id as user_id,
        u.email as user_email,
        u.phone as user_phone,
        u.first_name || ' ' || u.last_name as user_name,
        'insurance_card' as document_type,
        u.insurance_card_expiration as expiration_date,
        'Insurance Card' as document_title
      FROM users u
      WHERE u.role = 'driver' 
        AND u.insurance_card_expiration IS NOT NULL
        AND u.insurance_card_verified = true
        AND u.insurance_card_expiration > CURRENT_DATE
        AND u.insurance_card_expiration <= CURRENT_DATE + INTERVAL '90 days'
      
      ORDER BY expiration_date ASC
    `;

    const result = await db.execute(query);
    
    return result.rows.map(row => ({
      userId: row.user_id as number,
      documentType: row.document_type as string,
      expirationDate: new Date(row.expiration_date as string),
      daysUntilExpiration: Math.ceil((new Date(row.expiration_date as string).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      userEmail: row.user_email as string,
      userPhone: row.user_phone as string,
      userName: row.user_name as string,
      documentTitle: row.document_title as string
    }));
  }

  /**
   * Send expiration notification to user
   */
  private async sendExpirationNotification(doc: ExpiringDocument): Promise<void> {
    const config = DOCUMENT_EXPIRATION_CONFIG[doc.documentType];
    if (!config) return;

    const shouldNotify = config.warningDays.includes(doc.daysUntilExpiration);
    if (!shouldNotify) return;

    const subject = `${doc.documentTitle} expires in ${doc.daysUntilExpiration} day${doc.daysUntilExpiration === 1 ? '' : 's'}`;
    const urgencyLevel = doc.daysUntilExpiration <= 7 ? 'urgent' : 'normal';
    
    // Email notification
    const emailContent = this.generateEmailContent(doc, urgencyLevel);
    await this.sendEmailNotification(doc.userEmail, subject, emailContent);

    // SMS notification for urgent cases
    if (urgencyLevel === 'urgent' && doc.userPhone) {
      const smsContent = `MyAmbulex: Your ${doc.documentTitle} expires in ${doc.daysUntilExpiration} day${doc.daysUntilExpiration === 1 ? '' : 's'}. Please renew to continue driving.`;
      await this.sendSMSNotification(doc.userPhone, smsContent);
    }

    console.log(`📧 Sent ${urgencyLevel} notification to ${doc.userName} for ${doc.documentTitle} (expires in ${doc.daysUntilExpiration} days)`);
  }

  /**
   * Generate email content for expiration notification
   */
  private generateEmailContent(doc: ExpiringDocument, urgencyLevel: string): string {
    const urgentClass = urgencyLevel === 'urgent' ? 'style="color: #dc2626; font-weight: bold;"' : '';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1e40af; margin: 0;">Document Expiration Notice</h2>
        </div>
        
        <p>Dear ${doc.userName},</p>
        
        <p ${urgentClass}>Your ${doc.documentTitle} is scheduled to expire in ${doc.daysUntilExpiration} day${doc.daysUntilExpiration === 1 ? '' : 's'} on ${doc.expirationDate.toLocaleDateString()}.</p>
        
        <div style="background-color: ${urgencyLevel === 'urgent' ? '#fef2f2' : '#f0f9ff'}; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: ${urgencyLevel === 'urgent' ? '#dc2626' : '#1d4ed8'};">
            ${urgencyLevel === 'urgent' ? '🚨 Urgent Action Required' : '📋 Action Required'}
          </h3>
          <p style="margin-bottom: 0;">
            To continue providing transportation services, please renew your ${doc.documentTitle} and upload the updated document to your MyAmbulex dashboard.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.APP_URL}/driver/onboarding" 
             style="background-color: #1d4ed8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Update Documents
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          If you have already renewed this document, please upload the new version to avoid service interruption.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #6b7280; font-size: 12px;">
          This is an automated message from MyAmbulex. Please do not reply to this email.
        </p>
      </div>
    `;
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(email: string, subject: string, content: string): Promise<void> {
    try {
      await sendEmail({
        to: email,
        subject,
        html: content
      });
    } catch (error) {
      console.error('Failed to send expiration email:', error);
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(phone: string, message: string): Promise<void> {
    try {
      await sendSMS(phone, message);
    } catch (error) {
      console.error('Failed to send expiration SMS:', error);
    }
  }

  /**
   * Mark documents as expired and update driver status
   */
  private async markExpiredDocuments(): Promise<void> {
    const now = new Date();
    
    // Update expired documents
    const expiredQuery = `
      UPDATE users 
      SET 
        drivers_license_verified = CASE 
          WHEN drivers_license_expiration < CURRENT_DATE THEN false 
          ELSE drivers_license_verified 
        END,
        vehicle_registration_verified = CASE 
          WHEN vehicle_registration_expiration < CURRENT_DATE THEN false 
          ELSE vehicle_registration_verified 
        END,
        insurance_card_verified = CASE 
          WHEN insurance_card_expiration < CURRENT_DATE THEN false 
          ELSE insurance_card_verified 
        END,
        driver_status = CASE 
          WHEN (drivers_license_expiration < CURRENT_DATE OR 
                vehicle_registration_expiration < CURRENT_DATE OR 
                insurance_card_expiration < CURRENT_DATE) THEN 'suspended'
          ELSE driver_status 
        END
      WHERE role = 'driver' 
        AND (drivers_license_expiration < CURRENT_DATE OR 
             vehicle_registration_expiration < CURRENT_DATE OR 
             insurance_card_expiration < CURRENT_DATE)
    `;

    await db.execute(expiredQuery);
    console.log('🕒 Updated expired document statuses');
  }

  /**
   * Get expiration summary for admin dashboard
   */
  async getExpirationSummary(): Promise<{
    expiring_soon: number;
    expired: number;
    requires_attention: number;
  }> {
    const query = `
      SELECT 
        COUNT(CASE WHEN (
          drivers_license_expiration BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' OR
          vehicle_registration_expiration BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' OR
          insurance_card_expiration BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        ) THEN 1 END) as expiring_soon,
        
        COUNT(CASE WHEN (
          drivers_license_expiration < CURRENT_DATE OR
          vehicle_registration_expiration < CURRENT_DATE OR
          insurance_card_expiration < CURRENT_DATE
        ) THEN 1 END) as expired,
        
        COUNT(CASE WHEN (
          drivers_license_expiration < CURRENT_DATE + INTERVAL '7 days' OR
          vehicle_registration_expiration < CURRENT_DATE + INTERVAL '7 days' OR
          insurance_card_expiration < CURRENT_DATE + INTERVAL '7 days'
        ) THEN 1 END) as requires_attention
        
      FROM users 
      WHERE role = 'driver'
    `;

    const result = await db.execute(query);
    return result.rows[0] as any;
  }
}

// Initialize and start the service
let expirationCheckInterval: NodeJS.Timeout;

export function startDocumentExpirationService(): void {
  console.log('🕒 Starting document expiration service...');
  
  const service = DocumentExpirationService.getInstance();
  
  // Run immediately
  service.checkExpiringDocuments();
  
  // Run every 24 hours (86400000 ms)
  expirationCheckInterval = setInterval(() => {
    service.checkExpiringDocuments();
  }, 24 * 60 * 60 * 1000);
  
  console.log('🕒 Document expiration service started and running every 24 hours');
}

export function stopDocumentExpirationService(): void {
  if (expirationCheckInterval) {
    clearInterval(expirationCheckInterval);
    console.log('🕒 Document expiration service stopped');
  }
}