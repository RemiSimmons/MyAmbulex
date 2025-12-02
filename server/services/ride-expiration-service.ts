import { db } from '../db';
import { rides } from '../../shared/schema';
import { eq, lt, and } from 'drizzle-orm';

export class RideExpirationService {
  private intervalId: NodeJS.Timeout | null = null;
  
  constructor() {
    this.startService();
  }

  public startService() {
    console.log('🕒 Starting ride expiration service...');
    
    // Run immediately on startup
    this.processExpiredRides();
    
    // Then run every 30 minutes
    this.intervalId = setInterval(() => {
      this.processExpiredRides();
    }, 30 * 60 * 1000); // 30 minutes
  }

  public stopService() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🕒 Ride expiration service stopped');
    }
  }

  private async processExpiredRides() {
    try {
      console.log('🕒 Processing expired rides...');
      
      const now = new Date();
      
      // Find rides that are expired and still in 'requested' status
      const expiredRides = await db
        .select()
        .from(rides)
        .where(
          and(
            lt(rides.expiresAt, now),
            eq(rides.status, 'requested')
          )
        );

      if (expiredRides.length === 0) {
        console.log('🕒 No expired rides found');
        return;
      }

      console.log(`🕒 Found ${expiredRides.length} expired rides to process`);

      // Update expired rides to cancelled status
      for (const ride of expiredRides) {
        await db
          .update(rides)
          .set({ 
            status: 'cancelled',
            cancellationReason: 'Ride request expired - no driver bids received within time limit'
          })
          .where(eq(rides.id, ride.id));

        console.log(`🕒 Cancelled expired ride ${ride.id} (Reference: ${ride.referenceNumber})`);
      }

      console.log(`🕒 Successfully processed ${expiredRides.length} expired rides`);
      
    } catch (error) {
      console.error('🕒 Error processing expired rides:', error);
    }
  }

  // Manual method to check for expired rides (for testing or admin use)
  public async checkExpiredRides(): Promise<any[]> {
    const now = new Date();
    
    return await db
      .select()
      .from(rides)
      .where(
        and(
          lt(rides.expiresAt, now),
          eq(rides.status, 'requested')
        )
      );
  }
}