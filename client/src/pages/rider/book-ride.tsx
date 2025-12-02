import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Footer from "@/components/layout/footer";
import { useAuth } from "@/hooks/use-auth";
import { insertRideSchema, InsertRide } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { CoordinateValidator } from "@shared/coordinate-validator";
import VehicleTypeSelection from "@/components/vehicle-type-selection";
import RoutePreview from "@/components/route-preview";
import EnhancedAddressInput from "@/components/enhanced-address-input";
import BidSlider from "@/components/bid-slider";
import { LegalAgreementsPopup } from "@/components/legal-agreements-popup";
import { UrgentRideWarningDialog } from "@/components/urgent-ride-warning-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, MapPin, Clock, Calendar, Car, Accessibility, Stethoscope } from "lucide-react";
import { RidePaymentForm } from '../../components/payment/RidePaymentForm';


const createRideSchema = z.object({
  // Core ride details
  pickupLocation: z.string().min(3, "Please enter a valid pickup location"),
  dropoffLocation: z.string().min(3, "Please enter a valid destination"),
  scheduledTime: z.coerce.date().min(new Date(), {
    message: "Scheduled time must be in the future",
  }),
  vehicleType: z.enum(["standard", "wheelchair", "stretcher"]),
  riderBid: z.coerce.number().min(10, "Bid must be at least $10"),

  // Accessibility options
  pickupStairs: z.enum(["none", "1-3", "4-10", "11+", "full_flight"]),
  dropoffStairs: z.enum(["none", "1-3", "4-10", "11+", "full_flight"]),
  needsRamp: z.boolean().default(false),
  needsCompanion: z.boolean().default(false),
  needsStairChair: z.boolean().default(false),
  needsWaitTime: z.boolean().default(false),
  waitTimeMinutes: z.number().default(0),

  // Additional information
  specialInstructions: z.string().optional(),

  // Round trip options
  isRoundTrip: z.boolean().default(false),
  returnTime: z.coerce.date().optional(),
});

type CreateRideValues = z.infer<typeof createRideSchema>;

