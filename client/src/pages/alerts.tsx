import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, AlertTriangle, Info, CheckCircle, Clock, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AlertItem {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

const getAlertIcon = (type: string) => {
  switch (type) {
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case 'error':
      return <X className="h-4 w-4 text-red-600" />;
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    default:
      return <Info className="h-4 w-4 text-blue-600" />;
  }
};

const getAlertVariant = (type: string): "default" | "destructive" | "outline" | "secondary" => {
  switch (type) {
    case 'warning':
      return 'outline';
    case 'error':
      return 'destructive';
    case 'success':
      return 'default';
    default:
      return 'secondary';
  }
};

export default function AlertsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: alerts, isLoading, refetch } = useQuery<AlertItem[]>({
    queryKey: ['/api/alerts'],
    enabled: !!user
  });

  const markAsRead = async (alertId: string) => {
    try {
      await apiRequest(`/api/alerts/${alertId}/read`, {
        method: 'POST'
      });
      refetch();
      toast({
        title: "Alert marked as read",
        description: "The alert has been marked as read."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark alert as read",
        variant: "destructive"
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiRequest('/api/alerts/mark-all-read', {
        method: 'POST'
      });
      refetch();
      toast({
        title: "All alerts marked as read",
        description: "All alerts have been marked as read."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark all alerts as read",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-bold">System Alerts</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const unreadAlerts = alerts?.filter(alert => !alert.isRead) || [];
  const readAlerts = alerts?.filter(alert => alert.isRead) || [];

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-bold">System Alerts</h1>
          {unreadAlerts.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadAlerts.length} new
            </Badge>
          )}
        </div>
        {unreadAlerts.length > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            Mark All as Read
          </Button>
        )}
      </div>

      {alerts?.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No alerts</h3>
            <p className="text-muted-foreground">
              You're all caught up! We'll notify you here when there are important updates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Unread Alerts */}
          {unreadAlerts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>New Alerts</span>
              </h2>
              <div className="space-y-3">
                {unreadAlerts.map((alert) => (
                  <Alert key={alert.id} className="border-l-4 border-l-blue-500">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <h4 className="font-medium">{alert.title}</h4>
                          <AlertDescription className="mt-1">
                            {alert.message}
                          </AlertDescription>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(alert.timestamp).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </p>
                          {alert.actionUrl && alert.actionLabel && (
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="px-0 mt-2"
                              onClick={() => window.location.href = alert.actionUrl!}
                            >
                              {alert.actionLabel}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getAlertVariant(alert.type)}>
                          {alert.type}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(alert.id)}
                        >
                          Mark as Read
                        </Button>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {/* Read Alerts */}
          {readAlerts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Previous Alerts</span>
              </h2>
              <div className="space-y-3">
                {readAlerts.map((alert) => (
                  <Card key={alert.id} className="opacity-75">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {getAlertIcon(alert.type)}
                          <div className="flex-1">
                            <h4 className="font-medium">{alert.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {alert.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(alert.timestamp).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </p>
                          </div>
                        </div>
                        <Badge variant={getAlertVariant(alert.type)}>
                          {alert.type}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}