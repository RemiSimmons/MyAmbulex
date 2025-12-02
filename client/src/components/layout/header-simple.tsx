import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  User,
  LogOut,
  ChevronDown,
} from "lucide-react";

export default function SimpleHeader() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <img 
            src="/images/myambulex-logo-heart.png" 
            alt="MyAmbulex Logo" 
            className="h-8 w-auto mr-2"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          <h1 className="text-xl font-bold text-primary">MyAmbulex</h1>
        </Link>
        
        {/* Navigation */}
        <div className="flex items-center space-x-4">
          {!user ? (
            <>
              <Link href="/auth">
                <Button variant="outline" size="sm">Sign In</Button>
              </Link>
              <Link href="/auth?tab=register">
                <Button size="sm">Register</Button>
              </Link>
              <Link href="/auth?role=driver">
                <Button variant="ghost" size="sm">Become a Driver</Button>
              </Link>
            </>
          ) : (
            <>
              {user.role === "rider" && (
                <Link href="/rider/dashboard">
                  <Button variant="ghost" size="sm">Dashboard</Button>
                </Link>
              )}
              {user.role === "driver" && (
                <Link href="/driver/dashboard">
                  <Button variant="ghost" size="sm">Dashboard</Button>
                </Link>
              )}
              {user.role === "admin" && (
                <Link href="/admin/dashboard">
                  <Button variant="ghost" size="sm">Admin</Button>
                </Link>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2" size="sm">
                    <User className="h-4 w-4" />
                    {user.fullName?.split(' ')[0] || user.username}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Link href="/settings">
                    <DropdownMenuItem className="cursor-pointer">
                      Settings
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
}