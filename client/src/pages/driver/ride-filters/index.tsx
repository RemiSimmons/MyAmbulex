import { useState, useCallback, memo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  PlusIcon, 
  EditIcon, 
  TrashIcon, 
  StarIcon, 
  FilterIcon,
  SettingsIcon,
  CheckIcon,
  AlertCircleIcon
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { queryClient, getDynamicQueryOptions } from "@/lib/queryClient";
import { DriverLayout } from "@/components/layouts/driver-layout";
import { CardsGridSkeleton } from "@/components/ui/loading-skeletons";
import { MemoizedList, withOptimization } from "@/components/optimization/memo-helpers";

type TimeWindow = {
  day: string;
  startTime: string;
  endTime: string;
};

type RideFilter = {
  id: number;
  driverId: number;
  name: string;
  isDefault: boolean;
  maxDistance?: number;
  minDistance?: number;
  serviceBoundaries?: { lat: number; lng: number }[];
  minPrice?: number;
  pricePerMile?: number;
  pricePerMinute?: number;
  vehicleTypes?: string[];
  canProvideRamp?: boolean;
  canProvideCompanion?: boolean;
  canProvideStairChair?: boolean;
  maxWaitTimeMinutes?: number;
  timeWindows?: TimeWindow[];
  excludeHolidays?: boolean;
  patientConditions?: string[];
  mobilityLevels?: string[];
  specialEquipment?: string[];
  preferRoundTrips?: boolean;
  preferRegularClients?: boolean;
  notificationEnabled?: boolean;
  priority: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

const getFormattedVehicleTypes = (types?: string[]) => {
  if (!types || types.length === 0) return "Any";
  
  const readableTypes: Record<string, string> = {
    sedan: "Sedan",
    suv: "SUV",
    van: "Van",
    wheelchair_van: "Wheelchair Van",
    ambulance: "Ambulance"
  };
  
  return types.map(type => readableTypes[type] || type).join(", ");
};

const getFormattedTimeWindows = (windows?: TimeWindow[]) => {
  if (!windows || windows.length === 0) return "Any time";
  
  return windows.map(window => {
    const day = window.day === "any" ? "Any day" : window.day.charAt(0).toUpperCase() + window.day.slice(1);
    return `${day} ${window.startTime} - ${window.endTime}`;
  }).join(", ");
};

export default function DriverRideFiltersPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteFilter, setDeleteFilter] = useState<RideFilter | null>(null);
  
  const { 
    data: filters, 
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<RideFilter[]>({
    queryKey: ["/api/driver/ride-filters"],
    ...getDynamicQueryOptions({
      retry: 1
    })
  });
  
  const setDefaultMutation = useMutation({
    mutationFn: async (filterId: number) => {
      const res = await fetch(`/api/driver/ride-filters/${filterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to set filter as default");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/ride-filters"] });
      toast({
        title: "Default filter updated",
        description: "Your default filter has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating default filter",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ filterId, active }: { filterId: number, active: boolean }) => {
      const res = await fetch(`/api/driver/ride-filters/${filterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update filter status");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/ride-filters"] });
      toast({
        title: "Filter updated",
        description: "Your filter status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating filter",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteFilterMutation = useMutation({
    mutationFn: async (filterId: number) => {
      const res = await fetch(`/api/driver/ride-filters/${filterId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete filter");
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/ride-filters"] });
      toast({
        title: "Filter deleted",
        description: "Your ride filter has been deleted successfully.",
      });
      setDeleteFilter(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting filter",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleSetDefault = (filterId: number) => {
    setDefaultMutation.mutate(filterId);
  };
  
  const handleToggleActive = (filterId: number, active: boolean) => {
    toggleActiveMutation.mutate({ filterId, active });
  };
  
  const handleDeleteFilter = () => {
    if (deleteFilter) {
      deleteFilterMutation.mutate(deleteFilter.id);
    }
  };
  
  if (isError) {
    return (
      <DriverLayout>
        <div className="px-4 py-6 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Ride Filters</h1>
            <Button asChild>
              <Link to="/driver/ride-filters/new">
                <PlusIcon className="h-4 w-4 mr-2" />
                New Filter
              </Link>
            </Button>
          </div>
          
          <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-lg flex items-center">
            <AlertCircleIcon className="h-5 w-5 mr-3" />
            <div>
              <h3 className="font-medium">Error loading filters</h3>
              <p>{(error as Error)?.message || "There was an error loading your ride filters. Please try again."}</p>
            </div>
          </div>
          
          <Button onClick={() => refetch()} className="mt-4" variant="outline">
            Try Again
          </Button>
        </div>
      </DriverLayout>
    );
  }
  
  return (
    <DriverLayout>
      <div className="px-4 py-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Ride Filters</h1>
          <Button asChild>
            <Link to="/driver/ride-filters/new">
              <PlusIcon className="h-4 w-4 mr-2" />
              New Filter
            </Link>
          </Button>
        </div>
        
        <p className="text-muted-foreground mb-6">
          Create and manage ride filters to automatically match with rides that meet your preferences.
          Set location boundaries, price thresholds, time windows, and more.
        </p>
        
        {isLoading ? (
          <CardsGridSkeleton count={3} />
        ) : (
          <>
            {filters && filters.length > 0 ? (
              <MemoizedList
                items={filters || []}
                keyExtractor={(filter) => filter.id as number}
                className="grid grid-cols-1 md:grid-cols-2 gap-6" 
                renderItem={(filter) => {
                  // Memoized rendering of each filter card
                  return (
                    <Card className={`w-full ${!filter.active ? 'opacity-70' : ''}`}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="flex items-center">
                            {filter.name}
                            {filter.isDefault && (
                              <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-300">
                                <StarIcon className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />
                                Default
                              </Badge>
                            )}
                          </CardTitle>
                          <Badge 
                            variant={filter.active ? "default" : "outline"}
                            className={filter.active ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-300" : "bg-slate-100 text-slate-800 hover:bg-slate-100 border-slate-300"}
                          >
                            {filter.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <CardDescription>
                          Priority: {filter.priority} {filter.priority === 1 ? "(Highest)" : filter.priority === 10 ? "(Lowest)" : ""}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 text-sm">
                          {(filter.minDistance || filter.maxDistance) && (
                            <div className="flex items-start">
                              <div className="w-32 font-medium">Distance:</div>
                              <div>
                                {filter.minDistance && filter.maxDistance 
                                  ? `${filter.minDistance} - ${filter.maxDistance} miles`
                                  : filter.minDistance
                                  ? `Min ${filter.minDistance} miles`
                                  : `Max ${filter.maxDistance} miles`
                                }
                              </div>
                            </div>
                          )}
                          
                          {filter.minPrice && (
                            <div className="flex items-start">
                              <div className="w-32 font-medium">Minimum Price:</div>
                              <div>${filter.minPrice.toFixed(2)}</div>
                            </div>
                          )}
                          
                          {filter.vehicleTypes && filter.vehicleTypes.length > 0 && (
                            <div className="flex items-start">
                              <div className="w-32 font-medium">Vehicle Types:</div>
                              <div>{getFormattedVehicleTypes(filter.vehicleTypes)}</div>
                            </div>
                          )}
                          
                          {filter.timeWindows && filter.timeWindows.length > 0 && (
                            <div className="flex items-start">
                              <div className="w-32 font-medium">Time Windows:</div>
                              <div>{getFormattedTimeWindows(filter.timeWindows)}</div>
                            </div>
                          )}
                          
                          {(filter.canProvideRamp !== undefined || 
                            filter.canProvideCompanion !== undefined || 
                            filter.canProvideStairChair !== undefined) && (
                            <div className="flex items-start">
                              <div className="w-32 font-medium">Can Provide:</div>
                              <div>
                                {[
                                  filter.canProvideRamp ? "Ramp" : null,
                                  filter.canProvideCompanion ? "Companion" : null,
                                  filter.canProvideStairChair ? "Stair Chair" : null
                                ].filter(Boolean).join(", ") || "None"}
                              </div>
                            </div>
                          )}
                          
                          {filter.preferRoundTrips !== undefined && (
                            <div className="flex items-start">
                              <div className="w-32 font-medium">Round Trips:</div>
                              <div>{filter.preferRoundTrips ? "Preferred" : "No preference"}</div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <Separator />
                      <CardFooter className="p-4">
                        <div className="flex justify-between w-full">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleActive(filter.id, !filter.active)}
                              disabled={toggleActiveMutation.isPending}
                            >
                              {filter.active ? "Disable" : "Enable"}
                            </Button>
                            {!filter.isDefault && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetDefault(filter.id)}
                                disabled={setDefaultMutation.isPending}
                              >
                                <StarIcon className="h-4 w-4 mr-1" />
                                Make Default
                              </Button>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              asChild
                            >
                              <Link to={`/driver/ride-filters/${filter.id}/edit`}>
                                <EditIcon className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button 
                              variant="outline"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteFilter(filter)}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardFooter>
                    </Card>
                  );
                }}
                ListEmptyComponent={
                  <div className="text-center py-12 bg-muted/40 rounded-lg">
                    <FilterIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No ride filters created yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Create your first ride filter to automatically find rides that match your preferences
                    </p>
                    <Button asChild>
                      <Link to="/driver/ride-filters/new">
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Create Your First Filter
                      </Link>
                    </Button>
                  </div>
                }
              />
            ) : (
              <div className="text-center py-12 bg-muted/40 rounded-lg">
                <FilterIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No ride filters created yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Create your first ride filter to automatically find rides that match your preferences
                </p>
                <Button asChild>
                  <Link to="/driver/ride-filters/new">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Your First Filter
                  </Link>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      
      <AlertDialog open={!!deleteFilter} onOpenChange={(open) => !open && setDeleteFilter(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ride Filter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "{deleteFilter?.name}" filter? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteFilter}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFilterMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DriverLayout>
  );
}