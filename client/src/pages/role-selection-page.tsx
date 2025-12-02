import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Car } from "lucide-react";
import { Link } from "wouter";

export default function RoleSelectionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to MyAmbulex</h1>
          <p className="text-lg text-gray-600">Choose your role to get started</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Rider Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">I'm a Rider</CardTitle>
              <CardDescription className="text-base">
                I need reliable transportation to my medical appointments
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Book rides to medical appointments
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Set your own price through bidding
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Choose from qualified drivers
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Real-time ride tracking
                </li>
              </ul>
              <Link href="/auth?tab=register&role=rider">
                <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                  Continue as Rider
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Driver Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Car className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">I'm a Driver</CardTitle>
              <CardDescription className="text-base">
                I want to provide medical transportation services
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Earn money helping patients
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Flexible schedule and availability
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Bid on rides that work for you
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Make a difference in your community
                </li>
              </ul>
              <Link href="/auth?tab=register&role=driver">
                <Button className="w-full bg-green-600 hover:bg-green-700" size="lg">
                  Continue as Driver
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link href="/auth" className="text-blue-600 hover:underline font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}