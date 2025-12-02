import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";

interface BidSliderProps {
  minValue: number;
  maxValue: number;
  defaultValue: number;
  step?: number;
  onChange: (value: number) => void;
  suggestedPrice?: number;
}

export function BidSlider({ 
  minValue, 
  maxValue, 
  defaultValue, 
  step = 1, 
  onChange,
  suggestedPrice 
}: BidSliderProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleChange = (newValue: number[]) => {
    setValue(newValue[0]);
    onChange(newValue[0]);
  };

  // Format as currency
  const formatValue = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };
  
  // Calculate slider color based on bid vs suggested price
  const getSliderColor = () => {
    if (!suggestedPrice) return "bg-primary";
    
    if (value < suggestedPrice * 0.9) {
      return "bg-red-500"; // Significantly under suggested price
    } else if (value < suggestedPrice) {
      return "bg-yellow-500"; // Slightly under suggested price
    } else if (value === suggestedPrice) {
      return "bg-green-500"; // Equal to suggested price
    } else if (value <= suggestedPrice * 1.1) {
      return "bg-blue-500"; // Slightly over suggested price
    } else {
      return "bg-purple-500"; // Significantly over suggested price
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-gray-500 text-sm">Your Bid</span>
        <span className="font-medium text-lg">{formatValue(value)}</span>
      </div>
      
      <Slider
        defaultValue={[defaultValue]}
        value={[value]}
        max={maxValue}
        min={minValue}
        step={step}
        onValueChange={handleChange}
        className="py-4"
      />
      
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatValue(minValue)}</span>
        {suggestedPrice && (
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-2 bg-gray-300 mb-1"></div>
            <span className="text-gray-600">Suggested: {formatValue(suggestedPrice)}</span>
          </div>
        )}
        <span>{formatValue(maxValue)}</span>
      </div>
    </div>
  );
}

// For backward compatibility
export default BidSlider;
