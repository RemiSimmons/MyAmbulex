import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/context/onboarding-context';
import { useAuth } from '@/hooks/use-auth';
import { useLocation, Link } from 'wouter';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Hospital, 
  Stethoscope, 
  Pill, 
  Clock, 
  Calendar,
  CheckCircle,
  ChevronRight
} from 'lucide-react';

// Template data for common medical appointments
interface RideTemplate {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  pickupName?: string;
  pickupAddress?: string;
  dropoffName?: string;
  dropoffAddress?: string;
  distanceEstimate?: string;
  needsWaitTime?: boolean;
  isRoundTrip?: boolean;
  priceEstimate?: string;
}

const rideTemplates: RideTemplate[] = [
  {
    id: 'doctor',
    title: 'Doctor\'s Appointment',
    description: 'Regular doctor\'s visit or check-up.',
    icon: <Stethoscope className="h-8 w-8 text-primary" />,
    dropoffName: 'Primary Care Physician',
    needsWaitTime: true,
    isRoundTrip: true,
    priceEstimate: '$45-60'
  },
  {
    id: 'hospital',
    title: 'Hospital Visit',
    description: 'Visit to hospital for treatment or tests.',
    icon: <Hospital className="h-8 w-8 text-primary" />,
    dropoffName: 'General Hospital',
    needsWaitTime: false,
    isRoundTrip: true,
    priceEstimate: '$50-70'
  },
  {
    id: 'pharmacy',
    title: 'Pharmacy Pickup',
    description: 'Quick trip to pick up medication.',
    icon: <Pill className="h-8 w-8 text-primary" />,
    dropoffName: 'Local Pharmacy',
    needsWaitTime: true,
    isRoundTrip: true,
    priceEstimate: '$25-35'
  },
  {
    id: 'specialist',
    title: 'Specialist Appointment',
    description: 'Visit to a medical specialist.',
    icon: <Stethoscope className="h-8 w-8 text-primary" />,
    dropoffName: 'Specialist Office',
    needsWaitTime: true,
    isRoundTrip: true,
    priceEstimate: '$55-75'
  },
  {
    id: 'dialysis',
    title: 'Dialysis Treatment',
    description: 'Regular dialysis appointment.',
    icon: <Clock className="h-8 w-8 text-primary" />,
    dropoffName: 'Dialysis Center',
    needsWaitTime: true,
    isRoundTrip: true,
    priceEstimate: '$45-65'
  },
  {
    id: 'recurring',
    title: 'Recurring Appointment',
    description: 'Regular scheduled medical visits.',
    icon: <Calendar className="h-8 w-8 text-primary" />,
    dropoffName: 'Treatment Center',
    needsWaitTime: true,
    isRoundTrip: true,
    priceEstimate: '$45-65'
  }
];

export const FirstRideAssistance: React.FC = () => {
  const { user } = useAuth();
  const { onboardingState, completeFirstRide } = useOnboarding();
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RideTemplate | null>(null);
  const [activeTab, setActiveTab] = useState('templates');
  
  // Only show for riders who are eligible and haven't completed their first ride
  useEffect(() => {
    if (user && 
        user.role === 'rider' && 
        location === '/rider/dashboard' && 
        onboardingState.hasCompletedTour && 
        !onboardingState.hasCompletedFirstRide &&
        !onboardingState.hasSkippedOnboarding) {
      setOpen(true);
    }
  }, [location, user, onboardingState.hasCompletedTour, onboardingState.hasCompletedFirstRide, onboardingState.hasSkippedOnboarding]);
  
  const handleClose = () => {
    setOpen(false);
    // Also mark onboarding as skipped when user manually closes this dialog
    completeFirstRide();
  };
  
  const handleTemplateSelect = (template: RideTemplate) => {
    setSelectedTemplate(template);
    setActiveTab('details');
  };
  
  const handleBookRide = () => {
    // Mark the first ride feature as completed
    completeFirstRide();
    
    // Close the dialog and navigate to the booking page
    setOpen(false);
    setLocation('/rider/book-ride');
  };
  
  const handleSkip = () => {
    // Mark the first ride feature as completed
    completeFirstRide();
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Book Your First Medical Ride</DialogTitle>
          <DialogDescription>
            We've made it easy to book your first medical transportation. Choose from common
            appointment types or start with a blank booking.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="details" disabled={!selectedTemplate}>
              Ride Details
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rideTemplates.map(template => (
                <Card 
                  key={template.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {template.icon}
                        <CardTitle className="text-lg">{template.title}</CardTitle>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-0 text-sm text-muted-foreground">
                    Estimated: {template.priceEstimate}
                  </CardFooter>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-between mt-6">
              <Button 
                variant="outline"
                onClick={handleSkip}
              >
                Skip & Book Manually
              </Button>
              <Button 
                disabled={!selectedTemplate}
                onClick={() => setActiveTab('details')}
                className="gap-1"
              >
                View Details
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="details">
            {selectedTemplate && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-medium">Trip Details</h3>
                    <div className="bg-muted p-3 rounded-md space-y-2">
                      <div>
                        <span className="text-sm font-medium">Destination:</span>
                        <p className="text-sm">{selectedTemplate.dropoffName}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Wait Time:</span>
                        <p className="text-sm">{selectedTemplate.needsWaitTime ? 'Yes (30-60 minutes)' : 'No'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Return Trip:</span>
                        <p className="text-sm">{selectedTemplate.isRoundTrip ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium">Price Information</h3>
                    <div className="bg-muted p-3 rounded-md space-y-2">
                      <div>
                        <span className="text-sm font-medium">Estimated Cost:</span>
                        <p className="text-sm">{selectedTemplate.priceEstimate}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Payment Method:</span>
                        <p className="text-sm">To be selected during booking</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Tip:</span>
                        <p className="text-sm">Optional, can be added after ride</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-primary/10 p-3 rounded-md text-sm">
                  <p className="font-medium text-primary">What happens next?</p>
                  <p className="mt-1">
                    After booking, qualified drivers in your area will see your ride request.
                    They can either accept your price or make a counter-offer. You'll have
                    the final say on which driver you choose.
                  </p>
                </div>
                
                <div className="flex justify-between mt-4">
                  <Button 
                    variant="outline"
                    onClick={() => setActiveTab('templates')}
                  >
                    Back to Templates
                  </Button>
                  <Button 
                    onClick={handleBookRide}
                    className="gap-1"
                  >
                    Continue to Booking
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4">
          <Button 
            variant="ghost"
            onClick={handleClose}
            className="sm:mr-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};