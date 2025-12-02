import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  MapPin,
  CreditCard,
  Shield,
  Clock,
  Calendar,
  Bell,
  Settings
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Use the same step definitions from the onboarding process
const helpSteps = [
  {
    id: 'welcome',
    title: 'Welcome to MyAmbulex',
    description: 'Your trusted non-emergency medical transportation platform',
    icon: <Shield className="h-12 w-12 text-primary" />,
    content: (
      <div className="space-y-4">
        <p>
          Thank you for choosing MyAmbulex for your non-emergency medical transportation needs.
          We're here to provide safe, reliable, and comfortable transportation to your medical
          appointments.
        </p>
        <p>
          MyAmbulex offers a range of services to help you:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Book non-emergency medical transportation with trusted drivers</li>
          <li>Compare competitive bids for the best value</li>
          <li>Track your ride in real-time</li>
          <li>Save your frequent destinations</li>
          <li>Configure accessibility preferences</li>
          <li>Receive timely notifications about your ride</li>
        </ul>
      </div>
    )
  },
  {
    id: 'profile',
    title: 'Complete Your Profile',
    description: 'Help us understand your needs better',
    icon: <Settings className="h-12 w-12 text-primary" />,
    content: (
      <div className="space-y-4">
        <p>
          Your profile information helps our drivers provide the best care possible during 
          transportation. The more details you provide, the better we can serve you.
        </p>
        <p>
          We recommend adding:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Emergency contact information</li>
          <li>Medical conditions and allergies</li>
          <li>Mobility needs and assistance requirements</li>
          <li>Communication preferences</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Your information is kept private and only shared with drivers when necessary for your care.
        </p>
      </div>
    )
  },
  {
    id: 'locations',
    title: 'Save Your Frequent Destinations',
    description: 'Make booking even faster',
    icon: <MapPin className="h-12 w-12 text-primary" />,
    content: (
      <div className="space-y-4">
        <p>
          Save the addresses you visit frequently, such as:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Your home address</li>
          <li>Primary care physician's office</li>
          <li>Specialist clinics</li>
          <li>Physical therapy centers</li>
          <li>Dialysis centers</li>
          <li>Pharmacies</li>
        </ul>
        <p>
          This will save you time when booking rides and ensure accuracy for pickup and dropoff locations.
        </p>
      </div>
    )
  },
  {
    id: 'payment',
    title: 'Payment Options',
    description: 'Secure and convenient payment options',
    icon: <CreditCard className="h-12 w-12 text-primary" />,
    content: (
      <div className="space-y-4">
        <p>
          MyAmbulex offers multiple secure payment options:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Credit/debit cards</li>
          <li>Insurance billing (with verified coverage)</li>
          <li>Health savings accounts (HSA)</li>
          <li>Flexible spending accounts (FSA)</li>
        </ul>
        <p>
          Setting up your payment method now will make future bookings seamless.
        </p>
        <p className="text-sm text-muted-foreground">
          Your payment information is encrypted and securely stored. We only charge you when a ride is completed.
        </p>
      </div>
    )
  },
  {
    id: 'recurring',
    title: 'Schedule Recurring Rides',
    description: 'Perfect for regular appointments',
    icon: <Calendar className="h-12 w-12 text-primary" />,
    content: (
      <div className="space-y-4">
        <p>
          If you have regular medical appointments (like dialysis or physical therapy),
          you can set up recurring rides.
        </p>
        <p>
          Benefits of recurring rides:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Book once for multiple appointments</li>
          <li>Same driver when possible for consistency</li>
          <li>Priority matching with available drivers</li>
          <li>Automatic reminders before each ride</li>
          <li>Ability to skip or reschedule individual rides as needed</li>
        </ul>
      </div>
    )
  },
  {
    id: 'wait-times',
    title: 'Understanding Wait Times',
    description: 'How our wait time feature works',
    icon: <Clock className="h-12 w-12 text-primary" />,
    content: (
      <div className="space-y-4">
        <p>
          For appointments where you need the driver to wait and take you back home,
          MyAmbulex offers wait time options:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Short wait (under 30 minutes): Driver waits in the vehicle</li>
          <li>Medium wait (30-60 minutes): Driver may wait nearby</li>
          <li>Long wait (1+ hours): Driver returns at your specified time</li>
        </ul>
        <p>
          You only pay for the actual wait time used, and you can always
          contact your driver through the app if your appointment finishes
          earlier or later than expected.
        </p>
      </div>
    )
  },
  {
    id: 'notifications',
    title: 'Stay Informed with Notifications',
    description: 'Never miss important updates',
    icon: <Bell className="h-12 w-12 text-primary" />,
    content: (
      <div className="space-y-4">
        <p>
          MyAmbulex keeps you informed every step of the way:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Ride confirmations and reminders</li>
          <li>Driver assigned notifications</li>
          <li>Driver arrival alerts</li>
          <li>Payment receipts</li>
          <li>Ride completion summaries</li>
          <li>Service updates and promotions</li>
        </ul>
        <p>
          You can customize which notifications you receive and how you receive them
          (app, SMS, or email) in your notification settings.
        </p>
      </div>
    )
  }
];

interface HelpGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStep?: string;
}

export const HelpGuide: React.FC<HelpGuideProps> = ({ 
  open, 
  onOpenChange,
  initialStep = 'welcome'
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // Set initial step if specified
  useEffect(() => {
    if (open && initialStep) {
      const stepIndex = helpSteps.findIndex(s => s.id === initialStep);
      if (stepIndex >= 0) {
        setCurrentStepIndex(stepIndex);
      }
    }
  }, [open, initialStep]);
  
  const handleNext = () => {
    if (currentStepIndex < helpSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleClose();
    }
  };
  
  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };
  
  const handleClose = () => {
    onOpenChange(false);
  };
  
  const currentStep = helpSteps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / helpSteps.length) * 100;
  
  if (!open || !currentStep) {
    return null;
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              {currentStep.icon}
            </div>
            <div>
              <DialogTitle className="text-xl">{currentStep.title}</DialogTitle>
              <DialogDescription>{currentStep.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="mt-2">
          <Progress value={progress} className="h-1" />
          <p className="text-xs text-muted-foreground text-right mt-1">
            Step {currentStepIndex + 1} of {helpSteps.length}
          </p>
        </div>
        
        <div className="pt-4 pb-6">
          {currentStep.content}
        </div>

        <DialogFooter className="flex sm:justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className="mr-auto gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
            >
              Close
            </Button>
            
            {currentStepIndex < helpSteps.length - 1 && (
              <Button
                onClick={handleNext}
                className="gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            
            {currentStepIndex === helpSteps.length - 1 && (
              <Button
                onClick={handleClose}
                className="gap-2"
              >
                Complete
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};