import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileSheetProps {
  trigger?: React.ReactNode;
  title?: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

export function MobileSheet({ 
  trigger, 
  title, 
  children, 
  side = 'left',
  className,
  onOpenChange 
}: MobileSheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        )}
      </SheetTrigger>
      
      <SheetContent 
        side={side} 
        className={cn("w-80 p-0", className)}
      >
        {title && (
          <SheetHeader className="p-6 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle>{title}</SheetTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleOpenChange(false)}
                className="p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>
        )}
        
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default MobileSheet;