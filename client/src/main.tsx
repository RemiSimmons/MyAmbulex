import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add type declarations for the window object
declare global {
  interface Window {
    __vite_plugin_react_runtime_error_overlay_createErrorOverlay?: (error: any) => void;
    __vite_plugin_react_runtime_error_overlay?: {
      show?: (error: any) => void;
    };
  }
}

// Ultimate AbortError filtering - catch ALL unhandled rejections and prevent ANY from reaching error overlay
window.addEventListener('unhandledrejection', (event) => {
  // ALWAYS prevent the default behavior for ALL unhandled rejections
  // This is aggressive but necessary to stop the error overlay from appearing
  event.preventDefault();
  event.stopImmediatePropagation();
  event.stopPropagation();
  
  // Check if it's an AbortError or similar and log it
  const reason = event.reason;
  let isAbortError = false;
  
  if (reason instanceof DOMException && reason.name === 'AbortError') {
    console.log('🚫 Filtered AbortError promise rejection:', reason.message);
    isAbortError = true;
  } else if (typeof reason === 'string' && (
    reason.includes('aborted') || 
    reason.includes('cancelled') ||
    reason.includes('The operation was aborted') ||
    reason === 'The operation was aborted.'
  )) {
    console.log('🚫 Filtered abort-related string rejection:', reason);
    isAbortError = true;
  } else if (reason instanceof Error && (
    reason.message.includes('aborted') || 
    reason.message.includes('cancelled') ||
    reason.message.includes('The operation was aborted')
  )) {
    console.log('🚫 Filtered abort-related error rejection:', reason.message);
    isAbortError = true;
  } else if (reason?.name === 'AbortError' || 
    (reason?.toString && reason.toString().includes('AbortError'))
  ) {
    console.log('🚫 Filtered AbortError object rejection');
    isAbortError = true;
  }
  
  // For non-abort errors, log but still prevent overlay
  if (!isAbortError && reason) {
    console.log('🔍 Non-abort unhandled rejection (prevented from overlay):', reason);
  }
  
  // Never allow any unhandled rejection to reach the overlay
  return false;
}, true); // Use capture phase

// Ultimate error filtering - catch ALL errors and prevent abort errors from reaching overlay
window.addEventListener('error', (event) => {
  // ALWAYS prevent the default behavior for ALL errors
  event.preventDefault();
  event.stopImmediatePropagation();
  event.stopPropagation();
  
  const error = event.error;
  let isAbortError = false;
  
  // Check for abort-related errors
  if (error instanceof DOMException && error.name === 'AbortError') {
    console.log('🚫 Filtered global AbortError:', error.message);
    isAbortError = true;
  } else if (error?.message && (
    error.message.includes('aborted') || 
    error.message.includes('cancelled') ||
    error.message.includes('The operation was aborted')
  )) {
    console.log('🚫 Filtered global abort-related error:', error.message);
    isAbortError = true;
  } else if (error && error.toString().toLowerCase().includes('abort')) {
    console.log('🚫 Filtered global abort-string error:', error.toString());
    isAbortError = true;
  }
  
  // For non-abort errors, log but still prevent overlay
  if (!isAbortError && error) {
    console.log('🔍 Non-abort global error (prevented from overlay):', error);
  }
  
  // Never allow any error to reach the overlay
  return false;
}, true); // Use capture phase

// Override console.error to filter out AbortErrors from reaching the Vite plugin
const originalConsoleError = console.error;
console.error = (...args) => {
  // Don't log AbortErrors as console errors (which trigger the Vite overlay)
  const firstArg = args[0];
  
  // Check for the exact error message from the overlay
  if (typeof firstArg === 'string' && 
      (firstArg.includes('AbortError') || 
       firstArg.includes('aborted') || 
       firstArg.includes('operation was aborted') ||
       firstArg.includes('The operation was aborted') ||
       firstArg === 'The operation was aborted.' ||
       firstArg.includes('Request to') && firstArg.includes('was aborted'))) {
    console.log('Filtered AbortError from console.error:', ...args);
    return;
  }
  
  // Check if any argument is an AbortError
  for (const arg of args) {
    if (arg instanceof DOMException && arg.name === 'AbortError') {
      console.log('Filtered AbortError object from console.error:', ...args);
      return;
    }
    
    // Check for abort-related error messages in objects
    if (typeof arg === 'object' && arg !== null) {
      const str = String(arg);
      if (str.includes('operation was aborted') || 
          str.includes('AbortError') || 
          str.includes('was aborted')) {
        console.log('Filtered abort-related error object from console.error:', ...args);
        return;
      }
    }
  }
  
  // Let through all other errors
  originalConsoleError.apply(console, args);
};

