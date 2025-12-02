import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { type SelectSingleEventHandler } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  onChange?: (date: Date | null) => void;  // Added to support both styles
  disabled?: (date: Date) => boolean;
  minDate?: Date;  // Added minDate prop
  className?: string;
  showMonthYearPicker?: boolean;
  placeholder?: string;
  ageRange?: boolean; // New prop to enable age range (18-90 years old)
}

export function DatePicker({
  selected,
  onSelect,
  onChange,
  disabled,
  minDate,
  className,
  showMonthYearPicker = false,
  placeholder = "Select date",
  ageRange = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Support both callback styles
  const handleSelect: SelectSingleEventHandler = (day) => {
    if (onSelect) {
      onSelect(day);
    }
    if (onChange) {
      onChange(day || null);
    }
    // Auto-close the popover when a date is selected
    setIsOpen(false);
  };

  // Calculate age range dates if ageRange is enabled
  const getAgeRangeDates = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // For age 18-90: birth years would be (currentYear - 90) to (currentYear - 18)
    const maxBirthDate = new Date(currentYear - 18, 11, 31); // 18 years ago, end of year
    const minBirthDate = new Date(currentYear - 90, 0, 1);   // 90 years ago, start of year
    
    return { minBirthDate, maxBirthDate };
  };

  // If ageRange is enabled, set up date constraints for birth date selection
  let finalDisabled = disabled;
  let fromYear, toYear;

  if (ageRange) {
    const { minBirthDate, maxBirthDate } = getAgeRangeDates();
    
    // Set year range for the dropdown
    fromYear = minBirthDate.getFullYear();
    toYear = maxBirthDate.getFullYear();
    
    // Disable dates outside the age range
    finalDisabled = (date: Date) => {
      const baseDisabled = disabled ? disabled(date) : false;
      return baseDisabled || date < minBirthDate || date > maxBirthDate;
    };
  } else if (minDate) {
    // If minDate is provided, create a disabled function that prevents selecting dates before minDate
    finalDisabled = (date: Date) => (disabled ? disabled(date) : false) || date < minDate;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          disabled={finalDisabled}
          initialFocus
          captionLayout={showMonthYearPicker || ageRange ? "dropdown" : "buttons"}
          fromYear={fromYear}
          toYear={toYear}
        />
      </PopoverContent>
    </Popover>
  );
}