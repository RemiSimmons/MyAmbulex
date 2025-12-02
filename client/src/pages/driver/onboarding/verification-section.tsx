import React, { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { uploadDocument } from "@/services/document-upload-service";
import { validateDocumentFile } from "@/shared/document-validation";
import { useToast } from "@/hooks/use-toast";
import { DriverRegistrationProgress, DriverDetails } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Icons
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from "lucide-react";

interface VerificationSectionProps {
  registrationProgress: DriverRegistrationProgress;
  driverDetails?: DriverDetails;
  forceRefresh: () => void;
}

const VerificationSection: React.FC<VerificationSectionProps> = ({
  registrationProgress,
  driverDetails,
  forceRefresh
}) => {
  const { toast } = useToast();
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  
  // Refs for file inputs
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const insuranceInputRef = useRef<HTMLInputElement>(null);
  const registrationInputRef = useRef<HTMLInputElement>(null);
  const backgroundCheckInputRef = useRef<HTMLInputElement>(null);
  const drugTestInputRef = useRef<HTMLInputElement>(null);
  const mvrRecordInputRef = useRef<HTMLInputElement>(null);
  const firstAidInputRef = useRef<HTMLInputElement>(null);
  const cprInputRef = useRef<HTMLInputElement>(null);
  
  // Document upload mutation using unified upload service
  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      const result = await uploadDocument(file, type, {
        validateBeforeUpload: true
      });
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      return result;
    },
    onSuccess: (result) => {
      toast({
        title: "Document uploaded",
        description: result.message || "Your document has been successfully uploaded",
      });
      setUploadingType(null);
      
      // Use a gentler refresh approach to avoid request aborts
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/driver/documents"] });
        queryClient.invalidateQueries({ queryKey: ["/api/driver/details"] });
        forceRefresh();
      }, 100);
    },
    onError: (error: any) => {
      // Don't show errors for aborted requests - these are usually from navigation/refresh
      if (error.message?.includes('abort') || error.message?.includes('cancelled') || error.name === 'AbortError') {
        console.log('Upload request was aborted, not showing error to user:', error.message);
        setUploadingType(null);
        return;
      }
      
      console.error('Upload error:', error);
      
      toast({
        title: "Upload failed", 
        description: error.message || "An error occurred during the upload",
        variant: "destructive",
      });
      setUploadingType(null);
    },
  });
  
  // File select handler with validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file before upload
    const validation = validateDocumentFile(file, type);
    if (!validation.valid) {
      toast({
        title: "Invalid file",
        description: validation.errors[0] || "File does not meet requirements",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    
    // Show warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      toast({
        title: "File warning",
        description: validation.warnings[0],
        variant: "default",
      });
    }
    
    // Set uploading state
    setUploadingType(type);
    
    // Start upload
    uploadDocumentMutation.mutate({ file, type });
    
    // Clear input
    e.target.value = "";
  };
  
  // Helper to trigger file input
  const triggerFileInput = (inputRef: React.RefObject<HTMLInputElement>) => {
    inputRef.current?.click();
  };

  // Helper function to get verification display info
  const getVerificationDisplay = (verified: boolean | null, rejectionReason?: string | null) => {
    if (verified === true) {
      return {
        bgColor: 'bg-green-50 border-green-200',
        icon: <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />,
        titleColor: 'text-green-700',
        title: 'Approved',
        descColor: 'text-green-600',
        description: 'Document verified and approved',
        buttonColor: 'text-green-600 border-green-200 hover:bg-green-50'
      };
    } else if (verified === false) {
      return {
        bgColor: 'bg-red-50 border-red-200',
        icon: <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />,
        titleColor: 'text-red-700',
        title: 'Rejected',
        descColor: 'text-red-600',
        description: 'Document rejected - needs attention',
        buttonColor: 'text-red-600 border-red-200 hover:bg-red-50'
      };
    } else {
      return {
        bgColor: 'bg-yellow-50 border-yellow-200',
        icon: <FileText className="h-5 w-5 text-yellow-500 mt-0.5" />,
        titleColor: 'text-yellow-700',
        title: 'Under Review',
        descColor: 'text-yellow-600',
        description: 'Waiting for admin review',
        buttonColor: 'text-blue-600 border-blue-200 hover:bg-blue-50'
      };
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Document Verification</h3>
        </div>
        <p className="text-muted-foreground">
          Upload the required documents for verification. Our team will review and approve your submissions.
        </p>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Driver's License */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span>Driver's License</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Upload a clear photo of your valid driver's license (front and back).</p>
              </div>
              
              <input
                type="file"
                ref={licenseInputRef}
                onChange={(e) => handleFileSelect(e, "driverLicense")}
                className="hidden"
                accept="image/jpeg,image/png,application/pdf"
              />
              
              {driverDetails?.licensePhotoFront ? (
                (() => {
                  const display = getVerificationDisplay(driverDetails.licenseVerified, driverDetails.licenseRejectionReason);
                  return (
                    <div className={`border rounded-md p-4 ${display.bgColor}`}>
                      <div className="flex items-start space-x-3">
                        {display.icon}
                        <div className="space-y-1">
                          <p className={`font-medium ${display.titleColor}`}>
                            {display.title}
                          </p>
                          <p className={`text-sm ${display.descColor}`}>
                            {display.description}
                          </p>
                          {driverDetails.licenseVerified === false && driverDetails.licenseRejectionReason && (
                            <p className="text-sm text-red-600 mt-1 font-medium">
                              Reason: {driverDetails.licenseRejectionReason}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className={display.buttonColor}
                              onClick={() => triggerFileInput(licenseInputRef)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Replace
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => triggerFileInput(licenseInputRef)}
                  disabled={uploadingType === "driverLicense"}
                >
                  {uploadingType === "driverLicense" ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin">
                        <Upload className="h-5 w-5" />
                      </div>
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className="h-5 w-5" />
                      <span>Upload License</span>
                    </div>
                  )}
                </Button>
              )}
              
              <div className="text-xs text-muted-foreground">
                <p>Accepted formats: JPG, PNG, PDF. Max size: 5MB.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insurance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span>Insurance Policy</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Upload your current auto insurance policy document.</p>
              </div>
              
              <input
                type="file"
                ref={insuranceInputRef}
                onChange={(e) => handleFileSelect(e, "insurance")}
                className="hidden"
                accept="image/jpeg,image/png,application/pdf"
              />
              
              {driverDetails?.insuranceDocumentUrl ? (
                (() => {
                  const display = getVerificationDisplay(driverDetails.insuranceVerified, driverDetails.insuranceRejectionReason);
                  return (
                    <div className={`border rounded-md p-4 ${display.bgColor}`}>
                      <div className="flex items-start space-x-3">
                        {display.icon}
                        <div className="space-y-1">
                          <p className={`font-medium ${display.titleColor}`}>
                            {display.title}
                          </p>
                          <p className={`text-sm ${display.descColor}`}>
                            {display.description}
                          </p>
                          {driverDetails.insuranceVerified === false && driverDetails.insuranceRejectionReason && (
                            <p className="text-sm text-red-600 mt-1 font-medium">
                              Reason: {driverDetails.insuranceRejectionReason}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className={display.buttonColor}
                              onClick={() => triggerFileInput(insuranceInputRef)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Replace
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => triggerFileInput(insuranceInputRef)}
                  disabled={uploadingType === "insurance"}
                >
                  {uploadingType === "insurance" ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin">
                        <Upload className="h-5 w-5" />
                      </div>
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className="h-5 w-5" />
                      <span>Upload Insurance</span>
                    </div>
                  )}
                </Button>
              )}
              
              <div className="text-xs text-muted-foreground">
                <p>Accepted formats: JPG, PNG, PDF. Max size: 5MB.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Registration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span>Vehicle Registration</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Upload your current vehicle registration document.</p>
              </div>
              
              <input
                type="file"
                ref={registrationInputRef}
                onChange={(e) => handleFileSelect(e, "vehicleRegistration")}
                className="hidden"
                accept="image/jpeg,image/png,application/pdf"
              />
              
              {driverDetails?.vehicleRegistrationUrl ? (
                (() => {
                  const display = getVerificationDisplay(driverDetails.vehicleVerified, driverDetails.vehicleRejectionReason);
                  return (
                    <div className={`border rounded-md p-4 ${display.bgColor}`}>
                      <div className="flex items-start space-x-3">
                        {display.icon}
                        <div className="space-y-1">
                          <p className={`font-medium ${display.titleColor}`}>
                            {display.title}
                          </p>
                          <p className={`text-sm ${display.descColor}`}>
                            {display.description}
                          </p>
                          {driverDetails.vehicleVerified === false && driverDetails.vehicleRejectionReason && (
                            <p className="text-sm text-red-600 mt-1 font-medium">
                              Reason: {driverDetails.vehicleRejectionReason}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className={display.buttonColor}
                              onClick={() => triggerFileInput(registrationInputRef)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Replace
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => triggerFileInput(registrationInputRef)}
                  disabled={uploadingType === "vehicleRegistration"}
                >
                  {uploadingType === "vehicleRegistration" ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin">
                        <Upload className="h-5 w-5" />
                      </div>
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className="h-5 w-5" />
                      <span>Upload Registration</span>
                    </div>
                  )}
                </Button>
              )}
              
              <div className="text-xs text-muted-foreground">
                <p>Accepted formats: JPG, PNG, PDF. Max size: 5MB.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Background Check */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span>Background Check</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Upload your background check report (must be dated within the last 90 days).</p>
              </div>
              
              <input
                type="file"
                ref={backgroundCheckInputRef}
                onChange={(e) => handleFileSelect(e, "backgroundCheck")}
                className="hidden"
                accept="image/jpeg,image/png,application/pdf"
              />
              
              {driverDetails?.backgroundCheckDocumentUrl ? (
                (() => {
                  const display = getVerificationDisplay(driverDetails.backgroundCheckVerified, driverDetails.backgroundCheckRejectionReason);
                  return (
                    <div className={`border rounded-md p-4 ${display.bgColor}`}>
                      <div className="flex items-start space-x-3">
                        {display.icon}
                        <div className="space-y-1">
                          <p className={`font-medium ${display.titleColor}`}>
                            {display.title}
                          </p>
                          <p className={`text-sm ${display.descColor}`}>
                            {display.description}
                          </p>
                          {driverDetails.backgroundCheckVerified === false && driverDetails.backgroundCheckRejectionReason && (
                            <p className="text-sm text-red-600 mt-1 font-medium">
                              Reason: {driverDetails.backgroundCheckRejectionReason}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className={display.buttonColor}
                              onClick={() => triggerFileInput(backgroundCheckInputRef)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Replace
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => triggerFileInput(backgroundCheckInputRef)}
                  disabled={uploadingType === "backgroundCheck"}
                >
                  {uploadingType === "backgroundCheck" ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin">
                        <Upload className="h-5 w-5" />
                      </div>
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className="h-5 w-5" />
                      <span>Upload Background Check</span>
                    </div>
                  )}
                </Button>
              )}
              
              <div className="text-xs text-muted-foreground">
                <p>Accepted formats: JPG, PNG, PDF. Max size: 5MB.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Drug Test */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span>Drug Test Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Upload your drug test results from an approved testing facility.</p>
              </div>
              
              <input
                type="file"
                ref={drugTestInputRef}
                onChange={(e) => handleFileSelect(e, "drugTest")}
                className="hidden"
                accept="image/jpeg,image/png,application/pdf"
              />
              
              {driverDetails?.drugTestDocumentUrl ? (
                (() => {
                  const display = getVerificationDisplay(driverDetails.drugTestVerified, driverDetails.drugTestRejectionReason);
                  return (
                    <div className={`border rounded-md p-4 ${display.bgColor}`}>
                      <div className="flex items-start space-x-3">
                        {display.icon}
                        <div className="space-y-1">
                          <p className={`font-medium ${display.titleColor}`}>
                            {display.title}
                          </p>
                          <p className={`text-sm ${display.descColor}`}>
                            {display.description}
                          </p>
                          {driverDetails.drugTestVerified === false && driverDetails.drugTestRejectionReason && (
                            <p className="text-sm text-red-600 mt-1 font-medium">
                              Reason: {driverDetails.drugTestRejectionReason}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className={display.buttonColor}
                              onClick={() => triggerFileInput(drugTestInputRef)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Replace
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => triggerFileInput(drugTestInputRef)}
                  disabled={uploadingType === "drugTest"}
                >
                  {uploadingType === "drugTest" ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin">
                        <Upload className="h-5 w-5" />
                      </div>
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className="h-5 w-5" />
                      <span>Upload Drug Test</span>
                    </div>
                  )}
                </Button>
              )}
              
              <div className="text-xs text-muted-foreground">
                <p>Accepted formats: JPG, PNG, PDF. Max size: 5MB.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MVR Record */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span>MVR Record</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Upload your Motor Vehicle Record from the DMV (must be dated within the last 30 days).</p>
              </div>
              
              <input
                type="file"
                ref={mvrRecordInputRef}
                onChange={(e) => handleFileSelect(e, "mvrRecord")}
                className="hidden"
                accept="image/jpeg,image/png,application/pdf"
              />
              
              {driverDetails?.mvrRecordUrl ? (
                (() => {
                  const display = getVerificationDisplay(driverDetails.mvrRecordVerified, driverDetails.mvrRecordRejectionReason);
                  return (
                    <div className={`border rounded-md p-4 ${display.bgColor}`}>
                      <div className="flex items-start space-x-3">
                        {display.icon}
                        <div className="space-y-1">
                          <p className={`font-medium ${display.titleColor}`}>
                            {display.title}
                          </p>
                          <p className={`text-sm ${display.descColor}`}>
                            {display.description}
                          </p>
                          {driverDetails.mvrRecordVerified === false && driverDetails.mvrRecordRejectionReason && (
                            <p className="text-sm text-red-600 mt-1 font-medium">
                              Reason: {driverDetails.mvrRecordRejectionReason}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className={display.buttonColor}
                              onClick={() => triggerFileInput(mvrRecordInputRef)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Replace
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => triggerFileInput(mvrRecordInputRef)}
                  disabled={uploadingType === "mvrRecord"}
                >
                  {uploadingType === "mvrRecord" ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin">
                        <Upload className="h-5 w-5" />
                      </div>
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className="h-5 w-5" />
                      <span>Upload MVR Record</span>
                    </div>
                  )}
                </Button>
              )}
              
              <div className="text-xs text-muted-foreground">
                <p>Accepted formats: JPG, PNG, PDF. Max size: 5MB.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Separator className="my-6" />
      
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>All documents are required for driver verification</AlertTitle>
        <AlertDescription>
          You must upload: Driver's License, Insurance Policy, Vehicle Registration, Background Check, Drug Test Results, and MVR Record. 
          All documents must be valid and up-to-date. Our team will review your submission and may contact you if additional information is needed.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default VerificationSection;