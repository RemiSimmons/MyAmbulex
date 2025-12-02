import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { LegalAgreementSignature, InsertLegalAgreementSignature } from '@/../../shared/schema';

export function useLegalAgreements() {
  return useQuery({
    queryKey: ['/api/legal-agreements/signatures'],
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useRequiredDocuments() {
  return useQuery({
    queryKey: ['/api/legal-agreements/required-documents'],
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useCompletionStatus() {
  return useQuery({
    queryKey: ['/api/legal-agreements/completion-status'],
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useDocumentSignature(documentType: string) {
  return useQuery({
    queryKey: ['/api/legal-agreements/signed', documentType],
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useSignDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (signatureData: Omit<InsertLegalAgreementSignature, 'userId' | 'ipAddress' | 'userAgent'>) => {
      const response = await apiRequest('POST', '/api/legal-agreements/sign', signatureData);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/legal-agreements'] });
    },
  });
}