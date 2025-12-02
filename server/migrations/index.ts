import { addRecurringAppointmentIdColumn } from './add-recurring-appointment-id';
import { createDriverOnboardingProgressTable } from './create-driver-onboarding-progress';
import { initializePlatformSettings } from './init-platform-settings';

// Add all migrations here
const migrations = [
  addRecurringAppointmentIdColumn,
  createDriverOnboardingProgressTable,
  initializePlatformSettings,
];

export async function runMigrations() {
  console.log('Starting database migrations...');
  
  try {
    for (const migration of migrations) {
      await migration();
    }
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}