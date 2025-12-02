import { useState, useEffect } from 'react';

/**
 * Custom hook to persist data in localStorage with type safety
 * 
 * @param key The localStorage key to store the value under
 * @param initialValue The initial value to use if no value is found in localStorage
 * @returns A stateful value and a function to update it
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // Get from local storage then parse stored json or return initialValue
  const readValue = (): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (parseJSON(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Listen to changes in localStorage to update state if our key changes in another tab
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue) {
        setStoredValue(parseJSON(event.newValue) as T);
      }
    };

    // this is a custom event, triggered in writeValueToLocalStorage
    const handleLocalStorageChange = (event: CustomEvent) => {
      if (event.detail.key === key) {
        setStoredValue(event.detail.value);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage', handleLocalStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', handleLocalStorageChange as EventListener);
    };
  }, [key]);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      
      // Save to state
      setStoredValue(valueToStore);
      
      // Save to local storage
      if (typeof window !== 'undefined') {
        writeValueToLocalStorage(key, valueToStore);
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

// Helper function to write to localStorage and dispatch a custom event
function writeValueToLocalStorage(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
  
  window.dispatchEvent(
    new CustomEvent('local-storage', { detail: { key, value } })
  );
}

// Helper function to safely parse JSON
function parseJSON<T>(value: string | null): T | undefined {
  try {
    return value === 'undefined' ? undefined : JSON.parse(value ?? '');
  } catch {
    console.log('parsing error on', { value });
    return undefined;
  }
}