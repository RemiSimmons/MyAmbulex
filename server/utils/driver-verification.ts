/**
 * Driver Verification Utility
 * Centralized logic for checking if driver onboarding is complete
 */

export interface DriverDetails {
  userId: number;
  licenseVerified?: boolean | null;
  insuranceVerified?: boolean | null;
  vehicleVerified?: boolean | null;
  profileVerified?: boolean | null;
  backgroundCheckVerified?: boolean | null;
  mvrRecordVerified?: boolean | null;
  drugTestVerified?: boolean | null;
  cprFirstAidCertificationVerified?: boolean | null;
  basicLifeSupportVerified?: boolean | null;
  profilePhoto?: string | null;
  accountStatus?: string;
  verified?: boolean;
}

/**
 * Check if all required documents are verified for driver account activation
 * 
 * Required documents:
 * 1. Driver's License (Front & Back)
 * 2. Insurance Document
 * 3. Vehicle Registration
 * 4. Profile Photo (must exist)
 * 5. Background Check
 * 6. MVR Record
 * 7. Drug Test Results
 * 8. CPR/First Aid Certification
 * 9. Basic Life Support (BLS) Certification
 */
export function isAllDocumentsVerified(driverDetails: DriverDetails | null | undefined): boolean {
  if (!driverDetails) {
    return false;
  }

  // Required core documents that must be verified for account activation
  const requiredVerifications = [
    'licenseVerified',
    'insuranceVerified', 
    'vehicleVerified',
    'profileVerified',
    'backgroundCheckVerified',
    'mvrRecordVerified',
    'drugTestVerified',
    'cprFirstAidCertificationVerified',
    'basicLifeSupportVerified' // Now mandatory
  ];
  
  // Also check that profile photo exists (not just verified)
  const hasProfilePhoto = !!driverDetails.profilePhoto;
  
  // Check if all required verifications are true
  const allRequiredVerified = requiredVerifications.every(field => 
    driverDetails[field as keyof DriverDetails] === true
  );
  
  const isComplete = allRequiredVerified && hasProfilePhoto;
  
  console.log(`🔍 VERIFICATION CHECK for driver ${driverDetails.userId}:`, {
    licenseVerified: driverDetails.licenseVerified,
    insuranceVerified: driverDetails.insuranceVerified,
    vehicleVerified: driverDetails.vehicleVerified,
    profileVerified: driverDetails.profileVerified,
    profilePhotoExists: hasProfilePhoto,
    backgroundCheckVerified: driverDetails.backgroundCheckVerified,
    mvrRecordVerified: driverDetails.mvrRecordVerified,
    drugTestVerified: driverDetails.drugTestVerified,
    cprFirstAidCertificationVerified: driverDetails.cprFirstAidCertificationVerified,
    basicLifeSupportVerified: driverDetails.basicLifeSupportVerified,
    allRequiredVerified,
    isComplete
  });
  
  return isComplete;
}

/**
 * Check if driver onboarding is complete
 * This includes both document verification and account status
 */
export function isDriverOnboardingComplete(driverDetails: DriverDetails | null | undefined): boolean {
  if (!driverDetails) {
    return false;
  }

  const allDocumentsVerified = isAllDocumentsVerified(driverDetails);
  const accountActive = driverDetails.accountStatus === 'active';
  
  return allDocumentsVerified && accountActive;
}

/**
 * Get list of missing or unverified documents
 */
export function getMissingDocuments(driverDetails: DriverDetails | null | undefined): string[] {
  if (!driverDetails) {
    return [
      'Driver License',
      'Insurance Document',
      'Vehicle Registration',
      'Profile Photo',
      'Background Check',
      'MVR Record',
      'Drug Test Results',
      'CPR/First Aid Certification',
      'Basic Life Support (BLS)'
    ];
  }

  const missing: string[] = [];
  
  const documentChecks = [
    { field: 'licenseVerified', name: 'Driver License' },
    { field: 'insuranceVerified', name: 'Insurance Document' },
    { field: 'vehicleVerified', name: 'Vehicle Registration' },
    { field: 'profileVerified', name: 'Profile Photo' },
    { field: 'backgroundCheckVerified', name: 'Background Check' },
    { field: 'mvrRecordVerified', name: 'MVR Record' },
    { field: 'drugTestVerified', name: 'Drug Test Results' },
    { field: 'cprFirstAidCertificationVerified', name: 'CPR/First Aid Certification' },
    { field: 'basicLifeSupportVerified', name: 'Basic Life Support (BLS)' }
  ];

  for (const check of documentChecks) {
    if (driverDetails[check.field as keyof DriverDetails] !== true) {
      missing.push(check.name);
    }
  }

  // Check profile photo exists
  if (!driverDetails.profilePhoto && !missing.includes('Profile Photo')) {
    missing.push('Profile Photo');
  }

  return missing;
}


