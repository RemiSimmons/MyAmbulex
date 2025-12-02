import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";


export default function LoginTest() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { user, isLoading, loginMutation, logoutMutation } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      toast({
        title: "Already Logged In",
        description: `You are logged in as ${user.username}`,
      });
    }
  }, [user, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        title: "Missing credentials",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }

    loginMutation.mutate(
      { username, password },
      {
        onSuccess: () => {
          toast({
            title: "Login Successful",
            description: "You have been logged in successfully",
          });
        },
      }
    );
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const goToDriverRegistration = () => {
    setLocation("/driver/register");
  };

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Test Login</CardTitle>
              <CardDescription>
                Login to test the driver registration form
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : user ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-800 font-medium">Logged In</p>
                    <p className="text-sm text-green-700">
                      You are logged in as <span className="font-bold">{user.username}</span>
                    </p>
                    <p className="text-sm text-green-700">
                      Role: <span className="font-bold">{user.role}</span>
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleLogout} variant="outline">
                      {logoutMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Logout
                    </Button>
                    <Button onClick={goToDriverRegistration}>
                      Go to Driver Registration
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Login
                  </Button>
                </form>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <p className="text-sm text-gray-500">
                This is a test login page for development
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}