import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiUrl } from "./api-config";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage;
    let errorData;
    
    try {
      // Try to parse as JSON first
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await res.json();
        errorMessage = errorData.message || errorData.error || res.statusText;
      } else {
        // If not JSON, get as text
        errorMessage = await res.text();
      }
    } catch (e) {
      console.error("Error parsing response:", e);
      errorMessage = res.statusText || `HTTP Error ${res.status}`;
    }
    
    const error = new Error(errorMessage || `Error: ${res.status}`);
    // Add status code to the error for handling specific error types
    (error as any).statusCode = res.status;
    (error as any).data = errorData;
    
    console.error(`API Error: ${res.status} - ${errorMessage}`, errorData);
    
    // Dispatch a custom event for 401 unauthorized errors
    if (res.status === 401) {
      console.log("Dispatching 401 unauthorized event from throwIfResNotOk");
      const event = new CustomEvent('api-error', { 
        detail: { 
          statusCode: res.status, 
          message: errorMessage,
          url: res.url,
          timestamp: new Date().toISOString(),
          data: errorData
        } 
      });
      window.dispatchEvent(event);
    }
    
    throw error;
  }
}

type ApiRequestOptions = {
  signal?: AbortSignal;
  retries?: number;
  extraOptions?: RequestInit;
};

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: ApiRequestOptions
): Promise<Response> {
  const { signal, retries: configRetries = 2, extraOptions = {} } = options || {};
  
  // Use apiUrl helper to prepend API base URL if configured
  const fullUrl = apiUrl(url);
  
  try {
    console.log(`Making ${method} request to ${fullUrl}`, data);
    
    // Check if we have an abort signal that's already aborted
    if (signal && signal.aborted) {
      console.log(`Request to ${url} was aborted before it started`);
      throw new Error('Request aborted');
    }
    
    // Handle failed fetches due to network errors
    let retries = 0;
    const maxRetries = configRetries;
    let res: Response | null = null;
    
    while (retries <= maxRetries) {
      try {
        // Build fetch options with extraOptions included
        const fetchOptions = {
          method,
          headers: {
            ...(data ? { "Content-Type": "application/json" } : {}),
            // Add cache-busting headers to prevent caching issues
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            ...(extraOptions.headers || {})
          },
          body: data ? JSON.stringify(data) : undefined,
          credentials: "include" as RequestCredentials,
          signal, // Pass the abort signal to fetch
          ...extraOptions
        };
        
        // Ensure headers and credentials aren't completely overridden
        fetchOptions.credentials = "include" as RequestCredentials;
        
        // Make the fetch request
        res = await fetch(fullUrl, fetchOptions);
        break; // Exit the loop if fetch succeeds
      } catch (fetchError) {
        // Don't retry if the request was deliberately aborted
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          console.log(`Request to ${url} was aborted`);
          // For AbortErrors, throw a custom error that can be handled gracefully
          throw new Error('Request was aborted by the browser');
        }
        
        retries++;
        console.warn(`Fetch attempt ${retries} failed for ${url}:`, fetchError);
        
        if (retries > maxRetries) {
          throw new Error(`Network request failed after ${maxRetries} attempts: ${(fetchError as Error).message}`);
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, retries)));
        
        // Check if aborted during retry delay
        if (signal && signal.aborted) {
          console.log(`Request to ${url} was aborted during retry delay`);
          throw new Error('Request aborted during retry');
        }
      }
    }
    
    if (!res) {
      throw new Error('Network request failed - no response received');
    }
    
    console.log(`Received response from ${fullUrl}:`, {
      status: res.status,
      statusText: res.statusText,
      // Convert headers to simple object for logging
      headers: {
        'content-type': res.headers.get('content-type'),
        'content-length': res.headers.get('content-length')
      }
    });
    
    await throwIfResNotOk(res);
    return res;
  } catch (err) {
    // Don't log aborted requests as errors since they're intentional
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.log(`Request to ${url} was aborted`);
    } else {
      console.error(`Failed ${method} request to ${fullUrl}:`, err);
    }
    throw err;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    try {
      // Use apiUrl helper to prepend API base URL if configured
      const url = apiUrl(queryKey[0] as string);
      console.log(`Making GET request to ${url}`);
      
      // Check if the request has already been aborted
      if (signal && signal.aborted) {
        console.log(`Request to ${url} was aborted before it started`);
        return null; // Return null instead of throwing to prevent unhandled promise rejection
      }
      
      // Handle failed fetches due to network errors
      let retries = 0;
      const maxRetries = 2;
      let res: Response | null = null;
      
      while (retries <= maxRetries) {
        try {
          res = await fetch(url, {
            method: 'GET',
            headers: {
              // Add cache-busting headers
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Pragma": "no-cache",
              "Expires": "0"
            },
            credentials: "include" as RequestCredentials,
            signal // Pass the abort signal
          });
          break; // Exit the loop if fetch succeeds
        } catch (fetchError) {
          // Don't retry if the request was deliberately aborted
          if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
            console.log(`Request to ${url} was aborted`);
            return null; // Return null instead of throwing to prevent unhandled promise rejection
          }
          
          retries++;
          console.warn(`Fetch attempt ${retries} failed for ${url}:`, fetchError);
          
          if (retries > maxRetries) {
            throw new Error(`Network request failed after ${maxRetries} attempts: ${(fetchError as Error).message}`);
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(r => setTimeout(r, 500 * Math.pow(2, retries)));
          
          // Check if aborted during retry delay
          if (signal && signal.aborted) {
            console.log(`Request to ${url} was aborted during retry delay`);
            return null; // Return null instead of throwing to prevent unhandled promise rejection
          }
        }
      }
      
      if (!res) {
        throw new Error('Network request failed - no response received');
      }
      
      // If the query is for user data and we're in the middle of logout, fail quietly
      const isUserQuery = url.endsWith('/api/user');
      const isLoggingOut = document.cookie.includes('logging_out=true');
      
      if (isUserQuery && isLoggingOut) {
        console.log("User query during logout - ignoring response");
        return null;
      }
      
      console.log(`Received response from ${url}:`, {
        status: res.status,
        statusText: res.statusText,
      });

      if (res.status === 401) {
        console.log("Caught 401 error, might be session expiration");
        
        // Don't dispatch session expired events during logout
        if (!isLoggingOut) {
          // Dispatch a custom event to notify session has expired
          // This will trigger the SessionExpiredDialog component
          console.log("Dispatching 401 unauthorized event from getQueryFn");
          const event = new CustomEvent('api-error', { 
            detail: { 
              statusCode: res.status, 
              message: "Session expired or unauthorized access",
              url: url,
              timestamp: new Date().toISOString(),
              data: await res.text().catch(() => "No response body")
            } 
          });
          window.dispatchEvent(event);
        }
        
        if (unauthorizedBehavior === "returnNull") {
          console.log("Unauthorized access, returning null as configured");
          return null;
        }
      }

      // For 502 Bad Gateway errors (which could be temporary)
      if (res.status === 502) {
        console.warn("Received 502 Bad Gateway, might be a temporary network issue");
        throw new Error("Server currently unavailable (502 Bad Gateway). Please try again.");
      }

      await throwIfResNotOk(res);
      
      // Check for empty response
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const jsonData = await res.json();
        
        // Truncate long response data in logs
        let logData = jsonData;
        if (typeof jsonData === 'object' && jsonData !== null) {
          const stringData = JSON.stringify(jsonData);
          if (stringData.length > 500) {
            logData = `${stringData.substring(0, 500)}... [truncated]`;
          }
        }
        console.log(`Response data from ${url}:`, logData);
        
        return jsonData;
      } else {
        console.log(`Non-JSON response from ${url}`);
        return null;
      }
    } catch (err) {
      // Handle aborted requests gracefully - don't treat them as real errors
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log(`Request to ${url} was aborted`);
        // For AbortErrors, return null instead of throwing - this prevents unhandled rejections
        return null;
      } else {
        console.error(`Error in query to ${url}:`, err);
        throw err;
      }
    }
  };

