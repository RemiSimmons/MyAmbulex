import { db } from './db';
import { adminOverrides, adminAuditLog, driverPermissions, users, driverDetails } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { emailNotificationService } from './email-notification-service';
import { sseManager } from './sse-manager';

export interface AdminOverrideRequest {
  adminId: number;
  targetType: 'user' | 'driver' | 'ride' | 'system';
  targetId?: number;
  overrideType: 'verification_bypass' | 'permission_grant' | 'status_override' | 'system_config' | 'emergency_protocol';
  overrideValue: any;
  reason: string;
  expiresAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface DriverVerificationOverride {
  driverId: number;
  adminId: number;
  bypassBackgroundCheck?: boolean;
  bypassEmailVerification?: boolean;
  bypassDocumentVerification?: boolean;
  forceAccountActivation?: boolean;
  grantAllPermissions?: boolean;
  reason: string;
}

export interface SystemConfigOverride {
  configKey: string;
  originalValue: any;
  newValue: any;
  adminId: number;
  reason: string;
  temporary?: boolean;
  expiresAt?: Date;
}

export class AdminOverrideService {
  
  /**
   * Apply comprehensive admin override with full audit trail
   */
  async applyOverride(request: AdminOverrideRequest): Promise<{ success: boolean; overrideId?: number; error?: string }> {
    try {
      // Get current value for audit trail
      const originalValue = await this.getCurrentValue(request.targetType, request.targetId, request.overrideType);
      
      // Create override record
      const [override] = await db.insert(adminOverrides).values({
        adminId: request.adminId,
        targetType: request.targetType,
        targetId: request.targetId,
        overrideType: request.overrideType,
        originalValue,
        overrideValue: request.overrideValue,
        reason: request.reason,
        expiresAt: request.expiresAt,
        isActive: true,
      }).returning();

      // Apply the actual override
      await this.executeOverride(request);

      // Create detailed audit log
      await this.logAdminAction({
        adminId: request.adminId,
        action: `OVERRIDE_${request.overrideType.toUpperCase()}`,
        targetType: request.targetType,
        targetId: request.targetId,
        oldValue: originalValue,
        newValue: request.overrideValue,
        reason: request.reason,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        sessionId: request.sessionId,
        severity: this.determineSeverity(request.overrideType),
      });

      // Send real-time notifications to all admins
      await this.notifyAdminsOfOverride(override.id, request);

      return { success: true, overrideId: override.id };
    } catch (error) {
      console.error('Error applying admin override:', error);
      return { success: false, error: 'Failed to apply override' };
    }
  }

