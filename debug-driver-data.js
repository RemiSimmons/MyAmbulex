import { db } from './server/db.js';
import { driverDetails } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function debugDriverData() {
    console.log('=== DEBUGGING DRIVER DATA ===');
    
    try {
        console.log('1. Testing direct database query...');
        const rawQuery = await db.execute(`
            SELECT id, user_id, license_photo_front, license_photo_back, insurance_document_url, profile_photo
            FROM driver_details 
            WHERE user_id = 59
        `);
        console.log('Raw query result:', rawQuery);
        
        console.log('\n2. Testing Drizzle ORM query...');
        const drizzleQuery = await db
            .select()
            .from(driverDetails)
            .where(eq(driverDetails.userId, 59));
        console.log('Drizzle query result:', drizzleQuery);
        
        if (drizzleQuery.length > 0) {
            const result = drizzleQuery[0];
            console.log('\n3. Field mapping check:');
            console.log('License front (camelCase):', result.licensePhotoFront);
            console.log('License back (camelCase):', result.licensePhotoBack);
            console.log('Insurance (camelCase):', result.insuranceDocumentUrl);
            console.log('Profile (camelCase):', result.profilePhoto);
        }
        
    } catch (error) {
        console.error('Database error:', error);
    }
}

debugDriverData().catch(console.error);