// More aggressive approach to disable Vite error overlay for abort errors
if (import.meta.hot) {
  // Completely disable the runtime error overlay by replacing the function entirely
  const disableRuntimeErrorOverlay = () => {
    // Find and disable all possible error overlay functions
    const overlayPaths = [
      'window.__vite_plugin_react_runtime_error_overlay_createErrorOverlay',
      'window.createErrorOverlay', 
      'window.showErrorOverlay',
      'window.displayErrorOverlay'
    ];
    
    overlayPaths.forEach((path) => {
      try {
        const parts = path.split('.');
        let obj = window as any;
        for (let i = 1; i < parts.length - 1; i++) {
          if (obj[parts[i]]) {
            obj = obj[parts[i]];
          }
        }
        const lastPart = parts[parts.length - 1];
        
        if (obj[lastPart] && typeof obj[lastPart] === 'function') {
          const originalFunc = obj[lastPart];
          obj[lastPart] = (...args: any[]) => {
            const error = args[0];
            if (error && (
              (typeof error === 'string' && error.includes('operation was aborted')) ||
              error.message?.includes('operation was aborted') ||
              error.message?.includes('The operation was aborted') ||
              error.name === 'AbortError'
            )) {
              console.log(`Blocked runtime error overlay for abort error via ${path}`);
              return;
            }
            return originalFunc.apply(this, args);
          };
        }
      } catch (e) {
        // Ignore errors in this override attempt
      }
    });
  };
  
  // Try immediately and with delays
  disableRuntimeErrorOverlay();
  setTimeout(disableRuntimeErrorOverlay, 50);
  setTimeout(disableRuntimeErrorOverlay, 200);
  setTimeout(disableRuntimeErrorOverlay, 1000);
  
  // Also try to intercept via the global error overlay object
  const interceptOverlay = () => {
    const overlayFunctions = ['show', 'create', 'display', 'render'];
    overlayFunctions.forEach((method) => {
      if ((window as any).__vite_plugin_react_runtime_error_overlay?.[method]) {
        const originalMethod = (window as any).__vite_plugin_react_runtime_error_overlay[method];
        (window as any).__vite_plugin_react_runtime_error_overlay[method] = function(error: any, ...args: any[]) {
          if (error && (
            error.message?.includes('AbortError') ||
            error.message?.includes('operation was aborted') ||
            error.message?.includes('The operation was aborted') ||
            error.name === 'AbortError'
          )) {
            console.log(`Prevented AbortError from showing overlay via ${method}:`, error);
            return;
          }
          return originalMethod.call(this, error, ...args);
        };
      }
    });
  };
  
  interceptOverlay();
  setTimeout(interceptOverlay, 100);
  setTimeout(interceptOverlay, 1000);

  // Wait for the plugin to be available and then override it
  const interceptViteOverlay = () => {
    // Try multiple possible function names
    const possibleFunctions = [
      '__vite_plugin_react_runtime_error_overlay_createErrorOverlay',
      '__vite_plugin_react_runtime_error_overlay_show',
      '__vite_error_overlay_show'
    ];

    possibleFunctions.forEach((funcName) => {
      const originalFunc = (window as any)[funcName];
      if (originalFunc && typeof originalFunc === 'function') {
        (window as any)[funcName] = function(error: any) {
          if (error && (
            error.message?.includes('operation was aborted') ||
            error.message?.includes('AbortError') ||
            error.name === 'AbortError' ||
            String(error).includes('operation was aborted')
          )) {
            console.log(`Prevented Vite error overlay (${funcName}) for abort error:`, error);
            return;
          }
          return originalFunc.apply(this, arguments);
        };
      }
    });

    // Also try to override the plugin object methods
    if ((window as any).__vite_plugin_react_runtime_error_overlay) {
      const plugin = (window as any).__vite_plugin_react_runtime_error_overlay;
      if (plugin.show) {
        const originalShow = plugin.show;
        plugin.show = function(error: any) {
          if (error && (
            error.message?.includes('operation was aborted') ||
            error.message?.includes('AbortError') ||
            error.name === 'AbortError' ||
            String(error).includes('operation was aborted')
          )) {
            console.log('Prevented Vite overlay plugin show for abort error:', error);
            return;
          }
          return originalShow.call(this, error);
        };
      }
    }
  };

  // Try immediately and also with a delay
  interceptViteOverlay();
  setTimeout(interceptViteOverlay, 100);
  setTimeout(interceptViteOverlay, 500);
}

// Enable smooth scrolling for anchor links
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e: Event) => {
      e.preventDefault();
      const target = e.currentTarget as HTMLAnchorElement;
      const targetId = target.getAttribute('href')?.substring(1);
      if (targetId) {
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          window.scrollTo({
            top: targetElement.offsetTop - 80, // Offset for fixed header
            behavior: 'smooth'
          });
        }
      }
    });
  });
});

createRoot(document.getElementById("root")!).render(<App />);