  /**
   * Bypass driver verification with comprehensive override
   */
  async bypassDriverVerification(override: DriverVerificationOverride): Promise<{ success: boolean; error?: string }> {
    try {
      const driverResult = await db.select().from(driverDetails).where(eq(driverDetails.id, override.driverId)).limit(1);
      
      if (!driverResult.length) {
        return { success: false, error: 'Driver not found' };
      }

      const driver = driverResult[0];
      const updates: Partial<typeof driverDetails.$inferInsert> = {};

      // Apply verification bypasses
      if (override.bypassBackgroundCheck) {
        updates.backgroundCheckStatus = 'approved';
        updates.backgroundCheckDate = new Date();
        updates.backgroundCheckProvider = 'Admin Override';
      }

      if (override.bypassDocumentVerification) {
        updates.verified = true;
      }

      if (override.forceAccountActivation) {
        updates.accountStatus = 'active';
        updates.canAcceptRides = true;
        updates.canViewRideRequests = true;
        updates.requiresApprovalForRides = false;
      }

      // Update driver details
      await db.update(driverDetails)
        .set(updates)
        .where(eq(driverDetails.id, override.driverId));

      // Grant all permissions if requested
      if (override.grantAllPermissions) {
        const permissions = [
          'ride_accept', 'view_requests', 'service_area', 
          'vehicle_type', 'emergency_rides', 'premium_rides'
        ];

        for (const permission of permissions) {
          await db.insert(driverPermissions).values({
            driverId: override.driverId,
            permissionType: permission as any,
            isGranted: true,
            grantedBy: override.adminId,
            grantedAt: new Date(),
            adminOverride: true,
            overrideReason: override.reason,
          }).onConflictDoUpdate({
            target: [driverPermissions.driverId, driverPermissions.permissionType],
            set: {
              isGranted: true,
              grantedBy: override.adminId,
              grantedAt: new Date(),
              adminOverride: true,
              overrideReason: override.reason,
              updatedAt: new Date(),
            }
          });
        }
      }

      // Send notification to driver
      const userResult = await db.select().from(users).where(eq(users.id, driver.userId)).limit(1);
      if (userResult.length) {
        const user = userResult[0];
        await emailNotificationService.sendAdministrativeEmail(
          user.id,
          user.email,
          user.fullName || user.username,
          'Account Verification Completed',
          `Your driver account has been verified and activated by our admin team. You can now start accepting rides.`,
          'normal'
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error bypassing driver verification:', error);
      return { success: false, error: 'Failed to bypass verification' };
    }
  }

  /**
   * Emergency protocol activation for critical situations
   */
  async activateEmergencyProtocol(adminId: number, protocolType: string, targetId?: number, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const emergencyActions: Record<string, () => Promise<void>> = {
        'force_ride_completion': async () => {
          if (targetId) {
            // Force complete ride logic
            await this.applyOverride({
              adminId,
              targetType: 'ride',
              targetId,
              overrideType: 'status_override',
              overrideValue: { status: 'completed', completedBy: 'emergency_protocol' },
              reason: reason || 'Emergency protocol activation',
            });
          }
        },
        'emergency_driver_assignment': async () => {
          // Emergency driver assignment logic
          await this.applyOverride({
            adminId,
            targetType: 'system',
            overrideType: 'emergency_protocol',
            overrideValue: { emergencyDriverAssignment: true, rideId: targetId },
            reason: reason || 'Emergency driver assignment',
          });
        },
        'system_maintenance_mode': async () => {
          // Activate maintenance mode
          await this.applyOverride({
            adminId,
            targetType: 'system',
            overrideType: 'system_config',
            overrideValue: { maintenanceMode: true },
            reason: reason || 'System maintenance mode activated',
          });
        },
        'unlock_all_drivers': async () => {
          // Unlock all suspended drivers
          await db.update(driverDetails)
            .set({ accountStatus: 'active', canAcceptRides: true })
            .where(eq(driverDetails.accountStatus, 'suspended'));
        }
      };

      if (emergencyActions[protocolType]) {
        await emergencyActions[protocolType]();
        
        // Log critical emergency action
        await this.logAdminAction({
          adminId,
          action: `EMERGENCY_${protocolType.toUpperCase()}`,
          targetType: targetId ? 'ride' : 'system',
          targetId,
          reason: reason || 'Emergency protocol activation',
          severity: 'critical',
        });

        return { success: true };
      } else {
        return { success: false, error: 'Unknown emergency protocol' };
      }
    } catch (error) {
      console.error('Error activating emergency protocol:', error);
      return { success: false, error: 'Failed to activate emergency protocol' };
    }
  }

  /**
   * Get comprehensive override history with filtering
   */
  async getOverrideHistory(filters?: {
    adminId?: number;
    targetType?: string;
    overrideType?: string;
    isActive?: boolean;
    limit?: number;
  }): Promise<any[]> {
    try {
      let query = db.select({
        override: adminOverrides,
        admin: {
          id: users.id,
          username: users.username,
          fullName: users.fullName,
        }
      })
      .from(adminOverrides)
      .leftJoin(users, eq(adminOverrides.adminId, users.id))
      .orderBy(desc(adminOverrides.createdAt));

      if (filters) {
        if (filters.adminId) {
          query = query.where(eq(adminOverrides.adminId, filters.adminId));
        }
        if (filters.targetType) {
          query = query.where(eq(adminOverrides.targetType, filters.targetType));
        }
        if (filters.overrideType) {
          query = query.where(eq(adminOverrides.overrideType, filters.overrideType));
        }
        if (filters.isActive !== undefined) {
          query = query.where(eq(adminOverrides.isActive, filters.isActive));
        }
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      return await query;
    } catch (error) {
      console.error('Error getting override history:', error);
      return [];
    }
  }

  /**
   * Deactivate override and restore original values
   */
  async deactivateOverride(overrideId: number, adminId: number, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      const [override] = await db.select().from(adminOverrides).where(eq(adminOverrides.id, overrideId)).limit(1);
      
      if (!override) {
        return { success: false, error: 'Override not found' };
      }

      // Restore original value
      await this.restoreOriginalValue(override);

      // Deactivate override
      await db.update(adminOverrides)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(adminOverrides.id, overrideId));

      // Log deactivation
      await this.logAdminAction({
        adminId,
        action: 'OVERRIDE_DEACTIVATED',
        targetType: override.targetType,
        targetId: override.targetId,
        reason,
        severity: 'medium',
      });

      return { success: true };
    } catch (error) {
      console.error('Error deactivating override:', error);
      return { success: false, error: 'Failed to deactivate override' };
    }
  }

