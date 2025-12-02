import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mail, 
  Send, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  BarChart3,
  FileText,
  Settings,
  Zap,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface NotificationStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  deliveryRate: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  variables: string[];
}

interface NotificationHistory {
  id: string;
  userId: number;
  email: string;
  templateId: string;
  status: string;
  sentAt?: string;
  failureReason?: string;
  createdAt: string;
}

const EMAIL_TEMPLATES = [
  { id: 'driver_verification', name: 'Driver Email Verification', category: 'driver_verification' },
  { id: 'driver_approved', name: 'Driver Application Approved', category: 'driver_verification' },
  { id: 'driver_rejected', name: 'Driver Application Rejected', category: 'driver_verification' },
  { id: 'documents_required', name: 'Document Verification Required', category: 'driver_verification' },
  { id: 'document_expiry_warning', name: 'Document Expiry Warning', category: 'driver_verification' },
  { id: 'booking_confirmation', name: 'Booking Confirmation', category: 'booking_confirmation' },
  { id: 'driver_assigned', name: 'Driver Assigned', category: 'ride_updates' },
  { id: 'ride_status_update', name: 'Ride Status Update', category: 'ride_updates' },
  { id: 'ride_completed', name: 'Ride Completed', category: 'ride_updates' },
  { id: 'payment_receipt', name: 'Payment Receipt', category: 'ride_updates' },
  { id: 'administrative', name: 'Administrative Communication', category: 'administrative' }
];

