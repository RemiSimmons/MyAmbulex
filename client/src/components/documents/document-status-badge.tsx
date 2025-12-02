import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, AlertTriangle, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentStatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'missing';
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

const STATUS_CONFIG = {
  pending: {
    display: 'Under Review',
    description: "We're reviewing your document and will notify you within 2-3 business days",
    variant: 'secondary' as const,
    icon: Clock,
    iconColor: 'text-yellow-600'
  },
  approved: {
    display: 'Verified',
    description: 'Your document has been approved and meets all requirements',
    variant: 'default' as const,
    icon: CheckCircle,
    iconColor: 'text-green-600'
  },
  rejected: {
    display: 'Needs Attention',
    description: 'Please see the details below and upload a corrected document',
    variant: 'destructive' as const,
    icon: AlertCircle,
    iconColor: 'text-red-600'
  },
  expired: {
    display: 'Document Expired',
    description: 'Please upload a new, current version of this document',
    variant: 'outline' as const,
    icon: AlertTriangle,
    iconColor: 'text-orange-600'
  },
  missing: {
    display: 'Required',
    description: 'This document is required to complete your verification',
    variant: 'outline' as const,
    icon: Upload,
    iconColor: 'text-gray-600'
  }
};

export function DocumentStatusBadge({ 
  status, 
  showIcon = true, 
  size = 'default',
  className 
}: DocumentStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        'inline-flex items-center gap-1.5',
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'lg' && 'text-sm px-3 py-1',
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(
          config.iconColor,
          size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
        )} />
      )}
      {config.display}
    </Badge>
  );
}

export function DocumentStatusDescription({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  
  if (!config) return null;
  
  return (
    <p className="text-sm text-muted-foreground mt-1">
      {config.description}
    </p>
  );
}

export function getStatusConfig(status: string) {
  return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
}