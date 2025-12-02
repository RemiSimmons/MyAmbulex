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
  Calendar 
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

interface RiderLayoutProps {
  children: ReactNode;
}

export function RiderLayout({ children }: RiderLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Get unread notifications count
  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

  // Navigation items
  const navigationItems = [
    { 
      href: "/rider/dashboard", 
      icon: <Home className="mr-2 h-4 w-4" />, 
      label: "Dashboard",
      active: location === "/rider/dashboard"
    },
    { 
      href: "/rider/rides", 
      icon: <Car className="mr-2 h-4 w-4" />, 
      label: "My Rides",
      active: location === "/rider/rides" || location.startsWith("/rider/rides/")
    },
    { 
      href: "/rider/schedule", 
      icon: <Clock className="mr-2 h-4 w-4" />, 
      label: "Schedule a Ride",
      active: location === "/rider/schedule" || location === "/rider/schedule/new"
    },
    {
      href: "/rider/recurring-appointments",
      icon: <Calendar className="mr-2 h-4 w-4" />,
      label: "Recurring Appointments",
      active: location === "/rider/recurring-appointments" || location.startsWith("/rider/recurring-appointments/")
    },
    { 
      href: "/rider/addresses", 
      icon: <MapPin className="mr-2 h-4 w-4" />, 
      label: "Saved Addresses",
      active: location === "/rider/addresses"
    },
    { 
      href: "/chat", 
      icon: <MessageSquare className="mr-2 h-4 w-4" />, 
      label: "Chat",
      active: location === "/chat" || location.startsWith("/chat/")
    },
    { 
      href: "/rider/banking", 
      icon: <CreditCard className="mr-2 h-4 w-4" />, 
      label: "Payment Methods",
      active: location === "/rider/banking"
    },
    { 
      href: "/rider/account-settings", 
      icon: <User className="mr-2 h-4 w-4" />, 
      label: "Account Settings",
      active: location === "/rider/account-settings"
    }
  ];

  // User avatar content
  const getAvatarContent = () => {
    if (!user) return "?";
    if (user.fullName) {
      const nameParts = user.fullName.split(" ");
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`;
      }
      return user.fullName.substring(0, 2).toUpperCase();
    }
    return user.username.substring(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Mobile navbar */}
      <header className="sticky top-0 z-40 border-b bg-background lg:hidden">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/rider/dashboard">
            <div className="flex items-center gap-2 font-bold">
              <span className="text-primary">MyAmbulex</span>
            </div>
          </Link>
          
          {/* Mobile menu trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 sm:w-72">
              <div className="flex h-16 items-center border-b">
                <Link href="/rider/dashboard" onClick={() => setMobileOpen(false)}>
                  <div className="flex items-center gap-2 font-bold">
                    <span className="text-lg text-primary">MyAmbulex</span>
                  </div>
                </Link>
                <div className="ml-auto">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileOpen(false)}
                  >
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                  </Button>
                </div>
              </div>
              <nav className="grid gap-1 py-4">
                {navigationItems.map((item) => (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                  >
                    <div
                      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                        item.active
                          ? "bg-primary text-primary-foreground"
                          : "transparent hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </div>
                  </Link>
                ))}
                <Button
                  variant="ghost"
                  className="mt-4 justify-start"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
          
          {/* Mobile notification and profile */}
          <div className="flex items-center gap-2">
            <Link href="/rider/notifications">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link href="/rider/profile">
              <Button variant="ghost" size="icon">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getAvatarContent()}</AvatarFallback>
                </Avatar>
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r">
        <div className="flex h-16 items-center gap-2 px-6 border-b">
          <Link href="/rider/dashboard">
            <div className="flex items-center font-bold">
              <span className="text-lg text-primary">MyAmbulex</span>
            </div>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col px-4 py-6">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div
                  className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium ${
                    item.active
                      ? "bg-primary text-primary-foreground"
                      : "transparent hover:bg-muted"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-auto">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </div>
        </nav>
      </div>
      
      {/* Main content */}
      <div className="lg:pl-64">
        {/* Desktop top navbar */}
        <div className="hidden lg:fixed lg:right-0 lg:z-40 lg:flex lg:h-16 lg:w-[calc(100%-16rem)] lg:items-center lg:justify-end lg:border-b lg:bg-background lg:px-6">
          <Link href="/rider/notifications">
            <Button variant="ghost" size="icon" className="relative mr-2">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge variant="destructive" className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </Link>
          <Link href="/rider/profile">
            <Button variant="ghost" size="icon" className="mr-4">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{getAvatarContent()}</AvatarFallback>
              </Avatar>
            </Button>
          </Link>
          {user?.fullName && (
            <span className="text-sm font-medium">{user.fullName}</span>
          )}
        </div>
        
        {/* Main content area */}
        <main className="pt-0 lg:pt-16">
          {children}
        </main>
      </div>
    </div>
  );
}