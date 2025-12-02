import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { FileUpload } from "@/components/ui/file-upload";
import { Loader2, CheckCircle, AlertCircle, Save, Upload } from "lucide-react";
import Footer from "@/components/layout/simple-footer";
import { uploadDocument, getDocumentTypeFromField } from "@/utils/document-upload";

// Create schema for driver details
const driverDetailsSchema = z.object({
  // License information
  licenseNumber: z.string().min(1, "License number is required"),
  licenseState: z.string().min(1, "State is required"),
  licenseExpiry: z.date({
    required_error: "Expiry date is required",
  }),
  licenseClass: z.string().optional(),
  licensePhotoFront: z.string().optional(),
  licensePhotoBack: z.string().optional(),
  
  // Insurance information
  insuranceProvider: z.string().min(1, "Insurance provider is required"),
  insuranceNumber: z.string().min(1, "Insurance number is required"),
  insuranceExpiry: z.date({
    required_error: "Expiry date is required",
  }),
  insuranceDocumentUrl: z.string().optional(),
  
  // Professional qualifications
  yearsOfExperience: z.string().refine(
    (val) => !isNaN(Number(val)),
    { message: "Years of experience must be a number" }
  ),
  medicalTrainingLevel: z.enum(["none", "first_aid", "cpr_certified", "emt_basic", "emt_advanced", "paramedic"], {
    required_error: "Medical training level is required",
  }),
  certifications: z.array(z.string()).optional(),
  certificationDocuments: z.array(z.string()).optional(),
  
  // Work preferences
  serviceArea: z.array(z.string()).min(1, "At least one service area is required"),
  serviceHours: z.object({
    weekdays: z.boolean().optional(),
    weeknights: z.boolean().optional(),
    weekends: z.boolean().optional(),
    overnight: z.boolean().optional(),
    allHours: z.boolean().optional(),
  }),
  preferredVehicleTypes: z.array(z.enum(["standard", "wheelchair", "stretcher"])),
  maxTravelDistance: z.string().refine(
    (val) => !isNaN(Number(val)),
    { message: "Max travel distance must be a number" }
  ),
  
  // Biography and profile
  biography: z.string().max(500, "Biography cannot exceed 500 characters").optional(),
  profilePhoto: z.string().optional(), // Add profilePhoto field to match the schema
  languages: z.array(z.string()).min(1, "At least one language is required"),
  
  // Verification status (added automatically in the mutation)
  verificationStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  
  // Terms acceptance
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions",
  }),
});

type DriverDetailsFormValues = z.infer<typeof driverDetailsSchema>;

