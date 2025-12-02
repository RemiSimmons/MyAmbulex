import { db } from './db';
import { driverDetails, users, bids, rides } from '@shared/schema';
import { eq, and, count } from 'drizzle-orm';

export interface DriverPermissions {
  canViewRideRequests: boolean;
  canAcceptRides: boolean;
  canBidOnRides: boolean;
  maxConcurrentRides: number;
  requiresApprovalForRides: boolean;
  emailVerified: boolean;
  backgroundCheckApproved: boolean;
  documentsVerified: boolean;
  accountActive: boolean;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  missingRequirements?: string[];
}

export class DriverPermissionsService {
  /**
   * Get comprehensive permissions for a driver
   */
  async getDriverPermissions(userId: number): Promise<DriverPermissions | null> {
    try {
      const [result] = await db
        .select({
          // User level
          emailVerified: users.emailVerified,
          accountStatus: users.accountStatus,
          // Driver level
          canViewRideRequests: driverDetails.canViewRideRequests,
          canAcceptRides: driverDetails.canAcceptRides,
          maxConcurrentRides: driverDetails.maxConcurrentRides,
          requiresApprovalForRides: driverDetails.requiresApprovalForRides,
          backgroundCheckStatus: driverDetails.backgroundCheckStatus,
          verified: driverDetails.verified,
          driverAccountStatus: driverDetails.accountStatus,
        })
        .from(users)
        .leftJoin(driverDetails, eq(users.id, driverDetails.userId))
        .where(eq(users.id, userId));

      if (!result) {
        return null;
      }

      return {
        canViewRideRequests: result.canViewRideRequests || false,
        canAcceptRides: result.canAcceptRides || false,
        canBidOnRides: result.canAcceptRides || false, // Same as canAcceptRides
        maxConcurrentRides: result.maxConcurrentRides || 1,
        requiresApprovalForRides: result.requiresApprovalForRides !== false,
        emailVerified: result.emailVerified || false,
        backgroundCheckApproved: result.backgroundCheckStatus === 'approved',
        documentsVerified: result.verified || false,
        accountActive: result.accountStatus === 'active' && result.driverAccountStatus === 'active',
      };
    } catch (error) {
      console.error('Error getting driver permissions:', error);
      return null;
    }
  }

  /**
   * Check if driver can view ride requests
   */
  async canViewRideRequests(userId: number): Promise<PermissionCheckResult> {
    const permissions = await this.getDriverPermissions(userId);
    
    if (!permissions) {
      return { allowed: false, reason: 'Driver not found' };
    }

    const missing: string[] = [];

    if (!permissions.emailVerified) {
      missing.push('Email verification required');
    }

    if (!permissions.accountActive) {
      missing.push('Account must be active');
    }

    if (!permissions.canViewRideRequests) {
      missing.push('Permission to view ride requests not granted');
    }

    return {
      allowed: missing.length === 0,
      reason: missing.length > 0 ? missing.join(', ') : undefined,
      missingRequirements: missing.length > 0 ? missing : undefined
    };
  }

  /**
   * Check if driver can accept rides
   */
  async canAcceptRides(userId: number): Promise<PermissionCheckResult> {
    const permissions = await this.getDriverPermissions(userId);
    
    if (!permissions) {
      return { allowed: false, reason: 'Driver not found' };
    }

    const missing: string[] = [];

    if (!permissions.emailVerified) {
      missing.push('Email verification required');
    }

    if (!permissions.backgroundCheckApproved) {
      missing.push('Background check approval required');
    }

    if (!permissions.documentsVerified) {
      missing.push('Document verification required');
    }

    if (!permissions.accountActive) {
      missing.push('Account must be active');
    }

    if (!permissions.canAcceptRides) {
      missing.push('Permission to accept rides not granted');
    }

    return {
      allowed: missing.length === 0,
      reason: missing.length > 0 ? missing.join(', ') : undefined,
      missingRequirements: missing.length > 0 ? missing : undefined
    };
  }

