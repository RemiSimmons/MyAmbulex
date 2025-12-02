import { apiRequest } from "@/lib/queryClient";

export interface DocumentUploadResponse {
  message: string;
  documentId: string;
  url: string;
  documentType: string;
}

export async function uploadDocument(
  file: File,
  documentType: string
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append('document', file);
  formData.append('documentType', documentType);

  const response = await fetch('/api/documents/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to upload document');
  }

  return await response.json();
}

export function getDocumentTypeFromField(fieldName: string): string {
  switch (fieldName) {
    case 'licensePhotoFront':
      return 'license_front';
    case 'licensePhotoBack':
      return 'license_back';
    case 'insuranceDocumentUrl':
      return 'insurance';
    case 'vehicleRegistrationUrl':
      return 'vehicle_registration';
    case 'backgroundCheckDocumentUrl':
      return 'background_check';
    case 'medicalCertificationUrl':
      return 'medical_certification';
    case 'drugTestResultsUrl':
      return 'drug_test';
    case 'mvrRecordUrl':
      return 'mvr_record';
    case 'profilePhoto':
      return 'profile_photo';
    default:
      return fieldName;
  }
}