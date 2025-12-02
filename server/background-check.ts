import { db } from './db';
import { driverDetails, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { notificationService } from './notifications';

export interface BackgroundCheckResult {
  status: 'approved' | 'rejected' | 'pending' | 'in_progress';
  referenceId: string;
  provider: string;
  completedAt?: Date;
  details?: {
    criminalRecord?: boolean;
    drivingRecord?: boolean;
    identityVerification?: boolean;
    drugTest?: boolean;
    score?: number;
    notes?: string;
  };
}

export class BackgroundCheckService {
  private providers = {
    checkr: 'Checkr',
    sterling: 'Sterling',
    goodhire: 'GoodHire',
    mock: 'Mock Provider' // For testing
  };

  /**
   * Initiate background check for a driver
   */
  async initiateBackgroundCheck(userId: number, provider: string = 'mock'): Promise<{ success: boolean; referenceId?: string; error?: string }> {
    try {
      // Generate reference ID
      const referenceId = `BGC-${Date.now()}-${userId}`;

      // Update driver record
      await db
        .update(driverDetails)
        .set({
          backgroundCheckStatus: 'in_progress',
          backgroundCheckProvider: this.providers[provider as keyof typeof this.providers] || provider,
          backgroundCheckReferenceId: referenceId,
          backgroundCheckDate: new Date(),
        })
        .where(eq(driverDetails.userId, userId));

      // In a real implementation, this would call the external API
      // For now, we'll simulate the process
      if (provider === 'mock') {
        // Simulate processing time (in real app, this would be handled by webhook)
        setTimeout(() => {
          this.processMockBackgroundCheck(userId, referenceId);
        }, 5000); // 5 seconds for demo
      }

      return { success: true, referenceId };
    } catch (error) {
      console.error('Error initiating background check:', error);
      return { success: false, error: 'Failed to initiate background check' };
    }
  }

  /**
   * Process mock background check result (for testing)
   */
  private async processMockBackgroundCheck(userId: number, referenceId: string): Promise<void> {
    try {
      // Simulate random approval/rejection (80% approval rate)
      const isApproved = Math.random() > 0.2;
      const result: BackgroundCheckResult = {
        status: isApproved ? 'approved' : 'rejected',
        referenceId,
        provider: 'Mock Provider',
        completedAt: new Date(),
        details: {
          criminalRecord: isApproved,
          drivingRecord: isApproved,
          identityVerification: true,
          drugTest: isApproved,
          score: isApproved ? Math.floor(Math.random() * 20) + 80 : Math.floor(Math.random() * 40) + 20,
          notes: isApproved ? 'All checks passed successfully' : 'Some checks failed - please review'
        }
      };

      await this.processBackgroundCheckResult(userId, result);
    } catch (error) {
      console.error('Error processing mock background check:', error);
    }
  }

  /**
   * Process background check result (webhook handler)
   */
  async processBackgroundCheckResult(userId: number, result: BackgroundCheckResult): Promise<void> {
    try {
      // Update driver record with result
      await db
        .update(driverDetails)
        .set({
          backgroundCheckStatus: result.status,
          backgroundCheckDate: result.completedAt || new Date(),
          // Enable ride acceptance if approved
          canAcceptRides: result.status === 'approved',
          requiresApprovalForRides: result.status !== 'approved',
          accountStatus: result.status === 'approved' ? 'active' : 'pending',
        })
        .where(eq(driverDetails.userId, userId));

      // Send notification to driver
      const [userRecord] = await db
        .select({
          email: users.email,
          fullName: users.fullName,
        })
        .from(users)
        .where(eq(users.id, userId));

      if (userRecord) {
        await notificationService.createAndSendNotification({
          userId,
          type: result.status === 'approved' ? 'DOCUMENT_APPROVED' : 'DOCUMENT_REJECTED',
          title: result.status === 'approved' ? 'Background Check Approved!' : 'Background Check Requires Review',
          message: result.status === 'approved' 
            ? 'Congratulations! Your background check has been approved. You can now start accepting ride requests.'
            : 'Your background check requires additional review. Please contact support for more information.',
          metadata: {
            backgroundCheckId: result.referenceId,
            provider: result.provider,
            details: result.details
          }
        });
      }

      console.log(`Background check ${result.status} for user ${userId}`);
    } catch (error) {
      console.error('Error processing background check result:', error);
    }
  }

  /**
   * Get background check status
   */
  async getBackgroundCheckStatus(userId: number): Promise<{
    status: string;
    provider?: string;
    referenceId?: string;
    date?: Date;
    canAcceptRides: boolean;
  } | null> {
    try {
      const [record] = await db
        .select({
          status: driverDetails.backgroundCheckStatus,
          provider: driverDetails.backgroundCheckProvider,
          referenceId: driverDetails.backgroundCheckReferenceId,
          date: driverDetails.backgroundCheckDate,
          canAcceptRides: driverDetails.canAcceptRides,
        })
        .from(driverDetails)
        .where(eq(driverDetails.userId, userId));

      return record || null;
    } catch (error) {
      console.error('Error getting background check status:', error);
      return null;
    }
  }

  /**
   * Retry failed background check
   */
  async retryBackgroundCheck(userId: number): Promise<{ success: boolean; referenceId?: string; error?: string }> {
    try {
      // Check current status
      const currentStatus = await this.getBackgroundCheckStatus(userId);
      
      if (!currentStatus || currentStatus.status === 'in_progress') {
        return { success: false, error: 'Background check already in progress' };
      }

      if (currentStatus.status === 'approved') {
        return { success: false, error: 'Background check already approved' };
      }

      // Initiate new background check
      return await this.initiateBackgroundCheck(userId);
    } catch (error) {
      console.error('Error retrying background check:', error);
      return { success: false, error: 'Failed to retry background check' };
    }
  }

  /**
   * Admin function to manually approve/reject background check
   */
  async manuallyUpdateBackgroundCheck(
    userId: number, 
    status: 'approved' | 'rejected', 
    adminNotes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result: BackgroundCheckResult = {
        status,
        referenceId: `MANUAL-${Date.now()}-${userId}`,
        provider: 'Manual Review',
        completedAt: new Date(),
        details: {
          notes: adminNotes || 'Manually reviewed by admin'
        }
      };

      await this.processBackgroundCheckResult(userId, result);
      return { success: true };
    } catch (error) {
      console.error('Error manually updating background check:', error);
      return { success: false, error: 'Failed to update background check' };
    }
  }
}

export const backgroundCheckService = new BackgroundCheckService();