import { useEffect, useState } from "react";
import { Check, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RideStatusNotificationProps {
  status: "en_route" | "arrived" | "completed" | null;
  driver?: {
    name: string;
    phone?: string;
    vehicleInfo?: string;
  };
  onClose: () => void;
  onRateDriver?: () => void;
}

export function RideStatusNotification({
  status,
  driver,
  onClose,
  onRateDriver,
}: RideStatusNotificationProps) {
  const [open, setOpen] = useState(false);

  // Show the dialog when status changes
  useEffect(() => {
    if (status) {
      setOpen(true);
    }
  }, [status]);

  // Close handler that also calls the parent's onClose
  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  // Handle rate driver action
  const handleRateDriver = () => {
    setOpen(false);
    if (onRateDriver) {
      onRateDriver();
    }
  };

  if (!status) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {status === "en_route" && (
              <>
                <Navigation className="h-5 w-5 text-primary" />
                Driver En Route
              </>
            )}
            {status === "arrived" && (
              <>
                <MapPin className="h-5 w-5 text-primary" />
                Driver Has Arrived
              </>
            )}
            {status === "completed" && (
              <>
                <Check className="h-5 w-5 text-primary" />
                Ride Completed
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {status === "en_route" && (
              <>
                {driver?.name} is on the way to pick you up. Please be ready at your pickup location.
                {driver?.vehicleInfo && (
                  <p className="mt-2">Vehicle: {driver.vehicleInfo}</p>
                )}
              </>
            )}
            {status === "arrived" && (
              <>
                {driver?.name} has arrived at your pickup location. 
                {driver?.phone && (
                  <p className="mt-2">
                    You can call them at: <a href={`tel:${driver.phone}`} className="text-primary underline">{driver.phone}</a>
                  </p>
                )}
              </>
            )}
            {status === "completed" && (
              <>
                Your ride has been completed. Thank you for using MyAmbulex!
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex sm:justify-between">
          {status === "completed" ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleRateDriver}>
                Rate Your Driver
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="ml-auto">
              OK
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}