import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Truck, Accessibility, Bed, HelpCircle } from "lucide-react";

type VehicleType = "standard" | "wheelchair" | "stretcher";

interface VehicleTypeSelectionProps {
  selectedType: VehicleType;
  onSelect: (type: VehicleType) => void;
}

export default function VehicleTypeSelection({ 
  selectedType,
  onSelect 
}: VehicleTypeSelectionProps) {
  
  return (
    <div className="grid grid-cols-3 gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              type="button" // Explicitly set type to button to prevent form submission
              variant={selectedType === "standard" ? "default" : "outline"} 
              className={`flex flex-col items-center justify-center h-20 ${
                selectedType === "standard" 
                  ? "bg-primary text-primary-foreground" 
                  : "border-gray-300"
              }`}
              onClick={(e) => {
                e.preventDefault(); // Prevent default button behavior
                onSelect("standard");
              }}
            >
              <Truck className="h-6 w-6 mb-1" />
              <span className="text-xs">Ambulatory</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs">
              <p className="font-medium">Ambulatory Transport</p>
              <p className="text-xs">For ambulatory patients who can enter and exit the vehicle with minimal assistance.</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button" // Explicitly set type to button to prevent form submission
              variant={selectedType === "wheelchair" ? "default" : "outline"}
              className={`flex flex-col items-center justify-center h-20 ${
                selectedType === "wheelchair"
                  ? "bg-primary text-primary-foreground"
                  : "border-gray-300"
              }`}
              onClick={(e) => {
                e.preventDefault(); // Prevent default button behavior
                onSelect("wheelchair");
              }}
            >
              <Accessibility className="h-6 w-6 mb-1" />
              <span className="text-xs">Wheelchair</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs">
              <p className="font-medium">Accessibility Access</p>
              <p className="text-xs">Specially equipped vehicles for patients using wheelchairs with secure locking systems.</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button" // Explicitly set type to button to prevent form submission
              variant={selectedType === "stretcher" ? "default" : "outline"}
              className={`flex flex-col items-center justify-center h-20 ${
                selectedType === "stretcher"
                  ? "bg-primary text-primary-foreground"
                  : "border-gray-300"
              }`}
              onClick={(e) => {
                e.preventDefault(); // Prevent default button behavior
                onSelect("stretcher");
              }}
            >
              <Bed className="h-6 w-6 mb-1" />
              <span className="text-xs">Stretcher</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs">
              <p className="font-medium">Stretcher Transport</p>
              <p className="text-xs">For patients who require transportation while lying down with specialized equipment.</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="col-span-3 mt-2 flex items-center">
        <HelpCircle className="h-4 w-4 text-gray-400 mr-2" />
        <p className="text-xs text-gray-500">
          Select the appropriate vehicle type for your transportation needs
        </p>
      </div>
    </div>
  );
}
