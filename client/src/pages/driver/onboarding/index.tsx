import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn } from "@/lib/queryClient";

// Components
import VerificationSection from "./verification-section";
import TrainingModules from "./training-modules";
import EarningsCalculator from "./earnings-calculator";

// UI Components
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Icons
import {
  FileCheck,
  BookOpen,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";

const DriverOnboarding = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("verification");
  
  // Fetch registration progress
  const { 
    data: registrationProgress,
    isLoading,
    refetch 
  } = useQuery({
    queryKey: ["/api/registration-progress"],
    queryFn: getQueryFn(),
  });
  
  // Fetch driver status
  const { data: driverStatus } = useQuery({
    queryKey: ["/api/driver/status"],
    queryFn: getQueryFn(),
  });
  
  // Calculate overall progress
  const calculateOverallProgress = () => {
    if (!registrationProgress) return 0;
    
    const weights = {
      verification: 0.5, // 50% weight for verification
      training: 0.3,     // 30% weight for training
      calculator: 0.2    // 20% weight for calculator (just visiting counts)
    };
    
    // Calculate verification progress (based on document uploads)
    const totalDocuments = 4; // License, insurance, registration, background check
    const formData = registrationProgress.formData || {};
    const uploadedDocuments = [
      formData.licenseUploaded,
      formData.insuranceUploaded,
      formData.vehicleRegistrationUploaded,
      formData.backgroundCheckSubmitted,
    ].filter(Boolean).length;
    const verificationProgress = uploadedDocuments / totalDocuments;
    
    // Calculate training progress
    const totalModules = 4; // As defined in the training modules component
    const completedModules = formData.trainingModulesCompleted || 0;
    const trainingProgress = completedModules / totalModules;
    
    // Calculator is binary - either visited or not
    const calculatorProgress = formData[activeTab === "calculator" ? "calculatorVisited" : ""] ? 1 : 0;
    
    // Calculate weighted progress
    const weightedProgress = 
      (verificationProgress * weights.verification) + 
      (trainingProgress * weights.training) + 
      (calculatorProgress * weights.calculator);
    
    return Math.min(Math.round(weightedProgress * 100), 100);
  };
  
  // Update tab tracking in registration progress
  useEffect(() => {
    if (activeTab === "calculator" && registrationProgress && !registrationProgress.formData?.calculatorVisited) {
      // This would be handled by a mutation in a real app
      console.log("User visited calculator tab");
      // For now, we'll just refetch to keep the UI consistent
      setTimeout(() => refetch(), 1000);
    }
  }, [activeTab, registrationProgress, refetch]);
  
  // Force refresh function for child components
  const forceRefresh = () => {
    refetch();
  };
  
  return (
    <div className="container max-w-7xl py-6 space-y-8">
      <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Driver Onboarding</h1>
          <p className="text-muted-foreground">
            Complete the required steps to become a certified MyAmbulex driver
          </p>
        </div>
        
        {driverStatus?.isVerified ? (
          <Alert className="sm:w-auto w-full">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>Verified Driver</AlertTitle>
            <AlertDescription>
              Your account has been verified and you can now accept rides.
            </AlertDescription>
          </Alert>
        ) : driverStatus?.application?.status === "active" ? (
          <Alert className="sm:w-auto w-full">
            <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
            <AlertTitle>Verification in Progress</AlertTitle>
            <AlertDescription>
              Your application is being reviewed. We'll notify you once approved.
            </AlertDescription>
          </Alert>
        ) : (
          <Button
            disabled={calculateOverallProgress() < 100}
            className="sm:w-auto w-full"
          >
            {calculateOverallProgress() >= 100 ? (
              <>
                Submit for Verification 
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Complete all steps
                <HelpCircle className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle>Onboarding Progress</CardTitle>
            <div className="text-sm font-medium">
              {isLoading ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                <span>{calculateOverallProgress()}% Complete</span>
              )}
            </div>
          </div>
          <Progress value={calculateOverallProgress()} className="h-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                activeTab === "verification" 
                  ? "border-primary bg-primary/5" 
                  : "hover:border-primary/50"
              }`}
              onClick={() => setActiveTab("verification")}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    <FileCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Document Verification</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload your documents for verification
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-xs font-medium">
                  1
                </div>
              </div>
            </div>
            
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                activeTab === "training" 
                  ? "border-primary bg-primary/5" 
                  : "hover:border-primary/50"
              }`}
              onClick={() => setActiveTab("training")}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Training Modules</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete required training courses
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-xs font-medium">
                  2
                </div>
              </div>
            </div>
            
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                activeTab === "calculator" 
                  ? "border-primary bg-primary/5" 
                  : "hover:border-primary/50"
              }`}
              onClick={() => setActiveTab("calculator")}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Earnings Calculator</h3>
                    <p className="text-sm text-muted-foreground">
                      Estimate your potential income
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-xs font-medium">
                  3
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Separator className="my-8" />
      
      {/* Tab content */}
      <div className="mt-8">
        {activeTab === "verification" && (
          <VerificationSection 
            registrationProgress={registrationProgress}
            forceRefresh={forceRefresh}
          />
        )}
        
        {activeTab === "training" && (
          <TrainingModules 
            registrationProgress={registrationProgress}
            forceRefresh={forceRefresh}
          />
        )}
        
        {activeTab === "calculator" && (
          <EarningsCalculator />
        )}
      </div>
      
      {/* Navigation controls */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={() => {
            if (activeTab === "training") setActiveTab("verification");
            if (activeTab === "calculator") setActiveTab("training");
          }}
          disabled={activeTab === "verification"}
        >
          Previous Step
        </Button>
        
        <Button
          onClick={() => {
            if (activeTab === "verification") setActiveTab("training");
            if (activeTab === "training") setActiveTab("calculator");
          }}
          disabled={activeTab === "calculator"}
        >
          Next Step <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      
      {/* Application status card */}
      {driverStatus && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Application Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                  <span>Account Status</span>
                </div>
                <div className="flex items-center space-x-2">
                  {driverStatus.application?.status === "active" ? (
                    <>
                      <span className="font-medium text-green-600">Active</span>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </>
                  ) : driverStatus.application?.status === "pending" ? (
                    <>
                      <span className="font-medium text-yellow-600">Pending</span>
                      <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-red-600">Incomplete</span>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileCheck className="h-5 w-5 text-muted-foreground" />
                  <span>Background Check</span>
                </div>
                <div className="flex items-center space-x-2">
                  {driverStatus.application?.backgroundCheckStatus === "approved" ? (
                    <>
                      <span className="font-medium text-green-600">Approved</span>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </>
                  ) : driverStatus.application?.backgroundCheckStatus === "pending" ? (
                    <>
                      <span className="font-medium text-yellow-600">In Progress</span>
                      <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-red-600">Not Started</span>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <span>Training Completed</span>
                </div>
                <div className="flex items-center space-x-2">
                  {registrationProgress?.trainingModulesCompleted === 4 ? (
                    <>
                      <span className="font-medium text-green-600">Complete</span>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-yellow-600">
                        {registrationProgress?.trainingModulesCompleted || 0}/4 Modules
                      </span>
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DriverOnboarding;