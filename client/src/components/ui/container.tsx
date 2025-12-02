import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}

const Container: React.FC<ContainerProps> = ({ 
  children, 
  className, 
  fullWidth = false 
}) => {
  return (
    <div className={cn(
      'mx-auto px-4 sm:px-6 lg:px-8',
      fullWidth ? 'w-full' : 'max-w-7xl',
      className
    )}>
      {children}
    </div>
  );
};

export default Container;