// Cache configuration for different types of data
const cacheConfigs = {
  // Frequently changing data (rides, notifications, etc)
  dynamic: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  },
  // Semi-static data (user profile, driver info, etc)
  standard: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  },
  // Rarely changing data (lookup tables, settings, etc)
  static: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
  },
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      staleTime: cacheConfigs.standard.staleTime,
      gcTime: cacheConfigs.standard.gcTime,
      refetchOnWindowFocus: cacheConfigs.standard.refetchOnWindowFocus,
      refetchOnMount: cacheConfigs.standard.refetchOnMount,
      refetchOnReconnect: cacheConfigs.standard.refetchOnReconnect,
      retry: (failureCount, error: any) => {
        // Don't retry AbortErrors
        if (error instanceof DOMException && error.name === 'AbortError') {
          return false;
        }
        // Don't retry on 4xx errors (client errors)
        if (error.statusCode >= 400 && error.statusCode < 500) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
    },
  },
});

// Helper functions to use specific cache configurations
export function getDynamicQueryOptions<T>(options: any = {}) {
  return {
    staleTime: cacheConfigs.dynamic.staleTime,
    gcTime: cacheConfigs.dynamic.gcTime,
    refetchOnWindowFocus: cacheConfigs.dynamic.refetchOnWindowFocus,
    refetchOnMount: cacheConfigs.dynamic.refetchOnMount,
    refetchOnReconnect: cacheConfigs.dynamic.refetchOnReconnect,
    ...options,
  };
}

export function getStaticQueryOptions<T>(options: any = {}) {
  return {
    staleTime: cacheConfigs.static.staleTime,
    gcTime: cacheConfigs.static.gcTime,
    refetchOnWindowFocus: cacheConfigs.static.refetchOnWindowFocus,
    refetchOnMount: cacheConfigs.static.refetchOnMount,
    refetchOnReconnect: cacheConfigs.static.refetchOnReconnect,
    ...options,
  };
}
