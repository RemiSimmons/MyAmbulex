import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function addRecurringAppointmentIdColumn() {
  try {
    // First check if the recurring_appointments table exists
    const checkTableQuery = sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'recurring_appointments';
    `;
    
    const tables = await db.execute(checkTableQuery);
    
    // If the recurring_appointments table doesn't exist yet, we'll add the column without a foreign key constraint
    const hasRecurringAppointmentsTable = tables.rows.length > 0;
    
    // Check if the column already exists
    const checkColumnQuery = sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'rides' AND column_name = 'recurring_appointment_id';
    `;
    
    const columns = await db.execute(checkColumnQuery);
    
    // If column doesn't exist, add it
    if (!columns.rows.length) {
      console.log('Adding recurring_appointment_id column to rides table...');
      
      // Choose the appropriate SQL based on whether the referenced table exists
      const alterTableQuery = hasRecurringAppointmentsTable 
        ? sql`
            ALTER TABLE rides
            ADD COLUMN recurring_appointment_id INTEGER REFERENCES recurring_appointments(id);
          `
        : sql`
            ALTER TABLE rides
            ADD COLUMN recurring_appointment_id INTEGER;
          `;
      
      await db.execute(alterTableQuery);
      console.log('Successfully added recurring_appointment_id column');
    } else {
      console.log('recurring_appointment_id column already exists');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to add recurring_appointment_id column:', error);
    throw error;
  }
}