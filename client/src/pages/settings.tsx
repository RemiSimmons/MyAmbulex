import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { NotificationPreferencesSettings } from "@/components/notification-preferences";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, CreditCard, Shield, Bell, User as UserIcon, Crown, Calendar, DollarSign } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@shared/schema";

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("membership");

  // Fetch the full user data including notification preferences
  const { data: userData, isLoading } = useQuery<User>({
    queryKey: ["/api/user/settings"],
    enabled: !!user,
  });

  if (isLoading || !userData) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const initials = userData.fullName
    ? userData.fullName.split(" ").map((n: string) => n[0]).join("")
    : "?";

  const notificationPreferences = userData.notificationPreferences as {
    email: boolean;
    sms: boolean;
    push: boolean;
  } || { email: true, sms: true, push: true };

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-8">
        <Avatar className="h-20 w-20">
          <AvatarImage src={userData.profileImageUrl || ''} />
          <AvatarFallback className="text-2xl bg-primary/10">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences and billing
          </p>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="membership" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Membership
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            MyPayments
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <div className="mt-8 space-y-6">
          <TabsContent value="membership" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-primary" />
                      Beta Founding Member
                    </CardTitle>
                    <CardDescription>
                      You're part of our exclusive beta testing program
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">∞</div>
                    <p className="text-sm text-muted-foreground">Free Rides</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">0%</div>
                    <p className="text-sm text-muted-foreground">Platform Fees</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">24/7</div>
                    <p className="text-sm text-muted-foreground">Priority Support</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Beta Benefits</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• No platform fees during beta testing period</li>
                    <li>• Priority customer support and direct feedback channel</li>
                    <li>• Early access to new features and updates</li>
                    <li>• Lifetime founding member recognition</li>
                    <li>• Exclusive beta tester rewards and perks</li>
                  </ul>
                </div>
                
                <div className="pt-4">
                  <Button variant="outline" className="w-full">
                    View Beta Terms & Benefits
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Statistics</CardTitle>
                <CardDescription>Your MyAmbulex activity summary</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="text-xl font-semibold">0</div>
                    <p className="text-sm text-muted-foreground">Rides Booked</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <DollarSign className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <div className="text-xl font-semibold">$0</div>
                    <p className="text-sm text-muted-foreground">Total Saved</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <UserIcon className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-xl font-semibold">Rider</div>
                    <p className="text-sm text-muted-foreground">Account Type</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Crown className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
                    <div className="text-xl font-semibold">Beta</div>
                    <p className="text-sm text-muted-foreground">Member Status</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>
                  Manage your payment options for rides
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h4 className="font-semibold mb-2">No Payment Methods Added</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add a payment method to book rides quickly and securely
                  </p>
                  <Button>Add Payment Method</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>
                  View your past transactions and receipts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-4">
                    <Calendar className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">No billing history yet</p>
                    <p className="text-xs">Your ride payments will appear here</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Beta Testing Benefits</CardTitle>
                <CardDescription>
                  Special pricing during beta period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <div>
                      <p className="font-semibold text-green-800">Platform Fees Waived</p>
                      <p className="text-sm text-green-600">0% platform fees during beta testing</p>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <div>
                      <p className="font-semibold text-blue-800">Priority Support</p>
                      <p className="text-sm text-blue-600">24/7 dedicated beta tester support</p>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Included
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to be notified about your rides and account updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NotificationPreferencesSettings 
                  initialPreferences={notificationPreferences}
                  userId={userData.id}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Notification Types</CardTitle>
                <CardDescription>
                  Manage which types of notifications you receive
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Ride Updates</p>
                      <p className="text-sm text-muted-foreground">Driver assignment, pickup status, arrival notifications</p>
                    </div>
                    <Badge variant="secondary">Always On</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Payment Confirmations</p>
                      <p className="text-sm text-muted-foreground">Payment processed, receipts, refund notifications</p>
                    </div>
                    <Badge variant="secondary">Always On</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Account Security</p>
                      <p className="text-sm text-muted-foreground">Login alerts, password changes, security updates</p>
                    </div>
                    <Badge variant="secondary">Always On</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Promotional Updates</p>
                      <p className="text-sm text-muted-foreground">New features, special offers, beta program updates</p>
                    </div>
                    <Button variant="outline" size="sm">Manage</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Security</CardTitle>
                <CardDescription>
                  Manage your password and security preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-muted-foreground">Last changed: Never</p>
                  </div>
                  <Button variant="outline">Change Password</Button>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Verification</p>
                    <p className="text-sm text-muted-foreground">
                      {userData.emailVerified ? 'Email verified' : 'Email not verified'}
                    </p>
                  </div>
                  {userData.emailVerified ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Verified</Badge>
                  ) : (
                    <Button variant="outline" size="sm">Verify Email</Button>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Phone Verification</p>
                    <p className="text-sm text-muted-foreground">
                      {userData.phoneVerified ? 'Phone verified' : 'Phone not verified'}
                    </p>
                  </div>
                  {userData.phoneVerified ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Verified</Badge>
                  ) : (
                    <Button variant="outline" size="sm">Verify Phone</Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>
                  Control your privacy and data preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Location Sharing</p>
                      <p className="text-sm text-muted-foreground">Share location with drivers during active rides</p>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">Required</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Data Analytics</p>
                      <p className="text-sm text-muted-foreground">Help improve the service with usage analytics</p>
                    </div>
                    <Button variant="outline" size="sm">Manage</Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Marketing Communications</p>
                      <p className="text-sm text-muted-foreground">Receive updates about new features and offers</p>
                    </div>
                    <Button variant="outline" size="sm">Manage</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Actions</CardTitle>
                <CardDescription>
                  Manage your account data and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    Download My Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Export Account Information
                  </Button>
                  <Separator />
                  <Button variant="destructive" className="w-full justify-start">
                    Delete Account
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Account deletion is permanent and cannot be undone. All your ride history and data will be permanently removed.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}