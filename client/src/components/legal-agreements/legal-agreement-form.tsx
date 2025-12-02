import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, FileText, Shield, Users } from 'lucide-react';
import { useSignDocument, useCompletionStatus } from '@/hooks/use-legal-agreements';
import { useToast } from '@/hooks/use-toast';
// Import removed - will use direct configuration below

interface LegalAgreementFormProps {
  userRole: 'rider' | 'driver';
  onComplete?: (isComplete: boolean) => void;
  showHeader?: boolean;
}

export function LegalAgreementForm({ userRole, onComplete, showHeader = true }: LegalAgreementFormProps) {
  const { toast } = useToast();
  const { data: completionStatus, isLoading: isLoadingStatus } = useCompletionStatus();
  const signDocument = useSignDocument();
  
  const [agreements, setAgreements] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Comprehensive document configurations using uploaded legal documents
  const documentConfigs = {
    platform_user_agreement: {
      title: 'Platform User Agreement',
      description: 'Comprehensive terms and conditions for using the MyAmbulex platform',
      url: '/api/legal/download/platform-user-agreement',
      icon: FileText,
      keyPoints: [
        'MyAmbulex is a technology platform that connects riders and drivers',
        'All transportation services are provided by independent contractors',
        'Binding arbitration clause and class action waiver apply',
        'Comprehensive liability limitations and indemnification requirements',
        'Non-solicitation clause prevents bypassing platform for 24 months',
        'HIPAA and ADA compliance obligations for drivers',
        'Professional conduct and safety standards required'
      ],
      requiredFor: ['rider', 'driver']
    },
    privacy_policy: {
      title: 'Privacy Policy',
      description: 'How we collect, use, and protect your personal information',
      url: '/api/legal/download/privacy-policy',
      icon: Shield,
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
      requiredFor: ['rider', 'driver']
    },
    driver_agreement: {
      title: 'Driver Services Agreement',
      description: 'Additional terms specific to drivers providing transportation services',
      url: '/api/legal/download/driver-agreement',
      icon: Users,
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
      requiredFor: ['driver']
    },
  };

  // Get documents required for this user role
  const getRequiredDocumentsForRole = () => {
    return Object.entries(documentConfigs)
      .filter(([_, config]) => config.requiredFor.includes(userRole))
      .map(([key]) => key);
  };

  const requiredDocuments = completionStatus?.requiredDocuments || getRequiredDocumentsForRole();
  const signedDocuments = completionStatus?.signedDocuments || [];
  const missingDocuments = requiredDocuments.filter(doc => !signedDocuments.includes(doc));

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

      if (onComplete) {
        onComplete(allRequiredSigned);
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
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (completionStatus?.isComplete) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              All required legal agreements have been signed. You can proceed to use the platform.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Legal Agreements
          </CardTitle>
          <CardDescription>
            Please review and accept the following legal agreements to continue using MyAmbulex.
          </CardDescription>
        </CardHeader>
      )}
      
      <CardContent className="space-y-6">
        {requiredDocuments.map((documentType) => {
          const config = documentConfigs[documentType];
          const isAlreadySigned = signedDocuments.includes(documentType);
          const Icon = config.icon;

          return (
            <div key={documentType} className="space-y-3">
              <div className="flex items-start space-x-3">
                <Icon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{config.title}</h3>
                    {isAlreadySigned && (
                      <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                        ✓ Signed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{config.description}</p>
                  
                  {/* Key Points Summary */}
                  {config.keyPoints && config.keyPoints.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Key Points:</h4>
                      <ul className="text-xs text-blue-800 space-y-1">
                        {config.keyPoints.map((point, index) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
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
            <Button 
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Processing...' : 'Sign Agreements'}
            </Button>
            
            {!canSubmit && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                Please check all required agreements before proceeding.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}