export function EmailNotificationDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('overview');
  
  // Form states
  const [testEmailForm, setTestEmailForm] = useState({
    email: '',
    templateId: '',
    subject: 'Test Email',
    message: 'This is a test email from MyAmbulex notification system.'
  });
  
  const [adminEmailForm, setAdminEmailForm] = useState({
    userId: '',
    subject: '',
    message: '',
    priority: 'normal'
  });
  
  const [bulkEmailForm, setBulkEmailForm] = useState({
    userIds: '',
    subject: '',
    message: '',
    priority: 'normal'
  });

  // Fetch notification statistics
  const { data: stats, isLoading: statsLoading } = useQuery<NotificationStats>({
    queryKey: ['/api/email-notifications/stats'],
    refetchInterval: 30000
  });

  // Fetch notification history
  const { data: history, isLoading: historyLoading } = useQuery<NotificationHistory[]>({
    queryKey: ['/api/email-notifications/history'],
    refetchInterval: 30000
  });

  // Send test email mutation
  const testEmailMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/email-notifications/test', data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Test Email Sent",
          description: "Test email has been sent successfully",
        });
        setTestEmailForm({
          email: '',
          templateId: '',
          subject: 'Test Email',
          message: 'This is a test email from MyAmbulex notification system.'
        });
      } else {
        toast({
          title: "Failed to Send",
          description: data.message || "Failed to send test email",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive",
      });
    }
  });

  // Send administrative email mutation
  const adminEmailMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/email-notifications/administrative', data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Email Sent",
          description: "Administrative email has been sent successfully",
        });
        setAdminEmailForm({
          userId: '',
          subject: '',
          message: '',
          priority: 'normal'
        });
        queryClient.invalidateQueries({ queryKey: ['/api/email-notifications/stats'] });
      } else {
        toast({
          title: "Failed to Send",
          description: data.message || "Failed to send email",
          variant: "destructive",
        });
      }
    }
  });

  // Bulk send mutation
  const bulkEmailMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/email-notifications/bulk-send', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Send Completed",
        description: data.message,
      });
      setBulkEmailForm({
        userIds: '',
        subject: '',
        message: '',
        priority: 'normal'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-notifications/stats'] });
    }
  });

  const handleTestEmail = async () => {
    if (!testEmailForm.email) {
      toast({
        title: "Validation Error",
        description: "Email address is required",
        variant: "destructive",
      });
      return;
    }

    testEmailMutation.mutate({
      email: testEmailForm.email,
      templateId: testEmailForm.templateId || 'administrative',
      variables: {
        subject: testEmailForm.subject,
        message: testEmailForm.message
      }
    });
  };

  const handleAdminEmail = async () => {
    if (!adminEmailForm.userId || !adminEmailForm.subject || !adminEmailForm.message) {
      toast({
        title: "Validation Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }

    adminEmailMutation.mutate(adminEmailForm);
  };

  const handleBulkEmail = async () => {
    if (!bulkEmailForm.userIds || !bulkEmailForm.subject || !bulkEmailForm.message) {
      toast({
        title: "Validation Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }

    const userIds = bulkEmailForm.userIds
      .split(',')
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id));

    if (userIds.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please provide valid user IDs",
        variant: "destructive",
      });
      return;
    }

    bulkEmailMutation.mutate({
      ...bulkEmailForm,
      userIds
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Email Notification System</h2>
          <p className="text-muted-foreground">
            Manage automated email notifications for drivers, riders, and administrative communications
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-50">
            <CheckCircle className="h-3 w-3 mr-1" />
            SendGrid Active
          </Badge>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Successfully Sent</p>
                <p className="text-2xl font-bold">{stats?.sent || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold">{stats?.failed || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delivery Rate</p>
                <p className="text-2xl font-bold">{stats?.deliveryRate?.toFixed(1) || 0}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="send">Send Emails</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full" 
                  onClick={() => setActiveTab('send')}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setActiveTab('templates')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Manage Templates
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setActiveTab('history')}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Email Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                    ))}
                  </div>
                ) : history && history.length > 0 ? (
                  <div className="space-y-3">
                    {history.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{item.email}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent email activity
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>SendGrid API:</strong> Connected and operational
                  </AlertDescription>
                </Alert>
                
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Email Templates:</strong> {EMAIL_TEMPLATES.length} templates available
                  </AlertDescription>
                </Alert>
                
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Processing:</strong> Real-time email delivery
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="send" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Test Email */}
            <Card>
              <CardHeader>
                <CardTitle>Send Test Email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="test-email">Email Address</Label>
                  <Input
                    id="test-email"
                    type="email"
                    value={testEmailForm.email}
                    onChange={(e) => setTestEmailForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="test@example.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="test-subject">Subject</Label>
                  <Input
                    id="test-subject"
                    value={testEmailForm.subject}
                    onChange={(e) => setTestEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Test Email Subject"
                  />
                </div>
                
                <div>
                  <Label htmlFor="test-message">Message</Label>
                  <Textarea
                    id="test-message"
                    value={testEmailForm.message}
                    onChange={(e) => setTestEmailForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Test email message..."
                    rows={4}
                  />
                </div>
                
                <Button 
                  onClick={handleTestEmail}
                  disabled={testEmailMutation.isPending}
                  className="w-full"
                >
                  {testEmailMutation.isPending ? 'Sending...' : 'Send Test Email'}
                </Button>
              </CardContent>
            </Card>

            {/* Administrative Email */}
            <Card>
              <CardHeader>
                <CardTitle>Send Administrative Email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="admin-user-id">User ID</Label>
                  <Input
                    id="admin-user-id"
                    type="number"
                    value={adminEmailForm.userId}
                    onChange={(e) => setAdminEmailForm(prev => ({ ...prev, userId: e.target.value }))}
                    placeholder="User ID"
                  />
                </div>
                
                <div>
                  <Label htmlFor="admin-priority">Priority</Label>
                  <Select 
                    value={adminEmailForm.priority} 
                    onValueChange={(value) => setAdminEmailForm(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="admin-subject">Subject</Label>
                  <Input
                    id="admin-subject"
                    value={adminEmailForm.subject}
                    onChange={(e) => setAdminEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Email subject"
                  />
                </div>
                
                <div>
                  <Label htmlFor="admin-message">Message</Label>
                  <Textarea
                    id="admin-message"
                    value={adminEmailForm.message}
                    onChange={(e) => setAdminEmailForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Email message..."
                    rows={4}
                  />
                </div>
                
                <Button 
                  onClick={handleAdminEmail}
                  disabled={adminEmailMutation.isPending}
                  className="w-full"
                >
                  {adminEmailMutation.isPending ? 'Sending...' : 'Send Email'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Bulk Email */}
          <Card>
            <CardHeader>
              <CardTitle>Bulk Email Send</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Use bulk email sparingly and only for important communications. 
                  Enter user IDs separated by commas (e.g., 1, 2, 3).
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bulk-user-ids">User IDs (comma-separated)</Label>
                  <Textarea
                    id="bulk-user-ids"
                    value={bulkEmailForm.userIds}
                    onChange={(e) => setBulkEmailForm(prev => ({ ...prev, userIds: e.target.value }))}
                    placeholder="1, 2, 3, 4, 5"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="bulk-priority">Priority</Label>
                  <Select 
                    value={bulkEmailForm.priority} 
                    onValueChange={(value) => setBulkEmailForm(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="bulk-subject">Subject</Label>
                <Input
                  id="bulk-subject"
                  value={bulkEmailForm.subject}
                  onChange={(e) => setBulkEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Bulk email subject"
                />
              </div>
              
              <div>
                <Label htmlFor="bulk-message">Message</Label>
                <Textarea
                  id="bulk-message"
                  value={bulkEmailForm.message}
                  onChange={(e) => setBulkEmailForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Bulk email message..."
                  rows={4}
                />
              </div>
              
              <Button 
                onClick={handleBulkEmail}
                disabled={bulkEmailMutation.isPending}
                className="w-full"
                variant="destructive"
              >
                {bulkEmailMutation.isPending ? 'Sending...' : 'Send Bulk Email'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {EMAIL_TEMPLATES.map((template) => (
                  <Card key={template.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{template.name}</h4>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Template ID: {template.id}
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Email History</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-2">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : history && history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{item.email}</p>
                          <Badge className={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Template: {item.templateId} • 
                          {item.sentAt ? ` Sent: ${new Date(item.sentAt).toLocaleString()}` : 
                           ` Created: ${new Date(item.createdAt).toLocaleString()}`}
                        </p>
                        {item.failureReason && (
                          <p className="text-sm text-red-600">
                            Error: {item.failureReason}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          User ID: {item.userId}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No email history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EmailNotificationDashboard;