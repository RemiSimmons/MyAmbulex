import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Car } from "lucide-react";

interface RoleSelectorProps {
  onRoleSelect?: (role: string) => void;
  betaCode?: string | null;
}

export default function RoleSelector({ onRoleSelect, betaCode }: RoleSelectorProps) {
  return (
    <div className="bg-primary rounded-lg p-8 text-white min-h-[600px] flex flex-col justify-center">
      <div className="max-w-2xl mx-auto w-full">
        <h2 className="text-3xl font-bold mb-4 text-center">Welcome to MyAmbulex</h2>
        <p className="text-xl mb-8 text-center">The innovative bidding platform for Non-Emergency Medical Transportation.</p>

        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Key Benefits:</h3>
          <ul className="space-y-3">
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Transparent pricing through competitive bidding</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Specialized vehicles for all mobility needs</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Real-time ride tracking for peace of mind</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Verified drivers with specialized training</span>
            </li>
          </ul>
        </div>

        <div className="text-center">
          <h3 className="text-xl font-semibold mb-6">Choose your role:</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg mx-auto">
            <Card className="bg-white/10 border-white/20 hover:bg-white/15 transition-colors">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <User className="h-12 w-12 mb-4" />
                <h4 className="text-lg font-medium mb-2">I'm a Rider</h4>
                <p className="text-sm mb-4 opacity-90">Looking for medical transportation to my appointments</p>
                <Button 
                  variant="default" 
                  type="button"
                  className="w-full bg-white text-primary hover:bg-gray-100 font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onRoleSelect) {
                      console.log("Rider role selected via callback");
                      onRoleSelect("rider");
                    } else {
                      console.log("Rider signup button clicked, navigating to:", "/auth?tab=register&role=rider");
                      window.location.href = "/auth?tab=register&role=rider";
                    }
                  }}
                >
                  Sign Up as Rider
                </Button>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 border-white/20 hover:bg-white/15 transition-colors">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Car className="h-12 w-12 mb-4" />
                <h4 className="text-lg font-medium mb-2">I'm a Driver</h4>
                <p className="text-sm mb-4 opacity-90">Interested in providing medical transportation services</p>
                <Button 
                  variant="default" 
                  type="button"
                  className="w-full bg-white text-primary hover:bg-gray-100 font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onRoleSelect) {
                      console.log("Driver role selected via callback");
                      onRoleSelect("driver");
                    } else {
                      console.log("Driver signup button clicked, navigating to:", "/auth?tab=register&role=driver");
                      window.location.href = "/auth?tab=register&role=driver";
                    }
                  }}
                >
                  Sign Up as Driver
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
