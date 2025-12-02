import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { User, UserProfile, insertUserProfileSchema } from '@shared/schema';

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
  MapPin, 
  Phone, 
  Mail, 
  AlertCircle, 
  Heart, 
  BadgeHelp, 
  FileText,
  Plus,
  Pencil
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { format } from 'date-fns';
import AddressInput from '@/components/address-input';

// Extended schema for user profile
const extendedProfileSchema = insertUserProfileSchema.extend({
  fullName: z.string().min(3, "Name must be at least 3 characters"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email"),
  dateOfBirth: z.date().optional(),
  mobilityAids: z.array(z.string()).optional().default([]),
  frequentDestinations: z.array(z.object({
    name: z.string(),
    address: z.string(),
  })).optional().default([]),
});

type ProfileFormValues = z.infer<typeof extendedProfileSchema>;

export default function RiderProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  // Fetch the user profile
  const { data: userProfile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['/api/user-profile'],
    enabled: !!user,
  });
  
  // Fetch the saved addresses
  const { data: savedAddresses, isLoading: addressesLoading } = useQuery({
    queryKey: ['/api/saved-addresses'],
    enabled: !!user,
  });
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(extendedProfileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: userProfile?.address || '',
      city: userProfile?.city || '',
      state: userProfile?.state || '',
      zipCode: userProfile?.zipCode || '',
      emergencyContact: userProfile?.emergencyContact || '',
      emergencyPhone: userProfile?.emergencyPhone || '',
      medicalConditions: userProfile?.medicalConditions || '',
      accessibilityNeeds: userProfile?.accessibilityNeeds || '',
      dateOfBirth: userProfile?.dateOfBirth ? new Date(userProfile.dateOfBirth) : undefined,
      insuranceProvider: userProfile?.insuranceProvider || '',
      insuranceNumber: userProfile?.insuranceNumber || '',
      insuranceCoverageDetails: userProfile?.insuranceCoverageDetails || '',
      primaryPhysician: userProfile?.primaryPhysician || '',
      physicianPhone: userProfile?.physicianPhone || '',
      preferredHospital: userProfile?.preferredHospital || '',
      allergies: userProfile?.allergies || '',
      medications: userProfile?.medications || '',
      additionalNotes: userProfile?.additionalNotes || '',
      mobilityAids: userProfile?.mobilityAids as string[] || [],
      frequentDestinations: userProfile?.frequentDestinations as any[] || [],
    },
  });
  
  // Update form when profile data is loaded
  useEffect(() => {
    if (user && userProfile) {
      form.reset({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        address: userProfile.address || '',
        city: userProfile.city || '',
        state: userProfile.state || '',
        zipCode: userProfile.zipCode || '',
        emergencyContact: userProfile.emergencyContact || '',
        emergencyPhone: userProfile.emergencyPhone || '',
        medicalConditions: userProfile.medicalConditions || '',
        accessibilityNeeds: userProfile.accessibilityNeeds || '',
        dateOfBirth: userProfile.dateOfBirth ? new Date(userProfile.dateOfBirth) : undefined,
        insuranceProvider: userProfile.insuranceProvider || '',
        insuranceNumber: userProfile.insuranceNumber || '',
        insuranceCoverageDetails: userProfile.insuranceCoverageDetails || '',
        primaryPhysician: userProfile.primaryPhysician || '',
        physicianPhone: userProfile.physicianPhone || '',
        preferredHospital: userProfile.preferredHospital || '',
        allergies: userProfile.allergies || '',
        medications: userProfile.medications || '',
        additionalNotes: userProfile.additionalNotes || '',
        mobilityAids: userProfile.mobilityAids as string[] || [],
        frequentDestinations: userProfile.frequentDestinations as any[] || [],
      });
    }
  }, [user, userProfile, form]);
  
  async function onSubmit(data: ProfileFormValues) {
    try {
      // Update basic user info
      await apiRequest('PATCH', '/api/user', {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
      });
      
      // Update profile
      const profileData = {
        userId: user!.id,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        dateOfBirth: data.dateOfBirth,
        emergencyContact: data.emergencyContact,
        emergencyPhone: data.emergencyPhone,
        medicalConditions: data.medicalConditions,
        accessibilityNeeds: data.accessibilityNeeds,
        insuranceProvider: data.insuranceProvider,
        insuranceNumber: data.insuranceNumber,
        insuranceCoverageDetails: data.insuranceCoverageDetails,
        primaryPhysician: data.primaryPhysician,
        physicianPhone: data.physicianPhone,
        preferredHospital: data.preferredHospital,
        allergies: data.allergies,
        medications: data.medications,
        additionalNotes: data.additionalNotes,
        mobilityAids: data.mobilityAids,
        frequentDestinations: data.frequentDestinations,
      };
      
      await apiRequest('PUT', '/api/user-profile', profileData);
      
      // Invalidate cached data
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-profile'] });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
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
  
  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('')
    : '?';
  
  if (profileLoading || addressesLoading) {
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
            <AvatarImage src={user?.profileImageUrl || ''} />
            <AvatarFallback className="text-2xl bg-primary/10">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{user?.fullName}</h1>
            <Badge variant="outline" className="mt-1">Rider</Badge>
            {userProfile?.verificationStatus === 'verified' && (
              <Badge className="ml-2 mt-1 bg-green-100 text-green-800 hover:bg-green-100">Verified</Badge>
            )}
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
      
      <Tabs defaultValue="personal">
        <TabsList className="mb-4">
          <TabsTrigger value="personal">Personal Information</TabsTrigger>
          <TabsTrigger value="medical">Medical Information</TabsTrigger>
          <TabsTrigger value="locations">Saved Locations</TabsTrigger>
        </TabsList>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Manage your personal details and contact information.
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
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date of Birth</FormLabel>
                          <DatePicker
                            selected={field.value}
                            onSelect={field.onChange}
                            placeholder="Select your birth date"
                            ageRange={true}
                            disabled={!isEditing ? () => true : undefined}
                          />
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
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Address</h3>
                    
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your street address" 
                              {...field} 
                              disabled={!isEditing}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="City" 
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
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="State" 
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
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="ZIP Code" 
                                {...field} 
                                disabled={!isEditing}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Emergency Contact</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="emergencyContact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Emergency Contact Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Emergency contact name" 
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
                        name="emergencyPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Emergency Contact Phone</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Emergency contact phone" 
                                {...field} 
                                disabled={!isEditing}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="accessibilityNeeds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Accessibility Needs</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe any special accessibility needs or preferences" 
                            {...field} 
                            disabled={!isEditing}
                          />
                        </FormControl>
                        <FormDescription>
                          This information helps drivers prepare for your specific needs.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
            
            <TabsContent value="medical">
              <Card>
                <CardHeader>
                  <CardTitle>Medical Information</CardTitle>
                  <CardDescription>
                    This information is kept private and only used to ensure you receive appropriate care during transportation.
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="insuranceProvider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Provider</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your insurance provider" 
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
                          <FormLabel>Insurance Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your insurance number" 
                              {...field} 
                              disabled={!isEditing}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="insuranceCoverageDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Insurance Coverage Details</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Details about your insurance coverage" 
                            {...field} 
                            disabled={!isEditing}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="primaryPhysician"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Physician</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your primary doctor's name" 
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
                      name="physicianPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Physician's Phone</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your doctor's phone number" 
                              {...field} 
                              disabled={!isEditing}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="preferredHospital"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Hospital</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Your preferred hospital" 
                            {...field} 
                            disabled={!isEditing}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="medicalConditions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medical Conditions</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="List any medical conditions drivers should be aware of" 
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
                      name="allergies"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Allergies</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="List any allergies you have" 
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
                      name="medications"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Medications</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="List medications you're currently taking" 
                              {...field} 
                              disabled={!isEditing}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="additionalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Medical Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any other important medical information" 
                            {...field} 
                            disabled={!isEditing}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
        
        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle>Saved Locations</CardTitle>
              <CardDescription>
                Manage your frequently visited locations for easier booking.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {savedAddresses && savedAddresses.length > 0 ? (
                <div className="space-y-4">
                  {savedAddresses.map((address: any) => (
                    <Card key={address.id} className="overflow-hidden">
                      <div className="flex items-start p-4">
                        <div className="flex-shrink-0 mr-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-base">{address.name}</h4>
                            <Badge variant="outline">{address.addressType}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{address.address}</p>
                          <p className="text-sm text-muted-foreground">
                            {address.city}, {address.state} {address.zipCode}
                          </p>
                          {address.isDefault && (
                            <Badge className="mt-2 bg-blue-100 text-blue-800 hover:bg-blue-100">Default</Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-muted/20 rounded-lg">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-medium mb-2">No Saved Locations</h3>
                  <p className="text-muted-foreground mb-6">
                    You haven't saved any frequent destinations yet.
                  </p>
                </div>
              )}
            </CardContent>
            
            <CardFooter>
              <Link href="/rider/addresses/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Add New Location
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}