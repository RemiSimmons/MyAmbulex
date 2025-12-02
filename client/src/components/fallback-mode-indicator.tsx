import React from 'react';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';

export function FallbackModeIndicator() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge variant="secondary" className="flex items-center gap-2 px-3 py-2">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span className="text-xs">Polling Mode Active</span>
      </Badge>
    </div>
  );
}