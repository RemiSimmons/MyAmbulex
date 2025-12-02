import { db } from './db';
import { sql, eq, and, or, desc, asc, exists } from 'drizzle-orm';
import { 
  users, 
  rides, 
  bids,
  driverDetails,
  notifications as notificationsTable
} from '../shared/schema';

/**
 * Performance-optimized database queries
 * These replace the slower queries in storage.ts
 */

export class OptimizedStorage {
  
  /**
   * Optimized rides query with minimal joins and indexed filtering
   */
  async getRidesForUser(userId: number, userRole: string, limit: number = 20): Promise<any[]> {
    try {
      if (userRole === 'driver') {
        // For drivers, get rides they can bid on or are assigned to
        const result = await db.execute(sql`
          SELECT 
            r.id, r.reference_number, r.status, r.pickup_location, r.dropoff_location,
            r.scheduled_time, r.final_price, r.created_at,
            r.rider_id, r.driver_id,
            u.full_name as rider_name
          FROM rides r
          LEFT JOIN users u ON r.rider_id = u.id
          WHERE 
            (r.status IN ('requested', 'bidding') OR r.driver_id = ${userId})
            AND r.created_at > NOW() - INTERVAL '30 days'
          ORDER BY r.created_at DESC
          LIMIT ${limit}
        `);
        // Map snake_case fields to camelCase for frontend compatibility
        return (result.rows || []).map(row => ({
          ...row,
          referenceNumber: row.reference_number,
          pickupLocation: row.pickup_location,
          dropoffLocation: row.dropoff_location,
          scheduledTime: row.scheduled_time,
          finalPrice: row.final_price,
          createdAt: row.created_at,
          riderId: row.rider_id,
          driverId: row.driver_id,
          riderName: row.rider_name
        }));
      } else if (userRole === 'rider') {
        // For riders, get their own rides - prioritize active rides over time constraints
        const result = await db.execute(sql`
          SELECT 
            r.id, r.reference_number, r.status, r.pickup_location, r.dropoff_location,
            r.scheduled_time, r.final_price, r.created_at,
            r.rider_id, r.driver_id,
            u.full_name as driver_name,
            r.pickup_location_lat, r.pickup_location_lng,
            r.dropoff_location_lat, r.dropoff_location_lng
          FROM rides r
          LEFT JOIN users u ON r.driver_id = u.id
          WHERE r.rider_id = ${userId}
          ORDER BY 
            CASE 
              WHEN r.status IN ('accepted', 'scheduled', 'payment_pending', 'en_route', 'arrived', 'in_progress') THEN 0
              ELSE 1 
            END,
            r.created_at DESC
          LIMIT ${limit}
        `);
        // Map snake_case fields to camelCase for frontend compatibility
        return (result.rows || []).map(row => ({
          ...row,
          referenceNumber: row.reference_number,
          pickupLocation: row.pickup_location,
          dropoffLocation: row.dropoff_location,
          scheduledTime: row.scheduled_time,
          finalPrice: row.final_price,
          createdAt: row.created_at,
          riderId: row.rider_id,
          driverId: row.driver_id,
          driverName: row.driver_name,
          pickupLocationLat: row.pickup_location_lat,
          pickupLocationLng: row.pickup_location_lng,
          dropoffLocationLat: row.dropoff_location_lat,
          dropoffLocationLng: row.dropoff_location_lng
        }));
      } else {
        // For admin, get recent rides with basic info
        const result = await db.execute(sql`
          SELECT 
            r.id, r.reference_number, r.status, r.pickup_location, r.dropoff_location,
            r.scheduled_time, r.final_price, r.created_at,
            rider.full_name as rider_name,
            driver.full_name as driver_name
          FROM rides r
          LEFT JOIN users rider ON r.rider_id = rider.id
          LEFT JOIN users driver ON r.driver_id = driver.id
          WHERE r.created_at > NOW() - INTERVAL '7 days'
          ORDER BY r.created_at DESC
          LIMIT ${limit}
        `);
        // Map snake_case fields to camelCase for frontend compatibility
        return (result.rows || []).map(row => ({
          ...row,
          referenceNumber: row.reference_number,
          pickupLocation: row.pickup_location,
          dropoffLocation: row.dropoff_location,
          scheduledTime: row.scheduled_time,
          finalPrice: row.final_price,
          createdAt: row.created_at,
          riderId: row.rider_id,
          driverId: row.driver_id,
          riderName: row.rider_name,
          driverName: row.driver_name
        }));
      }
    } catch (error) {
      console.error('Error in optimized getRidesForUser:', error);
      return [];
    }
  }

