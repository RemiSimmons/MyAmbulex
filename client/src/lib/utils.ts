import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency (USD)
 * @param amount Amount to format
 * @param options Intl.NumberFormat options
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number, 
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  }).format(amount);
}

/**
 * Format a date for display
 * @param date Date to format
 * @param format Format style
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number,
  format: 'short' | 'medium' | 'long' | 'datetime' | 'time' = 'medium'
): string {
  // Helper function to parse database timestamp strings as local time
  const parseAsLocalTime = (dateString: string): Date => {
    // Handle PostgreSQL timestamp format "2025-08-12 06:30:00" or "2025-08-12T06:30:00"
    if (dateString.match(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/)) {
      const parts = dateString.split(/[\sT\-:]/);
      if (parts.length >= 6) {
        return new Date(
          parseInt(parts[0]), // year
          parseInt(parts[1]) - 1, // month (0-indexed)
          parseInt(parts[2]), // day
          parseInt(parts[3]), // hour
          parseInt(parts[4]), // minute
          parseInt(parts[5] || '0') // second
        );
      }
    }
    
    // Handle ISO strings with Z suffix - convert to local time
    if (dateString.includes('T') && dateString.includes('Z')) {
      const localString = dateString.replace('T', ' ').replace('.000Z', '').replace('Z', '');
      const parts = localString.split(/[\s\-:]/);
      if (parts.length >= 6) {
        return new Date(
          parseInt(parts[0]), 
          parseInt(parts[1]) - 1, 
          parseInt(parts[2]), 
          parseInt(parts[3]), 
          parseInt(parts[4]), 
          parseInt(parts[5] || '0')
        );
      }
    }
    
    // Default fallback
    return new Date(dateString);
  };

  // Parse the date as local time if it's a string, otherwise use as-is
  const dateObj = typeof date === 'string' ? parseAsLocalTime(date) : 
                  date instanceof Date ? date : new Date(date);
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString();
    case 'long':
      return dateObj.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    case 'datetime':
      return dateObj.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    case 'time':
      return dateObj.toLocaleString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    case 'medium':
    default:
      return dateObj.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
  }
}

/**
 * Format date and time consistently without seconds across the entire app
 * @param date Date to format
 * @param options Optional format type
 * @returns Formatted date/time string without seconds
 */
export function formatDateTime(
  date: Date | string | number | null | undefined,
  options: 'short' | 'medium' | 'long' | 'datetime' | 'time' = 'datetime'
): string {
  if (!date) return 'No date';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid date';
    
    // Use our existing formatDate function which now excludes seconds
    return formatDate(dateObj, options);
  } catch {
    return 'Invalid date';
  }
}

/**
 * Truncate a string with ellipsis if it exceeds max length
 * @param str String to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated string with ellipsis if needed
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

/**
 * Generate random ID with specified length
 * @param length Length of the ID (default: 8)
 * @returns Random alphanumeric ID
 */
export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Clean up duplicate address information
 * @param address Address string that may contain duplicates
 * @returns Cleaned address string
 */
export function cleanAddress(address: string): string {
  if (!address) return address;
  
  // Split by comma and clean up each part
  const parts = address.split(',').map(part => part.trim());
  
  // Remove duplicates while preserving order
  const seen = new Set<string>();
  const cleaned = parts.filter(part => {
    const lowerPart = part.toLowerCase();
    if (seen.has(lowerPart)) {
      return false;
    }
    seen.add(lowerPart);
    return true;
  });
  
  return cleaned.join(', ');
}

/**
 * Add custom badges to the Badge component
 */
export const badgeVariants = {
  warning: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-700 dark:text-yellow-100",
  success: "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-700 dark:text-green-100",
};