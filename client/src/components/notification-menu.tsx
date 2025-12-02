import React, { useEffect } from "react";
import { Bell, User, CheckCircle2, Clock, BellOff } from "lucide-react";
import { useNotifications, Notification } from "@/hooks/use-notifications";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const CHARACTERS = {
  ASSISTANT: { emoji: "👋", color: "bg-blue-100" },
  DRIVER: { emoji: "🚗", color: "bg-green-100" },
  DOCTOR: { emoji: "👨‍⚕️", color: "bg-purple-100" },
  COMPANION: { emoji: "😊", color: "bg-yellow-100" }
};

// Format dates to be more readable
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // For older notifications, show the actual date
  return date.toLocaleDateString();
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
}

// Individual notification item
const NotificationItem = ({ notification, onMarkAsRead }: NotificationItemProps) => {
  // Get character from metadata, default to ASSISTANT
  const character = notification.metadata?.character || "ASSISTANT";
  const characterInfo = CHARACTERS[character as keyof typeof CHARACTERS];

  return (
    <div 
      className={cn(
        "p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors duration-200",
        notification.read ? "opacity-70" : ""
      )}
      onClick={() => !notification.read && onMarkAsRead(notification.id)}
    >
      <div className="flex items-start gap-2">
        <div className={cn("flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center", characterInfo.color)}>
          <span className="text-lg">{characterInfo.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h5 className="font-medium text-sm mb-1 truncate pr-2">{notification.title}</h5>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDate(notification.createdAt)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
          {!notification.read && (
            <div className="text-right mt-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs px-2 py-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" /> Mark as read
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function NotificationMenu() {
  const { user } = useAuth();
  const { unreadNotifications, readNotifications, markAsRead } = useNotifications();

  // Automatically play a sound when a new notification arrives
  useEffect(() => {
    // This effect could play a sound when new notifications arrive
    // For now we'll leave it empty
  }, [unreadNotifications.length]);

  if (!user) return null;

  const hasUnread = unreadNotifications.length > 0;
  const hasNotifications = hasUnread || readNotifications.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <Badge 
              className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0" 
              variant="destructive"
            >
              {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifications</span>
          {hasUnread && (
            <Badge variant="secondary" className="text-xs">
              {unreadNotifications.length} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {!hasNotifications ? (
            <div className="flex flex-col items-center justify-center h-32 text-center p-4">
              <BellOff className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-sm">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                You'll be notified about important updates here
              </p>
            </div>
          ) : (
            <>
              {unreadNotifications.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    New
                  </DropdownMenuLabel>
                  {unreadNotifications.map((notification) => (
                    <NotificationItem 
                      key={notification.id} 
                      notification={notification} 
                      onMarkAsRead={markAsRead}
                    />
                  ))}
                  {readNotifications.length > 0 && (
                    <DropdownMenuSeparator />
                  )}
                </>
              )}

              {readNotifications.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Earlier
                  </DropdownMenuLabel>
                  {readNotifications.slice(0, 5).map((notification) => (
                    <NotificationItem 
                      key={notification.id} 
                      notification={notification} 
                      onMarkAsRead={markAsRead}
                    />
                  ))}
                  {readNotifications.length > 5 && (
                    <div className="p-2 text-center">
                      <Button variant="ghost" size="sm" className="w-full text-xs">
                        <Clock className="h-3 w-3 mr-1" /> View all notifications
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}