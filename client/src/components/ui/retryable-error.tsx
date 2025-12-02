import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface RetryableErrorProps {
  title: string;
  description: string;
  onRetry: () => void;
}

/**
 * A component that displays an error with a retry button
 */
export const RetryableError: React.FC<RetryableErrorProps> = ({
  title,
  description,
  onRetry
}) => {
  return (
    <Card className="border-red-300 bg-red-50 dark:bg-red-950/20">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <CardTitle className="text-red-700 dark:text-red-400">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-red-600 dark:text-red-300">{description}</p>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={onRetry} 
          variant="secondary"
          className="border border-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RetryableError;