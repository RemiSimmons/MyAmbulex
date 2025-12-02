// Legal agreements configuration with comprehensive content from uploaded documents

export interface LegalAgreementConfig {
  id: string;
  title: string;
  description: string;
  documentUrl: string;
  requiredForRoles: ('rider' | 'driver')[];
  version: string;
  effectiveDate: string;
  keyPoints: string[];
  checkboxText: string;
}

export const LEGAL_AGREEMENTS: Record<string, LegalAgreementConfig> = {
  platform_user_agreement: {
    id: 'platform_user_agreement',
    title: 'Platform User Agreement',
    description: 'Comprehensive terms and conditions for using the MyAmbulex platform',
    documentUrl: '/api/legal/download/platform-user-agreement',
    requiredForRoles: ['rider', 'driver'],
    version: '2025.1',
    effectiveDate: '2025-07-24',
    keyPoints: [
      'MyAmbulex is a technology platform that connects riders and drivers',
      'All transportation services are provided by independent contractors',
      'Binding arbitration clause and class action waiver apply',
      'Comprehensive liability limitations and indemnification requirements',
      'Non-solicitation clause prevents bypassing platform for 24 months',
      'HIPAA and ADA compliance obligations for drivers',
      'Professional conduct and safety standards required'
    ],
    checkboxText: 'I have read, understood, and agree to be bound by the Platform User Agreement'
  },
  
  privacy_policy: {
    id: 'privacy_policy',
    title: 'Privacy Policy',
    description: 'How we collect, use, and protect your personal information',
    documentUrl: '/api/legal/download/privacy-policy',
    requiredForRoles: ['rider', 'driver'],
    version: '2025.1',
    effectiveDate: '2025-07-24',
    keyPoints: [
      'MyAmbulex is NOT a HIPAA covered entity',
      'Limited health information collected for transportation matching only',
      'Comprehensive background checks for drivers (criminal, MVR, drug testing)',
      'Real-time location tracking during active rides',
      'Data security measures with encryption and access controls',
      'User rights to access, correct, and delete personal information',
      'California CCPA rights for California residents',
      'Data retention periods: 7 years for safety records, 3 years for inactive accounts'
    ],
    checkboxText: 'I have read and understand the Privacy Policy and consent to data collection and use as described'
  },

  driver_services_agreement: {
    id: 'driver_services_agreement',
    title: 'Driver Services Agreement',
    description: 'Additional terms specific to drivers providing transportation services',
    documentUrl: '/api/legal/download/driver-agreement',
    requiredForRoles: ['driver'],
    version: '2025.1',
    effectiveDate: '2025-07-24',
    keyPoints: [
      'Independent contractor relationship with MyAmbulex',
      'Commercial auto insurance requirement ($1,000,000 minimum)',
      'Background check, drug testing, and MVR requirements',
      'HIPAA compliance and confidentiality obligations',
      'ADA compliance and disability accommodation requirements',
      'Professional conduct and safety standards',
      'Vehicle safety and maintenance requirements',
      'Platform-only service provision (no off-platform arrangements)'
    ],
    checkboxText: 'I agree to the Driver Services Agreement and confirm I meet all eligibility requirements'
  }
};

// Get agreements required for a specific role
export function getRequiredAgreements(role: 'rider' | 'driver'): LegalAgreementConfig[] {
  return Object.values(LEGAL_AGREEMENTS).filter(agreement => 
    agreement.requiredForRoles.includes(role)
  );
}

// Check if all required agreements are signed for a role
export function hasSignedAllRequired(
  signedAgreements: string[], 
  role: 'rider' | 'driver'
): boolean {
  const required = getRequiredAgreements(role);
  return required.every(agreement => signedAgreements.includes(agreement.id));
}

// Get agreement by ID
export function getAgreementById(id: string): LegalAgreementConfig | undefined {
  return LEGAL_AGREEMENTS[id];
}