import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Users, Car, Shield, Clock, MapPin, Heart } from "lucide-react";
import { useLocation } from "wouter";

export default function WelcomePage() {
  const [, setLocation] = useLocation();
  const [selectedRole, setSelectedRole] = useState<'rider' | 'driver' | null>(null);

  const handleRoleSelection = (role: 'rider' | 'driver') => {
    setSelectedRole(role);
    // Navigate to registration form with pre-selected role
    setLocation(`/auth?tab=register&role=${role}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Heart className="h-8 w-8 text-teal-600 mr-2" />
            <h1 className="text-4xl font-bold text-gray-900">Welcome to MyAmbulex</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            The most trusted medical transportation platform connecting riders with qualified drivers
          </p>
          <Badge variant="secondary" className="mt-4 bg-teal-100 text-teal-800">
            Beta Testing Program
          </Badge>
        </div>

        {/* Key Benefits */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="text-center p-6 bg-white/70 rounded-lg backdrop-blur-sm">
            <Shield className="h-12 w-12 text-teal-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Safe & Secure</h3>
            <p className="text-gray-600">All drivers are background-checked and medically trained</p>
          </div>
          <div className="text-center p-6 bg-white/70 rounded-lg backdrop-blur-sm">
            <Clock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Available 24/7</h3>
            <p className="text-gray-600">Medical transportation when you need it most</p>
          </div>
          <div className="text-center p-6 bg-white/70 rounded-lg backdrop-blur-sm">
            <MapPin className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nationwide Coverage</h3>
            <p className="text-gray-600">Serving medical facilities across the United States</p>
          </div>
        </div>

        {/* Role Selection Cards */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">
            How would you like to get started?
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Rider Card */}
            <Card className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 bg-white/80 backdrop-blur-sm border-2 border-transparent hover:border-teal-300">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 bg-teal-100 rounded-full w-fit">
                  <Users className="h-12 w-12 text-teal-600" />
                </div>
                <CardTitle className="text-2xl text-teal-700">I'm a Rider</CardTitle>
                <CardDescription className="text-lg">
                  I need medical transportation services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-teal-600 mr-2 flex-shrink-0" />
                    <span>Book rides to medical appointments</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-teal-600 mr-2 flex-shrink-0" />
                    <span>Choose from qualified drivers</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-teal-600 mr-2 flex-shrink-0" />
                    <span>Real-time ride tracking</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-teal-600 mr-2 flex-shrink-0" />
                    <span>Wheelchair accessible vehicles</span>
                  </div>
                </div>
                <Button 
                  onClick={() => handleRoleSelection('rider')}
                  className="w-full mt-6 bg-teal-600 hover:bg-teal-700 text-white py-6 text-lg"
                >
                  Get Started as Rider
                </Button>
              </CardContent>
            </Card>

            {/* Driver Card */}
            <Card className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 bg-white/80 backdrop-blur-sm border-2 border-transparent hover:border-blue-300">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-fit">
                  <Car className="h-12 w-12 text-blue-600" />
                </div>
                <CardTitle className="text-2xl text-blue-700">I'm a Driver</CardTitle>
                <CardDescription className="text-lg">
                  I want to provide medical transportation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-blue-600 mr-2 flex-shrink-0" />
                    <span>Earn income helping others</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-blue-600 mr-2 flex-shrink-0" />
                    <span>Set your own schedule</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-blue-600 mr-2 flex-shrink-0" />
                    <span>Receive ride requests nearby</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-blue-600 mr-2 flex-shrink-0" />
                    <span>Comprehensive training provided</span>
                  </div>
                </div>
                <Button 
                  onClick={() => handleRoleSelection('driver')}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
                >
                  Get Started as Driver
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>



        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Already have an account? <button onClick={() => setLocation('/auth?tab=login')} className="text-teal-600 hover:underline">Sign in here</button></p>
        </div>
      </div>
    </div>
  );
}