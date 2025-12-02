import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';

/**
 * Collection of components for optimizing resource loading
 */

// Interface for LazyImage component
interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  placeholderColor?: string;
  loadingComponent?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Component that lazy loads images when they come into view
 */
export function LazyImage({
  src,
  alt,
  className = '',
  width,
  height,
  placeholderColor = '#f3f4f6',
  loadingComponent,
  onLoad,
  onError
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    // Create intersection observer to detect when image is in viewport
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          // Disconnect after becoming visible
          observer.disconnect();
        }
      },
      { threshold: 0.1 } // 10% visibility triggers loading
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };
  
  const handleError = () => {
    setError(true);
    onError?.();
  };
  
  // Placeholder styles before image is loaded
  const placeholderStyle = {
    backgroundColor: placeholderColor,
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : '100%',
  };
  
  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={!isLoaded ? placeholderStyle : undefined}
    >
      {!isLoaded && !error && loadingComponent ? (
        <div className="absolute inset-0 flex items-center justify-center">
          {loadingComponent}
        </div>
      ) : null}
      
      {isVisible && (
        <img
          src={src}
          alt={alt}
          className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          width={width}
          height={height}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
          <span>Failed to load image</span>
        </div>
      )}
    </div>
  );
}

/**
 * Component that lazy loads content when it comes into view
 */
interface LazyContentProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  className?: string;
  threshold?: number;
}

export function LazyContent({
  children,
  placeholder,
  className = '',
  threshold = 0.1
}: LazyContentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    
    if (contentRef.current) {
      observer.observe(contentRef.current);
    }
    
    return () => {
      observer.disconnect();
    };
  }, [threshold]);
  
  return (
    <div ref={contentRef} className={className}>
      {isVisible ? children : placeholder}
    </div>
  );
}

/**
 * HOC that makes a component load lazily with Suspense
 */
export function withLazyLoading<T extends object>(
  Component: React.ComponentType<T>,
  fallback: React.ReactNode = <div>Loading...</div>
) {
  // Create a simpler wrapper component
  const WrappedComponent = (props: T) => <Component {...props} />;
  
  // Convert component to lazy loaded component
  const LazyComponent = lazy(() => {
    return new Promise<{ default: typeof WrappedComponent }>((resolve) => {
      // Small delay to ensure proper suspense behavior
      setTimeout(() => {
        resolve({ default: WrappedComponent });
      }, 10);
    });
  });
  
  // Return wrapper that provides Suspense
  return function LazyLoadedComponent(props: T) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * A component that loads data only when in viewport
 */
interface DeferredDataLoaderProps<T> {
  dataFetcher: () => Promise<T>;
  renderContent: (data: T | null, isLoading: boolean, error: Error | null) => React.ReactNode;
  className?: string;
  loadingPlaceholder?: React.ReactNode;
}

export function DeferredDataLoader<T>({
  dataFetcher,
  renderContent,
  className = '',
  loadingPlaceholder = <div>Loading data...</div>
}: DeferredDataLoaderProps<T>) {
  const [isVisible, setIsVisible] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  useEffect(() => {
    if (isVisible && !data && !isLoading) {
      setIsLoading(true);
      
      dataFetcher()
        .then(result => {
          setData(result);
          setIsLoading(false);
        })
        .catch(err => {
          setError(err);
          setIsLoading(false);
        });
    }
  }, [isVisible, data, isLoading, dataFetcher]);
  
  return (
    <div ref={containerRef} className={className}>
      {isVisible ? renderContent(data, isLoading, error) : loadingPlaceholder}
    </div>
  );
}