export default function BookRide() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Helper function to format date without timezone conversion
  const formatDateForServer = (date: Date | string): string => {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const milliseconds = String(d.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
  };

  // Generate time options starting from 6:00 AM to 6:00 AM next day (24 hours)
  const generateTimeOptions = () => {
    return Array.from({ length: 96 }, (_, i) => {
      // Start from 6:00 AM (hour 6), so add 24 quarters (6 hours)
      const totalQuarters = i + 24; // 24 quarters = 6 hours (6:00 AM start)
      const hours = Math.floor(totalQuarters / 4) % 24; // Wrap around after 24 hours
      const minutes = (totalQuarters % 4) * 15;
      const time24 = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      const time12 = new Date(`2000-01-01T${time24}`).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      return { time24, time12 };
    });
  };
  const [activeTab, setActiveTab] = useState("details");
  const [suggestedPrice, setSuggestedPrice] = useState(100);
  const [pickupCoordinates, setPickupCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [dropoffCoordinates, setDropoffCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [displayedPickupAddress, setDisplayedPickupAddress] = useState('');
  const [displayedDropoffAddress, setDisplayedDropoffAddress] = useState('');
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
    optimizedWaypoints?: boolean;
  } | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoValidation, setPromoValidation] = useState<{
    valid: boolean;
    discount?: number;
    finalPrice?: number;
    message?: string;
  } | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [showLegalPopup, setShowLegalPopup] = useState(false);
  const [showUrgentWarning, setShowUrgentWarning] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<CreateRideValues | null>(null);

  const form = useForm<CreateRideValues>({
    resolver: zodResolver(createRideSchema),
    defaultValues: {
      pickupLocation: "",
      dropoffLocation: "",
      scheduledTime: new Date(Date.now() + 3600000), // 1 hour from now
      vehicleType: "standard",
      riderBid: 100,
      pickupStairs: "none",
      dropoffStairs: "none",
      needsRamp: false,
      needsCompanion: false,
      needsStairChair: false,
      needsWaitTime: false,
      waitTimeMinutes: 0,
      specialInstructions: "",
      isRoundTrip: false,
      returnTime: new Date(Date.now() + 7200000), // 2 hours from now
    },
  });

  const watchVehicleType = form.watch("vehicleType");

  // Calculate suggested price based on form inputs and route information
  const calculateSuggestedPrice = () => {
    const values = form.getValues();
    let price = 50; // Base fare

    // Add price for vehicle type
    if (values.vehicleType === "wheelchair") price += 20;
    if (values.vehicleType === "stretcher") price += 40;

    // Add for stairs
    if (values.pickupStairs !== "none") {
      const stairsMap: Record<string, number> = {
        "1-3": 5,
        "4-10": 10,
        "11+": 15,
        "full_flight": 20
      };
      price += stairsMap[values.pickupStairs] || 0;
    }

    if (values.dropoffStairs !== "none") {
      const stairsMap: Record<string, number> = {
        "1-3": 5,
        "4-10": 10,
        "11+": 15,
        "full_flight": 20
      };
      price += stairsMap[values.dropoffStairs] || 0;
    }

    // Add for additional services
    if (values.needsRamp) price += 10;
    if (values.needsCompanion) price += 15;
    if (values.needsStairChair) price += 20;

    // Add for wait time - base rate $15 plus $0.25 per minute
    if (values.needsWaitTime && values.waitTimeMinutes > 0) {
      const baseWaitFee = 15;
      const perMinuteRate = 0.25;
      price += baseWaitFee + (values.waitTimeMinutes * perMinuteRate);
    }

    // Add price based on route information if available
    if (routeInfo) {
      // Extract distance in miles (assuming distance is in the format "X.X mi")
      const distanceMatch = routeInfo.distance.match(/(\d+(\.\d+)?)/);
      if (distanceMatch) {
        const distanceMiles = parseFloat(distanceMatch[0]);
        // Add $2 per mile
        price += Math.round(distanceMiles * 2);
      }

      // Extract duration in minutes (assuming duration is in the format "X mins" or "X hours Y mins")
      let minutes = 0;
      const hoursMatch = routeInfo.duration.match(/(\d+)\s+hour/);
      const minutesMatch = routeInfo.duration.match(/(\d+)\s+min/);

      if (hoursMatch) {
        minutes += parseInt(hoursMatch[1]) * 60;
      }

      if (minutesMatch) {
        minutes += parseInt(minutesMatch[1]);
      }

      // Add $0.5 per minute of estimated travel time
      if (minutes > 0) {
        price += Math.round(minutes * 0.5);
      }
    }

    // If it's a round trip, add 80% of the one-way trip cost (20% discount for return)
    if (values.isRoundTrip) {
      const returnTripCost = Math.round(price * 0.8);
      price += returnTripCost;
    }

    return price;
  };

  // Manual price calculation function
  function updatePrice() {
    const newPrice = calculateSuggestedPrice();
    setSuggestedPrice(newPrice);
    form.setValue("riderBid", newPrice);
  }

  // Promo code validation function
  const validatePromoCode = async (code: string) => {
    if (!code.trim()) {
      setPromoValidation(null);
      return;
    }

    setIsValidatingPromo(true);
    try {
      const response = await apiRequest('POST', '/api/validate-promo-code', {
        code: code.trim(),
        rideAmount: suggestedPrice
      });

      if (response.ok) {
        const result = await response.json();
        if (result.valid) {
          // Calculate final price based on promo code
          let finalPrice = suggestedPrice;
          if (result.promoCode.discountType === 'fixed_amount') {
            finalPrice = Math.max(0, suggestedPrice - result.promoCode.discountValue);
          } else if (result.promoCode.discountType === 'percentage') {
            finalPrice = suggestedPrice * (1 - result.promoCode.discountValue / 100);
          } else if (result.promoCode.discountType === 'set_price') {
            finalPrice = result.promoCode.discountValue;
          }

          setPromoValidation({
            valid: true,
            discount: suggestedPrice - finalPrice,
            finalPrice: finalPrice,
            message: result.promoCode.description
          });
        } else {
          setPromoValidation({
            valid: false,
            message: result.error || 'Invalid promo code'
          });
        }
      } else {
        setPromoValidation({
          valid: false,
          message: 'Unable to validate promo code'
        });
      }
    } catch (error) {
      setPromoValidation({
        valid: false,
        message: 'Error validating promo code'
      });
    } finally {
      setIsValidatingPromo(false);
    }
  };

  // Watch only specific fields that affect pricing
  const watchedFields = form.watch([
    "vehicleType", 
    "pickupStairs", 
    "dropoffStairs", 
    "needsRamp", 
    "needsCompanion", 
    "needsStairChair", 
    "needsWaitTime", 
    "waitTimeMinutes", 
    "isRoundTrip"
  ]);

  // Add a useEffect to update price when watched fields change
  useEffect(() => {
    updatePrice();
  }, [watchedFields]);

  // Setup form event handlers to update price on field changes - without calling updatePrice directly
  const onVehicleTypeChange = (type: "standard" | "wheelchair" | "stretcher") => {
    form.setValue("vehicleType", type);
    // Price will update via the useEffect above
  };

  const onStairsChange = (value: string, field: "pickupStairs" | "dropoffStairs") => {
    form.setValue(field, value as any);
    // Price will update via the useEffect above  
  };

  const onCheckboxChange = (checked: boolean, field: "needsRamp" | "needsCompanion" | "needsStairChair" | "needsWaitTime" | "isRoundTrip") => {
    form.setValue(field, checked);

    // If enabling wait time, set a default value of 15 minutes
    if (field === "needsWaitTime" && checked) {
      form.setValue("waitTimeMinutes", 15);
    }

    // Price will update via the useEffect above
  };

  const createRideMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Sending data to API:", data);
      const res = await apiRequest("POST", "/api/rides", data);
      if (!res.ok) {
        const errorData = await res.json();
        // Create a detailed error object for better error handling
        const error: any = new Error(errorData.message || "Failed to create ride request");
        error.statusCode = res.status;
        error.data = errorData;
        throw error;
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
      toast({
        title: "Ride request created",
        description: "Your ride request has been created and is now available for drivers to bid on.",
      });
      setLocation("/rider/dashboard");
    },
    onError: (error: any) => {
      console.error("Ride creation error:", error);
      
      // Check if the error is related to legal agreements
      if (error.statusCode === 403 && error.data?.code === 'LEGAL_AGREEMENTS_REQUIRED') {
        setShowLegalPopup(true);
        return;
      }
      
      // Handle other errors normally
      toast({
        title: "Failed to create ride request",
        description: error.message || "An error occurred while creating your ride request.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: CreateRideValues) {
    // Check if ride is within 24 hours and show urgent warning
    const hoursUntilRide = (values.scheduledTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilRide <= 24 && hoursUntilRide > 0) {
      setPendingSubmission(values);
      setShowUrgentWarning(true);
      return;
    }
    
    // Proceed with normal submission
    handleRideSubmission(values);
  }

  function handleRideSubmission(values: CreateRideValues) {
    // Check if required coordinates are available
    if (!pickupCoordinates || !dropoffCoordinates) {
      toast({
        title: "Missing location details",
        description: "Please make sure you select pickup and dropoff locations from the suggestions to provide coordinates.",
        variant: "destructive",
      });
      return;
    }

    // Validate coordinates are not fallback values
    if (!pickupCoordinates?.lat || !pickupCoordinates?.lng ||
        !dropoffCoordinates?.lat || !dropoffCoordinates?.lng) {
      toast({
        title: "Missing location coordinates",
        description: "Please select pickup and dropoff locations from the autocomplete suggestions",
        variant: "destructive",
      });
      return;
    }

    // Check for invalid fallback coordinates that cause pricing errors
    if ((pickupCoordinates.lat === 1 && pickupCoordinates.lng === 1) ||
        (dropoffCoordinates.lat === 1 && dropoffCoordinates.lng === 1) ||
        (pickupCoordinates.lat === 0 && pickupCoordinates.lng === 0) ||
        (dropoffCoordinates.lat === 0 && dropoffCoordinates.lng === 0) ||
        Math.abs(pickupCoordinates.lat) > 90 || Math.abs(pickupCoordinates.lng) > 180 ||
        Math.abs(dropoffCoordinates.lat) > 90 || Math.abs(dropoffCoordinates.lng) > 180) {
      toast({
        title: "Invalid coordinates detected",
        description: "Please re-select your addresses from the autocomplete suggestions for accurate pricing",
        variant: "destructive",
      });
      return;
    }

    console.log("Form values:", values);
    console.log("Pickup coordinates:", pickupCoordinates);
    console.log("Dropoff coordinates:", dropoffCoordinates);

    // Validate that return time is after scheduled time if it's a round trip
    if (values.isRoundTrip && values.returnTime && values.scheduledTime) {
      const scheduledTime = new Date(values.scheduledTime);
      const returnTime = new Date(values.returnTime);

      if (returnTime <= scheduledTime) {
        toast({
          title: "Invalid return time",
          description: "Return time must be after the initial pickup time",
          variant: "destructive",
        });
        return;
      }
    }

    // Preparing the data for submission
    const submitData = {
      pickupLocation: values.pickupLocation,
      dropoffLocation: values.dropoffLocation,

      // Convert date to local ISO string (without timezone conversion)
      scheduledTime: formatDateForServer(values.scheduledTime),

      vehicleType: values.vehicleType,
      riderBid: values.riderBid,

      // Include promo code if applied
      ...(promoValidation?.valid && promoCode ? {
        promoCode: promoCode.trim(),
        originalPrice: suggestedPrice,
        discountedPrice: promoValidation.finalPrice
      } : {}),
      pickupStairs: values.pickupStairs,
      dropoffStairs: values.dropoffStairs,
      needsRamp: values.needsRamp,
      needsCompanion: values.needsCompanion,
      needsStairChair: values.needsStairChair,
      needsWaitTime: values.needsWaitTime,
      waitTimeMinutes: values.needsWaitTime ? values.waitTimeMinutes : 0,
      specialInstructions: values.specialInstructions,

      // Add coordinates directly in the format expected by the database
      pickupLocationLat: pickupCoordinates.lat,
      pickupLocationLng: pickupCoordinates.lng,
      dropoffLocationLat: dropoffCoordinates.lat,
      dropoffLocationLng: dropoffCoordinates.lng,

      // Add round trip data if enabled
      isRoundTrip: values.isRoundTrip,

      // Only include return information if it's a round trip
      ...(values.isRoundTrip && values.returnTime ? {
        returnTime: formatDateForServer(values.returnTime),
        // For round trips, the return pickup location is the original dropoff location
        returnPickupLocation: values.dropoffLocation,
        returnPickupLocationLat: dropoffCoordinates.lat,
        returnPickupLocationLng: dropoffCoordinates.lng,
        // For round trips, the return dropoff location is the original pickup location
        returnDropoffLocation: values.pickupLocation,
        returnDropoffLocationLat: pickupCoordinates.lat,
        returnDropoffLocationLng: pickupCoordinates.lng,
      } : {}),

      // Add route information if available with validation
      estimatedDistance: routeInfo?.distance 
        ? (() => {
            const parsedDistance = parseFloat(routeInfo.distance.replace(/[^\d.]/g, ''));
            // Validate distance is reasonable for medical transport (0.1 to 500 miles)
            if (parsedDistance > 500 || parsedDistance < 0.1 || isNaN(parsedDistance)) {
              console.error("Invalid distance parsed:", parsedDistance, "from:", routeInfo.distance);
              console.error("Route info details:", routeInfo);
              console.error("Pickup coordinates:", pickupCoordinates);
              console.error("Dropoff coordinates:", dropoffCoordinates);
              toast({
                title: "Distance Calculation Error",
                description: "Please verify your addresses have valid coordinates and try again.",
                variant: "destructive",
              });
              return undefined;
            }
            console.log("Valid distance parsed:", parsedDistance, "miles for route:", routeInfo.distance);
            return parsedDistance;
          })()
        : undefined,
      estimatedDuration: routeInfo?.duration
        ? routeInfo.duration
        : undefined,

      // For round trips, we'll use the same distance for the return journey (approximate)
      ...(values.isRoundTrip && routeInfo?.distance ? {
        returnEstimatedDistance: (() => {
          const parsedDistance = parseFloat(routeInfo.distance.replace(/[^\d.]/g, ''));
          return (parsedDistance > 500 || parsedDistance < 0.1 || isNaN(parsedDistance)) ? undefined : parsedDistance;
        })()
      } : {}),

      // Add urgent ride flags
      isUrgent: (values.scheduledTime.getTime() - Date.now()) / (1000 * 60 * 60) <= 24,
      urgentCancellationFee: 50,
      expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString() // 24 hours from now
    };

    // Log data being sent to the server
    console.log("Submitting ride request:", submitData);

    // Execute the mutation with the prepared data
    createRideMutation.mutate(submitData);
  }

  if (!user || user.role !== "rider") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-grow flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                {!user 
                  ? "Please log in to your rider account to book rides."
                  : "You need to be logged in as a rider to book rides."
                }
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => setLocation("/auth?tab=login&role=rider")}>
                Login as Rider
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
      <main className="flex-grow container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/rider/dashboard")}
            className="mb-3 text-sm sm:text-base"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">Book a Ride</h1>
          <p className="text-sm sm:text-base text-gray-600">Request transportation to your medical appointment</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold">Book a Ride</h3>
              </CardHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <CardContent>
                    <Tabs
                      value={activeTab}
                      onValueChange={setActiveTab}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
                        <TabsTrigger value="details" className="text-xs sm:text-sm">Ride Details</TabsTrigger>
                        <TabsTrigger value="bidding" className="text-xs sm:text-sm">Bidding</TabsTrigger>
                      </TabsList>

                      <TabsContent value="details" className="space-y-6 mt-0">
                        <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="pickupLocation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pickup Location</FormLabel>
                              <FormControl>
                                <EnhancedAddressInput
                                  value={displayedPickupAddress || field.value}
                                  onChange={(value, coordinates) => {
                                    field.onChange(value);
                                    setDisplayedPickupAddress(value);
                                    
                                    // Validate coordinates for US service area
                                    if (coordinates) {
                                      try {
                                        const validation = CoordinateValidator.validateUSCoordinates(coordinates);
                                        
                                        if (!validation.isValid) {
                                          console.error("Invalid pickup coordinates:", { coordinates, error: validation.error });
                                          toast({
                                            title: "Invalid Pickup Location",
                                            description: CoordinateValidator.getUserFriendlyError(validation.error || "Invalid location"),
                                            variant: "destructive",
                                          });
                                          setPickupCoordinates(null);
                                          return;
                                        }
                                        
                                        console.log('[BookRide] Pickup updated with validated coordinates:', { value, coordinates: validation.sanitizedCoordinates });
                                        setPickupCoordinates(validation.sanitizedCoordinates || coordinates);
                                      } catch (error) {
                                        console.error("Coordinate validation error:", error);
                                        toast({
                                          title: "Location Error",
                                          description: "We cannot process this location at this time",
                                          variant: "destructive",
                                        });
                                        setPickupCoordinates(null);
                                      }
                                    } else {
                                      setPickupCoordinates(null);
                                    }
                                  }}
                                  placeholder="Enter your pickup address"
                                  error={!!form.formState.errors.pickupLocation}
                                  showSavedLocations={true}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="dropoffLocation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Destination</FormLabel>
                              <FormControl>
                                <EnhancedAddressInput
                                  value={displayedDropoffAddress || field.value}
                                  onChange={(value, coordinates) => {
                                    field.onChange(value);
                                    setDisplayedDropoffAddress(value);
                                    
                                    // Validate coordinates for US service area
                                    if (coordinates) {
                                      try {
                                        const validation = CoordinateValidator.validateUSCoordinates(coordinates);
                                        
                                        if (!validation.isValid) {
                                          console.error("Invalid dropoff coordinates:", { coordinates, error: validation.error });
                                          toast({
                                            title: "Invalid Destination",
                                            description: CoordinateValidator.getUserFriendlyError(validation.error || "Invalid location"),
                                            variant: "destructive",
                                          });
                                          setDropoffCoordinates(null);
                                          return;
                                        }
                                        
                                        console.log('[BookRide] Dropoff updated with validated coordinates:', { value, coordinates: validation.sanitizedCoordinates });
                                        setDropoffCoordinates(validation.sanitizedCoordinates || coordinates);
                                      } catch (error) {
                                        console.error("Coordinate validation error:", error);
                                        toast({
                                          title: "Location Error",
                                          description: "We cannot process this location at this time",
                                          variant: "destructive",
                                        });
                                        setDropoffCoordinates(null);
                                      }
                                    } else {
                                      setDropoffCoordinates(null);
                                    }
                                  }}
                                  placeholder="Enter your destination address"
                                  error={!!form.formState.errors.dropoffLocation}
                                  showSavedLocations={true}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Round Trip Option */}
                        <FormField
                          control={form.control}
                          name="isRoundTrip"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    onCheckboxChange(!!checked, "isRoundTrip");
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Round Trip</FormLabel>
                                <FormDescription>
                                  Check this box if you need to be picked up after your appointment and returned to your original location
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        <div className={isMobile ? "grid gap-4" : "grid grid-cols-2 gap-4"}>
                          {isMobile ? (
                            // Mobile view: Date and time in separate fields
                            <>
                              <FormField
                                control={form.control}
                                name="scheduledTime"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Pickup Date</FormLabel>
                                    <FormControl>
                                      <div className="relative">
                                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                        <Input
                                          type="date"
                                          className="pl-10"
                                          {...field}
                                          value={field.value instanceof Date ? 
                                            field.value.toLocaleDateString('en-CA') : 
                                            new Date(field.value).toLocaleDateString('en-CA')}
                                          onChange={(e) => {
                                            const currentDate = field.value instanceof Date ? field.value : new Date(field.value);
                                            // Parse the date without timezone assumptions to prevent UTC conversion
                                            const [year, month, day] = e.target.value.split('-').map(Number);
                                            const selectedDate = new Date(year, month - 1, day);
                                            selectedDate.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0);
                                            field.onChange(selectedDate);
                                          }}
                                        />
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="scheduledTime"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Pickup Time</FormLabel>
                                    <Select
                                      onValueChange={(value) => {
                                        const currentDate = field.value instanceof Date ? field.value : new Date(field.value);
                                        const [hours, minutes] = value.split(':').map(Number);
                                        const newDate = new Date(currentDate);
                                        newDate.setHours(hours, minutes, 0, 0);
                                        field.onChange(newDate);
                                      }}
                                      value={field.value instanceof Date ? 
                                        field.value.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : 
                                        new Date(field.value).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="w-full">
                                          <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-gray-500" />
                                            <SelectValue placeholder="Select time" />
                                          </div>
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent className="max-h-[200px]">
                                        {generateTimeOptions().map(({ time24, time12 }) => (
                                          <SelectItem key={time24} value={time24}>
                                            {time12}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </>
                          ) : (
                            // Desktop view: Separate date and time fields like mobile
                            <>
                              <FormField
                                control={form.control}
                                name="scheduledTime"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Pickup Date</FormLabel>
                                    <FormControl>
                                      <div className="relative">
                                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                        <Input
                                          type="date"
                                          className="pl-10"
                                          {...field}
                                          value={field.value instanceof Date ? 
                                            field.value.toLocaleDateString('en-CA') : 
                                            new Date(field.value).toLocaleDateString('en-CA')}
                                          onChange={(e) => {
                                            const currentDate = field.value instanceof Date ? field.value : new Date(field.value);
                                            // Parse the date without timezone assumptions to prevent UTC conversion
                                            const [year, month, day] = e.target.value.split('-').map(Number);
                                            const selectedDate = new Date(year, month - 1, day);
                                            selectedDate.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0);
                                            field.onChange(selectedDate);
                                          }}
                                        />
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="scheduledTime"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Pickup Time</FormLabel>
                                    <Select
                                      onValueChange={(value) => {
                                        const currentDate = field.value instanceof Date ? field.value : new Date(field.value);
                                        const [hours, minutes] = value.split(':').map(Number);
                                        const newDate = new Date(currentDate);
                                        newDate.setHours(hours, minutes, 0, 0);
                                        field.onChange(newDate);
                                      }}
                                      value={field.value instanceof Date ? 
                                        field.value.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : 
                                        new Date(field.value).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="w-full">
                                          <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-gray-500" />
                                            <SelectValue placeholder="Select time" />
                                          </div>
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent className="max-h-[200px]">
                                        {generateTimeOptions().map(({ time24, time12 }) => (
                                          <SelectItem key={time24} value={time24}>
                                            {time12}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </>
                          )}

                          {form.watch("isRoundTrip") && (
                            isMobile ? (
                              // Mobile view: Split date and time for return
                              <>
                                <FormField
                                  control={form.control}
                                  name="returnTime"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Return Date</FormLabel>
                                      <FormControl>
                                        <div className="relative">
                                          <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                          <Input
                                            type="date"
                                            className="pl-10"
                                            {...field}
                                            value={field.value instanceof Date ? 
                                              field.value.toLocaleDateString('en-CA') : 
                                              (field.value ? new Date(field.value).toLocaleDateString('en-CA') : '')}
                                            onChange={(e) => {
                                              const currentDate = field.value instanceof Date ? field.value : (field.value ? new Date(field.value) : new Date());
                                              const selectedDate = new Date(e.target.value + 'T00:00:00');
                                              selectedDate.setHours(currentDate.getHours(), currentDate.getMinutes());
                                              field.onChange(selectedDate);
                                            }}
                                          />
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="returnTime"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Return Time</FormLabel>
                                      <Select
                                        onValueChange={(value) => {
                                          const currentDate = field.value instanceof Date ? field.value : (field.value ? new Date(field.value) : new Date());
                                          const [hours, minutes] = value.split(':').map(Number);
                                          const newDate = new Date(currentDate);
                                          newDate.setHours(hours, minutes, 0, 0);
                                          field.onChange(newDate);
                                        }}
                                        value={field.value instanceof Date ? 
                                          field.value.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : 
                                          (field.value ? new Date(field.value).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '')}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="w-full">
                                            <div className="flex items-center gap-2">
                                              <Clock className="h-4 w-4 text-gray-500" />
                                              <SelectValue placeholder="Select time" />
                                            </div>
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="max-h-[200px]">
                                          {generateTimeOptions().map(({ time24, time12 }) => (
                                          <SelectItem key={time24} value={time24}>
                                            {time12}
                                          </SelectItem>
                                        ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </>
                            ) : (
                              // Desktop view: Separate date and time for return like mobile
                              <>
                                <FormField
                                  control={form.control}
                                  name="returnTime"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Return Date</FormLabel>
                                      <FormControl>
                                        <div className="relative">
                                          <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                          <Input
                                            type="date"
                                            className="pl-10"
                                            {...field}
                                            value={field.value instanceof Date ? 
                                              field.value.toLocaleDateString('en-CA') : 
                                              (field.value ? new Date(field.value).toLocaleDateString('en-CA') : '')}
                                            onChange={(e) => {
                                              const currentDate = field.value instanceof Date ? field.value : (field.value ? new Date(field.value) : new Date());
                                              const selectedDate = new Date(e.target.value + 'T00:00:00');
                                              selectedDate.setHours(currentDate.getHours(), currentDate.getMinutes());
                                              field.onChange(selectedDate);
                                            }}
                                          />
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="returnTime"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Return Time</FormLabel>
                                      <Select
                                        onValueChange={(value) => {
                                          const currentDate = field.value instanceof Date ? field.value : (field.value ? new Date(field.value) : new Date());
                                          const [hours, minutes] = value.split(':').map(Number);
                                          const newDate = new Date(currentDate);
                                          newDate.setHours(hours, minutes, 0, 0);
                                          field.onChange(newDate);
                                        }}
                                        value={field.value instanceof Date ? 
                                          field.value.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : 
                                          (field.value ? new Date(field.value).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '')}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="w-full">
                                            <div className="flex items-center gap-2">
                                              <Clock className="h-4 w-4 text-gray-500" />
                                              <SelectValue placeholder="Select time" />
                                            </div>
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="max-h-[200px]">
                                          {generateTimeOptions().map(({ time24, time12 }) => (
                                          <SelectItem key={time24} value={time24}>
                                            {time12}
                                          </SelectItem>
                                        ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </>
                            )
                          )}
                        </div>

                        <FormField
                          control={form.control}
                          name="vehicleType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Accessibility</FormLabel>
                              <FormControl>
                                <VehicleTypeSelection
                                  selectedType={field.value as "standard" | "wheelchair" | "stretcher"}
                                  onSelect={(type) => {
                                    // Prevent form submission when changing vehicle type
                                    field.onChange(type);
                                    onVehicleTypeChange(type);
                                    // Don't proceed to next step automatically
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <FormField
                              control={form.control}
                              name="pickupStairs"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pickup Location Stairs</FormLabel>
                                  <Select
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      onStairsChange(value, "pickupStairs");
                                    }}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select stairs" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      <SelectItem value="1-3">1-3 steps</SelectItem>
                                      <SelectItem value="4-10">4-10 steps</SelectItem>
                                      <SelectItem value="11+">11+ steps</SelectItem>
                                      <SelectItem value="full_flight">Full flight of stairs</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div>
                            <FormField
                              control={form.control}
                              name="dropoffStairs"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Dropoff Location Stairs</FormLabel>
                                  <Select
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      onStairsChange(value, "dropoffStairs");
                                    }}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select stairs" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      <SelectItem value="1-3">1-3 steps</SelectItem>
                                      <SelectItem value="4-10">4-10 steps</SelectItem>
                                      <SelectItem value="11+">11+ steps</SelectItem>
                                      <SelectItem value="full_flight">Full flight of stairs</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="font-medium text-sm">Additional Options</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="needsRamp"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={(checked) => {
                                        field.onChange(checked);
                                        onCheckboxChange(!!checked, "needsRamp");
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">Ramp Needed</FormLabel>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="needsCompanion"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={(checked) => {
                                        field.onChange(checked);
                                        onCheckboxChange(!!checked, "needsCompanion");
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">Companion Assistance</FormLabel>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="needsStairChair"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={(checked) => {
                                        field.onChange(checked);
                                        onCheckboxChange(!!checked, "needsStairChair");
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">Stair Chair</FormLabel>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="needsWaitTime"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={(checked) => {
                                        field.onChange(checked);
                                        onCheckboxChange(!!checked, "needsWaitTime");
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">Wait Time</FormLabel>
                                </FormItem>
                              )}
                            />

                            {form.watch("needsWaitTime") && (
                              <FormField
                                control={form.control}
                                name="waitTimeMinutes"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Select Wait Time</FormLabel>
                                    <Select
                                      onValueChange={(value) => {
                                        const numValue = parseInt(value, 10);
                                        field.onChange(numValue);
                                        updatePrice();
                                      }}
                                      value={field.value > 0 ? String(field.value) : "15"}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select wait time" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="15">15 minutes</SelectItem>
                                        <SelectItem value="30">30 minutes</SelectItem>
                                        <SelectItem value="45">45 minutes</SelectItem>
                                        <SelectItem value="60">1 hour</SelectItem>
                                        <SelectItem value="90">1.5 hours</SelectItem>
                                        <SelectItem value="120">2 hours</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormDescription>
                                      Wait time will be included in your final price
                                    </FormDescription>
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        </div>

                        <FormField
                          control={form.control}
                          name="specialInstructions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Special Instructions (Optional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Add any special instructions for the driver here"
                                  className="resize-none"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Include any important details like building entrance information, medical equipment, etc.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button 
                          type="button" 
                          className="w-full"
                          onClick={() => {
                            // Check if we have both pickup and dropoff locations
                            const pickupLocation = form.getValues("pickupLocation");
                            const dropoffLocation = form.getValues("dropoffLocation");

                            if (pickupLocation && dropoffLocation && pickupCoordinates && dropoffCoordinates) {
                              // Show route preview on the map before moving to bidding
                              const mapElement = document.getElementById('map-view');
                              if (mapElement) {
                                // Scroll to the map to ensure the user sees the route preview
                                mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

                                // Give the user a moment to see the route, then switch tabs
                                setTimeout(() => {
                                  setActiveTab("bidding");
                                }, 1500);

                                // Show toast to inform user about route preview
                                toast({
                                  title: "Route Preview Available",
                                  description: "You can now see your route on the map. Continuing to bidding...",
                                  duration: 3000,
                                });
                              } else {
                                // If map element not found, just switch tabs
                                setActiveTab("bidding");
                              }
                            } else {
                              // If missing coordinates, show error message
                              toast({
                                title: "Missing Location Information",
                                description: "Please enter both pickup and destination addresses before continuing.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Next: Bidding
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="bidding" className="space-y-6 mt-0">
                      <div className="space-y-6">
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <h3 className="text-sm font-medium mb-2">Trip Summary</h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-start">
                              <Calendar className="h-4 w-4 text-gray-500 mt-1 mr-2" />
                              <div>
                                <p className="text-gray-800 font-medium">Date & Time</p>
                                <p className="text-gray-600">
                                  {(() => {
                                    const scheduledTime = form.watch("scheduledTime");
                                    const date = scheduledTime instanceof Date ? scheduledTime : new Date(scheduledTime);
                                    return date.toLocaleDateString('en-US', { 
                                      weekday: 'short',
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric' 
                                    }) + ', ' + date.toLocaleTimeString('en-US', { 
                                      hour: 'numeric', 
                                      minute: '2-digit',
                                      hour12: true 
                                    });
                                  })()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <div className="mt-1 mr-2">
                                {watchVehicleType === "wheelchair" && <Accessibility className="h-4 w-4 text-gray-500" />}
                                {watchVehicleType === "stretcher" && <Stethoscope className="h-4 w-4 text-gray-500" />}
                                {watchVehicleType === "standard" && <Car className="h-4 w-4 text-gray-500" />}
                              </div>
                              <div>
                                <p className="text-gray-800 font-medium">Vehicle Type</p>
                                <p className="text-gray-600 capitalize">{watchVehicleType}</p>
                              </div>
                            </div>
                            <div className="flex items-start col-span-2">
                              <MapPin className="h-4 w-4 text-gray-500 mt-1 mr-2" />
                              <div>
                                <p className="text-gray-800 font-medium">From</p>
                                <p className="text-gray-600">{form.getValues("pickupLocation") || "Your pickup location"}</p>
                              </div>
                            </div>
                            <div className="flex items-start col-span-2">
                              <MapPin className="h-4 w-4 text-gray-500 mt-1 mr-2" />
                              <div>
                                <p className="text-gray-800 font-medium">To</p>
                                <p className="text-gray-600">{form.getValues("dropoffLocation") || "Your destination"}</p>
                              </div>
                            </div>

                            {/* Show wait time if enabled */}
                            {form.watch("needsWaitTime") && form.watch("waitTimeMinutes") > 0 && (
                              <div className="flex items-start col-span-2">
                                <Clock className="h-4 w-4 text-gray-500 mt-1 mr-2" />
                                <div>
                                  <p className="text-gray-800 font-medium">Wait Time</p>
                                  <p className="text-gray-600">{form.watch("waitTimeMinutes")} minutes (${(15 + form.watch("waitTimeMinutes") * 0.25).toFixed(2)})</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="font-medium">Fare Breakdown</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Base fare ({watchVehicleType})</span>
                              <span>${watchVehicleType === "standard" ? "50.00" : watchVehicleType === "wheelchair" ? "70.00" : "90.00"}</span>
                            </div>

                            {/* Simplified fare breakdown */}
                            {/* Additional service fees */}
                            {form.watch("needsRamp") && (
                              <div className="flex justify-between text-sm">
                                <span>Ramp Service</span>
                                <span>+$15.00</span>
                              </div>
                            )}
                            {form.watch("needsCompanion") && (
                              <div className="flex justify-between text-sm">
                                <span>Companion Assistance</span>
                                <span>+$20.00</span>
                              </div>
                            )}
                            {form.watch("needsStairChair") && (
                              <div className="flex justify-between text-sm">
                                <span>Stair Chair Equipment</span>
                                <span>+$30.00</span>
                              </div>
                            )}
                            {form.watch("needsWaitTime") && (
                              <div className="flex justify-between text-sm">
                                <span>Wait Time Service</span>
                                <span>+$35.00</span>
                              </div>
                            )}

                            {/* Distance and other fees */}
                            <div className="flex justify-between text-sm">
                              <span>Distance & other fees</span>
                              <span>+${(() => {
                                // Calculate what's left after subtracting base fare and service fees
                                const subtotal = suggestedPrice / 1.13; // Remove platform fee (5%) and tax (8%)
                                const baseFare = form.watch("vehicleType") === "standard" ? 50 : 
                                               form.watch("vehicleType") === "wheelchair" ? 70 : 90;
                                const serviceFees = 
                                  (form.watch("needsRamp") ? 15 : 0) + 
                                  (form.watch("needsCompanion") ? 20 : 0) + 
                                  (form.watch("needsStairChair") ? 30 : 0) + 
                                  (form.watch("needsWaitTime") ? 35 : 0);
                                const distanceAndOtherFees = subtotal - baseFare - serviceFees;
                                return Math.max(0, distanceAndOtherFees).toFixed(2);
                              })()}</span>
                            </div>

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

                        {routeInfo && (
                          <div className="mb-4 p-3 rounded-md bg-yellow-50 border border-yellow-100">
                            <h4 className="text-sm font-medium text-yellow-800 mb-1">Dynamic Pricing Applied</h4>
                            <p className="text-xs text-yellow-700">
                              Your suggested price includes calculations based on:
                            </p>
                            <ul className="text-xs text-yellow-700 mt-1 ml-5 list-disc">
                              <li>Base fare and vehicle type</li>
                              <li>Distance ({routeInfo.distance}): $2 per mile</li>
                              <li>Estimated travel time ({routeInfo.duration}): $0.50 per minute</li>
                              <li>Additional services and accessibility requirements</li>
                            </ul>
                          </div>
                        )}

                        <FormField
                          control={form.control}
                          name="riderBid"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Your Bid</FormLabel>
                              <FormControl>
                                <BidSlider
                                  minValue={Math.max(10, suggestedPrice * 0.7)}
                                  maxValue={suggestedPrice * 1.3}
                                  defaultValue={field.value}
                                  step={1}
                                  onChange={field.onChange}
                                  suggestedPrice={suggestedPrice}
                                />
                              </FormControl>
                              <FormDescription>
                                Set your maximum bid amount. Drivers may offer up to 30% lower prices, and you can counter up to 30% higher.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Promo Code Section */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Enter promo code"
                              value={promoCode}
                              onChange={(e) => setPromoCode(e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => validatePromoCode(promoCode)}
                              disabled={isValidatingPromo || !promoCode.trim()}
                            >
                              {isValidatingPromo ? "Validating..." : "Apply"}
                            </Button>
                          </div>
                          
                          {promoValidation && (
                            <div className={`p-3 rounded-lg text-sm ${
                              promoValidation.valid 
                                ? 'bg-green-50 text-green-700 border border-green-200' 
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {promoValidation.valid ? (
                                <div>
                                  <div className="font-medium">✓ Promo code applied!</div>
                                  <div className="mt-1">{promoValidation.message}</div>
                                  <div className="mt-2 font-medium">
                                    Original Price: ${suggestedPrice.toFixed(2)}
                                  </div>
                                  <div className="text-green-800 font-medium">
                                    Discount: -${promoValidation.discount?.toFixed(2)}
                                  </div>
                                  <div className="text-green-800 font-bold">
                                    Final Price: ${promoValidation.finalPrice?.toFixed(2)}
                                  </div>
                                </div>
                              ) : (
                                <div>✗ {promoValidation.message}</div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Payment will be handled after ride is created and driver is selected */}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="sm:w-1/2"
                            onClick={() => setActiveTab("details")}
                          >
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Back
                          </Button>
                          <Button 
                            type="submit" 
                            className="sm:w-1/2"
                            disabled={createRideMutation.isPending}
                          >
                            {createRideMutation.isPending ? "Creating Request..." : "Submit Request"}
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                    </Tabs>
                  </CardContent>
                </form>
              </Form>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent>
                <RoutePreview
                  pickupLocation={
                    pickupCoordinates 
                      ? { 
                          lat: pickupCoordinates.lat,
                          lng: pickupCoordinates.lng,
                          address: form.getValues().pickupLocation 
                        }
                      : undefined
                  }
                  dropoffLocation={
                    dropoffCoordinates 
                      ? { 
                          lat: dropoffCoordinates.lat,
                          lng: dropoffCoordinates.lng,
                          address: form.getValues().dropoffLocation
                        }
                      : undefined
                  }
                  onRouteCalculated={(info: { distance: string; duration: string; optimizedWaypoints?: boolean }) => {
                    setRouteInfo(info);
                    // Update the suggested price after route calculation
                    setTimeout(updatePrice, 100);
                  }}
                  distance={routeInfo?.distance}
                  duration={routeInfo?.duration}
                  vehicleType={form.getValues().vehicleType}
                  fare={suggestedPrice}
                  isRoundTrip={form.getValues().isRoundTrip}
                />

                {routeInfo && (
                  <div className="mt-4 bg-blue-50 p-3 rounded-md border border-blue-100">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Route Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-blue-500 mr-2" /> 
                        <span>Estimated Time: {routeInfo.duration}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-blue-500 mr-2" /> 
                        <span>Distance: {routeInfo.distance}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  If you have questions about booking a ride or need assistance, our support team is here to help.
                </p>
                <Button variant="outline" className="w-full">
                  Contact Support
                </Button>
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
            description: "You can now proceed with booking your ride.",
          });
          
          // Retry the form submission after a brief delay to allow state updates
          setTimeout(() => {
            form.handleSubmit(onSubmit)();
          }, 1000);
        }}
      />

      <UrgentRideWarningDialog
        open={showUrgentWarning}
        onOpenChange={setShowUrgentWarning}
        onConfirm={() => {
          setShowUrgentWarning(false);
          if (pendingSubmission) {
            handleRideSubmission(pendingSubmission);
            setPendingSubmission(null);
          }
        }}
        scheduledTime={pendingSubmission?.scheduledTime || new Date()}
      />
    </div>
  );
}