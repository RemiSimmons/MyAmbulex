import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ExternalLink, FileText, CheckCircle, Users } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface LegalAgreementsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface AgreementStatus {
  platformAgreement: boolean;
  privacyPolicy: boolean;
  driverAgreement?: boolean; // Optional for drivers only
}

export function LegalAgreementsPopup({ isOpen, onClose, onComplete }: LegalAgreementsPopupProps) {
  const { user, logoutMutation } = useAuth();
  const isDriver = user?.role === 'driver';
  
  const [agreements, setAgreements] = useState<AgreementStatus>({
    platformAgreement: false,
    privacyPolicy: false,
    ...(isDriver && { driverAgreement: false })
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingStatus, setExistingStatus] = useState<AgreementStatus>({
    platformAgreement: false,
    privacyPolicy: false,
    ...(isDriver && { driverAgreement: false })
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadCompletionStatus();
    }
  }, [isOpen]);

  const loadCompletionStatus = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('GET', '/api/legal-agreements/completion-status');
      const result = await response.json();
      
      // Set existing status based on API response
      const status: AgreementStatus = {
        platformAgreement: result.signedDocuments?.includes('terms_of_service') || false,
        privacyPolicy: result.signedDocuments?.includes('privacy_policy') || false,
        ...(isDriver && { 
          driverAgreement: result.signedDocuments?.includes('driver_agreement') || false 
        })
      };
      
      setExistingStatus(status);
      setAgreements(status);
    } catch (error) {
      console.error('Failed to load completion status:', error);
      // Continue with default false values
    } finally {
      setLoading(false);
    }
  };

  const handleAgreementChange = (agreement: keyof AgreementStatus, checked: boolean) => {
    setAgreements(prev => ({
      ...prev,
      [agreement]: checked
    }));
  };

  const openDocument = (documentType: 'platform-user-agreement' | 'privacy-policy' | 'driver-agreement') => {
    const url = `/api/legal/download/${documentType}`;
    window.open(url, '_blank');
  };

  const handleCancel = () => {
    // Simply close the popup without logging out
    console.log("Legal agreements popup cancelled by user");
    onClose();
  };

  const handleSubmit = async () => {
    // Check required agreements based on user role
    const requiredChecks = [
      !agreements.platformAgreement,
      !agreements.privacyPolicy,
      ...(isDriver ? [!agreements.driverAgreement] : [])
    ];

    if (requiredChecks.some(Boolean)) {
      const missingAgreements = isDriver 
        ? "You must agree to all three legal documents: Platform User Agreement, Privacy Policy, and Driver Services Agreement."
        : "You must agree to both the Platform User Agreement and Privacy Policy to continue.";
      
      toast({
        title: "Agreement Required",
        description: missingAgreements,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Sign both agreements
      const signPromises = [];
      
      if (!existingStatus.platformAgreement && agreements.platformAgreement) {
        signPromises.push(
          apiRequest('POST', '/api/legal-agreements/sign', {
            documentType: 'terms_of_service',
            documentVersion: '2025.1',
            signature: `${new Date().toISOString()}_electronic_signature`
          })
        );
      }
      
      if (!existingStatus.privacyPolicy && agreements.privacyPolicy) {
        signPromises.push(
          apiRequest('POST', '/api/legal-agreements/sign', {
            documentType: 'privacy_policy',
            documentVersion: '2025.1',
            signature: `${new Date().toISOString()}_electronic_signature`
          })
        );
      }

      // Add driver agreement for drivers
      if (isDriver && !existingStatus.driverAgreement && agreements.driverAgreement) {
        signPromises.push(
          apiRequest('POST', '/api/legal-agreements/sign', {
            documentType: 'driver_agreement',
            documentVersion: '2025.1',
            signature: `${new Date().toISOString()}_electronic_signature`
          })
        );
      }

      if (signPromises.length > 0) {
        await Promise.all(signPromises);
        
        toast({
          title: "Agreements Signed",
          description: "Your legal agreements have been successfully signed.",
        });
      }

      onComplete?.();
      onClose();
    } catch (error) {
      console.error('Failed to sign agreements:', error);
      toast({
        title: "Error",
        description: "Failed to sign agreements. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const allSigned = existingStatus.platformAgreement && 
                    existingStatus.privacyPolicy && 
                    (!isDriver || existingStatus.driverAgreement);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Legal Agreements
          </DialogTitle>
          <DialogDescription>
            {allSigned 
              ? "You have signed all required legal agreements. You can review them below."
              : "Please review and agree to the following legal documents to use MyAmbulex."
            }
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {allSigned && (
              <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-medium">All legal agreements completed</span>
              </div>
            )}

            {/* Platform User Agreement */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="platform-agreement"
                  checked={agreements.platformAgreement}
                  onCheckedChange={(checked) => 
                    handleAgreementChange('platformAgreement', checked as boolean)
                  }
                  disabled={existingStatus.platformAgreement}
                />
                <div className="grid gap-1.5 leading-none flex-1">
                  <Label
                    htmlFor="platform-agreement"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => openDocument('platform-user-agreement')}
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Platform User Agreement
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    This agreement covers the terms and conditions for using the MyAmbulex platform.
                    {existingStatus.platformAgreement && (
                      <span className="text-green-600 ml-2">✓ Already signed</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy Policy */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="privacy-policy"
                  checked={agreements.privacyPolicy}
                  onCheckedChange={(checked) => 
                    handleAgreementChange('privacyPolicy', checked as boolean)
                  }
                  disabled={existingStatus.privacyPolicy}
                />
                <div className="grid gap-1.5 leading-none flex-1">
                  <Label
                    htmlFor="privacy-policy"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => openDocument('privacy-policy')}
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Privacy Policy
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    This policy explains how we collect, use, and protect your personal information.
                    {existingStatus.privacyPolicy && (
                      <span className="text-green-600 ml-2">✓ Already signed</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Driver Services Agreement - only for drivers */}
            {isDriver && (
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="driver-agreement"
                    checked={agreements.driverAgreement || false}
                    onCheckedChange={(checked) => handleAgreementChange('driverAgreement', checked as boolean)}
                    disabled={existingStatus.driverAgreement}
                  />
                  <div className="grid gap-1.5 leading-none flex-1">
                    <Label
                      htmlFor="driver-agreement"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => openDocument('driver-agreement')}
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Driver Services Agreement
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Additional terms specific to drivers providing transportation services including commercial insurance requirements, background checks, and professional conduct standards.
                      {existingStatus.driverAgreement && (
                        <span className="text-green-600 ml-2">✓ Already signed</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded-lg">
              <strong>Electronic Signature Notice:</strong> By checking the boxes above, you agree to sign these 
              documents electronically. Your electronic signature has the same legal effect as a handwritten signature.
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={allSigned ? onClose : handleCancel}>
            {allSigned ? "Close" : "Cancel"}
          </Button>
          {!allSigned && (
            <Button 
              onClick={handleSubmit} 
              disabled={submitting || !agreements.platformAgreement || !agreements.privacyPolicy || (isDriver && !agreements.driverAgreement)}
            >
              {submitting ? "Signing..." : isDriver ? "Sign All 3 Agreements" : "Sign Agreements"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}