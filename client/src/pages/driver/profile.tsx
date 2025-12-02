import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { User, DriverDetails, UserProfile, insertDriverDetailsSchema } from '@shared/schema';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePicker } from '@/components/ui/date-picker';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User as UserIcon, 
  Calendar, 
  Car, 
  Phone, 
  Mail, 
  Award, 
  FileText, 
  MapPin,
  Globe,
  Clock,
  Languages,
  FileCheck,
  Star,
  Pencil,
  Upload
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Link } from 'wouter';
import { format, isValid } from 'date-fns';

// Extended schema for driver profile
const extendedDriverSchema = insertDriverDetailsSchema.extend({
  fullName: z.string().min(3, "Name must be at least 3 characters"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email"),
  licenseExpiry: z.date(),
  insuranceExpiry: z.date(),
  medicalTrainingLevel: z.enum(["none", "first_aid", "cpr_certified", "emt_basic", "emt_advanced", "paramedic"]),
  biography: z.string().max(500, "Biography must be 500 characters or less").optional(),
  languages: z.array(z.string()).optional().default(["English"]),
  certifications: z.array(z.object({
    name: z.string(),
    issuedBy: z.string(),
    expiryDate: z.date().optional(),
  })).optional().default([]),
});

type DriverProfileFormValues = z.infer<typeof extendedDriverSchema>;

export default function DriverProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  
  // Fetch the driver details
  const { data: driverDetails, isLoading: driverLoading } = useQuery<DriverDetails>({
    queryKey: ['/api/driver-details'],
    enabled: !!user,
  });
  
  // Fetch the user profile
  const { data: userProfile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['/api/user-profile'],
    enabled: !!user,
  });
  
  // Fetch the driver's vehicles
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['/api/driver/vehicles'],
    enabled: !!user,
  });
  
  const form = useForm<DriverProfileFormValues>({
    resolver: zodResolver(extendedDriverSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      userId: user?.id,
      licenseNumber: driverDetails?.licenseNumber || '',
      licenseState: driverDetails?.licenseState || '',
      licenseExpiry: driverDetails?.licenseExpiry ? new Date(driverDetails.licenseExpiry) : new Date(),
      licenseClass: driverDetails?.licenseClass || '',
      insuranceProvider: driverDetails?.insuranceProvider || '',
      insuranceNumber: driverDetails?.insuranceNumber || '',
      insuranceExpiry: driverDetails?.insuranceExpiry ? new Date(driverDetails.insuranceExpiry) : new Date(),
      serviceArea: driverDetails?.serviceArea || {},
      serviceHours: driverDetails?.serviceHours || {},
      backgroundCheckStatus: driverDetails?.backgroundCheckStatus || 'pending',
      accountStatus: driverDetails?.accountStatus || 'pending',
      yearsOfExperience: driverDetails?.yearsOfExperience || 0,
      medicalTrainingLevel: driverDetails?.medicalTrainingLevel || 'none',
      biography: driverDetails?.biography || '',
      languages: driverDetails?.languages as string[] || ['English'],
      certifications: driverDetails?.certifications as any[] || [],
      preferredVehicleTypes: driverDetails?.preferredVehicleTypes as string[] || ['standard'],
      maxTravelDistance: driverDetails?.maxTravelDistance || 25,
    },
  });
  
  // Update form when driver data is loaded
  useEffect(() => {
    if (user && driverDetails) {
      form.reset({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        userId: user.id,
        licenseNumber: driverDetails.licenseNumber,
        licenseState: driverDetails.licenseState,
        licenseExpiry: driverDetails.licenseExpiry ? new Date(driverDetails.licenseExpiry) : new Date(),
        licenseClass: driverDetails.licenseClass || '',
        insuranceProvider: driverDetails.insuranceProvider,
        insuranceNumber: driverDetails.insuranceNumber,
        insuranceExpiry: driverDetails.insuranceExpiry ? new Date(driverDetails.insuranceExpiry) : new Date(),
        serviceArea: driverDetails.serviceArea,
        serviceHours: driverDetails.serviceHours,
        backgroundCheckStatus: driverDetails.backgroundCheckStatus,
        accountStatus: driverDetails.accountStatus,
        yearsOfExperience: driverDetails.yearsOfExperience || 0,
        medicalTrainingLevel: driverDetails.medicalTrainingLevel || 'none',
        biography: driverDetails.biography || '',
        languages: driverDetails.languages as string[] || ['English'],
        certifications: driverDetails.certifications as any[] || [],
        preferredVehicleTypes: driverDetails.preferredVehicleTypes as string[] || ['standard'],
        maxTravelDistance: driverDetails.maxTravelDistance || 25,
      });
      
      // Calculate profile completion
      calculateProfileCompletion();
    }
  }, [user, driverDetails, form]);
  
  const calculateProfileCompletion = () => {
    if (!driverDetails) return;
    
    const requiredFields = [
      driverDetails.licenseNumber,
      driverDetails.licenseState,
      driverDetails.licenseExpiry,
      driverDetails.insuranceProvider,
      driverDetails.insuranceNumber,
      driverDetails.insuranceExpiry,
      driverDetails.serviceArea,
      driverDetails.serviceHours,
    ];
    
    const optionalFields = [
      driverDetails.licenseClass,
      driverDetails.licensePhotoFront,
      driverDetails.licensePhotoBack,
      driverDetails.insuranceDocumentUrl,
      driverDetails.yearsOfExperience,
      driverDetails.medicalTrainingLevel !== 'none' ? 1 : 0,
      driverDetails.certifications && (driverDetails.certifications as any[]).length > 0 ? 1 : 0,
      driverDetails.preferredVehicleTypes,
      driverDetails.maxTravelDistance,
      driverDetails.biography,
      driverDetails.profilePhoto,
      driverDetails.languages && (driverDetails.languages as string[]).length > 1 ? 1 : 0,
    ];
    
    const requiredCount = requiredFields.filter(f => f).length;
    const optionalCount = optionalFields.filter(f => f).length;
    
    const requiredWeight = 0.7;
    const optionalWeight = 0.3;
    
    const requiredCompletion = requiredFields.length > 0 ? (requiredCount / requiredFields.length) * requiredWeight : 0;
    const optionalCompletion = optionalFields.length > 0 ? (optionalCount / optionalFields.length) * optionalWeight : 0;
    
    setProfileCompletion(Math.round((requiredCompletion + optionalCompletion) * 100));
  };
  
  async function onSubmit(data: DriverProfileFormValues) {
    try {
      // Update basic user info
      await apiRequest('PATCH', '/api/user', {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
      });
      
      // Update driver details
      const driverData = {
        userId: user!.id,
        licenseNumber: data.licenseNumber,
        licenseState: data.licenseState,
        licenseExpiry: data.licenseExpiry,
        licenseClass: data.licenseClass,
        insuranceProvider: data.insuranceProvider,
        insuranceNumber: data.insuranceNumber,
        insuranceExpiry: data.insuranceExpiry,
        serviceArea: data.serviceArea,
        serviceHours: data.serviceHours,
        yearsOfExperience: data.yearsOfExperience,
        medicalTrainingLevel: data.medicalTrainingLevel,
        biography: data.biography,
        languages: data.languages,
        certifications: data.certifications,
        preferredVehicleTypes: data.preferredVehicleTypes,
        maxTravelDistance: data.maxTravelDistance,
      };
      
      await apiRequest('PUT', '/api/driver-details', driverData);
      
      // Invalidate cached data
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/driver-details'] });
      
      toast({
        title: "Profile updated",
        description: "Your driver profile has been successfully updated.",
      });
      
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error updating profile",
        description: error instanceof Error ? error.message : "An error occurred while updating your profile",
        variant: "destructive",
      });
    }
  }
  
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'Not set';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (!isValid(date)) return 'Invalid date';
    return format(date, 'MMM d, yyyy');
  };
  
  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Verified</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      default:
        return <Badge variant="outline">Not verified</Badge>;
    }
  };
  
  const getMedicalTrainingDisplay = (level: string) => {
    switch (level) {
      case 'first_aid':
        return 'First Aid Certified';
      case 'cpr_certified':
        return 'CPR Certified';
      case 'emt_basic':
        return 'EMT Basic';
      case 'emt_advanced':
        return 'EMT Advanced';
      case 'paramedic':
        return 'Paramedic';
      default:
        return 'None';
    }
  };
  
  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('')
    : '?';
  
  if (driverLoading || profileLoading || vehiclesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={driverDetails?.profilePhoto || user?.profileImageUrl || ''} />
            <AvatarFallback className="text-2xl bg-primary/10">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{user?.fullName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">Driver</Badge>
              {getVerificationBadge(driverDetails?.backgroundCheckStatus || 'pending')}
              {driverDetails?.completedRides && driverDetails.completedRides > 0 && (
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                  {driverDetails.completedRides} Rides
                </Badge>
              )}
            </div>
          </div>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            Cancel Editing
          </Button>
        )}
      </div>
      
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">Profile Completion: {profileCompletion}%</p>
          {profileCompletion < 100 && (
            <Badge variant="outline" className="font-normal">Incomplete</Badge>
          )}
        </div>
        <Progress value={profileCompletion} className="h-2" />
      </div>
      
      <Tabs defaultValue="driver">
        <TabsList className="mb-4">
          <TabsTrigger value="driver">Driver Information</TabsTrigger>
          <TabsTrigger value="license">License & Insurance</TabsTrigger>
          <TabsTrigger value="vehicles">My Vehicles</TabsTrigger>
          <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
        </TabsList>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <TabsContent value="driver">
              <Card>
                <CardHeader>
                  <CardTitle>Driver Information</CardTitle>
                  <CardDescription>
                    Your basic information and driver preferences.
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your full name" 
                              {...field} 
                              disabled={!isEditing}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your email address" 
                              {...field} 
                              disabled={!isEditing}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your phone number" 
                              {...field} 
                              disabled={!isEditing}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="yearsOfExperience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Years of Experience</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              min="0"
                              placeholder="Years of driving experience" 
                              {...field} 
                              disabled={!isEditing}
                              value={field.value || 0}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="biography"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Biography</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Introduce yourself to potential riders" 
                            {...field} 
                            disabled={!isEditing}
                            className="min-h-[120px]"
                          />
                        </FormControl>
                        <FormDescription>
                          Briefly describe your experience, qualifications, and why riders should choose you.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Work Preferences</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="maxTravelDistance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maximum Travel Distance (miles)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                min="1"
                                max="150"
                                placeholder="Max distance you're willing to travel" 
                                {...field} 
                                disabled={!isEditing}
                                value={field.value || 25}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="medicalTrainingLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Medical Training Level</FormLabel>
                            <Select
                              disabled={!isEditing}
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your level of medical training" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="first_aid">First Aid Certified</SelectItem>
                                <SelectItem value="cpr_certified">CPR Certified</SelectItem>
                                <SelectItem value="emt_basic">EMT Basic</SelectItem>
                                <SelectItem value="emt_advanced">EMT Advanced</SelectItem>
                                <SelectItem value="paramedic">Paramedic</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
                
                {isEditing && (
                  <CardFooter>
                    <Button type="submit" className="ml-auto">
                      Save Changes
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>
            
            <TabsContent value="license">
              <Card>
                <CardHeader>
                  <CardTitle>License & Insurance</CardTitle>
                  <CardDescription>
                    Your driving credentials and insurance information.
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium">Driver's License</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="licenseNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>License Number</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Your driver's license number" 
                                {...field} 
                                disabled={!isEditing}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="licenseState"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State of Issue</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="State where license was issued" 
                                {...field} 
                                disabled={!isEditing}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="licenseClass"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>License Class</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="License class (e.g., A, B, C, D)" 
                                {...field} 
                                disabled={!isEditing}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="licenseExpiry"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Expiration Date</FormLabel>
                            <DatePicker
                              date={field.value}
                              setDate={field.onChange}
                              disabled={!isEditing}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {isEditing && (
                      <div className="grid grid-cols-1 gap-4">
                        <FormItem>
                          <FormLabel>License Photo (Front)</FormLabel>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" type="button" className="w-full">
                              <Upload className="h-4 w-4 mr-2" /> Upload Front Photo
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                        
                        <FormItem>
                          <FormLabel>License Photo (Back)</FormLabel>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" type="button" className="w-full">
                              <Upload className="h-4 w-4 mr-2" /> Upload Back Photo
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium">Insurance Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="insuranceProvider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Insurance Provider</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Your insurance company" 
                                {...field} 
                                disabled={!isEditing}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="insuranceNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Policy Number</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Your insurance policy number" 
                                {...field} 
                                disabled={!isEditing}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="insuranceExpiry"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Policy Expiration</FormLabel>
                            <DatePicker
                              date={field.value}
                              setDate={field.onChange}
                              disabled={!isEditing}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {isEditing && (
                      <FormItem>
                        <FormLabel>Insurance Document</FormLabel>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" type="button" className="w-full">
                            <Upload className="h-4 w-4 mr-2" /> Upload Insurance Document
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Verification Status</h3>
                    
                    <div className="bg-muted p-4 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Background Check</p>
                          <p className="text-sm text-muted-foreground">
                            Last updated: {driverDetails?.backgroundCheckDate ? formatDate(driverDetails.backgroundCheckDate) : 'Not completed'}
                          </p>
                        </div>
                        {getVerificationBadge(driverDetails?.backgroundCheckStatus || 'pending')}
                      </div>
                    </div>
                    
                    <div className="bg-muted p-4 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Account Status</p>
                          <p className="text-sm text-muted-foreground">
                            This determines your ability to receive and accept ride requests
                          </p>
                        </div>
                        <Badge 
                          className={
                            driverDetails?.accountStatus === 'active' 
                              ? 'bg-green-100 text-green-800 hover:bg-green-100'
                              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                          }
                        >
                          {driverDetails?.accountStatus === 'active' ? 'Active' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
                
                {isEditing && (
                  <CardFooter>
                    <Button type="submit" className="ml-auto">
                      Save Changes
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>
          </form>
        </Form>
        
        <TabsContent value="vehicles">
          <Card>
            <CardHeader>
              <CardTitle>My Vehicles</CardTitle>
              <CardDescription>
                Manage your transportation vehicles for medical transport services.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {vehicles && vehicles.length > 0 ? (
                <div className="space-y-4">
                  {vehicles.map((vehicle: any) => (
                    <Card key={vehicle.id} className="overflow-hidden">
                      <div className="flex items-start p-4">
                        <div className="flex-shrink-0 mr-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Car className="h-6 w-6 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-base">{vehicle.year} {vehicle.make} {vehicle.model}</h4>
                            <Badge variant="outline" className="capitalize">{vehicle.vehicleType}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">License Plate: {vehicle.licensePlate}</p>
                          <p className="text-sm text-muted-foreground">Color: {vehicle.color}</p>
                          
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="secondary">Capacity: {vehicle.capacity}</Badge>
                            {vehicle.wheelchairCapacity > 0 && (
                              <Badge variant="secondary">Wheelchair: {vehicle.wheelchairCapacity}</Badge>
                            )}
                            {vehicle.stretcherCapacity > 0 && (
                              <Badge variant="secondary">Stretcher: {vehicle.stretcherCapacity}</Badge>
                            )}
                            {vehicle.hasRamp && (
                              <Badge variant="secondary">Has Ramp</Badge>
                            )}
                            {vehicle.hasLift && (
                              <Badge variant="secondary">Has Lift</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-muted/20 rounded-lg">
                  <Car className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-medium mb-2">No Vehicles Registered</h3>
                  <p className="text-muted-foreground mb-6">
                    You need to register at least one vehicle to start accepting ride requests.
                  </p>
                </div>
              )}
            </CardContent>
            
            <CardFooter>
              <Link href="/driver/vehicles/new">
                <Button>Add New Vehicle</Button>
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="qualifications">
          <Card>
            <CardHeader>
              <CardTitle>Professional Qualifications</CardTitle>
              <CardDescription>
                Your certifications, training, and professional credentials.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Award className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium">Medical Training</h3>
                </div>
                <p className="text-muted-foreground mb-3">
                  Your current medical training level is: 
                  <span className="font-medium text-foreground ml-1">
                    {getMedicalTrainingDisplay(driverDetails?.medicalTrainingLevel || 'none')}
                  </span>
                </p>
                {isEditing && (
                  <Button variant="outline" size="sm">
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Update Training Level
                  </Button>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Certifications & Credentials</h3>
                  {isEditing && (
                    <Button variant="outline" size="sm">
                      <FileCheck className="h-3.5 w-3.5 mr-1" /> Add Certification
                    </Button>
                  )}
                </div>
                
                {driverDetails?.certifications && (driverDetails.certifications as any[]).length > 0 ? (
                  <div className="space-y-3">
                    {(driverDetails.certifications as any[]).map((cert, index) => (
                      <div key={index} className="p-3 border rounded-md">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{cert.name}</h4>
                          {cert.expiryDate && (
                            <Badge variant="outline">
                              Expires: {formatDate(cert.expiryDate)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">Issued by: {cert.issuedBy}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-muted/20 rounded-lg">
                    <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <h4 className="text-base font-medium mb-1">No Certifications Added</h4>
                    <p className="text-sm text-muted-foreground">
                      Add your professional certifications to enhance your driver profile.
                    </p>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Languages Spoken</h3>
                  {isEditing && (
                    <Button variant="outline" size="sm">
                      <Languages className="h-3.5 w-3.5 mr-1" /> Add Language
                    </Button>
                  )}
                </div>
                
                {driverDetails?.languages && (driverDetails.languages as string[]).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(driverDetails.languages as string[]).map((lang, index) => (
                      <Badge key={index} variant="secondary">{lang}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No languages specified</p>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Performance Metrics</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Completed Rides</p>
                    <p className="text-2xl font-bold mt-1">{driverDetails?.completedRides || 0}</p>
                  </div>
                  
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Average Rating</p>
                    <div className="flex items-center mt-1">
                      <p className="text-2xl font-bold">{driverDetails?.averageRating?.toFixed(1) || 'N/A'}</p>
                      {driverDetails?.averageRating && (
                        <Star className="h-4 w-4 ml-1 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Cancellation Rate</p>
                    <p className="text-2xl font-bold mt-1">
                      {driverDetails?.completedRides && driverDetails.cancelledRides
                        ? `${(driverDetails.cancelledRides / (driverDetails.completedRides + driverDetails.cancelledRides) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}