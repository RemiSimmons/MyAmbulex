import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, User as UserIcon, ArrowLeft, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLocation } from "wouter";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [, setLocation] = useLocation();

  // Fetch the full user data
  const { data: userData, isLoading } = useQuery<User>({
    queryKey: ["/api/user/profile"],
    enabled: !!user,
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: userData?.fullName || "",
      email: userData?.email || "",
      phone: userData?.phone || "",
    },
    values: {
      fullName: userData?.fullName || "",
      email: userData?.email || "",
      phone: userData?.phone || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const response = await apiRequest("PATCH", "/api/user/profile", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile information has been successfully updated.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error) => {
      toast({
        title: "Error updating profile",
        description: "There was a problem updating your profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: ProfileFormValues) {
    updateProfileMutation.mutate(data);
  }

  if (isLoading || !userData) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const initials = userData.fullName
    ? userData.fullName.split(" ").map((n: string) => n[0]).join("")
    : userData.username.substring(0, 1).toUpperCase();

  const handleBackNavigation = () => {
    // Navigate back based on user role
    if (userData.role === "rider") {
      setLocation("/rider/dashboard");
    } else if (userData.role === "driver") {
      setLocation("/driver/dashboard");
    } else if (userData.role === "admin") {
      setLocation("/admin/dashboard");
    } else {
      setLocation("/"); // Fallback to home
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex flex-col space-y-6">
        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBackNavigation}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleLogout}
            className="flex items-center gap-1"
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4 mr-1" />
            )}
            Logout
          </Button>
        </div>
      
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={userData.profileImageUrl || ''} />
              <AvatarFallback className="text-3xl bg-primary/10">{initials}</AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 p-1 bg-primary rounded-full text-white">
              <Camera className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{userData.fullName || userData.username}</h1>
            <p className="text-muted-foreground">
              {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)} account
            </p>
            {userData.createdAt && (
              <p className="text-sm text-muted-foreground">
                Member since {new Date(userData.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profile Information</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Update your personal details
                  </CardDescription>
                </div>
                <Button 
                  variant={isEditing ? "ghost" : "default"} 
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? "Cancel" : "Edit Profile"}
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                {isEditing ? (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your full name" {...field} />
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
                              <Input placeholder="Enter your email" {...field} />
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
                              <Input placeholder="Enter your phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end gap-3">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsEditing(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={updateProfileMutation.isPending}
                        >
                          {updateProfileMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Username</Label>
                        <p className="font-medium">{userData.username}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Full Name</Label>
                        <p className="font-medium">{userData.fullName || "Not set"}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Email</Label>
                        <p className="font-medium">{userData.email || "Not set"}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Phone</Label>
                        <p className="font-medium">{userData.phone || "Not set"}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Account Type</Label>
                        <p className="font-medium capitalize">{userData.role}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Account Status</Label>
                        <p className="font-medium capitalize">{userData.accountStatus}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>User Preferences</CardTitle>
                <CardDescription>
                  Customize your app experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Preferred Language</Label>
                    <p className="font-medium">{userData.preferredLanguage || "English"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Timezone</Label>
                    <p className="font-medium">{userData.timezone || "UTC"}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-sm text-muted-foreground">
                  Additional preference settings will be available soon.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}