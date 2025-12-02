import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useHelp } from "@/context/help-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  Car,
  User,
  BarChart3,
  LogOut,
  ChevronDown,
  HelpCircle,
  FileText,
} from "lucide-react";
import { NotificationMenu } from "@/components/notification-menu";
import { LegalAgreementsPopup } from "@/components/legal-agreements-popup";

export default function Header() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLegalPopupOpen, setIsLegalPopupOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const { openHelp } = useHelp();
  const [location] = useLocation();

  // Parse beta code from URL for beta banner display - use both wouter location and window.location
  const urlParts = location.split("?");
  const queryString = urlParts.length > 1 ? urlParts[1] : "";
  const params = new URLSearchParams(queryString);
  let betaCode = params.get("beta");
  
  // Fallback to window.location.search if wouter doesn't have query params
  if (!betaCode && typeof window !== 'undefined' && window.location.search) {
    const windowParams = new URLSearchParams(window.location.search);
    betaCode = windowParams.get("beta");
  }
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-3 flex justify-between items-center">
        <Link href="/" className="flex-shrink-0 min-w-0">
          <div className="flex items-center">
            <img 
              src="/images/myambulex-logo-heart.png" 
              alt="MyAmbulex Logo" 
              className="h-6 sm:h-8 lg:h-9 w-auto mr-2 flex-shrink-0"
              onError={(e) => {
                console.error('Logo failed to load:', e.currentTarget.src);
                // Try fallback logo
                const target = e.currentTarget as HTMLImageElement;
                if (target.src.includes('myambulex-logo-heart.png')) {
                  target.src = '/images/logo.png';
                } else {
                  target.style.display = 'none';
                }
              }}
              onLoad={() => {
                console.log('Logo loaded successfully');
              }}
            />
            <h1 className="text-base sm:text-lg lg:text-xl font-bold text-primary truncate">MyAmbulex</h1>
          </div>
        </Link>
        

        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-2 lg:space-x-4 xl:space-x-6">
          {!user ? (
            <>
              {location !== '/beta' && (
                <>
                  <Button 
                    variant="ghost" 
                    className={location === "/#how-it-works" ? "bg-primary/10 text-primary" : ""} 
                    size="sm"
                    onClick={() => openHelp('welcome')}
                  >
                    How It Works
                  </Button>
                  <a 
                    href="#services" 
                    onClick={(e) => {
                      e.preventDefault();
                      const servicesSection = document.getElementById('services');
                      if (servicesSection) {
                        servicesSection.scrollIntoView({ 
                          behavior: 'smooth',
                          block: 'start'
                        });
                        window.history.pushState({}, '', '/#services');
                      }
                    }}
                  >
                    <Button variant="ghost" className={location === "/#services" ? "bg-primary/10 text-primary" : ""} size="sm">
                      Services
                    </Button>
                  </a>
                </>
              )}
              <Link href="/beta">
                <Button variant="ghost" className={location === "/beta" ? "bg-primary/10 text-primary" : ""} size="sm">
                  Founding Member
                </Button>
              </Link>
              <Link href="/auth?role=driver">
                <Button variant="ghost" className={location === "/auth?role=driver" ? "bg-primary/10 text-primary" : ""} size="sm">
                  Become a Driver
                </Button>
              </Link>
              <Link href="/auth">
                <Button variant="outline" size="sm">Sign In</Button>
              </Link>
              <Link href="/auth?tab=register">
                <Button size="sm">Register</Button>
              </Link>
            </>
          ) : (
            <>
              {user.role === "rider" && (
                <Link href="/rider/dashboard">
                  <Button variant="ghost" className={location === "/rider/dashboard" ? "bg-primary/10 text-primary" : ""} size="sm">
                    Dashboard
                  </Button>
                </Link>
              )}
              {user.role === "driver" && (
                <>
                  <Link href="/driver/dashboard">
                    <Button variant="ghost" className={location === "/driver/dashboard" ? "bg-primary/10 text-primary" : ""} size="sm">
                      Dashboard
                    </Button>
                  </Link>
                  <Link href="/driver/account">
                    <Button variant="ghost" className={location === "/driver/account" ? "bg-primary/10 text-primary" : ""} size="sm">
                      Account
                    </Button>
                  </Link>
                  <Link href="/driver/onboarding">
                    <Button variant="outline" className={location === "/driver/onboarding" ? "bg-primary/10 text-primary" : ""} size="sm">
                      Driver Onboarding
                    </Button>
                  </Link>
                </>
              )}
              {user.role === "admin" && (
                <Link href="/admin/dashboard">
                  <Button variant="ghost" className={location === "/admin/dashboard" ? "bg-primary/10 text-primary" : ""} size="sm">
                    Dashboard
                  </Button>
                </Link>
              )}
              
              <NotificationMenu />
              
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-primary"
                onClick={() => openHelp('welcome')}
                title="Help Guide"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2" size="sm">
                    <User className="h-4 w-4" />
                    {user.fullName.split(' ')[0]}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Link href={user.role === 'rider' ? '/rider/profile' : '/driver/profile'}>
                    <DropdownMenuItem className="cursor-pointer">
                      Profile
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/settings">
                    <DropdownMenuItem className="cursor-pointer">
                      Settings
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => setIsLegalPopupOpen(true)}
                  >
                    Legal Agreements
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </nav>

        {/* Mobile Navigation Toggle - Always visible on small screens */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" className="flex md:hidden" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <div className="flex flex-col mt-8 space-y-4">
              {!user ? (
                <>
                  {location !== '/beta' && (
                    <>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start"
                        onClick={() => {
                          setIsSheetOpen(false);
                          openHelp('welcome');
                        }}
                      >
                        How It Works
                      </Button>
                      <a 
                        href="#services" 
                        onClick={(e) => {
                          e.preventDefault();
                          setIsSheetOpen(false);
                          setTimeout(() => {
                            const servicesSection = document.getElementById('services');
                            if (servicesSection) {
                              servicesSection.scrollIntoView({ 
                                behavior: 'smooth',
                                block: 'start'
                              });
                              window.history.pushState({}, '', '/#services');
                            }
                          }, 100);
                        }}
                      >
                        <Button variant="ghost" className="w-full justify-start">Services</Button>
                      </a>
                    </>
                  )}
                  <Link href="/beta" onClick={() => setIsSheetOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">Founding Member</Button>
                  </Link>
                  <Link href="/auth?role=driver" onClick={() => setIsSheetOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">Become a Driver</Button>
                  </Link>
                  <Link href="/auth" onClick={() => setIsSheetOpen(false)}>
                    <Button variant="outline" className="w-full">Sign In</Button>
                  </Link>
                  <Link href="/auth?tab=register" onClick={() => setIsSheetOpen(false)}>
                    <Button className="w-full">Register</Button>
                  </Link>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start" 
                    onClick={() => {
                      setIsSheetOpen(false);
                      openHelp('welcome');
                    }}
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Help Guide
                  </Button>
                </>
              ) : (
                <>
                  {user.role === "rider" && (
                    <Link href="/rider/dashboard" onClick={() => setIsSheetOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <User className="mr-2 h-4 w-4" />
                        Rider Dashboard
                      </Button>
                    </Link>
                  )}
                  {user.role === "driver" && (
                    <>
                      <Link href="/driver/dashboard" onClick={() => setIsSheetOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start">
                          <Car className="mr-2 h-4 w-4" />
                          Driver Dashboard
                        </Button>
                      </Link>
                      <Link href="/driver/onboarding" onClick={() => setIsSheetOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start">
                          <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                          </svg>
                          Driver Onboarding
                        </Button>
                      </Link>
                    </>
                  )}
                  {user.role === "admin" && (
                    <Link href="/admin/dashboard" onClick={() => setIsSheetOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </Button>
                    </Link>
                  )}
                  <Link href={user.role === 'rider' ? '/rider/profile' : '/driver/profile'} onClick={() => setIsSheetOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => {
                      setIsSheetOpen(false);
                      setIsLegalPopupOpen(true);
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Legal Agreements
                  </Button>
                  <Link href="/settings" onClick={() => setIsSheetOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      Settings
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start" 
                    onClick={() => {
                      setIsSheetOpen(false);
                      openHelp('welcome');
                    }}
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Help Guide
                  </Button>
                  
                  <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
      
      {/* Legal Agreements Popup */}
      <LegalAgreementsPopup 
        isOpen={isLegalPopupOpen}
        onClose={() => setIsLegalPopupOpen(false)}
      />
    </header>
  );
}
