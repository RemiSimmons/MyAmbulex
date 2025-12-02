import React, { useState, useEffect } from 'react';
import { Input, InputProps } from './input';

type NumberInputProps = Omit<InputProps, 'onChange' | 'value' | 'defaultValue'> & {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  allowEmpty?: boolean;
  defaultValue?: number | null;
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  allowEmpty = true,
  defaultValue = null,
  ...props
}: NumberInputProps) {
  // Track display value separately from actual value
  const [displayValue, setDisplayValue] = useState<string>('');
  
  // Initialize display value
  useEffect(() => {
    if (value === 0) {
      setDisplayValue('0');
    } else if (value != null) {
      setDisplayValue(String(value));
    } else {
      setDisplayValue('');
    }
  }, [value]);
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Always update the display value for immediate feedback
    setDisplayValue(inputValue);
    
    // If empty and allowed to be empty, set value to null
    if (inputValue === '' && allowEmpty) {
      onChange(null);
      return;
    }
    
    // Try to parse as number
    const numValue = parseFloat(inputValue);
    
    // Check if it's a valid number
    if (!isNaN(numValue)) {
      // Apply min/max constraints if specified
      if (min !== undefined && numValue < min) {
        return;
      }
      if (max !== undefined && numValue > max) {
        return;
      }
      
      // Send the valid number to parent
      onChange(numValue);
    }
  };
  
  return (
    <Input
      type="number"
      min={min}
      max={max}
      value={displayValue}
      onChange={handleChange}
      {...props}
    />
  );
}