import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  X, 
  Home, 
  User, 
  Settings, 
  Bell, 
  HelpCircle,
  LogOut,
  Car,
  MapPin,
  Calendar,
  BarChart3,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationItem {
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  isActive?: boolean;
}

interface MobileNavigationProps {
  items: NavigationItem[];
  user?: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout?: () => void;
  className?: string;
}

export function MobileNavigation({ 
  items, 
  user, 
  onLogout, 
  className 
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleItemClick = (item: NavigationItem) => {
    if (item.onClick) {
      item.onClick();
    }
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("sm:hidden p-2", className)}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">MyAmbulex</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/10 p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {user && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{user.name}</p>
                  <p className="text-sm text-blue-100 capitalize">{user.role}</p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 py-4">
            <ul className="space-y-1 px-4">
              {items.map((item, index) => (
                <li key={index}>
                  <button
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      "w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors",
                      item.isActive 
                        ? "bg-blue-50 text-blue-700 font-medium" 
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <span className="flex-shrink-0 text-gray-500">
                      {item.icon}
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <Button 
              variant="ghost" 
              onClick={onLogout}
              className="w-full justify-start text-gray-700 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Common navigation configurations
export const riderNavigationItems: NavigationItem[] = [
  { label: 'Dashboard', icon: <Home className="h-4 w-4" />, href: '/rider/dashboard' },
  { label: 'Book a Ride', icon: <MapPin className="h-4 w-4" />, href: '/rider/book' },
  { label: 'My Rides', icon: <Calendar className="h-4 w-4" />, href: '/rider/rides' },
  { label: 'Profile', icon: <User className="h-4 w-4" />, href: '/rider/profile' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/rider/settings' },
  { label: 'Help', icon: <HelpCircle className="h-4 w-4" />, href: '/help' },
];

export const driverNavigationItems: NavigationItem[] = [
  { label: 'Dashboard', icon: <Home className="h-4 w-4" />, href: '/driver/dashboard' },
  { label: 'Available Rides', icon: <Car className="h-4 w-4" />, href: '/driver/rides' },
  { label: 'My Schedule', icon: <Calendar className="h-4 w-4" />, href: '/driver/schedule' },
  { label: 'Documents', icon: <FileText className="h-4 w-4" />, href: '/driver/documents' },
  { label: 'Analytics', icon: <BarChart3 className="h-4 w-4" />, href: '/driver/analytics' },
  { label: 'Profile', icon: <User className="h-4 w-4" />, href: '/driver/profile' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/driver/settings' },
  { label: 'Help', icon: <HelpCircle className="h-4 w-4" />, href: '/help' },
];

export default MobileNavigation;