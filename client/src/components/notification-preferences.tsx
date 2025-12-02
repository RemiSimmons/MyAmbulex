import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Mail, Bell, MessageSquare } from "lucide-react";

interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
}

interface NotificationPreferencesProps {
  initialPreferences: NotificationPreferences;
  userId: number;
}

export function NotificationPreferencesSettings({
  initialPreferences,
  userId,
}: NotificationPreferencesProps) {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>(initialPreferences);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiRequest("PATCH", "/api/user/notification-preferences", {
        notificationPreferences: preferences
      });
      
      // Invalidate user data to refresh
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
      
      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error) {
      toast({
        title: "Failed to save preferences",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose how you want to receive updates about your rides and account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="email-notifications" className="text-base">
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive updates and alerts via email
              </p>
            </div>
          </div>
          <Switch
            id="email-notifications"
            checked={preferences.email}
            onCheckedChange={() => handleToggle("email")}
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="sms-notifications" className="text-base">
                SMS Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive text messages for urgent updates
              </p>
            </div>
          </div>
          <Switch
            id="sms-notifications"
            checked={preferences.sms}
            onCheckedChange={() => handleToggle("sms")}
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="push-notifications" className="text-base">
                In-App Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications within the app
              </p>
            </div>
          </div>
          <Switch
            id="push-notifications"
            checked={preferences.push}
            onCheckedChange={() => handleToggle("push")}
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full mt-4"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Preferences"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}