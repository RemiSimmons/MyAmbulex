/**
 * User-friendly error translation service
 * Converts technical errors into clear, actionable messages for users
 */

export interface UserError {
  message: string;
  action?: string;
  severity: 'info' | 'warning' | 'error';
  helpText?: string;
}

export class UserErrorTranslator {
  private static errorMap: Record<string, UserError> = {
    // Document access errors
    'document_not_found': {
      message: 'This document is no longer available',
      action: 'Contact support if you need help finding this document',
      severity: 'error',
      helpText: 'Documents may be removed after verification or due to system maintenance'
    },
    'access_denied': {
      message: "You don't have permission to view this document",
      action: 'Make sure you are logged into the correct account',
      severity: 'warning',
      helpText: 'Only document owners and administrators can access documents'
    },
    'file_missing': {
      message: 'This file is temporarily unavailable',
      action: 'Please try again in a few moments',
      severity: 'warning',
      helpText: 'Files may be temporarily unavailable during system updates'
    },
    
    // Upload errors
    'upload_failed': {
      message: 'Your document could not be uploaded',
      action: 'Check your file and try uploading again',
      severity: 'error',
      helpText: 'Make sure your file is under 10MB and in a supported format (PDF, JPG, PNG)'
    },
    'file_too_large': {
      message: 'Your file is too large to upload',
      action: 'Please choose a file smaller than 10MB',
      severity: 'error',
      helpText: 'You can compress images or save PDFs in a smaller size'
    },
    'invalid_file_type': {
      message: 'This file type is not supported',
      action: 'Please upload a PDF, JPG, or PNG file',
      severity: 'error',
      helpText: 'Supported formats: PDF for documents, JPG/PNG for photos'
    },
    'authentication_required': {
      message: 'Please log in to continue',
      action: 'Sign in to your account to access this feature',
      severity: 'warning',
      helpText: 'Your session may have expired'
    },
    
    // Rate limiting
    'too_many_requests': {
      message: 'Too many download attempts',
      action: 'Please wait an hour before downloading more files',
      severity: 'warning',
      helpText: 'This limit helps protect our servers and your account security'
    },
    
    // System errors
    'server_error': {
      message: 'Something went wrong on our end',
      action: 'Please try again, or contact support if the problem continues',
      severity: 'error',
      helpText: 'Our team has been notified and is working to fix this issue'
    },
    'network_error': {
      message: 'Connection problem',
      action: 'Check your internet connection and try again',
      severity: 'warning',
      helpText: 'This usually resolves itself within a few minutes'
    }
  };

  static translate(
    errorCode: string, 
    userRole: 'rider' | 'driver' | 'admin' = 'rider',
    context?: any
  ): UserError {
    const baseError = this.errorMap[errorCode];
    
    if (!baseError) {
      return {
        message: 'An unexpected error occurred',
        action: 'Please try again or contact support if the problem continues',
        severity: 'error',
        helpText: 'Our team has been notified about this issue'
      };
    }

    // Customize messages based on user role
    if (userRole === 'driver' && errorCode === 'upload_failed') {
      return {
        ...baseError,
        action: 'Try uploading your document again, or contact support for help',
        helpText: 'Driver documents are required for account verification'
      };
    }

    if (userRole === 'admin' && errorCode === 'access_denied') {
      return {
        ...baseError,
        message: 'Admin access temporarily unavailable',
        action: 'Try refreshing the page or contact system administrator',
        helpText: 'This may be due to a system update or maintenance'
      };
    }

    return baseError;
  }

  static formatForResponse(error: UserError) {
    return {
      error: error.message,
      action: error.action,
      severity: error.severity,
      help: error.helpText
    };
  }

