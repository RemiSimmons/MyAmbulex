import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Users, UserPlus, TrendingUp, MessageSquare, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface BetaUser {
  id: number;
  userId: number;
  phase: string;
  userType: 'rider' | 'driver';
  startDate: string;
  endDate: string;
  status: 'invited' | 'active' | 'completed' | 'dropped';
  feedbackSubmitted: boolean;
  notes?: string;
}

interface BetaMetrics {
  totalUsers: number;
  activeUsers: number;
  completedUsers: number;
  droppedUsers: number;
  rideBookingSuccess: number;
  driverAcceptanceRate: number;
  averageRating: number;
  feedbackSubmitted: number;
  criticalIssues: number;
  averageResponseTime: number;
  uptime: number;
}

export default function BetaManagement() {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUserType, setInviteUserType] = useState<'rider' | 'driver'>('rider');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch beta users
  const { data: betaUsers = [], isLoading: usersLoading } = useQuery<BetaUser[]>({
    queryKey: ['/api/beta/users'],
  });

  // Fetch beta metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<BetaMetrics>({
    queryKey: ['/api/beta/metrics'],
  });

  // Fetch beta feedback
  const { data: feedback = [], isLoading: feedbackLoading } = useQuery({
    queryKey: ['/api/beta/feedback'],
  });

  // Invite beta user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async (data: { email: string; userType: 'rider' | 'driver'; phase: string }) => {
      return apiRequest('POST', '/api/beta/users', data);
    },
    onSuccess: () => {
      toast({
        title: 'Beta Invitation Sent',
        description: `Invitation sent to ${inviteEmail}`,
      });
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['/api/beta/users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Invitation Failed',
        description: error.message || 'Failed to send beta invitation',
        variant: 'destructive',
      });
    },
  });

  // Download report mutation
  const downloadReportMutation = useMutation({
    mutationFn: async (format: 'json' | 'csv') => {
      const response = await fetch(`/api/beta/report?format=${format}`);
      if (!response.ok) throw new Error('Failed to generate report');
      
      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `beta-report-phase2.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `beta-report-phase2.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    },
    onSuccess: () => {
      toast({
        title: 'Report Downloaded',
        description: 'Beta testing report downloaded successfully',
      });
    },
  });

  const handleInviteUser = () => {
    if (!inviteEmail.trim()) {
      toast({
        title: 'Email Required',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    inviteUserMutation.mutate({
      email: inviteEmail,
      userType: inviteUserType,
      phase: 'phase2'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'invited': return 'bg-yellow-100 text-yellow-800';
      case 'dropped': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (usersLoading || metricsLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Phase 2 Beta Management</h1>
          <p className="text-gray-600">Manage external beta users and track testing progress</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => downloadReportMutation.mutate('json')}
            variant="outline"
            disabled={downloadReportMutation.isPending}
          >
            <Download className="w-4 h-4 mr-2" />
            JSON Report
          </Button>
          <Button
            onClick={() => downloadReportMutation.mutate('csv')}
            variant="outline"
            disabled={downloadReportMutation.isPending}
          >
            <Download className="w-4 h-4 mr-2" />
            CSV Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Beta Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.activeUsers} active, {metrics.completedUsers} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(metrics.rideBookingSuccess * 100).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Ride booking completion
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.averageRating}/5</div>
              <p className="text-xs text-muted-foreground">
                From {metrics.feedbackSubmitted} submissions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(metrics.uptime * 100).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Uptime, {metrics.averageResponseTime}s avg response
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invite New Beta User */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Invite Beta User
            </CardTitle>
            <CardDescription>
              Send beta testing invitations to new users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="userType">User Type</Label>
              <Select value={inviteUserType} onValueChange={(value: 'rider' | 'driver') => setInviteUserType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rider">Rider</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleInviteUser}
              disabled={inviteUserMutation.isPending}
              className="w-full"
            >
              {inviteUserMutation.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Feedback */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Recent Feedback
            </CardTitle>
            <CardDescription>
              Latest feedback from beta users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {feedbackLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : feedback.length > 0 ? (
              <div className="space-y-3">
                {feedback.slice(0, 3).map((item: any, index: number) => (
                  <div key={index} className="border-l-2 border-primary pl-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{item.user.username}</span>
                      <Badge variant="secondary">{item.category}</Badge>
                      <span className="text-sm text-gray-500">{item.rating}/5</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{item.feedback}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No feedback submitted yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Beta Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Beta Users</CardTitle>
          <CardDescription>
            Current beta testing participants and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {betaUsers.length > 0 ? (
              betaUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">User ID: {user.userId}</p>
                      <p className="text-sm text-gray-500">
                        {user.userType} • Started {new Date(user.startDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(user.status)}>
                      {user.status}
                    </Badge>
                    {user.feedbackSubmitted && (
                      <Badge variant="outline">Feedback ✓</Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No beta users invited yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}