import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, ArrowLeft, Mail, Eye, EyeOff } from "lucide-react";
import RoleSelector from "@/components/role-selector";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LegalAgreementModal } from "@/components/legal-agreements";
import { useCompletionStatus } from "@/hooks/use-legal-agreements";

// Import the schemas and types from schema.ts
import { loginSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  role: z.enum(["rider", "driver", "admin"], {
    required_error: "You must select a role",
  }),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;
type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function AuthPage() {
  const [location] = useLocation();
  
  // Parse the role, beta code, and tab from URL query params
  // Use window.location.search since wouter's useLocation only returns pathname
  const queryString = window.location.search;
  const params = new URLSearchParams(queryString);
  const defaultRole = params.get("role") || "rider";
  const betaCode = params.get("beta");
  const urlTab = params.get("tab");
  
  // Track whether user has selected a role and should see the registration form
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  
  // Legal agreement state management
  const [showLegalAgreements, setShowLegalAgreements] = useState(false);
  const [registrationData, setRegistrationData] = useState<RegisterValues | null>(null);
  
  console.log("URL parsing - defaultRole:", defaultRole, "urlTab:", urlTab, "queryString:", queryString);
  
  const [activeTab, setActiveTab] = useState<string>(urlTab === "register" ? "register" : "login");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [showEmailSentMessage, setShowEmailSentMessage] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleOAuthAvailable, setIsGoogleOAuthAvailable] = useState(false);
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();

  // Check if Google OAuth is available on server
  useEffect(() => {
    fetch('/api/auth/google/status')
      .then(res => res.json())
      .then(data => setIsGoogleOAuthAvailable(data.available))
      .catch(() => setIsGoogleOAuthAvailable(false));
  }, []);

  // Ensure tab switches when URL changes
  useEffect(() => {
    console.log("useEffect triggered - urlTab:", urlTab, "setting activeTab to:", urlTab === "register" ? "register" : "login");
    if (urlTab === "register") {
      setActiveTab("register");
    } else {
      setActiveTab("login");
    }
  }, [urlTab]);
  
  // Debug logging for beta code detection
  console.log("AuthPage - Current location:", location);
  console.log("AuthPage - Query string:", queryString);
  console.log("AuthPage - Beta code detected:", betaCode);
  console.log("AuthPage - Tab from URL:", urlTab);
  console.log("AuthPage - Active tab set to:", activeTab);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      phone: "",
      role: defaultRole as "rider" | "driver" | "admin",
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    // Handle role changes from URL
    console.log("Setting role from URL parameter:", defaultRole);
    registerForm.setValue("role", defaultRole as "rider" | "driver" | "admin");
    console.log("Form role value after setting:", registerForm.getValues("role"));
  }, [defaultRole, registerForm]);

  function onLoginSubmit(data: LoginValues) {
    console.log("Login form submitted with:", { username: data.username });
    loginMutation.mutate(data);
  }

  function onRegisterSubmit(data: RegisterValues) {
    // Store registration data for legal agreements flow
    setRegistrationData(data);
    
    // Check for beta invitation code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const betaCode = urlParams.get('beta');
    
    console.log("Registration form submitted with:", { 
      username: data.username, 
      fullName: data.fullName,
      role: data.role,
      betaCode 
    });

    // Create the user data object matching the schema
    const userData = {
      username: data.username,
      password: data.password,
      fullName: data.fullName,
      email: data.email, 
      phone: data.phone,
      role: data.role,
      betaInviteCode: betaCode // Include beta code in registration
    };

    // First complete the registration
    registerMutation.mutate(userData, {
      onSuccess: () => {
        // After successful registration, show legal agreements
        setShowLegalAgreements(true);
      }
    });
  }

  // Handle legal agreement completion
  const handleLegalAgreementComplete = (isComplete: boolean) => {
    if (isComplete) {
      setShowLegalAgreements(false);
      toast({
        title: "Registration Complete",
        description: "Welcome to MyAmbulex! Your account has been successfully created.",
      });
      // Navigate to appropriate dashboard based on role
      if (registrationData?.role === 'driver') {
        window.location.href = '/driver/dashboard';
      } else if (registrationData?.role === 'rider') {
        window.location.href = '/rider/dashboard';
      } else {
        window.location.href = '/admin';
      }
    }
  };

  // Add forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordValues) => {
      const response = await apiRequest('POST', '/api/auth/forgot-password', data);
      return response.json();
    },
    onSuccess: (data) => {
      // For testing, show the reset link
      if (data.resetLink) {
        console.log("Password reset link:", data.resetLink);
      }
      setForgotPasswordEmail("");
      setShowForgotPassword(false);
      setShowEmailSentMessage(true);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send password reset email. Please try again.",
        variant: "destructive",
      });
    },
  });

  function onForgotPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("Forgot password request for:", forgotPasswordEmail);
    if (!forgotPasswordEmail || !forgotPasswordEmail.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    forgotPasswordMutation.mutate({ email: forgotPasswordEmail });
  }

  // Handle role selection and transition to registration form
  function handleRoleSelection(role: string) {
    console.log("Role selected:", role);
    setSelectedRole(role);
    registerForm.setValue("role", role as "rider" | "driver");
    setShowRegistrationForm(true);
  }

  // Handle going back to welcome screen
  function handleBackToWelcome() {
    setShowRegistrationForm(false);
    setSelectedRole("");
    registerForm.reset();
  }

  // Redirect if already logged in
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      console.log("User already logged in, redirecting to dashboard");
      if (user.role === "rider") {
        setLocation("/rider/dashboard");
      } else if (user.role === "driver") {
        setLocation("/driver/dashboard");
      } else if (user.role === "admin") {
        setLocation("/admin/dashboard");
      }
    }
  }, [user, setLocation]);

  if (user) {
    return <div className="flex justify-center items-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>;
  }

  // Beta code already parsed above from location

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Beta Invitation Banner */}
      {betaCode && (
        <div className="bg-gradient-to-r from-primary to-primary-600 text-white py-3">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center text-center">
              <div className="bg-white/20 rounded-full px-3 py-1 mr-3">
                <span className="text-xs font-semibold">BETA</span>
              </div>
              <span className="font-medium">
                🎉 Beta Invitation Recognized! Code: <span className="font-mono bg-white/20 px-2 py-1 rounded">{betaCode}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {!showRegistrationForm && activeTab === "register" ? (
          // Full-width Welcome Screen
          <div className="max-w-4xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 max-w-md mx-auto">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="register">
                <RoleSelector onRoleSelect={handleRoleSelection} betaCode={betaCode} />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          // Two-column layout for login and registration form
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <div className="w-full lg:w-1/2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                {showEmailSentMessage ? (
                  <Card>
                    <CardHeader className="text-center">
                      <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <Mail className="h-6 w-6 text-green-600" />
                      </div>
                      <CardTitle>Check Your Email</CardTitle>
                      <CardDescription>
                        We've sent password reset instructions to your email address.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                      <p className="text-sm text-gray-600">
                        If you don't see the email in your inbox, please check your spam folder.
                      </p>
                      <p className="text-sm text-gray-600">
                        The reset link will expire in 1 hour for security.
                      </p>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowEmailSentMessage(false);
                          setShowForgotPassword(false);
                        }}
                      >
                        Back to Login
                      </Button>
                    </CardFooter>
                  </Card>
                ) : !showForgotPassword ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Login to Your Account</CardTitle>
                      <CardDescription>
                        Enter your credentials to access the MyAmbulex platform.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Google Sign In Button - Only show if OAuth is configured */}
                      {isGoogleOAuthAvailable && (
                        <>
                          <Button
                            type="button"
                            className="w-full h-12 mb-6 bg-[#1976d2] hover:bg-[#1565c0] text-white"
                            onClick={() => window.location.href = '/api/auth/google'}
                            data-testid="button-google-signin"
                          >
                            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                              <path
                                fill="white"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              />
                              <path
                                fill="white"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              />
                              <path
                                fill="white"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              />
                              <path
                                fill="white"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              />
                            </svg>
                            Sign in with Google
                          </Button>
                          
                          <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-white px-2 text-muted-foreground">Or continue with email</span>
                            </div>
                          </div>
                        </>
                      )}

                      <Form {...loginForm}>
                        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                          <FormField
                            control={loginForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email or Username</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter your email or username" 
                                    data-testid="input-username"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={loginForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input 
                                      type={showPassword ? "text" : "password"} 
                                      placeholder="Enter your password"
                                      data-testid="input-password"
                                      {...field} 
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowPassword(!showPassword)}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                      data-testid="button-toggle-password"
                                      aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                      {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => setShowForgotPassword(true)}
                              className="text-sm text-primary hover:underline"
                            >
                              Forgot password?
                            </button>
                          </div>
                          <Button 
                            type="submit" 
                            className="w-full"
                            data-testid="button-login"
                            disabled={loginMutation.isPending}
                          >
                            {loginMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Logging in...
                              </>
                            ) : (
                              "Login"
                            )}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                      <p className="text-sm text-gray-500">
                        Don't have an account?{" "}
                        <a 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveTab("register");
                          }}
                          className="text-primary hover:underline"
                        >
                          Register here
                        </a>
                      </p>
                    </CardFooter>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowForgotPassword(false)}
                          className="p-1 h-auto"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        Reset Your Password
                      </CardTitle>
                      <CardDescription>
                        Enter your email address and we'll send you password reset instructions.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={onForgotPasswordSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <label htmlFor="forgot-email" className="text-sm font-medium">
                            Email Address
                          </label>
                          <Input 
                            id="forgot-email"
                            type="email" 
                            placeholder="Enter your email address" 
                            value={forgotPasswordEmail}
                            onChange={(e) => {
                              console.log("Email input change:", e.target.value);
                              setForgotPasswordEmail(e.target.value);
                            }}
                          />
                        </div>
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={forgotPasswordMutation.isPending}
                        >
                          {forgotPasswordMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            "Send Reset Instructions"
                          )}
                        </Button>
                      </form>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                      <p className="text-sm text-gray-500">
                        Remember your password?{" "}
                        <button
                          onClick={() => setShowForgotPassword(false)}
                          className="text-primary hover:underline"
                        >
                          Back to login
                        </button>
                      </p>
                    </CardFooter>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="register">
                {showRegistrationForm && (
                  // Registration Form
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleBackToWelcome}
                          className="p-1"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                          <CardTitle>Create Your {selectedRole === 'rider' ? 'Rider' : 'Driver'} Account</CardTitle>
                          <CardDescription>
                            {selectedRole === 'rider' 
                              ? 'Create your account to book medical transportation rides.'
                              : 'Create your account to start providing medical transportation services.'
                            }
                          </CardDescription>
                        </div>
                      </div>
                      {betaCode && (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                          <p className="text-sm text-blue-800 font-medium">
                            🎉 Beta Invitation Detected!
                          </p>
                          <p className="text-xs text-blue-600">
                            Code: {betaCode}
                          </p>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      {/* Google Sign Up Button - Only show if OAuth is configured */}
                      {isGoogleOAuthAvailable && (
                        <>
                          <Button
                            type="button"
                            className="w-full h-12 mb-6 bg-[#1976d2] hover:bg-[#1565c0] text-white"
                            onClick={() => {
                              // Pass role as query parameter to OAuth endpoint
                              window.location.href = `/api/auth/google?role=${selectedRole}`;
                            }}
                            data-testid="button-google-signup"
                          >
                            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                              <path
                                fill="white"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              />
                              <path
                                fill="white"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              />
                              <path
                                fill="white"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              />
                              <path
                                fill="white"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              />
                            </svg>
                            Sign up with Google
                          </Button>
                          
                          <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-white px-2 text-muted-foreground">Or continue with email</span>
                            </div>
                          </div>
                        </>
                      )}
                      
                      <Form {...registerForm}>
                        <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                          <FormField
                            control={registerForm.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter your full name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={registerForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input type="email" placeholder="Email address" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={registerForm.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone</FormLabel>
                                  <FormControl>
                                    <Input type="tel" placeholder="Phone number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={registerForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input placeholder="Choose a username (not your email)" {...field} />
                                </FormControl>
                                <p className="text-xs text-gray-500 mt-1">
                                  Create a unique username - you'll use this to log in, not your email
                                </p>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Choose a password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Display selected role */}
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <p className="text-sm font-medium text-blue-800">
                              Creating account as: <span className="capitalize">{selectedRole}</span>
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              {selectedRole === 'rider' ? 'Looking for medical transportation' : 'Providing medical transportation services'}
                            </p>
                          </div>

                          {registerMutation.error && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                              <p className="text-sm text-red-800 font-medium">
                                Registration Failed
                              </p>
                              <p className="text-xs text-red-600">
                                {registerMutation.error.message || "Could not create account. Please try a different username."}
                              </p>
                            </div>
                          )}

                          <Button 
                            type="submit" 
                            className="w-full" 
                            disabled={registerMutation.isPending}
                          >
                            {registerMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating Account...
                              </>
                            ) : (
                              `Create ${selectedRole === 'rider' ? 'Rider' : 'Driver'} Account`
                            )}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                    <CardFooter>
                      <p className="text-sm text-gray-600 text-center w-full">
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setActiveTab("login")}
                          className="text-primary hover:underline font-medium"
                        >
                          Login here
                        </button>
                      </p>
                    </CardFooter>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column: Welcome Benefits (only shown in two-column layout) */}
          {(activeTab === "login" || showRegistrationForm) && (
            <div className="w-full lg:w-1/2">
              <div className="bg-primary rounded-lg p-8 text-white">
                <h2 className="text-3xl font-bold mb-4">Welcome to MyAmbulex</h2>
                <p className="text-xl mb-6">The innovative bidding platform for Non-Emergency Medical Transportation.</p>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-3">Key Benefits:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Transparent pricing through competitive bidding</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Specialized vehicles for all mobility needs</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Real-time ride tracking for peace of mind</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Verified drivers with specialized training</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          </div>
        )}
      </div>
      
      {/* Legal Agreement Modal */}
      {showLegalAgreements && registrationData && (
        <LegalAgreementModal
          isOpen={showLegalAgreements}
          onClose={() => setShowLegalAgreements(false)}
          onComplete={handleLegalAgreementComplete}
          userRole={registrationData.role as 'rider' | 'driver'}
        />
      )}
    </div>
  );
}
