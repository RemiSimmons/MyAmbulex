import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface UrgentRideWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  scheduledTime: Date;
}

export const UrgentRideWarningDialog: React.FC<UrgentRideWarningDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  scheduledTime
}) => {
  const hoursUntilRide = Math.round((scheduledTime.getTime() - Date.now()) / (1000 * 60 * 60));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-w-[95vw] mx-auto">
        <DialogHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div>
            <DialogTitle className="text-xl font-semibold">Urgent Ride Warning</DialogTitle>
            <DialogDescription className="text-base mt-2">
              This ride will be marked as urgent
            </DialogDescription>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 py-2">
          <div className="rounded-lg bg-orange-50 p-4 border border-orange-200">
            <p className="text-sm text-orange-800 text-center">
              You're booking a ride scheduled within 24 hours ({hoursUntilRide} hours from now). 
              This ride will be marked as <strong>URGENT</strong> and will have special conditions:
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>$50 Cancellation Fee:</strong> If you cancel this urgent ride, you'll be charged a $50 cancellation fee.
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>Priority Handling:</strong> Your ride will be given priority in driver notifications and matching.
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>Limited Changes:</strong> Once confirmed, making changes to urgent rides may have additional restrictions.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Go Back & Reschedule
          </Button>
          <Button 
            onClick={onConfirm} 
            className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
          >
            I Understand - Book Urgent Ride
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};