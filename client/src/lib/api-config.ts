// API Configuration
// Handles API base URL for different environments

const getApiBaseUrl = (): string => {
  // In production, use VITE_API_URL if set (points to Railway backend)
  // Otherwise, use relative URLs (same origin)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, ''); // Remove trailing slash
  }
  
  // Fallback to relative URLs (works for same-origin requests)
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper to build full API URLs
export const apiUrl = (path: string): string => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

// Log API configuration (helpful for debugging)
if (typeof window !== 'undefined') {
  console.log('🔧 API Configuration:', {
    baseUrl: API_BASE_URL || '(using relative URLs)',
    viteApiUrl: import.meta.env.VITE_API_URL || '(not set)',
    environment: import.meta.env.MODE,
  });
}

