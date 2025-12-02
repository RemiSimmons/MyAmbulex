import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import * as z from 'zod';
import { DocumentUpload } from '@/components/driver/document-upload';
import { CentralizedDocumentManager } from '@/components/driver/centralized-document-manager';
import { StripeConnectOnboarding } from '@/components/driver/StripeConnectOnboarding';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, ChevronLeft, ChevronRight, CheckIcon, Clock, CreditCard, Users, Settings } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// Step indicators component
const StepIndicator = ({ currentStep, steps, onStepClick }: { currentStep: number; steps: string[]; onStepClick?: (stepIndex: number) => void }) => {
  return (
    <div className="w-full mb-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between px-1 sm:px-4">
        {steps.map((step, index) => {
          const isClickable = onStepClick && index < currentStep;
          
          return (
            <div key={index} className="flex flex-col items-center flex-1 relative min-w-0">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium mb-2
                  ${
                    index < currentStep
                      ? 'bg-primary text-primary-foreground'
                      : index === currentStep
                      ? 'bg-primary/90 text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }
                  ${isClickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
                `}
                onClick={() => isClickable && onStepClick(index)}
                title={isClickable ? `Go to ${step}` : undefined}
              >
                {index < currentStep ? <CheckIcon className="w-3 h-3 sm:w-4 sm:h-4" /> : index + 1}
              </div>
            
            {/* Mobile: Show shorter text */}
            <div className={`text-center w-full max-w-[60px] sm:max-w-none ${index === currentStep ? 'font-medium' : 'text-muted-foreground'}`}>
              <div className="block sm:hidden text-xs leading-tight">
                {step === 'Review & Submit' ? (
                  <div className="leading-none">
                    <div className="whitespace-nowrap text-[10px]">Review</div>
                    <div className="whitespace-nowrap text-[10px]">& Submit</div>
                  </div>
                ) : step === 'Availability Settings' ? (
                  <div className="leading-none">
                    <div className="whitespace-nowrap text-[10px]">Available</div>
                    <div className="whitespace-nowrap text-[10px]">Settings</div>
                  </div>
                ) : step === 'Payment Setup' ? (
                  <div className="leading-none">
                    <div className="whitespace-nowrap text-[10px]">Payment</div>
                    <div className="whitespace-nowrap text-[10px]">Setup</div>
                  </div>
                ) : step === 'Document Upload' ? (
                  <div className="leading-none">
                    <div className="whitespace-nowrap text-[10px]">Document</div>
                    <div className="whitespace-nowrap text-[10px]">Upload</div>
                  </div>
                ) : step === 'Personal Information' ? (
                  <div className="leading-none">
                    <div className="whitespace-nowrap text-[10px]">Personal</div>
                    <div className="whitespace-nowrap text-[10px]">Info</div>
                  </div>
                ) : step === 'Vehicle Information' ? (
                  <div className="leading-none">
                    <div className="whitespace-nowrap text-[10px]">Vehicle</div>
                    <div className="whitespace-nowrap text-[10px]">Info</div>
                  </div>
                ) : (
                  step.split(' ').map((word, wordIndex) => (
                    <div key={wordIndex} className="whitespace-nowrap leading-none text-[10px]">
                      {word.length > 8 ? word.substring(0, 6) + '...' : word}
                    </div>
                  ))
                )}
              </div>
              <div className="hidden sm:block text-xs leading-tight">
                {step}
              </div>
            </div>
            
            {/* Connection line - only show on larger screens */}
            {index < steps.length - 1 && (
              <div
                className={`hidden md:block absolute top-3 left-1/2 transform -translate-y-1/2 h-0.5 bg-current ${
                  index < currentStep ? 'text-primary' : 'text-muted'
                }`}
                style={{ 
                  width: 'calc(100vw / 6 - 2rem)',
                  left: 'calc(50% + 1rem)'
                }}
              />
            )}
          </div>
        )})}
      </div>
    </div>
  );
};

// Form schema with stronger validation - create a custom schema
const personalInfoSchema = z.object({
  licenseNumber: z.string().min(5, 'License number must be at least 5 characters'),
  licenseState: z.string().min(2, 'Please select a valid state'),
  licenseExpiry: z.date({
    required_error: "License expiration date is required",
  }).refine(date => date > new Date(), {
    message: 'Expiration date must be in the future',
  }),
  insuranceProvider: z.string().min(2, 'Insurance provider is required'),
  insuranceNumber: z.string().min(5, 'Insurance policy number must be at least 5 characters'),
  insuranceExpiry: z.date({
    required_error: "Insurance expiration date is required",
  }).refine(date => date > new Date(), {
    message: 'Expiration date must be in the future',
  }),
  yearsOfExperience: z.coerce.number().min(1, 'Please enter years of experience'),
  servicesDescription: z.string().optional(),
  serviceArea: z.array(z.string()).optional(),
  serviceHours: z.object({
    weekdays: z.boolean().optional(),
    weeknights: z.boolean().optional(),
    weekends: z.boolean().optional(),
    overnight: z.boolean().optional(),
    allHours: z.boolean().optional(),
  }).optional(),
  preferredVehicleTypes: z.array(z.string()).optional(),
  maxTravelDistance: z.coerce.number().min(0).optional(),
  certifications: z.array(z.string()).optional(),
  medicalTrainingLevel: z.array(z.enum(['none', 'first_aid', 'cpr', 'emt_basic', 'emt_paramedic', 'nurse', 'doctor'])).optional(),
  languages: z.array(z.string()).optional(),
});

// Types for the form data
type PersonalInfoFormValues = z.infer<typeof personalInfoSchema>;

// Vehicle form schema
const vehicleSchema = z.object({
  make: z.string().min(2, 'Make is required'),
  model: z.string().min(2, 'Model is required'),
  year: z.coerce.number().min(1990, 'Year must be 1990 or later'),
  licensePlate: z.string().min(4, 'License plate is required'),
  color: z.string().min(2, 'Color is required'),
  vehicleType: z.enum(['standard', 'wheelchair', 'stretcher'], {
    required_error: 'Please select a vehicle type',
  }),
  capacity: z.coerce.number().min(1, 'Capacity must be at least 1'),
  wheelchairCapacity: z.coerce.number().nullable().optional(),
  stretcherCapacity: z.coerce.number().nullable().optional(),
  hasRamp: z.boolean().nullable().optional(),
  hasLift: z.boolean().nullable().optional(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

type OnboardingStepsProps = {
  onComplete: () => void;
};

const steps = [
  'Personal Information',
  'Vehicle Information',
  'Availability Settings',
  'Payment Setup',
  'Document Upload',
  'Review & Submit',
];

export default function OnboardingSteps({ onComplete }: OnboardingStepsProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<PersonalInfoFormValues | null>(null);
  const [vehicleData, setVehicleData] = useState<VehicleFormValues | null>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<{
    licensePhotoFront: File | null;
    licensePhotoBack: File | null;
    insuranceDocument: File | null;
    vehicleRegistration: File | null;
    mvrRecord: File | null;
    backgroundCheck: File | null;
    drugTestResults: File | null;
    certifications: File | null;
  }>({
    licensePhotoFront: null,
    licensePhotoBack: null,
    insuranceDocument: null,
    vehicleRegistration: null,
    mvrRecord: null,
    backgroundCheck: null,
    drugTestResults: null,
    certifications: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Availability settings state
  const [availabilitySettings, setAvailabilitySettings] = useState({
    weekdays: { available: false, startTime: '09:00', endTime: '17:00' },
    weekends: { available: false, startTime: '09:00', endTime: '17:00' },
    evenings: { available: false, startTime: '18:00', endTime: '22:00' },
    overnight: { available: false, startTime: '22:00', endTime: '06:00' },
  });

  // Form for personal information
  const personalInfoForm = useForm<PersonalInfoFormValues>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      licenseNumber: '',
      licenseState: '',
      licenseExpiry: undefined,
      insuranceProvider: '',
      insuranceNumber: '',
      insuranceExpiry: undefined,
      yearsOfExperience: 0,
      servicesDescription: '',
      serviceArea: [],
      serviceHours: {
        weekdays: false,
        weeknights: false,
        weekends: false,
        overnight: false,
        allHours: false,
      },
      preferredVehicleTypes: ['standard'],
      maxTravelDistance: 50,
      certifications: [],
      medicalTrainingLevel: [],
      languages: ['English'],
    },
  });

  // Form for vehicle information
  const vehicleForm = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      make: '',
      model: '',
      year: new Date().getFullYear(),
      licensePlate: '',
      color: '',
      vehicleType: 'standard', // 'standard', 'wheelchair', or 'stretcher'
      capacity: 4,
      wheelchairCapacity: 0,
      stretcherCapacity: 0,
      hasRamp: false,
      hasLift: false,
    },
  });

  // Load saved progress on component mount
  useEffect(() => {
    const loadSavedProgress = async () => {
      try {
        const res = await apiRequest('GET', '/api/registration-progress');
        if (res.ok) {
          const data = await res.json();
          console.log("Loaded registration progress data:", data);
          
          // Handle personal info form data
          if (data.formData) {
            try {
              // Convert date strings back to Date objects for proper form handling
              const processedFormData = {...data.formData};
              
              if (processedFormData.licenseExpiry) {
                processedFormData.licenseExpiry = new Date(processedFormData.licenseExpiry);
              }
              if (processedFormData.insuranceExpiry) {
                processedFormData.insuranceExpiry = new Date(processedFormData.insuranceExpiry);
              }
              
              console.log("Setting personal form data:", processedFormData);
              setFormData(processedFormData);
              
              // Only reset the form if we're on the personal info step
              if (data.step === 0) {
                personalInfoForm.reset(processedFormData);
              }
            } catch (formError) {
              console.error("Error processing form data:", formError);
            }
          } else {
            // If no form data, reset to defaults
            personalInfoForm.reset(personalInfoForm.formState.defaultValues);
          }
          
          // Handle vehicle form data independently
          if (data.vehicleData) {
            try {
              console.log("Setting vehicle data:", data.vehicleData);
              setVehicleData(data.vehicleData);
              
              // Only reset the vehicle form if we're on the vehicle step
              if (data.step === 1) {
                vehicleForm.reset(data.vehicleData);
              }
            } catch (vehicleError) {
              console.error("Error processing vehicle data:", vehicleError);
            }
          }
          
          // Handle availability settings data
          if (data.availabilitySettings) {
            console.log("Setting restored availability settings from DB:", data.availabilitySettings);
            setAvailabilitySettings(data.availabilitySettings);
          } else {
            // Ensure clean default values if no vehicle data
            const defaultVehicleValues: VehicleFormValues = {
              make: '',
              model: '',
              year: new Date().getFullYear(),
              licensePlate: '',
              color: '',
              vehicleType: 'standard',
              capacity: 4,
              wheelchairCapacity: 0,
              stretcherCapacity: 0,
              hasRamp: false,
              hasLift: false,
            };
            
            setVehicleData(defaultVehicleValues);
            // Only reset if we're on the vehicle step
            if (data.step === 1) {
              vehicleForm.reset(defaultVehicleValues);
            }
          }
          
          // Set the current step
          if (data.step !== undefined && data.step !== null) {
            setCurrentStep(data.step);
          }
        }
      } catch (error) {
        console.error('Error loading saved progress:', error);
      }
    };

    loadSavedProgress();
  }, [personalInfoForm, vehicleForm]);
  
  // Watch for vehicle type changes to adjust capacity
  useEffect(() => {
    const vehicleType = vehicleForm.watch('vehicleType');
    const currentCapacity = vehicleForm.getValues('capacity');
    const currentWheelchairCapacity = vehicleForm.getValues('wheelchairCapacity') || 0;
    const currentStretcherCapacity = vehicleForm.getValues('stretcherCapacity') || 0;
    
    // If vehicle type is wheelchair or stretcher, limit capacity to 2
    if ((vehicleType === 'wheelchair' || vehicleType === 'stretcher') && currentCapacity > 2) {
      vehicleForm.setValue('capacity', 2);
    }
    
    // If standard vehicle and capacity is less than 3, set to 4
    if (vehicleType === 'standard' && currentCapacity < 3) {
      vehicleForm.setValue('capacity', 4);
    }
    
    // Enforce wheelchair capacity limit of 2
    if (vehicleType === 'wheelchair' && currentWheelchairCapacity && currentWheelchairCapacity > 2) {
      vehicleForm.setValue('wheelchairCapacity', 2);
    }
    
    // Enforce stretcher capacity limit of 2
    if (vehicleType === 'stretcher' && currentStretcherCapacity && currentStretcherCapacity > 2) {
      vehicleForm.setValue('stretcherCapacity', 2);
    }
    
    // Reset wheelchair/stretcher capacities when changing types
    if (vehicleType === 'standard') {
      vehicleForm.setValue('wheelchairCapacity', 0);
      vehicleForm.setValue('stretcherCapacity', 0);
    } else if (vehicleType === 'wheelchair') {
      vehicleForm.setValue('stretcherCapacity', 0);
    } else if (vehicleType === 'stretcher') {
      vehicleForm.setValue('wheelchairCapacity', 0);
    }
  }, [vehicleForm.watch('vehicleType')]);
  
  // Watch for wheelchair capacity changes to enforce limits
  useEffect(() => {
    if (vehicleForm.watch('vehicleType') === 'wheelchair') {
      const wheelchairCapacity = vehicleForm.watch('wheelchairCapacity');
      if (wheelchairCapacity && wheelchairCapacity > 2) {
        vehicleForm.setValue('wheelchairCapacity', 2);
      }
    }
  }, [vehicleForm.watch('wheelchairCapacity')]);
  
  // Watch for stretcher capacity changes to enforce limits
  useEffect(() => {
    if (vehicleForm.watch('vehicleType') === 'stretcher') {
      const stretcherCapacity = vehicleForm.watch('stretcherCapacity');
      if (stretcherCapacity && stretcherCapacity > 2) {
        vehicleForm.setValue('stretcherCapacity', 2);
      }
    }
  }, [vehicleForm.watch('stretcherCapacity')]);

  // This effect handles form initialization when the step changes
  useEffect(() => {
    console.log("Step changed to:", currentStep);
    
    // When moving to the vehicle information step, completely reset the vehicle form with clean values
    if (currentStep === 1) {
      // First, get a fresh copy of vehicle data or use empty defaults
      const freshVehicleData: VehicleFormValues = vehicleData ? {...vehicleData} : {
        make: '',
        model: '',
        year: new Date().getFullYear(),
        licensePlate: '',
        color: '',
        vehicleType: 'standard',
        capacity: 4,
        wheelchairCapacity: 0,
        stretcherCapacity: 0,
        hasRamp: false,
        hasLift: false,
      };
      
      // Adjust capacity based on vehicle type
      if (freshVehicleData.vehicleType === 'wheelchair' || freshVehicleData.vehicleType === 'stretcher') {
        freshVehicleData.capacity = Math.min(freshVehicleData.capacity || 2, 2);
      } else {
        freshVehicleData.capacity = Math.max(freshVehicleData.capacity || 4, 4);
      }
      
      console.log("Resetting vehicle form with FRESH vehicle data:", freshVehicleData);
      
      // Important: Set all form values to these clean values 
      // This prevents any possible bleeding of data between forms
      vehicleForm.reset(freshVehicleData);
      
      // Also update state for consistency
      setVehicleData(freshVehicleData);
    }
    
    // When moving to the personal information step, make sure to reset the personal form
    if (currentStep === 0 && formData) {
      const freshPersonalData = {...formData};
      console.log("Resetting personal form with FRESH form data:", freshPersonalData);
      personalInfoForm.reset(freshPersonalData);
    }
  }, [currentStep]);

  // Save and exit functionality
  const handleSaveAndExit = async () => {
    const saved = await saveProgress();
    if (saved) {
      toast({
        title: "Progress Saved",
        description: "Your progress has been saved. You can continue later from the driver dashboard.",
      });
      navigate('/driver/dashboard');
    }
  };

  // Save progress when moving between steps
  const saveProgress = async () => {
    try {
      console.log("saveProgress called for step:", currentStep);
      console.log("User authentication status:", { user: user?.username, isAuthenticated: !!user });
      
      // Check if user is authenticated
      if (!user) {
        console.error("User not authenticated, cannot save progress");
        toast({
          title: 'Authentication Required',
          description: 'Please log in to save your progress. Redirecting to login page...',
          variant: 'destructive',
        });
        // Redirect to login page after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return false;
      }
      
      let currentFormData = null;
      let currentVehicleData = null;
      
      // Only include the form data relevant to the current step
      // This prevents cross-contamination between the forms
      if (currentStep === 0) {
        try {
          // Try to get values from the personal info form
          currentFormData = personalInfoForm.getValues();
          console.log("Form data from personal info form:", currentFormData);
        } catch (formError) {
          console.error("Error getting personal form values:", formError);
          // Fallback to stored data
          currentFormData = formData;
        }
        
        // Keep the current vehicle data in state, but don't modify it
        currentVehicleData = vehicleData;
      } 
      else if (currentStep === 1) {
        try {
          // Try to get values from the vehicle form
          currentVehicleData = vehicleForm.getValues();
          console.log("Vehicle data from form:", currentVehicleData);
        } catch (formError) {
          console.error("Error getting vehicle form values:", formError);
          currentVehicleData = vehicleData;
        }
        
        // Keep the current form data in state, but don't modify it
        currentFormData = formData;
      }
      else {
        // For other steps, preserve both data sets from state
        currentFormData = formData;
        currentVehicleData = vehicleData;
      }
      
      console.log("Sending registration progress data:", {
        step: currentStep,
        formData: currentFormData,
        vehicleData: currentVehicleData
      });
      
      // Use fetch directly for more control over the request
      const res = await fetch('/api/registration-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          step: currentStep,
          formData: currentFormData,
          vehicleData: currentVehicleData,
          availabilitySettings: availabilitySettings,
        }),
        credentials: 'include',
      });
      
      console.log("Save progress response status:", res.status);
      
      if (!res.ok) {
        // Log the full response for debugging
        const responseText = await res.text();
        console.error("Error response from API:", {
          status: res.status,
          statusText: res.statusText,
          responseText: responseText
        });
        
        // Try to parse as JSON, fallback to text response
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Failed to parse error response as JSON:", parseError);
          errorData = { message: responseText || res.statusText };
        }
        
        throw new Error(`Failed to save progress: ${errorData.message || res.statusText}`);
      }
      
      const responseText = await res.text();
      console.log("Raw response text:", responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log("Save progress successful with data:", responseData);
      } catch (parseError) {
        console.error("Failed to parse successful response as JSON:", parseError);
        console.error("Response text that failed to parse:", responseText);
        throw new Error(`Server returned invalid JSON: ${responseText}`);
      }
      
      // Update state with the response data to ensure consistency
      if (responseData.formData && currentStep === 0) {
        setFormData(responseData.formData);
      }
      
      if (responseData.vehicleData && currentStep === 1) {
        setVehicleData(responseData.vehicleData);
      }
      
      // Show success toast
      toast({
        title: "Progress Saved",
        description: "Your information has been saved successfully.",
      });
      
      return true;
    } catch (error) {
      console.error('Error saving progress:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save your progress. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Handle next button click
  const handleNext = async () => {
    try {
      console.log("Next button clicked for step:", currentStep);
      // Validation based on current step
      if (currentStep === 0) {
        console.log("Validating personal info form");
        const valid = await personalInfoForm.trigger();
        console.log("Personal info form validation result:", valid);
        if (!valid) {
          console.log("Form validation errors:", personalInfoForm.formState.errors);
          toast({
            title: 'Validation Error',
            description: 'Please fix the form errors before proceeding.',
            variant: 'destructive',
          });
          return;
        }
        
        const values = personalInfoForm.getValues();
        console.log("Setting form data:", values);
        setFormData(values);
      } else if (currentStep === 1) {
        console.log("Validating vehicle form");
        const valid = await vehicleForm.trigger();
        console.log("Vehicle form validation result:", valid);
        if (!valid) {
          console.log("Form validation errors:", vehicleForm.formState.errors);
          toast({
            title: 'Validation Error',
            description: 'Please fix the form errors before proceeding.',
            variant: 'destructive',
          });
          return;
        }
        
        const values = vehicleForm.getValues();
        console.log("Setting vehicle data:", values);
        setVehicleData(values);
      } else if (currentStep === 2) {
        // Availability settings step - optional validation
        // Users can skip this step if they want to set availability later
        console.log("Availability settings saved:", availabilitySettings);
      } else if (currentStep === 3) {
        // Payment setup step - optional validation
        // Users can complete payment setup later if needed
        console.log("Payment setup step completed");
      } else if (currentStep === 4) {
        // Validate document uploads using the helper function
        if (!isDocumentUploaded('licensePhotoFront')) {
          toast({
            title: 'Missing Document',
            description: 'Please upload your driver\'s license (front side)',
            variant: 'destructive',
          });
          return;
        }
        
        if (!isDocumentUploaded('licensePhotoBack')) {
          toast({
            title: 'Missing Document',
            description: 'Please upload your driver\'s license (back side)',
            variant: 'destructive',
          });
          return;
        }
        
        if (!isDocumentUploaded('insuranceDocument')) {
          toast({
            title: 'Missing Document',
            description: 'Please upload your insurance document',
            variant: 'destructive',
          });
          return;
        }
        
        if (!isDocumentUploaded('vehicleRegistration')) {
          toast({
            title: 'Missing Document',
            description: 'Please upload your vehicle registration document',
            variant: 'destructive',
          });
          return;
        }
        
        if (!isDocumentUploaded('mvrRecord')) {
          toast({
            title: 'Missing Document',
            description: 'Please upload your Motor Vehicle Record (MVR)',
            variant: 'destructive',
          });
          return;
        }
        
        if (!isDocumentUploaded('backgroundCheck')) {
          toast({
            title: 'Missing Document',
            description: 'Please upload your background check results',
            variant: 'destructive',
          });
          return;
        }
        
        if (!isDocumentUploaded('drugTestResults')) {
          toast({
            title: 'Missing Document',
            description: 'Please upload your drug test results',
            variant: 'destructive',
          });
          return;
        }
        
        if (!isDocumentUploaded('profilePhoto')) {
          toast({
            title: 'Missing Document',
            description: 'Please upload your profile photo',
            variant: 'destructive',
          });
          return;
        }
      }
      
      // Save progress
      console.log("Saving progress...");
      const saved = await saveProgress();
      console.log("Progress saved result:", saved);
      
      if (saved) {
        // Move to next step
        console.log(`Successfully moving from step ${currentStep} to step ${currentStep + 1}`);
        setCurrentStep(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error handling next button:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle back button click
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Handle document upload
  const handleDocumentUpload = (docType: string, file: File | null) => {
    setUploadedDocuments(prev => ({
      ...prev,
      [docType]: file
    }));
  };

  // Fetch driver documents to check uploaded status
  const { data: driverDocuments } = useQuery({
    queryKey: ['/api/driver/documents'],
    retry: false,
  });

  // Helper function to check if document exists (uploaded or in database)
  const isDocumentUploaded = (docType: string) => {
    // Type the uploadedDocuments object properly
    const typedUploadedDocuments = uploadedDocuments as Record<string, File | null>;
    
    // Check if there's an uploaded file
    if (typedUploadedDocuments[docType]) {
      return true;
    }
    
    // Check if document exists in database
    if (driverDocuments) {
      const fieldMapping: Record<string, string> = {
        'licensePhotoFront': 'licensePhotoFront',
        'licensePhotoBack': 'licensePhotoBack',
        'insuranceDocument': 'insuranceDocumentUrl',
        'vehicleRegistration': 'vehicleRegistrationUrl',
        'backgroundCheck': 'backgroundCheckDocumentUrl',
        'drugTestResults': 'drugTestDocumentUrl',
        'mvrRecord': 'mvrRecordUrl',
        'certifications': 'medicalCertificationUrl',
        'profilePhoto': 'profilePhoto'
      };
      
      const fieldName = fieldMapping[docType];
      const typedDriverDocuments = driverDocuments as Record<string, any>;
      return fieldName && typedDriverDocuments[fieldName] && typedDriverDocuments[fieldName].trim() !== '';
    }
    
    return false;
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Save final progress
      await saveProgress();
      
      // Create a FormData object for document upload
      const documentFormData = new FormData();
      if (uploadedDocuments.licensePhotoFront) {
        documentFormData.append('licensePhotoFront', uploadedDocuments.licensePhotoFront);
      }
      if (uploadedDocuments.licensePhotoBack) {
        documentFormData.append('licensePhotoBack', uploadedDocuments.licensePhotoBack);
      }
      if (uploadedDocuments.insuranceDocument) {
        documentFormData.append('insuranceDocument', uploadedDocuments.insuranceDocument);
      }
      if (uploadedDocuments.vehicleRegistration) {
        documentFormData.append('vehicleRegistration', uploadedDocuments.vehicleRegistration);
      }
      if (uploadedDocuments.mvrRecord) {
        documentFormData.append('mvrRecord', uploadedDocuments.mvrRecord);
      }
      if (uploadedDocuments.backgroundCheck) {
        documentFormData.append('backgroundCheck', uploadedDocuments.backgroundCheck);
      }
      if (uploadedDocuments.drugTestResults) {
        documentFormData.append('drugTestResults', uploadedDocuments.drugTestResults);
      }
      if (uploadedDocuments.certifications) {
        documentFormData.append('certifications', uploadedDocuments.certifications);
      }
      
      // Upload documents
      const uploadRes = await fetch('/api/upload-driver-documents', {
        method: 'POST',
        body: documentFormData,
        credentials: 'include',
      });
      
      if (!uploadRes.ok) {
        throw new Error('Failed to upload documents');
      }
      
      // Get the current form data
      const personalInfo = formData || {};
      
      // Submit application - use JSON instead of FormData
      const submitRes = await apiRequest('POST', '/api/complete-driver-registration', {
        personalInfo: personalInfo,
        vehicleInfo: vehicleData,
      });
      
      if (!submitRes.ok) {
        throw new Error('Failed to submit application');
      }
      
      // Show success message
      toast({
        title: 'Application Submitted',
        description: 'Your application has been submitted successfully and is under review.',
      });
      
      // Notify parent component that onboarding is complete
      onComplete();
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: 'Submission Error',
        description: error instanceof Error ? error.message : 'Failed to submit your application. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render personal information form
  const renderPersonalInfoForm = () => (
    <Form {...personalInfoForm} key={`personal-form-${currentStep}`}>
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={personalInfoForm.control}
            name="licenseNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Driver's License Number</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter license number" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={personalInfoForm.control}
            name="licenseState"
            render={({ field }) => (
              <FormItem>
                <FormLabel>License State</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value || undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="AL">Alabama</SelectItem>
                    <SelectItem value="AK">Alaska</SelectItem>
                    <SelectItem value="AZ">Arizona</SelectItem>
                    <SelectItem value="AR">Arkansas</SelectItem>
                    <SelectItem value="CA">California</SelectItem>
                    <SelectItem value="CO">Colorado</SelectItem>
                    <SelectItem value="CT">Connecticut</SelectItem>
                    <SelectItem value="DE">Delaware</SelectItem>
                    <SelectItem value="FL">Florida</SelectItem>
                    <SelectItem value="GA">Georgia</SelectItem>
                    <SelectItem value="HI">Hawaii</SelectItem>
                    <SelectItem value="ID">Idaho</SelectItem>
                    <SelectItem value="IL">Illinois</SelectItem>
                    <SelectItem value="IN">Indiana</SelectItem>
                    <SelectItem value="IA">Iowa</SelectItem>
                    <SelectItem value="KS">Kansas</SelectItem>
                    <SelectItem value="KY">Kentucky</SelectItem>
                    <SelectItem value="LA">Louisiana</SelectItem>
                    <SelectItem value="ME">Maine</SelectItem>
                    <SelectItem value="MD">Maryland</SelectItem>
                    <SelectItem value="MA">Massachusetts</SelectItem>
                    <SelectItem value="MI">Michigan</SelectItem>
                    <SelectItem value="MN">Minnesota</SelectItem>
                    <SelectItem value="MS">Mississippi</SelectItem>
                    <SelectItem value="MO">Missouri</SelectItem>
                    <SelectItem value="MT">Montana</SelectItem>
                    <SelectItem value="NE">Nebraska</SelectItem>
                    <SelectItem value="NV">Nevada</SelectItem>
                    <SelectItem value="NH">New Hampshire</SelectItem>
                    <SelectItem value="NJ">New Jersey</SelectItem>
                    <SelectItem value="NM">New Mexico</SelectItem>
                    <SelectItem value="NY">New York</SelectItem>
                    <SelectItem value="NC">North Carolina</SelectItem>
                    <SelectItem value="ND">North Dakota</SelectItem>
                    <SelectItem value="OH">Ohio</SelectItem>
                    <SelectItem value="OK">Oklahoma</SelectItem>
                    <SelectItem value="OR">Oregon</SelectItem>
                    <SelectItem value="PA">Pennsylvania</SelectItem>
                    <SelectItem value="RI">Rhode Island</SelectItem>
                    <SelectItem value="SC">South Carolina</SelectItem>
                    <SelectItem value="SD">South Dakota</SelectItem>
                    <SelectItem value="TN">Tennessee</SelectItem>
                    <SelectItem value="TX">Texas</SelectItem>
                    <SelectItem value="UT">Utah</SelectItem>
                    <SelectItem value="VT">Vermont</SelectItem>
                    <SelectItem value="VA">Virginia</SelectItem>
                    <SelectItem value="WA">Washington</SelectItem>
                    <SelectItem value="WV">West Virginia</SelectItem>
                    <SelectItem value="WI">Wisconsin</SelectItem>
                    <SelectItem value="WY">Wyoming</SelectItem>
                    <SelectItem value="DC">District of Columbia</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={personalInfoForm.control}
            name="licenseExpiry"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>License Expiration Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date()
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={personalInfoForm.control}
            name="insuranceProvider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Insurance Provider</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g. State Farm, Geico" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={personalInfoForm.control}
            name="insuranceNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Insurance Policy Number</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter policy number" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={personalInfoForm.control}
            name="insuranceExpiry"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Insurance Expiration Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date()
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={personalInfoForm.control}
            name="yearsOfExperience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Years of Driving Experience</FormLabel>
                <FormControl>
                  <NumberInput 
                    min={0}
                    max={50}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Years of experience"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={personalInfoForm.control}
            name="maxTravelDistance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Travel Distance (miles)</FormLabel>
                <FormControl>
                  <NumberInput 
                    min={1}
                    max={500}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Max distance in miles"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={personalInfoForm.control}
            name="medicalTrainingLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Medical Training Options (Select all that apply)</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { value: 'none', label: 'None' },
                      { value: 'first_aid', label: 'First Aid' },
                      { value: 'cpr', label: 'CPR Certified' },
                      { value: 'emt_basic', label: 'EMT Basic' },
                      { value: 'emt_paramedic', label: 'EMT Paramedic' },
                      { value: 'nurse', label: 'Nurse' },
                      { value: 'doctor', label: 'Doctor' }
                    ].map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`medical-${option.value}`}
                          checked={field.value?.includes(option.value) || false}
                          onCheckedChange={(checked) => {
                            const currentValue = field.value || [];
                            if (checked) {
                              // If selecting "None", clear all others
                              if (option.value === 'none') {
                                field.onChange(['none']);
                              } else {
                                // Remove "none" if selecting another option
                                const newValue = currentValue.filter(v => v !== 'none');
                                field.onChange([...newValue, option.value]);
                              }
                            } else {
                              field.onChange(currentValue.filter((value) => value !== option.value));
                            }
                          }}
                        />
                        <label
                          htmlFor={`medical-${option.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={personalInfoForm.control}
          name="servicesDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Services Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Tell us about your experience and services..." 
                  className="min-h-[120px]"
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Tell us about your experience with medical transportation, any special training, and why you want to join MyAmbulex.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );

  // Render vehicle information form
  const renderVehicleForm = () => {
    // Debug what's in the form
    const formValues = vehicleForm.getValues();
    console.log("Vehicle form values:", formValues);
    
    // Force using watch to ensure the form reactivity works properly
    const vehicleType = vehicleForm.watch('vehicleType');
    
    return (
      <Form {...vehicleForm} key={`vehicle-form-${currentStep}`}>
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={vehicleForm.control}
              name="make"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Make</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Toyota"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
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
                  <FormLabel>Vehicle Model</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Sienna"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
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
                    <NumberInput 
                      min={1990} 
                      max={new Date().getFullYear() + 1}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Vehicle year"
                    />
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
                    <Input 
                      placeholder="e.g. White"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
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
                    <Input 
                      placeholder="License plate number"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={vehicleForm.control}
              name="vehicleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="standard">Ambulatory</SelectItem>
                      <SelectItem value="wheelchair">Wheelchair Accessible</SelectItem>
                      <SelectItem value="stretcher">Stretcher Equipped</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <NumberInput 
                      min={1}
                      max={vehicleForm.watch('vehicleType') === 'standard' ? 8 : 2}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Number of passengers"
                    />
                  </FormControl>
                  <FormDescription>
                    {vehicleForm.watch('vehicleType') !== 'standard' && 
                      "Wheelchair/stretcher vehicles are limited to 2 passengers max"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {vehicleForm.watch('vehicleType') === 'wheelchair' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={vehicleForm.control}
                name="wheelchairCapacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wheelchair Capacity</FormLabel>
                    <FormControl>
                      <NumberInput 
                        min={0}
                        max={2}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Wheelchair capacity"
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum of 2 wheelchairs per vehicle
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={vehicleForm.control}
                name="hasRamp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wheelchair Ramp</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === 'yes' ? true : false)} 
                      value={field.value === true ? 'yes' : 'no'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Does vehicle have a ramp?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={vehicleForm.control}
                name="hasLift"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wheelchair Lift</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === 'yes' ? true : false)} 
                      value={field.value === true ? 'yes' : 'no'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Does vehicle have a lift?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
          
          {vehicleForm.watch('vehicleType') === 'stretcher' && (
            <FormField
              control={vehicleForm.control}
              name="stretcherCapacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stretcher Capacity</FormLabel>
                  <FormControl>
                    <NumberInput 
                      min={0}
                      max={2}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Stretcher capacity"
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum of 2 stretchers per vehicle
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </form>
      </Form>
    );
  };

  // Render centralized document management section
  const renderDocumentUpload = () => (
    <CentralizedDocumentManager
      onDocumentChange={handleDocumentUpload}
      uploadedDocuments={uploadedDocuments}
    />
  );

  // Render review summary
  const renderReview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            {formData && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">License Number:</div>
                  <div className="text-sm">{formData.licenseNumber}</div>
                  
                  <div className="text-sm font-medium">License State:</div>
                  <div className="text-sm">{formData.licenseState}</div>
                  
                  <div className="text-sm font-medium">License Expiry:</div>
                  <div className="text-sm">
                    {formData.licenseExpiry 
                      ? format(new Date(formData.licenseExpiry), 'PPP') 
                      : 'Not provided'}
                  </div>
                  
                  <div className="text-sm font-medium">Insurance Provider:</div>
                  <div className="text-sm">{formData.insuranceProvider}</div>
                  
                  <div className="text-sm font-medium">Insurance Number:</div>
                  <div className="text-sm">{formData.insuranceNumber}</div>
                  
                  <div className="text-sm font-medium">Insurance Expiry:</div>
                  <div className="text-sm">
                    {formData.insuranceExpiry 
                      ? format(new Date(formData.insuranceExpiry), 'PPP') 
                      : 'Not provided'}
                  </div>
                  
                  <div className="text-sm font-medium">Years of Experience:</div>
                  <div className="text-sm">{formData.yearsOfExperience}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium mb-1">Services Description:</div>
                  <div className="text-sm">{formData.servicesDescription || 'None provided'}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent>
            {vehicleData && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">Make:</div>
                <div className="text-sm">{vehicleData.make}</div>
                
                <div className="text-sm font-medium">Model:</div>
                <div className="text-sm">{vehicleData.model}</div>
                
                <div className="text-sm font-medium">Year:</div>
                <div className="text-sm">{vehicleData.year}</div>
                
                <div className="text-sm font-medium">Color:</div>
                <div className="text-sm">{vehicleData.color}</div>
                
                <div className="text-sm font-medium">License Plate:</div>
                <div className="text-sm">{vehicleData.licensePlate}</div>
                
                <div className="text-sm font-medium">Vehicle Type:</div>
                <div className="text-sm capitalize">{vehicleData.vehicleType}</div>
                
                <div className="text-sm font-medium">Passenger Capacity:</div>
                <div className="text-sm">{vehicleData.capacity}</div>
                
                {vehicleData.vehicleType === 'wheelchair' && (
                  <>
                    <div className="text-sm font-medium">Wheelchair Capacity:</div>
                    <div className="text-sm">{vehicleData.wheelchairCapacity || 'Not specified'}</div>
                    
                    <div className="text-sm font-medium">Has Ramp:</div>
                    <div className="text-sm">{vehicleData.hasRamp === true ? 'Yes' : vehicleData.hasRamp === false ? 'No' : 'Not specified'}</div>
                    
                    <div className="text-sm font-medium">Has Lift:</div>
                    <div className="text-sm">{vehicleData.hasLift === true ? 'Yes' : vehicleData.hasLift === false ? 'No' : 'Not specified'}</div>
                  </>
                )}
                
                {vehicleData.vehicleType === 'stretcher' && (
                  <>
                    <div className="text-sm font-medium">Stretcher Capacity:</div>
                    <div className="text-sm">{vehicleData.stretcherCapacity || 'Not specified'}</div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Availability Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(availabilitySettings).map(([period, settings]) => (
                <div key={period} className="flex justify-between items-center">
                  <div className="text-sm font-medium capitalize">
                    {period === 'weekdays' ? 'Weekdays (Mon-Fri)' : 
                     period === 'weekends' ? 'Weekends (Sat-Sun)' :
                     period === 'evenings' ? 'Evenings' : 'Overnight'}
                  </div>
                  <div className="text-sm">
                    {settings.available ? `${settings.startTime} - ${settings.endTime}` : 'Not available'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-md">
              <div className="font-medium mb-1">Driver's License (Front)</div>
              <div className="text-sm text-muted-foreground">
                {isDocumentUploaded('licensePhotoFront') ? 'Uploaded' : 'Not uploaded'}
              </div>
            </div>
            
            <div className="p-4 border rounded-md">
              <div className="font-medium mb-1">Driver's License (Back)</div>
              <div className="text-sm text-muted-foreground">
                {isDocumentUploaded('licensePhotoBack') ? 'Uploaded' : 'Not uploaded'}
              </div>
            </div>
            
            <div className="p-4 border rounded-md">
              <div className="font-medium mb-1">Insurance Document</div>
              <div className="text-sm text-muted-foreground">
                {isDocumentUploaded('insuranceDocument') ? 'Uploaded' : 'Not uploaded'}
              </div>
            </div>
            
            <div className="p-4 border rounded-md">
              <div className="font-medium mb-1">Vehicle Registration</div>
              <div className="text-sm text-muted-foreground">
                {isDocumentUploaded('vehicleRegistration') ? 'Uploaded' : 'Not uploaded'}
              </div>
            </div>

            <div className="p-4 border rounded-md">
              <div className="font-medium mb-1">Motor Vehicle Record</div>
              <div className="text-sm text-muted-foreground">
                {isDocumentUploaded('mvrRecord') ? 'Uploaded' : 'Not uploaded'}
              </div>
            </div>
            
            <div className="p-4 border rounded-md">
              <div className="font-medium mb-1">Background Check</div>
              <div className="text-sm text-muted-foreground">
                {isDocumentUploaded('backgroundCheck') ? 'Uploaded' : 'Not uploaded'}
              </div>
            </div>
            
            <div className="p-4 border rounded-md">
              <div className="font-medium mb-1">Drug Test Results</div>
              <div className="text-sm text-muted-foreground">
                {isDocumentUploaded('drugTestResults') ? 'Uploaded' : 'Not uploaded'}
              </div>
            </div>
            
            <div className="p-4 border rounded-md">
              <div className="font-medium mb-1">Certifications</div>
              <div className="text-sm text-muted-foreground">
                {isDocumentUploaded('certifications') ? 'Uploaded' : 'Not uploaded'}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/50">
          <div className="text-sm text-muted-foreground">
            By submitting this application, you confirm that all the information provided is accurate and truthful. 
            Your application will be reviewed by our team, and you will be notified about the status within 1-3 business days.
          </div>
        </CardFooter>
      </Card>
    </div>
  );

  // Render availability settings form
  const renderAvailabilitySettings = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Set Your Availability
        </CardTitle>
        <CardDescription>
          Configure when you're available to accept rides. You can always update this later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(availabilitySettings).map(([period, settings]) => (
          <div key={period} className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id={period}
                checked={settings.available}
                onChange={(e) => setAvailabilitySettings(prev => ({
                  ...prev,
                  [period as keyof typeof prev]: { 
                    ...prev[period as keyof typeof prev], 
                    available: e.target.checked 
                  }
                }))}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor={period} className="text-sm font-medium capitalize">
                {period === 'weekdays' ? 'Weekdays (Mon-Fri)' : 
                 period === 'weekends' ? 'Weekends (Sat-Sun)' :
                 period === 'evenings' ? 'Evenings' : 'Overnight'}
              </label>
            </div>
            
            {settings.available && (
              <div className="ml-7 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={settings.startTime}
                    onChange={(e) => setAvailabilitySettings(prev => ({
                      ...prev,
                      [period as keyof typeof prev]: { 
                        ...prev[period as keyof typeof prev], 
                        startTime: e.target.value 
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={settings.endTime}
                    onChange={(e) => setAvailabilitySettings(prev => ({
                      ...prev,
                      [period as keyof typeof prev]: { 
                        ...prev[period as keyof typeof prev], 
                        endTime: e.target.value 
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Availability Tips</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• You can update your availability anytime from your dashboard</li>
            <li>• More availability = more ride opportunities</li>
            <li>• You'll only receive notifications during your available hours</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );

  // Render payment setup form
  const renderPaymentSetup = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Account Setup
        </CardTitle>
        <CardDescription>
          Set up your payment account to receive earnings from completed rides. This is required to receive payments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <StripeConnectOnboarding />
        
        <div className="mt-6 bg-green-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-green-900 mb-2">🔒 Secure Payment Processing</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• All payments are processed securely through Stripe</li>
            <li>• Earnings are deposited directly to your bank account</li>
            <li>• You can track all payments in your dashboard</li>
            <li>• Setup takes just a few minutes with your bank details</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderPersonalInfoForm();
      case 1:
        return renderVehicleForm();
      case 2:
        return renderAvailabilitySettings();
      case 3:
        return renderPaymentSetup();
      case 4:
        return renderDocumentUpload();
      case 5:
        return renderReview();
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      <StepIndicator 
        currentStep={currentStep} 
        steps={steps} 
        onStepClick={(stepIndex) => setCurrentStep(stepIndex)}
      />
      
      <div className="mb-8">
        {renderStepContent()}
      </div>
      
      <div className="flex justify-between pt-4 border-t">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || isSubmitting}
            className="flex items-center"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          
          <Button
            variant="ghost"
            onClick={handleSaveAndExit}
            disabled={isSubmitting}
            className="flex items-center text-muted-foreground"
          >
            Save & Exit
          </Button>
        </div>
        
        {currentStep < steps.length - 1 ? (
          <Button onClick={handleNext} disabled={isSubmitting} className="flex items-center">
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting} 
            className="flex items-center"
          >
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Submitting...
              </>
            ) : (
              <>Submit Application</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}