import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { 
  AlertTriangle, 
  Clock, 
  Calendar,
  FileText,
  Users
} from 'lucide-react';

interface ExpirationStats {
  expiring_soon: number;
  expired: number;
  requires_attention: number;
}

export function ExpirationDashboard() {
  const { data: stats = { expiring_soon: 0, expired: 0, requires_attention: 0 }, isLoading } = useQuery<ExpirationStats>({
    queryKey: ['/api/admin/documents/expiration-summary'],
    refetchInterval: 60000 // Refresh every minute
  });

  const getUrgencyColor = (count: number, threshold: number = 5) => {
    if (count === 0) return 'text-muted-foreground';
    if (count >= threshold) return 'text-red-600';
    if (count >= threshold / 2) return 'text-orange-600';
    return 'text-yellow-600';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-muted-foreground">Loading expiration data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                <p className={`text-2xl font-bold ${getUrgencyColor(stats.expiring_soon)}`}>
                  {stats.expiring_soon}
                </p>
                <p className="text-xs text-muted-foreground">Next 30 days</p>
              </div>
              <Clock className={`h-8 w-8 ${getUrgencyColor(stats.expiring_soon)}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Already Expired</p>
                <p className={`text-2xl font-bold ${stats.expired > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {stats.expired}
                </p>
                <p className="text-xs text-muted-foreground">Needs renewal</p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${stats.expired > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Requires Attention</p>
                <p className={`text-2xl font-bold ${getUrgencyColor(stats.requires_attention, 3)}`}>
                  {stats.requires_attention}
                </p>
                <p className="text-xs text-muted-foreground">Next 7 days</p>
              </div>
              <Calendar className={`h-8 w-8 ${getUrgencyColor(stats.requires_attention, 3)}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Document Expiration Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status Summary */}
            <div className="flex flex-wrap gap-2">
              {stats.requires_attention > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.requires_attention} Urgent
                </Badge>
              )}
              {stats.expiring_soon > 0 && (
                <Badge variant="outline" className="border-orange-500 text-orange-700 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {stats.expiring_soon} Expiring Soon
                </Badge>
              )}
              {stats.expired > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {stats.expired} Expired
                </Badge>
              )}
              {stats.expiring_soon === 0 && stats.expired === 0 && stats.requires_attention === 0 && (
                <Badge variant="outline" className="border-green-500 text-green-700 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  All Documents Current
                </Badge>
              )}
            </div>

            {/* Quick Actions */}
            {(stats.requires_attention > 0 || stats.expired > 0) && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2 text-sm">Recommended Actions:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {stats.expired > 0 && (
                    <li>• Contact drivers with expired documents immediately</li>
                  )}
                  {stats.requires_attention > 0 && (
                    <li>• Send renewal reminders to drivers with documents expiring in 7 days</li>
                  )}
                  <li>• Review document requirements and update expiration dates</li>
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}