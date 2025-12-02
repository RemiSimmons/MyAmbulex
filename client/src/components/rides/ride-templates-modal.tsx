import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocation } from 'wouter';

// Import icons
import { 
  Stethoscope, 
  Building2, 
  Clock, 
  Pill, 
  UserPlus, 
  CalendarClock 
} from 'lucide-react';

// Define the structure of a ride template
interface RideTemplate {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  estimatedPrice: string;
}

// Define the templates
const rideTemplates: RideTemplate[] = [
  {
    id: 'doctor',
    title: 'Doctor\'s Appointment',
    icon: <Stethoscope className="h-8 w-8 text-primary" />,
    description: 'Regular doctor\'s visit or check-up.',
    estimatedPrice: '$45-60'
  },
  {
    id: 'hospital',
    title: 'Hospital Visit',
    icon: <Building2 className="h-8 w-8 text-primary" />,
    description: 'Visit to hospital for treatment or tests.',
    estimatedPrice: '$50-70'
  },
  {
    id: 'pharmacy',
    title: 'Pharmacy Pickup',
    icon: <Pill className="h-8 w-8 text-primary" />,
    description: 'Quick trip to pick up medication.',
    estimatedPrice: '$25-35'
  },
  {
    id: 'specialist',
    title: 'Specialist Appointment',
    icon: <UserPlus className="h-8 w-8 text-primary" />,
    description: 'Visit to a medical specialist.',
    estimatedPrice: '$55-75'
  },
  {
    id: 'dialysis',
    title: 'Dialysis Treatment',
    icon: <Clock className="h-8 w-8 text-primary" />,
    description: 'Regular dialysis appointment.',
    estimatedPrice: '$45-65'
  },
  {
    id: 'recurring',
    title: 'Recurring Appointment',
    icon: <CalendarClock className="h-8 w-8 text-primary" />,
    description: 'Regular scheduled medical visits.',
    estimatedPrice: '$45-65'
  }
];

interface RideTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RideTemplatesModal: React.FC<RideTemplatesModalProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const [, setLocation] = useLocation();

  const handleTemplateSelect = (templateId: string) => {
    // Navigate to the booking page with the selected template
    setLocation(`/rider/book-ride?template=${templateId}`);
    onOpenChange(false);
  };

  const handleManualBooking = () => {
    // Navigate to the booking page without a template
    setLocation('/rider/book-ride');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Book Your First Medical Ride</DialogTitle>
          <DialogDescription>
            We've made it easy to book your first medical transportation. Choose from common
            appointment types or start with a blank booking.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="templates" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="details">Ride Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="templates" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rideTemplates.map((template) => (
                <div 
                  key={template.id}
                  className="border rounded-lg p-4 flex items-start space-x-4 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <div className="flex-shrink-0">
                    {template.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{template.title}</h3>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                    <p className="text-sm mt-2">Estimated: {template.estimatedPrice}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between mt-6">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  onClick={handleManualBooking}
                >
                  Skip & Book Manually
                </Button>
                <Button 
                  onClick={() => setLocation('/rider/book-ride?template=doctor')}
                >
                  View Details
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="details" className="mt-4">
            <div className="space-y-4">
              <p>
                Fill in your ride details manually with our step-by-step form:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Pick-up and drop-off locations</li>
                <li>Date and time preferences</li>
                <li>Special assistance needs</li>
                <li>Vehicle type preferences</li>
                <li>Additional notes for the driver</li>
              </ul>
              <div className="flex justify-end space-x-2 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleManualBooking}
                >
                  Continue to Booking
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};