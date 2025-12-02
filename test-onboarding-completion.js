/**
 * Test script to verify driver onboarding completion process
 * 
 * This script tests:
 * 1. Document verification logic
 * 2. Account activation when all documents verified
 * 3. Missing document detection
 */

import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : undefined,
});

// Import verification utility (simulated - actual import would be from compiled JS)
function isAllDocumentsVerified(driverDetails) {
  if (!driverDetails) return false;

  const requiredVerifications = [
    'licenseVerified',
    'insuranceVerified', 
    'vehicleVerified',
    'profileVerified',
    'backgroundCheckVerified',
    'mvrRecordVerified',
    'drugTestVerified',
    'cprFirstAidCertificationVerified',
    'basicLifeSupportVerified'
  ];
  
  const hasProfilePhoto = !!driverDetails.profilePhoto;
  const allRequiredVerified = requiredVerifications.every(field => 
    driverDetails[field] === true
  );
  
  return allRequiredVerified && hasProfilePhoto;
}

async function testOnboardingCompletion() {
  try {
    console.log('🧪 Testing Driver Onboarding Completion Process\n');

    // Get all drivers
    const driversResult = await pool.query(`
      SELECT u.id, u.username, u.email, u.role, u.account_status
      FROM users u
      WHERE u.role = 'driver'
      ORDER BY u.id
    `);

    console.log(`📊 Found ${driversResult.rows.length} drivers\n`);

    for (const driver of driversResult.rows) {
      console.log(`\n🔍 Testing Driver: ${driver.username} (ID: ${driver.id})`);
      console.log(`   Email: ${driver.email}`);
      console.log(`   Account Status: ${driver.account_status}`);

      // Get driver details
      const detailsResult = await pool.query(`
        SELECT 
          user_id,
          license_verified,
          insurance_verified,
          vehicle_verified,
          profile_verified,
          background_check_verified,
          mvr_record_verified,
          drug_test_verified,
          cpr_first_aid_certification_verified,
          basic_life_support_verified,
          profile_photo,
          account_status,
          verified
        FROM driver_details
        WHERE user_id = $1
      `, [driver.id]);

      if (detailsResult.rows.length === 0) {
        console.log('   ⚠️  No driver details found - onboarding not started');
        continue;
      }

      const details = detailsResult.rows[0];
      
      // Convert snake_case to camelCase for verification function
      const driverDetails = {
        userId: details.user_id,
        licenseVerified: details.license_verified,
        insuranceVerified: details.insurance_verified,
        vehicleVerified: details.vehicle_verified,
        profileVerified: details.profile_verified,
        backgroundCheckVerified: details.background_check_verified,
        mvrRecordVerified: details.mvr_record_verified,
        drugTestVerified: details.drug_test_verified,
        cprFirstAidCertificationVerified: details.cpr_first_aid_certification_verified,
        basicLifeSupportVerified: details.basic_life_support_verified,
        profilePhoto: details.profile_photo,
        accountStatus: details.account_status,
        verified: details.verified
      };

      // Check verification status
      const allVerified = isAllDocumentsVerified(driverDetails);
      const shouldBeActive = allVerified && driverDetails.accountStatus === 'active';

      console.log('\n   📄 Document Status:');
      console.log(`      License: ${driverDetails.licenseVerified ? '✅' : '❌'}`);
      console.log(`      Insurance: ${driverDetails.insuranceVerified ? '✅' : '❌'}`);
      console.log(`      Vehicle: ${driverDetails.vehicleVerified ? '✅' : '❌'}`);
      console.log(`      Profile Photo: ${driverDetails.profilePhoto ? '✅' : '❌'} (Verified: ${driverDetails.profileVerified ? '✅' : '❌'})`);
      console.log(`      Background Check: ${driverDetails.backgroundCheckVerified ? '✅' : '❌'}`);
      console.log(`      MVR Record: ${driverDetails.mvrRecordVerified ? '✅' : '❌'}`);
      console.log(`      Drug Test: ${driverDetails.drugTestVerified ? '✅' : '❌'}`);
      console.log(`      CPR/First Aid: ${driverDetails.cprFirstAidCertificationVerified ? '✅' : '❌'}`);
      console.log(`      Basic Life Support: ${driverDetails.basicLifeSupportVerified ? '✅' : '❌'}`);

      console.log('\n   📊 Verification Summary:');
      console.log(`      All Documents Verified: ${allVerified ? '✅ YES' : '❌ NO'}`);
      console.log(`      Account Status: ${driverDetails.accountStatus}`);
      console.log(`      Verified Flag: ${driverDetails.verified ? '✅' : '❌'}`);
      console.log(`      Should Be Active: ${shouldBeActive ? '✅ YES' : '❌ NO'}`);

      // Check for inconsistencies
      if (allVerified && driverDetails.accountStatus !== 'active') {
        console.log('   ⚠️  WARNING: All documents verified but account not active!');
      }
      
      if (!allVerified && driverDetails.accountStatus === 'active') {
        console.log('   ⚠️  WARNING: Account active but not all documents verified!');
      }

      // List missing documents
      if (!allVerified) {
        const missing = [];
        if (!driverDetails.licenseVerified) missing.push('License');
        if (!driverDetails.insuranceVerified) missing.push('Insurance');
        if (!driverDetails.vehicleVerified) missing.push('Vehicle Registration');
        if (!driverDetails.profilePhoto || !driverDetails.profileVerified) missing.push('Profile Photo');
        if (!driverDetails.backgroundCheckVerified) missing.push('Background Check');
        if (!driverDetails.mvrRecordVerified) missing.push('MVR Record');
        if (!driverDetails.drugTestVerified) missing.push('Drug Test');
        if (!driverDetails.cprFirstAidCertificationVerified) missing.push('CPR/First Aid');
        if (!driverDetails.basicLifeSupportVerified) missing.push('Basic Life Support');
        
        console.log(`\n   📋 Missing Documents: ${missing.join(', ')}`);
      }
    }

    console.log('\n\n✅ Testing complete!\n');

  } catch (error) {
    console.error('❌ Error testing onboarding:', error);
  } finally {
    await pool.end();
  }
}

testOnboardingCompletion();