  /**
   * Check if driver can bid on a specific ride
   */
  async canBidOnRide(userId: number, rideId: number): Promise<PermissionCheckResult> {
    // First check general ride acceptance permissions
    const acceptCheck = await this.canAcceptRides(userId);
    if (!acceptCheck.allowed) {
      return acceptCheck;
    }

    try {
      // Check if driver already has an active bid on this ride
      const [existingBid] = await db
        .select({ id: bids.id })
        .from(bids)
        .where(and(
          eq(bids.rideId, rideId),
          eq(bids.driverId, userId),
          eq(bids.status, 'pending')
        ));

      if (existingBid) {
        return { 
          allowed: false, 
          reason: 'You already have an active bid on this ride' 
        };
      }

      // Check concurrent rides limit
      const permissions = await this.getDriverPermissions(userId);
      if (permissions) {
        const [currentActiveRides] = await db
          .select({ count: count() })
          .from(rides)
          .where(and(
            eq(rides.driverId, userId),
            eq(rides.status, 'in_progress')
          ));

        if (currentActiveRides.count >= permissions.maxConcurrentRides) {
          return {
            allowed: false,
            reason: `Maximum concurrent rides limit reached (${permissions.maxConcurrentRides})`
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking bid permissions:', error);
      return { allowed: false, reason: 'Error checking permissions' };
    }
  }

  /**
   * Update driver permissions (admin function)
   */
  async updateDriverPermissions(
    userId: number, 
    updates: Partial<Pick<typeof driverDetails.$inferInsert, 
      'canViewRideRequests' | 'canAcceptRides' | 'maxConcurrentRides' | 'requiresApprovalForRides'>>
  ): Promise<boolean> {
    try {
      await db
        .update(driverDetails)
        .set(updates)
        .where(eq(driverDetails.userId, userId));

      return true;
    } catch (error) {
      console.error('Error updating driver permissions:', error);
      return false;
    }
  }

  /**
   * Grant basic permissions after email verification
   */
  async grantEmailVerificationPermissions(userId: number): Promise<boolean> {
    return this.updateDriverPermissions(userId, {
      canViewRideRequests: true
    });
  }

  /**
   * Grant full permissions after background check approval
   */
  async grantBackgroundCheckPermissions(userId: number): Promise<boolean> {
    return this.updateDriverPermissions(userId, {
      canViewRideRequests: true,
      canAcceptRides: true,
      requiresApprovalForRides: false
    });
  }

  /**
   * Revoke permissions (for suspension or violations)
   */
  async revokePermissions(userId: number, reason?: string): Promise<boolean> {
    try {
      await db
        .update(driverDetails)
        .set({
          canViewRideRequests: false,
          canAcceptRides: false,
          requiresApprovalForRides: true,
          accountStatus: 'suspended'
        })
        .where(eq(driverDetails.userId, userId));

      // Also update user account status
      await db
        .update(users)
        .set({ accountStatus: 'suspended' })
        .where(eq(users.id, userId));

      console.log(`Permissions revoked for user ${userId}. Reason: ${reason || 'Not specified'}`);
      return true;
    } catch (error) {
      console.error('Error revoking permissions:', error);
      return false;
    }
  }

  /**
   * Get driver's current permission status summary
   */
  async getPermissionsSummary(userId: number): Promise<{
    status: 'pending' | 'partial' | 'full' | 'suspended';
    nextSteps: string[];
    restrictions: string[];
  } | null> {
    const permissions = await this.getDriverPermissions(userId);
    
    if (!permissions) {
      return null;
    }

    let status: 'pending' | 'partial' | 'full' | 'suspended';
    const nextSteps: string[] = [];
    const restrictions: string[] = [];

    if (!permissions.accountActive) {
      status = 'suspended';
      restrictions.push('Account is not active');
    } else if (permissions.canAcceptRides && permissions.backgroundCheckApproved) {
      status = 'full';
    } else if (permissions.canViewRideRequests) {
      status = 'partial';
    } else {
      status = 'pending';
    }

    // Determine next steps
    if (!permissions.emailVerified) {
      nextSteps.push('Verify your email address');
    }

    if (!permissions.documentsVerified) {
      nextSteps.push('Complete document verification');
    }

    if (!permissions.backgroundCheckApproved) {
      nextSteps.push('Wait for background check approval');
    }

    // Add restrictions
    if (!permissions.canViewRideRequests) {
      restrictions.push('Cannot view ride requests');
    }

    if (!permissions.canAcceptRides) {
      restrictions.push('Cannot accept ride requests');
    }

    if (permissions.requiresApprovalForRides) {
      restrictions.push('Rides require manual approval');
    }

    return {
      status,
      nextSteps,
      restrictions
    };
  }
}

export const driverPermissionsService = new DriverPermissionsService();