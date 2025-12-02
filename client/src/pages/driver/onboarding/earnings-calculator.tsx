import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import {
  DollarSign,
  Clock,
  Calendar,
  Car,
  Users,
  TrendingUp,
  Clipboard,
  MapPin,
  BadgeDollarSign,
} from "lucide-react";

const EarningsCalculator = () => {
  // Calculator state
  const [hoursPerWeek, setHoursPerWeek] = useState(20);
  const [weekendAvailability, setWeekendAvailability] = useState(true);
  const [vehicleType, setVehicleType] = useState("sedan");
  const [preferLongDistance, setPreferLongDistance] = useState(false);
  const [bidStrategy, setBidStrategy] = useState("balanced");
  
  // Results state
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [yearlyEarnings, setYearlyEarnings] = useState(0);
  const [ridesPerWeek, setRidesPerWeek] = useState(0);
  const [avgPerRide, setAvgPerRide] = useState(0);
  
  // Define default pricing settings
  const defaultPricingSettings = {
    baseRatePerHour: 25,
    weekendBonus: 1.2,
    vehicleRates: {
      sedan: 1.0,
      suv: 1.2,
      van: 1.3,
      "wheelchair-accessible": 1.5
    },
    longDistanceMultiplier: 1.15
  };

  // Fetch pricing settings
  const { data: pricingSettings = defaultPricingSettings } = useQuery({
    queryKey: ["/api/drivers/pricing-settings"],
    queryFn: getQueryFn(),
  });
  
  // Calculate earnings based on inputs
  useEffect(() => {
    // Default values if API call hasn't completed
    const baseRatePerHour = pricingSettings?.baseRatePerHour || 25;
    const weekendBonus = pricingSettings?.weekendBonus || 1.2;
    const vehicleRates = pricingSettings?.vehicleRates || {
      sedan: 1.0,
      suv: 1.2,
      van: 1.3,
      "wheelchair-accessible": 1.5
    };
    
    const longDistanceMultiplier = pricingSettings?.longDistanceMultiplier || 1.15;
    
    const bidStrategyMultipliers = {
      competitive: 0.9,  // Lower bids to win more rides
      balanced: 1.0,     // Standard approach
      premium: 1.1       // Higher bids for higher quality rides
    };
    
    // Calculate average ride duration (including loading/unloading time)
    const avgRideDuration = preferLongDistance ? 45 : 30; // minutes
    
    // Calculate number of rides per week
    const ridesPerWeekCalc = Math.floor((hoursPerWeek * 60) / avgRideDuration);
    
    // Calculate average earnings per ride
    let basePerRide = (baseRatePerHour / 60) * avgRideDuration;
    
    // Apply vehicle type multiplier
    basePerRide *= vehicleRates[vehicleType as keyof typeof vehicleRates];
    
    // Apply long distance preference if selected
    if (preferLongDistance) {
      basePerRide *= longDistanceMultiplier;
    }
    
    // Apply bid strategy multiplier
    basePerRide *= bidStrategyMultipliers[bidStrategy as keyof typeof bidStrategyMultipliers];
    
    // Weekend bonus if applicable
    const effectiveRidesPerWeek = weekendAvailability 
      ? ridesPerWeekCalc * (0.7 + (0.3 * weekendBonus)) // 30% of rides on weekends with bonus
      : ridesPerWeekCalc;
    
    // Final weekly earnings
    const weeklyEarningsCalc = Math.round(basePerRide * effectiveRidesPerWeek);
    
    // Update state
    setRidesPerWeek(Math.round(effectiveRidesPerWeek));
    setAvgPerRide(Math.round(basePerRide));
    setWeeklyEarnings(weeklyEarningsCalc);
    setMonthlyEarnings(weeklyEarningsCalc * 4);
    setYearlyEarnings(weeklyEarningsCalc * 52);
  }, [hoursPerWeek, weekendAvailability, vehicleType, preferLongDistance, bidStrategy, pricingSettings]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Earnings Calculator</h2>
        <p className="text-muted-foreground">
          Estimate your potential earnings as a MyAmbulex driver based on your availability and preferences.
        </p>
      </div>
      
      <Tabs defaultValue="calculator" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calculator" className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4" />
            <span>Earnings Calculator</span>
          </TabsTrigger>
          <TabsTrigger value="examples" className="flex items-center gap-1.5">
            <Clipboard className="h-4 w-4" />
            <span>Sample Scenarios</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="calculator" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Inputs Card */}
            <Card>
              <CardHeader>
                <CardTitle>Your Availability & Preferences</CardTitle>
                <CardDescription>
                  Adjust these settings to see how they impact your earning potential.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Hours per week */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Hours per week</Label>
                    <span className="font-medium">{hoursPerWeek} hours</span>
                  </div>
                  <Slider
                    value={[hoursPerWeek]}
                    min={5}
                    max={40}
                    step={1}
                    onValueChange={(values) => setHoursPerWeek(values[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5 hours</span>
                    <span>40 hours</span>
                  </div>
                </div>
                
                {/* Weekend availability */}
                <div className="flex items-center justify-between space-y-0 pt-2">
                  <div className="space-y-0.5">
                    <Label className="text-base">Weekend availability</Label>
                    <p className="text-sm text-muted-foreground">
                      Higher rates apply on weekends
                    </p>
                  </div>
                  <Switch
                    checked={weekendAvailability}
                    onCheckedChange={setWeekendAvailability}
                  />
                </div>
                
                {/* Vehicle Type */}
                <div className="space-y-3">
                  <Label className="text-base">Vehicle Type</Label>
                  <RadioGroup 
                    value={vehicleType} 
                    onValueChange={setVehicleType}
                    className="grid grid-cols-2 gap-2"
                  >
                    <div className="flex items-center space-x-2 border rounded-md p-3">
                      <RadioGroupItem value="sedan" id="sedan" />
                      <Label htmlFor="sedan">Sedan</Label>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-md p-3">
                      <RadioGroupItem value="suv" id="suv" />
                      <Label htmlFor="suv">SUV</Label>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-md p-3">
                      <RadioGroupItem value="van" id="van" />
                      <Label htmlFor="van">Van</Label>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-md p-3">
                      <RadioGroupItem value="wheelchair-accessible" id="wheelchair-accessible" />
                      <Label htmlFor="wheelchair-accessible">Wheelchair Accessible</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {/* Trip Preferences */}
                <div className="flex items-center justify-between space-y-0 pt-2">
                  <div className="space-y-0.5">
                    <Label className="text-base">Prefer long-distance trips</Label>
                    <p className="text-sm text-muted-foreground">
                      Higher earnings but fewer rides
                    </p>
                  </div>
                  <Switch
                    checked={preferLongDistance}
                    onCheckedChange={setPreferLongDistance}
                  />
                </div>
                
                {/* Bidding Strategy */}
                <div className="space-y-3">
                  <Label className="text-base">Bidding Strategy</Label>
                  <RadioGroup 
                    value={bidStrategy} 
                    onValueChange={setBidStrategy}
                  >
                    <div className="flex items-center space-x-2 border rounded-md p-3 mb-2">
                      <RadioGroupItem value="competitive" id="competitive" />
                      <div className="grid gap-0.5">
                        <Label htmlFor="competitive">Competitive</Label>
                        <p className="text-sm text-muted-foreground">Lower bids to win more rides</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-md p-3 mb-2">
                      <RadioGroupItem value="balanced" id="balanced" />
                      <div className="grid gap-0.5">
                        <Label htmlFor="balanced">Balanced</Label>
                        <p className="text-sm text-muted-foreground">Standard approach with average pricing</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-md p-3">
                      <RadioGroupItem value="premium" id="premium" />
                      <div className="grid gap-0.5">
                        <Label htmlFor="premium">Premium</Label>
                        <p className="text-sm text-muted-foreground">Higher bids for more selective rides</p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
            
            {/* Results Card */}
            <Card>
              <CardHeader>
                <CardTitle>Estimated Earnings</CardTitle>
                <CardDescription>
                  Based on your preferences and local market conditions
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Main Earnings Display */}
                <div className="bg-primary/5 rounded-lg p-6 text-center">
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    Estimated Weekly Earnings
                  </h3>
                  <div className="text-4xl font-bold text-primary">
                    {formatCurrency(weeklyEarnings)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Based on {ridesPerWeek} rides at avg. {formatCurrency(avgPerRide)} per ride
                  </div>
                </div>
                
                {/* Projections */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">
                      Monthly
                    </h4>
                    <div className="text-2xl font-semibold">
                      {formatCurrency(monthlyEarnings)}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">
                      Annual
                    </h4>
                    <div className="text-2xl font-semibold">
                      {formatCurrency(yearlyEarnings)}
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Key Metrics */}
                <div className="space-y-4">
                  <h3 className="font-medium">Key Metrics</h3>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Car className="h-5 w-5 text-muted-foreground" />
                      <span>Vehicle premium</span>
                    </div>
                    <span className="font-medium">
                      {vehicleType === "sedan" ? "Standard" : 
                        vehicleType === "suv" ? "+20%" : 
                        vehicleType === "van" ? "+30%" : "+50%"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <span>Weekend bonus</span>
                    </div>
                    <span className="font-medium">
                      {weekendAvailability ? `+${Math.round((pricingSettings?.weekendBonus || 1.2) * 100 - 100)}%` : "N/A"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <span>Long distance trips</span>
                    </div>
                    <span className="font-medium">
                      {preferLongDistance ? `+${Math.round((pricingSettings?.longDistanceMultiplier || 1.15) * 100 - 100)}%` : "Standard"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <BadgeDollarSign className="h-5 w-5 text-muted-foreground" />
                      <span>Bidding strategy</span>
                    </div>
                    <span className="font-medium">
                      {bidStrategy === "competitive" ? "-10%" : 
                        bidStrategy === "balanced" ? "Standard" : "+10%"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="examples" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Part-Time Example */}
            <Card>
              <CardHeader>
                <CardTitle>Part-Time Driver</CardTitle>
                <CardDescription>
                  15 hours per week, sedan, mixed trips
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Hours per week</span>
                    <span>15 hours</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Weekend availability</span>
                    <span>No</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vehicle type</span>
                    <span>Sedan</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Trip preference</span>
                    <span>Mixed</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bidding strategy</span>
                    <span>Balanced</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="pt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weekly Earnings</span>
                    <span className="font-semibold">{formatCurrency(375)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Earnings</span>
                    <span className="font-semibold">{formatCurrency(1500)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Annual Earnings</span>
                    <span className="font-semibold">{formatCurrency(19500)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Full-Time Example */}
            <Card>
              <CardHeader>
                <CardTitle>Full-Time Driver</CardTitle>
                <CardDescription>
                  40 hours per week, wheelchair-accessible van
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Hours per week</span>
                    <span>40 hours</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Weekend availability</span>
                    <span>Yes</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vehicle type</span>
                    <span>Wheelchair Accessible</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Trip preference</span>
                    <span>Long Distance</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bidding strategy</span>
                    <span>Premium</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="pt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weekly Earnings</span>
                    <span className="font-semibold">{formatCurrency(1690)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Earnings</span>
                    <span className="font-semibold">{formatCurrency(6760)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Annual Earnings</span>
                    <span className="font-semibold">{formatCurrency(87880)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* SUV Weekend Example */}
            <Card>
              <CardHeader>
                <CardTitle>Weekend SUV Driver</CardTitle>
                <CardDescription>
                  10 hours per week, weekends only, SUV
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Hours per week</span>
                    <span>10 hours (weekends)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Weekend availability</span>
                    <span>Yes (exclusively)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vehicle type</span>
                    <span>SUV</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Trip preference</span>
                    <span>Mixed</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bidding strategy</span>
                    <span>Competitive</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="pt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weekly Earnings</span>
                    <span className="font-semibold">{formatCurrency(324)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Earnings</span>
                    <span className="font-semibold">{formatCurrency(1296)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Annual Earnings</span>
                    <span className="font-semibold">{formatCurrency(16848)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Retiree Example */}
            <Card>
              <CardHeader>
                <CardTitle>Retiree Driver</CardTitle>
                <CardDescription>
                  20 hours per week, van, steady income focus
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Hours per week</span>
                    <span>20 hours</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Weekend availability</span>
                    <span>Occasional</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vehicle type</span>
                    <span>Van</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Trip preference</span>
                    <span>Short Distance</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bidding strategy</span>
                    <span>Balanced</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="pt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weekly Earnings</span>
                    <span className="font-semibold">{formatCurrency(650)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Earnings</span>
                    <span className="font-semibold">{formatCurrency(2600)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Annual Earnings</span>
                    <span className="font-semibold">{formatCurrency(33800)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="mt-1">
                <BadgeDollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Note About Earnings Estimates</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  These are estimated earnings based on average conditions in the market. Actual earnings may vary based on factors including location, time of day, seasonal demand, and other market conditions. The calculator and examples are provided as a general guide to help you understand potential earnings as a MyAmbulex driver.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

