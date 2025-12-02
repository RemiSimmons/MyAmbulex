import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LoadingSkeletonProps {
  type: 'card' | 'table' | 'chart' | 'form' | 'list' | 'profile';
  count?: number;
}

/**
 * Component for displaying a grid of card skeletons
 */
export const CardsGridSkeleton: React.FC<{ count?: number; className?: string }> = ({ 
  count = 4, 
  className = "" 
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="w-full">
          <CardHeader className="gap-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-14 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

/**
 * Component for displaying various loading skeleton types
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type,
  count = 1
}) => {
  const skeletons = [];

  for (let i = 0; i < count; i++) {
    switch (type) {
      case 'card':
        skeletons.push(
          <Card key={i} className="w-full">
            <CardHeader className="gap-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-14 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
            </CardContent>
          </Card>
        );
        break;

      case 'table':
        skeletons.push(
          <div key={i} className="w-full rounded-md border">
            <div className="border-b bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
            <div className="p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex flex-1 gap-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-7 w-16" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t p-4">
              <Skeleton className="h-8 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </div>
        );
        break;

      case 'chart':
        skeletons.push(
          <Card key={i} className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-8 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        );
        break;

      case 'form':
        skeletons.push(
          <Card key={i} className="w-full">
            <CardHeader>
              <Skeleton className="h-6 w-1/4" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-24 w-full" />
              </div>
              <div className="pt-4 text-right">
                <Skeleton className="ml-auto h-9 w-24" />
              </div>
            </CardContent>
          </Card>
        );
        break;

      case 'list':
        skeletons.push(
          <div key={i} className="w-full space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 rounded-md border p-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="ml-auto h-8 w-16" />
              </div>
            ))}
          </div>
        );
        break;

      case 'profile':
        skeletons.push(
          <Card key={i} className="w-full">
            <CardHeader className="flex flex-row items-center gap-4 pb-8">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="grid gap-1">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid gap-3">
                <Skeleton className="h-5 w-32" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="grid gap-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-16 w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </CardContent>
          </Card>
        );
        break;

      default:
        skeletons.push(
          <div key={i} className="w-full animate-pulse space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-2/3" />
          </div>
        );
    }
  }

  return <>{skeletons}</>;
};

export default LoadingSkeleton;