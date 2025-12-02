/**
 * Shared Document Validation Utility
 * Single source of truth for document validation logic
 * Used by both frontend and backend to ensure consistency
 */

export interface DocumentRequirements {
  title: string;
  formats: string[];
  maxSizeMB: number;
  tips: string[];
  mimeTypes: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface FileValidationInput {
  name: string;
  size: number;
  type: string; // MIME type
}

// Document type requirements - single source of truth
export const DOCUMENT_REQUIREMENTS: Record<string, DocumentRequirements> = {
  license_front: {
    title: "Driver's License (Front)",
    formats: ['JPG', 'JPEG', 'PNG', 'WebP'],
    maxSizeMB: 10,
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    tips: [
      'Photo should be clear and readable',
      'All corners of the license should be visible',
      'Avoid glare and shadows'
    ]
  },
  license_back: {
    title: "Driver's License (Back)",
    formats: ['JPG', 'JPEG', 'PNG', 'WebP'],
    maxSizeMB: 10,
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    tips: [
      'Photo should be clear and readable',
      'All corners of the license should be visible',
      'Avoid glare and shadows'
    ]
  },
  insurance: {
    title: "Insurance Document",
    formats: ['PDF', 'JPG', 'JPEG', 'PNG', 'WebP'],
    maxSizeMB: 10,
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    tips: [
      'Document must be current and valid',
      'All text should be clearly visible',
      'Include all pages if multi-page document'
    ]
  },
  vehicle_registration: {
    title: "Vehicle Registration",
    formats: ['PDF', 'JPG', 'JPEG', 'PNG', 'WebP'],
    maxSizeMB: 10,
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    tips: [
      'Registration must be current',
      'Vehicle information should match your profile',
      'All text should be clearly readable'
    ]
  },
  medical_certification: {
    title: "Medical Certification",
    formats: ['PDF', 'JPG', 'JPEG', 'PNG', 'WebP'],
    maxSizeMB: 10,
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    tips: [
      'Certification must be current and valid',
      'Include all required medical information',
      'Document should be from a licensed medical professional'
    ]
  },
  cprFirstAid: {
    title: "CPR/First Aid Certification",
    formats: ['PDF', 'JPG', 'JPEG', 'PNG', 'WebP'],
    maxSizeMB: 10,
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    tips: [
      'Must be current and valid',
      'Include certification number and expiration date',
      'Must be from AHA, Red Cross, or other recognized provider'
    ]
  },
  basicLifeSupport: {
    title: "Basic Life Support (BLS)",
    formats: ['PDF', 'JPG', 'JPEG', 'PNG', 'WebP'],
    maxSizeMB: 10,
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    tips: [
      'Must be current and valid',
      'Include BLS certification number and expiration date',
      'Must be from AHA, Red Cross, or other recognized provider'
    ]
  },
  advancedLifeSupport: {
    title: "Advanced Life Support (ALS)",
    formats: ['PDF', 'JPG', 'JPEG', 'PNG', 'WebP'],
    maxSizeMB: 10,
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    tips: [
      'Must be current and valid',
      'Include ALS certification number and expiration date',
      'Must be from recognized medical authority'
    ]
  },
  emtCertification: {
    title: "EMT Certification",
    formats: ['PDF', 'JPG', 'JPEG', 'PNG', 'WebP'],
    maxSizeMB: 10,
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    tips: [
      'Must be current and valid',
      'Include EMT certification number and expiration date',
      'Must be from state-certified EMT program'
    ]
  },
  paramedicCertification: {
    title: "Paramedic Certification",
    formats: ['PDF', 'JPG', 'JPEG', 'PNG', 'WebP'],
    maxSizeMB: 10,
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    tips: [
      'Must be current and valid',
      'Include paramedic certification number and expiration date',
      'Must be from state-certified paramedic program'
    ]
  },
  background_check: {
    title: "Background Check",
    formats: ['PDF'],
    maxSizeMB: 10,
    mimeTypes: ['application/pdf'],
    tips: [
      'Must be from an approved background check provider',
      'Document should be dated within the last 6 months',
      'Include all pages of the report'
    ]
  },
  drug_test: {
    title: "Drug Test Results",
    formats: ['PDF'],
    maxSizeMB: 10,
    mimeTypes: ['application/pdf'],
    tips: [
      'Results must be from a certified testing facility',
      'Document should be dated within the last 6 months',
      'Include all pages of the report'
    ]
  },
  mvr_record: {
    title: "Motor Vehicle Record (MVR)",
    formats: ['PDF'],
    maxSizeMB: 10,
    mimeTypes: ['application/pdf'],
    tips: [
      'MVR must be from your state DMV',
      'Document should be dated within the last 6 months',
      'Include complete driving record'
    ]
  },
  firstAidCertification: {
    title: "First Aid Certification",
    formats: ['PDF', 'JPG', 'JPEG', 'PNG', 'WebP'],
    maxSizeMB: 10,
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    tips: [
      'Certification must be current and valid',
      'Include certification number and expiration date',
      'Must be from a recognized training organization'
    ]
  },
  cprCertification: {
    title: "CPR Certification",
    formats: ['PDF', 'JPG', 'JPEG', 'PNG', 'WebP'],
    maxSizeMB: 10,
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    tips: [
      'Certification must be current and valid',
      'Include certification number and expiration date',
      'Must be from a recognized training organization'
    ]
  },
  profile_photo: {
    title: "Profile Photo",
    formats: ['JPG', 'JPEG', 'PNG', 'WebP'],
    maxSizeMB: 5,
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    tips: [
      'Photo should be professional and clear',
      'Face should be clearly visible',
      'Good lighting and high resolution preferred'
    ]
  }
};

/**
 * Get requirements for a specific document type
 */
export function getDocumentRequirements(documentType: string): DocumentRequirements {
  return DOCUMENT_REQUIREMENTS[documentType] || {
    title: 'Document',
    formats: ['PDF', 'JPG', 'PNG'],
    maxSizeMB: 10,
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    tips: ['Please upload a clear, readable document']
  };
}

/**
 * Validate file against document requirements
 * Works on both frontend and backend
 */
export function validateFile(file: FileValidationInput, documentType: string): ValidationResult {
  const requirements = getDocumentRequirements(documentType);
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate file size
  const maxSizeBytes = requirements.maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    errors.push(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is ${requirements.maxSizeMB}MB.`
    );
  }

  // Validate MIME type
  if (!requirements.mimeTypes.includes(file.type)) {
    errors.push(
      `File type not supported. Please use: ${requirements.formats.join(', ')}`
    );
  }

  // Validate file extension (additional check)
  const extension = file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = requirements.mimeTypes.map(mime => {
    switch (mime) {
      case 'application/pdf': return 'pdf';
      case 'image/jpeg': 
      case 'image/jpg': return ['jpg', 'jpeg'];
      case 'image/png': return 'png';
      case 'image/webp': return 'webp';
      default: return '';
    }
  }).flat().filter(Boolean);

  if (extension && !allowedExtensions.includes(extension)) {
    errors.push(
      `File extension not supported. Please use: ${requirements.formats.join(', ')}`
    );
  }

  // Validate file name length
  if (file.name.length > 100) {
    errors.push('File name is too long. Please use a shorter name (max 100 characters).');
  }

  // Check for suspicious file names
  const suspiciousPatterns = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js'];
  if (suspiciousPatterns.some(pattern => file.name.toLowerCase().includes(pattern))) {
    errors.push('File name contains suspicious content. Please rename the file.');
  }

  // File size warnings
  if (file.size > 8 * 1024 * 1024) { // 8MB
    warnings.push('Large file detected. Upload may take longer.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check if file type is allowed for document type
 */
export function isFileTypeAllowed(mimeType: string, documentType: string): boolean {
  const requirements = getDocumentRequirements(documentType);
  return requirements.mimeTypes.includes(mimeType);
}

/**
 * Check if file size is within limits
 */
export function isFileSizeAllowed(size: number, documentType: string): boolean {
  const requirements = getDocumentRequirements(documentType);
  const maxSizeBytes = requirements.maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
}

/**
 * Get user-friendly error message for validation failure
 */
export function getValidationErrorMessage(errors: string[]): string {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0];
  return `Multiple issues found:\n• ${errors.join('\n• ')}`;
}

/**
 * Get upload tips for document type
 */
export function getUploadTips(documentType: string): string[] {
  return getDocumentRequirements(documentType).tips;
}

/**
 * Document type mapping for database fields
 */
export const DOCUMENT_TYPE_MAPPING: Record<string, string> = {
  // Standard mappings
  license_front: 'licensePhotoFront',
  license_back: 'licensePhotoBack', 
  insurance: 'insuranceDocumentUrl',
  vehicle_registration: 'vehicleRegistrationUrl',
  medical_certification: 'medicalCertificationUrl',
  background_check: 'backgroundCheckDocumentUrl',
  drug_test: 'drugTestDocumentUrl',
  mvr_record: 'mvrRecordUrl',
  firstAidCertification: 'cprFirstAidCertificationUrl',
  cprCertification: 'cprFirstAidCertificationUrl', 
  cprFirstAid: 'cprFirstAidCertificationUrl',
  basicLifeSupport: 'basicLifeSupportUrl',
  advancedLifeSupport: 'advancedLifeSupportUrl',
  emtCertification: 'emtCertificationUrl',
  paramedicCertification: 'paramedicCertificationUrl',
  profile_photo: 'profilePhoto',
  
  // Frontend compatibility mappings (what the frontend actually sends)
  licensePhotoFront: 'licensePhotoFront',
  licensePhotoBack: 'licensePhotoBack',
  insuranceDocument: 'insuranceDocumentUrl',
  vehicleRegistration: 'vehicleRegistrationUrl',
  medicalCertification: 'medicalCertificationUrl',
  backgroundCheck: 'backgroundCheckDocumentUrl',
  drugTestResults: 'drugTestDocumentUrl',
  drugTest: 'drugTestDocumentUrl',
  mvrRecord: 'mvrRecordUrl',
  profilePhoto: 'profilePhoto',
  
  // Additional frontend mappings from verification section
  driverLicense: 'licensePhotoFront',
  insuranceCard: 'insuranceDocumentUrl'
};

/**
 * Get database field name for document type
 */
export function getDocumentDatabaseField(documentType: string): string {
  return DOCUMENT_TYPE_MAPPING[documentType] || documentType;
}