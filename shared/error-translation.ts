// Unified error translation system for user-friendly messages
// Used by both frontend and backend to provide consistent error experience

export interface ErrorTranslationResult {
  title: string;
  description: string;
  code: string;
  severity: 'info' | 'warning' | 'error';
  actionable?: boolean;
  suggestedAction?: string;
}

export interface ErrorContext {
  userRole?: 'rider' | 'driver' | 'admin';
  documentType?: string;
  uploadContext?: string;
  originalError?: string;
}

// Error code mappings to user-friendly messages
const ERROR_TRANSLATIONS: Record<string, (context?: ErrorContext) => ErrorTranslationResult> = {
  // File validation errors
  FILE_TOO_LARGE: (context) => ({
    title: "File is too large",
    description: `Please choose a file smaller than ${getMaxSize(context?.documentType)}. Large files can take longer to upload and may not be processed correctly.`,
    code: "FILE_TOO_LARGE",
    severity: "error",
    actionable: true,
    suggestedAction: "Compress your image or choose a smaller file"
  }),

  FILE_TYPE_NOT_ALLOWED: (context) => ({
    title: "File type not supported",
    description: `Please use ${getAllowedTypes(context?.documentType)}. These formats ensure your document can be properly reviewed.`,
    code: "FILE_TYPE_NOT_ALLOWED", 
    severity: "error",
    actionable: true,
    suggestedAction: "Convert your file to PDF, JPEG, or PNG"
  }),

  FILE_QUALITY_LOW: (context) => ({
    title: "Image quality may be too low",
    description: "Your image appears to have low resolution. This might make it difficult to read important details during review.",
    code: "FILE_QUALITY_LOW",
    severity: "warning",
    actionable: true,
    suggestedAction: "Take a clearer photo with better lighting"
  }),

  FILE_DIMENSIONS_INVALID: (context) => ({
    title: "Image dimensions are not ideal",
    description: "Your image might be too small or have unusual proportions. Documents should be clear and readable.",
    code: "FILE_DIMENSIONS_INVALID",
    severity: "warning",
    actionable: true,
    suggestedAction: "Capture the full document in your photo"
  }),

  // Upload process errors
  UPLOAD_FAILED: (context) => ({
    title: "Upload failed",
    description: "We couldn't upload your document. This might be due to a network issue or server problem.",
    code: "UPLOAD_FAILED",
    severity: "error",
    actionable: true,
    suggestedAction: "Check your internet connection and try again"
  }),

  NETWORK_ERROR: (context) => ({
    title: "Connection problem",
    description: "We're having trouble connecting to our servers. Please check your internet connection.",
    code: "NETWORK_ERROR",
    severity: "error",
    actionable: true,
    suggestedAction: "Check your internet and try again in a moment"
  }),

  SERVER_ERROR: (context) => ({
    title: "Server error",
    description: "Something went wrong on our end. Our team has been notified and is working to fix this.",
    code: "SERVER_ERROR",
    severity: "error",
    actionable: true,
    suggestedAction: "Please try again in a few minutes"
  }),

  // Authentication errors
  UNAUTHORIZED: (context) => ({
    title: "Please sign in",
    description: "You need to be signed in to upload documents. Your session may have expired.",
    code: "UNAUTHORIZED",
    severity: "error",
    actionable: true,
    suggestedAction: "Sign in to your account and try again"
  }),

  INSUFFICIENT_PERMISSIONS: (context) => ({
    title: "Permission denied",
    description: "You don't have permission to perform this action. Please contact support if you think this is an error.",
    code: "INSUFFICIENT_PERMISSIONS",
    severity: "error",
    actionable: true,
    suggestedAction: "Contact support for assistance"
  }),

  // Document-specific errors
  DOCUMENT_ALREADY_UPLOADED: (context) => ({
    title: "Document already uploaded",
    description: `You've already uploaded a ${getDocumentDisplayName(context?.documentType)}. You can replace it by uploading a new one.`,
    code: "DOCUMENT_ALREADY_UPLOADED",
    severity: "info",
    actionable: true,
    suggestedAction: "Upload a new file to replace the current one"
  }),

  DOCUMENT_UNDER_REVIEW: (context) => ({
    title: "Document is being reviewed",
    description: "Your document is currently being reviewed by our team. We'll notify you once the review is complete.",
    code: "DOCUMENT_UNDER_REVIEW",
    severity: "info",
    actionable: false
  }),

  DOCUMENT_REJECTED: (context) => ({
    title: "Document was not approved",
    description: context?.originalError || "Your document didn't meet our requirements. Please review the feedback and upload a corrected version.",
    code: "DOCUMENT_REJECTED",
    severity: "error",
    actionable: true,
    suggestedAction: "Review the feedback and upload a new document"
  }),

  // Validation errors
  VALIDATION_ERROR: (context) => ({
    title: "Invalid file",
    description: context?.originalError || "The file you selected doesn't meet our requirements.",
    code: "VALIDATION_ERROR",
    severity: "error",
    actionable: true,
    suggestedAction: "Please check the file requirements and try again"
  }),

  // Generic errors
  UNKNOWN_ERROR: (context) => ({
    title: "Something went wrong",
    description: "An unexpected error occurred. Please try again or contact support if the problem continues.",
    code: "UNKNOWN_ERROR",
    severity: "error",
    actionable: true,
    suggestedAction: "Try again or contact support"
  })
};

