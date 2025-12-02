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
import { Loader2, CheckCircle, AlertCircle, Save, Upload } from "lucide-react";
import Footer from "@/components/layout/simple-footer";
import { DocumentUploadField } from "@/components/driver/document-upload-field";

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
  languages: z.array(z.string()).min(1, "At least one language is required"),
  
  // Terms acceptance
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions",
  }),
});

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
    (val) => !isNaN(Number(val)),
    { message: "Capacity must be a number" }
  ),
  wheelchairCapacity: z.string().optional(),
  stretcherCapacity: z.string().optional(),
  hasRamp: z.boolean().optional(),
  hasLift: z.boolean().optional(),
  photo: z.string().optional(),
});

type DriverDetailsFormValues = z.infer<typeof driverDetailsSchema>;
type VehicleFormValues = z.infer<typeof vehicleSchema>;

// Constants
const MEDICAL_TRAINING_OPTIONS = [
  { value: "none", label: "No Medical Training" },
  { value: "first_aid", label: "First Aid Certified" },
  { value: "cpr_certified", label: "CPR Certified" },
  { value: "emt_basic", label: "EMT - Basic" },
  { value: "emt_advanced", label: "EMT - Advanced" },
  { value: "paramedic", label: "Paramedic" },
];

const SERVICE_AREAS = [
  "Atlanta", "Savannah", "Augusta", "Columbus", "Macon", 
  "Athens", "Valdosta", "Albany", "Warner Robins", "Roswell"
];

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", 
  "Portuguese", "Russian", "Chinese", "Japanese", "Korean", "Other"
];

