import { useParams } from "wouter";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Import the driver layout to use as a fallback during loading
import { DriverLayout } from "@/components/layouts/driver-layout";

// Lazy load the actual component to prevent import issues
const DriverRideDetails = lazy(() => import("./ride/id"));

export default function RideDetailsPage() {
  const { id } = useParams();
  
  return (
    <Suspense 
      fallback={
        <DriverLayout>
          <div className="flex-grow flex items-center justify-center my-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DriverLayout>
      }
    >
      <DriverRideDetails />
    </Suspense>
  );
}