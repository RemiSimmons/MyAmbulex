import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate, cleanAddress } from "@/lib/utils";
import { 
  Card, 
  CardContent, 
  CardDescription,
  CardFooter,
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Ride, Bid, insertBidSchema } from "@shared/schema";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MapView from "@/components/map-view";
import BidSlider from "@/components/bid-slider";
import { LegalAgreementsPopup } from "@/components/legal-agreements-popup";
import { 
  ChevronLeft, 
  CalendarDays, 
  MapPin, 
  MapPinned,
  Clock, 
  Accessibility, 
  Car, 
  Bed,
  ArrowRight,
  Loader2
} from "lucide-react";

// Extend the bid schema with validation
const createBidSchema = z.object({
  rideId: z.number(),
  amount: z.number().min(1, "Bid amount is required"),
  notes: z.string().optional(),
});

type CreateBidValues = z.infer<typeof createBidSchema>;

export default function DriverBid() {
  const [path, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Default to "0" if we can't extract a ride ID
  let rideId = "0";
  
  // Try to get the ride ID from the URL
  try {
    // First check query params
    const searchParams = new URLSearchParams(window.location.search);
    const paramRideId = searchParams.get('rideId');
    
    if (paramRideId) {
      rideId = paramRideId;
    } else if (path) {
      // Try to get it from the path
      const pathParts = path.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && !isNaN(Number(lastPart))) {
        rideId = lastPart;
      }
    }
  } catch (error) {
    console.error("Error extracting ride ID from URL:", error);
  }
  
  const [suggestedPrice, setSuggestedPrice] = useState(0);
  const [minBid, setMinBid] = useState(0);
  const [maxBid, setMaxBid] = useState(0);
  const [showLegalPopup, setShowLegalPopup] = useState(false);

  // Fetch ride details
  const { data: ride, isLoading: isLoadingRide, error: rideError } = useQuery<Ride>({
    queryKey: [`/api/rides/${rideId}`],
    enabled: !!rideId && !!user && user.role === "driver",
    retry: (failureCount, error: any) => {
      // Don't retry if it's a legal agreements error
      if (error?.statusCode === 403 && error?.data?.code === 'LEGAL_AGREEMENTS_REQUIRED') {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    },
  });

  // Check if the ride query failed due to legal agreements
  useEffect(() => {
    if (rideError && (rideError as any)?.statusCode === 403 && (rideError as any)?.data?.code === 'LEGAL_AGREEMENTS_REQUIRED') {
      setShowLegalPopup(true);
    }
  }, [rideError]);

  const form = useForm<CreateBidValues>({
    resolver: zodResolver(createBidSchema),
    defaultValues: {
      rideId: Number(rideId),
      amount: 0,
      notes: "",
    },
  });

  // Set initial bid amount when ride data is loaded
  useEffect(() => {
    if (ride) {
      // Calculate suggested price based on ride details
      let price = 50; // Base fare
      
      // Add vehicle type premium
      if (ride.vehicleType === "wheelchair") price += 20;
      if (ride.vehicleType === "stretcher") price += 40;
      
      // Add for stairs
      if (ride.pickupStairs !== "none") {
        const stairsMap: Record<string, number> = {
          "1-3": 5,
          "4-10": 10,
          "11+": 15,
          "full_flight": 20
        };
        price += stairsMap[ride.pickupStairs as string] || 0;
      }
      
      if (ride.dropoffStairs !== "none") {
        const stairsMap: Record<string, number> = {
          "1-3": 5,
          "4-10": 10,
          "11+": 15,
          "full_flight": 20
        };
        price += stairsMap[ride.dropoffStairs as string] || 0;
      }
      
      // Add for additional services
      if (ride.needsRamp) price += 10;
      if (ride.needsCompanion) price += 15;
      if (ride.needsStairChair) price += 20;
      if (ride.needsWaitTime) price += 25;
      
      // Add distance-based fare if available
      if (ride.estimatedDistance) {
        price += ride.estimatedDistance * 2; // $2 per mile
      }
      
      // Set suggested price
      setSuggestedPrice(price);
      
      // Set min and max bid range with 30% flexibility
      // Always use rider's bid amount as the base price if available
      const basePrice = ride.riderBid || price;
      
      // For driver's initial bid, min is 70% of the rider's bid or calculated price
      const min = basePrice * 0.7;
      // For driver's initial bid, max is 130% of the rider's bid amount
      const max = basePrice * 1.3;
      
      setMinBid(Math.floor(min));
      setMaxBid(Math.ceil(max));
      
      // Set initial bid amount to the rider's submitted price
      if (ride.riderBid) {
        form.setValue("amount", ride.riderBid);
        setSuggestedPrice(ride.riderBid); // Also set suggested price to rider's bid
      } else {
        form.setValue("amount", price);
      }
    }
  }, [ride, form]);

  const bidMutation = useMutation({
    mutationFn: async (data: CreateBidValues) => {
      const res = await apiRequest("POST", "/api/bids", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/bids"] });
      toast({
        title: "Bid submitted successfully",
        description: "You'll be notified if your bid is accepted.",
      });
      navigate("/driver/dashboard");
    },
    onError: (error: any) => {
      console.error("Bid submission error:", error);
      
      // Check if the error is related to legal agreements
      if (error.statusCode === 403 && error.data?.code === 'LEGAL_AGREEMENTS_REQUIRED') {
        setShowLegalPopup(true);
        return;
      }
      
      // Handle other errors normally
      toast({
        title: "Failed to submit bid",
        description: error.message || "An error occurred while submitting your bid.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: CreateBidValues) {
    bidMutation.mutate(data);
  }

  function getVehicleIcon(type: string) {
    switch (type) {
      case "wheelchair":
        return <Accessibility className="h-4 w-4" />;
      case "stretcher":
        return <Bed className="h-4 w-4" />;
      default:
        return <Car className="h-4 w-4" />;
    }
  }

  // If not authenticated or not a driver, show error
  if (!user || user.role !== "driver") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Unauthorized</CardTitle>
              <CardDescription>You need to be logged in as a driver to place bids.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => navigate("/auth?role=driver")}>
                Login as Driver
              </Button>
            </CardFooter>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // If ride not found or still loading
  if (isLoadingRide) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-grow flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Ride Not Found</CardTitle>
              <CardDescription>The ride you're looking for doesn't exist or has been removed.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => navigate("/driver/dashboard")}>
                Return to Dashboard
              </Button>
            </CardFooter>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/driver/dashboard")}
            className="mb-3"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Place Your Bid</h1>
          <p className="text-gray-600">Review ride details and submit your bid</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{cleanAddress(ride.dropoffLocation)}</CardTitle>
                    <CardDescription>
                      {formatDate(ride.scheduledTime, 'long')}
                    </CardDescription>
                  </div>
                  <Badge className="capitalize">{ride.vehicleType}</Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Trip Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium mb-3">Trip Summary</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start">
                        <CalendarDays className="h-4 w-4 text-gray-500 mt-1 mr-2" />
                        <div>
                          <p className="text-gray-800 font-medium">Date & Time</p>
                          <p className="text-gray-600">{formatDate(ride.scheduledTime, 'datetime')}</p>
                        </div>
                      </div>
                      
                      {ride.estimatedDistance && (
                        <div className="flex items-start">
                          <MapPinned className="h-4 w-4 text-gray-500 mt-1 mr-2" />
                          <div>
                            <p className="text-gray-800 font-medium">Distance</p>
                            <p className="text-gray-600">{ride.estimatedDistance.toFixed(1)} miles</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-gray-500 mt-1 mr-2" />
                        <div>
                          <p className="text-gray-800 font-medium">From</p>
                          <p className="text-gray-600">{cleanAddress(ride.pickupLocation)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-gray-500 mt-1 mr-2" />
                        <div>
                          <p className="text-gray-800 font-medium">To</p>
                          <p className="text-gray-600">{cleanAddress(ride.dropoffLocation)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="mt-1 mr-2">
                          {getVehicleIcon(ride.vehicleType)}
                        </div>
                        <div>
                          <p className="text-gray-800 font-medium">Vehicle Type</p>
                          <p className="text-gray-600 capitalize">{ride.vehicleType}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Fare Details */}
                  <div>
                    <h3 className="font-medium mb-3">Fare Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Base Fare ({ride.vehicleType})</span>
                        <span>${ride.vehicleType === "standard" ? "50.00" : ride.vehicleType === "wheelchair" ? "70.00" : "90.00"}</span>
                      </div>
                      
                      {ride.estimatedDistance && (
                        <div className="flex justify-between text-sm">
                          <span>Mileage ({ride.estimatedDistance.toFixed(1)} miles)</span>
                          <span>${(ride.estimatedDistance * 2).toFixed(2)}</span>
                        </div>
                      )}
                      
                      {ride.pickupStairs !== "none" && (
                        <div className="flex justify-between text-sm">
                          <span>Pickup stairs ({ride.pickupStairs?.replace("_", " ")})</span>
                          <span>
                            +${ride.pickupStairs === "1-3" ? "5.00" : 
                              ride.pickupStairs === "4-10" ? "10.00" : 
                              ride.pickupStairs === "11+" ? "15.00" : "20.00"}
                          </span>
                        </div>
                      )}
                      
                      {ride.dropoffStairs !== "none" && (
                        <div className="flex justify-between text-sm">
                          <span>Dropoff stairs ({ride.dropoffStairs?.replace("_", " ")})</span>
                          <span>
                            +${ride.dropoffStairs === "1-3" ? "5.00" : 
                              ride.dropoffStairs === "4-10" ? "10.00" : 
                              ride.dropoffStairs === "11+" ? "15.00" : "20.00"}
                          </span>
                        </div>
                      )}
                      
                      {ride.needsRamp && (
                        <div className="flex justify-between text-sm">
                          <span>Ramp access</span>
                          <span>+$10.00</span>
                        </div>
                      )}
                      
                      {ride.needsCompanion && (
                        <div className="flex justify-between text-sm">
                          <span>Companion assistance</span>
                          <span>+$15.00</span>
                        </div>
                      )}
                      
                      {ride.needsStairChair && (
                        <div className="flex justify-between text-sm">
                          <span>Stair chair</span>
                          <span>+$20.00</span>
                        </div>
                      )}
                      
                      {ride.needsWaitTime && (
                        <div className="flex justify-between text-sm">
                          <span>Wait time</span>
                          <span>+$25.00</span>
                        </div>
                      )}
                      
                      {/* Subtotal before platform fee and tax */}
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span>Subtotal</span>
                        <span>${(() => {
                          const subtotal = suggestedPrice / 1.13; // Remove tax and platform fee
                          return subtotal.toFixed(2);
                        })()}</span>
                      </div>

                      {/* Platform fee */}
                      <div className="flex justify-between text-sm">
                        <span>Platform fee (5%)</span>
                        <span>+${(() => {
                          const subtotal = suggestedPrice / 1.13;
                          const platformFee = subtotal * 0.05;
                          return platformFee.toFixed(2);
                        })()}</span>
                      </div>

                      {/* Tax */}
                      <div className="flex justify-between text-sm">
                        <span>Tax (8%)</span>
                        <span>+${(() => {
                          const subtotal = suggestedPrice / 1.13;
                          const platformFee = subtotal * 0.05;
                          const tax = (subtotal + platformFee) * 0.08;
                          return tax.toFixed(2);
                        })()}</span>
                      </div>

                      <div className="border-t pt-2 flex justify-between font-medium">
                        <span>Total Price</span>
                        <span>${suggestedPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Bidding Information */}
                <div>
                  <h3 className="font-medium mb-4">Bidding Information</h3>
                  
                  {ride.riderBid && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                      <div className="flex items-center text-blue-800 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Rider's Bid: ${ride.riderBid.toFixed(2)}</span>
                      </div>
                      <p className="text-sm text-blue-700">The rider has submitted a bid of ${ride.riderBid.toFixed(2)} for this ride. Your initial bid starts at this amount.</p>
                      <p className="text-sm text-blue-700 mt-2">You can:</p>
                      <ul className="text-sm text-blue-700 list-disc list-inside mt-1">
                        <li>Accept this exact price (your current bid)</li>
                        <li>Offer a lower price (down to ${Math.floor(ride.riderBid * 0.7).toFixed(2)}, which is 30% lower)</li>
                        <li>Offer a higher price (up to ${Math.ceil(ride.riderBid * 1.3).toFixed(2)}, which is 30% higher)</li>
                      </ul>
                    </div>
                  )}
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Bid</FormLabel>
                            <FormControl>
                              <BidSlider
                                minValue={minBid}
                                maxValue={maxBid}
                                defaultValue={field.value}
                                step={1}
                                onChange={field.onChange}
                                suggestedPrice={suggestedPrice}
                              />
                            </FormControl>
                            <FormDescription>
                              Set your bid amount. You can offer from 70% to 130% of the rider's bid (${minBid.toFixed(2)} to ${maxBid.toFixed(2)}). Lower bids may increase chances of selection, but higher bids can increase your earnings. Maximum 3 counter offers allowed per ride.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Notes (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Add any notes for the rider about your service"
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Let the rider know about your qualifications, vehicle features, or any other information that might help them select your bid.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="sm:w-1/2"
                          onClick={() => navigate("/driver/dashboard")}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          className="sm:w-1/2"
                          disabled={bidMutation.isPending}
                        >
                          {bidMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Submitting Bid...
                            </>
                          ) : (
                            <>
                              Submit Bid
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Route Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <MapView 
                  pickupLocation={{ 
                    lat: ride.pickupLocationLat || 0, 
                    lng: ride.pickupLocationLng || 0, 
                    label: ride.pickupLocation 
                  }}
                  dropoffLocation={{ 
                    lat: ride.dropoffLocationLat || 0, 
                    lng: ride.dropoffLocationLng || 0, 
                    label: ride.dropoffLocation 
                  }}
                  className="h-64 rounded-lg"
                />
                
                {ride.estimatedDistance && (
                  <div className="mt-3 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>Estimated distance: {ride.estimatedDistance.toFixed(1)} miles</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Accessibility Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {ride.needsRamp && (
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mt-0.5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>Accessibility ramp needed</span>
                    </div>
                  )}
                  
                  {ride.pickupStairs && ride.pickupStairs !== "none" && (
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500 mt-0.5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>Pickup location: {ride.pickupStairs.replace("_", " ")} stairs</span>
                    </div>
                  )}
                  
                  {ride.dropoffStairs && ride.dropoffStairs !== "none" && (
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500 mt-0.5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>Dropoff location: {ride.dropoffStairs.replace("_", " ")} stairs</span>
                    </div>
                  )}
                  
                  {ride.needsCompanion && (
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mt-0.5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                      </svg>
                      <span>Companion assistance required</span>
                    </div>
                  )}
                  
                  {ride.needsStairChair && (
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500 mt-0.5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                      </svg>
                      <span>Stair chair required</span>
                    </div>
                  )}
                  
                  {ride.needsWaitTime && (
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mt-0.5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span>Wait time requested</span>
                    </div>
                  )}
                  
                  {ride.specialInstructions && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-1">Special Instructions:</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{ride.specialInstructions}</p>
                    </div>
                  )}
                  
                  {!ride.needsRamp && 
                   ride.pickupStairs === "none" && 
                   ride.dropoffStairs === "none" && 
                   !ride.needsCompanion && 
                   !ride.needsStairChair && 
                   !ride.needsWaitTime && 
                   !ride.specialInstructions && (
                    <div className="flex items-center justify-center text-gray-500 py-4">
                      <p className="text-sm">No special requirements for this ride</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
      
      <LegalAgreementsPopup
        isOpen={showLegalPopup}
        onClose={() => setShowLegalPopup(false)}
        onComplete={() => {
          setShowLegalPopup(false);
          // Refresh user data to get updated legal agreement status
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          queryClient.invalidateQueries({ queryKey: ["/api/legal-agreements/completion-status"] });
          
          toast({
            title: "Legal Agreements Signed",
            description: "You can now proceed with submitting your bid.",
          });
          
          // Retry the form submission after a brief delay to allow state updates
          setTimeout(() => {
            form.handleSubmit(onSubmit)();
          }, 1000);
        }}
      />
    </div>
  );
}
