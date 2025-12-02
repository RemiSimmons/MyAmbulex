import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  BellRing, 
  Smartphone, 
  Mail, 
  MessageSquare, 
  Settings,
  Check,
  X,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  rideUpdates: boolean;
  paymentAlerts: boolean;
  systemAlerts: boolean;
  soundEnabled: boolean;
}

interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timestamp: string;
  read: boolean;
  data?: any;
}

export function NotificationManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>({
    emailEnabled: true,
    smsEnabled: true,
    pushEnabled: false,
    rideUpdates: true,
    paymentAlerts: true,
    systemAlerts: true,
    soundEnabled: true
  });
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    checkPushSupport();
    checkNotificationPermission();
    loadSettings();
    setupRealtimeConnection();
    setupAudioNotification();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [user]);

  /**
   * Check if browser supports push notifications
   */
  const checkPushSupport = () => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setPushSupported(supported);
  };

  /**
   * Check current notification permission status
   */
  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  };

  /**
   * Load notification settings from server or localStorage
   */
  const loadSettings = () => {
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  /**
   * Save notification settings
   */
  const saveSettings = (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
  };

  /**
   * Setup Server-Sent Events connection for real-time notifications
   */
  const setupRealtimeConnection = () => {
    if (!user) return;

    try {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create new SSE connection
      eventSourceRef.current = new EventSource(`/api/sse/notifications`);
      
      eventSourceRef.current.onopen = () => {
        setIsConnected(true);
        console.log('Notification SSE connection established');
      };

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealtimeNotification(data);
        } catch (error) {
          console.error('Error parsing SSE notification:', error);
        }
      };

      eventSourceRef.current.onerror = () => {
        setIsConnected(false);
        console.error('SSE connection error');
        
        // Reconnect after 5 seconds
        setTimeout(() => {
          setupRealtimeConnection();
        }, 5000);
      };
    } catch (error) {
      console.error('Error setting up SSE connection:', error);
    }
  };

  /**
   * Setup audio notification sound
   */
  const setupAudioNotification = () => {
    audioRef.current = new Audio('/notification-sound.mp3');
    audioRef.current.volume = 0.5;
  };

  /**
   * Handle incoming real-time notifications
   */
  const handleRealtimeNotification = (data: any) => {
    const notification: RealtimeNotification = {
      id: data.id || `notif_${Date.now()}`,
      type: data.type || 'info',
      title: data.title || 'Notification',
      message: data.message || '',
      priority: data.priority || 'normal',
      timestamp: data.timestamp || new Date().toISOString(),
      read: false,
      data: data.data
    };

    // Add to notifications list
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50

    // Show browser notification if permitted and enabled
    if (settings.pushEnabled && permissionStatus === 'granted') {
      showBrowserNotification(notification);
    }

    // Play sound if enabled
    if (settings.soundEnabled && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }

    // Show toast for high priority notifications
    if (notification.priority === 'high' || notification.priority === 'urgent') {
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.priority === 'urgent' ? 'destructive' : 'default',
      });
    }
  };

  /**
   * Show native browser notification
   */
  const showBrowserNotification = (notification: RealtimeNotification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotif = new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: notification.type,
        requireInteraction: notification.priority === 'urgent',
        silent: !settings.soundEnabled
      });

      browserNotif.onclick = () => {
        window.focus();
        markAsRead(notification.id);
        browserNotif.close();
      };

      // Auto-close after 5 seconds for non-urgent notifications
      if (notification.priority !== 'urgent') {
        setTimeout(() => {
          browserNotif.close();
        }, 5000);
      }
    }
  };

  /**
   * Request notification permission
   */
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      
      if (permission === 'granted') {
        // Enable push notifications and register service worker
        await enablePushNotifications();
        
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive real-time notifications",
        });
      }
    }
  };

  /**
   * Enable push notifications by registering service worker
   */
  const enablePushNotifications = async () => {
    if (!pushSupported) return;

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.VITE_VAPID_PUBLIC_KEY // You'll need to add this
      });

      // Send subscription to server
      await apiRequest('POST', '/api/notifications/push/subscribe', {
        subscription: subscription.toJSON()
      });

      const newSettings = { ...settings, pushEnabled: true };
      saveSettings(newSettings);
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      toast({
        title: "Push Notification Error",
        description: "Failed to enable push notifications",
        variant: "destructive",
      });
    }
  };

  /**
   * Mark notification as read
   */
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  /**
   * Clear all notifications
   */
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  /**
   * Send test notification
   */
  const sendTestNotification = async () => {
    try {
      await apiRequest('POST', '/api/notifications/test', {
        type: 'normal',
        message: 'This is a test notification to verify your settings'
      });
      
      toast({
        title: "Test Sent",
        description: "Check your enabled notification channels",
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Could not send test notification",
        variant: "destructive",
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notification Center</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Real-time notifications {isConnected ? 'active' : 'inactive'}
            </span>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={sendTestNotification}>
                Test Notification
              </Button>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  Mark All Read
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={clearAllNotifications}>
                Clear All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Notification Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Push Notifications */}
          <div className="space-y-4">
            <h4 className="font-medium">Delivery Methods</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Smartphone className="h-4 w-4" />
                <div>
                  <div className="font-medium">Push Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Browser notifications on this device
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {!pushSupported && (
                  <Badge variant="destructive">Not Supported</Badge>
                )}
                {pushSupported && permissionStatus === 'denied' && (
                  <Badge variant="destructive">Blocked</Badge>
                )}
                {pushSupported && permissionStatus === 'default' && (
                  <Button variant="outline" size="sm" onClick={requestNotificationPermission}>
                    Enable
                  </Button>
                )}
                {pushSupported && permissionStatus === 'granted' && (
                  <Switch
                    checked={settings.pushEnabled}
                    onCheckedChange={(checked) => {
                      const newSettings = { ...settings, pushEnabled: checked };
                      saveSettings(newSettings);
                    }}
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4" />
                <div>
                  <div className="font-medium">Email Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Send notifications to your email
                  </div>
                </div>
              </div>
              <Switch
                checked={settings.emailEnabled}
                onCheckedChange={(checked) => {
                  const newSettings = { ...settings, emailEnabled: checked };
                  saveSettings(newSettings);
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-4 w-4" />
                <div>
                  <div className="font-medium">SMS Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Send urgent alerts via text message
                  </div>
                </div>
              </div>
              <Switch
                checked={settings.smsEnabled}
                onCheckedChange={(checked) => {
                  const newSettings = { ...settings, smsEnabled: checked };
                  saveSettings(newSettings);
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {settings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                <div>
                  <div className="font-medium">Sound Alerts</div>
                  <div className="text-sm text-muted-foreground">
                    Play sound for notifications
                  </div>
                </div>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => {
                  const newSettings = { ...settings, soundEnabled: checked };
                  saveSettings(newSettings);
                }}
              />
            </div>
          </div>

          {/* Notification Categories */}
          <div className="space-y-4">
            <h4 className="font-medium">Notification Types</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Ride Updates</div>
                <div className="text-sm text-muted-foreground">
                  Driver location, pickup/dropoff notifications
                </div>
              </div>
              <Switch
                checked={settings.rideUpdates}
                onCheckedChange={(checked) => {
                  const newSettings = { ...settings, rideUpdates: checked };
                  saveSettings(newSettings);
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Payment Alerts</div>
                <div className="text-sm text-muted-foreground">
                  Payment confirmations, refunds, billing issues
                </div>
              </div>
              <Switch
                checked={settings.paymentAlerts}
                onCheckedChange={(checked) => {
                  const newSettings = { ...settings, paymentAlerts: checked };
                  saveSettings(newSettings);
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">System Alerts</div>
                <div className="text-sm text-muted-foreground">
                  Account updates, security notifications
                </div>
              </div>
              <Switch
                checked={settings.systemAlerts}
                onCheckedChange={(checked) => {
                  const newSettings = { ...settings, systemAlerts: checked };
                  saveSettings(newSettings);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    notification.read ? 'bg-muted/30' : 'bg-background'
                  } transition-colors`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h5 className="font-medium">{notification.title}</h5>
                        <Badge 
                          variant={
                            notification.priority === 'urgent' ? 'destructive' :
                            notification.priority === 'high' ? 'default' :
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {notification.priority}
                        </Badge>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default NotificationManager;