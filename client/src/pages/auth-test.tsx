import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function AuthTest() {
  const [username, setUsername] = useState("Remi");
  const [password, setPassword] = useState("password123");
  const [authStatus, setAuthStatus] = useState<any>(null);
  const { toast } = useToast();
  const { user, loginMutation, logoutMutation } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      loginMutation.mutate(
        { username, password },
        {
          onSuccess: (data) => {
            toast({
              title: "Login successful",
              description: "Welcome back, " + data.fullName,
            });
            checkAuthStatus();
          },
          onError: (error) => {
            toast({
              title: "Login failed",
              description: error.message,
              variant: "destructive",
            });
          }
        }
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Logged out",
          description: "You have been logged out successfully",
        });
        checkAuthStatus();
      }
    });
  };

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth-status');
      const data = await response.json();
      setAuthStatus(data);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthStatus({ error: 'Failed to fetch auth status' });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Authentication Test</CardTitle>
          <CardDescription>
            Test login functionality with test credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : "Login"}
            </Button>
          </form>

          <div className="mt-6">
            <h3 className="font-medium mb-2">Current Auth Status:</h3>
            {user ? (
              <div className="bg-green-50 p-3 rounded-md border border-green-200">
                <p className="text-green-700">Logged in as: {user.username}</p>
                <p className="text-green-700">Role: {user.role}</p>
                <Button 
                  onClick={handleLogout} 
                  variant="destructive"
                  size="sm"
                  className="mt-2"
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging out...
                    </>
                  ) : "Logout"}
                </Button>
              </div>
            ) : (
              <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                <p className="text-yellow-700">Not logged in</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={checkAuthStatus}
          >
            Check Authentication Status
          </Button>
        </CardFooter>
      </Card>

      {authStatus && (
        <Card className="w-full max-w-md mx-auto mt-6">
          <CardHeader>
            <CardTitle>Detailed Auth Status</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(authStatus, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}