export default function DriverRegistration() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<DriverDetailsFormValues | null>(null);
  const [vehicleData, setVehicleData] = useState<VehicleFormValues | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistrationComplete, setIsRegistrationComplete] = useState<boolean>(false);

  // Form instances
  const driverDetailsForm = useForm<DriverDetailsFormValues>({
    resolver: zodResolver(driverDetailsSchema),
    defaultValues: {
      serviceHours: {},
      serviceArea: [],
      preferredVehicleTypes: [],
      languages: ["English"],
      acceptTerms: false,
    },
  });

  const vehicleForm = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      hasRamp: false,
      hasLift: false,
    },
  });

  // Check if user should be here
  useEffect(() => {
    if (!user) {
      setLocation("/auth?tab=register");
      return;
    }
    
    if (user.role !== "driver") {
      setLocation("/");
      return;
    }
  }, [user, setLocation]);

  // Mutation for driver details
  const driverDetailsMutation = useMutation({
    mutationFn: async (data: DriverDetailsFormValues) => {
      const response = await apiRequest("POST", "/api/drivers/details", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save driver details");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setIsSubmitting(false);
      setStep(2);
      
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

  // Mutation for vehicle details
  const vehicleMutation = useMutation({
    mutationFn: async (data: VehicleFormValues) => {
      const formattedData = {
        ...data,
        year: Number(data.year),
        capacity: Number(data.capacity),
        wheelchairCapacity: data.wheelchairCapacity ? Number(data.wheelchairCapacity) : 0,
        stretcherCapacity: data.stretcherCapacity ? Number(data.stretcherCapacity) : 0,
      };
      
      const response = await apiRequest("POST", "/api/vehicles", formattedData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save vehicle details");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setIsSubmitting(false);
      setIsRegistrationComplete(true);
      
      toast({
        title: "Registration complete!",
        description: "Your driver account is now pending verification. Redirecting to dashboard...",
      });
      
      setTimeout(() => {
        setLocation("/driver/dashboard");
      }, 2000);
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

  // Form submission handlers
  const onDriverDetailsSubmit = (data: DriverDetailsFormValues) => {
    setFormData(data);
    setIsSubmitting(true);
    driverDetailsMutation.mutate(data);
  };

  const onVehicleSubmit = (data: VehicleFormValues) => {
    if (isSubmitting) return;
    
    setVehicleData(data);
    setIsSubmitting(true);
    vehicleMutation.mutate(data);
  };

  if (!user || user.role !== "driver") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Driver Registration</h1>
            <p className="text-muted-foreground">Complete your profile to start accepting ride requests</p>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                1
              </div>
              <div className={`h-1 w-12 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                2
              </div>
            </div>
          </div>

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Driver Details</CardTitle>
                <CardDescription>
                  Please provide your professional information and qualifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...driverDetailsForm}>
                  <form onSubmit={driverDetailsForm.handleSubmit(onDriverDetailsSubmit)} className="space-y-6">
                    {/* License Information */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">License Information</h3>
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
                              <FormLabel>License State</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter state" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={driverDetailsForm.control}
                          name="licenseExpiry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>License Expiry Date</FormLabel>
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
                              <FormLabel>License Class (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Class C" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* Document Upload Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <FormField
                          control={driverDetailsForm.control}
                          name="licensePhotoFront"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>License Front Photo</FormLabel>
                              <FormControl>
                                <DocumentUploadField
                                  fieldName="licensePhotoFront"
                                  label="License Front Photo"
                                  value={field.value}
                                  onChange={field.onChange}
                                  accept="image/*"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={driverDetailsForm.control}
                          name="licensePhotoBack"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>License Back Photo</FormLabel>
                              <FormControl>
                                <DocumentUploadField
                                  fieldName="licensePhotoBack"
                                  label="License Back Photo"
                                  value={field.value}
                                  onChange={field.onChange}
                                  accept="image/*"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Insurance Information */}
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
                                <DocumentUploadField
                                  fieldName="insuranceDocumentUrl"
                                  label="Insurance Document"
                                  value={field.value}
                                  onChange={field.onChange}
                                  accept="image/*,application/pdf"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Professional Qualifications */}
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
                              <Select onValueChange={field.onChange} value={field.value || undefined}>
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
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Work Preferences */}
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
                        
                        <FormField
                          control={driverDetailsForm.control}
                          name="maxTravelDistance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Travel Distance (miles)</FormLabel>
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

                    {/* Terms and Conditions */}
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
                              I accept the terms and conditions for drivers
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <Button type="submit" disabled={isSubmitting} className="px-8">
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Continue to Vehicle Information"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Information</CardTitle>
                <CardDescription>
                  Tell us about the vehicle you'll be using for medical transportation
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
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select vehicle type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="standard">Standard Vehicle</SelectItem>
                                <SelectItem value="wheelchair">Wheelchair Accessible</SelectItem>
                                <SelectItem value="stretcher">Stretcher Capable</SelectItem>
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
                              <Input placeholder="e.g., Ford" {...field} />
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
                              <Input placeholder="e.g., Transit" {...field} />
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
                              <Input type="number" min="1990" max={new Date().getFullYear()} placeholder="e.g., 2020" {...field} />
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
                              <Input type="number" min="1" placeholder="Number of passengers" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={vehicleForm.control}
                        name="hasRamp"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Has wheelchair ramp</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={vehicleForm.control}
                        name="hasLift"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Has wheelchair lift</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={vehicleForm.control}
                      name="photo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Photo (Optional)</FormLabel>
                          <FormControl>
                            <DocumentUploadField
                              fieldName="photo"
                              label="Vehicle Photo"
                              value={field.value}
                              onChange={field.onChange}
                              accept="image/*"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-between">
                      <Button type="button" variant="outline" onClick={() => setStep(1)}>
                        Back
                      </Button>
                      <Button type="submit" disabled={isSubmitting} className="px-8">
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Completing Registration...
                          </>
                        ) : (
                          "Complete Registration"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {/* Success State */}
          {isRegistrationComplete && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-green-800 mb-2">Registration Complete!</h2>
                <p className="text-green-700 mb-4">
                  Your driver account has been submitted for verification. You'll receive an email once your account is approved.
                </p>
                <Button onClick={() => setLocation("/driver/dashboard")}>
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}