  /**
   * Optimized notifications query with proper indexing
   */
  async getNotificationsForUser(userId: number, limit: number = 10): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          id, type, title, message, data, read, created_at
        FROM notifications 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `);
      return result.rows || [];
    } catch (error) {
      console.error('Error in optimized getNotificationsForUser:', error);
      return [];
    }
  }

  /**
   * Optimized user profile query
   */
  async getUserWithProfile(userId: number): Promise<any | null> {
    try {
      const result = await db.execute(sql`
        SELECT 
          u.id, u.username, u.full_name, u.email, u.phone, u.role,
          u.email_verified, u.phone_verified, u.stripe_customer_id, u.created_at,
          up.avatar_url, up.date_of_birth, up.emergency_contact_name, up.emergency_contact_phone
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.id = ${userId}
        LIMIT 1
      `);
      return result.rows?.[0] || null;
    } catch (error) {
      console.error('Error in optimized getUserWithProfile:', error);
      return null;
    }
  }

  /**
   * Optimized bid queries for rides
   */
  async getBidsForRide(rideId: number): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          b.id, b.ride_id, b.driver_id, b.amount, b.status, b.notes, b.created_at,
          u.full_name as driver_name,
          dd.rating as driver_rating,
          dd.total_rides as driver_total_rides
        FROM bids b
        JOIN users u ON b.driver_id = u.id
        LEFT JOIN driver_details dd ON u.id = dd.user_id
        WHERE b.ride_id = ${rideId}
          AND b.status IN ('pending', 'accepted', 'selected')
        ORDER BY b.created_at ASC
      `);
      return result.rows || [];
    } catch (error) {
      console.error('Error in optimized getBidsForRide:', error);
      return [];
    }
  }

  /**
   * Optimized driver dashboard data
   */
  async getDriverDashboardData(userId: number): Promise<any> {
    try {
      const result = await db.execute(sql`
        SELECT 
          dd.account_status,
          dd.background_check_status,
          dd.email_verification_token IS NULL as email_verified,
          dd.documents_verified,
          dd.total_rides,
          dd.rating,
          dd.earnings,
          dd.online_status
        FROM driver_details dd
        WHERE dd.user_id = ${userId}
        LIMIT 1
      `);
      return result.rows?.[0] || null;
    } catch (error) {
      console.error('Error in optimized getDriverDashboardData:', error);
      return null;
    }
  }

  /**
   * Cached user session data to reduce repeated queries
   */
  private userCache = new Map<number, { user: any; timestamp: number }>();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getCachedUser(userId: number): Promise<any | null> {
    const cached = this.userCache.get(userId);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.user;
    }

    const user = await this.getUserWithProfile(userId);
    if (user) {
      this.userCache.set(userId, { user, timestamp: Date.now() });
    }
    return user;
  }

  /**
   * Clear user from cache when updated
   */
  clearUserCache(userId: number): void {
    this.userCache.delete(userId);
  }

  /**
   * Clean expired cache entries
   */
  cleanCache(): void {
    const now = Date.now();
    for (const [userId, cached] of this.userCache.entries()) {
      if ((now - cached.timestamp) >= this.CACHE_DURATION) {
        this.userCache.delete(userId);
      }
    }
  }
}

export const optimizedStorage = new OptimizedStorage();

// Clean cache every 10 minutes
setInterval(() => {
  optimizedStorage.cleanCache();
}, 10 * 60 * 1000);