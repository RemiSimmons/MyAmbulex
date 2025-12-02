
import { RetryableError } from '../ui/retryable-error';
import { useCallback, useState, useEffect } from 'react';

export function BidErrorBoundary({ 
  children, 
  onRetry 
}: { 
  children: React.ReactNode;
  onRetry: () => void;
}) {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.name === 'TypeError' || event.error?.message?.includes('fetch')) {
        setHasError(true);
        setErrorMessage(event.error?.message || "Network connection error");
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setErrorMessage("");
    onRetry();
  }, [onRetry]);

  if (hasError) {
    return (
      <RetryableError
        title="Error Loading Bids"
        description={errorMessage || "There was a problem loading the bid information. Please try again."}
        onRetry={handleRetry}
      />
    );
  }

  return <>{children}</>;
}
