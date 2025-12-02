/**
 * Unified Document Upload Service
 * Handles all document uploads with consistent validation and error handling
 * Uses fetch directly to avoid FormData corruption issues
 */

import { validateFile, getDocumentRequirements, getValidationErrorMessage } from '@shared/document-validation';
import { translateUploadError, ErrorContext } from '@shared/error-translation';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: true;
  document: {
    id: number;
    type: string;
    filename: string;
    originalName: string;
    url: string;
    verificationStatus: string;
  };
  message: string;
}

export interface UploadError {
  success: false;
  message: string;
  details?: string[];
  code?: string;
  errorDetails?: {
    title: string;
    description: string;
    code: string;
    severity: 'info' | 'warning' | 'error';
    actionable?: boolean;
    suggestedAction?: string;
  };
}

export type UploadResponse = UploadResult | UploadError;

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
  validateBeforeUpload?: boolean;
}

/**
 * Upload a document with unified validation and error handling
 */
export async function uploadDocument(
  file: File,
  documentType: string,
  options: UploadOptions = {}
): Promise<UploadResponse> {
  const { onProgress, signal, validateBeforeUpload = true } = options;

  try {
    // Pre-upload validation
    if (validateBeforeUpload) {
      const validationResult = validateFile(
        {
          name: file.name,
          size: file.size,
          type: file.type
        },
        documentType
      );

      if (!validationResult.valid) {
        return {
          success: false,
          message: getValidationErrorMessage(validationResult.errors),
          details: validationResult.errors,
          code: 'VALIDATION_ERROR'
        };
      }
    }

    // Create FormData
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);

    // Create request with proper abort handling
    const controller = new AbortController();
    const uploadSignal = signal || controller.signal;

    // Handle external abort signal
    if (signal) {
      signal.addEventListener('abort', () => {
        controller.abort();
      });
    }

    // Make upload request
    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
      signal: uploadSignal
    });

    // Handle response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const baseMessage = errorData.message || errorData.error || `Upload failed with status ${response.status}`;
      
      // Use error translation for better user experience
      const context: ErrorContext = {
        documentType,
        uploadContext: 'http_response'
      };
      
      const translatedError = translateUploadError(baseMessage, context);
      
      return {
        success: false,
        message: translatedError.description,
        details: errorData.details || [translatedError.description],
        code: errorData.code || 'HTTP_ERROR',
        errorDetails: translatedError
      };
    }

    const result = await response.json();
    
    return {
      success: true,
      document: result.document,
      message: result.message || 'Document uploaded successfully'
    };

  } catch (error: any) {
    // Handle abort errors gracefully - these are usually from cancelled requests, not actual failures
    if (error.name === 'AbortError' || error.message?.includes('abort') || error.message?.includes('cancelled')) {
      console.log('Upload request was aborted (likely due to navigation/refresh), not an actual error');
      return {
        success: false,
        message: 'Upload was cancelled',
        code: 'CANCELLED'
      };
    }

    // Use error translation for all other errors
    const context: ErrorContext = {
      documentType,
      uploadContext: 'upload_request'
    };
    
    const translatedError = translateUploadError(error, context);
    
    return {
      success: false,
      message: translatedError.description,
      code: translatedError.code,
      errorDetails: translatedError
    };
  }
}

/**
 * Validate file before upload without actually uploading
 */
export function validateDocumentFile(file: File, documentType: string): {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  requirements: any;
} {
  const validationResult = validateFile(
    {
      name: file.name,
      size: file.size,
      type: file.type
    },
    documentType
  );

  return {
    ...validationResult,
    requirements: getDocumentRequirements(documentType)
  };
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if file type is image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Check if file type is PDF
 */
export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf';
}

/**
 * Create a preview URL for image files
 */
export function createFilePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isImageFile(file)) {
      reject(new Error('File is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Upload multiple documents with progress tracking
 */
export async function uploadMultipleDocuments(
  uploads: Array<{ file: File; documentType: string }>,
  options: {
    onProgress?: (completed: number, total: number) => void;
    onFileComplete?: (result: UploadResponse, index: number) => void;
    signal?: AbortSignal;
  } = {}
): Promise<UploadResponse[]> {
  const { onProgress, onFileComplete, signal } = options;
  const results: UploadResponse[] = [];

  for (let i = 0; i < uploads.length; i++) {
    if (signal?.aborted) {
      break;
    }

    const { file, documentType } = uploads[i];
    
    try {
      const result = await uploadDocument(file, documentType, { signal });
      results.push(result);
      
      onFileComplete?.(result, i);
      onProgress?.(i + 1, uploads.length);
      
    } catch (error) {
      const errorResult: UploadError = {
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed',
        code: 'UPLOAD_ERROR'
      };
      
      results.push(errorResult);
      onFileComplete?.(errorResult, i);
      onProgress?.(i + 1, uploads.length);
    }
  }

  return results;
}

/**
 * Retry failed upload with exponential backoff
 */
export async function retryUpload(
  file: File,
  documentType: string,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<UploadResponse> {
  let lastError: UploadResponse | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await uploadDocument(file, documentType);
      
      if (result.success) {
        return result;
      }
      
      lastError = result;
      
      // Don't retry validation errors or cancellations
      if (result.code === 'VALIDATION_ERROR' || result.code === 'CANCELLED') {
        break;
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
      }
      
    } catch (error) {
      lastError = {
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed',
        code: 'RETRY_ERROR'
      };
    }
  }

  return lastError || {
    success: false,
    message: 'All retry attempts failed',
    code: 'MAX_RETRIES_EXCEEDED'
  };
}