// Helper functions
function getMaxSize(documentType?: string): string {
  return "10MB"; // Standard max size for all documents
}

function getAllowedTypes(documentType?: string): string {
  return "PDF, JPEG, PNG, or WebP files";
}

function getDocumentDisplayName(documentType?: string): string {
  const displayNames: Record<string, string> = {
    license_front: "driver's license (front)",
    license_back: "driver's license (back)", 
    insurance: "insurance document",
    vehicle_registration: "vehicle registration",
    background_check: "background check document",
    drug_test: "drug test results",
    mvr_record: "MVR record",
    firstAidCertification: "First Aid certification",
    cprCertification: "CPR certification",
    medical_certification: "medical certification",
    cprFirstAid: "CPR/First Aid certification",
    basicLifeSupport: "Basic Life Support certification",
    advancedLifeSupport: "Advanced Life Support certification",
    emtCertification: "EMT certification",
    paramedicCertification: "Paramedic certification",
    profile_photo: "profile photo"
  };
  
  return displayNames[documentType || ''] || "document";
}

// Main translation function
export function translateError(
  errorCode: string, 
  context?: ErrorContext
): ErrorTranslationResult {
  const translator = ERROR_TRANSLATIONS[errorCode];
  
  if (translator) {
    return translator(context);
  }
  
  // Fallback for unknown error codes
  return ERROR_TRANSLATIONS.UNKNOWN_ERROR(context);
}

// Convenience function for common upload errors
export function translateUploadError(
  error: Error | string,
  context?: ErrorContext
): ErrorTranslationResult {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();
  
  // Map common error patterns to error codes
  if (lowerMessage.includes('file too large') || lowerMessage.includes('size')) {
    return translateError('FILE_TOO_LARGE', context);
  }
  
  if (lowerMessage.includes('file type') || lowerMessage.includes('format')) {
    return translateError('FILE_TYPE_NOT_ALLOWED', context);
  }
  
  if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
    return translateError('NETWORK_ERROR', context);
  }
  
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
    return translateError('UNAUTHORIZED', context);
  }
  
  if (lowerMessage.includes('server') || lowerMessage.includes('500')) {
    return translateError('SERVER_ERROR', context);
  }
  
  // Return validation error with original message
  return translateError('VALIDATION_ERROR', { 
    ...context, 
    originalError: errorMessage 
  });
}

// Types are already exported above