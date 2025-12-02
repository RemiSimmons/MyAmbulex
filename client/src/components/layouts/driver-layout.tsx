import { useState, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Clock, 
  CreditCard, 
  LogOut, 
  Menu, 
  User, 
  X, 
  Home, 
  MapPin, 
  Car, 
  MessageSquare,
  Bell,
  Calendar,
  Settings,
  Clock3,
  Filter,
  FileText,
  UserCog
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Sheet,
  SheetContent,
  SheetTrigger
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface DriverLayoutProps {
  children: ReactNode;
}

type Notification = {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  metadata: Record<string, any> | null;
  createdAt: string;
};

export function DriverLayout({ children }: DriverLayoutProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Fetch notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/notifications");
        return await response.json();
      } catch (error) {
        console.error("Error fetching notifications:", error);
        return [];
      }
    },
    staleTime: 30000, // 30 seconds
  });

  const unreadNotifications = notifications.filter(n => !n.isRead);

  const navItems = [
    { 
      href: "/driver/dashboard", 
      label: "Dashboard", 
      icon: <Home className="w-5 h-5 mr-2" />
    },
    { 
      href: "/driver/document-status", 
      label: "Documents", 
      icon: <FileText className="w-5 h-5 mr-2" /> 
    },
    { 
      href: "/driver/availability", 
      label: "Availability", 
      icon: <Clock3 className="w-5 h-5 mr-2" /> 
    },
    { 
      href: "/driver/ride-filters", 
      label: "Ride Filters", 
      icon: <Filter className="w-5 h-5 mr-2" /> 
    },
    { 
      href: "/driver/rides", 
      label: "My Rides", 
      icon: <Car className="w-5 h-5 mr-2" /> 
    },
    { 
      href: "/driver/payouts", 
      label: "Payouts", 
      icon: <CreditCard className="w-5 h-5 mr-2" /> 
    },
    { 
      href: "/chat", 
      label: "Messages", 
      icon: <MessageSquare className="w-5 h-5 mr-2" /> 
    },
    { 
      href: "/driver/account", 
      label: "Account", 
      icon: <UserCog className="w-5 h-5 mr-2" /> 
    },
    { 
      href: "/settings", 
      label: "Settings", 
      icon: <Settings className="w-5 h-5 mr-2" /> 
    },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Desktop Navigation */}
      <div className="hidden md:flex flex-col fixed h-screen w-64 bg-card border-r shadow-sm">
        <div className="flex items-center justify-center h-16 border-b">
          <h1 className="text-lg font-bold text-primary">MyAmbulex</h1>
        </div>
        
        <div className="flex flex-col justify-between flex-1 p-4">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center px-4 py-2 rounded-md transition-colors cursor-pointer ${
                  location === item.href 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-secondary"
                }`}>
                  {item.icon}
                  {item.label}
                </div>
              </Link>
            ))}
          </nav>
          
          <div className="space-y-4">
            <div className="flex items-center p-2 border-t pt-4">
              <Avatar className="h-8 w-8 mr-3">
                <AvatarFallback>{user?.fullName?.charAt(0) || "D"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{user?.fullName || "Driver"}</p>
                <p className="text-xs text-muted-foreground">Driver</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full flex items-center"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b shadow-sm bg-card">
        <div className="flex items-center">
          <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex items-center justify-between h-16 px-4 border-b">
                <h1 className="text-lg font-bold text-primary">MyAmbulex</h1>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileNavOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="flex flex-col justify-between flex-1 p-4">
                <nav className="space-y-2">
                  {navItems.map((item) => (
                    <Link 
                      key={item.href} 
                      href={item.href}
                      onClick={() => setIsMobileNavOpen(false)}
                    >
                      <div className={`flex items-center px-4 py-2 rounded-md transition-colors cursor-pointer ${
                        location === item.href 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-secondary"
                      }`}>
                        {item.icon}
                        {item.label}
                      </div>
                    </Link>
                  ))}
                </nav>
                
                <div className="space-y-4">
                  <div className="flex items-center p-2 border-t pt-4">
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarFallback>{user?.fullName?.charAt(0) || "D"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user?.fullName || "Driver"}</p>
                      <p className="text-xs text-muted-foreground">Driver</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full flex items-center"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="flex items-center space-x-3">
          <Link href="/notifications">
            <div className="relative cursor-pointer">
              <Bell className="h-6 w-6" />
              {unreadNotifications.length > 0 && (
                <Badge className="absolute -top-1 -right-1 px-1 py-0 min-w-[1.25rem] min-h-[1.25rem] flex items-center justify-center rounded-full">
                  {unreadNotifications.length}
                </Badge>
              )}
            </div>
          </Link>
          <Link href="/settings">
            <div className="cursor-pointer">
              <User className="h-6 w-6" />
            </div>
          </Link>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="md:ml-64 flex-1">
        {children}
      </main>
    </div>
  );
}