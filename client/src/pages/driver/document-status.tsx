import { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DocumentReupload } from "@/components/driver/document-reupload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  FileCheck, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  RefreshCw,
  FileText,
  Shield
} from "lucide-react";

interface DocumentStatus {
  type: string;
  title: string;
  url?: string;
  verificationStatus: boolean | null;
  rejectionReason?: string;
  required: boolean;
}

export default function DocumentStatusPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch driver details to check document status
  const { data: driverDetails, isLoading, refetch } = useQuery({
    queryKey: ['/api/driver/details'],
    enabled: !!user?.id,
  });

  // Fetch document verification status
  const { data: documentStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/driver/document-status'],
    enabled: !!user?.id,
  });

  const refreshStatus = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchStatus()]);
      toast({
        title: "Status updated",
        description: "Document status has been refreshed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh status",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const documentTypes = [
    {
      type: 'license',
      title: 'Driver License',
      frontField: 'licensePhotoFront',
      backField: 'licensePhotoBack',
      required: true
    },
    {
      type: 'insurance',
      title: 'Insurance Policy',
      field: 'insuranceDocumentUrl',
      required: true
    },
    {
      type: 'vehicle',
      title: 'Vehicle Registration',
      field: 'vehicleRegistrationUrl',
      required: true
    },
    {
      type: 'profile',
      title: 'Profile Photo',
      field: 'profilePhoto',
      required: true
    }
  ];

  const getDocumentStatus = (docType: any) => {
    if (!driverDetails) return { url: null, verificationStatus: null, rejectionReason: null };
    
    console.log(`📋 DOCUMENT STATUS DEBUG for ${docType.type}:`, {
      driverDetailsKeys: Object.keys(driverDetails),
      licenseVerified: driverDetails.licenseVerified,
      licenseVerifiedType: typeof driverDetails.licenseVerified,
      insuranceVerified: driverDetails.insuranceVerified,
      insuranceVerifiedType: typeof driverDetails.insuranceVerified,
      vehicleVerified: driverDetails.vehicleVerified,
      profileVerified: driverDetails.profileVerified
    });
    
    switch (docType.type) {
      case 'license':
        const licenseStatus = {
          url: driverDetails.licensePhotoFront && driverDetails.licensePhotoBack 
            ? driverDetails.licensePhotoFront 
            : null,
          verificationStatus: driverDetails.licenseVerified, // Keep actual value: true/false/null
          rejectionReason: driverDetails.licenseRejectionReason
        };
        console.log(`📋 LICENSE STATUS:`, licenseStatus);
        return licenseStatus;
      case 'insurance':
        const insuranceStatus = {
          url: driverDetails.insuranceDocumentUrl,
          verificationStatus: driverDetails.insuranceVerified, // Keep actual value: true/false/null
          rejectionReason: driverDetails.insuranceRejectionReason
        };
        console.log(`📋 INSURANCE STATUS:`, insuranceStatus);
        return insuranceStatus;
      case 'vehicle':
        const vehicleStatus = {
          url: driverDetails.vehicleRegistrationUrl,
          verificationStatus: driverDetails.vehicleVerified, // Keep actual value: true/false/null
          rejectionReason: driverDetails.vehicleRejectionReason
        };
        console.log(`📋 VEHICLE STATUS:`, vehicleStatus);
        return vehicleStatus;
      case 'profile':
        const profileStatus = {
          url: driverDetails.profilePhoto,
          verificationStatus: driverDetails.profileVerified, // Keep actual value: true/false/null
          rejectionReason: driverDetails.profileRejectionReason
        };
        console.log(`📋 PROFILE STATUS:`, profileStatus);
        return profileStatus;
      default:
        return { url: null, verificationStatus: null, rejectionReason: null };
    }
  };

  const calculateProgress = () => {
    const totalDocs = documentTypes.length;
    const uploadedDocs = documentTypes.filter(doc => {
      const status = getDocumentStatus(doc);
      return status.url !== null;
    }).length;
    const verifiedDocs = documentTypes.filter(doc => {
      const status = getDocumentStatus(doc);
      return status.verificationStatus === true;
    }).length;
    
    return {
      uploaded: (uploadedDocs / totalDocs) * 100,
      verified: (verifiedDocs / totalDocs) * 100,
      uploadedCount: uploadedDocs,
      verifiedCount: verifiedDocs,
      totalCount: totalDocs
    };
  };

  const getOverallStatus = () => {
    const progress = calculateProgress();
    
    if (progress.verifiedCount === progress.totalCount) {
      return { status: 'verified', message: 'All documents verified', color: 'green' };
    }
    
    const hasRejected = documentTypes.some(doc => {
      const status = getDocumentStatus(doc);
      return status.verificationStatus === false;
    });
    
    if (hasRejected) {
      return { status: 'rejected', message: 'Some documents need attention', color: 'red' };
    }
    
    if (progress.uploadedCount === progress.totalCount) {
      return { status: 'review', message: 'Under review', color: 'yellow' };
    }
    
    return { status: 'incomplete', message: 'Upload required', color: 'gray' };
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading document status...</span>
          </div>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();
  const overallStatus = getOverallStatus();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Document Verification</h1>
            <p className="text-muted-foreground mt-2">
              Upload and manage your driver verification documents
            </p>
          </div>
          <Button
            variant="outline"
            onClick={refreshStatus}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>
      </div>

      {/* Overall Status Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Verification Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <Badge 
                variant={overallStatus.color === 'green' ? 'default' : 'secondary'}
                className={
                  overallStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                  overallStatus.color === 'red' ? 'bg-red-100 text-red-800' :
                  overallStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }
              >
                {overallStatus.message}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Documents Uploaded</span>
                <span>{progress.uploadedCount}/{progress.totalCount}</span>
              </div>
              <Progress value={progress.uploaded} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Documents Verified</span>
                <span>{progress.verifiedCount}/{progress.totalCount}</span>
              </div>
              <Progress value={progress.verified} className="h-2" />
            </div>

            {overallStatus.status === 'verified' && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Congratulations! All your documents have been verified. You can now start accepting rides.
                </AlertDescription>
              </Alert>
            )}

            {overallStatus.status === 'rejected' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Some documents have been rejected. Please review the feedback below and re-upload the required documents.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Document Upload Cards */}
      <div className="space-y-6">
        {documentTypes.map((docType) => {
          const status = getDocumentStatus(docType);
          
          return (
            <DocumentReupload
              key={docType.type}
              documentType={docType.type}
              documentTitle={docType.title}
              currentUrl={status.url}
              isRejected={status.verificationStatus === false && status.url !== null}
              rejectionReason={status.rejectionReason}
              isVerified={status.verificationStatus === true}
              onUploadSuccess={() => {
                refetch();
                refetchStatus();
              }}
            />
          );
        })}
      </div>

      {/* Additional Information */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Important Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Required Documents:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Valid driver's license (front & back)</li>
                <li>• Current insurance policy</li>
                <li>• Vehicle registration</li>
                <li>• Professional profile photo</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Document Guidelines:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Clear, well-lit photos or scans</li>
                <li>• All text must be readable</li>
                <li>• Documents must be current/valid</li>
                <li>• Maximum file size: 10MB</li>
              </ul>
            </div>
          </div>
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Need help?</strong> Contact our support team if you have questions about the verification process 
              or encounter any issues uploading your documents.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}