  /**
   * Private helper methods
   */
  private async getCurrentValue(targetType: string, targetId?: number, overrideType?: string): Promise<any> {
    // Implementation to get current value based on target type and override type
    // This would query the appropriate table and return the current value
    return null;
  }

  private async executeOverride(request: AdminOverrideRequest): Promise<void> {
    // Implementation to actually apply the override to the system
    // This would update the appropriate tables based on the override type
  }

  private async restoreOriginalValue(override: any): Promise<void> {
    // Implementation to restore the original value when deactivating an override
  }

  private determineSeverity(overrideType: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalTypes = ['emergency_protocol', 'system_config'];
    const highTypes = ['verification_bypass', 'status_override'];
    
    if (criticalTypes.includes(overrideType)) return 'critical';
    if (highTypes.includes(overrideType)) return 'high';
    return 'medium';
  }

  private async logAdminAction(action: {
    adminId: number;
    action: string;
    targetType?: string;
    targetId?: number;
    oldValue?: any;
    newValue?: any;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<void> {
    await db.insert(adminAuditLog).values({
      adminId: action.adminId,
      action: action.action,
      targetType: action.targetType,
      targetId: action.targetId,
      oldValue: action.oldValue,
      newValue: action.newValue,
      reason: action.reason,
      ipAddress: action.ipAddress,
      userAgent: action.userAgent,
      sessionId: action.sessionId,
      severity: action.severity,
    });
  }

  private async notifyAdminsOfOverride(overrideId: number, request: AdminOverrideRequest): Promise<void> {
    // Get all admin users
    const admins = await db.select().from(users).where(eq(users.role, 'admin'));
    
    // Send real-time notifications
    for (const admin of admins) {
      sseManager.sendToUser(admin.id, {
        event: 'admin_override_applied',
        data: {
          overrideId,
          action: request.overrideType,
          targetType: request.targetType,
          targetId: request.targetId,
          adminId: request.adminId,
          severity: this.determineSeverity(request.overrideType),
          timestamp: new Date().toISOString(),
        }
      });

      // Send email for critical overrides
      if (this.determineSeverity(request.overrideType) === 'critical') {
        await emailNotificationService.sendAdministrativeEmail(
          admin.id,
          admin.email,
          admin.fullName || admin.username,
          'CRITICAL: Admin Override Applied',
          `A critical administrative override has been applied.\n\nType: ${request.overrideType}\nReason: ${request.reason}\nTime: ${new Date().toLocaleString()}`,
          'urgent'
        );
      }
    }
  }
}

export const adminOverrideService = new AdminOverrideService();