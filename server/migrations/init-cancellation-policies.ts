import { db } from '../db';
import { cancellationPolicies } from '@shared/schema';

export async function initializeCancellationPolicies() {
  try {
    // Check if default policy already exists
    const existingPolicies = await db
      .select()
      .from(cancellationPolicies)
      .where(eq(cancellationPolicies.isDefault, true))
      .limit(1);

    if (existingPolicies.length > 0) {
      console.log('Default cancellation policy already exists');
      return;
    }

    // Create default cancellation policy
    await db.insert(cancellationPolicies).values({
      name: 'Standard Cancellation Policy',
      description: 'Default cancellation policy for all ride types',
      vehicleType: 'all',
      freeCancel: 24,
      partialRefund: 4,
      noRefund: 1,
      partialRefundPercentage: 50.00,
      emergencyOverride: true,
      medicalOverride: true,
      weatherOverride: true,
      isActive: true,
      isDefault: true
    });

    // Create policy for wheelchair vehicles (more lenient)
    await db.insert(cancellationPolicies).values({
      name: 'Wheelchair Vehicle Policy',
      description: 'More lenient cancellation policy for wheelchair-accessible vehicles',
      vehicleType: 'wheelchair',
      freeCancel: 48,
      partialRefund: 8,
      noRefund: 2,
      partialRefundPercentage: 75.00,
      emergencyOverride: true,
      medicalOverride: true,
      weatherOverride: true,
      isActive: true,
      isDefault: false
    });

    // Create policy for stretcher vehicles (most lenient)
    await db.insert(cancellationPolicies).values({
      name: 'Stretcher Vehicle Policy',
      description: 'Most lenient cancellation policy for stretcher vehicles',
      vehicleType: 'stretcher',
      freeCancel: 72,
      partialRefund: 12,
      noRefund: 4,
      partialRefundPercentage: 80.00,
      emergencyOverride: true,
      medicalOverride: true,
      weatherOverride: true,
      isActive: true,
      isDefault: false
    });

    console.log('Cancellation policies initialized successfully');
  } catch (error) {
    console.error('Error initializing cancellation policies:', error);
  }
}