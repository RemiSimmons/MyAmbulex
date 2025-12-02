import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  imageUrl?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, any> | null;
}

export function useNotifications() {
  const { toast } = useToast();
  
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch
  } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/notifications");
        if (!response.ok) {
          throw new Error("Failed to fetch notifications");
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching notifications:", error);
        throw error;
      }
    },
    // Only fetch notifications if the user is logged in
    enabled: true, 
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("POST", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      // Refetch notifications to update the list
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to mark notification as read",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter notifications
  const unreadNotifications = notifications.filter(notification => !notification.read);
  const readNotifications = notifications.filter(notification => notification.read);

  return {
    notifications,
    unreadNotifications,
    readNotifications,
    isLoading,
    error,
    markAsRead: markAsReadMutation.mutate,
    refetch,
  };
}