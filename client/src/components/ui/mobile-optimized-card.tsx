import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileOptimizedCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'destructive';
    icon?: React.ReactNode;
  }>;
  className?: string;
}

export function MobileOptimizedCard({ 
  title, 
  icon, 
  children, 
  actions, 
  className 
}: MobileOptimizedCardProps) {
  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex items-center text-lg sm:text-xl">
          {icon && <span className="mr-2 flex-shrink-0">{icon}</span>}
          <span className="truncate">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {children}
          
          {actions && actions.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  onClick={action.onClick}
                  className="h-10 sm:h-9 text-sm flex-1 sm:flex-none"
                >
                  {action.icon && (
                    <span className="mr-2 flex-shrink-0">{action.icon}</span>
                  )}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default MobileOptimizedCard;