// Vehicle schema
const vehicleSchema = z.object({
  vehicleType: z.enum(["standard", "wheelchair", "stretcher"]),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 1990 && Number(val) <= new Date().getFullYear(),
    { message: "Please enter a valid year (1990 - present)" }
  ),
  licensePlate: z.string().min(1, "License plate is required"),
  color: z.string().min(1, "Color is required"),
  capacity: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    { message: "Capacity must be a positive number" }
  ),
  wheelchairCapacity: z.string().optional(),
  stretcherCapacity: z.string().optional(),
  hasRamp: z.boolean().optional(),
  hasLift: z.boolean().optional(),
  photo: z.string().optional(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

const MEDICAL_TRAINING_OPTIONS = [
  { value: "none", label: "None" },
  { value: "first_aid", label: "First Aid" },
  { value: "cpr_certified", label: "CPR Certified" },
  { value: "emt_basic", label: "EMT Basic" },
  { value: "emt_advanced", label: "EMT Advanced" },
  { value: "paramedic", label: "Paramedic" }
];

const STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", 
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const SERVICE_AREAS = [
  "Atlanta Metro", "Fulton County", "DeKalb County", "Cobb County", 
  "Gwinnett County", "Clayton County", "Henry County", "Fayette County", 
  "Rockdale County", "Douglas County", "Cherokee County", "Forsyth County"
];

const LANGUAGES = [
  "English", "Spanish", "French", "Chinese", "Vietnamese", 
  "Korean", "Arabic", "Portuguese", "Russian", "Other"
];

export default function DriverRegistration() {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState<DriverDetailsFormValues | null>(null);
  const [vehicleData, setVehicleData] = useState<VehicleFormValues | null>(null);
  
  // Document upload state
  const [uploadedDocuments, setUploadedDocuments] = useState<{[key: string]: any}>({});
  const [uploadingDocuments, setUploadingDocuments] = useState<{[key: string]: boolean}>({});
  const [isRegistrationComplete, setIsRegistrationComplete] = useState<boolean>(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState<boolean>(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  
  // Redirect if user is not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access the driver registration form",
        variant: "destructive"
      });
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation, toast]);
  
  // Document upload function
  const uploadDocument = async (file: File, documentType: string) => {
    if (!file) return null;
    
    setUploadingDocuments(prev => ({ ...prev, [documentType]: true }));
    
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', documentType);
      
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await response.json();
      
      setUploadedDocuments(prev => ({ 
        ...prev, 
        [documentType]: result 
      }));
      
      toast({
        title: "Document uploaded successfully",
        description: `${documentType} has been uploaded and is pending review.`,
      });
      
      return result;
      
    } catch (error) {
      console.error('Document upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setUploadingDocuments(prev => ({ ...prev, [documentType]: false }));
    }
  };
  
  // Add query to check for existing registration progress
  const registrationProgressQuery = useQuery({
    queryKey: ['/api/registration-progress'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/registration-progress');
        if (res.status === 404) {
          return null; // No saved progress
        }
        if (!res.ok) {
          throw new Error('Failed to load registration progress');
        }
        return await res.json();
      } catch (error) {
        console.error('Error loading registration progress:', error);
        return null;
      } finally {
        setIsLoadingProgress(false);
      }
    }
  });
  
  // Add mutation for saving progress
  const saveProgressMutation = useMutation({
    mutationFn: async (data: { 
      step: number; 
      formData?: DriverDetailsFormValues; 
      vehicleData?: VehicleFormValues 
    }) => {
      const res = await apiRequest('POST', '/api/registration-progress', data);
      if (!res.ok) {
        throw new Error('Failed to save progress');
      }
      return await res.json();
    },
    onSuccess: () => {
      // Optional: Show toast that progress was saved
      toast({
        title: "Progress saved",
        description: "Your registration progress has been saved"
      });
    },
    onError: (error) => {
      console.error('Error saving progress:', error);
      toast({
        title: "Failed to save progress",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Set up forms for each step
  const driverDetailsForm = useForm<DriverDetailsFormValues>({
    resolver: zodResolver(driverDetailsSchema),
    defaultValues: {
      // Required license fields
      licenseNumber: "",
      licenseState: "",
      licenseExpiry: undefined,
      licenseClass: "",
      licensePhotoFront: "",
      licensePhotoBack: "",
      
      // Required insurance fields
      insuranceProvider: "",
      insuranceNumber: "",
      insuranceExpiry: undefined,
      insuranceDocumentUrl: "",
      
      // Optional professional fields
      yearsOfExperience: "",
      medicalTrainingLevel: "none",
      certifications: [],
      certificationDocuments: [],
      
      // Service configuration
      serviceArea: [],
      serviceHours: {
        weekdays: true,
        weeknights: false,
        weekends: false,
        overnight: false,
        allHours: false,
      },
      preferredVehicleTypes: ["standard"],
      maxTravelDistance: "",
      biography: "",
      profilePhoto: "",
      languages: ["English"],
      acceptTerms: false,
    }
  });
  
  const vehicleForm = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vehicleType: "standard",
      make: "",
      model: "",
      year: "",
      licensePlate: "",
      color: "",
      capacity: "",
      wheelchairCapacity: "0",
      stretcherCapacity: "0",
      hasRamp: false,
      hasLift: false,
      photo: "",
    }
  });
  
  // Mutation for submitting driver details
  const driverDetailsMutation = useMutation({
    mutationFn: async (data: DriverDetailsFormValues) => {
      // Convert string values and dates to appropriate types before submission
      // We need to create a cleaned copy that doesn't include fields not in the database schema
      // Extract only fields that exist in our schema
      const {
        licenseNumber,
        licenseState,
        licenseExpiry,
        licenseClass,
        licensePhotoFront,
        licensePhotoBack,
        insuranceProvider,
        insuranceNumber,
        insuranceExpiry,
        insuranceDocumentUrl,
        yearsOfExperience,
        medicalTrainingLevel,
        certifications,
        certificationDocuments,
        serviceArea,
        serviceHours,
        preferredVehicleTypes,
        maxTravelDistance,
        biography,
        profilePhoto,
        languages,
        acceptTerms
      } = data;
      
      // Create a clean object with only the fields that exist in the schema
      // IMPORTANT: Only include fields that are actually in the database schema
      const formattedData = {
        licenseNumber,
        licenseState,
        licenseExpiry: licenseExpiry ? licenseExpiry.toISOString() : null,
        licenseClass,
        licensePhotoFront,
        licensePhotoBack,
        insuranceProvider,
        insuranceNumber,
        insuranceExpiry: insuranceExpiry ? insuranceExpiry.toISOString() : null,
        insuranceDocumentUrl,
        yearsOfExperience: Number(yearsOfExperience),
        medicalTrainingLevel,
        certifications,
        certificationDocuments,
        serviceArea,
        serviceHours,
        preferredVehicleTypes,
        maxTravelDistance: Number(maxTravelDistance),
        biography,
        profilePhoto: profilePhoto || "", 
        languages,
        // Add required fields from schema - make sure they match schema definition exactly
        backgroundCheckStatus: "pending",
        verified: false,
        accountStatus: "pending"
      };
      
      console.log("Submitting driver details:", JSON.stringify(formattedData, null, 2));
      console.log("Date values:", {
        licenseExpiry: formattedData.licenseExpiry,
        insuranceExpiry: formattedData.insuranceExpiry
      });
      
      const response = await apiRequest("POST", "/api/driver-details", formattedData);
      if (!response.ok) {
        const error = await response.json();
        console.error("API error response:", error);
        throw new Error(error.message || "Failed to save driver details");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      // First reset the isSubmitting flag
      setIsSubmitting(false);
      
      // Update the step to show the vehicle form
      setStep(3);
      
      console.log("Successfully saved driver details, moving to step 3", data);
      
      toast({
        title: "Driver details saved!",
        description: "Now let's add your vehicle information",
      });
    },
    onError: (error) => {
      console.error("Driver details submission error:", error);
      toast({
        title: "Failed to save driver details",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  });
  
  // Mutation for submitting vehicle details
  const vehicleMutation = useMutation({
    mutationFn: async (data: VehicleFormValues) => {
      // Extract only the fields that exist in the schema to prevent database errors
      const {
        vehicleType,
        make,
        model,
        year,
        licensePlate,
        color,
        capacity,
        wheelchairCapacity,
        stretcherCapacity,
        hasRamp,
        hasLift,
        photo
      } = data;
      
      // Create a clean object with only the fields that exist in the schema
      const formattedData = {
        vehicleType,
        make,
        model,
        year: Number(year),
        licensePlate,
        color,
        capacity: Number(capacity),
        wheelchairCapacity: wheelchairCapacity ? Number(wheelchairCapacity) : 0,
        stretcherCapacity: stretcherCapacity ? Number(stretcherCapacity) : 0,
        hasRamp,
        hasLift,
        photo
      };
      
      console.log("Submitting vehicle details:", JSON.stringify(formattedData, null, 2));
      
      const response = await apiRequest("POST", "/api/vehicles", formattedData);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error response:", errorData);
        throw new Error(errorData.message || "Failed to save vehicle details");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      // Reset isSubmitting flag and mark registration as complete
      setIsSubmitting(false);
      setIsRegistrationComplete(true);
      
      console.log("Successfully saved vehicle details", data);
      
      toast({
        title: "Registration complete!",
        description: "Your driver account is now pending verification. Redirecting to dashboard...",
      });
      
      // Redirect immediately to prevent users from staying on the form
      setTimeout(() => {
        setLocation("/driver/dashboard");
      }, 1500);
    },
    onError: (error) => {
      console.error("Vehicle details submission error:", error);
      toast({
        title: "Failed to save vehicle details",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  });
  
  // Load saved progress when data is available
  useEffect(() => {
    if (!isLoadingProgress && registrationProgressQuery.data) {
      const progress = registrationProgressQuery.data;
      
      // Restore step
      if (progress.step) {
        setStep(progress.step);
      }
      
      // Restore form data if available
      if (progress.formData) {
        setFormData(progress.formData);
        
        // Need to handle dates specially - convert ISO strings back to Date objects
        const formDataWithDates = {
          ...progress.formData,
          licenseExpiry: progress.formData.licenseExpiry ? new Date(progress.formData.licenseExpiry) : undefined,
          insuranceExpiry: progress.formData.insuranceExpiry ? new Date(progress.formData.insuranceExpiry) : undefined,
        };
        
        driverDetailsForm.reset(formDataWithDates);
        
        // Restore uploaded documents state from form data
        const documentFields = ['licensePhotoFront', 'licensePhotoBack', 'insuranceDocumentUrl'];
        const restoredDocuments: {[key: string]: any} = {};
        
        documentFields.forEach(field => {
          if (progress.formData && progress.formData[field as keyof typeof progress.formData]) {
            restoredDocuments[field] = progress.formData[field as keyof typeof progress.formData];
          }
        });
        
        if (Object.keys(restoredDocuments).length > 0) {
          setUploadedDocuments(restoredDocuments);
        }
      }
      
      // Restore vehicle data if available
      if (progress.vehicleData) {
        setVehicleData(progress.vehicleData);
        vehicleForm.reset(progress.vehicleData);
      }
      
      // Show a toast to let the user know their progress was restored
      toast({
        title: "Progress restored",
        description: `Continuing from where you left off (Step ${progress.step})`,
      });
    }
  }, [isLoadingProgress, registrationProgressQuery.data, driverDetailsForm, vehicleForm, toast]);
  
  // File upload handler
  const handleFileUpload = async (file: File, fieldName: string) => {
    try {
      setUploadingDocuments(prev => ({ ...prev, [fieldName]: true }));
      
      const documentType = getDocumentTypeFromField(fieldName);
      const result = await uploadDocument(file, documentType);
      
      // Store the uploaded document URL
      setUploadedDocuments(prev => ({ ...prev, [fieldName]: result.url }));
      
      // Update the form field with the URL
      if (fieldName === 'licensePhotoFront' || fieldName === 'licensePhotoBack' || fieldName === 'insuranceDocumentUrl') {
        driverDetailsForm.setValue(fieldName as any, result.url);
      } else if (fieldName === 'photo') {
        vehicleForm.setValue('photo', result.url);
      }
      
      toast({
        title: "File uploaded successfully",
        description: `${documentType.replace('_', ' ')} has been uploaded`,
      });
      
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploadingDocuments(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  // Auto-save function to periodically save progress
  const saveProgress = () => {
    // Get current form values
    const currentFormData = step === 1 ? driverDetailsForm.getValues() : formData;
    const currentVehicleData = step === 3 ? vehicleForm.getValues() : vehicleData;
    
    // Include uploaded documents in the form data
    if (currentFormData && uploadedDocuments) {
      // Merge uploaded document references with form data
      Object.keys(uploadedDocuments).forEach(key => {
        if (uploadedDocuments[key]) {
          (currentFormData as any)[key] = uploadedDocuments[key];
        }
      });
    }
    
    // Save current progress with the step information and uploaded documents
    saveProgressMutation.mutate({
      step,
      formData: currentFormData || undefined,
      vehicleData: currentVehicleData || undefined
    });
  };
  
  // Handle form submissions for different steps
  const onDriverDetailsSubmit = (data: DriverDetailsFormValues) => {
    setFormData(data);
    setIsSubmitting(true);
    
    // Save progress before submitting to server
    saveProgressMutation.mutate({
      step: 2, // Moving to step 2 after this
      formData: data,
      vehicleData: vehicleData || undefined
    });
    
    driverDetailsMutation.mutate(data);
  };
  
  const onVehicleSubmit = (data: VehicleFormValues) => {
    // Prevent double submission
    if (isSubmitting) {
      return;
    }
    
    setVehicleData(data);
    setIsSubmitting(true);
    
    // Save progress before submitting to server
    saveProgressMutation.mutate({
      step: 3, // This is the final step
      formData: formData || undefined,
      vehicleData: data
    });
    
    vehicleMutation.mutate(data);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Driver Registration</h1>
            <p className="text-gray-600">Complete the following steps to register as a driver on MyAmbulex.</p>
            
            {/* Show saved progress notice if available */}
            {!isLoadingProgress && registrationProgressQuery.data && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start gap-3">
                  <div className="text-blue-500 mt-0.5">
                    <Save className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-blue-800">Saved Progress Available</h3>
                    <p className="text-sm text-blue-700">
                      We've restored your progress from {new Date(registrationProgressQuery.data.lastSaved).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}. 
                      You were on step {registrationProgressQuery.data.step}.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Registration Progress */}
            <div className="mt-6 mb-8">
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                  {step > 1 ? <CheckCircle className="h-5 w-5" /> : "1"}
                </div>
                <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                  {step > 2 ? <CheckCircle className="h-5 w-5" /> : "2"}
                </div>
                <div className={`flex-1 h-1 mx-2 ${step >= 3 ? 'bg-primary' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 3 ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                  3
                </div>
              </div>
              <div className="flex justify-between mt-2 text-sm">
                <div className="text-center">Driver Information</div>
                <div className="text-center">Verification</div>
                <div className="text-center">Vehicle Details</div>
              </div>
              <div className="mt-2 text-sm text-center">
                Current step: {step} {isSubmitting && <span className="text-amber-600">- Submitting...</span>}
                <div className="mt-2 flex justify-center gap-2">
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setStep(1)}
                  >
                    Go to Step 1
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setStep(2)}
                  >
                    Go to Step 2
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setStep(3)}
                  >
                    Go to Step 3
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Step 1: Driver Details */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Driver Information</CardTitle>
                  <CardDescription>
                    Please provide your driver details and qualifications.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...driverDetailsForm}>
                    <form onSubmit={driverDetailsForm.handleSubmit(onDriverDetailsSubmit)}>
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Driver's License Information</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={driverDetailsForm.control}
                              name="licenseNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>License Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter license number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={driverDetailsForm.control}
                              name="licenseState"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>State</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select state" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {STATES.map((state) => (
                                        <SelectItem key={state} value={state}>{state}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={driverDetailsForm.control}
                              name="licenseExpiry"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Expiry Date</FormLabel>
                                  <FormControl>
                                    <DatePicker 
                                      selected={field.value instanceof Date ? field.value : undefined} 
                                      onChange={(date: Date | null) => field.onChange(date || undefined)}
                                      minDate={new Date()}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={driverDetailsForm.control}
                              name="licenseClass"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>License Class (optional)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Class C" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <FormField
                              control={driverDetailsForm.control}
                              name="licensePhotoFront"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>License Photo (Front)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="text"
                                      value={field.value || ""}
                                      onChange={field.onChange}
                                      className="hidden"
                                    />
                                  </FormControl>
                                  <div className="mt-2">
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="file"
                                          id="licensePhotoFront"
                                          accept="image/*,.pdf"
                                          className="block w-full text-sm text-slate-500
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-md file:border-0
                                            file:text-sm file:font-semibold
                                            file:bg-primary-50 file:text-primary
                                            hover:file:bg-primary-100"
                                          onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              const result = await uploadDocument(file, 'licensePhotoFront');
                                              if (result) {
                                                field.onChange(result.url);
                                              }
                                            }
                                          }}
                                        />
                                        {uploadingDocuments.licensePhotoFront && (
                                          <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Uploading...
                                          </div>
                                        )}
                                        {uploadedDocuments.licensePhotoFront && (
                                          <div className="flex items-center gap-2 text-sm text-green-600">
                                            <CheckCircle className="h-4 w-4" />
                                            Document uploaded successfully
                                          </div>
                                        )}
                                        <Button 
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          disabled={uploadingDocuments.licensePhotoFront}
                                          onClick={() => document.getElementById("licensePhotoFront")?.click()}
                                        >
                                          {uploadingDocuments.licensePhotoFront ? (
                                            <>
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                              Uploading...
                                            </>
                                          ) : uploadedDocuments.licensePhotoFront ? (
                                            <>
                                              <CheckCircle className="mr-2 h-4 w-4" />
                                              Re-upload
                                            </>
                                          ) : (
                                            <>
                                              <Upload className="mr-2 h-4 w-4" />
                                              Upload License Front
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                      {field.value && (
                                        <p className="text-sm text-green-600 font-medium">
                                          ✓ File uploaded: {field.value}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={driverDetailsForm.control}
                              name="licensePhotoBack"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>License Photo (Back)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="text"
                                      value={field.value || ""}
                                      onChange={field.onChange}
                                      className="hidden"
                                    />
                                  </FormControl>
                                  <div className="mt-2">
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="file"
                                          id="licensePhotoBack"
                                          accept="image/*"
                                          className="block w-full text-sm text-slate-500
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-md file:border-0
                                            file:text-sm file:font-semibold
                                            file:bg-primary-50 file:text-primary
                                            hover:file:bg-primary-100"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              // Store a reference to the selected file
                                              // In a real app, this would be the file for upload
                                              const filename = file.name;
                                              document.getElementById("uploadLicenseBackBtn")?.setAttribute("data-file", filename);
                                            }
                                          }}
                                        />
                                        <Button 
                                          id="uploadLicenseBackBtn"
                                          type="button"
                                          size="sm"
                                          onClick={(e) => {
                                            const btn = e.currentTarget;
                                            const filename = btn.getAttribute("data-file");
                                            
                                            if (!filename) {
                                              toast({
                                                title: "No file selected",
                                                description: "Please select a file first",
                                                variant: "destructive"
                                              });
                                              return;
                                            }
                                            
                                            // In a real app, upload the file here
                                            // For now, we're just simulating a successful upload
                                            field.onChange(filename);
                                            toast({
                                              title: "File uploaded",
                                              description: "License back photo has been uploaded"
                                            });
                                          }}
                                        >
                                          Upload
                                        </Button>
                                      </div>
                                      {field.value && (
                                        <p className="text-sm text-green-600 font-medium">
                                          ✓ File uploaded: {field.value}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Insurance Information</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={driverDetailsForm.control}
                              name="insuranceProvider"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Insurance Provider</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter provider name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={driverDetailsForm.control}
                              name="insuranceNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Policy Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter policy number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={driverDetailsForm.control}
                              name="insuranceExpiry"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Policy Expiry Date</FormLabel>
                                  <FormControl>
                                    <DatePicker 
                                      selected={field.value instanceof Date ? field.value : undefined} 
                                      onChange={(date: Date | null) => field.onChange(date || undefined)}
                                      minDate={new Date()}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={driverDetailsForm.control}
                              name="insuranceDocumentUrl"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Insurance Document</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="text"
                                      value={field.value || ""}
                                      onChange={field.onChange}
                                      className="hidden"
                                    />
                                  </FormControl>
                                  <div className="mt-2">
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="file"
                                          id="insuranceDocument"
                                          accept="image/*,application/pdf"
                                          className="block w-full text-sm text-slate-500
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-md file:border-0
                                            file:text-sm file:font-semibold
                                            file:bg-primary-50 file:text-primary
                                            hover:file:bg-primary-100"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              // Store a reference to the selected file
                                              // In a real app, this would be the file for upload
                                              const filename = file.name;
                                              document.getElementById("uploadInsuranceDocBtn")?.setAttribute("data-file", filename);
                                            }
                                          }}
                                        />
                                        <Button 
                                          id="uploadInsuranceDocBtn"
                                          type="button"
                                          size="sm"
                                          onClick={(e) => {
                                            const btn = e.currentTarget;
                                            const filename = btn.getAttribute("data-file");
                                            
                                            if (!filename) {
                                              toast({
                                                title: "No file selected",
                                                description: "Please select a file first",
                                                variant: "destructive"
                                              });
                                              return;
                                            }
                                            
                                            // In a real app, upload the file here
                                            // For now, we're just simulating a successful upload
                                            field.onChange(filename);
                                            toast({
                                              title: "File uploaded",
                                              description: "Insurance document has been uploaded"
                                            });
                                          }}
                                        >
                                          Upload
                                        </Button>
                                      </div>
                                      {field.value && (
                                        <p className="text-sm text-green-600 font-medium">
                                          ✓ File uploaded: {field.value}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Professional Qualifications</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={driverDetailsForm.control}
                              name="yearsOfExperience"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Years of Driving Experience</FormLabel>
                                  <FormControl>
                                    <Input type="number" min="0" placeholder="Years" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={driverDetailsForm.control}
                              name="medicalTrainingLevel"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Medical Training Level</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    value={field.value || undefined}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select your highest training level" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {MEDICAL_TRAINING_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Select the highest level of medical training you have received.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Work Preferences</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={driverDetailsForm.control}
                              name="serviceArea"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Service Areas</FormLabel>
                                  <FormControl>
                                    <ScrollArea className="h-40 border rounded-md p-2">
                                      {SERVICE_AREAS.map((area) => (
                                        <div key={area} className="flex items-center space-x-2 p-1">
                                          <Checkbox 
                                            checked={field.value?.includes(area)}
                                            onCheckedChange={(checked) => {
                                              if (checked) {
                                                field.onChange([...(field.value || []), area]);
                                              } else {
                                                field.onChange(field.value?.filter((value) => value !== area));
                                              }
                                            }}
                                            id={`area-${area}`}
                                          />
                                          <label htmlFor={`area-${area}`} className="text-sm">{area}</label>
                                        </div>
                                      ))}
                                    </ScrollArea>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div>
                              <FormLabel className="mb-2 block">Service Hours</FormLabel>
                              <div className="space-y-2 border rounded-md p-2">
                                <FormField
                                  control={driverDetailsForm.control}
                                  name="serviceHours.weekdays"
                                  render={({ field }) => (
                                    <div className="flex items-center space-x-2">
                                      <Checkbox 
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        id="weekdays"
                                      />
                                      <label htmlFor="weekdays" className="text-sm">Weekdays (9am-5pm)</label>
                                    </div>
                                  )}
                                />
                                <FormField
                                  control={driverDetailsForm.control}
                                  name="serviceHours.weeknights"
                                  render={({ field }) => (
                                    <div className="flex items-center space-x-2">
                                      <Checkbox 
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        id="weeknights"
                                      />
                                      <label htmlFor="weeknights" className="text-sm">Weeknights (5pm-11pm)</label>
                                    </div>
                                  )}
                                />
                                <FormField
                                  control={driverDetailsForm.control}
                                  name="serviceHours.weekends"
                                  render={({ field }) => (
                                    <div className="flex items-center space-x-2">
                                      <Checkbox 
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        id="weekends"
                                      />
                                      <label htmlFor="weekends" className="text-sm">Weekends</label>
                                    </div>
                                  )}
                                />
                                <FormField
                                  control={driverDetailsForm.control}
                                  name="serviceHours.overnight"
                                  render={({ field }) => (
                                    <div className="flex items-center space-x-2">
                                      <Checkbox 
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        id="overnight"
                                      />
                                      <label htmlFor="overnight" className="text-sm">Overnight (11pm-6am)</label>
                                    </div>
                                  )}
                                />
                                <FormField
                                  control={driverDetailsForm.control}
                                  name="serviceHours.allHours"
                                  render={({ field }) => (
                                    <div className="flex items-center space-x-2">
                                      <Checkbox 
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        id="allHours"
                                      />
                                      <label htmlFor="allHours" className="text-sm">All Hours (24/7)</label>
                                    </div>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <FormField
                              control={driverDetailsForm.control}
                              name="preferredVehicleTypes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Vehicle Types You Can Drive</FormLabel>
                                  <div className="space-y-2 border rounded-md p-2">
                                    <div className="flex items-center space-x-2">
                                      <Checkbox 
                                        checked={field.value?.includes("standard")}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            field.onChange([...(field.value || []), "standard"]);
                                          } else {
                                            field.onChange(field.value?.filter((value) => value !== "standard"));
                                          }
                                        }}
                                        id="standard"
                                      />
                                      <label htmlFor="standard" className="text-sm">Standard</label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox 
                                        checked={field.value?.includes("wheelchair")}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            field.onChange([...(field.value || []), "wheelchair"]);
                                          } else {
                                            field.onChange(field.value?.filter((value) => value !== "wheelchair"));
                                          }
                                        }}
                                        id="wheelchair"
                                      />
                                      <label htmlFor="wheelchair" className="text-sm">Wheelchair Accessible</label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox 
                                        checked={field.value?.includes("stretcher")}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            field.onChange([...(field.value || []), "stretcher"]);
                                          } else {
                                            field.onChange(field.value?.filter((value) => value !== "stretcher"));
                                          }
                                        }}
                                        id="stretcher"
                                      />
                                      <label htmlFor="stretcher" className="text-sm">Stretcher Transport</label>
                                    </div>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={driverDetailsForm.control}
                              name="maxTravelDistance"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Maximum Travel Distance (miles)</FormLabel>
                                  <FormControl>
                                    <Input type="number" min="1" placeholder="Miles" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
                          <div className="grid grid-cols-1 gap-4">
                            <FormField
                              control={driverDetailsForm.control}
                              name="biography"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Bio / About You</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Tell us about yourself and your experience..." 
                                      className="resize-none h-24"
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormDescription className="text-right text-xs">
                                    {field.value?.length || 0}/500
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={driverDetailsForm.control}
                              name="languages"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Languages Spoken</FormLabel>
                                  <ScrollArea className="h-20 border rounded-md p-2">
                                    {LANGUAGES.map((language) => (
                                      <div key={language} className="flex items-center space-x-2 p-1">
                                        <Checkbox 
                                          checked={field.value?.includes(language)}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              field.onChange([...(field.value || []), language]);
                                            } else {
                                              field.onChange(field.value?.filter((value) => value !== language));
                                            }
                                          }}
                                          id={`lang-${language}`}
                                        />
                                        <label htmlFor={`lang-${language}`} className="text-sm">{language}</label>
                                      </div>
                                    ))}
                                  </ScrollArea>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <FormField
                          control={driverDetailsForm.control}
                          name="acceptTerms"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  I accept the terms and conditions
                                </FormLabel>
                                <FormDescription>
                                  I agree to abide by the MyAmbulex driver policies and code of conduct.
                                </FormDescription>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex flex-col md:flex-row gap-3 justify-between mt-6">
                          <div className="flex gap-2">
                            <Button 
                              type="button" 
                              variant="outline"
                              onClick={() => saveProgress()}
                              disabled={saveProgressMutation.isPending || isSubmitting}
                              className="flex gap-2 items-center"
                            >
                              {saveProgressMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4" />
                                  Save Progress
                                </>
                              )}
                            </Button>
                          </div>
                          
                          <Button 
                            type="submit" 
                            className="w-full md:w-auto"
                            disabled={isSubmitting || saveProgressMutation.isPending}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              "Save and Continue"
                            )}
                          </Button>
                        </div>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
            
            {/* Step 2: Verification Notice */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Verification Required</CardTitle>
                  <CardDescription>
                    Your driver details are being verified by our team.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Verification in Progress</AlertTitle>
                    <AlertDescription>
                      We are verifying your driver's license and insurance information. This typically takes 1-2 business days.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium">Next Steps:</h3>
                    <ol className="list-decimal ml-5 space-y-1">
                      <li>Complete your vehicle information</li>
                      <li>Wait for verification approval</li>
                      <li>Once approved, you can start accepting ride requests</li>
                    </ol>
                  </div>
                  
                  <Button 
                    onClick={() => setStep(3)}
                    className="w-full"
                  >
                    Continue to Vehicle Information
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {/* Step 3: Vehicle Information */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Vehicle Information</CardTitle>
                  <CardDescription>
                    Please provide details about your primary vehicle.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...vehicleForm}>
                    <form onSubmit={vehicleForm.handleSubmit(onVehicleSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={vehicleForm.control}
                          name="vehicleType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vehicle Type</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select vehicle type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="standard">Ambulatory</SelectItem>
                                  <SelectItem value="wheelchair">Wheelchair Accessible</SelectItem>
                                  <SelectItem value="stretcher">Stretcher Transport</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={vehicleForm.control}
                          name="make"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Make</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Toyota" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={vehicleForm.control}
                          name="model"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Model</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Sienna" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={vehicleForm.control}
                          name="year"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Year</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 2022" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={vehicleForm.control}
                          name="licensePlate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>License Plate</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter license plate" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={vehicleForm.control}
                          name="color"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Color</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., White" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={vehicleForm.control}
                          name="capacity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Passenger Capacity</FormLabel>
                              <FormControl>
                                <Input type="number" min="1" placeholder="Number of seats" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {(vehicleForm.watch("vehicleType") === "wheelchair" || vehicleForm.watch("vehicleType") === "stretcher") && (
                        <div className="mt-4 space-y-4">
                          <h3 className="text-lg font-semibold">Accessibility Features</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {vehicleForm.watch("vehicleType") === "wheelchair" && (
                              <FormField
                                control={vehicleForm.control}
                                name="wheelchairCapacity"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Wheelchair Capacity</FormLabel>
                                    <FormControl>
                                      <Input type="number" min="1" placeholder="Number of wheelchairs" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                            {vehicleForm.watch("vehicleType") === "stretcher" && (
                              <FormField
                                control={vehicleForm.control}
                                name="stretcherCapacity"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Stretcher Capacity</FormLabel>
                                    <FormControl>
                                      <Input type="number" min="1" placeholder="Number of stretchers" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                            
                            <div className="space-y-2">
                              <FormField
                                control={vehicleForm.control}
                                name="hasRamp"
                                render={({ field }) => (
                                  <div className="flex items-center space-x-2">
                                    <Checkbox 
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      id="hasRamp"
                                    />
                                    <label htmlFor="hasRamp" className="text-sm">Vehicle has a ramp</label>
                                  </div>
                                )}
                              />
                              <FormField
                                control={vehicleForm.control}
                                name="hasLift"
                                render={({ field }) => (
                                  <div className="flex items-center space-x-2">
                                    <Checkbox 
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      id="hasLift"
                                    />
                                    <label htmlFor="hasLift" className="text-sm">Vehicle has a lift</label>
                                  </div>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <FormField
                        control={vehicleForm.control}
                        name="photo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vehicle Photo</FormLabel>
                            <FormControl>
                              <Input
                                type="hidden"
                                value={field.value || ""}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <div className="mt-2">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="file"
                                    id="vehiclePhoto"
                                    accept="image/*"
                                    className="block w-full text-sm text-slate-500
                                      file:mr-4 file:py-2 file:px-4
                                      file:rounded-md file:border-0
                                      file:text-sm file:font-semibold
                                      file:bg-primary-50 file:text-primary
                                      hover:file:bg-primary-100"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        // Store a reference to the selected file
                                        // In a real app, this would be the file for upload
                                        const filename = file.name;
                                        document.getElementById("uploadVehiclePhotoBtn")?.setAttribute("data-file", filename);
                                      }
                                    }}
                                  />
                                  <Button 
                                    id="uploadVehiclePhotoBtn"
                                    type="button"
                                    size="sm"
                                    onClick={(e) => {
                                      const btn = e.currentTarget;
                                      const filename = btn.getAttribute("data-file");
                                      
                                      if (!filename) {
                                        toast({
                                          title: "No file selected",
                                          description: "Please select a file first",
                                          variant: "destructive"
                                        });
                                        return;
                                      }
                                      
                                      // In a real app, upload the file here
                                      // For now, we're just simulating a successful upload
                                      field.onChange(filename);
                                      toast({
                                        title: "File uploaded",
                                        description: "Vehicle photo has been uploaded"
                                      });
                                    }}
                                  >
                                    Upload
                                  </Button>
                                </div>
                                {field.value && (
                                  <p className="text-sm text-green-600 font-medium">
                                    ✓ File uploaded: {field.value}
                                  </p>
                                )}
                              </div>
                            </div>
                            <FormDescription>
                              Please upload a clear photo of your vehicle. This will be shown to riders.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex flex-wrap gap-3 justify-between">
                        <Button type="button" variant="outline" onClick={() => setStep(1)}>
                          Back to Driver Information
                        </Button>
                        
                        <div className="flex flex-wrap gap-3">
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => saveProgress()}
                            disabled={saveProgressMutation.isPending}
                            className="flex gap-2 items-center"
                          >
                            {saveProgressMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                Save Progress
                              </>
                            )}
                          </Button>
                          
                          <Button 
                            type="submit" 
                            disabled={isSubmitting || isRegistrationComplete}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Completing Registration...
                              </>
                            ) : isRegistrationComplete ? (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                Registration Complete!
                              </>
                            ) : (
                              "Complete Registration"
                            )}
                          </Button>
                        </div>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}