  // Map common technical errors to user-friendly codes
  static mapTechnicalError(technicalError: string): string {
    const lowerError = technicalError.toLowerCase();
    
    if (lowerError.includes('authentication') || lowerError.includes('unauthorized')) {
      return 'authentication_required';
    }
    if (lowerError.includes('not found') || lowerError.includes('missing')) {
      return 'document_not_found';
    }
    if (lowerError.includes('access') || lowerError.includes('forbidden')) {
      return 'access_denied';
    }
    if (lowerError.includes('too large') || lowerError.includes('size')) {
      return 'file_too_large';
    }
    if (lowerError.includes('type') || lowerError.includes('format')) {
      return 'invalid_file_type';
    }
    if (lowerError.includes('rate') || lowerError.includes('limit')) {
      return 'too_many_requests';
    }
    if (lowerError.includes('network') || lowerError.includes('connection')) {
      return 'network_error';
    }
    
    return 'server_error';
  }
}

// Document status translations
export const DOCUMENT_STATUS_MESSAGES = {
  'pending': {
    display: 'Under Review',
    description: "We're reviewing your document and will notify you within 2-3 business days",
    color: 'yellow',
    icon: 'clock'
  },
  'approved': {
    display: 'Verified',
    description: 'Your document has been approved and meets all requirements',
    color: 'green',
    icon: 'check-circle'
  },
  'rejected': {
    display: 'Needs Attention',
    description: 'Please see the details below and upload a corrected document',
    color: 'red',
    icon: 'alert-circle'
  },
  'expired': {
    display: 'Document Expired',
    description: 'Please upload a new, current version of this document',
    color: 'orange',
    icon: 'alert-triangle'
  },
  'missing': {
    display: 'Required',
    description: 'This document is required to complete your verification',
    color: 'gray',
    icon: 'upload'
  }
};

// File requirements display
export const FILE_REQUIREMENTS = {
  'license': {
    title: "Driver's License",
    formats: ['JPG', 'PNG'],
    maxSize: '5MB',
    tips: [
      'Take a clear photo with good lighting',
      'Make sure all text is readable',
      'Include the full license in the frame'
    ]
  },
  'insurance': {
    title: 'Insurance Policy',
    formats: ['PDF', 'JPG', 'PNG'],
    maxSize: '10MB',
    tips: [
      'Current policy showing active coverage',
      'Must include your name and policy number',
      'Scan or photo should be clear and readable'
    ]
  },
  'vehicle_registration': {
    title: 'Vehicle Registration',
    formats: ['PDF', 'JPG', 'PNG'],
    maxSize: '10MB',
    tips: [
      'Current registration document',
      'Vehicle must match your insurance policy',
      'All information must be clearly visible'
    ]
  },
  'background_check': {
    title: 'Background Check',
    formats: ['PDF'],
    maxSize: '10MB',
    tips: [
      'Official background check report',
      'Must be dated within the last 3 months',
      'Upload the complete report, not just a summary'
    ]
  },
  'drug_test': {
    title: 'Drug Test Results',
    formats: ['PDF', 'JPG', 'PNG'],
    maxSize: '10MB',
    tips: [
      'Results from an approved testing facility',
      'Must be dated within the last 30 days',
      'Include facility name and contact information'
    ]
  },
  'mvr_record': {
    title: 'Motor Vehicle Record (MVR)',
    formats: ['PDF'],
    maxSize: '10MB',
    tips: [
      'Official MVR from your state DMV',
      'Must cover the last 3 years of driving history',
      'Cannot be older than 30 days'
    ]
  },
  'first_aid_certification': {
    title: 'First Aid Certification',
    formats: ['PDF', 'JPG', 'PNG'],
    maxSize: '10MB',
    tips: [
      'Current First Aid certification',
      'Must be from a recognized training organization',
      'Certification must not be expired'
    ]
  },
  'cpr_certification': {
    title: 'CPR Certification',
    formats: ['PDF', 'JPG', 'PNG'],
    maxSize: '10MB',
    tips: [
      'Current CPR certification',
      'Must be from a recognized training organization',
      'Certification must not be expired'
    ]
  }
};

export function getDocumentRequirements(documentType: string) {
  return FILE_REQUIREMENTS[documentType as keyof typeof FILE_REQUIREMENTS] || {
    title: 'Document',
    formats: ['PDF', 'JPG', 'PNG'],
    maxSize: '10MB',
    tips: ['Please upload a clear, readable document']
  };
}