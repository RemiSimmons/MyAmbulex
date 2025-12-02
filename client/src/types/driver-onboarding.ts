// Types for driver onboarding process
// Aligned with actual database schema

export interface DriverRegistrationProgress {
  id?: number;
  userId?: number;
  step: number;
  formData?: any;
  vehicleData?: any;
  availabilitySettings?: any;
  lastSaved?: Date;
}

// Document status for verification tracking
export interface DocumentStatus {
  uploaded: boolean;
  verified: boolean;
  url?: string;
  filename?: string;
  rejectionReason?: string;
}

// Driver details with all document fields
export interface DriverDetails {
  id?: number;
  userId: number;
  
  // License information
  licenseNumber: string;
  licenseState: string;
  licenseExpiry: Date;
  licenseClass?: string;
  licensePhotoFront?: string;
  licensePhotoBack?: string;
  licenseVerified?: boolean;
  licenseRejectionReason?: string;
  
  // Insurance information
  insuranceProvider: string;
  insuranceNumber: string;
  insuranceExpiry: Date;
  insuranceDocumentUrl?: string;
  insuranceVerified?: boolean;
  insuranceRejectionReason?: string;
  
  // Professional qualifications
  yearsOfExperience?: number;
  medicalTrainingLevel?: string;
  certifications?: string[];
  
  // Documents
  backgroundCheckDocumentUrl?: string;
  backgroundCheckVerified?: boolean;
  backgroundCheckRejectionReason?: string;
  backgroundCheckStatus?: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'expired';
  
  vehicleRegistrationUrl?: string;
  vehicleVerified?: boolean;
  vehicleRejectionReason?: string;
  
  drugTestDocumentUrl?: string;
  drugTestVerified?: boolean;
  drugTestRejectionReason?: string;
  
  mvrRecordUrl?: string;
  mvrRecordVerified?: boolean;
  mvrRecordRejectionReason?: string;
  
  firstAidCertificationUrl?: string;
  firstAidCertificationVerified?: boolean;
  firstAidCertificationRejectionReason?: string;
  
  cprCertificationUrl?: string;
  cprCertificationVerified?: boolean;
  cprCertificationRejectionReason?: string;
  
  medicalCertificationUrl?: string;
  medicalCertificationVerified?: boolean;
  medicalCertificationRejectionReason?: string;
  
  profilePhoto?: string;
  profileVerified?: boolean;
  profileRejectionReason?: string;
  
  // Status and permissions
  verified?: boolean;
  accountStatus?: 'pending' | 'active' | 'suspended' | 'rejected';
  canAcceptRides?: boolean;
  canViewRideRequests?: boolean;
  
  // Other fields
  serviceArea?: any;
  serviceHours?: any;
  preferredVehicleTypes?: string[];
  maxTravelDistance?: number;
  biography?: string;
  languages?: string[];
}

// Combined interface for onboarding with document status
export interface DriverOnboardingData {
  registrationProgress: DriverRegistrationProgress;
  driverDetails?: DriverDetails;
  documentStatus: {
    licensePhotoFront: DocumentStatus;
    licensePhotoBack: DocumentStatus;
    insurance: DocumentStatus;
    vehicleRegistration: DocumentStatus;
    backgroundCheck: DocumentStatus;
    drugTest: DocumentStatus;
    mvrRecord: DocumentStatus;
    firstAidCertification: DocumentStatus;
    cprCertification: DocumentStatus;
    medicalCertification: DocumentStatus;
    profilePhoto: DocumentStatus;
  };
}

export interface DriverStatus {
  isVerified: boolean;
  application: {
    status: "incomplete" | "pending" | "active" | "rejected";
    backgroundCheckStatus: "pending" | "approved" | "rejected";
    approvedAt?: Date | null;
    rejectionReason?: string | null;
  };
  registrationProgress?: DriverRegistrationProgress;
}

export interface PricingSettings {
  baseRatePerHour: number;
  weekendBonus: number;
  vehicleRates: {
    sedan: number;
    suv: number;
    van: number;
    "wheelchair-accessible": number;
  };
  longDistanceMultiplier: number;
  baseWaitTimeRate: number;
  perMinuteWaitTimeRate: number;
  roundTripMultiplier: number;
  cancellationFee: number;
  minimumFare: number;
}