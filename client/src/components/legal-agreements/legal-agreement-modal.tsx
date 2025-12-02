import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, FileText, Shield, CheckCircle } from 'lucide-react';
import { useSignDocument, useCompletionStatus } from '@/hooks/use-legal-agreements';
import { useToast } from '@/hooks/use-toast';

interface LegalAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (isComplete: boolean) => void;
  userRole: 'rider' | 'driver';
}

export function LegalAgreementModal({ 
  isOpen, 
  onClose, 
  onComplete, 
  userRole 
}: LegalAgreementModalProps) {
  const { toast } = useToast();
  const { data: completionStatus, isLoading: isLoadingStatus } = useCompletionStatus();
  const signDocument = useSignDocument();
  
  const [agreements, setAgreements] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Document configurations
  const documentConfigs = {
    terms_of_service: {
      title: 'Terms of Service',
      description: 'Terms governing your use of MyAmbulex platform',
      url: '/legal/terms-of-service',
      icon: FileText,
    },
    privacy_policy: {
      title: 'Privacy Policy',  
      description: 'How we collect, use, and protect your personal information',
      url: '/legal/privacy-policy',
      icon: Shield,
    },
    driver_agreement: {
      title: 'Driver Agreement',
      description: 'Terms specific to drivers providing transportation services',
      url: '/legal/driver-agreement',
      icon: FileText,
    },
    rider_agreement: {
      title: 'Rider Agreement',
      description: 'Terms specific to riders using transportation services',
      url: '/legal/rider-agreement',
      icon: FileText,
    },
  };

  const requiredDocuments = completionStatus?.requiredDocuments || [];
  const signedDocuments = completionStatus?.signedDocuments || [];
  const missingDocuments = completionStatus?.missingDocuments || [];

  const handleAgreementChange = (documentType: string, checked: boolean) => {
    setAgreements(prev => ({
      ...prev,
      [documentType]: checked
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Sign all checked agreements
      const signingsToProcess = Object.entries(agreements)
        .filter(([_, checked]) => checked)
        .map(([documentType]) => documentType);

      for (const documentType of signingsToProcess) {
        await signDocument.mutateAsync({
          documentType,
          documentVersion: '1.0',
          isRequired: requiredDocuments.includes(documentType),
          isActive: true
        });
      }

      toast({
        title: 'Legal agreements signed',
        description: 'Your legal agreements have been successfully recorded.',
      });

      // Check if all required documents are now signed
      const allRequiredSigned = requiredDocuments.every(docType => 
        signedDocuments.includes(docType) || agreements[docType]
      );

      onComplete(allRequiredSigned);
      
      if (allRequiredSigned) {
        onClose();
      }

    } catch (error) {
      console.error('Error signing legal agreements:', error);
      toast({
        title: 'Error signing agreements',
        description: 'There was an error recording your legal agreements. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = missingDocuments.length === 0 || 
    missingDocuments.every(docType => agreements[docType]);

  if (isLoadingStatus) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Legal Agreements</DialogTitle>
            <DialogDescription>Loading agreement status...</DialogDescription>
          </DialogHeader>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (completionStatus?.isComplete) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Legal Agreements Complete
            </DialogTitle>
          </DialogHeader>
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              All required legal agreements have been signed. You can now proceed to use the platform.
            </AlertDescription>
          </Alert>
          <div className="flex justify-end pt-4">
            <Button onClick={onClose}>Continue</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Legal Agreements Required
          </DialogTitle>
          <DialogDescription>
            Please review and accept the following legal agreements to complete your registration.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {requiredDocuments.map((documentType) => {
            const config = documentConfigs[documentType];
            const isAlreadySigned = signedDocuments.includes(documentType);
            const Icon = config.icon;

            return (
              <div key={documentType} className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-start space-x-3">
                  <Icon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{config.title}</h3>
                      {isAlreadySigned && (
                        <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Signed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{config.description}</p>
                    
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(config.url, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Read Document
                      </Button>
                      
                      {!isAlreadySigned && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={documentType}
                            checked={agreements[documentType] || false}
                            onCheckedChange={(checked) => 
                              handleAgreementChange(documentType, checked as boolean)
                            }
                          />
                          <label 
                            htmlFor={documentType} 
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            I agree to the {config.title}
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {missingDocuments.length > 0 && (
            <div className="pt-4 border-t">
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting ? 'Processing...' : 'Sign Agreements'}
                </Button>
              </div>
              
              {!canSubmit && (
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Please check all required agreements before proceeding.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}